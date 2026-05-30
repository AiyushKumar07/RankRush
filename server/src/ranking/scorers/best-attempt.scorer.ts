import { Injectable } from '@nestjs/common';
import type {
  Scorer,
  ScorerInput,
  ScorerUserResult,
} from './scorer.types.js';

// Per-QUIZ scope scorer. A user's score on a quiz is their best percentage;
// tie-break by lowest timeTakenSecs (faster wins ties). First-attempt-only
// is supported via scope.config.firstAttemptOnly = true.
@Injectable()
export class BestAttemptScorer implements Scorer {
  readonly key = 'best-attempt';

  computeUserScores(input: ScorerInput): ScorerUserResult[] {
    const cfg = this.config(input.scope.config);
    const byUser = new Map<string, { best: number; tieBreaker: number; count: number; firstAt: Date }>();

    for (const a of input.attempts) {
      const existing = byUser.get(a.userId);

      if (!existing) {
        byUser.set(a.userId, {
          best: a.percentage,
          tieBreaker: -a.timeTakenSecs,
          count: 1,
          firstAt: a.completedAt,
        });
        continue;
      }

      existing.count += 1;
      // For firstAttemptOnly we only keep the earliest attempt's values.
      if (cfg.firstAttemptOnly) {
        if (a.completedAt < existing.firstAt) {
          existing.best = a.percentage;
          existing.tieBreaker = -a.timeTakenSecs;
          existing.firstAt = a.completedAt;
        }
        continue;
      }

      if (
        a.percentage > existing.best ||
        (a.percentage === existing.best && -a.timeTakenSecs > existing.tieBreaker)
      ) {
        existing.best = a.percentage;
        existing.tieBreaker = -a.timeTakenSecs;
      }
    }

    const out: ScorerUserResult[] = [];
    for (const [userId, agg] of byUser) {
      out.push({
        userId,
        score: agg.best,
        tieBreaker: agg.tieBreaker,
        attemptsCounted: agg.count,
      });
    }
    return out;
  }

  eligibleUserIds(input: ScorerInput): Set<string> {
    const ids = new Set<string>();
    for (const a of input.attempts) ids.add(a.userId);
    return ids;
  }

  private config(raw: unknown): { firstAttemptOnly: boolean } {
    const cfg = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return { firstAttemptOnly: cfg.firstAttemptOnly === true };
  }
}
