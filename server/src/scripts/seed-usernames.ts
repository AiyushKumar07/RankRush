import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function generateUniqueUsername(firstName: string, lastName?: string): Promise<string> {
  const fName = (firstName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
  const lName = lastName ? lastName.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  
  let username = '';
  
  while (true) {
    const trimmedUuid = crypto.randomUUID().split('-')[0];
    username = `${fName}-${trimmedUuid}`;
    
    let existing = await prisma.user.findUnique({ where: { username } });
    if (!existing) break;
    
    if (lName) {
      const fullUuid = crypto.randomUUID();
      username = `${lName}-${fullUuid}`;
      
      existing = await prisma.user.findUnique({ where: { username } });
      if (!existing) break;
    }
  }
  
  return username;
}

async function main() {
  console.log('Connecting to MongoDB...');
  await prisma.$connect();
  
  const usersWithoutUsername = await prisma.user.findMany({
    
  });
  
  console.log(`Found ${usersWithoutUsername.length} users without a username.`);
  
  for (const user of usersWithoutUsername) {
    const nameParts = (user.name || '').split(' ');
    const firstName = user.firstName || nameParts[0] || 'user';
    const lastName = user.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
    
    const username = await generateUniqueUsername(firstName, lastName);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { username }
    });
    console.log(`Updated user ${user.email} with username: ${username}`);
  }
  
  console.log('Finished seeding usernames.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seeding usernames failed:', e);
  process.exit(1);
});
