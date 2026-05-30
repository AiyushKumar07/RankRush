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
   *   1. Pull stale rows from Mongo in one query (capped to 5k per run so
   *      we don't blow memory if the job missed several days).
   *   2. Bucket by Cloudinary resource_type (image vs video, the latter
   *      is where audio lives) and bulk-delete 100 at a time.
   *   3. Only after the cloud delete succeeds for a key do we remove the
   *      DB row, so a failed cloud call leaves the row present and the
   *      next run retries it.
   */
  async purgeOlderThan(days: number) {
    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    this.logger.log(
      `Starting proctoring evidence purge — older than ${threshold.toISOString()} (${days}d)`,
    );

    const stale = await this.prisma.quizAttemptEvidence.findMany({
      where: { capturedAt: { lt: threshold } },
      select: { id: true, storageKey: true, mimeType: true, kind: true },
      take: 5000,
    });

    if (stale.length === 0) {
      this.logger.log('No stale evidence to purge.');
      return { scanned: 0, deletedDb: 0, deletedCloud: 0, batches: 0 };
    }

    // Split by Cloudinary resource_type. Audio uploads use resource_type
    // 'video' in our /evidence endpoint, everything else is 'image'.
    // We keep a reverse index from storageKey → DB row id so we can drop
    // only the rows whose cloud asset was confirmed gone (deleted or
    // not_found). Any key that errors stays in the table for the next
    // cron run to retry, so we never orphan Cloudinary storage.
    const imageKeys: string[] = [];
    const audioKeys: string[] = [];
    const idByKey = new Map<string, string>();
    for (const row of stale) {
      const isAudio =
        row.kind === 'AUDIO' || (row.mimeType || '').startsWith('audio/');
      (isAudio ? audioKeys : imageKeys).push(row.storageKey);
      idByKey.set(row.storageKey, row.id);
    }

    let batches = 0;
    const purgedKeys = new Set<string>();

    const imgPurged = await this.deleteFromCloudinary(imageKeys, 'image');
    batches += Math.ceil(imageKeys.length / CLOUDINARY_BATCH);
    imgPurged.forEach((k) => purgedKeys.add(k));

    const audPurged = await this.deleteFromCloudinary(audioKeys, 'video');
    batches += Math.ceil(audioKeys.length / CLOUDINARY_BATCH);
    audPurged.forEach((k) => purgedKeys.add(k));

    const dbIdsToDelete = [...purgedKeys]
      .map((k) => idByKey.get(k))
      .filter((id): id is string => !!id);

    const result = await this.prisma.quizAttemptEvidence.deleteMany({
      where: { id: { in: dbIdsToDelete } },
    });

    const orphans = stale.length - purgedKeys.size;
    if (orphans > 0) {
      this.logger.warn(
        `Evidence purge: ${orphans} Cloudinary deletes failed — rows retained for retry on next run.`,
      );
    }

    this.logger.log(
      `Evidence purge complete — scanned ${stale.length}, cloud-deleted ${purgedKeys.size}, db-deleted ${result.count}, batches ${batches}`,
    );

    return {
      scanned: stale.length,
      deletedDb: result.count,
      deletedCloud: purgedKeys.size,
      batches,
      retained: orphans,
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
