import { Module } from '@nestjs/common';
import { AiGenerateController } from './ai-generate.controller.js';
import { AiGenerateService } from './ai-generate.service.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [AuditModule],
  controllers: [AiGenerateController],
  providers: [AiGenerateService],
})
export class AiGenerateModule {}
