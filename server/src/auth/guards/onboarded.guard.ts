import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class OnboardedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    if (!user.isOnboarded) {
      throw new ForbiddenException(
        'Profile setup required. Please complete your profile first.',
      );
    }

    return true;
  }
}
