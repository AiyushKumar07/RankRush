import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CompleteProfileDto, UpdateProfileDto, UpdatePreferenceDto } from './dto/profile.dto.js';
import { BloomFilterService } from './bloom-filter.service.js';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private bloomFilter: BloomFilterService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        isVerified: true,
        isOnboarded: true,
        firstName: true,
        lastName: true,
        dob: true,
        username: true,
        class: true,
        board: true,
        stream: true,
        school: true,
        city: true,
        target: true,
        contactNumber: true,
        profilePicture: true,
        address: true,
        streak: true,
        longestStreak: true,
        bestRank: true,
        passwordChangedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    if (!user.username) {
      const newUsername = await this.generateUniqueUsername(user.firstName ?? '', user.lastName ?? '');
      await this.prisma.user.update({
        where: { id: userId },
        data: { username: newUsername },
      });
      user.username = newUsername;
    }

    const [quizCount, accuracyAgg] = await Promise.all([
      this.prisma.quizAttempt.count({
        where: { studentId: userId, status: 'COMPLETED' },
      }),
      this.prisma.quizAttempt.aggregate({
        where: { studentId: userId, status: 'COMPLETED' },
        _avg: { percentage: true },
      }),
    ]);

    const stats = {
      streak: user.streak ?? 0,
      longestStreak: user.longestStreak ?? 0,
      quizzes: quizCount,
      accuracy: accuracyAgg._avg.percentage != null
        ? Math.round(accuracyAgg._avg.percentage)
        : 0,
      bestRank: user.bestRank,
    };

    return { data: { user: { ...user, stats } } };
  }

  private async generateUniqueUsername(firstName: string, lastName?: string): Promise<string> {
    const fName = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const lName = lastName ? lastName.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    
    let username = '';
    
    while (true) {
      const trimmedUuid = crypto.randomUUID().split('-')[0];
      username = `${fName}-${trimmedUuid}`;
      
      let exists = this.bloomFilter.mightContain(username);
      if (exists) {
        const existing = await this.prisma.user.findUnique({ where: { username } });
        if (!existing) exists = false;
      }
      
      if (!exists) break;
      
      if (lName) {
        const fullUuid = crypto.randomUUID();
        username = `${lName}-${fullUuid}`;
        
        exists = this.bloomFilter.mightContain(username);
        if (exists) {
          const existing = await this.prisma.user.findUnique({ where: { username } });
          if (!existing) exists = false;
        }
        
        if (!exists) break;
      }
    }
    
    this.bloomFilter.add(username);
    return username;
  }

  async completeProfile(userId: string, dto: CompleteProfileDto, req?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.isOnboarded) {
      throw new BadRequestException(
        'Profile already completed. Use the update endpoint instead.',
      );
    }

    let username = user.username;
    if (!username && dto.firstName) {
      username = await this.generateUniqueUsername(dto.firstName, dto.lastName);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        username: username,
        name: `${dto.firstName} ${dto.lastName}`,
        dob: dto.dob,
        class: dto.class,
        board: dto.board,
        stream: dto.stream,
        school: dto.school,
        city: dto.city,
        target: dto.target,
        contactNumber: dto.contactNumber,
        address: dto.address,
        isOnboarded: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isOnboarded: true,
        firstName: true,
        lastName: true,
        class: true,
        school: true,
        target: true,
        contactNumber: true,
        profilePicture: true,
        address: true,
      },
    });

    await this.audit.log({
      action: 'PROFILE_UPDATED',
      entityType: 'User',
      entityId: userId,
      performedBy: userId,
      details: { event: 'profile_onboarding_complete' },
      req,
    });

    this.logger.log(`Profile onboarding completed for user ${userId}`);

    return {
      message: 'Profile setup complete!',
      data: { user: updated },
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, req?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    const updateData: any = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.firstName || dto.lastName) {
      updateData.name =
        `${dto.firstName ?? user.firstName ?? ''} ${dto.lastName ?? user.lastName ?? ''}`.trim();
    }
    if (dto.dob !== undefined) updateData.dob = dto.dob;
    if (dto.class !== undefined) updateData.class = dto.class;
    if (dto.board !== undefined) updateData.board = dto.board;
    if (dto.stream !== undefined) updateData.stream = dto.stream;
    if (dto.school !== undefined) updateData.school = dto.school;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.target !== undefined) updateData.target = dto.target;
    if (dto.contactNumber !== undefined)
      updateData.contactNumber = dto.contactNumber;
    if (dto.address !== undefined) updateData.address = dto.address;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isOnboarded: true,
        firstName: true,
        lastName: true,
        dob: true,
        username: true,
        class: true,
        board: true,
        stream: true,
        school: true,
        city: true,
        target: true,
        contactNumber: true,
        profilePicture: true,
        address: true,
      },
    });

    await this.audit.log({
      action: 'PROFILE_UPDATED',
      entityType: 'User',
      entityId: userId,
      performedBy: userId,
      details: { updatedFields: Object.keys(dto) },
      req,
    });

    return {
      message: 'Profile updated',
      data: { user: updated },
    };
  }

  async uploadProfilePicture(
    userId: string,
    file: Express.Multer.File,
    req?: any,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be under 5MB.');
    }

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'rankrush/profiles',
          public_id: `profile_${userId}`,
          overwrite: true,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      uploadStream.end(file.buffer);
    });

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        profilePicture: result.secure_url,
        avatar: result.secure_url,
      },
      select: {
        id: true,
        profilePicture: true,
        avatar: true,
      },
    });

    await this.audit.log({
      action: 'PROFILE_UPDATED',
      entityType: 'User',
      entityId: userId,
      performedBy: userId,
      details: { event: 'profile_picture_uploaded' },
      req,
    });

    this.logger.log(`Profile picture uploaded for user ${userId}`);

    return {
      message: 'Profile picture uploaded',
      data: { profilePicture: updated.profilePicture },
    };
  }

  async getPreferences(userId: string) {
    let prefs = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await this.prisma.userPreference.create({
        data: { userId },
      });
    }

    return { data: prefs };
  }

  async updatePreferences(userId: string, dto: UpdatePreferenceDto, req?: any) {
    let prefs = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await this.prisma.userPreference.create({
        data: { userId, ...dto },
      });
    } else {
      prefs = await this.prisma.userPreference.update({
        where: { userId },
        data: dto,
      });
    }

    await this.audit.log({
      action: 'PROFILE_UPDATED',
      entityType: 'UserPreference',
      entityId: userId,
      performedBy: userId,
      details: { updatedFields: Object.keys(dto) },
      req,
    });

    return { message: 'Preferences updated', data: prefs };
  }

  async resetProgress(userId: string, req?: any) {
    // Delete all quiz attempts
    await this.prisma.quizAttempt.deleteMany({
      where: { studentId: userId },
    });

    // Delete all student activities
    await this.prisma.studentActivity.deleteMany({
      where: { studentId: userId },
    });

    // Reset user gamification stats
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        streak: 0,
        longestStreak: 0,
        loginXp: 0,
      },
    });

    await this.audit.log({
      action: 'UPDATE',
      entityType: 'User',
      entityId: userId,
      performedBy: userId,
      details: { event: 'progress_reset' },
      req,
    });

    this.logger.log(`Progress reset for user ${userId}`);

    return { message: 'Progress has been reset', data: updated };
  }

  /**
   * Move the user to a different class (Class 9/10/11/12/Dropper) and
   * wipe everything tied to the old cohort. We can't just patch the
   * class field — the user's leaderboard partition, rank snapshots,
   * period-stats rows, and quiz attempts all index by class either
   * directly or via CLASS_GLOBAL scope ids. Letting them switch in
   * place would leave the old cohort's data masquerading as the new
   * one's, breaking ranks for everyone.
   *
   * So: same wipe as resetProgress + the class update, in a single
   * audit-logged operation.
   */
  async changeClass(userId: string, newClass: string, req?: any) {
    if (!newClass || typeof newClass !== 'string') {
      throw new BadRequestException('A class value is required');
    }
    const trimmed = newClass.trim();
    if (!trimmed) {
      throw new BadRequestException('A class value is required');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Bail early if nothing would actually change so we don't wipe
    // progress on an accidental "save" with the same value.
    if (user.class === trimmed) {
      return {
        message: 'No change — already on this class.',
        data: { class: user.class },
      };
    }

    await this.prisma.quizAttempt.deleteMany({ where: { studentId: userId } });
    await this.prisma.studentActivity.deleteMany({
      where: { studentId: userId },
    });

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        class: trimmed,
        streak: 0,
        longestStreak: 0,
        loginXp: 0,
      },
    });

    await this.audit.log({
      action: 'UPDATE',
      entityType: 'User',
      entityId: userId,
      performedBy: userId,
      details: {
        event: 'class_change_with_reset',
        from: user.class,
        to: trimmed,
      },
      req,
    });

    this.logger.log(
      `Class changed for user ${userId}: ${user.class ?? '(none)'} → ${trimmed}; progress reset.`,
    );

    return {
      message: 'Class updated and progress reset.',
      data: updated,
    };
  }

  async deleteAccount(userId: string, req?: any) {
    // Relying on Prisma's onDelete: Cascade where applicable.
    // Ensure the user actually exists.
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.delete({
      where: { id: userId },
    });

    await this.audit.log({
      action: 'DELETE',
      entityType: 'User',
      entityId: userId,
      performedBy: userId,
      details: { event: 'account_deleted', email: user.email },
      req,
    });

    this.logger.log(`Account deleted for user ${userId}`);

    return { message: 'Account permanently deleted' };
  }
}
