import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CompleteProfileDto, UpdateProfileDto } from './dto/profile.dto.js';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
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
        class: true,
        school: true,
        target: true,
        contactNumber: true,
        profilePicture: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return { data: { user } };
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

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        name: `${dto.firstName} ${dto.lastName}`,
        class: dto.class,
        school: dto.school,
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
    if (dto.class !== undefined) updateData.class = dto.class;
    if (dto.school !== undefined) updateData.school = dto.school;
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
}
