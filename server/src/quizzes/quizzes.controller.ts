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
  BadRequestException,
} from '@nestjs/common';
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
