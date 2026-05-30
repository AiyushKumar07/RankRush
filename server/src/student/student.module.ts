import { Module } from '@nestjs/common';
import { StudentController } from './student.controller.js';
import { StudentService } from './student.service.js';
import { EvidenceRetentionService } from './evidence-retention.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { TokensModule } from '../tokens/tokens.module.js';
import { EntitlementsModule } from '../entitlements/entitlements.module.js';

@Module({
  imports: [PrismaModule, AuditModule, TokensModule, EntitlementsModule],
  controllers: [StudentController],
  providers: [StudentService, EvidenceRetentionService],
  exports: [StudentService, EvidenceRetentionService],
})
export class StudentModule {}
