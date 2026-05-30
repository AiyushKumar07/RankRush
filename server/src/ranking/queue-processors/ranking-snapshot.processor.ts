import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE } from '../../events/queue-names.js';
import { RankingService } from '../ranking.service.js';

interface SnapshotJobData {
  // Optional override; defaults to "now". Useful for backfill ("snapshot
  // ranks for 5 days ago using current scores" is meaningless — but
  // backfill scripts may want to insert a row with a specific takenAt).
  at?: string;
}

@Processor(QUEUE.RANKING_SNAPSHOT)
export class RankingSnapshotProcessor extends WorkerHost {
  private readonly logger = new Logger(RankingSnapshotProcessor.name);

  constructor(private readonly ranking: RankingService) {
    super();
  }

  async process(job: Job<SnapshotJobData>): Promise<{ scopes: number; rows: number }> {
    const at = job.data.at ? new Date(job.data.at) : new Date();
    try {
      return await this.ranking.snapshotAllScopes(at);
    } catch (err) {
      this.logger.error(`Snapshot job failed: ${(err as Error).message}`);
      throw err;
    }
  }
}
