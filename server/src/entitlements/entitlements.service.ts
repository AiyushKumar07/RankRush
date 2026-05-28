import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// Stable keys consumed by @RequireFeature and the client.
// Adding a new one means: (a) seed it on the right plans, (b) call requireFeature() where you need to gate.
export const ENTITLEMENT_KEYS = [
  'MOCK_TESTS',
  'PYQ_ACCESS', // dual-purpose: included = can access PYQs; cap = year window (Infinity = all)
  'TOPIC_INSIGHTS_DEPTH', // cap = N strong/weak topics surfaced
  'TIME_PER_QUESTION',
  'PERCENTILE_BREAKDOWN',
  'STUDY_GROUPS_MAX', // cap = max active groups (Infinity = unlimited)
  'FRIEND_CHALLENGES',
  'CHAT_DUELS',
  'EARLY_ACCESS',
] as const;

export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number];

export type Entitlement = {
  included: boolean;
  cap: number; // Infinity for unlimited, 0 for excluded, finite int otherwise
  value: string | null; // raw display value, useful for the client
};

export type EntitlementMap = Record<string, Entitlement>;

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  // Resolves the user's effective plan (active subscription, else Free tier) and
  // returns a map of entitlementKey → resolved entitlement.
  async getEntitlements(userId: string): Promise<{
    planId: string | null;
    planName: string | null;
    isFreeTier: boolean;
    entitlements: EntitlementMap;
  }> {
    const now = new Date();
    const sub = await this.prisma.studentSubscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        OR: [{ endDate: null }, { endDate: { gt: now } }],
      },
      orderBy: { startDate: 'desc' },
      include: { plan: { include: { features: true } } },
    });

    // Fall back to the Free plan if no active subscription.
    let plan = sub?.plan ?? null;
    if (!plan) {
      plan = await this.prisma.subscriptionPlan.findFirst({
        where: { isFree: true, isActive: true },
        include: { features: true },
      });
    }

    const entitlements: EntitlementMap = {};
    if (plan) {
      for (const f of plan.features) {
        if (!f.entitlementKey) continue;
        entitlements[f.entitlementKey] = {
          included: f.included,
          cap: parseCap(f.value, f.included),
          value: f.value,
        };
      }
    }

    return {
      planId: plan?.id ?? null,
      planName: plan?.name ?? null,
      isFreeTier: !sub,
      entitlements,
    };
  }

  async hasFeature(userId: string, key: EntitlementKey): Promise<boolean> {
    const { entitlements } = await this.getEntitlements(userId);
    return entitlements[key]?.included === true;
  }

  async getCap(userId: string, key: EntitlementKey): Promise<number> {
    const { entitlements } = await this.getEntitlements(userId);
    return entitlements[key]?.cap ?? 0;
  }

  async requireFeature(
    userId: string,
    key: EntitlementKey,
    upgradeHint?: string,
  ): Promise<void> {
    const ok = await this.hasFeature(userId, key);
    if (!ok) {
      throw new ForbiddenException({
        message: upgradeHint ?? `This feature requires a paid plan.`,
        code: 'FEATURE_LOCKED',
        entitlementKey: key,
      });
    }
  }
}

// "Unlimited" / "All" / "Full breakdown" / "All years" → Infinity
// "Last 5 years", "Top 10", "5" → 5 / 10 / 5
// null / empty → if included, treat as 1 (binary access granted); else 0
function parseCap(value: string | null, included: boolean): number {
  if (!included) return 0;
  if (!value) return included ? 1 : 0;
  const lower = value.toLowerCase().trim();
  if (
    lower === 'unlimited' ||
    lower === 'all' ||
    lower.includes('full') ||
    lower.includes('all years') ||
    lower.includes('all quizzes')
  ) {
    return Infinity;
  }
  // Pull the first integer out of strings like "Last 5 years" or "Top 10"
  const match = value.match(/\d+/);
  if (match) return Number.parseInt(match[0], 10);
  return included ? 1 : 0;
}
