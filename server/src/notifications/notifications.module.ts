import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationProjector } from './notification.projector.js';

// @Global so any feature service (student.service, tokens, badges, …)
// can inject NotificationsService without us threading the module
// import through every consumer. The service is small and stateless;
// having one shared instance is fine.
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationProjector],
  exports: [NotificationsService],
})
export class NotificationsModule {}
