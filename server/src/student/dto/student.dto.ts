import {
  IsOptional,
  IsString,
  IsInt,
  IsArray,
  IsBoolean,
  Min,
  Max,
  ValidateNested,
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

  // Difficulty bucket — values stored on Quiz.difficulty as
  // "EASY" | "MEDIUM" | "HARD" (free text today, matched case-insensitive).
  @IsOptional()
  @IsString()
  difficulty?: string;

  // Time bucket: 'lt10' | '10-20' | 'gt20' — filters Quiz.timeLimitMins.
  @IsOptional()
  @IsString()
  time?: string;

  // Status bucket: 'new' | 'progress' | 'done' (relative to the caller).
  @IsOptional()
  @IsString()
  status?: string;

  // Sort: 'recommended' (default) | 'newest' | 'popular' | 'hardest' | 'shortest'.
  @IsOptional()
  @IsString()
  sort?: string;

  // When true, only quizzes the caller has bookmarked.
  @IsOptional()
  @IsString()
  savedOnly?: string; // sent as 'true' from query strings

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

export class QueryHistoryDto {
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

class AnswerDto {
  @IsString()
  questionId: string;

  @IsArray()
  @IsString({ each: true })
  selectedAnswers: string[];
}

class ProctoringViolationDto {
  @IsString()
  type: string;

  @IsString()
  timestamp: string;

  @IsString()
  details: string;
}

export class SubmitAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  timeTakenSecs?: number;

  @IsOptional()
  @IsBoolean()
  isProctoringFailure?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProctoringViolationDto)
  proctoringViolations?: ProctoringViolationDto[];
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
