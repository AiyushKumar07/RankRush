import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('api/payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  createOrder(
    @CurrentUser('id') userId: string,
    @Body('planId') planId: string,
  ) {
    return this.paymentsService.createOrder(userId, planId);
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
}
