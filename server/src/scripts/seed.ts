import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const seedUsers = [
  {
    name: 'Admin',
    email: 'admin@rankrush.io',
    password: 'Admin@1234',
    role: Role.ADMIN,
  },
];

async function main() {
  console.log('Connecting to MongoDB...');
  await prisma.$connect();
  console.log('Connected.');

  await prisma.uploadBatch.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.question.deleteMany();
  await prisma.user.deleteMany();
  console.log('Cleared users.');

  for (const u of seedUsers) {
    const hashed = await bcrypt.hash(u.password, 12);
    await prisma.user.create({
      data: { name: u.name, email: u.email, password: hashed, role: u.role },
    });
    console.log(`  Created: ${u.email} (${u.role})`);
  }

  console.log('\nSeed complete! Login credentials:');
  for (const u of seedUsers) {
    console.log(`  ${u.role}: ${u.email} / ${u.password}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
