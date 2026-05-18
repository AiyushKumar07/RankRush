import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service.js';
import { CompleteProfileDto, UpdateProfileDto } from './dto/profile.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard)
@Controller('api/user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  getProfile(@CurrentUser('id') userId: string) {
    return this.userService.getProfile(userId);
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
}
