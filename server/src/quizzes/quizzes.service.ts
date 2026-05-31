import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { RankingService } from '../ranking/ranking.service.js';
import { QuizLifecycleService } from '../ranking/quiz-lifecycle.service.js';
import {
  CreateQuizDto,
  UpdateQuizDto,
  UpdateQuizStatusDto,
  QueryQuizzesDto,
} from './dto/quizzes.dto.js';

@Injectable()
export class QuizzesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private ranking: RankingService,
    private lifecycle: QuizLifecycleService,
  ) {}

  async create(dto: CreateQuizDto, userId: string, req: any) {
    // Validate that all referenced questions exist
    const questionDbIds = dto.questions.map((q) => q.questionId);
    const existingQuestions = await this.prisma.question.findMany({
      where: { id: { in: questionDbIds } },
      select: { id: true, marks: true, negativeMarks: true },
    });

    const existingIds = new Set(existingQuestions.map((q) => q.id));
    const missing = questionDbIds.filter((id) => !existingIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Questions not found: ${missing.join(', ')}`,
      );
    }

    // Calculate totals
    const totalMarks = dto.questions.reduce((sum, q) => {
      const dbQ = existingQuestions.find((eq) => eq.id === q.questionId);
      return sum + (q.marks ?? dbQ?.marks ?? 1);
    }, 0);

    const quizId = `QUIZ-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Contest window — ignore if rankRewarding isn't on; pass through as
    // Date so Mongo stores it natively (DTO receives ISO string).
    const startsAt = dto.rankRewarding && dto.quizStartsAt ? new Date(dto.quizStartsAt) : null;
    const endsAt   = dto.rankRewarding && dto.quizEndsAt   ? new Date(dto.quizEndsAt)   : null;

    const quiz = await this.prisma.quiz.create({
      data: {
        quizId,
        title: dto.title,
        description: dto.description,
        subject: dto.subject,
        chapter: dto.chapter,
        topic: dto.topic,
        className: dto.className,
        examType: dto.examType || [],
        cohort: dto.cohort || [],
        questions: dto.questions.map((q, i) => ({
          questionId: q.questionId,
          order: q.order ?? i + 1,
          marks: q.marks,
        })),
        totalMarks,
        totalQuestions: dto.questions.length,
        timeLimitMins: dto.timeLimitMins ?? 60,
        negativeMarking: dto.negativeMarking ?? false,
        shuffleQuestions: dto.shuffleQuestions ?? false,
        difficulty: dto.difficulty,
        tags: dto.tags || [],
        attemptCost: dto.attemptCost,
        rankRewarding: dto.rankRewarding ?? false,
        quizStartsAt: startsAt,
        quizEndsAt: endsAt,
        status: 'DRAFT',
        createdBy: userId,
      },
    });

    await this.audit.log({
      action: 'CREATE',
      entityType: 'Quiz',
      entityId: quizId,
      performedBy: userId,
      newState: { title: dto.title, totalQuestions: dto.questions.length },
      req,
    });

    return {
      message: 'Quiz created successfully',
      data: { quiz: { ...quiz, _id: quiz.id } },
    };
  }

  async findAll(query: QueryQuizzesDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.QuizWhereInput = {};
    if (query.status) where.status = query.status as any;
    if (query.subject) where.subject = query.subject;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { quizId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [quizzes, total] = await Promise.all([
      this.prisma.quiz.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.quiz.count({ where }),
    ]);

    const quizzesWithCreator = await Promise.all(
      quizzes.map(async (quiz) => {
        const creator = await this.prisma.user.findUnique({
          where: { id: quiz.createdBy },
          select: { name: true, email: true },
        });
        return { ...quiz, _id: quiz.id, createdBy: creator || quiz.createdBy };
      }),
    );

    return {
      data: { quizzes: quizzesWithCreator },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  // Build a CSV of every quiz matching the filter — used by the admin
  // "Export" button. Bypasses pagination on purpose; quiz catalogs are
  // typically under a few thousand rows so an in-memory build is fine.
  // The caller is expected to be ADMIN (route guarded with quizzes:read).
  async exportCsv(query: QueryQuizzesDto): Promise<string> {
    const where: Prisma.QuizWhereInput = {};
    if (query.status) where.status = query.status as any;
    if (query.subject) where.subject = query.subject;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { quizId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.quiz.findMany({
      where, orderBy: { createdAt: 'desc' },
      select: {
        quizId: true, title: true, subject: true, chapter: true, topic: true,
        difficulty: true, status: true, totalQuestions: true, totalMarks: true,
        timeLimitMins: true, negativeMarking: true, shuffleQuestions: true,
        rankRewarding: true, isClosed: true, quizStartsAt: true, quizEndsAt: true,
        tags: true, attemptCost: true, createdBy: true, cohort: true,
        createdAt: true, updatedAt: true,
      },
    });

    // Resolve creator names in a single query — beats one-per-row.
    const creatorIds = Array.from(new Set(rows.map((r) => r.createdBy).filter(Boolean)));
    const creators = creatorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const creatorById = new Map(creators.map((u) => [u.id, u]));

    const headers = [
      'Quiz ID', 'Title', 'Subject', 'Chapter', 'Topic', 'Difficulty',
      'Status', 'Questions', 'Total marks', 'Time limit (min)',
      'Negative marking', 'Shuffle questions', 'Rank-rewarding', 'Closed',
      'Contest starts', 'Contest ends', 'Tags', 'Cohort', 'Attempt cost',
      'Created by', 'Created at', 'Updated at',
    ];

    const lines = [headers.map(csvCell).join(',')];
    for (const r of rows) {
      const creator = creatorById.get(r.createdBy);
      lines.push([
        r.quizId,
        r.title,
        r.subject,
        r.chapter ?? '',
        r.topic ?? '',
        r.difficulty ?? '',
        r.status,
        r.totalQuestions,
        r.totalMarks,
        r.timeLimitMins,
        r.negativeMarking ? 'yes' : 'no',
        r.shuffleQuestions ? 'yes' : 'no',
        r.rankRewarding ? 'yes' : 'no',
        r.isClosed ? 'yes' : 'no',
        r.quizStartsAt ? r.quizStartsAt.toISOString() : '',
        r.quizEndsAt ? r.quizEndsAt.toISOString() : '',
        (r.tags || []).join('|'),
        (r.cohort || []).join('|'),
        r.attemptCost ?? 1,
        creator ? `${creator.name} <${creator.email}>` : r.createdBy,
        r.createdAt.toISOString(),
        r.updatedAt.toISOString(),
      ].map(csvCell).join(','));
    }
    return lines.join('\n');
  }

  async findById(id: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found');

    // Fetch all question details
    const questionIds = quiz.questions.map((q) => q.questionId);
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
    });

    const questionsMap = new Map(questions.map((q) => [q.id, q]));
    const orderedQuestions = quiz.questions
      .sort((a, b) => a.order - b.order)
      .map((qq) => ({
        ...qq,
        questionData: questionsMap.get(qq.questionId) || null,
      }));

    const creator = await this.prisma.user.findUnique({
      where: { id: quiz.createdBy },
      select: { name: true, email: true, role: true },
    });

    return {
      data: {
        quiz: {
          ...quiz,
          _id: quiz.id,
          questions: orderedQuestions,
          createdBy: creator || quiz.createdBy,
        },
      },
    };
  }

  async update(id: string, dto: UpdateQuizDto, userId: string, req: any) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const updateData: any = { ...dto };

    // Contest-window fields arrive as ISO strings; Prisma needs Dates.
    if (typeof updateData.quizStartsAt === 'string') {
      updateData.quizStartsAt = new Date(updateData.quizStartsAt);
    }
    if (typeof updateData.quizEndsAt === 'string') {
      updateData.quizEndsAt = new Date(updateData.quizEndsAt);
    }

    // Recalculate totals if questions changed
    if (dto.questions) {
      const questionDbIds = dto.questions.map((q) => q.questionId);
      const existingQuestions = await this.prisma.question.findMany({
        where: { id: { in: questionDbIds } },
        select: { id: true, marks: true },
      });

      const totalMarks = dto.questions.reduce((sum, q) => {
        const dbQ = existingQuestions.find((eq) => eq.id === q.questionId);
        return sum + (q.marks ?? dbQ?.marks ?? 1);
      }, 0);

      updateData.totalMarks = totalMarks;
      updateData.totalQuestions = dto.questions.length;
      updateData.questions = dto.questions.map((q, i) => ({
        questionId: q.questionId,
        order: q.order ?? i + 1,
        marks: q.marks,
      }));
    }

    const updated = await this.prisma.quiz.update({
      where: { id },
      data: updateData,
    });

    await this.audit.log({
      action: 'UPDATE',
      entityType: 'Quiz',
      entityId: quiz.quizId,
      performedBy: userId,
      previousState: { title: quiz.title },
      newState: { title: updated.title },
      req,
    });

    return {
      message: 'Quiz updated',
      data: { quiz: { ...updated, _id: updated.id } },
    };
  }

  // Admin override — close a quiz immediately regardless of its
  // quizEndsAt. Idempotent; safe to spam.
  async closeQuizNow(id: string, userId: string, req: any) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      select: { id: true, quizId: true, title: true, isClosed: true },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    await this.lifecycle.closeQuiz(id, 'manual');

    await this.audit.log({
      action: 'STATUS_CHANGE',
      entityType: 'Quiz',
      entityId: quiz.quizId,
      performedBy: userId,
      previousState: { isClosed: quiz.isClosed },
      newState: { isClosed: true, closedAt: new Date(), reason: 'manual' },
      req,
    });

    return {
      message: `Quiz "${quiz.title}" leaderboard closed`,
      data: { quizId: id },
    };
  }

  async updateRankRewarding(
    id: string,
    rankRewarding: boolean,
    userId: string,
    req: any,
  ) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const updated = await this.prisma.quiz.update({
      where: { id },
      data: { rankRewarding },
    });

    // When flipping ON, eagerly create the per-quiz scope so the
    // leaderboard surface is live even before the first completion.
    // The ranking projector also calls ensureQuizScope on every
    // QUIZ_COMPLETED, so this is belt-and-suspenders idempotency.
    if (rankRewarding) {
      await this.ranking.ensureQuizScope(quiz.id, quiz.title);
    }

    await this.audit.log({
      action: 'UPDATE',
      entityType: 'Quiz',
      entityId: quiz.quizId,
      performedBy: userId,
      previousState: { rankRewarding: quiz.rankRewarding },
      newState: { rankRewarding },
      req,
    });

    return {
      message: `Quiz ${rankRewarding ? 'marked as' : 'removed from'} rank-rewarding`,
      data: { quiz: { ...updated, _id: updated.id } },
    };
  }

  async updateStatus(
    id: string,
    dto: UpdateQuizStatusDto,
    userId: string,
    req: any,
  ) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const data: any = { status: dto.status };
    if (dto.status === 'ACTIVE') data.publishedAt = new Date();

    const updated = await this.prisma.quiz.update({ where: { id }, data });

    await this.audit.log({
      action: 'STATUS_CHANGE',
      entityType: 'Quiz',
      entityId: quiz.quizId,
      performedBy: userId,
      previousState: { status: quiz.status },
      newState: { status: dto.status },
      req,
    });

    return {
      message: `Quiz status changed to ${dto.status}`,
      data: { quiz: { ...updated, _id: updated.id } },
    };
  }

  async remove(id: string, userId: string, req: any) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found');

    await this.prisma.quiz.delete({ where: { id } });

    await this.audit.log({
      action: 'DELETE',
      entityType: 'Quiz',
      entityId: quiz.quizId,
      performedBy: userId,
      previousState: quiz as any,
      req,
    });

    return { message: 'Quiz deleted', data: null };
  }
}

// RFC 4180-style CSV cell quoting. Wraps in quotes whenever the value
// contains a comma, quote, newline, or carriage return; doubles any
// embedded quotes. Plain values pass through unquoted so the file stays
// human-readable.
function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
