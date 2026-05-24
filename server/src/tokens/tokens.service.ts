import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenTransactionType } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class TokensService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    let wallet = await this.prisma.quizTokenWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.quizTokenWallet.create({
        data: { userId, balance: 0 },
      });
    }

    const transactions = await this.prisma.tokenTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const purchaseRefIds = transactions
      .filter((t) => t.type === 'PURCHASE' && t.referenceId)
      .map((t) => t.referenceId as string);

    let paymentMap = new Map<string, number>();
    if (purchaseRefIds.length > 0) {
      const payments = await this.prisma.paymentTransaction.findMany({
        where: { id: { in: purchaseRefIds } },
        select: { id: true, amount: true },
      });
      payments.forEach((p) => paymentMap.set(p.id, p.amount));
    }

    const enrichedTransactions = transactions.map((t) => {
      if (
        t.type === 'PURCHASE' &&
        t.referenceId &&
        paymentMap.has(t.referenceId)
      ) {
        return { ...t, price: paymentMap.get(t.referenceId) };
      }
      return t;
    });

    return {
      balance: wallet.balance,
      transactions: enrichedTransactions,
    };
  }

  async creditTokens(
    userId: string,
    amount: number,
    type: TokenTransactionType,
    referenceId?: string,
    description?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      let wallet = await tx.quizTokenWallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        wallet = await tx.quizTokenWallet.create({
          data: { userId, balance: 0 },
        });
      }

      const newBalance = wallet.balance + amount;

      await tx.quizTokenWallet.update({
        where: { userId },
        data: { balance: newBalance },
      });

      await tx.tokenTransaction.create({
        data: {
          userId,
          type,
          amount,
          balanceAfter: newBalance,
          referenceId,
          description,
        },
      });

      return { balance: newBalance };
    });
  }

  async debitTokens(
    userId: string,
    amount: number,
    type: TokenTransactionType,
    referenceId?: string,
    description?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.quizTokenWallet.findUnique({
        where: { userId },
      });

      if (!wallet || wallet.balance < amount) {
        throw new BadRequestException('Insufficient tokens');
      }

      const newBalance = wallet.balance - amount;

      await tx.quizTokenWallet.update({
        where: { userId },
        data: { balance: newBalance },
      });

      await tx.tokenTransaction.create({
        data: {
          userId,
          type,
          amount: -amount,
          balanceAfter: newBalance,
          referenceId,
          description,
        },
      });

      return { balance: newBalance };
    });
  }

  async getReferralInfo(userId: string) {
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (user && !user.referralCode) {
      let referralCode = '';
      let isUnique = false;
      while (!isUnique) {
        referralCode = `RR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        const existingCode = await this.prisma.user.findFirst({
          where: { referralCode },
        });
        if (!existingCode) isUnique = true;
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: { referralCode },
      });
      user.referralCode = referralCode;
    }

    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
    });

    const rewards = await this.prisma.referralReward.aggregate({
      where: { userId },
      _sum: { tokensAwarded: true },
    });

    return {
      referralCode: user?.referralCode,
      totalReferrals: referrals.length,
      successfulReferrals: referrals.filter((r) => r.status === 'SUCCESS')
        .length,
      tokensEarned: rewards._sum.tokensAwarded || 0,
      history: referrals,
    };
  }
}
