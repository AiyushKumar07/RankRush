import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  QueryStudentQuizzesDto,
  SubmitAttemptDto,
  QueryActivityDto,
} from './dto/student.dto.js';
import { TokensService } from '../tokens/tokens.service.js';
import { EntitlementsService } from '../entitlements/entitlements.service.js';

// ── Gamification constants (simple formula) ──────────────────────
const XP_PER_CORRECT = 10;
const LEVEL_XP_DIVISOR = 300;

const RANK_TITLES: Record<number, string> = {
  1: 'Rookie Learner',
  2: 'Curious Explorer',
  3: 'Rising Scholar',
  4: 'Sharp Thinker',
  5: 'Rising Strategist',
  6: 'Knowledge Hunter',
  7: 'Quiz Warrior',
  8: 'Subject Commander',
  9: 'Elite Challenger',
  10: 'Grand Master',
};

function getRankTitle(level: number): string {
  if (level >= 10) return RANK_TITLES[10];
  return RANK_TITLES[level] || RANK_TITLES[1];
}

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private tokensService: TokensService,
    private entitlements: EntitlementsService,
  ) {}

  // ── Stats (shared by sidebar, profile, dashboard) ───────────────
  async getStats(userId: string) {
    const [completedAttempts, allAttempts] = await Promise.all([
      this.prisma.quizAttempt.findMany({
        where: { studentId: userId, status: 'COMPLETED' },
        select: {
          score: true,
          totalMarks: true,
          percentage: true,
          correctCount: true,
          incorrectCount: true,
          unansweredCount: true,
          completedAt: true,
        },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.quizAttempt.count({ where: { studentId: userId } }),
    ]);

    const quizzesAttempted = completedAttempts.length;
    const questionsSolved = completedAttempts.reduce(
      (sum, a) => sum + a.correctCount + a.incorrectCount,
      0,
    );
    const totalCorrect = completedAttempts.reduce(
      (sum, a) => sum + a.correctCount,
      0,
    );
    const accuracy =
      questionsSolved > 0
        ? Math.round((totalCorrect / questionsSolved) * 100)
        : 0;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { streak: true, longestStreak: true, loginXp: true },
    });
    const loginStreak = user?.streak ?? 0;
    const longestLoginStreak = user?.longestStreak ?? 0;
    const loginXp = user?.loginXp ?? 0;

    const xp = totalCorrect * XP_PER_CORRECT + loginXp;
    const level = Math.floor(xp / LEVEL_XP_DIVISOR) + 1;
    const xpToNextLevel = level * LEVEL_XP_DIVISOR;
    const rankTitle = getRankTitle(level);

    const streak = loginStreak;
    const longestStreak = longestLoginStreak;

    return {
      data: {
        stats: {
          level,
          xp,
          xpToNextLevel,
          rankTitle,
          streak,
          longestStreak,
          quizzesAttempted,
          questionsSolved,
          accuracy,
          subscription: { plan: 'Free', renewsOn: null },
        },
      },
    };
  }

  // ── Dashboard (aggregate for the main page) ─────────────────────
  async getDashboard(userId: string) {
    const [statsRes, recentActivity, topicInsights, badges] = await Promise.all(
      [
        this.getStats(userId),
        this.prisma.studentActivity.findMany({
          where: { studentId: userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        this.getTopicInsights(userId),
        this.computeBadges(userId),
      ],
    );

    return {
      data: {
        stats: statsRes.data.stats,
        recentActivity: recentActivity.map((a) => ({
          id: a.id,
          type: a.type,
          title: a.title,
          meta: a.meta,
          when: this.timeAgo(a.createdAt),
          icon: a.icon,
          tone: a.tone,
        })),
        topicInsights,
        badges,
      },
    };
  }

  // ── List quizzes available to students ──────────────────────────
  async listQuizzes(userId: string, query: QueryStudentQuizzesDto) {
    const page = query.page || 1;
    const limit = query.limit || 30;
    const skip = (page - 1) * limit;

    const where: Prisma.QuizWhereInput = { status: 'ACTIVE' };
    if (query.subject) where.subject = query.subject;
    if (query.type) {
      where.paperType = query.type;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { subject: { contains: query.search, mode: 'insensitive' } },
        { chapter: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [quizzes, total] = await Promise.all([
      this.prisma.quiz.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          quizId: true,
          title: true,
          description: true,
          subject: true,
          chapter: true,
          topic: true,
          className: true,
          totalMarks: true,
          totalQuestions: true,
          timeLimitMins: true,
          difficulty: true,
          tags: true,
          paperType: true,
          year: true,
          createdAt: true,
        },
      }),
      this.prisma.quiz.count({ where }),
    ]);

    // For each quiz, get student's progress and attempt count
    const quizIds = quizzes.map((q) => q.id);

    const [inProgressAttempts, globalAttemptCounts, lastScores] =
      await Promise.all([
        // Student's in-progress attempts
        this.prisma.quizAttempt.findMany({
          where: {
            studentId: userId,
            quizId: { in: quizIds },
            status: 'IN_PROGRESS',
          },
          select: { quizId: true },
        }),
        // Global attempt count per quiz
        this.prisma.quizAttempt.groupBy({
          by: ['quizId'],
          where: {
            quizId: { in: quizIds },
            status: 'COMPLETED',
          },
          _count: { id: true },
        }),
        // Student's last completed score per quiz
        this.prisma.quizAttempt.findMany({
          where: {
            studentId: userId,
            quizId: { in: quizIds },
            status: 'COMPLETED',
          },
          orderBy: { completedAt: 'desc' },
          select: { quizId: true, percentage: true },
        }),
      ]);

    const inProgressSet = new Set(inProgressAttempts.map((a) => a.quizId));
    const attemptCountMap = new Map(
      globalAttemptCounts.map((g) => [g.quizId, g._count.id]),
    );
    // Get only the last score per quiz
    const lastScoreMap = new Map<string, number>();
    for (const s of lastScores) {
      if (!lastScoreMap.has(s.quizId)) {
        lastScoreMap.set(s.quizId, Math.round(s.percentage));
      }
    }

    const enrichedQuizzes = quizzes.map((q) => ({
      ...q,
      inProgress: inProgressSet.has(q.id),
      attempts: attemptCountMap.get(q.id) || 0,
      lastScore: lastScoreMap.get(q.id) ?? null,
    }));

    return {
      data: { quizzes: enrichedQuizzes },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ── Get quiz detail (for starting an attempt) ───────────────────
  async getQuizForStudent(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.status !== 'ACTIVE') {
      throw new BadRequestException('This quiz is not currently available');
    }

    // Fetch questions but strip correct answers
    const questionIds = quiz.questions.map((q) => q.questionId);
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: {
        id: true,
        questionType: true,
        question: true,
        questionImageUrl: true,
        options: true,
        matchPairs: true,
        caseStudy: true,
        assertionStatement: true,
        reasonStatement: true,
        subject: true,
        chapter: true,
        topic: true,
        difficulty: true,
        estimatedTimeSeconds: true,
        marks: true,
        negativeMarks: true,
        // Deliberately NOT including: correctAnswer, answerExplanation
      },
    });

    const questionsMap = new Map(questions.map((q) => [q.id, q]));
    let orderedQuestions = quiz.questions
      .sort((a, b) => a.order - b.order)
      .map((qq) => ({
        questionId: qq.questionId,
        order: qq.order,
        marks: qq.marks,
        questionData: questionsMap.get(qq.questionId) || null,
      }));

    // Shuffle questions if enabled (Fisher-Yates)
    if (quiz.shuffleQuestions) {
      for (let i = orderedQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [orderedQuestions[i], orderedQuestions[j]] = [orderedQuestions[j], orderedQuestions[i]];
      }
    }

    return {
      data: {
        quiz: {
          id: quiz.id,
          quizId: quiz.quizId,
          title: quiz.title,
          description: quiz.description,
          subject: quiz.subject,
          totalQuestions: quiz.totalQuestions,
          totalMarks: quiz.totalMarks,
          timeLimitMins: quiz.timeLimitMins,
          shuffleQuestions: quiz.shuffleQuestions,
          negativeMarking: quiz.negativeMarking,
          questions: orderedQuestions,
        },
      },
    };
  }

  // ── Start a quiz attempt ────────────────────────────────────────
  async startAttempt(userId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.status !== 'ACTIVE') {
      throw new BadRequestException('This quiz is not currently available');
    }

    // Plan-tier gating: PYQ and Mock papers are gated separately from token cost.
    if (quiz.paperType === 'FULL_MOCK') {
      await this.entitlements.requireFeature(
        userId,
        'MOCK_TESTS',
        'Full-length mock tests require Starter or Pro.',
      );
    } else if (quiz.paperType === 'PYQ') {
      await this.entitlements.requireFeature(
        userId,
        'PYQ_ACCESS',
        'Previous-year papers require Starter or Pro.',
      );
      // Enforce the per-plan year cap parsed from the same feature's value:
      // Starter "Last 5 years" → 5, Pro "All years" → Infinity.
      if (quiz.year != null) {
        const cap = await this.entitlements.getCap(userId, 'PYQ_ACCESS');
        if (Number.isFinite(cap) && cap > 0) {
          const minYear = new Date().getFullYear() - cap;
          if (quiz.year < minYear) {
            throw new BadRequestException(
              `Your plan covers the last ${cap} years of PYQs. Upgrade to Pro for full access.`,
            );
          }
        }
      }
    }

    // Check token balance
    const wallet = await this.tokensService.getWallet(userId);
    if (wallet.balance <= 0) {
      throw new BadRequestException('Insufficient tokens to start this quiz');
    }

    // Check if there's already an in-progress attempt
    const existing = await this.prisma.quizAttempt.findFirst({
      where: { studentId: userId, quizId, status: 'IN_PROGRESS' },
    });
    if (existing) {
      throw new ConflictException(
        'You already have an in-progress attempt for this quiz',
      );
    }

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        studentId: userId,
        quizId,
        quizTitle: quiz.title,
        quizSubject: quiz.subject,
        totalMarks: quiz.totalMarks,
        status: 'IN_PROGRESS',
      },
    });

    this.logger.log(
      `Student ${userId} started attempt ${attempt.id} for quiz ${quizId}`,
    );

    return {
      message: 'Attempt started',
      data: { attemptId: attempt.id },
    };
  }

  // ── Submit a quiz attempt ───────────────────────────────────────
  async submitAttempt(userId: string, quizId: string, dto: SubmitAttemptDto) {
    // Find in-progress attempt
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { studentId: userId, quizId, status: 'IN_PROGRESS' },
    });
    if (!attempt) {
      throw new NotFoundException('No in-progress attempt found for this quiz');
    }

    // Fetch quiz + questions with correct answers
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const questionIds = quiz.questions.map((q) => q.questionId);
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: {
        id: true,
        correctAnswer: true,
        marks: true,
        negativeMarks: true,
        topic: true,
        subject: true,
      },
    });

    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // Score the attempt
    let score = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let negativeMarksTotal = 0;
    const questionResults: Array<{
      questionId: string;
      topic: string;
      subject: string;
      correct: boolean;
    }> = [];

    const answersMap = new Map(
      dto.answers
        ? dto.answers.map((a) => [a.questionId, a.selectedAnswers])
        : [],
    );

    for (const qq of quiz.questions) {
      const q = questionMap.get(qq.questionId);
      if (!q) continue;

      const studentAnswer = answersMap.get(qq.questionId) || [];
      const qMarks = qq.marks ?? q.marks ?? 1;

      if (studentAnswer.length === 0) {
        unansweredCount++;
        questionResults.push({
          questionId: qq.questionId,
          topic: q.topic,
          subject: q.subject,
          correct: false,
        });
        continue;
      }

      // Compare answers
      const isCorrect =
        q.correctAnswer.length === studentAnswer.length &&
        q.correctAnswer.every((ca) => studentAnswer.includes(ca));

      if (isCorrect) {
        correctCount++;
        score += qMarks;
      } else {
        incorrectCount++;
        if (quiz.negativeMarking && q.negativeMarks) {
          score -= q.negativeMarks;
          negativeMarksTotal += q.negativeMarks;
        }
      }

      questionResults.push({
        questionId: qq.questionId,
        topic: q.topic,
        subject: q.subject,
        correct: isCorrect,
      });
    }

    // Don't clamp score to 0 — negative scores are valid with negative marking
    const percentage =
      quiz.totalMarks > 0 ? Math.max(0, Math.round((score / quiz.totalMarks) * 100)) : 0;

    // Update the attempt
    const now = new Date();
    const timeTaken =
      dto.timeTakenSecs ??
      Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000);

    const xpEarned = dto.isProctoringFailure
      ? 0
      : correctCount * XP_PER_CORRECT;

    const updatedAttempt = await this.prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        answers: dto.answers as any,
        score: dto.isProctoringFailure ? 0 : score,
        percentage: dto.isProctoringFailure ? 0 : percentage,
        correctCount,
        incorrectCount,
        unansweredCount,
        timeTakenSecs: timeTaken,
        status: dto.isProctoringFailure ? 'FAILED_PROCTORING' : 'COMPLETED',
        completedAt: now,
        questionResults: questionResults as any,
        proctoringViolations: dto.proctoringViolations as any,
      },
    });

    // Deduct token (only if it's the first time submitting, but it was already deducted when they started the quiz in startAttempt! Wait, let's look closely at startAttempt vs submitAttempt)
    // Looking at the code, token is actually deducted in submitAttempt.
    // If it's a proctoring failure, they still lose their token.
    await this.tokensService.debitTokens(
      userId,
      1,
      'QUIZ_CONSUMED',
      attempt.id,
      `Attempted quiz: ${quiz.title}`,
    );

    // Create activity entry
    let activityIcon = percentage >= 80 ? 'Trophy' : 'Target';
    let activityTone =
      percentage >= 80 ? 'emerald' : percentage >= 50 ? 'cyan' : 'amber';
    let activityMeta = `${percentage}% · +${xpEarned} XP`;
    let activityTitle = quiz.title;

    if (dto.isProctoringFailure) {
      activityIcon = 'AlertTriangle';
      activityTone = 'rose';
      activityMeta = '0% · Disqualified';
      activityTitle = `[Disqualified] ${quiz.title}`;
    }

    await this.prisma.studentActivity.create({
      data: {
        studentId: userId,
        type: dto.isProctoringFailure
          ? 'quiz_failed_proctoring'
          : 'quiz_completed',
        title: activityTitle,
        meta: activityMeta,
        icon: activityIcon,
        tone: activityTone,
        relatedId: attempt.id,
      },
    });

    if (dto.isProctoringFailure) {
      this.logger.warn(
        `Student ${userId} disqualified on quiz ${quizId} due to proctoring failure.`,
      );
    } else {
      this.logger.log(
        `Student ${userId} completed quiz ${quizId}: ${percentage}% (${correctCount}/${quiz.totalQuestions})`,
      );
    }

    return {
      message: dto.isProctoringFailure
        ? 'Quiz submission rejected due to proctoring violation'
        : 'Quiz submitted successfully',
      data: {
        score: dto.isProctoringFailure ? 0 : score,
        totalMarks: quiz.totalMarks,
        percentage: dto.isProctoringFailure ? 0 : percentage,
        correctCount,
        incorrectCount,
        unansweredCount,
        negativeMarksTotal,
        timeTakenSecs: timeTaken,
        xpEarned,
        questionResults,
        isProctoringFailure: dto.isProctoringFailure || false,
        proctoringViolations: dto.proctoringViolations || [],
      },
    };
  }

  // ── Activity feed ───────────────────────────────────────────────
  async getActivity(userId: string, query: QueryActivityDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [activities, total, recentAttempts] = await Promise.all([
      this.prisma.studentActivity.findMany({
        where: { studentId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.studentActivity.count({
        where: { studentId: userId },
      }),
      this.prisma.quizAttempt.findMany({
        where: { studentId: userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          quizId: true,
          quizTitle: true,
          quizSubject: true,
          status: true,
          score: true,
          totalMarks: true,
          percentage: true,
          timeTakenSecs: true,
          proctoringViolations: true,
          createdAt: true,
          completedAt: true,
        },
      }),
    ]);

    // Subject performance from completed attempts
    const subjectPerformance = await this.getSubjectPerformance(userId);

    // Heatmap: count completed attempts per day for the last 364 days
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 364);
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);
    startDate.setHours(0, 0, 0, 0);

    const heatmapAttempts = await this.prisma.quizAttempt.findMany({
      where: {
        studentId: userId,
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { completedAt: true },
    });

    const attemptCounts: Record<string, number> = {};
    for (const a of heatmapAttempts) {
      if (a.completedAt) {
        const dateStr = a.completedAt.toISOString().split('T')[0];
        attemptCounts[dateStr] = (attemptCounts[dateStr] || 0) + 1;
      }
    }

    const heatmap: Array<{
      date: string;
      count: number;
      level: number;
      future: boolean;
    }> = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const count = attemptCounts[dateStr] || 0;

      let level = 0;
      if (count > 0) {
        if (count <= 2) level = 1;
        else if (count <= 4) level = 2;
        else if (count <= 6) level = 3;
        else level = 4;
      }

      heatmap.push({
        date: dateStr,
        count,
        level,
        future: current > new Date(),
      });

      current.setDate(current.getDate() + 1);
    }

    return {
      data: {
        activities: activities.map((a) => ({
          id: a.id,
          type: a.type,
          title: a.title,
          meta: a.meta,
          when: this.timeAgo(a.createdAt),
          icon: a.icon,
          tone: a.tone,
        })),
        attempts: recentAttempts,
        subjectPerformance,
        heatmap,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ── Private helpers ─────────────────────────────────────────────

  private calculateStreak(
    attempts: Array<{ completedAt: Date | null }>,
  ): number {
    if (attempts.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get unique days with activity
    const activeDays = new Set<string>();
    for (const a of attempts) {
      if (a.completedAt) {
        const d = new Date(a.completedAt);
        d.setHours(0, 0, 0, 0);
        activeDays.add(d.toISOString());
      }
    }

    let streak = 0;
    let currentDate = new Date(today);

    // Check if today or yesterday had activity (allow 1 day gap for timezone)
    const todayStr = today.toISOString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString();

    if (!activeDays.has(todayStr) && !activeDays.has(yesterdayStr)) {
      return 0;
    }

    // If today doesn't have activity, start counting from yesterday
    if (!activeDays.has(todayStr)) {
      currentDate = new Date(yesterday);
    }

    // Count consecutive days backward
    while (true) {
      const dateStr = currentDate.toISOString();
      if (activeDays.has(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  private async getTopicInsights(userId: string) {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { studentId: userId, status: 'COMPLETED' },
      select: { questionResults: true },
    });

    const topicStats: Record<string, { correct: number; total: number }> = {};

    for (const attempt of attempts) {
      const results = attempt.questionResults as any[];
      if (!Array.isArray(results)) continue;

      for (const r of results) {
        if (!r.topic) continue;
        if (!topicStats[r.topic]) {
          topicStats[r.topic] = { correct: 0, total: 0 };
        }
        topicStats[r.topic].total++;
        if (r.correct) topicStats[r.topic].correct++;
      }
    }

    const entries = Object.entries(topicStats)
      .filter(([, stats]) => stats.total >= 3) // Only topics with enough data
      .map(([topic, stats]) => ({
        topic,
        accuracy: Math.round((stats.correct / stats.total) * 100),
        attempts: stats.total,
      }));

    entries.sort((a, b) => b.accuracy - a.accuracy);

    return {
      strong: entries.slice(0, 3),
      weak: entries
        .slice()
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 3),
    };
  }

  private async getSubjectPerformance(userId: string) {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { studentId: userId, status: 'COMPLETED' },
      select: { quizSubject: true, percentage: true },
    });

    const subjectStats: Record<string, { totalPct: number; count: number }> =
      {};

    for (const a of attempts) {
      if (!subjectStats[a.quizSubject]) {
        subjectStats[a.quizSubject] = { totalPct: 0, count: 0 };
      }
      subjectStats[a.quizSubject].totalPct += a.percentage;
      subjectStats[a.quizSubject].count++;
    }

    return Object.entries(subjectStats).map(([subject, stats]) => ({
      subject,
      accuracy: Math.round(stats.totalPct / stats.count),
      attempts: stats.count,
    }));
  }

  private async computeBadges(userId: string) {
    const stats = (await this.getStats(userId)).data.stats;

    return [
      {
        id: 'first-quiz',
        name: 'First Steps',
        desc: 'Attempted your first quiz',
        icon: 'Sparkles',
        tier: 'bronze',
        unlocked: stats.quizzesAttempted >= 1,
      },
      {
        id: 'streak-7',
        name: 'Week Warrior',
        desc: '7-day learning streak',
        icon: 'Flame',
        tier: 'silver',
        unlocked: stats.streak >= 7,
      },
      {
        id: 'streak-30',
        name: 'Unstoppable',
        desc: '30-day streak',
        icon: 'Zap',
        tier: 'gold',
        unlocked: stats.streak >= 30,
      },
      {
        id: 'accuracy-80',
        name: 'Sharpshooter',
        desc: '80% accuracy overall',
        icon: 'Target',
        tier: 'silver',
        unlocked: stats.accuracy >= 80 && stats.quizzesAttempted >= 5,
      },
      {
        id: 'ten-quizzes',
        name: 'Quiz Enthusiast',
        desc: 'Complete 10 quizzes',
        icon: 'BookOpen',
        tier: 'silver',
        unlocked: stats.quizzesAttempted >= 10,
      },
      {
        id: 'fifty-quizzes',
        name: 'Quiz Master',
        desc: 'Complete 50 quizzes',
        icon: 'Crown',
        tier: 'gold',
        unlocked: stats.quizzesAttempted >= 50,
      },
      {
        id: 'hundred-solved',
        name: 'Century Club',
        desc: 'Solve 100 questions',
        icon: 'Award',
        tier: 'silver',
        unlocked: stats.questionsSolved >= 100,
      },
      {
        id: 'thousand-solved',
        name: 'Knowledge Engine',
        desc: 'Solve 1000 questions',
        icon: 'Rocket',
        tier: 'platinum',
        unlocked: stats.questionsSolved >= 1000,
      },
    ];
  }

  private timeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  }
}
