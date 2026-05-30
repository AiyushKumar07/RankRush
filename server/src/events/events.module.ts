import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EventBusService } from './event-bus.service.js';
import { ActivityEventProjector } from './activity-event.projector.js';
import { getRedisConnection } from './redis.config.js';
import { QUEUE } from './queue-names.js';

// Foundation module for the activity feed + ranking engine. Provides:
//   - EventEmitter2 for synchronous, in-process projector fan-out
//   - BullMQ queues backed by Redis for async heavy work
//     (ranking recompute, snapshot, badge eval, stats rollup)
//   - EventBusService: the single typed entry-point producers call to emit
//   - ActivityEventProjector: subscribes to all events and persists them
//
// Marked @Global so any module can inject EventBusService without re-importing.
@Global()
@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      // Mirrors EventEmitter defaults; we keep a single channel name so
      // we never bump into the listener cap by accident.
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
    BullModule.forRoot({
      connection: getRedisConnection(),
    }),
    BullModule.registerQueue(
      { name: QUEUE.RANKING_RECOMPUTE },
      { name: QUEUE.RANKING_SNAPSHOT },
      { name: QUEUE.BADGE_EVAL },
      { name: QUEUE.STATS_ROLLUP },
    ),
  ],
  providers: [EventBusService, ActivityEventProjector],
  exports: [EventBusService, BullModule],
})
export class EventsModule {}
