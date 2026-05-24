import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module.js';
import { MailModule } from './mail/mail.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UserModule } from './user/user.module.js';
import { QuestionsModule } from './questions/questions.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AiGenerateModule } from './ai-generate/ai-generate.module.js';
import { QuizzesModule } from './quizzes/quizzes.module.js';
import { StudentModule } from './student/student.module.js';
import { HealthController } from './health.controller.js';
import { LoggingMiddleware } from './common/middleware/logging.middleware.js';
import { TokensModule } from './tokens/tokens.module';
import { PaymentsModule } from './payments/payments.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 100 }],
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    UserModule,
    QuestionsModule,
    AnalyticsModule,
    AuditModule,
    AiGenerateModule,
    QuizzesModule,
    StudentModule,
    TokensModule,
    PaymentsModule,
    SubscriptionsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
