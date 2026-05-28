import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntitlementsService, type EntitlementKey } from './entitlements.service.js';
import { REQUIRE_FEATURE_KEY } from './require-feature.decorator.js';

@Injectable()
export class EntitlementsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlements: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<{
      key: EntitlementKey;
      upgradeHint?: string;
    } | undefined>(REQUIRE_FEATURE_KEY, [context.getHandler(), context.getClass()]);

    if (!meta) return true;

    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();

    await this.entitlements.requireFeature(userId, meta.key, meta.upgradeHint);
    return true;
  }
}
