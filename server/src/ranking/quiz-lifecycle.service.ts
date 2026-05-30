import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { EventBusService } from '../events/event-bus.service.js';
import { QUEUE } from '../events/queue-names.js';
import { RankingService } from './ranking.service.js';

// Manages the contest lifecycle for rank-rewarding quizzes:
//
//   rankRewarding=true → active leaderboard, attempts accepted
//   now > quizEndsAt   → cron auto-closes: isClosed=true, closedAt=now
//   closeQuizNow()     → admin override; same effect, immediate
//
// On close: locks the per-quiz leaderboard (RankingScore for QUIZ scope is
// finalized) AND triggers a CLASS_GLOBAL recompute so the freshly-closed
// quiz's scores fold into the global sum.
@Injectable()
export class QuizLifecycleService {
  private readonly logger = new Logger(QuizLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ranking: RankingService,
    private readonly eventBus: EventBusService,
    @InjectQueue(QUEUE.RANKING_RECOMPUTE)
    private readonly recomputeQueue: Queue,
  ) {}

  // Every 5 minutes — tight enough that a contest ending at 8:00 PM is
  // closed and folded into global rank by 8:05 PM, loose enough that the
  // job is cheap. The query is indexed on (rankRewarding, quizEndsAt).
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweepAndClose(): Promise<void> {
    const now = new Date();
    const due = await this.prisma.quiz.findMany({
      where: {
        rankRewarding: true,
        isClosed: false,
        quizEndsAt: { not: null, lte: now },
      },
      select: { id: true, title: true },
    });

    if (due.length === 0) return;

    this.logger.log(`Auto-closing ${due.length} quiz leaderboard(s) past end-date.`);
    for (const q of due) {
      try {
        await this.closeQuiz(q.id, /*reason*/ 'auto');
      } catch (err) {
        this.logger.error(
          `Failed to auto-close quiz ${q.id} (${q.title}): ${(err as Error).message}`,
        );
      }
    }
  }

  // Closes a quiz, locks its leaderboard, and fans out recompute events.
  // Idempotent — calling on an already-closed quiz is a no-op.
  async closeQuiz(quizId: string, reason: 'auto' | 'manual' = 'manual'): Promise<void> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true, isClosed: true, rankRewarding: true, title: true },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.isClosed) return;
    if (!quiz.rankRewarding) {
      // Defensive — non-rewarding quizzes shouldn't carry a close lifecycle.
      this.logger.warn(`closeQuiz called on non-rewarding quiz ${quizId}; skipping`);
      return;
    }

    const closedAt = new Date();
    await this.prisma.quiz.update({
      where: { id: quizId },
      data: { isClosed: true, closedAt },
    });

    this.logger.log(
      `Quiz "${quiz.title}" (${quizId}) closed via ${reason} at ${closedAt.toISOString()}`,
    );

    // 1) Re-rank the QUIZ scope one last time — this writes finalized ranks
    //    based on attempts within the live window. After this, the per-quiz
    //    board is frozen.
    const quizScope = await this.prisma.rankingScope.findUnique({
      where: { kind_key: { kind: 'QUIZ', key: quizId } },
      select: { id: true },
    });
    if (quizScope) {
      await this.recomputeQueue.add(
        'recompute',
        { scopeId: quizScope.id },
        {
          jobId: `close-${quizScope.id}-${closedAt.getTime()}`,
          removeOnComplete: true,
          removeOnFail: { age: 24 * 3600 },
        },
      ).catch(() => { /* dedup-noop */ });
    }

    // 2) Find every CLASS_GLOBAL scope that has at least one participant who
    //    attempted this quiz, and enqueue a recompute. Bounded by the number
    //    of distinct user-classes among attempters — usually 1-5.
    const attempterClasses = await this.prisma.quizAttempt.findMany({
      where: { quizId, status: 'COMPLETED' },
      select: { studentId: true },
      distinct: ['studentId'],
    });
    if (attempterClasses.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: attempterClasses.map((a) => a.studentId) } },
        select: { class: true },
      });
      const classes = new Set(users.map((u) => u.class).filter((c): c is string => !!c));
      if (classes.size > 0) {
        const scopes = await this.prisma.rankingScope.findMany({
          where: {
            kind: 'CLASS_GLOBAL',
            key: { in: [...classes] },
            isActive: true,
          },
          select: { id: true, key: true },
        });
        for (const s of scopes) {
          await this.recomputeQueue.add(
            'recompute',
            { scopeId: s.id },
            {
              jobId: `close-cg-${s.id}-${closedAt.getTime()}`,
              delay: 2_000, // let the QUIZ recompute land first
              removeOnComplete: true,
              removeOnFail: { age: 24 * 3600 },
            },
          ).catch(() => { /* dedup */ });
        }
      }
    }

    // 3) Emit a generic activity event so every attempter sees "the
    //    leaderboard closed, your final rank was X" in their timeline. Re-use
    //    the existing RANK_CHANGED event the recompute will emit.
    this.eventBus.emitInternal('quiz.lifecycle.closed', { quizId, closedAt });
  }
}
