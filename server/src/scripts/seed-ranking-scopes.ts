import 'dotenv/config';
import { PrismaClient, type Prisma } from '@prisma/client';
import { SCOPE_SEEDS } from '../ranking/scopes/scope-seeds.js';

// Upserts the headline RankingScope rows (CLASS_GLOBAL × 5, TARGET_EXAM × 3,
// SUBJECT × 4). Idempotent — safe to re-run after editing scope-seeds.ts.
// Does NOT seed QUIZ scopes; those are created on-demand by RankingService
// when a quiz is rank-rewarding.
//
//   $ npm run seed:ranking-scopes

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to MongoDB…');
  await prisma.$connect();

  let created = 0;
  let updated = 0;

  for (const seed of SCOPE_SEEDS) {
    const data = {
      kind: seed.kind,
      key: seed.key,
      displayName: seed.displayName,
      scorerKey: seed.scorerKey,
      config: (seed.config ?? null) as Prisma.InputJsonValue | null,
      cohortFilter: (seed.cohortFilter ?? null) as Prisma.InputJsonValue | null,
      isActive: seed.isActive ?? true,
    };

    const existing = await prisma.rankingScope.findUnique({
      where: { kind_key: { kind: seed.kind, key: seed.key } },
      select: { id: true },
    });

    if (existing) {
      await prisma.rankingScope.update({
        where: { id: existing.id },
        data: {
          displayName: data.displayName,
          scorerKey: data.scorerKey,
          config: data.config ?? undefined,
          cohortFilter: data.cohortFilter ?? undefined,
          isActive: data.isActive,
        },
      });
      console.log(`  · updated ${seed.kind}:${seed.key}`);
      updated++;
    } else {
      await prisma.rankingScope.create({
        data: {
          kind: data.kind,
          key: data.key,
          displayName: data.displayName,
          scorerKey: data.scorerKey,
          config: data.config ?? undefined,
          cohortFilter: data.cohortFilter ?? undefined,
          isActive: data.isActive,
        },
      });
      console.log(`  + created ${seed.kind}:${seed.key}`);
      created++;
    }
  }

  console.log(`\nSeed complete. ${created} created, ${updated} updated.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Scope seed failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
