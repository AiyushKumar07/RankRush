import type { Prisma, RankingScope, ScopeKind } from '@prisma/client';

// Turns a RankingScope.kind + cohortFilter into a Prisma User-filter for
// "who is a member of this scope". Used by the recompute job to bound the
// candidate set before scoring.
export function userMembershipFilter(scope: RankingScope): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = { role: 'STUDENT', isActive: true };
  const filter = (scope.cohortFilter ?? {}) as {
    class?: string[];
    target?: string[];
    stream?: string[];
    cohortId?: string;
  };

  switch (scope.kind as ScopeKind) {
    case 'CLASS_GLOBAL':
      return { ...base, class: scope.key };
    case 'TARGET_EXAM':
      return { ...base, target: { has: scope.key } };
    case 'SUBJECT':
      // SUBJECT scopes don't gate by user profile; membership is implicit
      // via "has ≥ minAttempts in this subject in window". The scorer's
      // eligibleUserIds takes over.
      return base;
    case 'QUIZ':
      // Same — membership is "has ≥1 attempt on this quiz".
      return base;
    case 'COHORT':
      // Future: requires a cohort-membership table. Off-list for now.
      if (filter.cohortId) {
        return { ...base, id: { in: [] } };
      }
      return base;
    case 'EVENT':
      return base;
    default:
      return base;
  }
}

// Builds a Prisma QuizAttempt-filter for attempts that are eligible inputs
// to this scope's scorer. Used by the recompute job to load the input set.
//
// For CLASS_GLOBAL / TARGET_EXAM / SUBJECT we pass the list of *closed*
// rank-rewarding quiz IDs (sum-percentages model — only locked-in quizzes
// contribute to the headline ranks).
//
// For QUIZ we pass an optional `cutoffByQuiz` map so that closed quizzes
// only count attempts that landed inside the live window (completedAt <=
// closedAt). Late attempts on a closed quiz don't move its locked board.
export function attemptInputFilter(
  scope: RankingScope,
  rankRewardingQuizIds: string[] | null,
  cutoff: Date,
  perQuizCutoff?: Date | null,
): Prisma.QuizAttemptWhereInput {
  const where: Prisma.QuizAttemptWhereInput = {
    status: 'COMPLETED',
    completedAt: { gte: cutoff },
  };

  switch (scope.kind as ScopeKind) {
    case 'CLASS_GLOBAL':
    case 'TARGET_EXAM':
      // Only closed rank-rewarding quizzes count toward the headline rank.
      if (!rankRewardingQuizIds || rankRewardingQuizIds.length === 0) {
        return { ...where, quizId: { in: [] } };
      }
      where.quizId = { in: rankRewardingQuizIds };
      break;
    case 'SUBJECT':
      if (!rankRewardingQuizIds || rankRewardingQuizIds.length === 0) {
        return { ...where, quizId: { in: [] } };
      }
      where.quizId = { in: rankRewardingQuizIds };
      where.quizSubject = scope.key;
      break;
    case 'QUIZ':
      where.quizId = scope.key;
      // Once a quiz is closed, freeze the leaderboard at the close time —
      // ignore late attempts so the ranks the user saw at close persist.
      if (perQuizCutoff) {
        where.completedAt = { gte: cutoff, lte: perQuizCutoff };
      }
      break;
    case 'COHORT':
    case 'EVENT':
      // Future scopes — leave the predicate broad and rely on the scorer.
      break;
  }
  return where;
}

// Resolves the scopes that a single completed attempt should mark dirty.
// Used by the RankingProjector on QUIZ_COMPLETED to enqueue recomputes.
export function scopesAffectedByAttempt(args: {
  userClass: string | null;
  userTargets: string[];
  quizSubject: string;
  quizId: string;
  quizRankRewarding: boolean;
}): { kind: ScopeKind; key: string }[] {
  const affected: { kind: ScopeKind; key: string }[] = [];

  // QUIZ scope updates regardless of rank-rewarding flag (the per-quiz
  // leaderboard exists for all quizzes; rankRewarding only gates whether
  // it feeds the headline ranks).
  affected.push({ kind: 'QUIZ', key: args.quizId });

  if (!args.quizRankRewarding) return affected;

  if (args.userClass) {
    affected.push({ kind: 'CLASS_GLOBAL', key: args.userClass });
  }
  for (const target of args.userTargets ?? []) {
    affected.push({ kind: 'TARGET_EXAM', key: target });
  }
  if (args.quizSubject) {
    affected.push({ kind: 'SUBJECT', key: args.quizSubject });
  }
  return affected;
}
