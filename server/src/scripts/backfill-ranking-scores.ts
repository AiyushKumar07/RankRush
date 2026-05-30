import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { RankingService } from '../ranking/ranking.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Walks every active RankingScope and runs a full recompute against the
// current QuizAttempt history. Also seeds per-QUIZ scopes for every quiz
// that already has rankRewarding=true. Safe to re-run; recompute is
// idempotent per scope.
//
// Run AFTER seed-ranking-scopes.ts:
//
//   $ npm run seed:ranking-scopes
//   $ npm run backfill:ranking-scores
//
// NB: bootstraps the full Nest app (not just PrismaClient) so the
// ranking module's DI graph — scorers, EventBus, BullMQ queues — is
// available. EventBus emits go through the synchronous projector, which
// will write ActivityEvent rows for any RANK_CHANGED that fires during
// backfill. That's intended: the timeline reflects the backfill.
//
// IMPORTANT: this script must be run from the COMPILED JS (the npm
// script does `nest build && node dist/...`). Running it via tsx
// strips emitDecoratorMetadata (esbuild doesn't emit it), which breaks
// Nest's parameter-type-based DI — you'll see "?, +, BullQueue_*" type
// errors. The other seed:* scripts work via tsx only because they use
// PrismaClient directly without Nest DI.

async function main() {
  console.log('Booting Nest app context…');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const prisma = app.get(PrismaService);
  const ranking = app.get(RankingService);

  // Seed per-QUIZ scopes for any rank-rewarding quizzes already in the DB.
  const rankRewardingQuizzes = await prisma.quiz.findMany({
    where: { rankRewarding: true },
    select: { id: true, title: true },
  });
  console.log(
    `Seeding per-quiz scopes for ${rankRewardingQuizzes.length} rank-rewarding quizzes…`,
  );
  for (const q of rankRewardingQuizzes) {
    await ranking.ensureQuizScope(q.id, q.title);
  }

  const scopes = await prisma.rankingScope.findMany({
    where: { isActive: true },
    select: { id: true, kind: true, key: true, displayName: true },
    orderBy: [{ kind: 'asc' }, { key: 'asc' }],
  });
  console.log(`\nRecomputing ${scopes.length} active scopes…\n`);

  let totalScored = 0;
  let totalChanged = 0;

  for (const s of scopes) {
    const result = await ranking.recomputeScope(s.id);
    totalScored += result.usersScored;
    totalChanged += result.rankChangedCount;
    console.log(
      `  ✓ ${s.kind}:${s.key.padEnd(20)} — ${String(result.usersScored).padStart(4)} users · ${String(result.rankChangedCount).padStart(4)} rank changes`,
    );
  }

  // Take an initial snapshot so the rank-history chart isn't empty on
  // day one. Subsequent snapshots come from the nightly cron.
  console.log('\nWriting initial RankingSnapshot for today…');
  const snap = await ranking.snapshotAllScopes(new Date());
  console.log(`  ✓ ${snap.scopes} scopes · ${snap.rows} rows`);

  console.log(
    `\nBackfill complete. ${scopes.length} scopes · ${totalScored} user-scope scores · ${totalChanged} rank changes.`,
  );

  await app.close();
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
