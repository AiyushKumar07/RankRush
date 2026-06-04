import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENT_CHANNEL } from '../events/domain-events.js';
import type { DomainEvent } from '../events/domain-events.js';
import { NotificationsService } from './notifications.service.js';

// Translates user-facing domain events into bell-feed notifications.
// Lives alongside ActivityEventProjector — same pattern, different
// read-model. We deliberately handle only events the candidate would
// care about in their notification tray (not every internal event).
//
// Filtered out on purpose:
//   - QUIZ_STARTED / QUIZ_ABANDONED — internal state, not user-facing
//   - TOKEN_DEBITED — they just spent tokens, no surprise to surface
//   - STREAK_DAY — too noisy; only milestones get a notification
@Injectable()
export class NotificationProjector {
  private readonly logger = new Logger(NotificationProjector.name);

  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(DOMAIN_EVENT_CHANNEL, { async: true, promisify: true })
  async handle(event: DomainEvent): Promise<void> {
    try {
      const built = this.build(event);
      if (!built) return;
      await this.notifications.create({
        userId: event.userId,
        type: built.type,
        title: built.title,
        body: built.body,
        link: built.link,
        meta: { eventType: event.type, ...(event.payload as any) },
      });
    } catch (err: any) {
      this.logger.warn(
        `Notification projector failed for ${event.type}: ${err?.message}`,
      );
    }
  }

  // Returns null for events we don't want to surface as a notification.
  private build(event: DomainEvent): {
    type: string;
    title: string;
    body?: string;
    link?: string;
  } | null {
    const p = (event.payload as any) || {};
    switch (event.type) {
      case 'QUIZ_COMPLETED': {
        const pct = typeof p.percentage === 'number' ? Math.round(p.percentage) : null;
        const title = pct != null
          ? `Quiz scored ${pct}%`
          : 'Quiz completed';
        const body = p.quizTitle
          ? `${p.quizTitle}${p.correctCount != null && p.totalQuestions != null ? ` · ${p.correctCount}/${p.totalQuestions} correct` : ''}`
          : undefined;
        return {
          type: 'QUIZ_RESULT',
          title,
          body,
          link: p.quizId ? `/app/quizzes/${p.quizId}/result` : '/app/activity',
        };
      }
      case 'RANK_CHANGED': {
        const delta = typeof p.delta === 'number' ? p.delta : null;
        if (delta == null || delta === 0) return null;
        // Negative delta = climbed up the leaderboard (lower rank = better).
        const climbed = delta < 0;
        const absDelta = Math.abs(delta);
        return {
          type: 'RANK_MOVEMENT',
          title: climbed ? `You climbed ${absDelta} rank${absDelta === 1 ? '' : 's'}` : `You dropped ${absDelta} rank${absDelta === 1 ? '' : 's'}`,
          body: p.newRank != null ? `Now at rank #${p.newRank}` : undefined,
          link: '/app/leaderboards',
        };
      }
      case 'TOKEN_CREDITED':
      case 'TOKEN_PURCHASED': {
        const amount = typeof p.amount === 'number' ? p.amount : null;
        if (amount == null) return null;
        return {
          type: 'TOKEN_CREDIT',
          title: `+${amount} token${amount === 1 ? '' : 's'} added`,
          body: p.description || (event.type === 'TOKEN_PURCHASED' ? 'Wallet topped up' : 'Tokens credited to your wallet'),
          link: '/app/tokens',
        };
      }
      case 'BADGE_UNLOCKED': {
        return {
          type: 'BADGE_EARNED',
          title: `Badge unlocked: ${p.badgeName || p.badgeKey || 'New badge'}`,
          body: p.badgeDescription,
          link: '/app/badges',
        };
      }
      case 'STREAK_MILESTONE': {
        const days = typeof p.streak === 'number' ? p.streak : null;
        return {
          type: 'STREAK_MILESTONE',
          title: days ? `${days}-day streak!` : 'Streak milestone',
          body: p.bonusTokens
            ? `Bonus +${p.bonusTokens} token${p.bonusTokens === 1 ? '' : 's'} for keeping the flame alive.`
            : 'Keep going to compound your bonuses.',
          link: '/app/tokens',
        };
      }
      case 'PLAN_PURCHASED':
      case 'PLAN_CANCELLED':
      case 'PLAN_REFRESHED': {
        const isOneTime = p.cadence === 'ONE_TIME';
        const map = {
          PLAN_PURCHASED: isOneTime
            ? { title: 'Plan unlocked', body: p.planName ? `${p.planName} is now active (lifetime).` : undefined }
            : { title: 'Subscription activated', body: p.planName ? `${p.planName} is now active.` : undefined },
          PLAN_CANCELLED: { title: 'Subscription cancelled', body: 'You can resubscribe any time from the Pricing page.' },
          PLAN_REFRESHED: { title: 'Subscription renewed', body: p.planName ? `${p.planName} renewed for the next cycle.` : undefined },
        } as const;
        const built = map[event.type as keyof typeof map];
        return {
          type: 'SUBSCRIPTION',
          title: built.title,
          body: built.body,
          link: '/app/billing',
        };
      }
      case 'REFERRAL_CONVERTED': {
        return {
          type: 'TOKEN_CREDIT',
          title: 'Referral bonus earned',
          body: p.bonusTokens
            ? `+${p.bonusTokens} tokens added — a friend just upgraded.`
            : 'A friend you referred just upgraded. Tokens credited.',
          link: '/app/refer',
        };
      }
      default:
        return null;
    }
  }
}
