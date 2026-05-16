import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

interface LogParams {
  action: AuditAction | string;
  entityType: string;
  entityId?: string;
  performedBy: string;
  details?: any;
  previousState?: any;
  newState?: any;
  req?: any;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: LogParams) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: params.action as AuditAction,
          entityType: params.entityType,
          entityId: params.entityId,
          performedBy: params.performedBy,
          details: params.details ?? undefined,
          previousState: params.previousState ?? undefined,
          newState: params.newState ?? undefined,
          ipAddress: params.req?.ip,
          userAgent: params.req?.headers?.['user-agent'],
        },
      });
    } catch (error) {
      console.error('Audit log failed:', error);
    }
  }

  async getRecent(
    limit = 50,
    filters: { action?: string; entityType?: string } = {},
  ) {
    const where: any = {};
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;

    return this.prisma.auditLog.findMany({
      where,
      include: {
        performedByUser: {
          select: { name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
