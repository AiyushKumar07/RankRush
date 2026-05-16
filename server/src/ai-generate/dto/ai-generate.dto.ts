import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  ValidateNested,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuestionTypeQuantityDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsNumber()
  @Min(1)
  @Max(20)
  count: number;
}

export class AiGenerateRequestDto {
  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsOptional()
  @IsString()
  subTopic?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionTypeQuantityDto)
  questionTypes: QuestionTypeQuantityDto[];

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsString()
  className?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  examType?: string[];

  @IsOptional()
  @IsString()
  additionalInstructions?: string;

  /** Encrypted API key from frontend (optional — falls back to env key) */
  @IsOptional()
  @IsString()
  encryptedApiKey?: string;

  /** Model ID to use (optional — uses provider default) */
  @IsOptional()
  @IsString()
  model?: string;
}

export class RetryJobDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;

  @IsOptional()
  @IsString()
  encryptedApiKey?: string;
}

export class VerifyKeyDto {
  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsString()
  @IsNotEmpty()
  apiKey: string;
}

export class EncryptKeyDto {
  @IsString()
  @IsNotEmpty()
  apiKey: string;
}

export class ListModelsDto {
  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsString()
  @IsNotEmpty()
  apiKey: string;
}
