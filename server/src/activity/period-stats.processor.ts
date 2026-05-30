import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE } from '../events/queue-names.js';
import { PeriodStatsService } from './period-stats.service.js';

interface StatsRollupJobData {
  userId?: string;          // single-user rollup; falls back to "all active" if absent
  periodDays?: number;      // single-period rollup; otherwise hits 1/7/30/90
  endDate?: string;         // ISO string; defaults to now
}

@Processor(QUEUE.STATS_ROLLUP)
export class PeriodStatsProcessor extends WorkerHost {
  private readonly logger = new Logger(PeriodStatsProcessor.name);

  constructor(private readonly stats: PeriodStatsService) {
    super();
  }

  async process(job: Job<StatsRollupJobData>): Promise<{ processed: number }> {
    const { userId, periodDays, endDate } = job.data;
    const at = endDate ? new Date(endDate) : new Date();

    if (userId && periodDays) {
      await this.stats.compute(userId, periodDays, at);
      return { processed: 1 };
    }
    if (userId) {
      for (const days of [1, 7, 30, 90]) {
        await this.stats.compute(userId, days, at);
      }
      return { processed: 4 };
    }

    const result = await this.stats.rolloverAllActiveUsers(at);
    return { processed: result.users * 4 };
  }
}
