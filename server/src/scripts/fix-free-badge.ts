// One-off: drop the baked-in "Current" badge and CTA label on the Free plan.
// The UI now derives "Current" from the live subscription, so this badge
// shouldn't live in the DB.
//
// Run with:  npx tsx src/scripts/fix-free-badge.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  const result = await prisma.subscriptionPlan.updateMany({
    where: { isFree: true },
    data: { badge: null, ctaLabel: null },
  });
  console.log(`Updated ${result.count} free plan(s) — cleared 'Current' badge and ctaLabel.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
