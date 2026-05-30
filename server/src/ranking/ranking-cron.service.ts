import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { QUEUE } from '../events/queue-names.js';

// Drives time-based ranking work:
//   - Nightly snapshot of every scope into RankingSnapshot (rank-history chart).
//   - Nightly full recompute of every scope, so WRP scores re-apply decay
//     even for scopes that saw no traffic that day.
//
// Both run as fire-and-forget enqueues — the heavy work happens in the
// BullMQ workers so the cron tick itself stays cheap.
@Injectable()
export class RankingCronService {
  private readonly logger = new Logger(RankingCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE.RANKING_RECOMPUTE)
    private readonly recomputeQueue: Queue,
    @InjectQueue(QUEUE.RANKING_SNAPSHOT)
    private readonly snapshotQueue: Queue,
  ) {}

  // 00:05 UTC daily — full sweep + snapshot. Recompute runs first so
  // snapshots reflect today's freshly-decayed ranks.
  @Cron('5 0 * * *', { timeZone: 'UTC' })
  async nightlyRecomputeAndSnapshot(): Promise<void> {
    this.logger.log('Nightly ranking sweep starting');

    const scopes = await this.prisma.rankingScope.findMany({
      where: { isActive: true },
      select: { id: true, kind: true, key: true },
    });

    // Enqueue per-scope recomputes with a small spread so we don't hit
    // Mongo with everything at once. The recompute queue worker controls
    // actual concurrency.
    for (let i = 0; i < scopes.length; i++) {
      const s = scopes[i];
      await this.recomputeQueue.add(
        'recompute',
        { scopeId: s.id },
        {
          jobId: `nightly-recompute-${s.id}-${new Date().toISOString().slice(0, 10)}`,
          delay: i * 250,
          removeOnComplete: true,
          removeOnFail: { age: 7 * 24 * 3600 },
        },
      ).catch(() => { /* dedup-noop on jobId collision */ });
    }

    // Snapshot fires last, after the recomputes have a chance to settle.
    // Workers process recompute jobs in order; the snapshot job carries a
    // longer delay so it lands once the sweep is done.
    const snapshotDelay = Math.max(scopes.length * 500, 30_000);
    await this.snapshotQueue.add(
      'snapshot',
      { at: new Date().toISOString() },
      {
        jobId: `nightly-snapshot-${new Date().toISOString().slice(0, 10)}`,
        delay: snapshotDelay,
        removeOnComplete: true,
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    ).catch(() => { /* dedup */ });

    this.logger.log(`Nightly sweep enqueued: ${scopes.length} scopes`);
  }
}
