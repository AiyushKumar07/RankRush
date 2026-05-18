import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsIn,
  ArrayMinSize,
  Matches,
  MaxLength,
} from 'class-validator';

const VALID_TARGETS = ['Boards', 'NEET', 'JEE', 'Other'] as const;

export class CompleteProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  class: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  school: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(VALID_TARGETS, { each: true })
  target: (typeof VALID_TARGETS)[number][];

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'Contact number must be a valid phone number',
  })
  contactNumber: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;
}

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  firstName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  lastName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  class?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  school?: string;

  @IsArray()
  @IsOptional()
  @IsIn(VALID_TARGETS, { each: true })
  target?: (typeof VALID_TARGETS)[number][];

  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'Contact number must be a valid phone number',
  })
  contactNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;
}
