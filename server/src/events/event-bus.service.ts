import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DOMAIN_EVENT_CHANNEL } from './domain-events.js';
import type { DomainEvent } from './domain-events.js';

// Single typed entry point for emitting domain events. All producers go
// through this — never call EventEmitter2 directly — so we get one place
// to add cross-cutting concerns (tracing, outbox writes, retries).
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(private readonly emitter: EventEmitter2) {}

  emit(event: DomainEvent): void {
    if (!event.occurredAt) event.occurredAt = new Date();
    // Synchronous fan-out to in-process @OnEvent(DOMAIN_EVENT_CHANNEL)
    // listeners. Async work goes through BullMQ queues, kicked off from
    // those listeners (Phase 2+).
    try {
      this.emitter.emit(DOMAIN_EVENT_CHANNEL, event);
    } catch (err) {
      // Listener failures must NOT take down the producing transaction.
      // The activity feed is best-effort; the producer's primary write
      // (e.g. QuizAttempt) has already succeeded by the time we get here.
      this.logger.error(
        `EventBus dispatch failed for ${event.type} (user ${event.userId}): ${(err as Error).message}`,
      );
    }
  }

  // Internal infrastructure signal — NOT a domain event. Use sparingly
  // for cross-module wiring where a typed DomainEvent would be overkill
  // (e.g. "scope recompute finished → drop its cache"). Keeps the domain
  // event surface clean.
  emitInternal(name: string, payload: unknown): void {
    try {
      this.emitter.emit(name, payload);
    } catch (err) {
      this.logger.warn(
        `Internal signal "${name}" dispatch failed: ${(err as Error).message}`,
      );
    }
  }
}
