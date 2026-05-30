// Centralized queue identifiers so producers and consumers can't drift.
// Phase 1 only registers the names; consumers ship in Phase 2 (ranking) and
// Phase 4 (badge evaluation, period-stats compute).
export const QUEUE = {
  RANKING_RECOMPUTE: 'ranking-recompute',
  RANKING_SNAPSHOT: 'ranking-snapshot',
  BADGE_EVAL: 'badge-eval',
  STATS_ROLLUP: 'stats-rollup',
} as const;

export type QueueName = (typeof QUEUE)[keyof typeof QUEUE];
