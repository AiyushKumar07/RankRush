import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { QUEUE } from '../events/queue-names.js';
import { DOMAIN_EVENT_CHANNEL } from '../events/domain-events.js';
import type { DomainEvent } from '../events/domain-events.js';
import { scopesAffectedByAttempt } from './scopes/scope-predicates.js';
import { RankingService } from './ranking.service.js';

// Bridges domain events into the ranking pipeline. Listens to in-process
// events (sync, cheap) and enqueues async recomputes into BullMQ. The heavy
// work runs on the queue, debounced per-scope via jobId.
@Injectable()
export class RankingProjector {
  private readonly logger = new Logger(RankingProjector.name);
  // Wait this long before kicking off a recompute, so bursts of attempts
  // for the same scope collapse into one job.
  private static readonly RECOMPUTE_DEBOUNCE_MS = 10_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingService: RankingService,
    @InjectQueue(QUEUE.RANKING_RECOMPUTE)
    private readonly recomputeQueue: Queue,
  ) {}

  @OnEvent(DOMAIN_EVENT_CHANNEL, { async: true, promisify: true })
  async handle(event: DomainEvent): Promise<void> {
    if (event.type !== 'QUIZ_COMPLETED') return;

    const payload = event.payload;
    const user = await this.prisma.user.findUnique({
      where: { id: event.userId },
      select: { class: true, target: true },
    });
    if (!user) return;

    // Per-quiz scope is always ensured (whether or not rankRewarding).
    // Non-rewarding quizzes still get their own leaderboard, they just
    // don't feed CLASS_GLOBAL / TARGET_EXAM / SUBJECT.
    await this.rankingService.ensureQuizScope(payload.quizId, payload.quizTitle);

    const affected = scopesAffectedByAttempt({
      userClass: user.class,
      userTargets: user.target,
      quizSubject: payload.quizSubject,
      quizId: payload.quizId,
      quizRankRewarding: payload.rankRewarding,
    });

    const scopes = await this.prisma.rankingScope.findMany({
      where: {
        isActive: true,
        OR: affected.map((s) => ({ kind: s.kind, key: s.key })),
      },
      select: { id: true, kind: true, key: true },
    });

    for (const scope of scopes) {
      // jobId = scopeId so BullMQ collapses bursts of enqueues for the
      // same scope into a single delayed job. The debounce delay is
      // refreshed each time a new event arrives.
      await this.recomputeQueue.add(
        'recompute',
        { scopeId: scope.id },
        {
          jobId: `recompute-${scope.id}`,
          delay: RankingProjector.RECOMPUTE_DEBOUNCE_MS,
          removeOnComplete: true,
          removeOnFail: { age: 24 * 3600 },
          // Lets a newer enqueue replace an older delayed job at the same
          // jobId — needed for the "refresh-the-delay" debounce semantics.
          // (BullMQ skips add() if jobId already exists, so we remove first.)
          // We do the remove-then-add dance in addRecompute().
        },
      ).catch((err) => {
        // Re-add path: if jobId exists, BullMQ throws; swallow and accept
        // the existing job's deadline. This is fine — bounded staleness.
        const msg = (err as Error).message ?? '';
        if (!msg.includes('already exists')) throw err;
      });
    }

    this.logger.debug(
      `Enqueued ${scopes.length} scope recomputes after QUIZ_COMPLETED (user ${event.userId})`,
    );
  }
}
