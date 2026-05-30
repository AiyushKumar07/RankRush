import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EventBusService } from '../events/event-bus.service.js';
import { ScorerRegistry } from './scorers/scorer-registry.js';
import {
  userMembershipFilter,
  attemptInputFilter,
} from './scopes/scope-predicates.js';
import type {
  ScorerAttempt,
  ScorerInput,
} from './scorers/scorer.types.js';
import { Prisma, type RankingScope } from '@prisma/client';

// Orchestrates a scope recompute end-to-end:
//   1. Load eligible users + their attempts (bounded by scope predicates)
//   2. Hand to the scorer for { userId → score }
//   3. Sort, assign ranks, diff against prior ranks
//   4. Write back to RankingScore (upsert), emit RANK_CHANGED for movers
//
// One scope at a time. Concurrency control is at the queue level: BullMQ's
// jobId-dedup collapses bursts into a single replay.
@Injectable()
export class RankingService {
  private readonly logger = new Logger(RankingService.name);

  // Outer query-cutoff bound. Big enough that WRP's halflife decay tail
  // doesn't get truncated and that the sum-percentages scorer captures
  // every closed quiz a user has ever attempted in the last year. Sum-
  // percentages doesn't have a recency window — closed quizzes count
  // forever — but we still cap to avoid loading the entire attempts table
  // on every recompute. Bump if the platform has long-lived contests.
  private static readonly QUERY_WINDOW_DAYS = 365;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scorers: ScorerRegistry,
    private readonly eventBus: EventBusService,
  ) {}

  async recomputeScope(scopeId: string): Promise<{
    usersScored: number;
    rankChangedCount: number;
  }> {
    const scope = await this.prisma.rankingScope.findUnique({
      where: { id: scopeId },
    });
    if (!scope || !scope.isActive) {
      return { usersScored: 0, rankChangedCount: 0 };
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - RankingService.QUERY_WINDOW_DAYS * 86_400_000);

    const attempts = await this.loadAttempts(scope, cutoff);
    const eligibleUserIds = await this.eligibleUsersInCohort(scope);

    const filteredAttempts = attempts.filter((a) =>
      eligibleUserIds === null ? true : eligibleUserIds.has(a.userId),
    );

    const scorer = this.scorers.get(scope.scorerKey);
    const input: ScorerInput = { scope, attempts: filteredAttempts, now };
    const results = scorer.computeUserScores(input);

    // Order: score DESC, tieBreaker DESC. Rank starts at 1.
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.tieBreaker ?? 0) - (a.tieBreaker ?? 0);
    });

    const priorScores = await this.prisma.rankingScore.findMany({
      where: { scopeId },
      select: { userId: true, rank: true, score: true },
    });
    const priorRankByUser = new Map<string, number | null>();
    for (const p of priorScores) priorRankByUser.set(p.userId, p.rank);

    // Persist new scores + ranks. Done as individual upserts since Mongo
    // adapter doesn't support bulk upsert; volume per scope is bounded.
    const rankChanged: { userId: string; from: number | null; to: number }[] = [];
    const writeOps = results.map((r, i) => {
      const newRank = i + 1;
      const oldRank = priorRankByUser.get(r.userId) ?? null;
      if (oldRank !== newRank) {
        rankChanged.push({ userId: r.userId, from: oldRank, to: newRank });
      }
      return this.prisma.rankingScore.upsert({
        where: { scopeId_userId: { scopeId, userId: r.userId } },
        create: {
          scopeId,
          userId: r.userId,
          score: r.score,
          tieBreaker: r.tieBreaker ?? null,
          rank: newRank,
          prevRank: oldRank,
          attempts: r.attemptsCounted,
          meta: (r.meta ?? undefined) as Prisma.InputJsonValue | undefined,
        },
        update: {
          score: r.score,
          tieBreaker: r.tieBreaker ?? null,
          rank: newRank,
          prevRank: oldRank,
          attempts: r.attemptsCounted,
          meta: (r.meta ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    });

    // Evict users who fell out of eligibility (no longer in cohort, dropped
    // below minAttempts after window slide, etc.). They get `rank: null`
    // and become invisible in leaderboard reads, but the row sticks around
    // so historical references resolve.
    const newRankedUsers = new Set(results.map((r) => r.userId));
    const evictedUserIds = priorScores
      .filter((p) => p.rank !== null && !newRankedUsers.has(p.userId))
      .map((p) => p.userId);
    const evictOps = evictedUserIds.length
      ? [
          this.prisma.rankingScore.updateMany({
            where: { scopeId, userId: { in: evictedUserIds } },
            data: { prevRank: undefined, rank: null },
          }),
        ]
      : [];

    await this.prisma.$transaction([
      ...writeOps,
      ...evictOps,
      this.prisma.rankingScope.update({
        where: { id: scopeId },
        data: { lastComputedAt: now },
      }),
    ]);

    // Emit RANK_CHANGED for users whose rank moved. Done after persistence
    // so listeners see consistent state.
    for (const change of rankChanged) {
      this.eventBus.emit({
        type: 'RANK_CHANGED',
        userId: change.userId,
        refType: 'RankingScope',
        refId: scopeId,
        payload: {
          scopeKind: scope.kind,
          scopeKey: scope.key,
          scopeDisplayName: scope.displayName,
          fromRank: change.from,
          toRank: change.to,
          delta: (change.from ?? change.to) - change.to,
        },
      });
    }

    // Internal signal — leaderboard cache subscribes and drops every
    // cached entry for this scope so the next read sees fresh ranks.
    this.eventBus.emitInternal('ranking.scope.recomputed', { scopeId });

    this.logger.log(
      `Recomputed scope ${scope.kind}:${scope.key} — ${results.length} users · ${rankChanged.length} rank changes`,
    );

    return { usersScored: results.length, rankChangedCount: rankChanged.length };
  }

  // Snapshot every active scope's current scores into RankingSnapshot for
  // the rank-history chart. Idempotent per (scope, user, takenAt) thanks to
  // the unique constraint — re-running on the same day no-ops.
  async snapshotAllScopes(at: Date = new Date()): Promise<{ scopes: number; rows: number }> {
    const dayStart = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
    const scopes = await this.prisma.rankingScope.findMany({ where: { isActive: true } });

    let totalRows = 0;
    for (const scope of scopes) {
      const ranked = await this.prisma.rankingScore.findMany({
        where: { scopeId: scope.id, rank: { not: null } },
        select: { userId: true, rank: true, score: true },
      });
      if (ranked.length === 0) continue;

      // createMany with skipDuplicates would be ideal but Mongo adapter has
      // limited support; per-row upsert is safe and bounded by user count.
      for (const r of ranked) {
        await this.prisma.rankingSnapshot.upsert({
          where: {
            scopeId_userId_takenAt: {
              scopeId: scope.id,
              userId: r.userId,
              takenAt: dayStart,
            },
          },
          create: {
            scopeId: scope.id,
            userId: r.userId,
            rank: r.rank!,
            score: r.score,
            takenAt: dayStart,
          },
          update: {
            rank: r.rank!,
            score: r.score,
          },
        });
        totalRows++;
      }
    }
    this.logger.log(`Snapshot complete: ${scopes.length} scopes · ${totalRows} rows · ${dayStart.toISOString()}`);
    return { scopes: scopes.length, rows: totalRows };
  }

  // Look up (or create) the per-quiz leaderboard scope. Called when a quiz
  // is flipped to rankRewarding or when a quiz attempt completes.
  async ensureQuizScope(quizId: string, quizTitle: string): Promise<RankingScope> {
    return this.prisma.rankingScope.upsert({
      where: { kind_key: { kind: 'QUIZ', key: quizId } },
      create: {
        kind: 'QUIZ',
        key: quizId,
        displayName: `Quiz · ${quizTitle}`,
        scorerKey: 'best-attempt',
      },
      update: { displayName: `Quiz · ${quizTitle}` },
    });
  }

  // ─── Internals ─────────────────────────────────────────────────

  // Returns the set of userIds in the scope's static cohort. `null` means
  // "no static filter, take whoever the scorer accepts" — used by SUBJECT
  // / QUIZ scopes where membership is attempt-implied.
  private async eligibleUsersInCohort(scope: RankingScope): Promise<Set<string> | null> {
    if (scope.kind === 'SUBJECT' || scope.kind === 'QUIZ' || scope.kind === 'EVENT') {
      return null;
    }
    const users = await this.prisma.user.findMany({
      where: userMembershipFilter(scope),
      select: { id: true },
    });
    return new Set(users.map((u) => u.id));
  }

  private async loadAttempts(scope: RankingScope, cutoff: Date): Promise<ScorerAttempt[]> {
    // CLASS_GLOBAL / TARGET_EXAM / SUBJECT only score CLOSED rank-rewarding
    // quizzes (contest model — global rank is the sum of best percentages
    // across locked-in quizzes). QUIZ scopes filter by their own quizId
    // and apply a per-quiz cutoff if the quiz is closed.
    let rankRewardingQuizIds: string[] | null = null;
    let perQuizCutoff: Date | null = null;

    if (scope.kind === 'CLASS_GLOBAL' || scope.kind === 'TARGET_EXAM' || scope.kind === 'SUBJECT') {
      const quizzes = await this.prisma.quiz.findMany({
        where: {
          rankRewarding: true,
          status: 'ACTIVE',
          isClosed: true,
        },
        select: { id: true },
      });
      rankRewardingQuizIds = quizzes.map((q) => q.id);
    } else if (scope.kind === 'QUIZ') {
      // If this quiz is closed, freeze attempts at the close time.
      const quiz = await this.prisma.quiz.findUnique({
        where: { id: scope.key },
        select: { isClosed: true, closedAt: true, quizEndsAt: true },
      });
      if (quiz?.isClosed) {
        perQuizCutoff = quiz.closedAt ?? quiz.quizEndsAt ?? null;
      }
    }

    const attempts = await this.prisma.quizAttempt.findMany({
      where: attemptInputFilter(scope, rankRewardingQuizIds, cutoff, perQuizCutoff),
      select: {
        id: true,
        studentId: true,
        quizId: true,
        quizSubject: true,
        percentage: true,
        timeTakenSecs: true,
        completedAt: true,
      },
    });

    // For SUBJECT/CLASS_GLOBAL/TARGET_EXAM, attach quiz difficulty. We
    // batch-load by unique quizId set to keep this O(unique quizzes), not
    // O(attempts).
    let difficultyByQuizId = new Map<string, string | null>();
    if (scope.kind !== 'QUIZ') {
      const uniq = [...new Set(attempts.map((a) => a.quizId))];
      if (uniq.length) {
        const quizzes = await this.prisma.quiz.findMany({
          where: { id: { in: uniq } },
          select: { id: true, difficulty: true },
        });
        difficultyByQuizId = new Map(quizzes.map((q) => [q.id, q.difficulty]));
      }
    }

    return attempts
      .filter((a): a is typeof a & { completedAt: Date } => a.completedAt !== null)
      .map((a) => ({
        attemptId: a.id,
        userId: a.studentId,
        quizId: a.quizId,
        quizSubject: a.quizSubject,
        quizDifficulty: difficultyByQuizId.get(a.quizId) ?? null,
        percentage: a.percentage,
        timeTakenSecs: a.timeTakenSecs,
        completedAt: a.completedAt,
      }));
  }
}
