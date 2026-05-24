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

  async validateCode(code: string, userId: string) {
    const redeemCode = await this.prisma.redeemCode.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!redeemCode) {
      throw new BadRequestException('Invalid redeem code');
    }

    if (!redeemCode.isActive) {
      throw new BadRequestException('This code is no longer active');
    }

    if (redeemCode.expiresAt && new Date() > redeemCode.expiresAt) {
      throw new BadRequestException('This code has expired');
    }

    if (redeemCode.currentUses >= redeemCode.maxUses) {
      throw new BadRequestException('This code has reached its usage limit');
    }

    if (redeemCode.usedBy.includes(userId)) {
      throw new BadRequestException('You have already used this code');
    }

    return redeemCode;
  }

  async createOrder(userId: string, planId: string, redeemCodeString?: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new BadRequestException('Plan not found');

    let finalPrice = plan.price;
    let appliedCode: string | null = null;

    if (redeemCodeString) {
      const validCode = await this.validateCode(redeemCodeString, userId);
      finalPrice = finalPrice * (1 - validCode.discountPercentage / 100);
      appliedCode = validCode.code;
    }

    const amount = Math.round(finalPrice * 100);
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
      throw new Error(
        `Failed to create payment order: ${error.message || JSON.stringify(error)}`,
      );
    }

    const payment = await this.prisma.paymentTransaction.create({
      data: {
        userId,
        planId,
        amount: finalPrice, // Store discounted price
        currency: plan.currency,
        status: 'PENDING',
        mode: plan.isRecurring ? 'SUBSCRIPTION' : 'ONE_TIME',
        gatewayOrderId: order.id,
        redeemCode: appliedCode,
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

    // Handle Redeem Code usage if applied
    if (transaction.redeemCode) {
      await this.prisma.redeemCode.update({
        where: { code: transaction.redeemCode },
        data: {
          currentUses: { increment: 1 },
          usedBy: { push: userId }
        }
      });
    }

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

  // --- Admin Redeem Code Management ---
  async createRedeemCode(data: { code: string; discountPercentage: number; maxUses: number; expiresAt?: string }) {
    const existing = await this.prisma.redeemCode.findUnique({
      where: { code: data.code.toUpperCase() }
    });
    if (existing) throw new BadRequestException('Code already exists');

    return this.prisma.redeemCode.create({
      data: {
        code: data.code.toUpperCase(),
        discountPercentage: data.discountPercentage,
        maxUses: data.maxUses,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      }
    });
  }

  async getAllRedeemCodes() {
    return this.prisma.redeemCode.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async toggleRedeemCodeStatus(id: string, isActive: boolean) {
    return this.prisma.redeemCode.update({
      where: { id },
      data: { isActive }
    });
  }
}
