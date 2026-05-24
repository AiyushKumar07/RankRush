import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '@prisma/client';

@Controller('api/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // --- Public (student-facing): active plans only ---
  @Get('plans')
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  // --- Admin endpoints ---

  @Get('admin/plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getAllPlans() {
    return this.subscriptionsService.getAllPlans();
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
  createPlan(
    @Body() body: {
      name: string;
      description?: string;
      price: number;
      tokenCount: number;
      isRecurring?: boolean;
      refreshFrequency?: string;
      isPopular?: boolean;
    },
  ) {
    return this.subscriptionsService.createPlan(body);
  }

  @Patch('admin/plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updatePlan(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      price?: number;
      tokenCount?: number;
      isRecurring?: boolean;
      refreshFrequency?: string;
      isPopular?: boolean;
    },
  ) {
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
