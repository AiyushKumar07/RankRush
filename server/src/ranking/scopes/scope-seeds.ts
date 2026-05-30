import type { ScopeKind } from '@prisma/client';

// Static seed list for the headline scopes. The seed script (scripts/
// seed-ranking-scopes.ts) reads from here and upserts. Adding a new
// headline leaderboard = add an entry below, re-run the seed.
//
// QUIZ scopes are NOT seeded here — they're created on-demand when a quiz
// flips to rankRewarding (by the ranking service, on event).
//
// As of the contest-model rework: only CLASS_GLOBAL is active. TARGET_EXAM
// and SUBJECT scopes are kept in the seed (so the seed script can prune
// them) but marked isActive=false — they won't be recomputed by the nightly
// cron and won't appear in the user-facing leaderboards list. Bring them
// back by flipping isActive=true here and re-seeding.

export interface ScopeSeed {
  kind: ScopeKind;
  key: string;
  displayName: string;
  scorerKey: string;
  config?: Record<string, unknown>;
  cohortFilter?: Record<string, unknown>;
  isActive?: boolean;
}

const CLASS_VALUES = ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'Dropper'];
const TARGETS = ['JEE', 'NEET', 'Boards'];
const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];

export const SCOPE_SEEDS: ScopeSeed[] = [
  // Headline class-cohort rank. Contest model: sum of best percentages
  // across every CLOSED rank-rewarding quiz the user has attempted.
  ...CLASS_VALUES.map<ScopeSeed>((cls) => ({
    kind: 'CLASS_GLOBAL',
    key: cls,
    displayName: `${cls} · Global rank`,
    scorerKey: 'sum-percentages',
    cohortFilter: { class: [cls] },
    isActive: true,
  })),

  // Deactivated — kept here for completeness; flip isActive=true to re-enable.
  ...TARGETS.map<ScopeSeed>((target) => ({
    kind: 'TARGET_EXAM',
    key: target,
    displayName: `${target} aspirants`,
    scorerKey: 'sum-percentages',
    cohortFilter: { target: [target] },
    isActive: false,
  })),

  ...SUBJECTS.map<ScopeSeed>((sub) => ({
    kind: 'SUBJECT',
    key: sub,
    displayName: `${sub} · Top performers`,
    scorerKey: 'sum-percentages',
    isActive: false,
  })),
];
