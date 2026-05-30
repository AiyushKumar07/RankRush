import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { LeaderboardsController } from './leaderboards.controller.js';
import { LeaderboardsService } from './leaderboards.service.js';
import { LeaderboardCacheService } from './leaderboard-cache.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [LeaderboardsController],
  providers: [LeaderboardsService, LeaderboardCacheService],
  exports: [LeaderboardsService, LeaderboardCacheService],
})
export class LeaderboardsModule {}
