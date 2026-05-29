import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import {
  checkPasswordStrength,
  validateEmail as secureValidateEmail,
} from 'secure-auth-helper';
import { v2 as cloudinary } from 'cloudinary';
import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { OtpService } from '../otp/otp.service.js';
import { MailService } from '../mail/mail.service.js';
import { TokensService } from '../tokens/tokens.service.js';
import {
  RegisterDto,
  LoginDto,
  StudentSignupDto,
  VerifyOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
  ChangePasswordDto,
} from './dto/auth.dto.js';

const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const ACCESS_TOKEN_EXPIRY = '15m';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditService,
    private otp: OtpService,
    private mail: MailService,
    private tokensService: TokensService,
  ) {}

  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  private async createSession(
    userId: string,
    req?: any,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const refreshToken = this.generateRefreshToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);

    // Max 3 active sessions logic
    const activeSessions = await this.prisma.session.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'asc' }, // Oldest first
    });

    if (activeSessions.length >= 3) {
      // Need to revoke oldest sessions to make room (leave only 2 active)
      const sessionsToRevokeCount = activeSessions.length - 2;
      const sessionsToRevoke = activeSessions.slice(0, sessionsToRevokeCount);

      await this.prisma.session.updateMany({
        where: { id: { in: sessionsToRevoke.map(s => s.id) } },
        data: { isRevoked: true },
      });
    }

    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshToken: hashedRefresh,
        userAgent: req?.headers?.['user-agent'],
        ipAddress: req?.ip,
        expiresAt,
      },
    });

    const accessToken = this.jwt.sign(
      { sub: userId, role: user!.role, jti: session.id },
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );

    return { accessToken, refreshToken };
  }

  private async validatePasswordStrength(password: string): Promise<void> {
    const result = checkPasswordStrength(password);
    if (result.score < 2) {
      throw new BadRequestException({
        message: 'Password is too weak',
        suggestions: result.suggestions,
        score: result.score,
        verdict: result.verdict,
      });
    }
  }

  async passwordStrength(password: string) {
    if (!password) {
      return {
        data: {
          score: 0,
          verdict: 'weak' as const,
          suggestions: ['Enter a password'],
          ok: false,
        },
      };
    }
    const r = checkPasswordStrength(password);
    return {
      data: {
        score: r.score,
        verdict: r.verdict,
        suggestions: r.suggestions,
        ok: r.score >= 2,
      },
    };
  }

  private levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp: number[] = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = dp[j];
        if (a[i - 1] === b[j - 1]) {
          dp[j] = prev;
        } else {
          dp[j] = 1 + Math.min(prev, dp[j - 1], dp[j]);
        }
        prev = tmp;
      }
    }
    return dp[n];
  }

  private arePasswordsSimilar(a: string, b: string): boolean {
    if (!a || !b) return false;
    const x = a.toLowerCase();
    const y = b.toLowerCase();
    if (x === y) return true;
    if (x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x))) return true;
    const d = this.levenshtein(x, y);
    const maxLen = Math.max(x.length, y.length);
    return maxLen > 0 && d / maxLen < 0.5;
  }

  private async validateEmailQuality(email: string): Promise<void> {
    try {
      const result = await secureValidateEmail(email);
      if (result.status === 'INVALID') {
        throw new BadRequestException({
          message: 'Invalid email address',
          suggestions: result.suggestions,
        });
      }
      if (result.validations.is_disposable) {
        throw new BadRequestException(
          'Disposable email addresses are not allowed',
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(`Email validation service unavailable: ${err}`);
    }
  }

  // ─── Check Email Availability ───────────────────────────────────────
  async checkEmailAvailability(email: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    let disposable = false;
    let invalidSyntax = false;
    try {
      const result = await secureValidateEmail(email);
      disposable = !!result.validations.is_disposable;
      invalidSyntax = !result.validations.syntax;
    } catch (err) {
      // Validator service unavailable — fall through; signup will re-check.
      this.logger.warn(`Email validation service unavailable: ${err}`);
    }

    return {
      data: {
        available: !existing,
        disposable,
        invalidSyntax,
      },
    };
  }

  // ─── Admin Register ─────────────────────────────────────────────────
  async register(dto: RegisterDto, req?: any) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashed,
        role: dto.role ?? 'ADMIN',
        isVerified: true,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    const { accessToken, refreshToken } = await this.createSession(user.id, req);

    return {
      message: 'Registration successful',
      data: { user, token: accessToken, refreshToken },
    };
  }

  // ─── Student Signup ─────────────────────────────────────────────────
  async studentSignup(dto: StudentSignupDto, req?: any) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    await this.validateEmailQuality(dto.email);
    await this.validatePasswordStrength(dto.password);

    const hashed = await bcrypt.hash(dto.password, 12);

    // Generate unique branded referral code
    let referralCode = '';
    let isUnique = false;
    while (!isUnique) {
      referralCode = `RR${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const existingCode = await this.prisma.user.findFirst({
        where: { referralCode },
      });
      if (!existingCode) isUnique = true;
    }

    let referredById: string | null = null;
    if (dto.referralCode && dto.referralCode.trim() !== '') {
      const normalizedCode = dto.referralCode.trim().replace(/-/g, '').toUpperCase();
      const referrer = await this.prisma.user.findFirst({
        where: { referralCode: normalizedCode },
      });
      if (referrer) {
        referredById = referrer.id;
      } else {
        throw new BadRequestException('Invalid referral code');
      }
    }

    const user = await this.prisma.user.create({
      data: {
        name: `${dto.firstName} ${dto.lastName}`,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        password: hashed,
        role: 'STUDENT',
        isVerified: false,
        referralCode,
        referredBy: referredById,
      },
    });

    if (referredById) {
      await this.prisma.referral.create({
        data: {
          referrerId: referredById,
          referredId: user.id,
          status: 'PENDING',
        },
      });
    }

    await this.otp.sendOtp(
      user.id,
      user.email,
      'EMAIL_VERIFICATION',
      dto.firstName,
    );

    await this.audit.log({
      action: 'SIGNUP',
      entityType: 'User',
      entityId: user.id,
      performedBy: user.id,
      details: { method: 'student_signup' },
      req,
    });

    this.logger.log(`Student signup: ${dto.email}`);

    return {
      message:
        'Account created! Please verify your email with the OTP sent to your inbox.',
      data: {
        userId: user.id,
        email: user.email,
        requiresVerification: true,
      },
    };
  }

  // ─── Verify Email OTP ──────────────────────────────────────────────
  async verifyEmail(userId: string, dto: VerifyOtpDto, req?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new UnauthorizedException('User not found');

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    await this.otp.verifyOtp(userId, dto.otp, 'EMAIL_VERIFICATION');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });

    // Referral status is left as PENDING until the user makes their first payment.

    await this.updateLoginStreak(userId);

    const tokens = await this.createSession(userId, req);

    await this.audit.log({
      action: 'EMAIL_VERIFIED',
      entityType: 'User',
      entityId: userId,
      performedBy: userId,
      req,
    });

    await this.mail.sendWelcome({
      to: user.email,
      name: user.firstName || user.name,
    });

    this.logger.log(`Email verified: ${user.email}`);

    return {
      message: 'Email verified successfully!',
      data: {
        user: {
          id: user.id,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          isVerified: true,
          isOnboarded: user.isOnboarded,
          class: user.class,
          school: user.school,
          target: user.target,
          contactNumber: user.contactNumber,
          profilePicture: user.profilePicture,
          address: user.address,
          referralCode: user.referralCode,
        },
        ...tokens,
      },
    };
  }

  // ─── Resend OTP ────────────────────────────────────────────────────
  async resendVerificationOtp(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user)
      throw new BadRequestException('No account found with this email');

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    return this.otp.sendOtp(
      user.id,
      user.email,
      'EMAIL_VERIFICATION',
      user.firstName || user.name,
    );
  }

  // ─── Login ─────────────────────────────────────────────────────────
  async login(dto: LoginDto, req?: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Email not registered. Please sign up.');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Incorrect password');

    if (!user.isActive) throw new ForbiddenException('Account deactivated');

    if (!user.isVerified) {
      await this.otp.sendOtp(
        user.id,
        user.email,
        'EMAIL_VERIFICATION',
        user.firstName || user.name,
      );
      return {
        message: 'Email not verified. A new OTP has been sent.',
        data: {
          userId: user.id,
          email: user.email,
          requiresVerification: true,
        },
      };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    await this.updateLoginStreak(user.id);

    const tokens = await this.createSession(user.id, req);

    await this.audit.log({
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      performedBy: user.id,
      req,
    });

    this.logger.log(`Login: ${user.email}`);

    return {
      data: {
        user: {
          id: user.id,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          isVerified: user.isVerified,
          isOnboarded: user.isOnboarded,
          class: user.class,
          school: user.school,
          target: user.target,
          contactNumber: user.contactNumber,
          profilePicture: user.profilePicture,
          address: user.address,
          referralCode: user.referralCode,
        },
        ...tokens,
      },
    };
  }

  // ─── Logout ────────────────────────────────────────────────────────
  async logout(userId: string, refreshToken: string, req?: any) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, isRevoked: false },
    });

    for (const session of sessions) {
      const isMatch = await bcrypt.compare(refreshToken, session.refreshToken);
      if (isMatch) {
        await this.prisma.session.update({
          where: { id: session.id },
          data: { isRevoked: true },
        });
        break;
      }
    }

    await this.audit.log({
      action: 'LOGOUT',
      entityType: 'User',
      entityId: userId,
      performedBy: userId,
      req,
    });

    return { message: 'Logged out successfully' };
  }

  // ─── Logout All Sessions ──────────────────────────────────────────
  async logoutAll(userId: string, req?: any) {
    await this.prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    await this.audit.log({
      action: 'SESSION_REVOKED',
      entityType: 'User',
      entityId: userId,
      performedBy: userId,
      details: { event: 'all_sessions_revoked' },
      req,
    });

    return { message: 'All sessions revoked' };
  }

  // ─── Refresh Token ─────────────────────────────────────────────────
  async refreshToken(dto: RefreshTokenDto, req?: any) {
    const sessions = await this.prisma.session.findMany({
      where: { isRevoked: false, expiresAt: { gte: new Date() } },
      include: { user: { select: { id: true, role: true, isActive: true } } },
    });

    let matchedSession: (typeof sessions)[0] | null = null;
    for (const session of sessions) {
      const isMatch = await bcrypt.compare(
        dto.refreshToken,
        session.refreshToken,
      );
      if (isMatch) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!matchedSession.user.isActive) {
      await this.prisma.session.update({
        where: { id: matchedSession.id },
        data: { isRevoked: true },
      });
      throw new ForbiddenException('Account deactivated');
    }

    // Revoke old session
    await this.prisma.session.update({
      where: { id: matchedSession.id },
      data: { isRevoked: true },
    });

    // Create new session (rotation)
    const tokens = await this.createSession(matchedSession.userId, req);

    await this.audit.log({
      action: 'TOKEN_REFRESHED',
      entityType: 'User',
      entityId: matchedSession.userId,
      performedBy: matchedSession.userId,
      req,
    });

    return {
      data: tokens,
    };
  }

  // ─── Forgot Password ──────────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto, req?: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        message:
          'If an account with that email exists, a password reset OTP has been sent.',
      };
    }

    await this.otp.sendOtp(
      user.id,
      user.email,
      'PASSWORD_RESET',
      user.firstName || user.name,
    );

    await this.audit.log({
      action: 'PASSWORD_RESET_REQUEST',
      entityType: 'User',
      entityId: user.id,
      performedBy: user.id,
      req,
    });

    return {
      message:
        'If an account with that email exists, a password reset OTP has been sent.',
    };
  }

  // ─── Reset Password ───────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto, req?: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new BadRequestException('Invalid request');

    await this.validatePasswordStrength(dto.newPassword);
    await this.otp.verifyOtp(user.id, dto.otp, 'PASSWORD_RESET');

    const hashed = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, passwordChangedAt: new Date() },
    });

    // Revoke all sessions after password reset
    await this.prisma.session.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    });

    await this.audit.log({
      action: 'PASSWORD_RESET_COMPLETE',
      entityType: 'User',
      entityId: user.id,
      performedBy: user.id,
      req,
    });

    await this.mail.sendPasswordResetConfirmation({
      to: user.email,
      name: user.firstName || user.name,
    });

    this.logger.log(`Password reset completed: ${user.email}`);

    return {
      message:
        'Password reset successful. Please login with your new password.',
    };
  }

  // ─── Change Password (authenticated) ──────────────────────────────
  async changePassword(userId: string, dto: ChangePasswordDto, req?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid)
      throw new UnauthorizedException('Current password is incorrect');

    if (this.arePasswordsSimilar(dto.currentPassword, dto.newPassword)) {
      throw new BadRequestException(
        'New password is too similar to your current password',
      );
    }

    await this.validatePasswordStrength(dto.newPassword);

    const hashed = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed, passwordChangedAt: new Date() },
    });

    await this.audit.log({
      action: 'PASSWORD_RESET_COMPLETE',
      entityType: 'User',
      entityId: userId,
      performedBy: userId,
      details: { method: 'authenticated_change' },
      req,
    });

    return { message: 'Password changed successfully' };
  }

  // ─── Get Profile (legacy compat) ──────────────────────────────────
  async getProfile(userId: string) {
    await this.updateLoginStreak(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        isVerified: true,
        isOnboarded: true,
        firstName: true,
        lastName: true,
        dob: true,
        class: true,
        school: true,
        target: true,
        contactNumber: true,
        profilePicture: true,
        address: true,
        referralCode: true,
        streak: true,
        longestStreak: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { data: { user } };
  }

  // ─── Get Users (admin) ────────────────────────────────────────────
  async getUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        isActive: true,
        isVerified: true,
        isOnboarded: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: { users } };
  }

  // ─── Get Active Sessions ──────────────────────────────────────────
  async getActiveSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gte: new Date() },
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const parsedSessions = sessions.map(session => {
      let friendlyName = 'Unknown Device';
      if (session.userAgent) {
        const parser = new UAParser(session.userAgent);
        const res = parser.getResult();
        const os = res.os.name || 'Unknown OS';
        const browser = res.browser.name || 'Unknown Browser';
        friendlyName = `${res.device.model || os} · ${browser}`;
      }
      
      let location = 'Unknown Location';
      if (session.ipAddress) {
        const geo = geoip.lookup(session.ipAddress);
        if (geo) {
          location = `${geo.city || 'Unknown City'}, ${geo.country || 'Unknown Country'}`;
        }
      }

      return {
        ...session,
        userAgent: friendlyName,
        rawUserAgent: session.userAgent,
        location,
      };
    });

    return { data: { sessions: parsedSessions } };
  }

  async revokeSessionById(userId: string, sessionId: string, req?: any) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });

    await this.audit.log({
      action: 'SESSION_REVOKED',
      entityType: 'Session',
      entityId: sessionId,
      performedBy: userId,
      details: { event: 'session_revoked_by_id' },
      req,
    });

    return { message: 'Session revoked successfully' };
  }

  // ─── Cleanup Expired Sessions ─────────────────────────────────────
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { isRevoked: true }],
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });
    return result.count;
  }

  // ─── Private Gamification Streak Helper ─────────────────────────────
  private async updateLoginStreak(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastActive: true,
        streak: true,
        longestStreak: true,
        loginXp: true,
      },
    });
    if (!user) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (!user.lastActive) {
      // First time active
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lastActive: now,
          streak: 1,
          longestStreak: 1,
          loginXp: 15, // +15 XP for first daily login!
        },
      });

      await this.prisma.studentActivity.create({
        data: {
          studentId: userId,
          type: 'streak',
          title: 'Daily Login!',
          meta: 'Streak: 1 day · +15 XP',
          icon: 'Flame',
          tone: 'orange',
        },
      });
      return;
    }

    const lastActiveDate = new Date(
      user.lastActive.getFullYear(),
      user.lastActive.getMonth(),
      user.lastActive.getDate(),
    );
    const diffTime = today.getTime() - lastActiveDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day!
      const newStreak = user.streak + 1;
      const newLongest = Math.max(user.longestStreak, newStreak);
      const xpGained = 15;

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lastActive: now,
          streak: newStreak,
          longestStreak: newLongest,
          loginXp: user.loginXp + xpGained,
        },
      });

      await this.prisma.studentActivity.create({
        data: {
          studentId: userId,
          type: 'streak',
          title: 'Daily Login!',
          meta: `Streak: ${newStreak} days · +${xpGained} XP`,
          icon: 'Flame',
          tone: 'orange',
        },
      });

      // Streak milestone bonus: +1 token each time the user crosses a new
      // 7-day mark they've never hit before. Gated on longestStreak so a
      // rebuilt streak doesn't re-trigger a milestone they've already passed.
      if (newStreak % 7 === 0 && newStreak > user.longestStreak) {
        await this.tokensService.creditTokens(
          userId,
          1,
          'ADMIN_CREDIT',
          `streak-${newStreak}`,
          `${newStreak}-day streak bonus`,
        );

        await this.prisma.studentActivity.create({
          data: {
            studentId: userId,
            type: 'streak',
            title: `${newStreak}-day streak bonus!`,
            meta: '+1 quiz token',
            icon: 'Flame',
            tone: 'amber',
          },
        });
      }
    } else if (diffDays > 1) {
      // Streak broken! Reset to 1.
      const xpGained = 15;
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lastActive: now,
          streak: 1,
          loginXp: user.loginXp + xpGained,
        },
      });

      await this.prisma.studentActivity.create({
        data: {
          studentId: userId,
          type: 'streak',
          title: 'Daily Login!',
          meta: 'Streak: 1 day · +15 XP',
          icon: 'Flame',
          tone: 'orange',
        },
      });
    }
    // If diffDays === 0, they already logged in today, so do nothing!
  }
}
