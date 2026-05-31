import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as v8 from 'node:v8';
import { PrismaService } from '../prisma/prisma.service.js';
import { QUEUE } from '../events/queue-names.js';
import {
  PaymentStatus,
  PaymentMode,
  AttemptStatus,
  SubscriptionStatus,
  Role,
  ActivityEventType,
  Cadence,
} from '@prisma/client';

type PeriodKey = 'today' | '7d' | '30d' | 'qtd' | 'ytd';

const ACTIVE_USER_DAYS = 14;
const ACCURACY_SAMPLE_SIZE = 1000;
const RECENT_FEED_LIMIT = 20;

@Injectable()
export class AdminOverviewService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUE.RANKING_RECOMPUTE) private rankingRecomputeQ: Queue,
    @InjectQueue(QUEUE.RANKING_SNAPSHOT) private rankingSnapshotQ: Queue,
    @InjectQueue(QUEUE.BADGE_EVAL) private badgeEvalQ: Queue,
    @InjectQueue(QUEUE.STATS_ROLLUP) private statsRollupQ: Queue,
  ) {}

  private rangeForPeriod(period: PeriodKey): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
    const now = new Date();
    const end = new Date(now);
    let start: Date;

    if (period === 'today') {
      start = new Date(now); start.setHours(0, 0, 0, 0);
    } else if (period === '7d') {
      start = new Date(now.getTime() - 7 * 86400_000);
    } else if (period === '30d') {
      start = new Date(now.getTime() - 30 * 86400_000);
    } else if (period === 'qtd') {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
    }

    const span = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(start.getTime() - span);
    return { start, end, prevStart, prevEnd };
  }

  async getOverview(period: PeriodKey) {
    const { start, end, prevStart, prevEnd } = this.rangeForPeriod(period);

    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const dayAgo = new Date(Date.now() - 86400_000);
    const sevenAgo = new Date(Date.now() - 7 * 86400_000);
    const activeCutoff = new Date(Date.now() - ACTIVE_USER_DAYS * 86400_000);

    const [
      revenueAgg,
      revenuePrevAgg,
      signupsToday,
      signupsLast7,
      activeUsers,
      activePrevUsers,
      quizzes24h,
      quizzesPrev24h,
      proConversionsToday,
      proRevenueToday,
      newSubscriptionsToday,
      attemptsForAccuracy,
      failedPayments24h,
      failedSubs,
      failedOneTime,
      studentAgg,
      planRows,
      allActiveSubs,
      lastAttempts,
    ] = await Promise.all([
      this.prisma.paymentTransaction.aggregate({
        _sum: { amount: true }, _count: { _all: true },
        where: { status: PaymentStatus.SUCCESS, mode: PaymentMode.SUBSCRIPTION, createdAt: { gte: start, lte: end } },
      }),
      this.prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatus.SUCCESS, mode: PaymentMode.SUBSCRIPTION, createdAt: { gte: prevStart, lte: prevEnd } },
      }),
      this.prisma.user.count({ where: { role: Role.STUDENT, createdAt: { gte: startOfToday } } }),
      this.prisma.user.count({ where: { role: Role.STUDENT, createdAt: { gte: sevenAgo } } }),
      this.prisma.user.count({ where: { role: Role.STUDENT, isActive: true, lastActive: { gte: activeCutoff } } }),
      this.prisma.user.count({ where: { role: Role.STUDENT, isActive: true, lastActive: { gte: new Date(activeCutoff.getTime() - 7 * 86400_000), lt: activeCutoff } } }),
      this.prisma.quizAttempt.count({ where: { status: AttemptStatus.COMPLETED, completedAt: { gte: dayAgo } } }),
      this.prisma.quizAttempt.count({ where: { status: AttemptStatus.COMPLETED, completedAt: { gte: new Date(dayAgo.getTime() - 86400_000), lt: dayAgo } } }),
      this.prisma.paymentTransaction.count({
        where: { status: PaymentStatus.SUCCESS, mode: PaymentMode.SUBSCRIPTION, createdAt: { gte: startOfToday } },
      }),
      this.prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatus.SUCCESS, mode: PaymentMode.SUBSCRIPTION, createdAt: { gte: startOfToday } },
      }),
      this.prisma.studentSubscription.count({ where: { createdAt: { gte: startOfToday }, status: SubscriptionStatus.ACTIVE } }),
      this.prisma.quizAttempt.findMany({
        where: { status: AttemptStatus.COMPLETED, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' }, take: ACCURACY_SAMPLE_SIZE,
        select: { percentage: true },
      }),
      this.prisma.paymentTransaction.count({ where: { status: PaymentStatus.FAILED, createdAt: { gte: dayAgo } } }),
      this.prisma.paymentTransaction.count({ where: { status: PaymentStatus.FAILED, mode: PaymentMode.SUBSCRIPTION, createdAt: { gte: dayAgo } } }),
      this.prisma.paymentTransaction.count({ where: { status: PaymentStatus.FAILED, mode: PaymentMode.ONE_TIME, createdAt: { gte: dayAgo } } }),
      // Avg current streak across recently-active students. _avg is null-safe on empty sets.
      this.prisma.user.aggregate({
        _avg: { streak: true }, _count: { _all: true },
        where: { role: Role.STUDENT, isActive: true, lastActive: { gte: activeCutoff } },
      }),
      this.prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        select: { id: true, name: true, isFree: true },
      }),
      this.prisma.studentSubscription.findMany({
        where: { status: SubscriptionStatus.ACTIVE },
        select: { planId: true },
      }),
      this.prisma.quizAttempt.findMany({
        where: { status: AttemptStatus.COMPLETED, completedAt: { gte: dayAgo } },
        orderBy: { completedAt: 'desc' }, take: 1,
        select: { completedAt: true },
      }),
    ]);

    const totalStudents = await this.prisma.user.count({ where: { role: Role.STUDENT } });

    // Plan distribution. Every student counts: subscribed → their plan name,
    // unsubscribed → "Free".
    const planById = new Map(planRows.map((p) => [p.id, p]));
    const planCounts = new Map<string, number>();
    for (const sub of allActiveSubs) {
      const plan = planById.get(sub.planId);
      const key = plan?.name || 'Other';
      planCounts.set(key, (planCounts.get(key) || 0) + 1);
    }
    const paidCount = allActiveSubs.length;
    const freeCount = Math.max(0, totalStudents - paidCount);
    planCounts.set('Free', (planCounts.get('Free') || 0) + freeCount);

    const distribution = Array.from(planCounts.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalStudents > 0 ? +((count / totalStudents) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const accuracyAvg = attemptsForAccuracy.length
      ? +(attemptsForAccuracy.reduce((s, a) => s + a.percentage, 0) / attemptsForAccuracy.length).toFixed(1)
      : 0;
    const accuracySamplePrev = await this.prisma.quizAttempt.findMany({
      where: {
        status: AttemptStatus.COMPLETED,
        completedAt: { not: null, lt: lastAttempts[0]?.completedAt ?? new Date() },
      },
      orderBy: { completedAt: 'desc' }, take: ACCURACY_SAMPLE_SIZE,
      select: { percentage: true },
    });
    const accuracyPrev = accuracySamplePrev.length
      ? +(accuracySamplePrev.reduce((s, a) => s + a.percentage, 0) / accuracySamplePrev.length).toFixed(1)
      : 0;

    const revenue = revenueAgg._sum.amount ?? 0;
    const revenuePrev = revenuePrevAgg._sum.amount ?? 0;
    const revenueDeltaPct = revenuePrev > 0 ? ((revenue - revenuePrev) / revenuePrev) * 100 : null;

    const proRev = proRevenueToday._sum.amount ?? 0;
    const conversionRate = signupsLast7 > 0 ? +(newSubscriptionsToday / signupsLast7 * 100).toFixed(1) : 0;

    const quizzesDeltaPct = quizzesPrev24h > 0 ? ((quizzes24h - quizzesPrev24h) / quizzesPrev24h) * 100 : null;
    const activeDelta = activeUsers - activePrevUsers;
    const signupsAvg7 = +((signupsLast7 / 7) || 0).toFixed(0);

    return {
      data: {
        period,
        range: { start, end },
        kpis: {
          mrr: { value: revenue, prev: revenuePrev, deltaPct: revenueDeltaPct },
          activeStudents: { value: activeUsers, delta: activeDelta },
          signupsToday: { value: signupsToday, avg7: signupsAvg7 },
          quizzes24h: { value: quizzes24h, deltaPct: quizzesDeltaPct },
          proConversions: {
            count: proConversionsToday, revenue: proRev, rate: conversionRate,
          },
          avgStreak: {
            value: +((studentAgg._avg.streak ?? 0)).toFixed(1),
            sampleSize: studentAgg._count._all,
          },
          avgAccuracy: {
            value: accuracyAvg, prev: accuracyPrev, sampleSize: attemptsForAccuracy.length,
          },
          failedPayments24h: {
            value: failedPayments24h,
            subscriptions: failedSubs,
            oneTime: failedOneTime,
          },
        },
        planDistribution: {
          total: totalStudents,
          rows: distribution,
          paidCount,
          paidShare: totalStudents > 0 ? +((paidCount / totalStudents) * 100).toFixed(1) : 0,
        },
      },
    };
  }

  async getRevenueTrend(days: number) {
    const D = Math.max(7, Math.min(180, days || 30));
    const start = new Date(); start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (D - 1));

    // Pull all SUCCESS payments in window — typical volume on EdTech is small
    // enough to bucket in memory. If this ever crosses ~50k rows for a 90-day
    // window we'll switch to a $group aggregation pipeline.
    const payments = await this.prisma.paymentTransaction.findMany({
      where: { status: PaymentStatus.SUCCESS, createdAt: { gte: start } },
      select: { amount: true, mode: true, createdAt: true },
    });

    const buckets = new Map<string, { subscriptions: number; oneTime: number }>();
    for (let i = 0; i < D; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      buckets.set(this.dayKey(d), { subscriptions: 0, oneTime: 0 });
    }
    for (const p of payments) {
      const key = this.dayKey(p.createdAt);
      const b = buckets.get(key);
      if (!b) continue;
      if (p.mode === PaymentMode.SUBSCRIPTION) b.subscriptions += p.amount;
      else b.oneTime += p.amount;
    }

    const points = Array.from(buckets.entries()).map(([day, v]) => ({
      day, subscriptions: Math.round(v.subscriptions), oneTime: Math.round(v.oneTime), total: Math.round(v.subscriptions + v.oneTime),
    }));

    const total = points.reduce((s, p) => s + p.total, 0);
    const half = Math.floor(points.length / 2);
    const recentSum = points.slice(half).reduce((s, p) => s + p.total, 0);
    const priorSum = points.slice(0, half).reduce((s, p) => s + p.total, 0);
    const deltaPct = priorSum > 0 ? +(((recentSum - priorSum) / priorSum) * 100).toFixed(1) : null;

    return {
      data: {
        days: D,
        points,
        summary: {
          total: Math.round(total),
          recent: Math.round(recentSum),
          prior: Math.round(priorSum),
          deltaAbs: Math.round(recentSum - priorSum),
          deltaPct,
        },
      },
    };
  }

  async getTopQuizzes(days: number, limit: number) {
    const since = new Date(Date.now() - Math.max(1, days) * 86400_000);

    const attempts = await this.prisma.quizAttempt.findMany({
      where: { status: AttemptStatus.COMPLETED, completedAt: { gte: since } },
      select: { quizId: true, quizTitle: true, quizSubject: true, percentage: true },
    });

    const agg = new Map<string, { quizId: string; title: string; subject: string; attempts: number; sumPct: number }>();
    for (const a of attempts) {
      const cur = agg.get(a.quizId) || { quizId: a.quizId, title: a.quizTitle, subject: a.quizSubject, attempts: 0, sumPct: 0 };
      cur.attempts += 1;
      cur.sumPct += a.percentage;
      agg.set(a.quizId, cur);
    }

    const rows = Array.from(agg.values())
      .map((r) => ({
        quizId: r.quizId,
        title: r.title,
        subject: r.subject,
        attempts: r.attempts,
        avgAccuracy: +(r.sumPct / r.attempts).toFixed(1),
      }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, Math.max(1, Math.min(20, limit || 5)));

    return { data: { days, rows } };
  }

  async getActivityFeed(limit: number) {
    const take = Math.max(1, Math.min(50, limit || RECENT_FEED_LIMIT));
    const since = new Date(Date.now() - 24 * 3600_000);

    // Pull recent events from a few admin-relevant tables in parallel and
    // merge by timestamp. Beats a single union query and lets us label
    // each row with its source for the UI.
    const [signups, plans, failed, completedQuizzes] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: Role.STUDENT, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' }, take,
        select: { id: true, name: true, email: true, class: true, createdAt: true },
      }),
      this.prisma.paymentTransaction.findMany({
        where: { status: PaymentStatus.SUCCESS, mode: PaymentMode.SUBSCRIPTION, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' }, take,
        select: {
          id: true, amount: true, cadence: true, createdAt: true, planId: true,
          user: { select: { name: true, email: true } },
        },
      }),
      this.prisma.paymentTransaction.findMany({
        where: { status: PaymentStatus.FAILED, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' }, take,
        select: {
          id: true, amount: true, createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
      this.prisma.activityEvent.findMany({
        where: { type: ActivityEventType.PLAN_CANCELLED, occurredAt: { gte: since } },
        orderBy: { occurredAt: 'desc' }, take,
        select: {
          id: true, title: true, meta: true, occurredAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    const planNames = new Map(
      (await this.prisma.subscriptionPlan.findMany({ select: { id: true, name: true } }))
        .map((p) => [p.id, p.name]),
    );

    const rows = [
      ...signups.map((u) => ({
        kind: 'signup' as const,
        at: u.createdAt,
        title: `${u.name} signed up`,
        meta: `Free${u.class ? ` · ${u.class}` : ''}${u.email ? ` · ${u.email}` : ''}`,
        amount: null as number | null,
        userEmail: u.email,
      })),
      ...plans.map((p) => ({
        kind: 'payment' as const,
        at: p.createdAt,
        title: `${p.user?.name ?? 'Student'} upgraded to ${planNames.get(p.planId ?? '') ?? 'Pro'}`,
        meta: `Plan · ${this.cadenceLabel(p.cadence)} · ${p.user?.email ?? ''}`,
        amount: p.amount,
        userEmail: p.user?.email ?? null,
      })),
      ...failed.map((p) => ({
        kind: 'refund' as const,
        at: p.createdAt,
        title: `Payment failed · ${p.user?.email ?? 'unknown'}`,
        meta: 'Auto-retry scheduled',
        amount: -Math.abs(p.amount),
        userEmail: p.user?.email ?? null,
      })),
      ...completedQuizzes.map((e) => ({
        kind: 'support' as const,
        at: e.occurredAt,
        title: e.title || `${e.user?.name ?? 'Student'} cancelled their plan`,
        meta: e.meta || (e.user?.email ?? ''),
        amount: null as number | null,
        userEmail: e.user?.email ?? null,
      })),
    ]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, take);

    return { data: { rows } };
  }

  async listTransactions(opts: {
    page: number;
    limit: number;
    status?: PaymentStatus | 'ALL';
    mode?: PaymentMode | 'ALL';
    search?: string;
    from?: string;
    to?: string;
  }) {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.max(1, Math.min(100, opts.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (opts.status && opts.status !== 'ALL') where.status = opts.status;
    if (opts.mode && opts.mode !== 'ALL') where.mode = opts.mode;

    const createdAt: Record<string, Date> = {};
    if (opts.from) {
      const d = new Date(opts.from);
      if (!isNaN(d.getTime())) createdAt.gte = d;
    }
    if (opts.to) {
      const d = new Date(opts.to);
      if (!isNaN(d.getTime())) {
        // Treat `to` inclusively (end of selected day).
        d.setHours(23, 59, 59, 999);
        createdAt.lte = d;
      }
    }
    if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;

    // Search resolves to user-name/email match — we look up matching userIds
    // first and add an `in` filter, since PaymentTransaction has no joinable
    // name fields of its own.
    const q = opts.search?.trim();
    if (q) {
      const matching = await this.prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true }, take: 200,
      });
      where.userId = { in: matching.map((u) => u.id) };
      // Short-circuit: no users matched, no results possible.
      if (matching.length === 0) {
        return {
          data: {
            rows: [], totals: { gross: 0, net: 0, success: 0, failed: 0, refunded: 0 },
          },
          pagination: { page, limit, total: 0, pages: 0 },
        };
      }
    }

    const [rows, total, statusAgg] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        select: {
          id: true, amount: true, currency: true, status: true, mode: true,
          cadence: true, planId: true, redeemCode: true,
          gatewayPaymentId: true, gatewayOrderId: true,
          createdAt: true, updatedAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.paymentTransaction.count({ where }),
      this.prisma.paymentTransaction.groupBy({
        by: ['status'], where, _sum: { amount: true }, _count: { _all: true },
      }),
    ]);

    const planIds = Array.from(new Set(rows.map((r) => r.planId).filter(Boolean) as string[]));
    const plans = planIds.length
      ? await this.prisma.subscriptionPlan.findMany({
          where: { id: { in: planIds } },
          select: { id: true, name: true },
        })
      : [];
    const planNameById = new Map(plans.map((p) => [p.id, p.name]));

    const out = rows.map((r) => ({
      id: r.id,
      amount: r.amount,
      currency: r.currency,
      status: r.status,
      mode: r.mode,
      cadence: r.cadence,
      planId: r.planId,
      planName: r.planId ? planNameById.get(r.planId) ?? 'Unknown plan' : '—',
      redeemCode: r.redeemCode,
      gatewayPaymentId: r.gatewayPaymentId,
      gatewayOrderId: r.gatewayOrderId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      user: r.user,
    }));

    const totals = {
      success: 0, failed: 0, refunded: 0, pending: 0,
      gross: 0, net: 0,
    };
    for (const row of statusAgg) {
      const sum = row._sum.amount ?? 0;
      const cnt = row._count._all ?? 0;
      if (row.status === PaymentStatus.SUCCESS) { totals.success = cnt; totals.gross += sum; totals.net += sum; }
      else if (row.status === PaymentStatus.FAILED) totals.failed = cnt;
      else if (row.status === PaymentStatus.REFUNDED) { totals.refunded = cnt; totals.net -= sum; }
      else if (row.status === PaymentStatus.PENDING) totals.pending = cnt;
    }

    return {
      data: { rows: out, totals },
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async getSystemHealth() {
    const [dbPingMs, queueCounts, inProgressAttempts] = await Promise.all([
      this.pingDb(),
      this.collectQueueCounts(),
      this.prisma.quizAttempt.count({ where: { status: AttemptStatus.IN_PROGRESS } }),
    ]);

    // V8's `heap_size_limit` is the real ceiling (--max-old-space-size,
    // ~4 GB by default). `process.memoryUsage().heapTotal` is just the
    // currently-allocated arena and grows on demand, so used/total always
    // sits near 90% on a healthy small app — useless as a health signal.
    const heap = v8.getHeapStatistics();
    const heapUsedMB = heap.used_heap_size / 1024 / 1024;
    const heapLimitMB = heap.heap_size_limit / 1024 / 1024;
    const heapPct = heapLimitMB > 0 ? (heapUsedMB / heapLimitMB) * 100 : 0;

    const queueDepth = queueCounts.reduce((s, q) => s + q.waiting + q.active + q.delayed, 0);
    const queueFailed = queueCounts.reduce((s, q) => s + q.failed, 0);

    // Status thresholds chosen so the panel goes amber before a user
    // notices and red only when it's almost certainly already paging.
    const rows = [
      {
        key: 'uptime',
        label: 'API uptime',
        value: this.formatUptime(process.uptime()),
        status: 'ok' as const,
      },
      {
        key: 'db',
        label: 'DB ping',
        value: dbPingMs === null ? 'down' : `${dbPingMs}ms`,
        status: this.classify(dbPingMs, { warn: 150, bad: 500, downIsBad: true }),
      },
      {
        key: 'queue',
        label: 'Queue depth',
        value: `${queueDepth.toLocaleString('en-IN')} job${queueDepth === 1 ? '' : 's'}`,
        status: this.classify(queueDepth, { warn: 500, bad: 5000 }),
      },
      {
        key: 'memory',
        label: 'Heap memory',
        value: heapLimitMB >= 1024
          ? `${heapUsedMB.toFixed(0)} MB / ${(heapLimitMB / 1024).toFixed(1)} GB`
          : `${heapUsedMB.toFixed(0)} / ${heapLimitMB.toFixed(0)} MB`,
        status: this.classify(heapPct, { warn: 70, bad: 85 }),
      },
      {
        key: 'attempts',
        label: 'Attempts in progress',
        value: `${inProgressAttempts.toLocaleString('en-IN')} live`,
        status: 'ok' as const,
      },
    ];

    const worst = rows.some((r) => r.status === 'bad')
      ? 'bad'
      : rows.some((r) => r.status === 'warn')
        ? 'warn'
        : 'ok';

    return {
      data: {
        overall: worst,
        rows,
        queues: queueCounts,
        meta: {
          failedJobs: queueFailed,
          heapUsedMB: +heapUsedMB.toFixed(1),
          heapLimitMB: +heapLimitMB.toFixed(1),
          uptimeSec: Math.round(process.uptime()),
        },
      },
    };
  }

  private async pingDb(): Promise<number | null> {
    try {
      const t0 = Date.now();
      // $runCommandRaw works on MongoDB; the ping result itself is uninteresting.
      await this.prisma.$runCommandRaw({ ping: 1 });
      return Date.now() - t0;
    } catch {
      return null;
    }
  }

  private async collectQueueCounts() {
    const queues = [
      { name: QUEUE.RANKING_RECOMPUTE, q: this.rankingRecomputeQ },
      { name: QUEUE.RANKING_SNAPSHOT, q: this.rankingSnapshotQ },
      { name: QUEUE.BADGE_EVAL, q: this.badgeEvalQ },
      { name: QUEUE.STATS_ROLLUP, q: this.statsRollupQ },
    ];
    return Promise.all(
      queues.map(async ({ name, q }) => {
        try {
          const c = await q.getJobCounts('waiting', 'active', 'delayed', 'failed');
          return {
            name,
            waiting: c.waiting ?? 0,
            active: c.active ?? 0,
            delayed: c.delayed ?? 0,
            failed: c.failed ?? 0,
          };
        } catch {
          // Redis transient — treat as zero rather than failing the whole panel.
          return { name, waiting: 0, active: 0, delayed: 0, failed: 0 };
        }
      }),
    );
  }

  private formatUptime(sec: number): string {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${Math.round(sec)}s`;
  }

  private classify(
    value: number | null,
    opts: { warn: number; bad: number; downIsBad?: boolean },
  ): 'ok' | 'warn' | 'bad' {
    if (value === null) return opts.downIsBad ? 'bad' : 'warn';
    if (value >= opts.bad) return 'bad';
    if (value >= opts.warn) return 'warn';
    return 'ok';
  }

  private cadenceLabel(c: Cadence | null | undefined): string {
    if (c === Cadence.MONTHLY) return 'monthly';
    if (c === Cadence.ANNUAL) return 'annual';
    if (c === Cadence.ONE_TIME) return 'one-time';
    return '—';
  }

  private dayKey(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
