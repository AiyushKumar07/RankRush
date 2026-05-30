import { Injectable, NotFoundException } from '@nestjs/common';
import { WrpScorer } from './wrp.scorer.js';
import { BestAttemptScorer } from './best-attempt.scorer.js';
import { SumPercentagesScorer } from './sum-percentages.scorer.js';
import type { Scorer } from './scorer.types.js';

// Resolves RankingScope.scorerKey → Scorer impl. Adding a new scorer is:
//   1) implement Scorer
//   2) register it here
//   3) create a RankingScope row with the new scorerKey
@Injectable()
export class ScorerRegistry {
  private readonly map: Map<string, Scorer>;

  constructor(
    wrp: WrpScorer,
    bestAttempt: BestAttemptScorer,
    sumPercentages: SumPercentagesScorer,
  ) {
    this.map = new Map<string, Scorer>([
      [wrp.key, wrp],
      [bestAttempt.key, bestAttempt],
      [sumPercentages.key, sumPercentages],
    ]);
  }

  get(key: string): Scorer {
    const scorer = this.map.get(key);
    if (!scorer) {
      throw new NotFoundException(`No scorer registered for key "${key}"`);
    }
    return scorer;
  }
}
