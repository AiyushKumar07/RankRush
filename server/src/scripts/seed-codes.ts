// Seeds a small set of starter redeem codes — including LAUNCH95, a 95%
// discount targeted at the Pro plan (so annual Pro ₹2990 → ~₹150 for a
// full year, roughly the equivalent of paying for ~1.5 months at the
// standard MONTHLY price). Tweak the seeds below to taste.
//
// Run with:  npx tsx src/scripts/seed-codes.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CODE_SEEDS = [
  {
    code: 'LAUNCH95',
    discountPercentage: 95,
    maxUses: 50,
    expiresInDays: 90,
    targetPlanName: 'Pro', // only applies to Pro (any cadence — Annual will benefit most)
  },
  {
    code: 'WELCOME10',
    discountPercentage: 10,
    maxUses: 500,
    expiresInDays: 365,
    targetPlanName: null, // null = any paid plan
  },
  {
    code: 'STARTER50',
    discountPercentage: 50,
    maxUses: 100,
    expiresInDays: 60,
    targetPlanName: 'Starter',
  },
];

async function main() {
  await prisma.$connect();
  console.log('Seeding redeem codes...\n');

  const allPlans = await prisma.subscriptionPlan.findMany({
    where: { isFree: false },
    select: { id: true, name: true },
  });
  const planByName = new Map(allPlans.map((p) => [p.name.toLowerCase(), p]));

  for (const seed of CODE_SEEDS) {
    const targetPlan = seed.targetPlanName
      ? planByName.get(seed.targetPlanName.toLowerCase())
      : null;

    if (seed.targetPlanName && !targetPlan) {
      console.warn(`  ! ${seed.code}: target plan "${seed.targetPlanName}" not found, skipping.`);
      continue;
    }

    const applicablePlanIds = targetPlan ? [targetPlan.id] : [];
    const expiresAt = seed.expiresInDays
      ? new Date(Date.now() + seed.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const existing = await prisma.redeemCode.findUnique({
      where: { code: seed.code },
    });

    if (existing) {
      await prisma.redeemCode.update({
        where: { code: seed.code },
        data: {
          discountPercentage: seed.discountPercentage,
          maxUses: seed.maxUses,
          isActive: true,
          expiresAt,
          applicablePlanIds,
        },
      });
      console.log(`  ↻ ${seed.code.padEnd(12)} — updated (${seed.discountPercentage}% off ${seed.targetPlanName || 'any paid plan'})`);
    } else {
      await prisma.redeemCode.create({
        data: {
          code: seed.code,
          discountPercentage: seed.discountPercentage,
          maxUses: seed.maxUses,
          isActive: true,
          expiresAt,
          applicablePlanIds,
          currentUses: 0,
          usedBy: [],
        },
      });
      console.log(`  ✓ ${seed.code.padEnd(12)} — created (${seed.discountPercentage}% off ${seed.targetPlanName || 'any paid plan'})`);
    }
  }

  console.log('\nDone.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
