import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync, IsOptional, IsBoolean, IsArray, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class SubmitAttemptDto {
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

  @IsOptional()
  @IsBoolean()
  isProctoringFailure?: boolean;

  @IsOptional()
  @IsArray()
  proctoringViolations?: Array<{
    type: string;
    timestamp: string;
    details: string;
  }>;
}

const payload = {
  answers: [{ questionId: 'q1', selectedAnswers: ['a1'] }],
  timeTakenSecs: 39,
  isProctoringFailure: true,
  proctoringViolations: [{ type: 'TAB', details: 'info', timestamp: 'now' }]
};

const instance = plainToInstance(SubmitAttemptDto, payload, { enableImplicitConversion: true });
const errors = validateSync(instance, { whitelist: true, forbidNonWhitelisted: false });

console.log('Errors:', errors);
console.log('Instance:', JSON.stringify(instance, null, 2));
