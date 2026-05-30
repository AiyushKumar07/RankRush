import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LeaderboardCacheService } from './leaderboard-cache.service.js';
import type { ScopeKind } from '@prisma/client';

// Read API over RankingScore + RankingScope. Stays purely a read-model —
// score writes happen in RankingService, this just queries + caches.
@Injectable()
export class LeaderboardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: LeaderboardCacheService,
  ) {}

  // ─── Scope discovery for the current user ─────────────────────────
  // Returns only:
  //   - Their CLASS_GLOBAL scope (single entry — they only see their class)
  //   - Their last 7 rank-rewarding QUIZ scopes, sorted by most recent
  //     attempt first, with live/closed phase metadata so the UI can label
  //
  // TARGET_EXAM / SUBJECT scopes are intentionally NOT surfaced in the
  // new contest model — they're seeded with isActive=false and unused.
  async listScopesForUser(
    userId: string,
    opts: { page?: number; limit?: number } = {},
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(50, Math.max(1, opts.limit ?? 10));

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { class: true },
    });

    const out: any[] = [];

    // 1) Class-cohort scope — single entry per user (their class only).
    if (user?.class) {
      const cgScope = await this.prisma.rankingScope.findUnique({
        where: { kind_key: { kind: 'CLASS_GLOBAL', key: user.class } },
      });
      if (cgScope?.isActive) {
        const [mine, total] = await Promise.all([
          this.prisma.rankingScore.findUnique({
            where: { scopeId_userId: { scopeId: cgScope.id, userId } },
            select: { rank: true, score: true },
          }),
          this.prisma.rankingScore.count({
            where: { scopeId: cgScope.id, rank: { not: null } },
          }),
        ]);
        out.push({
          kind: cgScope.kind,
          key: cgScope.key,
          displayName: cgScope.displayName,
          scorerKey: cgScope.scorerKey,
          totalParticipants: total,
          me: mine?.rank != null
            ? { rank: mine.rank, score: Math.round(mine.score * 100) / 100 }
            : null,
        });
      }
    }

    // 2) Rank-rewarding QUIZ scopes the user has attempted, paginated by
    //    most-recent attempt. We dedupe by quizId (a student can have
    //    multiple attempts on the same quiz), then page over the unique
    //    list. Pull a large enough window to dedupe deep without scanning
    //    the entire table.
    const recentAttempts = await this.prisma.quizAttempt.findMany({
      where: { studentId: userId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      take: 500,
      select: {
        quizId: true,
        completedAt: true,
        percentage: true,
      },
    });

    const seenQuizIds = new Set<string>();
    const allUniqueQuizIds: { quizId: string; lastAt: Date | null; lastPct: number }[] = [];
    for (const a of recentAttempts) {
      if (seenQuizIds.has(a.quizId)) continue;
      seenQuizIds.add(a.quizId);
      allUniqueQuizIds.push({
        quizId: a.quizId,
        lastAt: a.completedAt,
        lastPct: a.percentage,
      });
    }

    const totalQuizScopes = allUniqueQuizIds.length;
    const sliceStart = (page - 1) * limit;
    const sliceEnd = sliceStart + limit;
    const uniqueRecentQuizIds = allUniqueQuizIds.slice(sliceStart, sliceEnd);

    if (uniqueRecentQuizIds.length > 0) {
      const quizIds = uniqueRecentQuizIds.map((u) => u.quizId);

      const [quizzes, quizScopes] = await Promise.all([
        // Only surface rank-rewarding quizzes — practice attempts don't
        // belong in the leaderboards list.
        this.prisma.quiz.findMany({
          where: { id: { in: quizIds }, rankRewarding: true },
          select: {
            id: true, title: true, subject: true,
            isClosed: true, closedAt: true, quizStartsAt: true, quizEndsAt: true,
          },
        }),
        this.prisma.rankingScope.findMany({
          where: { kind: 'QUIZ', key: { in: quizIds } },
          select: { id: true, key: true, displayName: true, scorerKey: true, isActive: true, lastComputedAt: true },
        }),
      ]);
      const quizById = new Map(quizzes.map((q) => [q.id, q]));
      const scopeByQuizId = new Map(quizScopes.map((s) => [s.key, s]));

      // Keep the recency order from uniqueRecentQuizIds.
      const quizScopeIds = quizScopes.map((s) => s.id);
      const [myQuizScores, quizTotals] = await Promise.all([
        this.prisma.rankingScore.findMany({
          where: { userId, scopeId: { in: quizScopeIds } },
          select: { scopeId: true, rank: true, score: true },
        }),
        this.prisma.rankingScore.groupBy({
          by: ['scopeId'],
          where: { scopeId: { in: quizScopeIds }, rank: { not: null } },
          _count: { _all: true },
        }),
      ]);
      const myScoreByScopeId = new Map(myQuizScores.map((s) => [s.scopeId, s]));
      const totalByScopeId = new Map(quizTotals.map((t) => [t.scopeId, t._count._all]));

      for (const u of uniqueRecentQuizIds) {
        const quiz = quizById.get(u.quizId);
        if (!quiz) continue;                                  // not rank-rewarding → skip
        const scope = scopeByQuizId.get(u.quizId);
        if (!scope?.isActive) continue;                       // scope hasn't been created yet

        const mine = myScoreByScopeId.get(scope.id);
        const phase = computePhase(quiz);

        out.push({
          kind: 'QUIZ',
          key: scope.key,
          displayName: scope.displayName || `Quiz · ${quiz.title}`,
          scorerKey: scope.scorerKey,
          totalParticipants: totalByScopeId.get(scope.id) ?? 0,
          me: mine?.rank != null
            ? { rank: mine.rank, score: Math.round(mine.score * 100) / 100 }
            : null,
          // QUIZ-specific extras for the UI:
          phase,
          subject: quiz.subject,
          quizStartsAt: quiz.quizStartsAt,
          quizEndsAt: quiz.quizEndsAt,
          closedAt: quiz.closedAt,
          lastAttemptAt: u.lastAt,
          lastAttemptPct: Math.round(u.lastPct),
        });
      }
    }

    return {
      data: {
        scopes: out,
        pagination: {
          page,
          limit,
          totalQuizScopes,
          totalPages: Math.max(1, Math.ceil(totalQuizScopes / limit)),
          hasMore: sliceEnd < totalQuizScopes,
        },
      },
    };
  }

  // ─── Top-N (page from the top) ────────────────────────────────────
  async getTopN(scopeKind: string, scopeKey: string, limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const scope = await this.requireScope(scopeKind, scopeKey);

    const cacheKey = this.cache.topNKey(scope.id, safeLimit);
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.rankingScore.findMany({
      where: { scopeId: scope.id, rank: { not: null } },
      orderBy: { rank: 'asc' },
      take: safeLimit,
      select: {
        rank: true,
        prevRank: true,
        score: true,
        attempts: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            avatar: true,
            class: true,
          },
        },
      },
    });

    const payload = {
      data: {
        scope: {
          kind: scope.kind,
          key: scope.key,
          displayName: scope.displayName,
          lastComputedAt: scope.lastComputedAt,
        },
        rows: rows.map((r) => ({
          rank: r.rank,
          prevRank: r.prevRank,
          delta: r.prevRank != null && r.rank != null ? r.prevRank - r.rank : null, // positive = climbed
          score: Math.round(r.score * 100) / 100,
          attempts: r.attempts,
          user: this.publicUser(r.user),
        })),
      },
    };

    await this.cache.set(cacheKey, payload);
    return payload;
  }

  // ─── Around-me window (rank-context view) ─────────────────────────
  // Returns the user's row plus ±window neighbours. The common UX is
  // "show me where I am" rather than the absolute top of an enormous
  // board the user has no chance of reaching.
  async getAroundMe(
    scopeKind: string,
    scopeKey: string,
    userId: string,
    window = 5,
  ) {
    const safeWindow = Math.min(Math.max(window, 1), 25);
    const scope = await this.requireScope(scopeKind, scopeKey);

    const cacheKey = this.cache.aroundMeKey(scope.id, userId, safeWindow);
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const me = await this.prisma.rankingScore.findUnique({
      where: { scopeId_userId: { scopeId: scope.id, userId } },
      select: { rank: true },
    });
    if (!me?.rank) {
      // User isn't ranked in this scope — fall back to top-N so we
      // always have *something* to render.
      return this.getTopN(scopeKind, scopeKey, safeWindow * 2 + 1);
    }

    const minRank = Math.max(1, me.rank - safeWindow);
    const maxRank = me.rank + safeWindow;

    const rows = await this.prisma.rankingScore.findMany({
      where: {
        scopeId: scope.id,
        rank: { gte: minRank, lte: maxRank },
      },
      orderBy: { rank: 'asc' },
      select: {
        rank: true,
        prevRank: true,
        score: true,
        attempts: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            avatar: true,
            class: true,
          },
        },
      },
    });

    const payload = {
      data: {
        scope: {
          kind: scope.kind,
          key: scope.key,
          displayName: scope.displayName,
          lastComputedAt: scope.lastComputedAt,
        },
        meRank: me.rank,
        windowRange: { min: minRank, max: maxRank },
        rows: rows.map((r) => ({
          rank: r.rank,
          prevRank: r.prevRank,
          delta: r.prevRank != null && r.rank != null ? r.prevRank - r.rank : null,
          score: Math.round(r.score * 100) / 100,
          attempts: r.attempts,
          isMe: r.user.id === userId,
          user: this.publicUser(r.user),
        })),
      },
    };

    await this.cache.set(cacheKey, payload, 30); // shorter TTL — me-window is more volatile
    return payload;
  }

  // ─── Me only (compact rank widget) ────────────────────────────────
  async getMe(scopeKind: string, scopeKey: string, userId: string) {
    const scope = await this.requireScope(scopeKind, scopeKey);

    const cacheKey = this.cache.meKey(scope.id, userId);
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const [me, totalRanked] = await Promise.all([
      this.prisma.rankingScore.findUnique({
        where: { scopeId_userId: { scopeId: scope.id, userId } },
        select: {
          rank: true,
          prevRank: true,
          score: true,
          attempts: true,
        },
      }),
      this.prisma.rankingScore.count({
        where: { scopeId: scope.id, rank: { not: null } },
      }),
    ]);

    if (!me?.rank) {
      const payload = {
        data: {
          scope: {
            kind: scope.kind,
            key: scope.key,
            displayName: scope.displayName,
          },
          ranked: false,
          totalParticipants: totalRanked,
        },
      };
      await this.cache.set(cacheKey, payload, 30);
      return payload;
    }

    // Percentile from the top — "Top 12% in Class 11"
    const percentileTop = totalRanked > 0 ? (me.rank / totalRanked) * 100 : null;

    const payload = {
      data: {
        scope: {
          kind: scope.kind,
          key: scope.key,
          displayName: scope.displayName,
        },
        ranked: true,
        rank: me.rank,
        prevRank: me.prevRank,
        delta:
          me.prevRank != null && me.rank != null ? me.prevRank - me.rank : null,
        score: Math.round(me.score * 100) / 100,
        attempts: me.attempts,
        totalParticipants: totalRanked,
        percentileTop:
          percentileTop != null ? Math.round(percentileTop * 10) / 10 : null,
      },
    };
    await this.cache.set(cacheKey, payload, 30);
    return payload;
  }

  // ─── Internals ───────────────────────────────────────────────────

  private async requireScope(kind: string, key: string) {
    const scope = await this.prisma.rankingScope.findUnique({
      where: { kind_key: { kind: kind as ScopeKind, key } },
    });
    if (!scope || !scope.isActive) {
      throw new NotFoundException(`Leaderboard not found: ${kind}:${key}`);
    }
    return scope;
  }

  private publicUser(u: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    avatar: string | null;
    class: string | null;
  }) {
    const display = u.firstName
      ? `${u.firstName} ${u.lastName?.[0] ?? ''}.`.trim()
      : u.username ?? 'Student';
    const initials = (u.firstName?.[0] ?? u.username?.[0] ?? 'S').toUpperCase();
    return {
      id: u.id,
      displayName: display,
      username: u.username,
      avatar: u.avatar,
      initials,
      class: u.class,
    };
  }
}

// Derives a contest-lifecycle phase string from a quiz row. Mirrors the
// admin-side helper so client + server agree on the labels.
function computePhase(q: {
  isClosed: boolean;
  quizStartsAt: Date | null;
  quizEndsAt: Date | null;
}): 'UPCOMING' | 'LIVE' | 'CLOSING' | 'CLOSED' {
  if (q.isClosed) return 'CLOSED';
  const now = new Date();
  if (q.quizStartsAt && q.quizStartsAt > now) return 'UPCOMING';
  if (q.quizEndsAt && q.quizEndsAt < now) return 'CLOSING'; // past end, cron hasn't swept yet
  return 'LIVE';
}
