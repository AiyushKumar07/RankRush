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
            name: 'Starter Pack',
            description: '10 Quiz Tokens',
            price: 49,
            tokenCount: 10,
            isRecurring: false,
          },
          {
            name: 'Pro Pack',
            description: '25 Quiz Tokens',
            price: 99,
            tokenCount: 25,
            isRecurring: false,
          },
          {
            name: 'Unlimited Monthly',
            description: '100 Tokens / Month',
            price: 299,
            tokenCount: 100,
            isRecurring: true,
            refreshFrequency: 'MONTHLY',
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
