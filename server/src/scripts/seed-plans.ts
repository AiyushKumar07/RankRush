// Seeds the three default plans (Free / Starter / Pro) from
// src/scripts/seed-data/default-plans.ts.
//
// Pre-flight: refuses to wipe plans if any active StudentSubscription
// references them, since the wipe would orphan a paying user's purchase.
// If you really need to re-seed, cancel/expire those subscriptions first,
// or use repopulate-plan-children.ts which only rehydrates child collections
// without dropping the plan rows themselves.
//
// Run with:  npm run seed:plans
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_PLAN_SEEDS } from './seed-data/default-plans.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to MongoDB...');
  await prisma.$connect();
  console.log('Connected.');

  const activeSubs = await prisma.studentSubscription.count({
    where: { status: 'ACTIVE' },
  });
  if (activeSubs > 0) {
    console.error(
      `\n  ✗ Refusing to wipe: ${activeSubs} active StudentSubscription(s) reference these plans.\n    Use repopulate-plan-children.ts instead (rehydrates pricings/features without touching plans),\n    or expire those subscriptions first.\n`,
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('Wiping existing plans, pricings and features...');
  // Delete children first to be explicit (Mongo + Prisma cascade isn't fully reliable).
  await prisma.planFeature.deleteMany({});
  await prisma.planPricing.deleteMany({});
  await prisma.subscriptionPlan.deleteMany({});

  console.log(`Seeding ${DEFAULT_PLAN_SEEDS.length} plans...`);
  for (const seed of DEFAULT_PLAN_SEEDS) {
    const plan = await prisma.subscriptionPlan.create({
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
        pricings: {
          create: seed.pricings.map((p) => ({
            cadence: p.cadence,
            price: p.price,
            originalPrice: p.originalPrice ?? null,
            tokenCount: p.tokenCount,
            tokenPeriodLabel: p.tokenPeriodLabel ?? null,
            note: p.note ?? null,
            isActive: p.isActive ?? true,
          })),
        },
        features: {
          create: seed.features.map((f, i) => ({
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
        },
      },
      include: { pricings: true, features: true },
    });
    console.log(
      `  ✓ ${plan.name.padEnd(8)} — ${plan.pricings.length} pricing variant${plan.pricings.length === 1 ? '' : 's'}, ${plan.features.length} feature${plan.features.length === 1 ? '' : 's'}`,
    );
  }

  console.log('\nSeed complete.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
