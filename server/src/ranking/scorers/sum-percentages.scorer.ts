import { Injectable } from '@nestjs/common';
import type {
  Scorer,
  ScorerInput,
  ScorerUserResult,
} from './scorer.types.js';

// CLASS_GLOBAL scorer in the new contest model.
//
//   score(user) = Σ over closed rank-rewarding quizzes that the user attempted, of
//                   bestPercentage(user, quiz)
//
// The "only closed quizzes" gate is enforced upstream by scope-predicates.ts —
// by the time attempts reach this scorer, the input set is already filtered
// to closed-and-rank-rewarding quizzes. This scorer just buckets by quiz and
// keeps the best percentage per (user, quiz).
//
// Tie-breaker: -totalTimeTakenSecs across all counted attempts (faster wins
// ties at the global level). Optional, kept low-priority since identical
// percentage sums on identical quiz sets are rare in practice.
@Injectable()
export class SumPercentagesScorer implements Scorer {
  readonly key = 'sum-percentages';

  computeUserScores(input: ScorerInput): ScorerUserResult[] {
    // Bucket: userId -> quizId -> { bestPct, timeAtBest }
    const byUser = new Map<
      string,
      Map<string, { bestPct: number; timeAtBest: number }>
    >();

    for (const a of input.attempts) {
      let perQuiz = byUser.get(a.userId);
      if (!perQuiz) {
        perQuiz = new Map();
        byUser.set(a.userId, perQuiz);
      }
      const prior = perQuiz.get(a.quizId);
      if (!prior) {
        perQuiz.set(a.quizId, { bestPct: a.percentage, timeAtBest: a.timeTakenSecs });
        continue;
      }
      if (
        a.percentage > prior.bestPct ||
        (a.percentage === prior.bestPct && a.timeTakenSecs < prior.timeAtBest)
      ) {
        perQuiz.set(a.quizId, { bestPct: a.percentage, timeAtBest: a.timeTakenSecs });
      }
    }

    const results: ScorerUserResult[] = [];
    for (const [userId, perQuiz] of byUser) {
      let sumPct = 0;
      let sumTime = 0;
      for (const { bestPct, timeAtBest } of perQuiz.values()) {
        sumPct += bestPct;
        sumTime += timeAtBest;
      }
      results.push({
        userId,
        score: sumPct,
        tieBreaker: -sumTime,
        attemptsCounted: perQuiz.size,   // counts unique closed quizzes, not raw attempts
        meta: { quizzesScored: perQuiz.size, totalTimeSecs: sumTime },
      });
    }
    return results;
  }

  eligibleUserIds(input: ScorerInput): Set<string> {
    // Anyone with at least one attempt on a closed rank-rewarding quiz is
    // ranked. No minimum-attempts floor — every closed quiz contributes.
    const ids = new Set<string>();
    for (const a of input.attempts) ids.add(a.userId);
    return ids;
  }
}
