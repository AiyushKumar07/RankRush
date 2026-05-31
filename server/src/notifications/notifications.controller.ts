import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { NotificationsService } from './notifications.service.js';

// Codebase convention: every controller carries its own `api/` prefix
// (there's no app.setGlobalPrefix('api') in main.ts). Without this
// prefix the routes mount at /notifications and the client's
// /api/notifications calls 404.
@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // Bell dropdown — paginated; default 30 is enough to fill a scrollable
  // dropdown without forcing pagination on the client.
  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? parseInt(limit, 10) || 30 : 30;
    return this.notifications.listForUser(userId, { limit: n });
  }

  // Optional lightweight poll path for the unread badge — avoids
  // hauling the full row payload when the client just wants the count.
  @Get('unread-count')
  unreadCount(@CurrentUser('id') userId: string) {
    return this.notifications.getUnreadCount(userId);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notifications.markAllRead(userId);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notifications.markRead(userId, id);
  }

  @Delete('clear-all')
  deleteAll(@CurrentUser('id') userId: string) {
    return this.notifications.deleteAll(userId);
  }

  @Delete(':id')
  deleteOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notifications.deleteOne(userId, id);
  }
}
