import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
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
  constructor(private prisma: PrismaService) {}

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
