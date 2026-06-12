import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Delete,
  Param,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service.js';
import {
  RegisterDto,
  LoginDto,
  StudentSignupDto,
  GoogleAuthDto,
  VerifyOtpDto,
  ResendOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
  ChangePasswordDto,
  SetPasswordDto,
} from './dto/auth.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ─── Public Routes ──────────────────────────────────────────────────

  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: any) {
    return this.authService.register(dto, req);
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('check-email')
  @HttpCode(HttpStatus.OK)
  checkEmail(@Body('email') email: string) {
    return this.authService.checkEmailAvailability(email);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('student-signup')
  studentSignup(@Body() dto: StudentSignupDto, @Req() req: any) {
    return this.authService.studentSignup(dto, req);
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.login(dto, req);
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('google')
  @HttpCode(HttpStatus.OK)
  googleAuth(@Body() dto: GoogleAuthDto, @Req() req: any) {
    return this.authService.googleAuth(dto, req);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body('userId') userId: string, @Body() dto: VerifyOtpDto) {
    return this.authService.verifyEmail(userId, dto);
  }

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendVerificationOtp(dto.email);
  }

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: any) {
    return this.authService.forgotPassword(dto, req);
  }

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: any) {
    return this.authService.resetPassword(dto, req);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  refreshToken(@Body() dto: RefreshTokenDto, @Req() req: any) {
    return this.authService.refreshToken(dto, req);
  }

  // ─── Protected Routes ───────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @CurrentUser('id') userId: string,
    @Body('refreshToken') refreshToken: string,
    @Req() req: any,
  ) {
    return this.authService.logout(userId, refreshToken, req);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  logoutAll(@CurrentUser('id') userId: string, @Req() req: any) {
    return this.authService.logoutAll(userId, req);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
    @Req() req: any,
  ) {
    return this.authService.changePassword(userId, dto, req);
  }

  @UseGuards(JwtAuthGuard)
  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  setPassword(
    @CurrentUser('id') userId: string,
    @Body() dto: SetPasswordDto,
    @Req() req: any,
  ) {
    return this.authService.setPassword(userId, dto, req);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  @Post('password-strength')
  @HttpCode(HttpStatus.OK)
  passwordStrength(@Body('password') password: string) {
    return this.authService.passwordStrength(password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  getSessions(
    @CurrentUser('id') userId: string,
    @CurrentUser('sessionId') sessionId: string,
  ) {
    return this.authService.getActiveSessions(userId, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  revokeSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
    @Req() req: any,
  ) {
    return this.authService.revokeSessionById(userId, sessionId, req);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('users')
  getUsers() {
    return this.authService.getUsers();
  }
}
