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
  QueryHistoryDto,
} from './dto/student.dto.js';
import { TokensService } from '../tokens/tokens.service.js';
import { EntitlementsService } from '../entitlements/entitlements.service.js';
import { EventBusService } from '../events/event-bus.service.js';

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
    private eventBus: EventBusService,
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
  // Used by the main QuizzesPage. Supports:
  //   subject / type / search / difficulty bucket / time bucket /
  //   status bucket (new|progress|done) / savedOnly / sort
  // and decorates each row with the caller's state (isSaved, inProgress,
  // lastScore, attempt counts).
  async listQuizzes(userId: string, query: QueryStudentQuizzesDto) {
    const page = query.page || 1;
    const limit = query.limit || 30;
    const skip = (page - 1) * limit;

    const where: Prisma.QuizWhereInput = { status: 'ACTIVE' };
    if (query.subject) {
      where.subject = { equals: query.subject, mode: 'insensitive' };
    }
    if (query.type) {
      where.paperType = query.type;
    }
    if (query.difficulty) {
      where.difficulty = { equals: query.difficulty, mode: 'insensitive' };
    }
    if (query.time === 'lt10') where.timeLimitMins = { lt: 10 };
    else if (query.time === '10-20')
      where.timeLimitMins = { gte: 10, lte: 20 };
    else if (query.time === 'gt20') where.timeLimitMins = { gt: 20 };
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { subject: { contains: query.search, mode: 'insensitive' } },
        { chapter: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Pre-filter by savedOnly / status (these scope to the caller, so we
    // resolve the set of allowed quiz ids first, then intersect into `where`).
    const savedOnly = String(query.savedOnly || '').toLowerCase() === 'true';
    if (savedOnly) {
      const saved = await this.prisma.savedQuiz.findMany({
        where: { studentId: userId },
        select: { quizId: true },
      });
      where.id = { in: saved.map((s) => s.quizId) };
      if (saved.length === 0) {
        return {
          data: { quizzes: [] },
          pagination: { page, limit, total: 0, pages: 0 },
        };
      }
    }
    if (query.status === 'progress') {
      const inProg = await this.prisma.quizAttempt.findMany({
        where: { studentId: userId, status: 'IN_PROGRESS' },
        select: { quizId: true },
      });
      const ids = inProg.map((a) => a.quizId);
      where.id = mergeIdFilter(where.id, ids);
    } else if (query.status === 'done') {
      const done = await this.prisma.quizAttempt.findMany({
        where: { studentId: userId, status: 'COMPLETED' },
        select: { quizId: true },
      });
      where.id = mergeIdFilter(where.id, Array.from(new Set(done.map((a) => a.quizId))));
    } else if (query.status === 'new') {
      const touched = await this.prisma.quizAttempt.findMany({
        where: { studentId: userId },
        select: { quizId: true },
      });
      const excluded = Array.from(new Set(touched.map((a) => a.quizId)));
      where.id = mergeIdFilter(where.id, undefined, excluded);
    }

    // Sort
    let orderBy: Prisma.QuizOrderByWithRelationInput = { createdAt: 'desc' };
    switch (query.sort) {
      case 'newest':       orderBy = { createdAt: 'desc' }; break;
      case 'hardest':      orderBy = { difficulty: 'desc' }; break;
      case 'shortest':     orderBy = { timeLimitMins: 'asc' }; break;
      case 'popular':
      case 'recommended':
      default:             orderBy = { createdAt: 'desc' }; break;
    }

    const [quizzes, total] = await Promise.all([
      this.prisma.quiz.findMany({
        where,
        orderBy,
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
          rankRewarding: true,
          attemptCost: true,
          createdAt: true,
        },
      }),
      this.prisma.quiz.count({ where }),
    ]);

    const enriched = await this.enrichQuizList(userId, quizzes);

    return {
      data: { quizzes: enriched },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ── Subject facets + side counts for the page tab bar ─────────────
  async getQuizFacets(userId: string) {
    const [bySubject, byPaperType, savedCount, attempted] = await Promise.all([
      this.prisma.quiz.groupBy({
        by: ['subject'],
        where: { status: 'ACTIVE' },
        _count: { _all: true },
      }),
      this.prisma.quiz.groupBy({
        by: ['paperType'],
        where: { status: 'ACTIVE' },
        _count: { _all: true },
      }),
      this.prisma.savedQuiz.count({ where: { studentId: userId } }),
      this.prisma.quizAttempt.findMany({
        where: { studentId: userId, status: 'COMPLETED' },
        select: { quizId: true },
        distinct: ['quizId'],
      }),
    ]);

    const totalActive = bySubject.reduce((s, r) => s + r._count._all, 0);
    return {
      data: {
        subjects: bySubject.map((s) => ({
          key: s.subject,
          count: s._count._all,
        })),
        paperTypes: byPaperType
          .filter((p) => p.paperType)
          .map((p) => ({ key: p.paperType!, count: p._count._all })),
        totals: {
          all: totalActive,
          saved: savedCount,
          history: attempted.length,
        },
      },
    };
  }

  // ── Saved quizzes (no pagination — typically small) ────────────────
  async listSavedQuizzes(userId: string) {
    const saved = await this.prisma.savedQuiz.findMany({
      where: { studentId: userId },
      orderBy: { savedAt: 'desc' },
      select: { quizId: true, savedAt: true },
    });
    if (saved.length === 0) {
      return { data: { quizzes: [] } };
    }
    const quizzes = await this.prisma.quiz.findMany({
      where: { id: { in: saved.map((s) => s.quizId) }, status: 'ACTIVE' },
      select: {
        id: true, quizId: true, title: true, description: true,
        subject: true, chapter: true, topic: true, className: true,
        totalMarks: true, totalQuestions: true, timeLimitMins: true,
        difficulty: true, tags: true, paperType: true, year: true,
        rankRewarding: true, attemptCost: true, createdAt: true,
      },
    });
    const order = new Map(saved.map((s, i) => [s.quizId, i]));
    quizzes.sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    );
    const enriched = await this.enrichQuizList(userId, quizzes);
    return { data: { quizzes: enriched } };
  }

  async saveQuiz(userId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    try {
      await this.prisma.savedQuiz.create({
        data: { studentId: userId, quizId },
      });
    } catch (e: any) {
      // Unique constraint — already saved, treat as idempotent.
      if (e?.code !== 'P2002') throw e;
    }
    return { message: 'Saved', data: { saved: true } };
  }

  async unsaveQuiz(userId: string, quizId: string) {
    await this.prisma.savedQuiz.deleteMany({
      where: { studentId: userId, quizId },
    });
    return { message: 'Removed', data: { saved: false } };
  }

  // ── Quiz history (one row per attempted quiz) ──────────────────────
  // Aggregates all completed attempts by quizId. For rank-rewarding
  // quizzes, joins the caller's per-quiz RankingScore so the UI can show
  // "#3 / 142 ranked" inline.
  async getQuizHistory(userId: string, query: QueryHistoryDto) {
    const page = query.page || 1;
    const limit = query.limit || 30;

    // Pull all completed attempts (no quiz cap; one user usually has
    // hundreds at most). We aggregate in memory rather than via groupBy
    // because Prisma's groupBy can't return MIN(completedAt) + MAX(percentage)
    // alongside the related quiz in a single round-trip.
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { studentId: userId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        quizId: true,
        percentage: true,
        score: true,
        totalMarks: true,
        correctCount: true,
        incorrectCount: true,
        timeTakenSecs: true,
        completedAt: true,
      },
    });

    type Agg = {
      quizId: string;
      attempts: number;
      bestPct: number;
      bestAttemptId: string;
      lastAttemptId: string;
      lastAttemptAt: Date | null;
      lastPct: number;
    };
    const aggByQuizId = new Map<string, Agg>();
    for (const a of attempts) {
      const cur = aggByQuizId.get(a.quizId);
      if (!cur) {
        aggByQuizId.set(a.quizId, {
          quizId: a.quizId,
          attempts: 1,
          bestPct: a.percentage,
          bestAttemptId: a.id,
          lastAttemptId: a.id,
          lastAttemptAt: a.completedAt,
          lastPct: a.percentage,
        });
      } else {
        cur.attempts += 1;
        if (a.percentage > cur.bestPct) {
          cur.bestPct = a.percentage;
          cur.bestAttemptId = a.id;
        }
        // first-seen wins on lastAttempt since attempts is sorted DESC
      }
    }

    const sorted = [...aggByQuizId.values()].sort(
      (a, b) =>
        (b.lastAttemptAt?.getTime() ?? 0) - (a.lastAttemptAt?.getTime() ?? 0),
    );
    const total = sorted.length;
    const start = (page - 1) * limit;
    const pageRows = sorted.slice(start, start + limit);

    if (pageRows.length === 0) {
      return {
        data: { history: [] },
        pagination: { page, limit, total, pages: 0 },
      };
    }

    const quizIds = pageRows.map((r) => r.quizId);

    const [quizzes, quizScopes] = await Promise.all([
      this.prisma.quiz.findMany({
        where: { id: { in: quizIds } },
        select: {
          id: true, quizId: true, title: true, subject: true, chapter: true,
          topic: true, totalQuestions: true, timeLimitMins: true,
          difficulty: true, paperType: true, rankRewarding: true,
          isClosed: true, closedAt: true,
          quizStartsAt: true, quizEndsAt: true,
        },
      }),
      this.prisma.rankingScope.findMany({
        where: { kind: 'QUIZ', key: { in: quizIds } },
        select: { id: true, key: true },
      }),
    ]);

    const quizById = new Map(quizzes.map((q) => [q.id, q]));
    const scopeIdByQuizId = new Map(quizScopes.map((s) => [s.key, s.id]));
    const scopeIds = quizScopes.map((s) => s.id);

    const [myScores, totalParticipantsByScope] = await Promise.all([
      this.prisma.rankingScore.findMany({
        where: { userId, scopeId: { in: scopeIds } },
        select: { scopeId: true, rank: true, score: true },
      }),
      scopeIds.length
        ? this.prisma.rankingScore.groupBy({
            by: ['scopeId'],
            where: { scopeId: { in: scopeIds }, rank: { not: null } },
            _count: { _all: true },
          })
        : Promise.resolve([] as Array<{ scopeId: string; _count: { _all: number } }>),
    ]);
    const myScoreByScopeId = new Map(myScores.map((m) => [m.scopeId, m]));
    const totalByScopeId = new Map(
      totalParticipantsByScope.map((t) => [t.scopeId, t._count._all]),
    );

    const history = pageRows.map((row) => {
      const quiz = quizById.get(row.quizId);
      const scopeId = scopeIdByQuizId.get(row.quizId);
      const mine = scopeId ? myScoreByScopeId.get(scopeId) : null;
      const totalParticipants = scopeId
        ? (totalByScopeId.get(scopeId) ?? 0)
        : 0;

      return {
        quizId: row.quizId,
        quizCode: quiz?.quizId ?? null,
        title: quiz?.title ?? 'Untitled quiz',
        subject: quiz?.subject ?? null,
        chapter: quiz?.chapter ?? null,
        topic: quiz?.topic ?? null,
        totalQuestions: quiz?.totalQuestions ?? 0,
        timeLimitMins: quiz?.timeLimitMins ?? 0,
        difficulty: quiz?.difficulty ?? null,
        paperType: quiz?.paperType ?? null,
        rankRewarding: !!quiz?.rankRewarding,
        attempts: row.attempts,
        bestPct: Math.round(row.bestPct),
        lastPct: Math.round(row.lastPct),
        lastAttemptAt: row.lastAttemptAt,
        lastAttemptId: row.lastAttemptId,
        bestAttemptId: row.bestAttemptId,
        leaderboard: quiz?.rankRewarding
          ? {
              kind: 'QUIZ' as const,
              key: row.quizId,
              isClosed: !!quiz?.isClosed,
              closedAt: quiz?.closedAt ?? null,
              quizStartsAt: quiz?.quizStartsAt ?? null,
              quizEndsAt: quiz?.quizEndsAt ?? null,
              myRank: mine?.rank ?? null,
              myScore: mine?.score ?? null,
              totalParticipants,
            }
          : null,
      };
    });

    return {
      data: { history },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // ── Today's pick (one suggested quiz, with context) ────────────────
  // Priority order:
  //   1) An IN_PROGRESS attempt the user can resume.
  //   2) A rank-rewarding quiz that's LIVE right now (window open,
  //      not yet closed) and the user hasn't completed.
  //   3) A rank-rewarding quiz that's UPCOMING (quizStartsAt > now).
  //   4) Fallback — a never-attempted active quiz aimed at a weak topic.
  //   5) Last resort — any active quiz the user hasn't done.
  async getTodaysPick(userId: string) {
    const now = new Date();
    const quizSelect = {
      id: true, quizId: true, title: true, description: true,
      subject: true, chapter: true, topic: true,
      totalQuestions: true, timeLimitMins: true, difficulty: true,
      paperType: true, rankRewarding: true,
      attemptCost: true,
      quizStartsAt: true, quizEndsAt: true, isClosed: true,
    } as const;

    // 1) In-progress — pick the most recent one.
    const inProgressAttempt = await this.prisma.quizAttempt.findFirst({
      where: { studentId: userId, status: 'IN_PROGRESS' },
      orderBy: { startedAt: 'desc' },
      select: { quizId: true, startedAt: true },
    });
    // `pick` is whatever the selected subset returns — typed as `any` so we
    // don't have to thread the inferred select-shape through five branches.
    let pick: any = null;
    let pickKind: 'resume' | 'live' | 'upcoming' | 'suggested' = 'suggested';

    if (inProgressAttempt) {
      pick = await this.prisma.quiz.findUnique({
        where: { id: inProgressAttempt.quizId },
        select: quizSelect,
      });
      if (pick) pickKind = 'resume';
    }

    // Build the set of quizzes the user has already completed — used to
    // skip "done" contests when picking a live/upcoming one.
    const completed = pick
      ? []
      : await this.prisma.quizAttempt.findMany({
          where: { studentId: userId, status: 'COMPLETED' },
          select: { quizId: true },
          distinct: ['quizId'],
        });
    const completedIds = completed.map((c) => c.quizId);
    const excludeIfAny = completedIds.length ? completedIds : ['000000000000000000000000'];

    // 2) Live rank-rewarding quiz — window is open and not yet closed.
    if (!pick) {
      pick = await this.prisma.quiz.findFirst({
        where: {
          status: 'ACTIVE',
          rankRewarding: true,
          isClosed: false,
          id: { notIn: excludeIfAny },
          AND: [
            { OR: [{ quizStartsAt: null }, { quizStartsAt: { lte: now } }] },
            { OR: [{ quizEndsAt: null },   { quizEndsAt:   { gt:  now } }] },
          ],
        },
        // Closing soonest first — "play this before it closes".
        orderBy: [{ quizEndsAt: 'asc' }, { createdAt: 'desc' }],
        select: quizSelect,
      });
      if (pick) pickKind = 'live';
    }

    // 3) Upcoming rank-rewarding quiz — window opens later.
    if (!pick) {
      pick = await this.prisma.quiz.findFirst({
        where: {
          status: 'ACTIVE',
          rankRewarding: true,
          isClosed: false,
          quizStartsAt: { gt: now },
        },
        orderBy: { quizStartsAt: 'asc' },
        select: quizSelect,
      });
      if (pick) pickKind = 'upcoming';
    }

    // 4) Fallback — weak-topic suggestion (existing behaviour).
    if (!pick) {
      const insights = await this.getTopicInsights(userId);
      const weakTopics = insights.weak.map((t) => t.topic);
      const attempted = await this.prisma.quizAttempt.findMany({
        where: { studentId: userId },
        select: { quizId: true },
        distinct: ['quizId'],
      });
      const excluded = attempted.map((a) => a.quizId);
      const excludedOrPlaceholder = excluded.length ? excluded : ['000000000000000000000000'];

      pick = await this.prisma.quiz.findFirst({
        where: {
          status: 'ACTIVE',
          id: { notIn: excludedOrPlaceholder },
          OR: weakTopics.length
            ? [
                { topic: { in: weakTopics } },
                { chapter: { in: weakTopics } },
              ]
            : undefined,
        },
        orderBy: { createdAt: 'desc' },
        select: quizSelect,
      });

      // 5) Last resort.
      if (!pick) {
        pick = await this.prisma.quiz.findFirst({
          where: {
            status: 'ACTIVE',
            id: { notIn: excludedOrPlaceholder },
          },
          orderBy: { createdAt: 'desc' },
          select: quizSelect,
        });
      }
    }
    if (!pick) return { data: { pick: null } };

    // Context strip: last attempt for this user on the picked quiz's
    // subject + class average for the picked quiz.
    const [lastSubjectAttempt, classAvg] = await Promise.all([
      this.prisma.quizAttempt.findFirst({
        where: {
          studentId: userId,
          status: 'COMPLETED',
          quizSubject: pick.subject,
        },
        orderBy: { completedAt: 'desc' },
        select: {
          quizTitle: true,
          percentage: true,
          score: true,
          totalMarks: true,
        },
      }),
      this.prisma.quizAttempt.aggregate({
        where: { quizId: pick.id, status: 'COMPLETED' },
        _avg: { percentage: true, score: true },
        _count: { _all: true },
      }),
    ]);

    return {
      data: {
        pick: {
          ...pick,
          kind: pickKind,
          context: {
            lastSubjectAttempt: lastSubjectAttempt
              ? {
                  quizTitle: lastSubjectAttempt.quizTitle,
                  percentage: Math.round(lastSubjectAttempt.percentage),
                  score: lastSubjectAttempt.score,
                  totalMarks: lastSubjectAttempt.totalMarks,
                }
              : null,
            classAvg: classAvg._count._all
              ? {
                  percentage: Math.round(classAvg._avg.percentage ?? 0),
                  score: Math.round((classAvg._avg.score ?? 0) * 10) / 10,
                  totalParticipants: classAvg._count._all,
                }
              : null,
          },
        },
      },
    };
  }

  // Common decoration applied to every quiz list response. Pulled out so
  // listQuizzes + listSavedQuizzes stay in lock-step.
  private async enrichQuizList<T extends { id: string }>(
    userId: string,
    quizzes: T[],
  ) {
    if (quizzes.length === 0) return [] as Array<T & {
      isSaved: boolean;
      inProgress: boolean;
      isCompleted: boolean;
      attempts: number;
      lastScore: number | null;
    }>;

    const quizIds = quizzes.map((q) => q.id);

    const [savedRows, inProgressAttempts, completedAttempts, globalCounts] =
      await Promise.all([
        this.prisma.savedQuiz.findMany({
          where: { studentId: userId, quizId: { in: quizIds } },
          select: { quizId: true },
        }),
        this.prisma.quizAttempt.findMany({
          where: {
            studentId: userId,
            quizId: { in: quizIds },
            status: 'IN_PROGRESS',
          },
          select: { quizId: true },
        }),
        this.prisma.quizAttempt.findMany({
          where: {
            studentId: userId,
            quizId: { in: quizIds },
            status: 'COMPLETED',
          },
          orderBy: { completedAt: 'desc' },
          select: { quizId: true, percentage: true },
        }),
        this.prisma.quizAttempt.groupBy({
          by: ['quizId'],
          where: { quizId: { in: quizIds }, status: 'COMPLETED' },
          _count: { id: true },
        }),
      ]);

    const savedSet = new Set(savedRows.map((s) => s.quizId));
    const inProgSet = new Set(inProgressAttempts.map((a) => a.quizId));
    const lastScoreMap = new Map<string, number>();
    for (const s of completedAttempts) {
      if (!lastScoreMap.has(s.quizId))
        lastScoreMap.set(s.quizId, Math.round(s.percentage));
    }
    const attemptCountMap = new Map(
      globalCounts.map((g) => [g.quizId, g._count.id]),
    );

    return quizzes.map((q) => ({
      ...q,
      isSaved: savedSet.has(q.id),
      inProgress: inProgSet.has(q.id),
      isCompleted: lastScoreMap.has(q.id),
      attempts: attemptCountMap.get(q.id) || 0,
      lastScore: lastScoreMap.get(q.id) ?? null,
    }));
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

    // Check token balance against this quiz's per-attempt cost. Free quizzes
    // (attemptCost = 0) skip the wallet check entirely.
    const attemptCost = quiz.attemptCost ?? 1;
    if (attemptCost > 0) {
      const wallet = await this.tokensService.getWallet(userId);
      if (wallet.balance < attemptCost) {
        throw new BadRequestException(
          attemptCost === 1
            ? 'Insufficient tokens to start this quiz'
            : `This quiz costs ${attemptCost} tokens · you have ${wallet.balance}`,
        );
      }
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

    this.eventBus.emit({
      type: 'QUIZ_STARTED',
      userId,
      refType: 'QuizAttempt',
      refId: attempt.id,
      payload: {
        attemptId: attempt.id,
        quizId,
        quizTitle: quiz.title,
        quizSubject: quiz.subject,
      },
    });

    await this.bumpDailyActivity(userId, { quizzesAttempted: 1 });

    this.logger.log(
      `Student ${userId} started attempt ${attempt.id} for quiz ${quizId}`,
    );

    return {
      message: 'Attempt started',
      data: { attemptId: attempt.id, attemptCost },
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

    // Deduct the quiz's per-attempt cost (defaults to 1; admin can set 0 for
    // free practice or higher for mocks). Proctoring failures still pay since
    // the wallet was committed at start time.
    const attemptCost = quiz.attemptCost ?? 1;
    if (attemptCost > 0) {
      await this.tokensService.debitTokens(
        userId,
        attemptCost,
        'QUIZ_CONSUMED',
        attempt.id,
        `Attempted quiz: ${quiz.title}`,
      );
    }

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

    // Phase-3 dual-write: emit the typed domain event so the new
    // ActivityEvent feed + ranking projector see this completion. The
    // legacy StudentActivity row above stays during cutover.
    if (!dto.isProctoringFailure) {
      this.eventBus.emit({
        type: 'QUIZ_COMPLETED',
        userId,
        refType: 'QuizAttempt',
        refId: attempt.id,
        payload: {
          attemptId: attempt.id,
          quizId,
          quizTitle: quiz.title,
          quizSubject: quiz.subject,
          score: dto.isProctoringFailure ? 0 : score,
          totalMarks: quiz.totalMarks,
          percentage: dto.isProctoringFailure ? 0 : percentage,
          correctCount,
          incorrectCount,
          timeTakenSecs: timeTaken,
          tokenCost: attemptCost,
          rankRewarding: quiz.rankRewarding,
        },
      });

      // Daily-activity rollup — only on real completions, not proctoring
      // failures. Tracks completed quizzes + answered questions + minutes.
      await this.bumpDailyActivity(userId, {
        quizzesCompleted: 1,
        questionsAnswered: correctCount + incorrectCount,
        minutesActive: Math.max(0, Math.round(timeTaken / 60)),
      });
    }

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

  // ── Streak garden (last N days, default 60) ─────────────────────
  // Returns one cell per UTC day: { date, level (0–4), loginCount,
  // quizzesCompleted, questionsAnswered, minutesActive }. Level is a
  // simple intensity bucket so the UI can color the heat-grid without
  // running its own thresholds.
  async getStreakGarden(userId: string, days = 60) {
    const safeDays = Math.min(Math.max(days, 7), 365);

    const now = new Date();
    const todayUtc = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    ));
    const startUtc = new Date(todayUtc.getTime() - (safeDays - 1) * 86_400_000);

    const [rows, user] = await Promise.all([
      this.prisma.dailyActivity.findMany({
        where: { userId, date: { gte: startUtc, lte: todayUtc } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { streak: true, longestStreak: true },
      }),
    ]);

    const byKey = new Map(
      rows.map((r) => [r.date.toISOString().slice(0, 10), r]),
    );

    const cells: Array<{
      date: string;
      level: number;
      loggedIn: boolean;
      loginCount: number;
      quizzesCompleted: number;
      questionsAnswered: number;
      minutesActive: number;
    }> = [];
    let blooms = 0;
    let misses = 0;

    for (let i = 0; i < safeDays; i++) {
      const d = new Date(startUtc.getTime() + i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      const row = byKey.get(key);
      const q = row?.quizzesCompleted ?? 0;
      const loggedIn = !!row?.loggedIn;
      // 0 = no activity, 1 = login only, 2 = 1 quiz, 3 = 2-3 quizzes, 4 = 4+
      let level = 0;
      if (q >= 4) level = 4;
      else if (q >= 2) level = 3;
      else if (q >= 1) level = 2;
      else if (loggedIn) level = 1;

      if (q >= 4) blooms++;
      if (level === 0 && d.getTime() < todayUtc.getTime()) misses++;

      cells.push({
        date: key,
        level,
        loggedIn,
        loginCount: row?.loginCount ?? 0,
        quizzesCompleted: q,
        questionsAnswered: row?.questionsAnswered ?? 0,
        minutesActive: row?.minutesActive ?? 0,
      });
    }

    const totalMinutes = cells.reduce((s, c) => s + c.minutesActive, 0);

    return {
      data: {
        days: safeDays,
        streak: user?.streak ?? 0,
        longestStreak: user?.longestStreak ?? 0,
        blooms,
        misses,
        totalMinutes,
        cells,
      },
    };
  }

  // ── Private helpers ─────────────────────────────────────────────

  // Upsert today's DailyActivity row, incrementing the supplied counters.
  // Called by startAttempt / submitAttempt; the auth flow upserts its own
  // row on login. Keyed on UTC day-start so timezone wobble can't split a
  // single day across two rows.
  private async bumpDailyActivity(
    userId: string,
    deltas: Partial<{
      quizzesAttempted: number;
      quizzesCompleted: number;
      questionsAnswered: number;
      minutesActive: number;
    }>,
  ) {
    const now = new Date();
    const utcDay = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    ));
    await this.prisma.dailyActivity.upsert({
      where: { userId_date: { userId, date: utcDay } },
      create: {
        userId,
        date: utcDay,
        quizzesAttempted: deltas.quizzesAttempted ?? 0,
        quizzesCompleted: deltas.quizzesCompleted ?? 0,
        questionsAnswered: deltas.questionsAnswered ?? 0,
        minutesActive: deltas.minutesActive ?? 0,
      },
      update: {
        ...(deltas.quizzesAttempted ? { quizzesAttempted: { increment: deltas.quizzesAttempted } } : {}),
        ...(deltas.quizzesCompleted ? { quizzesCompleted: { increment: deltas.quizzesCompleted } } : {}),
        ...(deltas.questionsAnswered ? { questionsAnswered: { increment: deltas.questionsAnswered } } : {}),
        ...(deltas.minutesActive ? { minutesActive: { increment: deltas.minutesActive } } : {}),
      },
    });
  }

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

  private async getTopicInsights(userId: string, limit = 4) {
    const analytics = await this.getTopicAnalytics(userId, { limit });
    return { strong: analytics.data.strong, weak: analytics.data.weak };
  }

  // ── Topic analytics (public — dashboard + analytics page share this) ──
  // Returns:
  //   summary    : overall accuracy + counts across all completed attempts
  //   strong/weak: top/bottom-N topics by accuracy (limit configurable)
  //   bySubject  : per-subject accuracy roll-up
  //   needsMore  : topics not yet in strong/weak but with promising signals
  //
  // Gating: Free + Starter are hard-capped to 5 topics per list and don't
  // receive the bySubject / needsMore breakdowns — those require the
  // DETAILED_ANALYTICS entitlement (Pro). The response always carries
  // `gated.locked` so the client can render a paywall instead of an
  // empty-looking deep view.
  async getTopicAnalytics(
    userId: string,
    opts: { limit?: number; minSamples?: number } = {},
  ) {
    const hasDetailed = await this.entitlements.hasFeature(userId, 'DETAILED_ANALYTICS');
    const FREE_TIER_CAP = 5;
    const requested = opts.limit ?? 4;
    const limit = hasDetailed
      ? Math.min(Math.max(requested, 1), 100)
      : Math.min(Math.max(requested, 1), FREE_TIER_CAP);
    const minSamples = opts.minSamples ?? 3;

    const attempts = await this.prisma.quizAttempt.findMany({
      where: { studentId: userId, status: 'COMPLETED' },
      select: { questionResults: true, quizSubject: true, percentage: true },
    });

    // Topic-level roll-up — { topic → {subject, correct, total} }.
    const topicStats: Record<string, { subject: string; correct: number; total: number }> = {};
    const subjectStats: Record<string, { correct: number; total: number; quizzes: number; pctSum: number }> = {};
    let totalCorrect = 0;
    let totalAnswered = 0;

    for (const attempt of attempts) {
      const subj = attempt.quizSubject || 'General';
      if (!subjectStats[subj]) {
        subjectStats[subj] = { correct: 0, total: 0, quizzes: 0, pctSum: 0 };
      }
      subjectStats[subj].quizzes++;
      subjectStats[subj].pctSum += attempt.percentage;

      const results = attempt.questionResults as any[];
      if (!Array.isArray(results)) continue;

      for (const r of results) {
        const topic = r.topic || null;
        const subject = r.subject || subj;
        if (topic) {
          const key = topic;
          if (!topicStats[key]) topicStats[key] = { subject, correct: 0, total: 0 };
          topicStats[key].total++;
          if (r.correct) topicStats[key].correct++;
        }
        if (!subjectStats[subject]) {
          subjectStats[subject] = { correct: 0, total: 0, quizzes: 0, pctSum: 0 };
        }
        subjectStats[subject].total++;
        if (r.correct) subjectStats[subject].correct++;
        totalAnswered++;
        if (r.correct) totalCorrect++;
      }
    }

    const allTopics = Object.entries(topicStats).map(([topic, s]) => ({
      topic,
      subject: s.subject,
      accuracy: Math.round((s.correct / s.total) * 100),
      attempts: s.total,
    }));
    const ranked = allTopics.filter((t) => t.attempts >= minSamples);
    const byBestFirst = [...ranked].sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts);
    const byWorstFirst = [...ranked].sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts);

    const strong = byBestFirst.slice(0, limit);
    const weak = byWorstFirst.filter((t) => t.accuracy < 90).slice(0, limit);

    const bySubject = Object.entries(subjectStats)
      .map(([subject, s]) => ({
        subject,
        quizzes: s.quizzes,
        questions: s.total,
        accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
        avgPercentage: s.quizzes > 0 ? Math.round(s.pctSum / s.quizzes) : 0,
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    const needsMore = allTopics
      .filter((t) => t.attempts < minSamples)
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, limit);

    return {
      data: {
        summary: {
          totalAnswered,
          totalCorrect,
          accuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
          topicsTracked: ranked.length,
          quizzesCompleted: attempts.length,
        },
        strong,
        weak,
        // bySubject + needsMore are part of the detailed-analytics surface.
        // Free + Starter get empty arrays so the response shape stays
        // stable; the client renders a paywall card based on `gated.locked`.
        bySubject: hasDetailed ? bySubject : [],
        needsMore: hasDetailed ? needsMore : [],
        gated: {
          locked: !hasDetailed,
          entitlementKey: 'DETAILED_ANALYTICS' as const,
          tierCap: FREE_TIER_CAP,
        },
      },
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

// Combine an existing { in: [...] } filter with a new id list (intersection)
// and an optional exclusion list. Used when stacking caller-scoped filters
// (savedOnly + status) onto the base Quiz where clause without losing
// either constraint.
function mergeIdFilter(
  existing: Prisma.QuizWhereInput['id'],
  include?: string[],
  exclude?: string[],
): Prisma.QuizWhereInput['id'] {
  const out: { in?: string[]; notIn?: string[] } = {};
  const existingIn =
    existing && typeof existing === 'object' && 'in' in existing
      ? (existing as { in?: string[] }).in
      : undefined;

  if (include && existingIn) {
    const set = new Set(existingIn);
    out.in = include.filter((id) => set.has(id));
    if (out.in.length === 0) out.in = ['000000000000000000000000'];
  } else if (include) {
    out.in = include.length ? include : ['000000000000000000000000'];
  } else if (existingIn) {
    out.in = existingIn;
  }

  if (exclude && exclude.length) out.notIn = exclude;

  return out;
}
