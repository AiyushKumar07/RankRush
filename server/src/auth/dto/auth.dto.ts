import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsArray,
  IsIn,
} from 'class-validator';
import { Role } from '@prisma/client';

const VALID_TARGETS = ['Boards', 'NEET', 'JEE', 'Other'] as const;

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}

export class StudentSignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(64, { message: 'Password must not exceed 64 characters' })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

  @IsString()
  @IsOptional()
  referralCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  class?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  board?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  school?: string;

  @IsArray()
  @IsOptional()
  @IsIn(VALID_TARGETS, { each: true })
  target?: (typeof VALID_TARGETS)[number][];
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class GoogleAuthDto {
  // The Google ID token (JWT credential) returned by Google Identity Services
  // on the client. Verified server-side against Google's certs.
  @IsString()
  @IsNotEmpty()
  idToken: string;

  // Optional referral code carried through from the signup form for new
  // Google accounts. Ignored for users who already exist.
  @IsString()
  @IsOptional()
  referralCode?: string;
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class ResendOtpDto {
  @IsEmail()
  email: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  otp: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(64, { message: 'Password must not exceed 64 characters' })
  newPassword: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(64, { message: 'Password must not exceed 64 characters' })
  newPassword: string;
}

// Sets an initial password for accounts that have none (e.g. Google SSO users
// during onboarding). Distinct from ChangePasswordDto, which requires the
// current password — these accounts don't have one yet.
export class SetPasswordDto {
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(64, { message: 'Password must not exceed 64 characters' })
  newPassword: string;
}
