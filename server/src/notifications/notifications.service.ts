import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// A thin wrapper around the Notification table. Other modules call
// `create(userId, ...)` from inside their own service logic to surface
// in-app events. The bell-dropdown reads via `listForUser()`. Marking
// state is per-row (`readAt` timestamp) or in bulk (`markAllRead`).
//
// We deliberately keep this stateless: no realtime push, no fan-out.
// The frontend polls /notifications on focus/interval. If we ever add
// websockets, this is where the broadcast hook would live.
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create one notification. Called from quiz-submit, token-credit,
   * rank-change, badge-earn handlers. We swallow errors here so a
   * notification-side failure never breaks the underlying business
   * operation (a quiz submit shouldn't fail because the bell-feed had
   * a DB hiccup).
   */
  async create(params: {
    userId: string;
    type: string;
    title: string;
    body?: string;
    link?: string;
    meta?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type as any,
          title: params.title,
          body: params.body || null,
          link: params.link || null,
          meta: params.meta as any,
        },
      });
    } catch (err: any) {
      this.logger.warn(
        `Notification create failed for ${params.userId} (${params.type}): ${err?.message}`,
      );
    }
  }

  async listForUser(userId: string, { limit = 30 }: { limit?: number } = {}) {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });
    const unread = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { data: { items: rows, unreadCount: unread } };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { data: { unreadCount: count } };
  }

  async markRead(userId: string, id: string) {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    if (!row || row.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    if (row.readAt) return { data: row };
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return { data: updated };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { data: { markedCount: result.count } };
  }

  async deleteOne(userId: string, id: string) {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    if (!row || row.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    await this.prisma.notification.delete({ where: { id } });
    return { message: 'Notification deleted' };
  }

  async deleteAll(userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { userId },
    });
    return { data: { deletedCount: result.count } };
  }
}
