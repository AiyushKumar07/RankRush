// One-off: relink StudentSubscription.pricingId for any subscription whose
// PlanPricing reference was orphaned by the seed wipe earlier this session.
// Matches the live PlanPricing by (planId, cadence) — the composite key.
//
// Run with:  npx tsx src/scripts/relink-subscription-pricing.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();

  const subs = await prisma.studentSubscription.findMany({
    where: { status: 'ACTIVE' },
  });

  let fixed = 0;
  let alreadyOk = 0;
  let unfixable = 0;

  for (const sub of subs) {
    if (!sub.cadence || !sub.planId) {
      console.warn(`  ! sub ${sub.id} has no cadence or planId — skipping`);
      unfixable++;
      continue;
    }

    // Check whether the existing pricingId still resolves.
    if (sub.pricingId) {
      const stillThere = await prisma.planPricing.findUnique({
        where: { id: sub.pricingId },
      });
      if (stillThere) {
        alreadyOk++;
        continue;
      }
    }

    // Find the live pricing row for this plan + cadence.
    const live = await prisma.planPricing.findUnique({
      where: { planId_cadence: { planId: sub.planId, cadence: sub.cadence } },
    });

    if (!live) {
      console.warn(`  ! sub ${sub.id} (plan=${sub.planId}, cadence=${sub.cadence}) — no matching PlanPricing found, skipping`);
      unfixable++;
      continue;
    }

    await prisma.studentSubscription.update({
      where: { id: sub.id },
      data: { pricingId: live.id },
    });
    console.log(`  ✓ relinked sub ${sub.id} → pricing ${live.id} (${sub.cadence}, ₹${live.price}, ${live.tokenCount} tokens)`);
    fixed++;
  }

  console.log(`\nDone. Relinked: ${fixed} · already OK: ${alreadyOk} · unfixable: ${unfixable}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
