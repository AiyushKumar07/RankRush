import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  DOMAIN_EVENT_CHANNEL,
  EVENT_META,
} from './domain-events.js';
import type { DomainEvent } from './domain-events.js';

// Subscribes to every domain event and persists an ActivityEvent row. This
// is the read-model for the timeline + stat-strip. Side effects (ranking
// recompute, badge eval) live in separate projectors so failures here
// don't block them and vice-versa.
@Injectable()
export class ActivityEventProjector {
  private readonly logger = new Logger(ActivityEventProjector.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(DOMAIN_EVENT_CHANNEL, { async: true, promisify: true })
  async handle(event: DomainEvent): Promise<void> {
    const meta = EVENT_META[event.type];
    if (!meta) {
      this.logger.warn(`No EVENT_META for event type "${event.type}"`);
      return;
    }

    const rendered = this.render(event);

    try {
      await this.prisma.activityEvent.create({
        data: {
          userId: event.userId,
          type: event.type,
          category: meta.category,
          title: rendered.title,
          meta: rendered.meta,
          icon: rendered.icon ?? meta.icon,
          tone: rendered.tone ?? meta.tone,
          payload: event.payload as any,
          amount: rendered.amount ?? null,
          refType: event.refType ?? null,
          refId: event.refId ?? null,
          occurredAt: event.occurredAt ?? new Date(),
        },
      });
    } catch (err) {
      // Append-only feed should never block a producer. Log and move on.
      this.logger.error(
        `Failed to persist ActivityEvent (${event.type}, user ${event.userId}): ${(err as Error).message}`,
      );
    }
  }

  // Each event type renders to a (title, meta, optional amount) for the
  // timeline UI. amount is a signed scalar used by stat-strip aggregations
  // (token deltas, rank deltas, etc.).
  private render(event: DomainEvent): {
    title: string;
    meta?: string;
    icon?: string;
    tone?: string;
    amount?: number;
  } {
    switch (event.type) {
      case 'QUIZ_COMPLETED': {
        const p = event.payload;
        return {
          title: `${p.quizSubject} · ${p.quizTitle}`,
          meta: `${p.correctCount}/${p.correctCount + p.incorrectCount} correct · ${Math.round(p.percentage)}% · ${Math.round(p.timeTakenSecs / 60)} min`,
          amount: p.percentage,
        };
      }
      case 'QUIZ_STARTED': {
        const p = event.payload;
        return {
          title: `Started ${p.quizTitle}`,
          meta: p.quizSubject,
        };
      }
      case 'QUIZ_ABANDONED': {
        const p = event.payload;
        return { title: `Abandoned ${p.quizTitle}` };
      }
      case 'RANK_CHANGED': {
        const p = event.payload;
        const direction = p.delta < 0 ? 'Climbed' : 'Dropped';
        const places = Math.abs(p.delta);
        return {
          title: `${direction} ${places} rank${places === 1 ? '' : 's'} · now #${p.toRank}`,
          meta: `${p.scopeDisplayName}${p.fromRank ? ` · #${p.fromRank} → #${p.toRank}` : ''}`,
          amount: -p.delta, // positive amount = climbed up (UI shows +N)
        };
      }
      case 'TOKEN_CREDITED': {
        const p = event.payload;
        return {
          title: p.description ?? `+${p.amount} token${p.amount === 1 ? '' : 's'}`,
          meta: `Wallet: ${p.balanceAfter - p.amount} → ${p.balanceAfter}`,
          amount: p.amount,
        };
      }
      case 'TOKEN_DEBITED': {
        const p = event.payload;
        return {
          title: p.description ?? `Spent ${p.amount} token${p.amount === 1 ? '' : 's'}`,
          meta: `Wallet: ${p.balanceAfter + p.amount} → ${p.balanceAfter}`,
          amount: -p.amount,
        };
      }
      case 'TOKEN_PURCHASED': {
        const p = event.payload;
        return {
          title: `Bought ${p.amount} tokens`,
          meta: `${p.currency} ${p.pricePaid}${p.planName ? ` · ${p.planName}` : ''}`,
          amount: p.amount,
        };
      }
      case 'BADGE_UNLOCKED': {
        const p = event.payload;
        return {
          title: `Badge unlocked · ${p.badgeName}`,
          meta: p.badgeDescription,
        };
      }
      case 'STREAK_DAY': {
        const p = event.payload;
        return {
          title: `Daily login · ${p.newStreak}-day streak`,
          meta: `+${p.xpGained} XP`,
        };
      }
      case 'STREAK_MILESTONE': {
        const p = event.payload;
        return {
          title: `${p.milestoneDay}-day streak bonus!`,
          meta: `+${p.tokensAwarded} quiz token`,
          amount: p.tokensAwarded,
        };
      }
      case 'STREAK_BROKEN': {
        const p = event.payload;
        return {
          title: 'Streak broken',
          meta: `${p.previousStreak} days · ${p.daysGap} day gap`,
        };
      }
      case 'PLAN_PURCHASED': {
        const p = event.payload;
        const isOneTime = p.cadence === 'ONE_TIME';
        return {
          title: isOneTime ? `Unlocked ${p.planName} (lifetime)` : `Upgraded to ${p.planName}`,
          meta: `${p.currency} ${p.amountPaid} · ${isOneTime ? 'lifetime' : p.cadence.toLowerCase()} · +${p.tokensCredited} tokens`,
          amount: p.tokensCredited,
        };
      }
      case 'PLAN_CANCELLED': {
        const p = event.payload;
        return {
          title: `Cancelled ${p.planName}`,
          meta: `Access until ${new Date(p.endDate).toLocaleDateString('en-IN')}`,
        };
      }
      case 'PLAN_REFRESHED': {
        const p = event.payload;
        return {
          title: `${p.planName} refresh · +${p.tokensCredited} tokens`,
          meta: `Wallet: ${p.balanceAfter}`,
          amount: p.tokensCredited,
        };
      }
      case 'REFERRAL_CONVERTED': {
        const p = event.payload;
        return {
          title: `${p.referredUserName} upgraded to ${p.planName} via your link`,
          meta: `+${p.tokensAwarded} tokens · ${p.conversionCount} referral${p.conversionCount === 1 ? '' : 's'} converted`,
          amount: p.tokensAwarded,
        };
      }
      case 'PROFILE_UPDATED': {
        const p = event.payload;
        return {
          title: 'Profile updated',
          meta: p.fieldsChanged.join(', '),
        };
      }
      case 'ACCOUNT_CREATED': {
        const p = event.payload;
        return {
          title: 'Welcome to RankRush',
          meta: p.referredBy ? `Referred by ${p.referredBy}` : `Signed up via ${p.source.toLowerCase()}`,
        };
      }
      default: {
        // Exhaustiveness check — adding a new ActivityEventType without a
        // matching case here will fail to compile.
        const _exhaustive: never = event;
        void _exhaustive;
        return { title: 'Activity' };
      }
    }
  }
}
