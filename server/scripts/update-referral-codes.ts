import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting referral code migration...');
  
  const users = await prisma.user.findMany({
    where: {
      referralCode: {
        contains: '-'
      }
    }
  });
  
  console.log(`Found ${users.length} users with hyphens in their referral codes.`);
  
  let updatedCount = 0;
  for (const user of users) {
    if (!user.referralCode) continue;
    
    const newCode = user.referralCode.replace(/-/g, '').toUpperCase();
    
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode: newCode }
      });
      updatedCount++;
    } catch (err) {
      console.error(`Failed to update user ${user.id}: ${err.message}`);
    }
  }
  
  console.log(`Successfully updated ${updatedCount} referral codes.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
