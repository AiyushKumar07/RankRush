import { Controller, Get, UseGuards } from '@nestjs/common';
import { TokensService } from './tokens.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('api/tokens')
@UseGuards(JwtAuthGuard)
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Get('balance')
  getWallet(@CurrentUser('id') userId: string) {
    return this.tokensService.getWallet(userId);
  }

  @Get('referrals')
  getReferrals(@CurrentUser('id') userId: string) {
    return this.tokensService.getReferralInfo(userId);
  }
}
