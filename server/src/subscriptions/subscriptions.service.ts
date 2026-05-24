import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlans() {
    let plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
    });

    if (plans.length === 0) {
      // Seed initial plans
      await this.prisma.subscriptionPlan.createMany({
        data: [
          {
            name: 'Starter Pass',
            description: '10 Quiz Tokens',
            price: 99,
            tokenCount: 10,
            isRecurring: false,
          },
          {
            name: 'Scholar Pack',
            description: '20 Quiz Tokens',
            price: 199,
            tokenCount: 20,
            isRecurring: false,
          },
          {
            name: 'Ranker Pro',
            description: '50 Quiz Tokens',
            price: 399,
            tokenCount: 50,
            isRecurring: false,
          },
        ],
      });
      plans = await this.prisma.subscriptionPlan.findMany({
        where: { isActive: true },
      });
    }

    return plans;
  }
}
