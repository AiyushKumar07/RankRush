import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// Computes (userId, periodDays, periodEndDate) → UserPeriodStats rows.
//
// The nightly cron pre-warms common periods (7/30/90) for active users so
// the stat-strip is a single fast read. On-demand callers can request
// "today" or arbitrary periodDays and we'll compute + persist.
//
// Idempotent — re-running on the same (userId, periodDays, periodEndDate)
// updates the existing row rather than creating duplicates.
@Injectable()
export class PeriodStatsService {
  private readonly logger = new Logger(PeriodStatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Truncates `at` to UTC day-start. Used as the canonical period end so
  // multiple writes on the same day land on the same row.
  private toUtcDayStart(at: Date): Date {
    return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  }

  async compute(
    userId: string,
    periodDays: number,
    periodEndDate: Date = new Date(),
  ): Promise<void> {
    const end = this.toUtcDayStart(periodEndDate);
    const endExclusive = new Date(end.getTime() + 86_400_000); // include the full end day
    const start = new Date(end.getTime() - (periodDays - 1) * 86_400_000);
    const prevEnd = new Date(start.getTime());
    const prevStart = new Date(start.getTime() - periodDays * 86_400_000);

    const [
      attemptsInPeriod,
      prevAttempts,
      classGlobalScope,
      user,
      tokenTxns,
    ] = await Promise.all([
      this.prisma.quizAttempt.findMany({
        where: {
          studentId: userId,
          status: 'COMPLETED',
          completedAt: { gte: start, lt: endExclusive },
        },
        select: { percentage: true, completedAt: true },
      }),
      this.prisma.quizAttempt.findMany({
        where: {
          studentId: userId,
          status: 'COMPLETED',
          completedAt: { gte: prevStart, lt: prevEnd },
        },
        select: { percentage: true },
      }),
      // Resolve the user's CLASS_GLOBAL scope so we can pull rank
      // start/end from snapshots.
      this.prisma.user
        .findUnique({ where: { id: userId }, select: { class: true, streak: true } })
        .then(async (u) => {
          if (!u?.class) return { scopeId: null as string | null, streak: u?.streak ?? 0 };
          const scope = await this.prisma.rankingScope.findUnique({
            where: { kind_key: { kind: 'CLASS_GLOBAL', key: u.class } },
            select: { id: true },
          });
          return { scopeId: scope?.id ?? null, streak: u.streak };
        }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { streak: true },
      }),
      this.prisma.tokenTransaction.findMany({
        where: {
          userId,
          createdAt: { gte: start, lt: endExclusive },
        },
        select: { amount: true, type: true },
      }),
    ]);

    const quizzesTaken = attemptsInPeriod.length;
    const avgAccuracy =
      quizzesTaken === 0
        ? 0
        : attemptsInPeriod.reduce((s, a) => s + a.percentage, 0) / quizzesTaken;

    const prevQuizzesTaken = prevAttempts.length;
    const prevAvgAccuracy =
      prevQuizzesTaken === 0
        ? 0
        : prevAttempts.reduce((s, a) => s + a.percentage, 0) / prevQuizzesTaken;

    let rankStart: number | null = null;
    let rankEnd: number | null = null;
    if (classGlobalScope.scopeId) {
      // rankStart: latest snapshot at-or-before period start
      const startSnap = await this.prisma.rankingSnapshot.findFirst({
        where: {
          scopeId: classGlobalScope.scopeId,
          userId,
          takenAt: { lte: start },
        },
        orderBy: { takenAt: 'desc' },
        select: { rank: true },
      });
      rankStart = startSnap?.rank ?? null;

      const currentScore = await this.prisma.rankingScore.findUnique({
        where: { scopeId_userId: { scopeId: classGlobalScope.scopeId, userId } },
        select: { rank: true },
      });
      rankEnd = currentScore?.rank ?? null;
    }

    const rankDelta =
      rankStart != null && rankEnd != null ? rankEnd - rankStart : null;

    let tokensEarned = 0;
    let tokensSpent = 0;
    for (const t of tokenTxns) {
      if (t.amount > 0) tokensEarned += t.amount;
      else tokensSpent += -t.amount;
    }

    // Streak-days-in-period: just clamp current streak to period length —
    // a precise per-day backfill would require login-history we don't keep.
    const streakDaysInPeriod = Math.min(periodDays, user?.streak ?? 0);

    await this.prisma.userPeriodStats.upsert({
      where: {
        userId_periodEndDate_periodDays: {
          userId,
          periodEndDate: end,
          periodDays,
        },
      },
      create: {
        userId,
        periodEndDate: end,
        periodDays,
        quizzesTaken,
        avgAccuracy,
        rankStart,
        rankEnd,
        rankDelta,
        streakDaysInPeriod,
        tokensEarned,
        tokensSpent,
        prevQuizzesTaken,
        prevAvgAccuracy,
      },
      update: {
        quizzesTaken,
        avgAccuracy,
        rankStart,
        rankEnd,
        rankDelta,
        streakDaysInPeriod,
        tokensEarned,
        tokensSpent,
        prevQuizzesTaken,
        prevAvgAccuracy,
      },
    });
  }

  async get(
    userId: string,
    periodDays: number,
    periodEndDate: Date = new Date(),
  ) {
    const end = this.toUtcDayStart(periodEndDate);
    const isToday =
      end.toDateString() === this.toUtcDayStart(new Date()).toDateString();

    // Rows ending today mutate every time the user takes a quiz, earns
    // a token, or has their rank refreshed. A staleness window is the
    // wrong tool — the previous 30-min TTL caused the exact "I just
    // took a quiz but 7d still shows 0" bug, because two adjacent
    // period rows could be computed at different times and disagree.
    // Always recompute for today; cache only past end-dates (those
    // rows are immutable by construction).
    if (isToday) {
      await this.compute(userId, periodDays, periodEndDate);
      return this.prisma.userPeriodStats.findUnique({
        where: {
          userId_periodEndDate_periodDays: {
            userId,
            periodEndDate: end,
            periodDays,
          },
        },
      });
    }

    let row = await this.prisma.userPeriodStats.findUnique({
      where: {
        userId_periodEndDate_periodDays: {
          userId,
          periodEndDate: end,
          periodDays,
        },
      },
    });
    if (!row) {
      await this.compute(userId, periodDays, periodEndDate);
      row = await this.prisma.userPeriodStats.findUnique({
        where: {
          userId_periodEndDate_periodDays: {
            userId,
            periodEndDate: end,
            periodDays,
          },
        },
      });
    }
    return row;
  }

  // Nightly rollup target: for every active student, refresh the 1/7/30/90
  // period rows ending today. Bounded set keeps the job O(activeUsers × 4).
  async rolloverAllActiveUsers(today: Date = new Date()): Promise<{ users: number }> {
    const recentlyActive = await this.prisma.user.findMany({
      where: {
        role: 'STUDENT',
        isActive: true,
        // Don't bother computing for users who never visit.
        lastActive: { gte: new Date(Date.now() - 90 * 86_400_000) },
      },
      select: { id: true },
    });

    for (const u of recentlyActive) {
      for (const days of [1, 7, 30, 90]) {
        try {
          await this.compute(u.id, days, today);
        } catch (err) {
          this.logger.error(
            `Failed period-stats compute for user ${u.id} days=${days}: ${(err as Error).message}`,
          );
        }
      }
    }

    this.logger.log(
      `Period-stats rollup complete for ${recentlyActive.length} users.`,
    );
    return { users: recentlyActive.length };
  }
}
