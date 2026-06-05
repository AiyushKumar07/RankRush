import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: { sub: string; role?: string; jti?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        isActive: true,
        isVerified: true,
        isOnboarded: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    if (!payload.jti) {
      throw new UnauthorizedException('Session token missing');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.jti },
      select: { userId: true, isRevoked: true, expiresAt: true },
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.isRevoked ||
      session.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Session revoked or expired');
    }

    return { ...user, sessionId: payload.jti };
  }
}
