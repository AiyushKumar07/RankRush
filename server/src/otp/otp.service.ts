import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  private generateOtpCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  async sendOtp(
    userId: string,
    email: string,
    purpose: OtpPurpose,
    name?: string,
  ): Promise<{ message: string }> {
    const recentOtp = await this.prisma.otp.findFirst({
      where: {
        userId,
        purpose,
        isUsed: false,
        createdAt: {
          gte: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp) {
      const waitSeconds = Math.ceil(
        (RESEND_COOLDOWN_SECONDS * 1000 -
          (Date.now() - recentOtp.createdAt.getTime())) /
          1000,
      );
      throw new HttpException(
        `Please wait ${waitSeconds} seconds before requesting a new OTP`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.prisma.otp.updateMany({
      where: { userId, purpose, isUsed: false },
      data: { isUsed: true },
    });

    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.otp.create({
      data: { userId, code, purpose, expiresAt },
    });

    const purposeMap: Record<OtpPurpose, 'verification' | 'password-reset' | 'sensitive-action'> = {
      EMAIL_VERIFICATION: 'verification',
      PASSWORD_RESET: 'password-reset',
      SENSITIVE_ACTION: 'sensitive-action',
    };

    await this.mail.sendOtp({
      to: email,
      otp: code,
      purpose: purposeMap[purpose],
      name,
      expiryMinutes: OTP_EXPIRY_MINUTES,
    });

    this.logger.log(`OTP sent to ${email} for ${purpose}`);

    return { message: `OTP sent to ${email}. Valid for ${OTP_EXPIRY_MINUTES} minutes.` };
  }

  async verifyOtp(
    userId: string,
    code: string,
    purpose: OtpPurpose,
  ): Promise<boolean> {
    const otp = await this.prisma.otp.findFirst({
      where: {
        userId,
        purpose,
        isUsed: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException('No valid OTP found. Please request a new one.');
    }

    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      await this.prisma.otp.update({
        where: { id: otp.id },
        data: { isUsed: true },
      });
      throw new HttpException(
        'Maximum OTP attempts exceeded. Please request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (otp.code !== code) {
      await this.prisma.otp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });

      const remaining = MAX_OTP_ATTEMPTS - otp.attempts - 1;
      throw new BadRequestException(
        `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      );
    }

    await this.prisma.otp.update({
      where: { id: otp.id },
      data: { isUsed: true },
    });

    this.logger.log(`OTP verified for user ${userId}, purpose: ${purpose}`);
    return true;
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.otp.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { isUsed: true }],
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });
    return result.count;
  }
}
