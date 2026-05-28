import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import * as crypto from 'crypto';

@Injectable()
export class BloomFilterService implements OnModuleInit {
  private readonly logger = new Logger(BloomFilterService.name);
  private bitArray: Uint8Array;
  private readonly size: number;
  private readonly hashFunctionsCount: number;

  constructor(private readonly prisma: PrismaService) {
    // 10 million bits (~1.2MB) - good for millions of users with low false positive rate
    this.size = 10000000;
    this.bitArray = new Uint8Array(Math.ceil(this.size / 8));
    this.hashFunctionsCount = 5;
  }

  async onModuleInit() {
    this.logger.log('Initializing Username Bloom Filter...');
    const startTime = Date.now();
    
    // In production, you might paginate this if there are tens of millions of users.
    // For now, fetching all usernames to hydrate.
    const users = await this.prisma.user.findMany({
      where: { username: { not: null } },
      select: { username: true },
    });

    for (const user of users) {
      if (user.username) {
        this.add(user.username.toLowerCase());
      }
    }

    this.logger.log(`Bloom Filter hydrated with ${users.length} usernames in ${Date.now() - startTime}ms`);
  }

  private getHashes(item: string): number[] {
    const hashes: number[] = [];
    // Base hash from MD5
    const hashHex = crypto.createHash('md5').update(item).digest('hex');
    
    // We can get multiple hashes by slicing the MD5 output
    for (let i = 0; i < this.hashFunctionsCount; i++) {
      const slice = hashHex.substring(i * 6, (i + 1) * 6);
      const hashVal = parseInt(slice, 16);
      hashes.push(hashVal % this.size);
    }
    return hashes;
  }

  add(item: string) {
    const hashes = this.getHashes(item);
    for (const hash of hashes) {
      const byteIndex = Math.floor(hash / 8);
      const bitIndex = hash % 8;
      this.bitArray[byteIndex] |= (1 << bitIndex);
    }
  }

  /**
   * Check if item might be in the filter.
   * Returns false if DEFINITELY not in the filter.
   * Returns true if POSSIBLY in the filter (requires DB check).
   */
  mightContain(item: string): boolean {
    const hashes = this.getHashes(item);
    for (const hash of hashes) {
      const byteIndex = Math.floor(hash / 8);
      const bitIndex = hash % 8;
      if ((this.bitArray[byteIndex] & (1 << bitIndex)) === 0) {
        return false;
      }
    }
    return true;
  }
}
