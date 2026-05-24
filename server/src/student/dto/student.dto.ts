import {
  IsOptional,
  IsString,
  IsInt,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryStudentQuizzesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  type?: string; // 'PRACTICE_PAPER' | 'FULL_MOCK' | 'PYQ' | null for regular

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class SubmitAttemptDto {
  @IsArray()
  answers: Array<{
    questionId: string;
    selectedAnswers: string[];
  }>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  timeTakenSecs?: number;
}

export class QueryActivityDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
