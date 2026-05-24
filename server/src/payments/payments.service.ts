import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TokensService } from '../tokens/tokens.service.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private razorpay: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokensService: TokensService,
  ) {
    const key_id = process.env.RAZORPAY_KEY_ID || 'mock_key_id';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'mock_key_secret';
    
    if (key_id === 'mock_key_id') {
      this.razorpay = {
        orders: {
          create: async (options) => ({
            id: `order_mock_${Date.now()}`,
            amount: options.amount,
            currency: options.currency,
          }),
        },
      };
    } else {
      this.razorpay = new Razorpay({ key_id, key_secret });
    }
  }

  async createOrder(userId: string, planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new BadRequestException('Plan not found');

    const amount = Math.round(plan.price * 100);
    if (amount < 100) {
      throw new BadRequestException('Amount must be at least 1 INR');
    }

    let order;
    try {
      order = await this.razorpay.orders.create({
        amount,
        currency: plan.currency,
        receipt: `receipt_${Date.now()}`,
      });
    } catch (error) {
      console.error('Razorpay Order Creation Failed:', error);
      throw new Error('Failed to create payment order');
    }

    const payment = await this.prisma.paymentTransaction.create({
      data: {
        userId,
        planId,
        amount: plan.price,
        currency: plan.currency,
        status: 'PENDING',
        mode: plan.isRecurring ? 'SUBSCRIPTION' : 'ONE_TIME',
        gatewayOrderId: order.id,
      },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment.id,
      keyId: process.env.RAZORPAY_KEY_ID || 'mock_key_id',
    };
  }

  async verifyPayment(
    userId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new BadRequestException('Missing payment signature parameters');
    }

    if (process.env.RAZORPAY_KEY_SECRET) {
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        throw new BadRequestException('Invalid signature');
      }
    }

    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: { gatewayOrderId: razorpayOrderId, userId },
    });

    if (!transaction) throw new BadRequestException('Transaction not found');
    if (transaction.status === 'SUCCESS') {
      return { message: 'Already processed' };
    }

    await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'SUCCESS',
        gatewayPaymentId: razorpayPaymentId,
        gatewaySignature: razorpaySignature,
      },
    });

    if (transaction.planId) {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: transaction.planId },
      });

      if (plan) {
        if (plan.isRecurring) {
          const nextDate = new Date();
          if (plan.refreshFrequency === 'MONTHLY') {
            nextDate.setMonth(nextDate.getMonth() + 1);
          } else if (plan.refreshFrequency === 'QUARTERLY') {
            nextDate.setMonth(nextDate.getMonth() + 3);
          } else if (plan.refreshFrequency === 'YEARLY') {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
          } else {
            nextDate.setMonth(nextDate.getMonth() + 1); // Default to monthly
          }

          await this.prisma.studentSubscription.create({
            data: {
              userId,
              planId: plan.id,
              status: 'ACTIVE',
              isAutoRenewEnabled: true,
              nextRefreshDate: nextDate,
            },
          });
        }
        
        await this.tokensService.creditTokens(
          userId,
          plan.tokenCount,
          'PURCHASE',
          transaction.id,
          `Purchased ${plan.name}`,
        );
      }
    }

    return { success: true, message: 'Payment verified successfully' };
  }
}
