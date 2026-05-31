import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaService } from '../prisma/prisma.service.js';

// Proctoring evidence (heartbeat / burst / audio / exit captures) is only
// useful for ~3 days after the attempt — long enough for a candidate to
// raise a dispute and an admin to review, short enough to stay clear of
// any "data minimisation" complaints. After that we delete both the
// Cloudinary asset and our index row.
//
// The retention window is configurable via env so ops can extend it for
// a specific investigation without redeploying.
const RETENTION_DAYS = Number(
  process.env.PROCTORING_EVIDENCE_RETENTION_DAYS || '3',
);

// Cloudinary's bulk delete endpoint caps at 100 public_ids per call.
const CLOUDINARY_BATCH = 100;

// Per-page DB pull. Smaller than the previous "everything at once" cap
// so memory stays bounded for any sized backlog. The loop below runs
// until either there's nothing left or one of the run-level caps hits.
const PAGE_SIZE = 1000;

// Hard ceilings so a single cron run is bounded regardless of backlog.
// Rationale: the dual-source pipeline (camera + screen) doubled the
// per-attempt frame count. Daily inflow at ~100 active attempts is
// ~14k rows/day; we need to drain at LEAST that much per run or the
// table grows unboundedly. 50k gives ~3× headroom for catch-up days
// without a single run dragging on for hours.
const MAX_ROWS_PER_RUN = 50_000;
const MAX_DURATION_MS = 10 * 60 * 1000;

@Injectable()
export class EvidenceRetentionService {
  private readonly logger = new Logger(EvidenceRetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Runs daily at 03:00 server-time. Avoids midnight contention with the
  // subscription-refresh cron and runs in a low-traffic window.
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleDailyPurge() {
    await this.purgeOlderThan(RETENTION_DAYS).catch((err) => {
      this.logger.error(
        `Evidence purge job failed: ${err?.message || err}`,
        err?.stack,
      );
    });
  }

  /**
   * Hard-delete all evidence captured before `now - days`.
   * Returns counts so a manual invocation (ops endpoint) can show progress.
   *
   * Strategy:
   *   1. Loop in PAGE_SIZE chunks. Each iteration pulls a fresh page of
   *      stale rows (skipping any whose Cloudinary delete failed last
   *      iteration — those retained_id_skip set carries them forward so
   *      we don't busy-spin on the same broken keys).
   *   2. Bucket by Cloudinary resource_type (image vs video, the latter
   *      is where legacy audio rows live) and bulk-delete 100 at a time.
   *   3. Only after the cloud delete succeeds for a key do we remove the
   *      DB row, so a failed cloud call leaves the row present and the
   *      next run retries it.
   *   4. Stop when there's nothing left OR we've hit the run-level
   *      ceilings (row count / wall-clock budget). The page-loop means
   *      a single nightly run can drain a multi-day backlog without
   *      blowing memory.
   */
  async purgeOlderThan(days: number) {
    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const startedAt = Date.now();
    this.logger.log(
      `Starting proctoring evidence purge — older than ${threshold.toISOString()} (${days}d)`,
    );

    let totalScanned = 0;
    let totalCloudDeleted = 0;
    let totalDbDeleted = 0;
    let totalBatches = 0;
    let totalRetained = 0;

    // Rows whose Cloudinary delete failed earlier in this run. We carry
    // them forward as a skip-list so the next page query doesn't refetch
    // them — otherwise the loop would spin on the same broken keys
    // forever (or until MAX_ROWS_PER_RUN trips).
    const retainedIds = new Set<string>();

    /* eslint-disable no-await-in-loop, no-constant-condition */
    while (true) {
      if (totalScanned >= MAX_ROWS_PER_RUN) {
        this.logger.warn(
          `Evidence purge: hit MAX_ROWS_PER_RUN (${MAX_ROWS_PER_RUN}); remaining backlog will be drained by the next cron run.`,
        );
        break;
      }
      if (Date.now() - startedAt > MAX_DURATION_MS) {
        this.logger.warn(
          `Evidence purge: hit MAX_DURATION_MS (${MAX_DURATION_MS}ms); remaining backlog will be drained by the next cron run.`,
        );
        break;
      }

      const stale = await this.prisma.quizAttemptEvidence.findMany({
        where: {
          capturedAt: { lt: threshold },
          ...(retainedIds.size > 0
            ? { id: { notIn: [...retainedIds] } }
            : {}),
        },
        select: { id: true, storageKey: true, mimeType: true, kind: true },
        take: PAGE_SIZE,
      });

      if (stale.length === 0) break;

      const imageKeys: string[] = [];
      const audioKeys: string[] = [];
      const idByKey = new Map<string, string>();
      for (const row of stale) {
        const isAudio =
          row.kind === 'AUDIO' || (row.mimeType || '').startsWith('audio/');
        (isAudio ? audioKeys : imageKeys).push(row.storageKey);
        idByKey.set(row.storageKey, row.id);
      }

      const purgedKeys = new Set<string>();
      const imgPurged = await this.deleteFromCloudinary(imageKeys, 'image');
      totalBatches += Math.ceil(imageKeys.length / CLOUDINARY_BATCH);
      imgPurged.forEach((k) => purgedKeys.add(k));

      const audPurged = await this.deleteFromCloudinary(audioKeys, 'video');
      totalBatches += Math.ceil(audioKeys.length / CLOUDINARY_BATCH);
      audPurged.forEach((k) => purgedKeys.add(k));

      const dbIdsToDelete = [...purgedKeys]
        .map((k) => idByKey.get(k))
        .filter((id): id is string => !!id);

      const result = await this.prisma.quizAttemptEvidence.deleteMany({
        where: { id: { in: dbIdsToDelete } },
      });

      // Anything we pulled but couldn't cloud-delete goes onto the skip
      // list for subsequent pages this run.
      for (const row of stale) {
        if (!purgedKeys.has(row.storageKey)) retainedIds.add(row.id);
      }

      totalScanned += stale.length;
      totalCloudDeleted += purgedKeys.size;
      totalDbDeleted += result.count;
      totalRetained = retainedIds.size;
    }
    /* eslint-enable no-await-in-loop, no-constant-condition */

    if (totalRetained > 0) {
      this.logger.warn(
        `Evidence purge: ${totalRetained} Cloudinary deletes failed — rows retained for retry on next run.`,
      );
    }

    this.logger.log(
      `Evidence purge complete — scanned ${totalScanned}, cloud-deleted ${totalCloudDeleted}, db-deleted ${totalDbDeleted}, batches ${totalBatches}, took ${Math.round((Date.now() - startedAt) / 1000)}s`,
    );

    return {
      scanned: totalScanned,
      deletedDb: totalDbDeleted,
      deletedCloud: totalCloudDeleted,
      batches: totalBatches,
      retained: totalRetained,
    };
  }

  /**
   * Bulk-deletes the given Cloudinary `public_id`s and returns the set
   * of keys that are now gone from the cloud (status === 'deleted' OR
   * 'not_found' — the latter means the asset was already missing, which
   * is fine for our purposes).
   */
  private async deleteFromCloudinary(
    publicIds: string[],
    resourceType: 'image' | 'video',
  ): Promise<Set<string>> {
    const purged = new Set<string>();
    if (publicIds.length === 0) return purged;
    for (let i = 0; i < publicIds.length; i += CLOUDINARY_BATCH) {
      const slice = publicIds.slice(i, i + CLOUDINARY_BATCH);
      try {
        const res = await cloudinary.api.delete_resources(slice, {
          resource_type: resourceType,
          invalidate: true,
        });
        // res.deleted is { [public_id]: 'deleted' | 'not_found' | <error> }
        const entries = Object.entries(res?.deleted || {}) as [string, string][];
        for (const [key, status] of entries) {
          if (status === 'deleted' || status === 'not_found') {
            purged.add(key);
          }
        }
      } catch (err: any) {
        this.logger.error(
          `Cloudinary delete failed for ${slice.length} ${resourceType} assets: ${err?.message}`,
        );
        // Swallow — the keys in this slice stay in `purged`-less, so the
        // DB rows survive for the next cron to retry.
      }
    }
    return purged;
  }
}
