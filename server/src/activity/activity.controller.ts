import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ActivityService } from './activity.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  FeedQueryDto,
  HeatmapQueryDto,
  RankHistoryQueryDto,
  StatsQueryDto,
} from './dto/feed-query.dto.js';

@Controller('api/activity')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get('feed')
  getFeed(
    @CurrentUser('id') userId: string,
    @Query() q: FeedQueryDto,
  ) {
    return this.activity.getFeed(userId, q);
  }

  @Get('feed/counts')
  getCounts(
    @CurrentUser('id') userId: string,
    @Query() q: StatsQueryDto,
  ) {
    return this.activity.getCategoryCounts(userId, q.period);
  }

  @Get('stats')
  getStats(
    @CurrentUser('id') userId: string,
    @Query() q: StatsQueryDto,
  ) {
    return this.activity.getStats(userId, q.period ?? '7d');
  }

  @Get('rank-history')
  getRankHistory(
    @CurrentUser('id') userId: string,
    @Query() q: RankHistoryQueryDto,
  ) {
    return this.activity.getRankHistory(
      userId,
      q.period ?? '7d',
      q.scopeKind,
      q.scopeKey,
    );
  }

  @Get('subject-accuracy')
  getSubjectAccuracy(
    @CurrentUser('id') userId: string,
    @Query() q: StatsQueryDto,
  ) {
    return this.activity.getSubjectAccuracy(userId, q.period ?? '7d');
  }

  @Get('heatmap')
  getHeatmap(
    @CurrentUser('id') userId: string,
    @Query() q: HeatmapQueryDto,
  ) {
    return this.activity.getHeatmap(userId, q.days);
  }

  @Get('export.csv')
  async exportCsv(
    @CurrentUser('id') userId: string,
    @Query() q: FeedQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.activity.exportCsv(userId, q);
    const filename = `rankrush-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
