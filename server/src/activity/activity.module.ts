import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ActivityController } from './activity.controller.js';
import { ActivityService } from './activity.service.js';
import { PeriodStatsService } from './period-stats.service.js';
import { PeriodStatsProcessor } from './period-stats.processor.js';
import { PeriodStatsCronService } from './period-stats-cron.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [ActivityController],
  providers: [
    ActivityService,
    PeriodStatsService,
    PeriodStatsProcessor,
    PeriodStatsCronService,
  ],
  exports: [ActivityService, PeriodStatsService],
})
export class ActivityModule {}
