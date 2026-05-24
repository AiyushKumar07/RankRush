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
