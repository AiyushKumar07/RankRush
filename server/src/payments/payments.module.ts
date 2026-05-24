import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TokensModule } from '../tokens/tokens.module.js';

@Module({
  imports: [PrismaModule, TokensModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
