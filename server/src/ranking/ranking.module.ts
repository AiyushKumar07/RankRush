import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { WrpScorer } from './scorers/wrp.scorer.js';
import { BestAttemptScorer } from './scorers/best-attempt.scorer.js';
import { SumPercentagesScorer } from './scorers/sum-percentages.scorer.js';
import { ScorerRegistry } from './scorers/scorer-registry.js';
import { RankingService } from './ranking.service.js';
import { RankingProjector } from './ranking.projector.js';
import { RankingRecomputeProcessor } from './queue-processors/ranking-recompute.processor.js';
import { RankingSnapshotProcessor } from './queue-processors/ranking-snapshot.processor.js';
import { RankingCronService } from './ranking-cron.service.js';
import { QuizLifecycleService } from './quiz-lifecycle.service.js';

// EventsModule is @Global so we don't re-import it here for EventBusService.
// BullMQ queues are exported by EventsModule, so InjectQueue works directly.
@Module({
  imports: [PrismaModule],
  providers: [
    WrpScorer,
    BestAttemptScorer,
    SumPercentagesScorer,
    ScorerRegistry,
    RankingService,
    RankingProjector,
    RankingRecomputeProcessor,
    RankingSnapshotProcessor,
    RankingCronService,
    QuizLifecycleService,
  ],
  exports: [RankingService, QuizLifecycleService],
})
export class RankingModule {}
