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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cohort?: string[];

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

  // Tokens deducted per attempt. Defaults to 1 server-side; admin can pass 0
  // for free practice or a higher value for premium quizzes.
  @IsOptional()
  @IsNumber()
  @Min(0)
  attemptCost?: number;

  // When true, the quiz contributes to global rank scoring and gets its own
  // per-quiz leaderboard. Off by default; only admins should turn this on
  // (it's exposed via the create wizard for first-class contest quizzes).
  @IsOptional()
  @IsBoolean()
  rankRewarding?: boolean;

  // Optional contest window — ISO datetime strings on the wire, converted
  // to Date in the service. Only meaningful when rankRewarding is true.
  @IsOptional()
  @IsString()
  quizStartsAt?: string;

  @IsOptional()
  @IsString()
  quizEndsAt?: string;
}

export class UpdateQuizDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() chapter?: string;
  @IsOptional() @IsString() topic?: string;
  @IsOptional() @IsString() className?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) examType?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) cohort?: string[];

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
  // When true, the quiz contributes to the global rank score and gets its
  // own per-quiz leaderboard. Off by default.
  @IsOptional() @IsBoolean() rankRewarding?: boolean;
  // Contest window — ISO strings on the wire, dates server-side.
  @IsOptional() @IsString() quizStartsAt?: string;
  @IsOptional() @IsString() quizEndsAt?: string;
  @IsOptional() @IsNumber() @Min(0) attemptCost?: number;
}

export class UpdateQuizStatusDto {
  @IsString()
  status: string;
}

export class UpdateRankRewardingDto {
  @IsBoolean()
  rankRewarding: boolean;
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
