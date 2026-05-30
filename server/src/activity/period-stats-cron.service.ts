import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE } from '../events/queue-names.js';

// Schedules the nightly UserPeriodStats rollup. Runs slightly after the
// ranking snapshot (00:05) so rank-end values in period-stats reflect
// freshly-computed ranks.
@Injectable()
export class PeriodStatsCronService {
  private readonly logger = new Logger(PeriodStatsCronService.name);

  constructor(
    @InjectQueue(QUEUE.STATS_ROLLUP)
    private readonly queue: Queue,
  ) {}

  @Cron('15 0 * * *', { timeZone: 'UTC' })
  async enqueueNightlyRollup(): Promise<void> {
    await this.queue.add(
      'nightly-rollup',
      { endDate: new Date().toISOString() },
      {
        jobId: `period-stats-rollup-${new Date().toISOString().slice(0, 10)}`,
        removeOnComplete: true,
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    ).catch(() => { /* jobId-dedup noop */ });
    this.logger.log('Nightly period-stats rollup enqueued.');
  }
}
