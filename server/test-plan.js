const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.subscriptionPlan.findMany().then(console.log).finally(() => prisma.$disconnect());
