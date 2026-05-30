import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TokensService } from '../tokens/tokens.service.js';
import { EventBusService } from '../events/event-bus.service.js';

// ─── Rule schema (per-badge ruleConfig shape) ──────────────────────────
// Stored as Json so admins can author new badges from a CMS without a
// schema migration. The evaluator below dispatches on `ruleType`.
//
//   quiz-count        : { count: N }                              → completed ≥ N quizzes
//   questions-answered: { count: N }                              → answered ≥ N questions
//   perfect-quiz      : { count: N }                              → N quizzes at 100%
//   streak            : { days: N }                               → longestStreak ≥ N
//   accuracy-overall  : { minQuizzes, minAccuracy }               → avg pct ≥ X over ≥ Y quizzes
//   subject-accuracy  : { subjectMatch, minQuestions, minAccuracy } → per-subject accuracy
//   rank-milestone    : { topN, scopeKind?: 'CLASS_GLOBAL' }      → reach top-N in scope
//   tokens-earned     : { count: N }                              → cumulative credited tokens

type RuleType =
  | 'quiz-count'
  | 'questions-answered'
  | 'perfect-quiz'
  | 'streak'
  | 'accuracy-overall'
  | 'subject-accuracy'
  | 'rank-milestone'
  | 'tokens-earned';

interface BadgeRule {
  ruleType: RuleType;
  ruleConfig: Record<string, any>;
}

interface UserSnapshot {
  quizzesCompleted: number;
  questionsAnswered: number;
  perfectQuizzes: number;
  longestStreak: number;
  overallAccuracy: number;
  bySubject: Record<string, { questions: number; correct: number; accuracy: number }>;
  bestClassRank: number | null;
  tokensEarned: number;
}

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly eventBus: EventBusService,
  ) {}

  // ── Public read API (drives the dashboard + /app/badges page) ─────
  // Lazily evaluates rules on every call: cheap because each user has a
  // bounded snapshot and we cache nothing. New unlocks are persisted to
  // UserBadge as a side effect; the response always reflects current state.
  async listForUser(userId: string) {
    const [badges, unlocks, snap] = await Promise.all([
      this.prisma.badge.findMany({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.userBadge.findMany({
        where: { userId },
        select: { badgeId: true, unlockedAt: true },
      }),
      this.buildSnapshot(userId),
    ]);

    const unlockedMap = new Map(unlocks.map((u) => [u.badgeId, u.unlockedAt]));
    const newlyUnlocked: { badgeId: string; code: string; name: string; tone: string; tier: string; icon: string; reward: any }[] = [];

    const items = badges.map((b) => {
      const already = unlockedMap.get(b.id);
      const { progress, current, target } = this.evaluate(b as unknown as BadgeRule, snap);
      const justMet = !already && progress >= 1;

      if (justMet) {
        newlyUnlocked.push({
          badgeId: b.id,
          code: b.code,
          name: b.name,
          tone: b.tone,
          tier: b.tier,
          icon: b.icon,
          reward: b.reward,
        });
      }

      return {
        id: b.id,
        code: b.code,
        name: b.name,
        description: b.description,
        icon: b.icon,
        tone: b.tone,
        tier: b.tier,
        category: b.category,
        sortOrder: b.sortOrder,
        unlocked: !!already || justMet,
        unlockedAt: already ?? (justMet ? new Date() : null),
        progress: Math.max(0, Math.min(1, progress)),
        current,
        target,
        reward: b.reward,
      };
    });

    // Persist newly-unlocked badges + emit events. We do this AFTER
    // shaping the response so the call is still fast on the happy path.
    if (newlyUnlocked.length) {
      await this.persistUnlocks(userId, newlyUnlocked);
    }

    const summary = {
      total: items.length,
      unlocked: items.filter((b) => b.unlocked).length,
      newlyUnlocked: newlyUnlocked.map((b) => b.code),
    };

    return { data: { items, summary } };
  }

  // Side-effecting persistence step; failures are logged but don't break
  // the read response (we'd rather show stale "newly unlocked" state once
  // than 500 the dashboard).
  private async persistUnlocks(
    userId: string,
    badges: { badgeId: string; code: string; name: string; tone: string; tier: string; icon: string; reward: any }[],
  ) {
    for (const b of badges) {
      try {
        const created = await this.prisma.userBadge.upsert({
          where: { userId_badgeId: { userId, badgeId: b.badgeId } },
          create: { userId, badgeId: b.badgeId },
          update: {}, // no-op if already present (race-safe)
          select: { unlockedAt: true },
        });

        this.eventBus.emit({
          type: 'BADGE_UNLOCKED',
          userId,
          refType: 'Badge',
          refId: b.badgeId,
          payload: {
            badgeCode: b.code,
            badgeName: b.name,
            badgeDescription: `Tier: ${b.tier}`,
            icon: b.icon,
            tone: b.tone,
          },
        });
        void created;

        // Optional reward — only paid when explicitly configured. Tokens
        // are the only reward we wire today; admins can extend later.
        const tokenReward = (b.reward as any)?.tokens;
        if (typeof tokenReward === 'number' && tokenReward > 0) {
          await this.tokens.creditTokens(
            userId,
            tokenReward,
            'ADMIN_CREDIT',
            `badge-${b.code}`,
            `Badge unlocked: ${b.name}`,
          );
        }
      } catch (err) {
        this.logger.warn(
          `Failed to persist badge unlock for user=${userId} badge=${b.code}: ${(err as Error).message}`,
        );
      }
    }
  }

  // ── Snapshot — single aggregation of every input the rules need ───
  private async buildSnapshot(userId: string): Promise<UserSnapshot> {
    const [user, attempts, classScope, tokenLedger] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { class: true, longestStreak: true },
      }),
      this.prisma.quizAttempt.findMany({
        where: { studentId: userId, status: 'COMPLETED' },
        select: {
          quizSubject: true,
          percentage: true,
          correctCount: true,
          incorrectCount: true,
          questionResults: true,
        },
      }),
      // Best class-cohort rank ever recorded. Falls back to current rank
      // if no snapshot history exists yet.
      (async () => {
        const u = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { class: true },
        });
        if (!u?.class) return null;
        const scope = await this.prisma.rankingScope.findUnique({
          where: { kind_key: { kind: 'CLASS_GLOBAL', key: u.class } },
          select: { id: true },
        });
        if (!scope) return null;
        const [snap, current] = await Promise.all([
          this.prisma.rankingSnapshot.aggregate({
            where: { scopeId: scope.id, userId },
            _min: { rank: true },
          }),
          this.prisma.rankingScore.findUnique({
            where: { scopeId_userId: { scopeId: scope.id, userId } },
            select: { rank: true },
          }),
        ]);
        const candidates = [snap._min.rank, current?.rank].filter(
          (r): r is number => typeof r === 'number',
        );
        return candidates.length ? Math.min(...candidates) : null;
      })(),
      // Tokens credited (sum of positive transactions) — proxy for
      // "tokens earned" rather than "balance".
      this.prisma.tokenTransaction.aggregate({
        where: { userId, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
    ]);

    let questionsAnswered = 0;
    let totalCorrect = 0;
    let perfectQuizzes = 0;
    const bySubject: Record<string, { questions: number; correct: number; accuracy: number }> = {};

    for (const a of attempts) {
      questionsAnswered += a.correctCount + a.incorrectCount;
      totalCorrect += a.correctCount;
      if (a.percentage >= 100) perfectQuizzes++;

      const subj = a.quizSubject || 'General';
      if (!bySubject[subj]) bySubject[subj] = { questions: 0, correct: 0, accuracy: 0 };

      const results = a.questionResults as any[];
      if (Array.isArray(results)) {
        for (const r of results) {
          const s = r.subject || subj;
          if (!bySubject[s]) bySubject[s] = { questions: 0, correct: 0, accuracy: 0 };
          bySubject[s].questions++;
          if (r.correct) bySubject[s].correct++;
        }
      } else {
        bySubject[subj].questions += a.correctCount + a.incorrectCount;
        bySubject[subj].correct += a.correctCount;
      }
    }
    for (const s of Object.values(bySubject)) {
      s.accuracy = s.questions > 0 ? Math.round((s.correct / s.questions) * 100) : 0;
    }

    return {
      quizzesCompleted: attempts.length,
      questionsAnswered,
      perfectQuizzes,
      longestStreak: user?.longestStreak ?? 0,
      overallAccuracy:
        questionsAnswered > 0 ? Math.round((totalCorrect / questionsAnswered) * 100) : 0,
      bySubject,
      bestClassRank: classScope,
      tokensEarned: tokenLedger._sum.amount ?? 0,
    };
  }

  // ── Rule dispatch ────────────────────────────────────────────────
  // Returns the user's progress against the badge's target so the UI can
  // render "17 / 30" labels for not-yet-unlocked ones.
  private evaluate(
    rule: BadgeRule,
    snap: UserSnapshot,
  ): { progress: number; current: number; target: number } {
    const cfg = rule.ruleConfig ?? {};
    switch (rule.ruleType) {
      case 'quiz-count': {
        const target = Number(cfg.count) || 1;
        return { progress: snap.quizzesCompleted / target, current: snap.quizzesCompleted, target };
      }
      case 'questions-answered': {
        const target = Number(cfg.count) || 1;
        return { progress: snap.questionsAnswered / target, current: snap.questionsAnswered, target };
      }
      case 'perfect-quiz': {
        const target = Number(cfg.count) || 1;
        return { progress: snap.perfectQuizzes / target, current: snap.perfectQuizzes, target };
      }
      case 'streak': {
        const target = Number(cfg.days) || 1;
        return { progress: snap.longestStreak / target, current: snap.longestStreak, target };
      }
      case 'accuracy-overall': {
        const minQuizzes = Number(cfg.minQuizzes) || 1;
        const minAccuracy = Number(cfg.minAccuracy) || 80;
        // We treat accuracy badges as "met when the floor is cleared
        // AND there's enough sample size". Progress reflects the closer
        // of the two — whichever is further from the goal.
        const accProgress = snap.overallAccuracy / minAccuracy;
        const sampleProgress = snap.quizzesCompleted / minQuizzes;
        return {
          progress: Math.min(accProgress, sampleProgress),
          current: snap.overallAccuracy,
          target: minAccuracy,
        };
      }
      case 'subject-accuracy': {
        const match = (cfg.subjectMatch as string) ?? '';
        const minQ = Number(cfg.minQuestions) || 1;
        const minAcc = Number(cfg.minAccuracy) || 80;
        const re = new RegExp(match, 'i');
        // Pick the matching subject with the most data.
        const candidates = Object.entries(snap.bySubject)
          .filter(([s]) => re.test(s))
          .sort((a, b) => b[1].questions - a[1].questions);
        const subj = candidates[0]?.[1] ?? { questions: 0, accuracy: 0 } as any;
        const qProgress = subj.questions / minQ;
        const aProgress = subj.accuracy / minAcc;
        return {
          progress: Math.min(qProgress, aProgress),
          current: subj.accuracy,
          target: minAcc,
        };
      }
      case 'rank-milestone': {
        const topN = Number(cfg.topN) || 100;
        if (snap.bestClassRank == null) return { progress: 0, current: 0, target: topN };
        // Closer-to-top = more progress. Progress=1 when bestRank ≤ topN.
        const progress = snap.bestClassRank <= topN
          ? 1
          : Math.max(0, 1 - (snap.bestClassRank - topN) / Math.max(topN, 1));
        return { progress, current: snap.bestClassRank, target: topN };
      }
      case 'tokens-earned': {
        const target = Number(cfg.count) || 1;
        return { progress: snap.tokensEarned / target, current: snap.tokensEarned, target };
      }
      default:
        return { progress: 0, current: 0, target: 0 };
    }
  }
}
