import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.subscriptionPlan.deleteMany({});
  
  await prisma.subscriptionPlan.createMany({
    data: [
      {
        name: 'Starter Pass',
        description: '10 Quiz Tokens',
        price: 99,
        tokenCount: 10,
        isRecurring: false,
        isActive: true,
      },
      {
        name: 'Scholar Pack',
        description: '20 Quiz Tokens',
        price: 199,
        tokenCount: 20,
        isRecurring: false,
        isActive: true,
      },
      {
        name: 'Ranker Pro',
        description: '50 Quiz Tokens',
        price: 399,
        tokenCount: 50,
        isRecurring: false,
        isActive: true,
      },
    ],
  });

  // Create an initial redeem code for the first 20 users with 50% off
  const existingCode = await prisma.redeemCode.findUnique({
    where: { code: 'FIRST20' }
  });

  if (!existingCode) {
    await prisma.redeemCode.create({
      data: {
        code: 'FIRST20',
        discountPercentage: 50,
        maxUses: 20,
      }
    });
    console.log('Created redeem code: FIRST20 (50% off)');
  }

  console.log('Plans updated successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
