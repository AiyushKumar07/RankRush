import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenTransactionType } from '@prisma/client';

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

    return {
      balance: wallet.balance,
      transactions,
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

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
