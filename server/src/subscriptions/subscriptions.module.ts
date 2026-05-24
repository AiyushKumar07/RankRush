import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { SubscriptionsController } from './subscriptions.controller.js';
import { SubscriptionCronService } from './subscription-cron.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TokensModule } from '../tokens/tokens.module.js';

@Module({
  imports: [PrismaModule, TokensModule],
  providers: [SubscriptionsService, SubscriptionCronService],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
