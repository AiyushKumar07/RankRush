import { Controller, Post, Get, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '@prisma/client';

@Controller('api/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('validate-code')
  validateCode(
    @CurrentUser('id') userId: string,
    @Body('code') code: string,
  ) {
    return this.paymentsService.validateCode(code, userId);
  }

  @Post('create-order')
  createOrder(
    @CurrentUser('id') userId: string,
    @Body('planId') planId: string,
    @Body('redeemCode') redeemCode?: string,
  ) {
    return this.paymentsService.createOrder(userId, planId, redeemCode);
  }

  @Post('verify')
  verifyPayment(
    @CurrentUser('id') userId: string,
    @Body('razorpayOrderId') razorpayOrderId: string,
    @Body('razorpayPaymentId') razorpayPaymentId: string,
    @Body('razorpaySignature') razorpaySignature: string,
  ) {
    return this.paymentsService.verifyPayment(
      userId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );
  }

  // --- Admin Endpoints ---

  @Post('admin/redeem-codes')
  @Roles(Role.ADMIN)
  createRedeemCode(
    @Body() body: { code: string; discountPercentage: number; maxUses: number; expiresAt?: string }
  ) {
    return this.paymentsService.createRedeemCode(body);
  }

  @Get('admin/redeem-codes')
  @Roles(Role.ADMIN)
  getAllRedeemCodes() {
    return this.paymentsService.getAllRedeemCodes();
  }

  @Patch('admin/redeem-codes/:id/toggle')
  @Roles(Role.ADMIN)
  toggleRedeemCodeStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.paymentsService.toggleRedeemCodeStatus(id, isActive);
  }
}
