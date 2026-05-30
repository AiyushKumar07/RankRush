import { Module } from '@nestjs/common';
import { QuizzesController } from './quizzes.controller.js';
import { QuizzesService } from './quizzes.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RankingModule } from '../ranking/ranking.module.js';

@Module({
  // RankingModule exports RankingService so we can auto-create the per-quiz
  // scope when a quiz is flipped to rankRewarding=true.
  imports: [PrismaModule, AuditModule, RankingModule],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService],
})
export class QuizzesModule {}
