import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AdminOverviewController } from './admin-overview.controller.js';
import { AdminOverviewService } from './admin-overview.service.js';
import { QUEUE } from '../events/queue-names.js';

// Re-registering the queues by name gives us @InjectQueue() handles without
// importing the EventsModule (it's @Global() so its queues are already
// running; this just binds the providers into this module's DI scope).
@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE.RANKING_RECOMPUTE },
      { name: QUEUE.RANKING_SNAPSHOT },
      { name: QUEUE.BADGE_EVAL },
      { name: QUEUE.STATS_ROLLUP },
    ),
  ],
  controllers: [AdminOverviewController],
  providers: [AdminOverviewService],
})
export class AdminOverviewModule {}
