import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StudentService } from './student.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  QueryStudentQuizzesDto,
  SubmitAttemptDto,
  QueryActivityDto,
} from './dto/student.dto.js';

@Controller('api/student')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
export class StudentController {
  constructor(private studentService: StudentService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser('id') userId: string) {
    return this.studentService.getDashboard(userId);
  }

  @Get('stats')
  getStats(@CurrentUser('id') userId: string) {
    return this.studentService.getStats(userId);
  }

  @Get('quizzes')
  listQuizzes(
    @CurrentUser('id') userId: string,
    @Query() query: QueryStudentQuizzesDto,
  ) {
    return this.studentService.listQuizzes(userId, query);
  }

  @Get('quizzes/:id')
  getQuiz(@Param('id') id: string) {
    return this.studentService.getQuizForStudent(id);
  }

  @Post('quizzes/:id/start')
  startAttempt(@CurrentUser('id') userId: string, @Param('id') quizId: string) {
    return this.studentService.startAttempt(userId, quizId);
  }

  @Post('quizzes/:id/submit')
  submitAttempt(
    @CurrentUser('id') userId: string,
    @Param('id') quizId: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    return this.studentService.submitAttempt(userId, quizId, dto);
  }

  @Get('activity')
  getActivity(
    @CurrentUser('id') userId: string,
    @Query() query: QueryActivityDto,
  ) {
    return this.studentService.getActivity(userId, query);
  }
}
