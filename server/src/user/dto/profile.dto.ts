import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsIn,
  ArrayMinSize,
  Matches,
  MaxLength,
  IsBoolean,
  ValidateIf,
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
  @IsOptional()
  dob?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  class: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  school?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  board?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  stream?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(VALID_TARGETS, { each: true })
  target: (typeof VALID_TARGETS)[number][];

  @ValidateIf((o) => o.contactNumber !== undefined && o.contactNumber !== '')
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'Contact number must be a valid phone number',
  })
  contactNumber?: string;

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
  dob?: string;

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
  @MaxLength(50)
  stream?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  school?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @IsArray()
  @IsOptional()
  @IsIn(VALID_TARGETS, { each: true })
  target?: (typeof VALID_TARGETS)[number][];

  @ValidateIf((o) => o.contactNumber !== undefined && o.contactNumber !== '')
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'Contact number must be a valid phone number',
  })
  contactNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;
}

export class UpdatePreferenceDto {
  @IsString()
  @IsOptional()
  @IsIn(['light', 'dark', 'auto'])
  theme?: string;

  @IsBoolean()
  @IsOptional()
  reduceMotion?: boolean;

  @IsBoolean()
  @IsOptional()
  compactLayout?: boolean;

  @IsBoolean()
  @IsOptional()
  emailWeeklyRank?: boolean;

  @IsBoolean()
  @IsOptional()
  emailProductUpdates?: boolean;

  @IsBoolean()
  @IsOptional()
  pushStreakExpire?: boolean;

  @IsBoolean()
  @IsOptional()
  pushRankMovement?: boolean;

  @IsBoolean()
  @IsOptional()
  pushWeakTopics?: boolean;

  @IsBoolean()
  @IsOptional()
  pushFriendJoins?: boolean;

  @IsBoolean()
  @IsOptional()
  pushStreakReminder?: boolean;
}
