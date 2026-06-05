import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthService } from './auth.service.js';

@Injectable()
export class AuthCronService {
  private readonly logger = new Logger(AuthCronService.name);

  constructor(private readonly authService: AuthService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSessionCleanup() {
    this.logger.log('Starting cleanup of expired and revoked sessions...');

    try {
      const count = await this.authService.cleanupExpiredSessions();
      this.logger.log(`Cleaned up ${count} expired/revoked sessions.`);
    } catch (error) {
      this.logger.error('Error during session cleanup job', error.stack);
    }
  }
}
