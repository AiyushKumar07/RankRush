import { Module } from '@nestjs/common';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { AuditModule } from '../audit/audit.module.js';
import { EntitlementsModule } from '../entitlements/entitlements.module.js';

import { BloomFilterService } from './bloom-filter.service.js';

@Module({
  imports: [AuditModule, EntitlementsModule],
  controllers: [UserController],
  providers: [UserService, BloomFilterService],
  exports: [UserService, BloomFilterService],
})
export class UserModule {}
