import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role, PaymentStatus, PaymentMode } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AdminOverviewService } from './admin-overview.service.js';

type PeriodKey = 'today' | '7d' | '30d' | 'qtd' | 'ytd';
const ALLOWED_PERIODS: PeriodKey[] = ['today', '7d', '30d', 'qtd', 'ytd'];

const ALLOWED_STATUS: (PaymentStatus | 'ALL')[] = ['ALL', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'];
const ALLOWED_MODE: (PaymentMode | 'ALL')[] = ['ALL', 'ONE_TIME', 'SUBSCRIPTION'];

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

  @Get('system-health')
  getSystemHealth() {
    return this.overview.getSystemHealth();
  }

  // Paginated transaction list — separate from the overview KPI roll-up so
  // the dashboard's 30-day MRR query doesn't have to pull every row.
  @Get('transactions')
  listTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('mode') mode?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const s = (ALLOWED_STATUS.includes(status as PaymentStatus | 'ALL') ? status : 'ALL') as PaymentStatus | 'ALL';
    const m = (ALLOWED_MODE.includes(mode as PaymentMode | 'ALL') ? mode : 'ALL') as PaymentMode | 'ALL';
    return this.overview.listTransactions({
      page: page ? parseInt(page, 10) || 1 : 1,
      limit: limit ? parseInt(limit, 10) || 20 : 20,
      status: s, mode: m, search, from, to,
    });
  }
}
