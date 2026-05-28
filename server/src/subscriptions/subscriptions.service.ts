import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Cadence, FeatureValueType, Prisma } from '@prisma/client';
import { DEFAULT_PLAN_SEEDS } from '../scripts/seed-data/default-plans.js';

type PricingInput = {
  cadence: Cadence;
  price: number;
  originalPrice?: number | null;
  tokenCount: number;
  tokenPeriodLabel?: string | null;
  note?: string | null;
  isActive?: boolean;
};

type FeatureInput = {
  sectionKey: string;
  sectionLabel: string;
  label: string;
  valueType: FeatureValueType;
  value?: string | null;
  included?: boolean;
  showOnCard?: boolean;
  showInCompare?: boolean;
  isComingSoon?: boolean;
  entitlementKey?: string | null;
  sortOrder?: number;
};

type PlanInput = {
  name: string;
  description?: string | null;
  icon?: string | null;
  badge?: string | null;
  ctaLabel?: string | null;
  ctaVariant?: string | null;
  currency?: string;
  isActive?: boolean;
  isPopular?: boolean;
  isFree?: boolean;
  pricings?: PricingInput[];
  features?: FeatureInput[];
};

const PLAN_INCLUDE = {
  pricings: { orderBy: { cadence: 'asc' as const } },
  features: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
} satisfies Prisma.SubscriptionPlanInclude;

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Public: student-facing (active plans + active pricings) ─────────
  async getPlans() {
    let plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: PLAN_INCLUDE,
    });

    if (plans.length === 0) {
      await this.seedDefaultPlans();
      plans = await this.prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: PLAN_INCLUDE,
      });
    }

    // Strip inactive pricings for the public payload; keep features as-is.
    return plans.map((p) => ({
      ...p,
      pricings: p.pricings.filter((pr) => pr.isActive),
    }));
  }

  // ─── Student: my current subscription state ──────────────────────────
  async getMySubscription(userId: string) {
    const sub = await this.prisma.studentSubscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'PAUSED', 'PAST_DUE'] } },
      orderBy: { startDate: 'desc' },
      include: {
        plan: {
          select: { id: true, name: true, description: true, icon: true, badge: true, ctaVariant: true, isFree: true },
        },
      },
    });

    if (!sub) return { subscription: null };

    const pricing = sub.pricingId
      ? await this.prisma.planPricing.findUnique({ where: { id: sub.pricingId } })
      : null;

    return {
      subscription: {
        id: sub.id,
        status: sub.status,
        cadence: sub.cadence,
        startDate: sub.startDate,
        endDate: sub.endDate,
        nextRefreshDate: sub.nextRefreshDate,
        isAutoRenewEnabled: sub.isAutoRenewEnabled,
        plan: sub.plan,
        pricing: pricing
          ? {
              id: pricing.id,
              price: pricing.price,
              tokenCount: pricing.tokenCount,
              tokenPeriodLabel: pricing.tokenPeriodLabel,
              cadence: pricing.cadence,
            }
          : null,
      },
    };
  }

  async cancelMySubscription(userId: string) {
    const sub = await this.prisma.studentSubscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
    });
    if (!sub) throw new NotFoundException('No active subscription to cancel');

    // Cancel at period end: keep access until endDate, just disable auto-renew.
    // For MONTHLY (where nextRefreshDate == endDate) this is equivalent to "no more refresh".
    // For ANNUAL we want to also stop further monthly refreshes — set nextRefreshDate to endDate.
    await this.prisma.studentSubscription.update({
      where: { id: sub.id },
      data: {
        isAutoRenewEnabled: false,
        nextRefreshDate: sub.endDate ?? sub.nextRefreshDate,
      },
    });

    return { message: 'Auto-renew disabled. Access continues until end of cycle.' };
  }

  // ─── Admin: get all plans (active + inactive), with subscriber counts ─
  async getAllPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        ...PLAN_INCLUDE,
        _count: { select: { subscriptions: true } },
      },
    });

    return plans.map((plan) => {
      const { _count, ...rest } = plan;
      return { ...rest, subscriberCount: _count.subscriptions };
    });
  }

  async getPlanById(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: PLAN_INCLUDE,
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  // ─── Admin: create a new plan ────────────────────────────────────────
  async createPlan(data: PlanInput) {
    if (!data.name?.trim()) throw new BadRequestException('Name is required');

    const pricings = (data.pricings ?? []).map(this.normalisePricing);
    const features = (data.features ?? []).map(this.normaliseFeature);
    this.validatePricings(pricings);

    if (data.isPopular) {
      await this.prisma.subscriptionPlan.updateMany({
        where: { isPopular: true },
        data: { isPopular: false },
      });
    }

    const maxOrder = await this.prisma.subscriptionPlan.aggregate({
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    return this.prisma.subscriptionPlan.create({
      data: {
        name: data.name.trim(),
        description: data.description ?? null,
        icon: data.icon ?? null,
        badge: data.badge ?? null,
        ctaLabel: data.ctaLabel ?? null,
        ctaVariant: data.ctaVariant ?? null,
        currency: data.currency || 'INR',
        isActive: data.isActive ?? true,
        isPopular: data.isPopular ?? false,
        isFree: data.isFree ?? false,
        sortOrder: nextOrder,
        pricings: { create: pricings },
        features: { create: features },
      },
      include: PLAN_INCLUDE,
    });
  }

  // ─── Admin: update an existing plan + nested replace of pricings/features ─
  async updatePlan(id: string, data: Partial<PlanInput>) {
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Plan not found');

    const updateData: Prisma.SubscriptionPlanUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description ?? null;
    if (data.icon !== undefined) updateData.icon = data.icon ?? null;
    if (data.badge !== undefined) updateData.badge = data.badge ?? null;
    if (data.ctaLabel !== undefined) updateData.ctaLabel = data.ctaLabel ?? null;
    if (data.ctaVariant !== undefined) updateData.ctaVariant = data.ctaVariant ?? null;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isFree !== undefined) updateData.isFree = data.isFree;

    if (data.isPopular !== undefined) {
      updateData.isPopular = data.isPopular;
      if (data.isPopular) {
        await this.prisma.subscriptionPlan.updateMany({
          where: { isPopular: true, id: { not: id } },
          data: { isPopular: false },
        });
      }
    }

    // Nested replace for pricings / features (atomic).
    const ops: Prisma.PrismaPromise<unknown>[] = [];

    if (data.pricings !== undefined) {
      const pricings = data.pricings.map(this.normalisePricing);
      this.validatePricings(pricings);
      ops.push(this.prisma.planPricing.deleteMany({ where: { planId: id } }));
      ops.push(
        this.prisma.planPricing.createMany({
          data: pricings.map((p) => ({ ...p, planId: id })),
        }),
      );
    }

    if (data.features !== undefined) {
      const features = data.features.map(this.normaliseFeature);
      ops.push(this.prisma.planFeature.deleteMany({ where: { planId: id } }));
      ops.push(
        this.prisma.planFeature.createMany({
          data: features.map((f) => ({ ...f, planId: id })),
        }),
      );
    }

    ops.push(
      this.prisma.subscriptionPlan.update({
        where: { id },
        data: updateData,
      }),
    );

    await this.prisma.$transaction(ops);

    return this.getPlanById(id);
  }

  async togglePlanStatus(id: string, isActive: boolean) {
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Plan not found');

    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive },
      include: PLAN_INCLUDE,
    });
  }

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

  // ─── Helpers ──────────────────────────────────────────────────────────
  private normalisePricing = (p: PricingInput): PricingInput => {
    if (!p.cadence) throw new BadRequestException('Pricing cadence is required');
    if (p.price == null || p.price < 0) {
      throw new BadRequestException('Pricing price must be non-negative');
    }
    if (p.tokenCount == null || p.tokenCount < 0) {
      throw new BadRequestException('Pricing tokenCount must be non-negative');
    }
    return {
      cadence: p.cadence,
      price: p.price,
      originalPrice: p.originalPrice ?? null,
      tokenCount: p.tokenCount,
      tokenPeriodLabel: p.tokenPeriodLabel ?? null,
      note: p.note ?? null,
      isActive: p.isActive ?? true,
    };
  };

  private normaliseFeature = (f: FeatureInput): FeatureInput => {
    if (!f.label?.trim()) throw new BadRequestException('Feature label is required');
    if (!f.sectionKey) throw new BadRequestException('Feature sectionKey is required');
    if (!f.sectionLabel) throw new BadRequestException('Feature sectionLabel is required');
    return {
      sectionKey: f.sectionKey,
      sectionLabel: f.sectionLabel,
      label: f.label.trim(),
      valueType: f.valueType ?? FeatureValueType.CHECK,
      value: f.value ?? null,
      included: f.included ?? true,
      showOnCard: f.showOnCard ?? true,
      showInCompare: f.showInCompare ?? true,
      isComingSoon: f.isComingSoon ?? false,
      entitlementKey: f.entitlementKey ?? null,
      sortOrder: f.sortOrder ?? 0,
    };
  };

  private validatePricings(pricings: PricingInput[]) {
    const seen = new Set<Cadence>();
    for (const p of pricings) {
      if (seen.has(p.cadence)) {
        throw new BadRequestException(`Duplicate pricing for cadence ${p.cadence}`);
      }
      seen.add(p.cadence);
    }
  }

  // ─── Seed initial plans (only when DB is empty) ───────────────────────
  private async seedDefaultPlans() {
    for (const seed of DEFAULT_PLAN_SEEDS) {
      await this.prisma.subscriptionPlan.create({
        data: {
          name: seed.name,
          description: seed.description ?? null,
          icon: seed.icon ?? null,
          badge: seed.badge ?? null,
          ctaLabel: seed.ctaLabel ?? null,
          ctaVariant: seed.ctaVariant ?? null,
          isFree: seed.isFree ?? false,
          isPopular: seed.isPopular ?? false,
          isActive: seed.isActive ?? true,
          sortOrder: seed.sortOrder,
          pricings: { create: seed.pricings.map(this.normalisePricing) },
          features: { create: seed.features.map(this.normaliseFeature) },
        },
      });
    }
  }
}
