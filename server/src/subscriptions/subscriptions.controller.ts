import { Controller, Get } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';

@Controller('api/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  getPlans() {
    return this.subscriptionsService.getPlans();
  }
}
