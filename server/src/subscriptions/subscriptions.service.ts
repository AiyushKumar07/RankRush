import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Public: student-facing (only active plans) ---
  async getPlans() {
    let plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (plans.length === 0) {
      // Seed initial plans
      await this.prisma.subscriptionPlan.createMany({
        data: [
          {
            name: 'Starter Pass',
            description: '10 Quiz Tokens',
            price: 99,
            tokenCount: 10,
            isRecurring: false,
          },
          {
            name: 'Scholar Pack',
            description: '20 Quiz Tokens',
            price: 199,
            tokenCount: 20,
            isRecurring: false,
          },
          {
            name: 'Ranker Pro',
            description: '50 Quiz Tokens',
            price: 399,
            tokenCount: 50,
            isRecurring: false,
          },
        ],
      });
      plans = await this.prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    }

    return plans;
  }

  // --- Admin: get all plans (active + inactive) ---
  async getAllPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    return plans.map((plan) => ({
      ...plan,
      subscriberCount: plan._count.subscriptions,
      _count: undefined,
    }));
  }

  // --- Admin: create a new plan ---
  async createPlan(data: {
    name: string;
    description?: string;
    price: number;
    tokenCount: number;
    isRecurring?: boolean;
    refreshFrequency?: string;
    isPopular?: boolean;
  }) {
    if (!data.name || data.price == null || data.tokenCount == null) {
      throw new BadRequestException('Name, price, and token count are required');
    }

    if (data.price < 0) {
      throw new BadRequestException('Price must be non-negative');
    }

    if (data.tokenCount < 1) {
      throw new BadRequestException('Token count must be at least 1');
    }

    // If marking as popular, unmark all others first
    if (data.isPopular) {
      await this.prisma.subscriptionPlan.updateMany({
        where: { isPopular: true },
        data: { isPopular: false },
      });
    }

    // Auto-assign sortOrder (append to end)
    const maxOrder = await this.prisma.subscriptionPlan.aggregate({
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    return this.prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        description: data.description || null,
        price: data.price,
        tokenCount: data.tokenCount,
        isRecurring: data.isRecurring || false,
        refreshFrequency: data.isRecurring ? (data.refreshFrequency as any) || 'MONTHLY' : null,
        isPopular: data.isPopular || false,
        sortOrder: nextOrder,
      },
    });
  }

  // --- Admin: update an existing plan ---
  async updatePlan(
    id: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      tokenCount?: number;
      isRecurring?: boolean;
      refreshFrequency?: string;
      isPopular?: boolean;
    },
  ) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Plan not found');
    }

    if (data.price !== undefined && data.price < 0) {
      throw new BadRequestException('Price must be non-negative');
    }

    if (data.tokenCount !== undefined && data.tokenCount < 1) {
      throw new BadRequestException('Token count must be at least 1');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.tokenCount !== undefined) updateData.tokenCount = data.tokenCount;
    if (data.isRecurring !== undefined) {
      updateData.isRecurring = data.isRecurring;
      updateData.refreshFrequency = data.isRecurring
        ? (data.refreshFrequency as any) || existing.refreshFrequency || 'MONTHLY'
        : null;
    } else if (data.refreshFrequency !== undefined) {
      updateData.refreshFrequency = data.refreshFrequency;
    }
    if (data.isPopular !== undefined) {
      updateData.isPopular = data.isPopular;
      // If marking as popular, unmark all others first
      if (data.isPopular) {
        await this.prisma.subscriptionPlan.updateMany({
          where: { isPopular: true, id: { not: id } },
          data: { isPopular: false },
        });
      }
    }

    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: updateData,
    });
  }

  // --- Admin: toggle plan active/inactive (no delete) ---
  async togglePlanStatus(id: string, isActive: boolean) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Plan not found');
    }

    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive },
    });
  }

  // --- Admin: dashboard stats ---
  async getPlanStats() {
    const [totalPlans, activePlans, totalSubscribers, revenueResult] = await Promise.all([
      this.prisma.subscriptionPlan.count(),
      this.prisma.subscriptionPlan.count({ where: { isActive: true } }),
      this.prisma.studentSubscription.count(),
      this.prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        where: { status: 'SUCCESS' },
      }),
    ]);

    return {
      totalPlans,
      activePlans,
      totalSubscribers,
      totalRevenue: revenueResult._sum.amount || 0,
    };
  }

  // --- Admin: reorder plans (drag & drop) ---
  async reorderPlans(orderedIds: string[]) {
    if (!orderedIds || orderedIds.length === 0) {
      throw new BadRequestException('Ordered plan IDs are required');
    }

    const updates = orderedIds.map((id, index) =>
      this.prisma.subscriptionPlan.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);

    return { message: 'Plans reordered successfully' };
  }
}
