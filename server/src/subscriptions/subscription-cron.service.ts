import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TokensService } from '../tokens/tokens.service';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokensService: TokensService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleMonthlyTokenRefresh() {
    this.logger.log('Starting daily token refresh check for subscriptions...');

    try {
      const now = new Date();
      
      // Find all active subscriptions that are due for a refresh
      const dueSubscriptions = await this.prisma.studentSubscription.findMany({
        where: {
          status: 'ACTIVE',
          isAutoRenewEnabled: true,
          nextRefreshDate: {
            lte: now, // less than or equal to current time
          },
        },
        include: {
          plan: true,
        },
      });

      if (dueSubscriptions.length === 0) {
        this.logger.log('No subscriptions due for refresh today.');
        return;
      }

      this.logger.log(`Found ${dueSubscriptions.length} subscriptions due for refresh.`);

      for (const subscription of dueSubscriptions) {
        try {
          // 1. Credit the tokens
          await this.tokensService.creditTokens(
            subscription.userId,
            subscription.plan.tokenCount,
            'SUBSCRIPTION_REFRESH',
            subscription.id,
            `Monthly refresh for ${subscription.plan.name}`
          );

          // 2. Calculate the next refresh date (add 1 month)
          const nextDate = new Date(subscription.nextRefreshDate || now);
          
          if (subscription.plan.refreshFrequency === 'MONTHLY') {
            nextDate.setMonth(nextDate.getMonth() + 1);
          } else if (subscription.plan.refreshFrequency === 'QUARTERLY') {
            nextDate.setMonth(nextDate.getMonth() + 3);
          } else if (subscription.plan.refreshFrequency === 'YEARLY') {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
          } else {
            // Default fallback is monthly
            nextDate.setMonth(nextDate.getMonth() + 1);
          }

          // 3. Update the subscription record
          await this.prisma.studentSubscription.update({
            where: { id: subscription.id },
            data: {
              nextRefreshDate: nextDate,
            },
          });

          this.logger.log(`Successfully refreshed tokens for user ${subscription.userId} on plan ${subscription.plan.name}`);
        } catch (err) {
          this.logger.error(`Failed to refresh tokens for subscription ${subscription.id}: ${err.message}`, err.stack);
        }
      }

      this.logger.log('Finished daily token refresh check.');
    } catch (error) {
      this.logger.error('Error during daily token refresh job', error.stack);
    }
  }
}
