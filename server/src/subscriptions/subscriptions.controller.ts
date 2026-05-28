import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Cadence, FeatureValueType, Role } from '@prisma/client';

type PricingPayload = {
  cadence: Cadence;
  price: number;
  originalPrice?: number | null;
  tokenCount: number;
  tokenPeriodLabel?: string | null;
  note?: string | null;
  isActive?: boolean;
};

type FeaturePayload = {
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

type PlanPayload = {
  name: string;
  description?: string | null;
  icon?: string | null;
  badge?: string | null;
  ctaLabel?: string | null;
  ctaVariant?: string | null;
  currency?: string;
  isActive?: boolean;
  isPopular?: boolean;
  isFree?: boolean;
  pricings?: PricingPayload[];
  features?: FeaturePayload[];
};

@Controller('api/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // --- Public (student-facing): active plans only ---
  @Get('plans')
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  // --- Authenticated student: my current subscription / cancel ---
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMySubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getMySubscription(userId);
  }

  @Post('me/cancel')
  @UseGuards(JwtAuthGuard)
  cancelMySubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.cancelMySubscription(userId);
  }

  // --- Admin endpoints ---

  @Get('admin/plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getAllPlans() {
    return this.subscriptionsService.getAllPlans();
  }

  @Get('admin/plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getPlanById(@Param('id') id: string) {
    return this.subscriptionsService.getPlanById(id);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getPlanStats() {
    return this.subscriptionsService.getPlanStats();
  }

  @Post('admin/plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  createPlan(@Body() body: PlanPayload) {
    return this.subscriptionsService.createPlan(body);
  }

  @Patch('admin/plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updatePlan(@Param('id') id: string, @Body() body: Partial<PlanPayload>) {
    return this.subscriptionsService.updatePlan(id, body);
  }

  @Patch('admin/plans/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  togglePlanStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.subscriptionsService.togglePlanStatus(id, isActive);
  }

  @Post('admin/plans/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  reorderPlans(@Body('orderedIds') orderedIds: string[]) {
    return this.subscriptionsService.reorderPlans(orderedIds);
  }
}
