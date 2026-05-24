import { Module } from '@nestjs/common';
import { StudentController } from './student.controller.js';
import { StudentService } from './student.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { TokensModule } from '../tokens/tokens.module.js';

@Module({
  imports: [PrismaModule, AuditModule, TokensModule],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
