import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Delete,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service.js';
import { CompleteProfileDto, UpdateProfileDto, UpdatePreferenceDto } from './dto/profile.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { EntitlementsService } from '../entitlements/entitlements.service.js';

@UseGuards(JwtAuthGuard)
@Controller('api/user')
export class UserController {
  constructor(
    private userService: UserService,
    private entitlements: EntitlementsService,
  ) {}

  @Get('profile')
  getProfile(@CurrentUser('id') userId: string) {
    return this.userService.getProfile(userId);
  }

  @Get('me/entitlements')
  async getEntitlements(@CurrentUser('id') userId: string) {
    const result = await this.entitlements.getEntitlements(userId);
    const serializable: Record<string, { included: boolean; cap: number | 'UNLIMITED'; value: string | null }> = {};
    for (const [key, ent] of Object.entries(result.entitlements)) {
      serializable[key] = {
        included: ent.included,
        cap: Number.isFinite(ent.cap) ? ent.cap : 'UNLIMITED',
        value: ent.value,
      };
    }
    return { ...result, entitlements: serializable };
  }

  @Post('profile/complete')
  completeProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: CompleteProfileDto,
    @Req() req: any,
  ) {
    return this.userService.completeProfile(userId, dto, req);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
    @Req() req: any,
  ) {
    return this.userService.updateProfile(userId, dto, req);
  }

  @Post('profile/picture')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined, // memory storage
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadProfilePicture(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.userService.uploadProfilePicture(userId, file, req);
  }

  @Get('preferences')
  getPreferences(@CurrentUser('id') userId: string) {
    return this.userService.getPreferences(userId);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePreferenceDto,
    @Req() req: any,
  ) {
    return this.userService.updatePreferences(userId, dto, req);
  }

  @Post('reset-progress')
  @HttpCode(HttpStatus.OK)
  resetProgress(@CurrentUser('id') userId: string, @Req() req: any) {
    return this.userService.resetProgress(userId, req);
  }

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  deleteAccount(@CurrentUser('id') userId: string, @Req() req: any) {
    return this.userService.deleteAccount(userId, req);
  }
}
