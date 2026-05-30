import { Controller, Get, UseGuards } from '@nestjs/common';
import { BadgesService } from './badges.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('api/badges')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
export class BadgesController {
  constructor(private readonly badges: BadgesService) {}

  // List every active badge + the caller's unlock state + per-badge progress.
  // Lazy evaluation: this call also persists any newly-met badges before
  // returning, so the UI never lags behind the rules.
  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.badges.listForUser(userId);
  }
}
