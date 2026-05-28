// Wipes plans / pricings / features and re-seeds the three defaults
// (Free / Starter / Pro) from src/scripts/seed-data/default-plans.ts.
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

  console.log('Wiping existing plans, pricings and features...');
  // PlanPricing & PlanFeature have onDelete: Cascade, but Mongo + Prisma's
  // cascade isn't fully relied on for referential safety — delete children
  // first to be explicit.
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
