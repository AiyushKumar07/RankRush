// Shared seed for the three default plans (Free / Starter / Pro).
// Used by:
//   - SubscriptionsService.seedDefaultPlans (auto-seed when DB is empty)
//   - src/scripts/seed-plans.ts (standalone reset script)
import { Cadence, FeatureValueType } from '@prisma/client';

export type DefaultPricingSeed = {
  cadence: Cadence;
  price: number;
  originalPrice?: number | null;
  tokenCount: number;
  tokenPeriodLabel?: string | null;
  note?: string | null;
  isActive?: boolean;
};

export type DefaultFeatureSeed = {
  sectionKey: string;
  sectionLabel: string;
  label: string;
  valueType: FeatureValueType;
  value?: string | null;
  included?: boolean;
  showOnCard?: boolean;
  showInCompare?: boolean;
  isComingSoon?: boolean;
  entitlementKey?: string | null;
  sortOrder?: number;
};

export type DefaultPlanSeed = {
  sortOrder: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  badge?: string | null;
  ctaLabel?: string | null;
  ctaVariant?: string | null;
  isFree?: boolean;
  isPopular?: boolean;
  isActive?: boolean;
  pricings: DefaultPricingSeed[];
  features: DefaultFeatureSeed[];
};

const SECTIONS = {
  tokens:   { key: 'tokens-quizzes', label: 'Tokens & quizzes' },
  insights: { key: 'insights',       label: 'Insights' },
  collab:   { key: 'collaboration',  label: 'Collaboration' },
  support:  { key: 'support',        label: 'Support' },
};

export const DEFAULT_PLAN_SEEDS: DefaultPlanSeed[] = [
  {
    sortOrder: 0,
    name: 'Free',
    description: 'For dipping a toe in. No card needed.',
    icon: 'leaf',
    ctaLabel: null,
    ctaVariant: 'secondary',
    isFree: true,
    pricings: [
      {
        cadence: Cadence.MONTHLY,
        price: 0,
        tokenCount: 2,
        tokenPeriodLabel: 'per month',
        note: 'Renews monthly',
      },
    ],
    features: [
      { sectionKey: SECTIONS.tokens.key,   sectionLabel: SECTIONS.tokens.label,   label: 'Monthly token allowance',        valueType: FeatureValueType.NUMBER, value: '2',           showOnCard: false, sortOrder: 0 },
      { sectionKey: SECTIONS.tokens.key,   sectionLabel: SECTIONS.tokens.label,   label: 'Quiz library access',            valueType: FeatureValueType.TEXT,   value: '147 quizzes', showOnCard: true,  sortOrder: 1 },
      { sectionKey: SECTIONS.tokens.key,   sectionLabel: SECTIONS.tokens.label,   label: 'Previous-year papers',           valueType: FeatureValueType.CROSS,  included: false,      showOnCard: true,  entitlementKey: 'PYQ_ACCESS',           sortOrder: 2 },
      { sectionKey: SECTIONS.tokens.key,   sectionLabel: SECTIONS.tokens.label,   label: 'Full-length mock tests (3 tokens each)', valueType: FeatureValueType.CROSS, included: false, showOnCard: false, entitlementKey: 'MOCK_TESTS',           sortOrder: 3 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Live leaderboards & rank bar',   valueType: FeatureValueType.CHECK,  showOnCard: true,  sortOrder: 4 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Streak garden & daily activity', valueType: FeatureValueType.CHECK,  showOnCard: true,  sortOrder: 5 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Topic insights (strong / weak)', valueType: FeatureValueType.TEXT,   value: 'Top 3',       showOnCard: false, entitlementKey: 'TOPIC_INSIGHTS_DEPTH', sortOrder: 6 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Detailed analytics page',        valueType: FeatureValueType.CROSS,  included: false,      showOnCard: false, entitlementKey: 'DETAILED_ANALYTICS',   sortOrder: 7 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Time-per-question analytics',    valueType: FeatureValueType.CROSS,  included: false,      showOnCard: false, entitlementKey: 'TIME_PER_QUESTION',    sortOrder: 8 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Percentile by year/section',     valueType: FeatureValueType.CROSS,  included: false,      showOnCard: false, entitlementKey: 'PERCENTILE_BREAKDOWN', sortOrder: 9 },
      { sectionKey: SECTIONS.collab.key,   sectionLabel: SECTIONS.collab.label,   label: 'Study groups',                   valueType: FeatureValueType.NUMBER, value: '2',           showOnCard: true,  isComingSoon: true, entitlementKey: 'STUDY_GROUPS_MAX',  sortOrder: 10 },
      { sectionKey: SECTIONS.collab.key,   sectionLabel: SECTIONS.collab.label,   label: 'Quiz-from-friend challenges',    valueType: FeatureValueType.CROSS,  included: false,      showOnCard: false, isComingSoon: true, entitlementKey: 'FRIEND_CHALLENGES', sortOrder: 11 },
      { sectionKey: SECTIONS.collab.key,   sectionLabel: SECTIONS.collab.label,   label: 'Chat & live duels',              valueType: FeatureValueType.TEXT,   value: 'Read-only',   showOnCard: false, isComingSoon: true, entitlementKey: 'CHAT_DUELS',        sortOrder: 12 },
      { sectionKey: SECTIONS.support.key,  sectionLabel: SECTIONS.support.label,  label: 'Email support',                  valueType: FeatureValueType.TEXT,   value: '72-hour',     showOnCard: false, sortOrder: 13 },
      { sectionKey: SECTIONS.support.key,  sectionLabel: SECTIONS.support.label,  label: 'Early access to new features',   valueType: FeatureValueType.CROSS,  included: false,      showOnCard: false, entitlementKey: 'EARLY_ACCESS',         sortOrder: 14 },
    ],
  },
  {
    sortOrder: 1,
    name: 'Starter',
    description: 'For weekday-warriors building a habit.',
    icon: 'rocket',
    ctaLabel: 'Upgrade to Starter',
    ctaVariant: 'secondary',
    pricings: [
      { cadence: Cadence.MONTHLY,  price: 99,  tokenCount: 10, tokenPeriodLabel: 'per month',               note: 'Renews monthly' },
      { cadence: Cadence.ANNUAL,   price: 990, originalPrice: 1188, tokenCount: 10, tokenPeriodLabel: 'per month (120 / year)', note: '≈ ₹82.50 / month · 2 months free' },
      { cadence: Cadence.ONE_TIME, price: 149, tokenCount: 10, tokenPeriodLabel: 'once',                    note: 'No subscription · single payment' },
    ],
    features: [
      { sectionKey: SECTIONS.tokens.key,   sectionLabel: SECTIONS.tokens.label,   label: 'Monthly token allowance',        valueType: FeatureValueType.NUMBER, value: '10',          showOnCard: false, sortOrder: 0 },
      { sectionKey: SECTIONS.tokens.key,   sectionLabel: SECTIONS.tokens.label,   label: 'Quiz library access',            valueType: FeatureValueType.TEXT,   value: 'All quizzes', showOnCard: false, sortOrder: 1 },
      { sectionKey: SECTIONS.tokens.key,   sectionLabel: SECTIONS.tokens.label,   label: 'Previous-year papers',           valueType: FeatureValueType.TEXT,   value: 'Last 5 years',showOnCard: true,  entitlementKey: 'PYQ_ACCESS',           sortOrder: 2 },
      { sectionKey: SECTIONS.tokens.key,   sectionLabel: SECTIONS.tokens.label,   label: 'Full-length mock tests (3 tokens each)', valueType: FeatureValueType.CHECK, showOnCard: false, entitlementKey: 'MOCK_TESTS',           sortOrder: 3 },
      { sectionKey: SECTIONS.tokens.key,   sectionLabel: SECTIONS.tokens.label,   label: 'Everything in Free',             valueType: FeatureValueType.CHECK,  showOnCard: true,  showInCompare: false, sortOrder: 4 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Live leaderboards & rank bar',   valueType: FeatureValueType.CHECK,  showOnCard: false, sortOrder: 5 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Streak garden & daily activity', valueType: FeatureValueType.CHECK,  showOnCard: false, sortOrder: 6 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Topic insights (strong / weak)', valueType: FeatureValueType.TEXT,   value: 'Top 10',      showOnCard: false, entitlementKey: 'TOPIC_INSIGHTS_DEPTH', sortOrder: 7 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Detailed analytics page',        valueType: FeatureValueType.CROSS,  included: false,      showOnCard: false, entitlementKey: 'DETAILED_ANALYTICS',   sortOrder: 8 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Weak-topic analytics',           valueType: FeatureValueType.CHECK,  showOnCard: true,  showInCompare: false, sortOrder: 9 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Time-per-question analytics',    valueType: FeatureValueType.CROSS,  included: false,      showOnCard: false, entitlementKey: 'TIME_PER_QUESTION',    sortOrder: 10 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Percentile by year/section',     valueType: FeatureValueType.CROSS,  included: false,      showOnCard: false, entitlementKey: 'PERCENTILE_BREAKDOWN', sortOrder: 11 },
      { sectionKey: SECTIONS.collab.key,   sectionLabel: SECTIONS.collab.label,   label: 'Study groups',                   valueType: FeatureValueType.NUMBER, value: '5',           showOnCard: true,  isComingSoon: true, entitlementKey: 'STUDY_GROUPS_MAX',  sortOrder: 12 },
      { sectionKey: SECTIONS.collab.key,   sectionLabel: SECTIONS.collab.label,   label: 'Quiz-from-friend challenges',    valueType: FeatureValueType.CHECK,  showOnCard: true,  isComingSoon: true, entitlementKey: 'FRIEND_CHALLENGES', sortOrder: 13 },
      { sectionKey: SECTIONS.collab.key,   sectionLabel: SECTIONS.collab.label,   label: 'Chat & live duels',              valueType: FeatureValueType.CHECK,  showOnCard: false, isComingSoon: true, entitlementKey: 'CHAT_DUELS',        sortOrder: 14 },
      { sectionKey: SECTIONS.support.key,  sectionLabel: SECTIONS.support.label,  label: 'Email support',                  valueType: FeatureValueType.TEXT,   value: '24-hour',     showOnCard: false, sortOrder: 15 },
      { sectionKey: SECTIONS.support.key,  sectionLabel: SECTIONS.support.label,  label: 'Early access to new features',   valueType: FeatureValueType.CROSS,  included: false,      showOnCard: false, entitlementKey: 'EARLY_ACCESS',         sortOrder: 16 },
    ],
  },
  {
    sortOrder: 2,
    name: 'Pro',
    description: "For students who don't want to count tokens.",
    icon: 'crown',
    badge: 'Most picked',
    ctaLabel: 'Go Pro',
    ctaVariant: 'lime',
    isPopular: true,
    pricings: [
      { cadence: Cadence.MONTHLY,  price: 299,  tokenCount: 50, tokenPeriodLabel: 'per month',                note: 'Renews monthly' },
      { cadence: Cadence.ANNUAL,   price: 2990, originalPrice: 3588, tokenCount: 50, tokenPeriodLabel: 'per month (600 / year)', note: '≈ ₹249 / month · 2 months free' },
      { cadence: Cadence.ONE_TIME, price: 499,  tokenCount: 50, tokenPeriodLabel: 'once',                     note: 'No subscription · single payment' },
    ],
    features: [
      { sectionKey: SECTIONS.tokens.key,   sectionLabel: SECTIONS.tokens.label,   label: 'Monthly token allowance',        valueType: FeatureValueType.NUMBER, value: '50',          showOnCard: false, sortOrder: 0 },
      { sectionKey: SECTIONS.tokens.key,   sectionLabel: SECTIONS.tokens.label,   label: 'Quiz library access',            valueType: FeatureValueType.TEXT,   value: 'All quizzes', showOnCard: false, sortOrder: 1 },
      { sectionKey: SECTIONS.tokens.key,   sectionLabel: SECTIONS.tokens.label,   label: 'Previous-year papers',           valueType: FeatureValueType.TEXT,   value: 'All years',   showOnCard: false, entitlementKey: 'PYQ_ACCESS',           sortOrder: 2 },
      { sectionKey: SECTIONS.tokens.key,   sectionLabel: SECTIONS.tokens.label,   label: 'Full-length mock tests (3 tokens each)', valueType: FeatureValueType.CHECK, showOnCard: true, entitlementKey: 'MOCK_TESTS',           sortOrder: 3 },
      { sectionKey: SECTIONS.tokens.key,   sectionLabel: SECTIONS.tokens.label,   label: 'Everything in Starter',          valueType: FeatureValueType.CHECK,  showOnCard: true,  showInCompare: false, sortOrder: 4 },
      { sectionKey: SECTIONS.tokens.key,   sectionLabel: SECTIONS.tokens.label,   label: 'All previous-year papers, every year', valueType: FeatureValueType.CHECK, showOnCard: true, showInCompare: false, sortOrder: 5 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Live leaderboards & rank bar',   valueType: FeatureValueType.CHECK,  showOnCard: false, sortOrder: 6 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Streak garden & daily activity', valueType: FeatureValueType.CHECK,  showOnCard: false, sortOrder: 7 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Topic insights (strong / weak)', valueType: FeatureValueType.TEXT,   value: 'Full breakdown', showOnCard: false, entitlementKey: 'TOPIC_INSIGHTS_DEPTH', sortOrder: 8 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Detailed analytics page',        valueType: FeatureValueType.CHECK,  showOnCard: true,  entitlementKey: 'DETAILED_ANALYTICS',   sortOrder: 9 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Advanced analytics — weak topics, time-per-Q, percentile breakdowns', valueType: FeatureValueType.CHECK, showOnCard: true, showInCompare: false, sortOrder: 10 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Time-per-question analytics',    valueType: FeatureValueType.CHECK,  showOnCard: false, entitlementKey: 'TIME_PER_QUESTION',    sortOrder: 11 },
      { sectionKey: SECTIONS.insights.key, sectionLabel: SECTIONS.insights.label, label: 'Percentile by year/section',     valueType: FeatureValueType.CHECK,  showOnCard: false, entitlementKey: 'PERCENTILE_BREAKDOWN', sortOrder: 12 },
      { sectionKey: SECTIONS.collab.key,   sectionLabel: SECTIONS.collab.label,   label: 'Study groups',                   valueType: FeatureValueType.TEXT,   value: 'Unlimited',   showOnCard: true,  isComingSoon: true, entitlementKey: 'STUDY_GROUPS_MAX',  sortOrder: 13 },
      { sectionKey: SECTIONS.collab.key,   sectionLabel: SECTIONS.collab.label,   label: 'Quiz-from-friend challenges',    valueType: FeatureValueType.CHECK,  showOnCard: false, isComingSoon: true, entitlementKey: 'FRIEND_CHALLENGES', sortOrder: 14 },
      { sectionKey: SECTIONS.collab.key,   sectionLabel: SECTIONS.collab.label,   label: 'Chat & live duels',              valueType: FeatureValueType.CHECK,  showOnCard: false, isComingSoon: true, entitlementKey: 'CHAT_DUELS',        sortOrder: 15 },
      { sectionKey: SECTIONS.support.key,  sectionLabel: SECTIONS.support.label,  label: 'Email support',                  valueType: FeatureValueType.TEXT,   value: 'Priority · 4-hour', showOnCard: false, sortOrder: 16 },
      { sectionKey: SECTIONS.support.key,  sectionLabel: SECTIONS.support.label,  label: 'Priority support & early features', valueType: FeatureValueType.CHECK, showOnCard: true, showInCompare: false, sortOrder: 16 },
      { sectionKey: SECTIONS.support.key,  sectionLabel: SECTIONS.support.label,  label: 'Early access to new features',   valueType: FeatureValueType.CHECK,  showOnCard: false, entitlementKey: 'EARLY_ACCESS',         sortOrder: 17 },
    ],
  },
];
