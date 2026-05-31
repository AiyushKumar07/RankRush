import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AdminOverviewService } from './admin-overview.service.js';

type PeriodKey = 'today' | '7d' | '30d' | 'qtd' | 'ytd';
const ALLOWED_PERIODS: PeriodKey[] = ['today', '7d', '30d', 'qtd', 'ytd'];

// Codebase convention: every controller explicitly carries `api/` because
// main.ts doesn't call setGlobalPrefix('api'). Without this prefix the
// client's /api/admin/overview calls 404.
@Controller('api/admin/overview')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminOverviewController {
  constructor(private readonly overview: AdminOverviewService) {}

  @Get()
  getOverview(@Query('period') period?: string) {
    const p = (ALLOWED_PERIODS.includes(period as PeriodKey) ? period : '7d') as PeriodKey;
    return this.overview.getOverview(p);
  }

  @Get('revenue-trend')
  getRevenueTrend(@Query('days') days?: string) {
    const n = days ? parseInt(days, 10) || 30 : 30;
    return this.overview.getRevenueTrend(n);
  }

  @Get('top-quizzes')
  getTopQuizzes(@Query('days') days?: string, @Query('limit') limit?: string) {
    return this.overview.getTopQuizzes(
      days ? parseInt(days, 10) || 7 : 7,
      limit ? parseInt(limit, 10) || 5 : 5,
    );
  }

  @Get('activity-feed')
  getActivityFeed(@Query('limit') limit?: string) {
    return this.overview.getActivityFeed(limit ? parseInt(limit, 10) || 12 : 12);
  }
}
