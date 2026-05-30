import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TokensModule } from '../tokens/tokens.module.js';
import { BadgesController } from './badges.controller.js';
import { BadgesService } from './badges.service.js';

// EventBusService is `@Global()` so no import here.
@Module({
  imports: [PrismaModule, TokensModule],
  controllers: [BadgesController],
  providers: [BadgesService],
  exports: [BadgesService],
})
export class BadgesModule {}
