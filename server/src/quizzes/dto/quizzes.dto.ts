import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QuizQuestionDto {
  @IsString()
  questionId: string;

  @IsNumber()
  order: number;

  @IsOptional()
  @IsNumber()
  marks?: number;
}

export class CreateQuizDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsOptional()
  @IsString()
  chapter?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  className?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  examType?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions: QuizQuestionDto[];

  @IsOptional()
  @IsNumber()
  timeLimitMins?: number;

  @IsOptional()
  @IsBoolean()
  negativeMarking?: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateQuizDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() chapter?: string;
  @IsOptional() @IsString() topic?: string;
  @IsOptional() @IsString() className?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) examType?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions?: QuizQuestionDto[];

  @IsOptional() @IsNumber() timeLimitMins?: number;
  @IsOptional() @IsBoolean() negativeMarking?: boolean;
  @IsOptional() @IsBoolean() shuffleQuestions?: boolean;
  @IsOptional() @IsString() difficulty?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class UpdateQuizStatusDto {
  @IsString()
  status: string;
}

export class QueryQuizzesDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number;

  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @IsString() sortOrder?: string;
}
