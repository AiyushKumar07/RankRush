import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Cadence } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TokensService } from '../tokens/tokens.service';
import { EventBusService } from '../events/event-bus.service.js';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokensService: TokensService,
    private readonly eventBus: EventBusService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleMonthlyTokenRefresh() {
    this.logger.log('Starting daily token refresh check for subscriptions...');

    try {
      const now = new Date();

      // Expire subscriptions past their endDate first — no refresh happens after expiry.
      const expired = await this.prisma.studentSubscription.updateMany({
        where: {
          status: 'ACTIVE',
          endDate: { not: null, lte: now },
        },
        data: { status: 'EXPIRED' },
      });
      if (expired.count > 0) {
        this.logger.log(`Expired ${expired.count} subscriptions past endDate.`);
      }

      // Find all still-active subscriptions due for a token refresh
      // (one-cycle model: MONTHLY plans never refresh — their nextRefreshDate == endDate,
      // so they get expired above before reaching this query. ANNUAL plans refresh monthly
      // until endDate is hit.)
      const dueSubscriptions = await this.prisma.studentSubscription.findMany({
        where: {
          status: 'ACTIVE',
          isAutoRenewEnabled: true,
          cadence: { not: Cadence.ONE_TIME },
          nextRefreshDate: { lte: now },
        },
        include: {
          plan: { include: { pricings: true } },
        },
      });

      if (dueSubscriptions.length === 0) {
        this.logger.log('No subscriptions due for refresh today.');
        return;
      }

      this.logger.log(
        `Found ${dueSubscriptions.length} subscriptions due for refresh.`,
      );

      for (const subscription of dueSubscriptions) {
        try {
          const pricing = subscription.pricingId
            ? subscription.plan.pricings.find((p) => p.id === subscription.pricingId)
            : subscription.plan.pricings.find((p) => p.cadence === subscription.cadence);

          if (!pricing) {
            this.logger.warn(
              `No pricing found for subscription ${subscription.id} (plan=${subscription.plan.name}). Skipping.`,
            );
            continue;
          }

          // 1. Credit the tokens
          const credit = await this.tokensService.creditTokens(
            subscription.userId,
            pricing.tokenCount,
            'SUBSCRIPTION_REFRESH',
            subscription.id,
            `Refresh for ${subscription.plan.name} (${subscription.cadence})`,
          );

          // 2. Always advance by 1 month — annual buys 12 monthly refreshes within endDate.
          const nextDate = new Date(subscription.nextRefreshDate || now);
          nextDate.setMonth(nextDate.getMonth() + 1);

          // 3. Update the subscription record
          await this.prisma.studentSubscription.update({
            where: { id: subscription.id },
            data: { nextRefreshDate: nextDate },
          });

          this.eventBus.emit({
            type: 'PLAN_REFRESHED',
            userId: subscription.userId,
            refType: 'StudentSubscription',
            refId: subscription.id,
            payload: {
              subscriptionId: subscription.id,
              planName: subscription.plan.name,
              tokensCredited: pricing.tokenCount,
              balanceAfter: credit.balance,
              nextRefreshDate: nextDate,
            },
          });

          this.logger.log(
            `Successfully refreshed tokens for user ${subscription.userId} on plan ${subscription.plan.name}`,
          );
        } catch (err) {
          this.logger.error(
            `Failed to refresh tokens for subscription ${subscription.id}: ${err.message}`,
            err.stack,
          );
        }
      }

      this.logger.log('Finished daily token refresh check.');
    } catch (error) {
      this.logger.error('Error during daily token refresh job', error.stack);
    }
  }
}
