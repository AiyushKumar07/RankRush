import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TokensService } from '../tokens/tokens.service.js';
import { EventBusService } from '../events/event-bus.service.js';
import { Cadence } from '@prisma/client';
import Razorpay from 'razorpay';
import crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private razorpay: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokensService: TokensService,
    private readonly eventBus: EventBusService,
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

  async validateCode(code: string, userId: string, planId?: string) {
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

    if (planId && redeemCode.applicablePlanIds && redeemCode.applicablePlanIds.length > 0 && !redeemCode.applicablePlanIds.includes(planId)) {
      throw new BadRequestException('This redeem code is not valid for the selected plan.');
    }

    return redeemCode;
  }

  // Validates a redeem code AND previews the discounted price for the
  // selected plan+cadence (when provided). Used by the buy-modal so the
  // user sees the new price before clicking "Pay".
  async validateCodeWithPreview(
    code: string,
    userId: string,
    planId?: string,
    cadence?: Cadence,
  ) {
    const redeemCode = await this.validateCode(code, userId, planId);

    let originalPrice: number | null = null;
    let discountedPrice: number | null = null;
    let pricingId: string | null = null;
    let currency = 'INR';

    if (planId && cadence) {
      const pricing = await this.prisma.planPricing.findUnique({
        where: { planId_cadence: { planId, cadence } },
      });
      if (pricing && pricing.isActive) {
        const plan = await this.prisma.subscriptionPlan.findUnique({
          where: { id: planId },
          select: { currency: true },
        });
        originalPrice = pricing.price;
        discountedPrice = Math.round(
          pricing.price * (1 - redeemCode.discountPercentage / 100),
        );
        pricingId = pricing.id;
        currency = plan?.currency || 'INR';
      }
    }

    return {
      code: redeemCode.code,
      discountPercentage: redeemCode.discountPercentage,
      applicablePlanIds: redeemCode.applicablePlanIds,
      pricingId,
      originalPrice,
      discountedPrice,
      currency,
    };
  }

  async createOrder(
    userId: string,
    planId: string,
    cadence: Cadence,
    redeemCodeString?: string,
  ) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new BadRequestException('Plan not found');

    const pricing = await this.prisma.planPricing.findUnique({
      where: { planId_cadence: { planId, cadence } },
    });
    if (!pricing || !pricing.isActive) {
      throw new BadRequestException('Selected pricing variant is unavailable');
    }

    let finalPrice = pricing.price;
    let appliedCode: string | null = null;

    if (redeemCodeString) {
      const validCode = await this.validateCode(redeemCodeString, userId, planId);
      finalPrice = Math.round(finalPrice * (1 - validCode.discountPercentage / 100));
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

    const isRecurring = cadence !== Cadence.ONE_TIME;
    const payment = await this.prisma.paymentTransaction.create({
      data: {
        userId,
        planId,
        pricingId: pricing.id,
        cadence,
        amount: finalPrice,
        currency: plan.currency,
        status: 'PENDING',
        mode: isRecurring ? 'SUBSCRIPTION' : 'ONE_TIME',
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

    const existingSuccessCount = await this.prisma.paymentTransaction.count({
      where: { userId, status: 'SUCCESS' }
    });
    const isFirstPayment = existingSuccessCount === 0;

    await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'SUCCESS',
        gatewayPaymentId: razorpayPaymentId,
        gatewaySignature: razorpaySignature,
      },
    });

    if (isFirstPayment) {
      const referral = await this.prisma.referral.findUnique({
        where: { referredId: userId },
      });

      if (referral && referral.status === 'PENDING') {
        await this.prisma.referral.update({
          where: { id: referral.id },
          data: { status: 'SUCCESS' },
        });

        const referredUser = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, name: true }
        });
        const refereeName = referredUser?.firstName || referredUser?.name || 'a friend';

        // Reward referrer
        await this.tokensService.creditTokens(
          referral.referrerId,
          2,
          'REFERRAL_BONUS',
          referral.id,
          `Referral bonus for inviting ${refereeName}`,
        );
        await this.prisma.referralReward.create({
          data: {
            userId: referral.referrerId,
            referralId: referral.id,
            tokensAwarded: 2,
          },
        });

        // Reward referred user
        await this.tokensService.creditTokens(
          userId,
          2,
          'REFERRAL_BONUS',
          referral.id,
          'Signup referral bonus',
        );
        await this.prisma.referralReward.create({
          data: {
            userId: userId,
            referralId: referral.id,
            tokensAwarded: 2,
          },
        });

        // Tell the referrer their invite converted. Conversion count is
        // computed after the status flip so the just-converted referral
        // is included in the running total.
        const referrerConversionCount = await this.prisma.referral.count({
          where: { referrerId: referral.referrerId, status: 'SUCCESS' },
        });
        const planNameForEvent = transaction.planId
          ? (await this.prisma.subscriptionPlan.findUnique({
              where: { id: transaction.planId },
              select: { name: true },
            }))?.name ?? 'Paid plan'
          : 'Paid plan';

        this.eventBus.emit({
          type: 'REFERRAL_CONVERTED',
          userId: referral.referrerId,
          refType: 'Referral',
          refId: referral.id,
          payload: {
            referredUserId: userId,
            referredUserName: refereeName,
            planName: planNameForEvent,
            tokensAwarded: 2,
            conversionCount: referrerConversionCount,
          },
        });
      }
    }

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

    if (transaction.planId && transaction.pricingId && transaction.cadence) {
      const [plan, pricing] = await Promise.all([
        this.prisma.subscriptionPlan.findUnique({ where: { id: transaction.planId } }),
        this.prisma.planPricing.findUnique({ where: { id: transaction.pricingId } }),
      ]);

      if (plan && pricing) {
        const cadence = transaction.cadence;

        // Lifecycle dates by cadence:
        //   ONE_TIME = pay once, Pro forever — no expiry, no monthly refresh, no renewal.
        //   MONTHLY  = 1 batch of tokens, expires after 1 month.
        //   ANNUAL   = monthly refreshes for 12 months, then expires.
        const startDate = new Date();
        let endDate: Date | null = null;
        let nextRefreshDate: Date | null = null;
        let isAutoRenewEnabled = false;

        if (cadence !== Cadence.ONE_TIME) {
          nextRefreshDate = new Date(startDate);
          nextRefreshDate.setMonth(nextRefreshDate.getMonth() + 1);

          endDate = new Date(startDate);
          if (cadence === Cadence.ANNUAL) {
            endDate.setFullYear(endDate.getFullYear() + 1);
          } else {
            endDate.setMonth(endDate.getMonth() + 1);
          }
          isAutoRenewEnabled = true;
        }

        // A non-expiring ONE_TIME purchase grants lifetime Pro — the top tier.
        // Never downgrade or replace it: if the user already holds one, leave it
        // active and just credit the newly purchased tokens. This also stops a
        // later lower-tier (MONTHLY/ANNUAL) purchase from silently superseding it.
        const lifetime = await this.prisma.studentSubscription.findFirst({
          where: { userId, status: 'ACTIVE', cadence: Cadence.ONE_TIME, endDate: null },
          select: { id: true },
        });

        let subscriptionId = lifetime?.id ?? null;

        if (!lifetime) {
          // Cancel any previous active subscription for this user — only one active at a time.
          await this.prisma.studentSubscription.updateMany({
            where: { userId, status: 'ACTIVE' },
            data: { status: 'CANCELLED', endDate: startDate },
          });

          // create() returns the new row, so we read its id directly for the
          // event payload — no separate refetch needed.
          const created = await this.prisma.studentSubscription.create({
            data: {
              userId,
              planId: plan.id,
              pricingId: pricing.id,
              cadence,
              status: 'ACTIVE',
              isAutoRenewEnabled,
              startDate,
              endDate,
              nextRefreshDate,
            },
          });
          subscriptionId = created.id;
        }

        await this.tokensService.creditTokens(
          userId,
          pricing.tokenCount,
          'PURCHASE',
          transaction.id,
          `Purchased ${plan.name}`,
        );

        if (subscriptionId) {
          this.eventBus.emit({
            type: 'PLAN_PURCHASED',
            userId,
            refType: 'StudentSubscription',
            refId: subscriptionId,
            payload: {
              subscriptionId,
              planId: plan.id,
              planName: plan.name,
              pricingId: pricing.id,
              cadence: String(cadence),
              amountPaid: transaction.amount,
              currency: transaction.currency,
              tokensCredited: pricing.tokenCount,
            },
          });
        }
      }
    }

    return { success: true, message: 'Payment verified successfully' };
  }

  async getUserPaymentHistory(userId: string) {
    const transactions = await this.prisma.paymentTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const planIds = [...new Set(transactions.map((t) => t.planId).filter(Boolean) as string[])];
    const plans = planIds.length
      ? await this.prisma.subscriptionPlan.findMany({
          where: { id: { in: planIds } },
          select: { id: true, name: true, icon: true },
        })
      : [];
    const planMap = new Map(plans.map((p) => [p.id, p]));

    return transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      mode: t.mode,
      cadence: t.cadence,
      planId: t.planId,
      planName: t.planId ? planMap.get(t.planId)?.name ?? null : null,
      planIcon: t.planId ? planMap.get(t.planId)?.icon ?? null : null,
      gatewayPaymentId: t.gatewayPaymentId,
      gatewayOrderId: t.gatewayOrderId,
      redeemCode: t.redeemCode,
      createdAt: t.createdAt,
    }));
  }

  // --- Admin Redeem Code Management ---
  async createRedeemCode(data: { code: string; discountPercentage: number; maxUses: number; expiresAt?: string; applicablePlanIds?: string[] }) {
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
        applicablePlanIds: data.applicablePlanIds || [],
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
