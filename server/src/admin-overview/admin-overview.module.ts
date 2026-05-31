import { Module } from '@nestjs/common';
import { AdminOverviewController } from './admin-overview.controller.js';
import { AdminOverviewService } from './admin-overview.service.js';

@Module({
  controllers: [AdminOverviewController],
  providers: [AdminOverviewService],
})
export class AdminOverviewModule {}
