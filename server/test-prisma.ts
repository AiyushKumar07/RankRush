import { PrismaClient } from '@prisma/client';
const p = new PrismaClient({ log: ['info'] });
console.log('Success');
