import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import IORedis, { Redis } from 'ioredis';
import { getRedisConnection } from '../events/redis.config.js';

// Internal event name (not a DomainEvent) — fired by RankingService after
// a successful recompute so caches can drop stale entries instantly.
export const RANKING_SCOPE_RECOMPUTED = 'ranking.scope.recomputed';

// Thin Redis-backed cache for leaderboard reads. We reuse the existing
// Redis connection config from the events module (BullMQ uses the same
// instance) instead of spinning up a second deployment.
//
// Keys are scope-namespaced so we can clear an entire scope's cache with
// a SCAN-and-DEL on `lb:<scopeId>:*`. Reads are best-effort — if Redis is
// unhealthy we fall through to a DB hit. We never block a read on a
// failed cache op.
@Injectable()
export class LeaderboardCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LeaderboardCacheService.name);
  private static readonly DEFAULT_TTL = 60;        // seconds
  private static readonly KEY_PREFIX = 'lb:';
  private client!: Redis;

  onModuleInit(): void {
    const conn = getRedisConnection() as any;
    this.client = new IORedis({
      host: conn.host,
      port: conn.port,
      username: conn.username,
      password: conn.password,
      tls: conn.tls,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    this.client.connect().catch((err) => {
      this.logger.error(`Redis connect failed: ${err.message}`);
    });
    this.client.on('error', (err) => {
      // ioredis re-emits on every reconnect attempt; rate-limit by only
      // logging at debug level to avoid noise.
      this.logger.debug(`Redis error: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client?.quit();
    } catch {
      /* ignore */
    }
  }

  // ─── Public helpers ──────────────────────────────────────────────

  topNKey(scopeId: string, limit: number): string {
    return `${LeaderboardCacheService.KEY_PREFIX}${scopeId}:top:${limit}`;
  }

  meKey(scopeId: string, userId: string): string {
    return `${LeaderboardCacheService.KEY_PREFIX}${scopeId}:me:${userId}`;
  }

  aroundMeKey(scopeId: string, userId: string, window: number): string {
    return `${LeaderboardCacheService.KEY_PREFIX}${scopeId}:around:${userId}:${window}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.debug(`cache.get(${key}) failed: ${(err as Error).message}`);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    ttlSeconds: number = LeaderboardCacheService.DEFAULT_TTL,
  ): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.debug(`cache.set(${key}) failed: ${(err as Error).message}`);
    }
  }

  // Auto-invalidate on recompute via the internal event channel.
  // Decouples RankingService from this module — no circular import.
  @OnEvent(RANKING_SCOPE_RECOMPUTED, { async: true, promisify: true })
  async handleRecomputed(payload: { scopeId: string }): Promise<void> {
    await this.invalidateScope(payload.scopeId);
  }

  // Drop every cached entry for a scope. Called after the recompute
  // worker writes new ranks so the next reader sees fresh data without
  // waiting for TTL.
  async invalidateScope(scopeId: string): Promise<void> {
    const pattern = `${LeaderboardCacheService.KEY_PREFIX}${scopeId}:*`;
    try {
      // SCAN avoids the O(N) blocking that KEYS would cause on big DBs.
      const stream = this.client.scanStream({ match: pattern, count: 200 });
      const pipeline = this.client.pipeline();
      let pending = 0;
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (keys: string[]) => {
          if (keys.length === 0) return;
          for (const k of keys) {
            pipeline.del(k);
            pending++;
          }
        });
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      if (pending > 0) await pipeline.exec();
    } catch (err) {
      this.logger.debug(
        `cache.invalidateScope(${scopeId}) failed: ${(err as Error).message}`,
      );
    }
  }
}
