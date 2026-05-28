import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EntitlementsService } from './entitlements.service.js';
import { EntitlementsGuard } from './entitlements.guard.js';

@Module({
  imports: [PrismaModule],
  providers: [EntitlementsService, EntitlementsGuard],
  exports: [EntitlementsService, EntitlementsGuard],
})
export class EntitlementsModule {}
