import {
  Controller,
  Get,
  Post,
  Delete,
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
  QueryHistoryDto,
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

  // Subject facets + saved/history counts for the QuizzesPage tab bar.
  // Must be declared BEFORE the `:id` route so it doesn't get swallowed as
  // a quiz id lookup.
  @Get('quizzes/facets')
  getQuizFacets(@CurrentUser('id') userId: string) {
    return this.studentService.getQuizFacets(userId);
  }

  // Saved quizzes — same shape as listQuizzes, just pre-filtered.
  @Get('quizzes/saved')
  listSavedQuizzes(@CurrentUser('id') userId: string) {
    return this.studentService.listSavedQuizzes(userId);
  }

  // Quiz history — completed attempts grouped by quiz, each row decorated
  // with best %, last attempt timestamp, attempt count, and (if the quiz is
  // rank-rewarding) the user's per-quiz leaderboard rank + total participants.
  @Get('quizzes/history')
  getQuizHistory(
    @CurrentUser('id') userId: string,
    @Query() query: QueryHistoryDto,
  ) {
    return this.studentService.getQuizHistory(userId, query);
  }

  // Today's pick — prefers an in-progress attempt, then an upcoming/live
  // rank-rewarding contest, then falls back to a weak-topic suggestion.
  @Get('quizzes/todays-pick')
  getTodaysPick(@CurrentUser('id') userId: string) {
    return this.studentService.getTodaysPick(userId);
  }

  // Streak garden — last N days of login + quiz activity for the heat grid.
  @Get('streak-garden')
  getStreakGarden(
    @CurrentUser('id') userId: string,
    @Query('days') days?: string,
  ) {
    const n = days ? parseInt(days, 10) : 60;
    return this.studentService.getStreakGarden(userId, Number.isFinite(n) ? n : 60);
  }

  // Weekly chart — 7-day per-day breakdown of quizzes / questions / accuracy
  // plus totals + week-over-week question delta. Drives the dashboard chart.
  @Get('weekly-chart')
  getWeeklyChart(@CurrentUser('id') userId: string) {
    return this.studentService.getWeeklyChart(userId);
  }

  // Topic analytics — overall accuracy + strong/weak topics + by-subject.
  // Used by both the dashboard "Topic insights" card (limit=4) and the
  // standalone /app/analytics page (limit=20+).
  @Get('topic-analytics')
  getTopicAnalytics(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? parseInt(limit, 10) : undefined;
    return this.studentService.getTopicAnalytics(userId, {
      limit: Number.isFinite(n) ? n : undefined,
    });
  }

  @Get('quizzes/:id')
  getQuiz(@Param('id') id: string) {
    return this.studentService.getQuizForStudent(id);
  }

  @Post('quizzes/:id/save')
  saveQuiz(@CurrentUser('id') userId: string, @Param('id') quizId: string) {
    return this.studentService.saveQuiz(userId, quizId);
  }

  @Delete('quizzes/:id/save')
  unsaveQuiz(@CurrentUser('id') userId: string, @Param('id') quizId: string) {
    return this.studentService.unsaveQuiz(userId, quizId);
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
