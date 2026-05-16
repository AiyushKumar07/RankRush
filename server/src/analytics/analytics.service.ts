import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalQuestions,
      totalUsers,
      allQuestions,
      recentUploads,
      recentActivity,
    ] = await Promise.all([
      this.prisma.question.count(),
      this.prisma.user.count(),
      this.prisma.question.findMany({
        select: {
          status: true,
          questionType: true,
          difficulty: true,
          subject: true,
          createdAt: true,
        },
      }),
      this.prisma.uploadBatch.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          uploadedByUser: { select: { name: true, email: true } },
        },
      }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          performedByUser: { select: { name: true, email: true, role: true } },
        },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};
    const bySubject: Record<string, number> = {};

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let weeklyUploads = 0;

    for (const q of allQuestions) {
      byStatus[q.status] = (byStatus[q.status] || 0) + 1;
      byType[q.questionType] = (byType[q.questionType] || 0) + 1;
      byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
      bySubject[q.subject] = (bySubject[q.subject] || 0) + 1;
      if (q.createdAt >= weekAgo) weeklyUploads++;
    }

    const formattedUploads = recentUploads.map((b) => ({
      ...b,
      uploadedBy: b.uploadedByUser,
    }));

    const formattedActivity = recentActivity.map((a) => ({
      ...a,
      performedBy: a.performedByUser,
    }));

    return {
      data: {
        overview: {
          totalQuestions,
          totalUsers,
          weeklyUploads,
          drafts: byStatus['DRAFT'] || 0,
          published: byStatus['PUBLISHED'] || 0,
        },
        byStatus,
        byType,
        byDifficulty,
        bySubject,
        recentUploads: formattedUploads,
        recentActivity: formattedActivity,
      },
    };
  }

  async getUploadHistory(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [batches, total] = await Promise.all([
      this.prisma.uploadBatch.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          uploadedByUser: { select: { name: true, email: true } },
        },
      }),
      this.prisma.uploadBatch.count(),
    ]);

    const formattedBatches = batches.map((b) => ({
      ...b,
      uploadedBy: b.uploadedByUser,
    }));

    return {
      data: { batches: formattedBatches },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getAuditLogs(
    page = 1,
    limit = 50,
    filters: { action?: string; entityType?: string } = {},
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          performedByUser: { select: { name: true, email: true, role: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const formattedLogs = logs.map((l) => ({
      ...l,
      performedBy: l.performedByUser,
    }));

    return {
      data: { logs: formattedLogs },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}
