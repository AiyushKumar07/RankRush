import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { QuizzesService } from './quizzes.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  CreateQuizDto,
  UpdateQuizDto,
  UpdateQuizStatusDto,
  UpdateRankRewardingDto,
  QueryQuizzesDto,
} from './dto/quizzes.dto.js';

@Controller('api/quizzes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QuizzesController {
  constructor(private quizzesService: QuizzesService) {}

  @Post()
  @Permissions('quizzes:create')
  async create(
    @Body() dto: CreateQuizDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    try {
      return await this.quizzesService.create(dto, userId, req);
    } catch (e: any) {
      throw new BadRequestException(`Create failed: ${e.message || e}`);
    }
  }

  @Get()
  @Permissions('quizzes:read')
  findAll(@Query() query: QueryQuizzesDto) {
    return this.quizzesService.findAll(query);
  }

  // Sits BEFORE @Get(':id') on purpose — Nest matches routes in declaration
  // order and `:id` would otherwise swallow the `export.csv` path.
  @Get('export.csv')
  @Permissions('quizzes:read')
  async exportCsv(@Query() query: QueryQuizzesDto, @Res() res: Response) {
    const csv = await this.quizzesService.exportCsv(query);
    const filename = `rankrush-quizzes-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get(':id')
  @Permissions('quizzes:read')
  findById(@Param('id') id: string) {
    return this.quizzesService.findById(id);
  }

  @Put(':id')
  @Permissions('quizzes:update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuizDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    try {
      return await this.quizzesService.update(id, dto, userId, req);
    } catch (e: any) {
      throw new BadRequestException(`Update failed: ${e.message || e}`);
    }
  }

  @Patch(':id/status')
  @Permissions('quizzes:update')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateQuizStatusDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    return this.quizzesService.updateStatus(id, dto, userId, req);
  }

  @Patch(':id/rank-rewarding')
  @Permissions('quizzes:update')
  updateRankRewarding(
    @Param('id') id: string,
    @Body() dto: UpdateRankRewardingDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    return this.quizzesService.updateRankRewarding(
      id,
      dto.rankRewarding,
      userId,
      req,
    );
  }

  @Post(':id/close-leaderboard')
  @Permissions('quizzes:update')
  closeLeaderboard(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    return this.quizzesService.closeQuizNow(id, userId, req);
  }

  @Delete(':id')
  @Permissions('quizzes:delete')
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    return this.quizzesService.remove(id, userId, req);
  }
}
