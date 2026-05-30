import type { RankingScope } from '@prisma/client';

// Minimal attempt projection scorers need. Trimmed to what's actually
// used — keeps queries fast and the type surface honest about inputs.
export interface ScorerAttempt {
  attemptId: string;
  userId: string;
  quizId: string;
  quizSubject: string;
  quizDifficulty: string | null;
  percentage: number;
  timeTakenSecs: number;
  completedAt: Date;
}

export interface ScorerInput {
  scope: RankingScope;
  // Pre-filtered to attempts eligible for this scope (rankRewarding + scope predicate).
  attempts: ScorerAttempt[];
  now: Date;
}

export interface ScorerUserResult {
  userId: string;
  score: number;
  tieBreaker?: number;
  attemptsCounted: number;
  meta?: Record<string, unknown>;
}

export interface Scorer {
  readonly key: string;
  computeUserScores(input: ScorerInput): ScorerUserResult[];
  // Each scorer enforces its own eligibility (e.g. WRP wants ≥3 attempts in
  // the window; BestAttempt wants ≥1). Returns the IDs that should appear
  // in the ranked output.
  eligibleUserIds(input: ScorerInput): Set<string>;
}
