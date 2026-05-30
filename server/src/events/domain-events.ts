import { ActivityCategory, ActivityEventType } from '@prisma/client';

// ─── Per-event-type payload shapes ───────────────────────────────────
// Each emitted event carries a typed payload. The ActivityEventProjector
// translates these into ActivityEvent rows; ranking/badge projectors read
// the same payload for downstream effects.

export interface QuizCompletedPayload {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  quizSubject: string;
  score: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  timeTakenSecs: number;
  tokenCost: number;
  rankRewarding: boolean;
}

export interface QuizStartedPayload {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  quizSubject: string;
}

export interface QuizAbandonedPayload {
  attemptId: string;
  quizId: string;
  quizTitle: string;
}

export interface RankChangedPayload {
  scopeKind: string;
  scopeKey: string;
  scopeDisplayName: string;
  fromRank: number | null;
  toRank: number;
  delta: number;
}

export interface TokenCreditedPayload {
  amount: number;
  source: string;            // 'PURCHASE' | 'REFERRAL_BONUS' | 'SUBSCRIPTION_REFRESH' | 'ADMIN_CREDIT' | 'REFUND'
  balanceAfter: number;
  description?: string;
  referenceId?: string;
}

export interface TokenDebitedPayload {
  amount: number;
  reason: string;            // typically 'QUIZ_CONSUMED'
  balanceAfter: number;
  description?: string;
  referenceId?: string;
}

export interface TokenPurchasedPayload {
  amount: number;
  pricePaid: number;
  currency: string;
  balanceAfter: number;
  planId?: string;
  planName?: string;
}

export interface BadgeUnlockedPayload {
  badgeCode: string;
  badgeName: string;
  badgeDescription: string;
  icon: string;
  tone: string;
}

export interface StreakDayPayload {
  newStreak: number;
  xpGained: number;
}

export interface StreakMilestonePayload {
  milestoneDay: number;       // 7, 14, 21, ...
  tokensAwarded: number;      // currently always 1
}

export interface StreakBrokenPayload {
  previousStreak: number;
  daysGap: number;
}

export interface PlanPurchasedPayload {
  subscriptionId: string;
  planId: string;
  planName: string;
  pricingId: string;
  cadence: string;
  amountPaid: number;
  currency: string;
  tokensCredited: number;
}

export interface PlanCancelledPayload {
  subscriptionId: string;
  planName: string;
  endDate: Date | string;
}

export interface PlanRefreshedPayload {
  subscriptionId: string;
  planName: string;
  tokensCredited: number;
  balanceAfter: number;
  nextRefreshDate: Date | string | null;
}

export interface ReferralConvertedPayload {
  referredUserId: string;
  referredUserName: string;
  planName: string;
  tokensAwarded: number;
  conversionCount: number;
}

export interface ProfileUpdatedPayload {
  fieldsChanged: string[];
}

export interface AccountCreatedPayload {
  source: string;             // 'EMAIL' | 'GOOGLE' | 'REFERRAL'
  referredBy?: string;
}

// ─── Discriminated union of all domain events ────────────────────────
// Each event ties an ActivityEventType to its payload shape. Producers
// build a DomainEvent and hand it to EventBusService; consumers narrow
// on `type` and get a typed `payload`.

interface BaseDomainEvent<T extends ActivityEventType, P> {
  type: T;
  userId: string;
  payload: P;
  occurredAt?: Date;
  // Optional pointer back to source entity for the ActivityEvent row.
  refType?: string;
  refId?: string;
}

export type DomainEvent =
  | BaseDomainEvent<'QUIZ_STARTED', QuizStartedPayload>
  | BaseDomainEvent<'QUIZ_COMPLETED', QuizCompletedPayload>
  | BaseDomainEvent<'QUIZ_ABANDONED', QuizAbandonedPayload>
  | BaseDomainEvent<'RANK_CHANGED', RankChangedPayload>
  | BaseDomainEvent<'TOKEN_CREDITED', TokenCreditedPayload>
  | BaseDomainEvent<'TOKEN_DEBITED', TokenDebitedPayload>
  | BaseDomainEvent<'TOKEN_PURCHASED', TokenPurchasedPayload>
  | BaseDomainEvent<'BADGE_UNLOCKED', BadgeUnlockedPayload>
  | BaseDomainEvent<'STREAK_DAY', StreakDayPayload>
  | BaseDomainEvent<'STREAK_MILESTONE', StreakMilestonePayload>
  | BaseDomainEvent<'STREAK_BROKEN', StreakBrokenPayload>
  | BaseDomainEvent<'PLAN_PURCHASED', PlanPurchasedPayload>
  | BaseDomainEvent<'PLAN_CANCELLED', PlanCancelledPayload>
  | BaseDomainEvent<'PLAN_REFRESHED', PlanRefreshedPayload>
  | BaseDomainEvent<'REFERRAL_CONVERTED', ReferralConvertedPayload>
  | BaseDomainEvent<'PROFILE_UPDATED', ProfileUpdatedPayload>
  | BaseDomainEvent<'ACCOUNT_CREATED', AccountCreatedPayload>;

// EventEmitter2 event name. We use a single channel and discriminate on
// `event.type` inside listeners so wildcard subscribers (the activity
// projector) can see everything without re-binding per type.
export const DOMAIN_EVENT_CHANNEL = 'rr.domain';

// ─── Static rendering metadata ───────────────────────────────────────
// Maps each event type to the category + default icon/tone used by the
// timeline. Title/meta strings are produced from the payload by the
// projector (see activity-event.projector.ts).

export const EVENT_META: Record<
  ActivityEventType,
  { category: ActivityCategory; icon: string; tone: string }
> = {
  QUIZ_STARTED:       { category: 'QUIZ',   icon: 'CircleDot',   tone: 'violet'   },
  QUIZ_COMPLETED:     { category: 'QUIZ',   icon: 'CircleCheck', tone: 'emerald'  },
  QUIZ_ABANDONED:     { category: 'QUIZ',   icon: 'CircleSlash', tone: 'neutral'  },
  RANK_CHANGED:       { category: 'RANK',   icon: 'TrendingUp',  tone: 'cyan'     },
  TOKEN_CREDITED:     { category: 'TOKEN',  icon: 'Coins',       tone: 'lime'     },
  TOKEN_DEBITED:      { category: 'TOKEN',  icon: 'Coins',       tone: 'amber'    },
  TOKEN_PURCHASED:    { category: 'TOKEN',  icon: 'ShoppingBag', tone: 'lime'     },
  BADGE_UNLOCKED:     { category: 'BADGE',  icon: 'Medal',       tone: 'amber'    },
  STREAK_DAY:         { category: 'STREAK', icon: 'Flame',       tone: 'orange'   },
  STREAK_MILESTONE:   { category: 'STREAK', icon: 'Flame',       tone: 'amber'    },
  STREAK_BROKEN:      { category: 'STREAK', icon: 'Flame',       tone: 'neutral'  },
  PLAN_PURCHASED:     { category: 'PLAN',   icon: 'Crown',       tone: 'violet'   },
  PLAN_CANCELLED:     { category: 'PLAN',   icon: 'CircleSlash', tone: 'neutral'  },
  PLAN_REFRESHED:     { category: 'PLAN',   icon: 'RefreshCw',   tone: 'cyan'     },
  REFERRAL_CONVERTED: { category: 'SOCIAL', icon: 'Gift',        tone: 'emerald'  },
  PROFILE_UPDATED:    { category: 'SYSTEM', icon: 'Pencil',      tone: 'neutral'  },
  ACCOUNT_CREATED:    { category: 'SYSTEM', icon: 'UserPlus',    tone: 'violet'   },
};
