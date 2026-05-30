import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE } from '../../events/queue-names.js';
import { RankingService } from '../ranking.service.js';

interface RecomputeJobData {
  scopeId: string;
}

@Processor(QUEUE.RANKING_RECOMPUTE)
export class RankingRecomputeProcessor extends WorkerHost {
  private readonly logger = new Logger(RankingRecomputeProcessor.name);

  constructor(private readonly ranking: RankingService) {
    super();
  }

  async process(job: Job<RecomputeJobData>): Promise<{
    usersScored: number;
    rankChangedCount: number;
  }> {
    const { scopeId } = job.data;
    try {
      return await this.ranking.recomputeScope(scopeId);
    } catch (err) {
      this.logger.error(
        `Recompute failed for scope ${scopeId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }
}
