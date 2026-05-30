import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { LeaderboardsService } from './leaderboards.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { TopNQueryDto } from './dto/leaderboard-query.dto.js';

// Scope routing uses /:kind/:key (CLASS_GLOBAL/Class%2011, QUIZ/<quizId>,
// etc.). It's verbose but discoverable; scopeId-based routing would be
// shorter but opaque and forces a lookup at the client.
@Controller('api/leaderboards')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
export class LeaderboardsController {
  constructor(private readonly leaderboards: LeaderboardsService) {}

  // Discovery — which scopes does this user appear in, and where do they
  // rank in each? Drives the leaderboard list view. Class-cohort is always
  // returned in full; QUIZ scopes are paginated (default 10/page).
  @Get()
  listForUser(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leaderboards.listScopesForUser(userId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // Single scope — top-N or around-me view, controlled by ?view=.
  @Get(':kind/:key')
  getScope(
    @CurrentUser('id') userId: string,
    @Param('kind') kind: string,
    @Param('key') key: string,
    @Query() q: TopNQueryDto,
  ) {
    if (q.view === 'me') {
      return this.leaderboards.getAroundMe(kind, key, userId, q.window ?? 5);
    }
    return this.leaderboards.getTopN(kind, key, q.limit ?? 50);
  }

  // Compact widget data — just the current user's rank + percentile.
  @Get(':kind/:key/me')
  getMe(
    @CurrentUser('id') userId: string,
    @Param('kind') kind: string,
    @Param('key') key: string,
  ) {
    return this.leaderboards.getMe(kind, key, userId);
  }
}
