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
import { QuestionType, Difficulty, WorkflowStatus } from '@prisma/client';

export class OptionDto {
  @IsString()
  id: string;

  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class MatchPairDto {
  @IsString()
  left: string;

  @IsString()
  right: string;
}

export class SubQuestionDto {
  @IsString()
  question: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options: OptionDto[];

  @IsArray()
  @IsString({ each: true })
  correctAnswer: string[];
}

export class CaseStudyDto {
  @IsOptional()
  @IsString()
  passage?: string;

  @IsOptional()
  @IsString()
  passageImageUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubQuestionDto)
  subQuestions: SubQuestionDto[];
}

export class AnswerExplanationDto {
  @IsOptional()
  @IsString()
  correctExplanation?: string;

  @IsOptional()
  incorrectExplanation?: any;
}

export class UploadQuizBankDto {
  @IsArray()
  @ArrayMinSize(1)
  quizBank: any[];

  @IsOptional()
  @IsString()
  fileName?: string;
}

export class UpdateQuestionDto {
  @IsOptional() @IsString() question?: string;
  @IsOptional() @IsString() topic?: string;
  @IsOptional() @IsString() subTopic?: string;
  @IsOptional() @IsEnum(Difficulty) difficulty?: Difficulty;
  @IsOptional() @IsNumber() estimatedTimeSeconds?: number;
  @IsOptional() @IsNumber() marks?: number;
  @IsOptional() @IsNumber() negativeMarks?: number;
  @IsOptional() @IsString() changeReason?: string;
  @IsOptional() @IsString() chapter?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsArray() correctAnswer?: string[];
  
  @IsOptional() 
  @IsArray() 
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options?: OptionDto[];
  @IsOptional() @IsArray() PYQ_tags?: string[];
  @IsOptional() @IsArray() commonMisconceptions?: string[];
  @IsOptional() @IsString() assertionStatement?: string;
  @IsOptional() @IsString() reasonStatement?: string;
  @IsOptional() @IsString() questionImageUrl?: string;
  @IsOptional() 
  @IsArray() 
  @ValidateNested({ each: true })
  @Type(() => MatchPairDto)
  matchPairs?: MatchPairDto[];

  @IsOptional() 
  @ValidateNested()
  @Type(() => CaseStudyDto)
  caseStudy?: CaseStudyDto;

  @IsOptional() 
  @ValidateNested()
  @Type(() => AnswerExplanationDto)
  answerExplanation?: AnswerExplanationDto;
  @IsOptional() @IsBoolean() isDiagramBased?: boolean;
  @IsOptional() @IsBoolean() isCaseBased?: boolean;
  @IsOptional() @IsBoolean() isNcertLineBased?: boolean;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsString() class?: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsArray() examType?: string[];
  @IsOptional() @IsEnum(QuestionType) questionType?: QuestionType;
  @IsOptional() @IsString() questionId?: string;
}

export class UpdateStatusDto {
  @IsEnum(WorkflowStatus)
  status: WorkflowStatus;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class BulkUpdateStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  questionIds: string[];

  @IsEnum(WorkflowStatus)
  status: WorkflowStatus;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class QueryQuestionsDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number;
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number;
  @IsOptional() @IsEnum(WorkflowStatus) status?: WorkflowStatus;
  @IsOptional() @IsEnum(QuestionType) questionType?: QuestionType;
  @IsOptional() @IsEnum(Difficulty) difficulty?: Difficulty;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() chapter?: string;
  @IsOptional() @IsString() topic?: string;
  @IsOptional() @IsString() class?: string;
  @IsOptional() @IsString() examType?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() uploadBatchId?: string;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @IsString() sortOrder?: string;
}
