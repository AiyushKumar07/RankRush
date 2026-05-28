// Dev convenience: wipes plans + their nested pricings/features, then leaves
// re-seeding to SubscriptionsService.getPlans() which seeds defaults when the
// table is empty.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.planFeature.deleteMany({});
  await prisma.planPricing.deleteMany({});
  await prisma.subscriptionPlan.deleteMany({});

  const existingCode = await prisma.redeemCode.findUnique({
    where: { code: 'FIRST20' },
  });

  if (!existingCode) {
    await prisma.redeemCode.create({
      data: {
        code: 'FIRST20',
        discountPercentage: 50,
        maxUses: 20,
      },
    });
    console.log('Created redeem code: FIRST20 (50% off)');
  }

  console.log('Plans wiped. Next call to GET /api/subscriptions/plans will reseed defaults.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
