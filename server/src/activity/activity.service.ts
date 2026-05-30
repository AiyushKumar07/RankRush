import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PeriodStatsService } from './period-stats.service.js';
import {
  resolvePeriodBounds,
  type Period,
} from './dto/feed-query.dto.js';
import type { ActivityCategory, Prisma } from '@prisma/client';

// Read-model API for the ActivityPage. Hits the new ActivityEvent feed +
// RankingSnapshot + UserPeriodStats tables — no longer touches the legacy
// StudentActivity model. Producers still dual-write to it during cutover
// but reads have moved.
@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periodStats: PeriodStatsService,
  ) {}

  // ─── Timeline feed ────────────────────────────────────────────────
  async getFeed(
    userId: string,
    query: {
      period?: Period;
      category?: string;
      cursor?: string;
      limit?: number;
    },
  ) {
    const limit = Math.min(query.limit ?? 20, 100);
    const { start } = resolvePeriodBounds(query.period);

    const where: Prisma.ActivityEventWhereInput = { userId };
    if (start) where.occurredAt = { gte: start };
    if (query.category) {
      const cats = query.category
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean) as ActivityCategory[];
      if (cats.length) where.category = { in: cats };
    }
    if (query.cursor) {
      // Cursor is an ISO date string of the last item's occurredAt.
      const cur = new Date(query.cursor);
      if (!Number.isNaN(cur.getTime())) {
        const prior = (where.occurredAt && typeof where.occurredAt === 'object'
          ? where.occurredAt
          : {}) as Prisma.DateTimeFilter;
        where.occurredAt = { ...prior, lt: cur };
      }
    }

    const events = await this.prisma.activityEvent.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = events.length > limit;
    const items = hasMore ? events.slice(0, limit) : events;
    const nextCursor = hasMore ? items[items.length - 1].occurredAt.toISOString() : null;

    return {
      data: {
        items: items.map((e) => ({
          id: e.id,
          type: e.type,
          category: e.category,
          title: e.title,
          meta: e.meta,
          icon: e.icon,
          tone: e.tone,
          amount: e.amount,
          payload: e.payload,
          refType: e.refType,
          refId: e.refId,
          occurredAt: e.occurredAt,
        })),
        nextCursor,
      },
    };
  }

  // ─── Category counts (used by filter chips) ───────────────────────
  async getCategoryCounts(userId: string, period?: Period) {
    const { start } = resolvePeriodBounds(period);
    const where: Prisma.ActivityEventWhereInput = { userId };
    if (start) where.occurredAt = { gte: start };

    const grouped = await this.prisma.activityEvent.groupBy({
      by: ['category'],
      where,
      _count: { _all: true },
    });
    const counts: Record<string, number> = { ALL: 0 };
    for (const g of grouped) {
      counts[g.category] = g._count._all;
      counts.ALL += g._count._all;
    }
    return { data: counts };
  }

  // ─── Stat strip ───────────────────────────────────────────────────
  async getStats(userId: string, period: Period = '7d') {
    const { days } = resolvePeriodBounds(period);
    // Map "today" to days=1, "all" to days=null (we cap "all" to 90 for
    // the stat strip; the timeline can still go full-history).
    const periodDays = days ?? 90;
    const row = await this.periodStats.get(userId, periodDays);

    const quizzesDelta =
      row?.prevQuizzesTaken != null
        ? (row.quizzesTaken ?? 0) - row.prevQuizzesTaken
        : null;
    const accuracyDelta =
      row?.prevAvgAccuracy != null
        ? Math.round(((row.avgAccuracy ?? 0) - row.prevAvgAccuracy) * 10) / 10
        : null;

    return {
      data: {
        period,
        periodDays,
        quizzesTaken: row?.quizzesTaken ?? 0,
        quizzesDelta,
        avgAccuracy: row?.avgAccuracy != null ? Math.round(row.avgAccuracy * 10) / 10 : 0,
        accuracyDelta,
        rankStart: row?.rankStart ?? null,
        rankEnd: row?.rankEnd ?? null,
        rankDelta: row?.rankDelta ?? null, // signed; negative = climbed up
        streakDays: row?.streakDaysInPeriod ?? 0,
        tokensEarned: row?.tokensEarned ?? 0,
        tokensSpent: row?.tokensSpent ?? 0,
      },
    };
  }

  // ─── Rank history (chart) ─────────────────────────────────────────
  async getRankHistory(
    userId: string,
    period: Period = '7d',
    scopeKind?: string,
    scopeKey?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { class: true },
    });

    // Resolve scope: explicit override or the user's class-global default.
    let scope = null as { id: string; kind: string; key: string; displayName: string } | null;
    if (scopeKind && scopeKey) {
      scope = await this.prisma.rankingScope.findUnique({
        where: { kind_key: { kind: scopeKind as any, key: scopeKey } },
        select: { id: true, kind: true, key: true, displayName: true },
      });
    } else if (user?.class) {
      scope = await this.prisma.rankingScope.findUnique({
        where: { kind_key: { kind: 'CLASS_GLOBAL', key: user.class } },
        select: { id: true, kind: true, key: true, displayName: true },
      });
    }

    if (!scope) {
      return { data: { scope: null, points: [], current: null } };
    }

    const { days } = resolvePeriodBounds(period);
    const cutoff = days ? new Date(Date.now() - days * 86_400_000) : null;

    const snaps = await this.prisma.rankingSnapshot.findMany({
      where: {
        scopeId: scope.id,
        userId,
        ...(cutoff ? { takenAt: { gte: cutoff } } : {}),
      },
      orderBy: { takenAt: 'asc' },
      select: { rank: true, score: true, takenAt: true },
    });

    const current = await this.prisma.rankingScore.findUnique({
      where: { scopeId_userId: { scopeId: scope.id, userId } },
      select: { rank: true, score: true, prevRank: true },
    });

    return {
      data: {
        scope: {
          kind: scope.kind,
          key: scope.key,
          displayName: scope.displayName,
        },
        points: snaps.map((s) => ({
          rank: s.rank,
          score: s.score,
          at: s.takenAt,
        })),
        current,
      },
    };
  }

  // ─── Subject accuracy ─────────────────────────────────────────────
  async getSubjectAccuracy(userId: string, period: Period = '7d') {
    const { start } = resolvePeriodBounds(period);
    const where: Prisma.QuizAttemptWhereInput = {
      studentId: userId,
      status: 'COMPLETED',
    };
    if (start) where.completedAt = { gte: start };

    const attempts = await this.prisma.quizAttempt.findMany({
      where,
      select: { quizSubject: true, percentage: true, correctCount: true, incorrectCount: true },
    });

    const bySubject = new Map<string, { sumPct: number; count: number; questions: number }>();
    for (const a of attempts) {
      const cur = bySubject.get(a.quizSubject) ?? { sumPct: 0, count: 0, questions: 0 };
      cur.sumPct += a.percentage;
      cur.count += 1;
      cur.questions += a.correctCount + a.incorrectCount;
      bySubject.set(a.quizSubject, cur);
    }

    const rows = [...bySubject.entries()]
      .map(([subject, agg]) => ({
        subject,
        accuracy: agg.count === 0 ? 0 : Math.round(agg.sumPct / agg.count),
        attempts: agg.count,
        questions: agg.questions,
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    return { data: { subjects: rows, totalAttempts: attempts.length } };
  }

  // ─── Heatmap (last N days of attempts) ────────────────────────────
  async getHeatmap(userId: string, days: number = 364) {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    // Align to week start so the grid renders cleanly.
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);

    const attempts = await this.prisma.quizAttempt.findMany({
      where: {
        studentId: userId,
        status: 'COMPLETED',
        completedAt: { gte: start, lte: end },
      },
      select: { completedAt: true },
    });

    const counts: Record<string, number> = {};
    for (const a of attempts) {
      if (!a.completedAt) continue;
      const key = a.completedAt.toISOString().split('T')[0];
      counts[key] = (counts[key] ?? 0) + 1;
    }

    const cells: { date: string; count: number; level: number; future: boolean }[] = [];
    const cur = new Date(start);
    const today = new Date();
    while (cur <= end) {
      const date = cur.toISOString().split('T')[0];
      const count = counts[date] ?? 0;
      let level = 0;
      if (count > 0) {
        if (count <= 2) level = 1;
        else if (count <= 4) level = 2;
        else if (count <= 6) level = 3;
        else level = 4;
      }
      cells.push({ date, count, level, future: cur > today });
      cur.setDate(cur.getDate() + 1);
    }

    return { data: { cells, totalAttempts: attempts.length } };
  }

  // ─── CSV export ───────────────────────────────────────────────────
  // Plain string output; the controller sets the content-type + filename.
  async exportCsv(
    userId: string,
    query: { period?: Period; category?: string },
  ): Promise<string> {
    const { start } = resolvePeriodBounds(query.period);
    const where: Prisma.ActivityEventWhereInput = { userId };
    if (start) where.occurredAt = { gte: start };
    if (query.category) {
      const cats = query.category
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean) as ActivityCategory[];
      if (cats.length) where.category = { in: cats };
    }

    const events = await this.prisma.activityEvent.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: 5000, // cap export — frontend can paginate if more needed
    });

    const header = ['Timestamp', 'Category', 'Type', 'Title', 'Detail', 'Amount'];
    const rows = events.map((e) => [
      e.occurredAt.toISOString(),
      e.category,
      e.type,
      this.escapeCsv(e.title),
      this.escapeCsv(e.meta ?? ''),
      e.amount != null ? String(e.amount) : '',
    ]);
    return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  private escapeCsv(s: string): string {
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }
}
