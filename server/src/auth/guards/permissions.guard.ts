import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator.js';

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  [Role.ADMIN]: ['*'],
  [Role.TEACHER]: [
    'questions:read',
    'questions:write',
    'quizzes:read',
    'quizzes:write',
    'analytics:read',
  ],
  [Role.STUDENT]: ['student:read', 'student:write'],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const userPerms = ROLE_PERMISSIONS[user.role as Role] || [];
    if (userPerms.includes('*')) return true;

    return required.some((p) => userPerms.includes(p));
  }
}
