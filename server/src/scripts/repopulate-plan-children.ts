// One-off rescue: an earlier seed run wiped PlanPricing + PlanFeature but
// couldn't delete the plans themselves (an active StudentSubscription was
// holding the FK). This walks DEFAULT_PLAN_SEEDS and rehydrates the children
// against the existing plan rows, matched by name. Idempotent: clears each
// plan's pricings + features first, then recreates.
//
// Run with:  npx tsx src/scripts/repopulate-plan-children.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_PLAN_SEEDS } from './seed-data/default-plans.js';

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  console.log('Connected. Rehydrating plan children from seed data…');

  for (const seed of DEFAULT_PLAN_SEEDS) {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { name: seed.name },
    });
    if (!plan) {
      console.warn(`  ! ${seed.name.padEnd(8)} — no matching plan row found, skipping.`);
      continue;
    }

    // Wipe any leftover children for this plan, then recreate.
    await prisma.planFeature.deleteMany({ where: { planId: plan.id } });
    await prisma.planPricing.deleteMany({ where: { planId: plan.id } });

    const pricings = await prisma.planPricing.createMany({
      data: seed.pricings.map((p) => ({
        planId: plan.id,
        cadence: p.cadence,
        price: p.price,
        originalPrice: p.originalPrice ?? null,
        tokenCount: p.tokenCount,
        tokenPeriodLabel: p.tokenPeriodLabel ?? null,
        note: p.note ?? null,
        isActive: p.isActive ?? true,
      })),
    });

    const features = await prisma.planFeature.createMany({
      data: seed.features.map((f, i) => ({
        planId: plan.id,
        sectionKey: f.sectionKey,
        sectionLabel: f.sectionLabel,
        label: f.label,
        valueType: f.valueType,
        value: f.value ?? null,
        included: f.included ?? true,
        showOnCard: f.showOnCard ?? true,
        showInCompare: f.showInCompare ?? true,
        isComingSoon: f.isComingSoon ?? false,
        entitlementKey: f.entitlementKey ?? null,
        sortOrder: f.sortOrder ?? i,
      })),
    });

    console.log(
      `  ✓ ${seed.name.padEnd(8)} — ${pricings.count} pricing${pricings.count === 1 ? '' : 's'}, ${features.count} feature${features.count === 1 ? '' : 's'}`,
    );
  }

  console.log('\nDone.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
