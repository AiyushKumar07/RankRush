import { Injectable } from '@nestjs/common';
import type {
  Scorer,
  ScorerInput,
  ScorerUserResult,
  ScorerAttempt,
} from './scorer.types.js';

// Weighted Recent Performance — the headline scorer used by CLASS_GLOBAL,
// TARGET_EXAM, and SUBJECT scopes.
//
//   score(user) = Σ over eligible attempts of
//                   percentage × difficultyWeight × recencyWeight
//
// difficultyWeight is multiplicative (HARD attempts count more), recency is
// exponential decay so old attempts gracefully fade out — no manual reset
// needed. Tunable per-scope via RankingScope.config.
@Injectable()
export class WrpScorer implements Scorer {
  readonly key = 'wrp';

  private static readonly DIFFICULTY_WEIGHT: Record<string, number> = {
    EASY: 0.8,
    MEDIUM: 1.0,
    HARD: 1.3,
  };

  private static readonly DEFAULT_CONFIG = {
    halflifeDays: 14,    // attempt's recency weight halves every 2 weeks
    windowDays: 60,      // attempts older than this contribute zero (cutoff)
    minAttempts: 3,      // user must have ≥ this many in-window attempts
  };

  computeUserScores(input: ScorerInput): ScorerUserResult[] {
    const config = this.config(input.scope.config);
    const eligible = this.eligibleUserIds(input);

    const byUser = new Map<string, ScorerAttempt[]>();
    for (const a of input.attempts) {
      if (!eligible.has(a.userId)) continue;
      const ageDays = (input.now.getTime() - a.completedAt.getTime()) / 86_400_000;
      if (ageDays > config.windowDays) continue;
      (byUser.get(a.userId) ?? byUser.set(a.userId, []).get(a.userId)!).push(a);
    }

    const results: ScorerUserResult[] = [];
    for (const [userId, attempts] of byUser) {
      let score = 0;
      for (const a of attempts) {
        const ageDays = (input.now.getTime() - a.completedAt.getTime()) / 86_400_000;
        const recency = Math.exp(-(ageDays / config.halflifeDays) * Math.LN2);
        const dWeight = WrpScorer.DIFFICULTY_WEIGHT[a.quizDifficulty ?? 'MEDIUM'] ?? 1.0;
        score += a.percentage * dWeight * recency;
      }
      results.push({
        userId,
        score,
        attemptsCounted: attempts.length,
        meta: { halflifeDays: config.halflifeDays, windowDays: config.windowDays },
      });
    }
    return results;
  }

  eligibleUserIds(input: ScorerInput): Set<string> {
    const config = this.config(input.scope.config);
    const inWindow = new Map<string, number>();
    for (const a of input.attempts) {
      const ageDays = (input.now.getTime() - a.completedAt.getTime()) / 86_400_000;
      if (ageDays > config.windowDays) continue;
      inWindow.set(a.userId, (inWindow.get(a.userId) ?? 0) + 1);
    }
    const eligible = new Set<string>();
    for (const [userId, n] of inWindow) {
      if (n >= config.minAttempts) eligible.add(userId);
    }
    return eligible;
  }

  private config(raw: unknown): { halflifeDays: number; windowDays: number; minAttempts: number } {
    const cfg = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return {
      halflifeDays: Number(cfg.halflifeDays ?? WrpScorer.DEFAULT_CONFIG.halflifeDays),
      windowDays: Number(cfg.windowDays ?? WrpScorer.DEFAULT_CONFIG.windowDays),
      minAttempts: Number(cfg.minAttempts ?? WrpScorer.DEFAULT_CONFIG.minAttempts),
    };
  }
}
