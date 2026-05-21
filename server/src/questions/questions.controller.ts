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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { QuestionsService } from './questions.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  UploadQuizBankDto,
  UpdateQuestionDto,
  UpdateStatusDto,
  BulkUpdateStatusDto,
  BulkDeleteDto,
  QueryQuestionsDto,
} from './dto/questions.dto.js';

@Controller('api/questions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QuestionsController {
  constructor(private questionsService: QuestionsService) { }

  @Post('upload')
  @Permissions('questions:create', 'questions:upload')
  upload(
    @Body() dto: UploadQuizBankDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    return this.questionsService.upload(dto, userId, req);
  }

  @Post('image')
  @Permissions('questions:create', 'questions:upload', 'questions:update')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    try {
      return await new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          { folder: 'rankrush' },
          (error, result) => {
            if (error) {
              console.error('Cloudinary error:', error);
              return reject(new BadRequestException(`Cloudinary upload failed: ${error.message || JSON.stringify(error)}`));
            }
            if (!result)
              return reject(new BadRequestException('No result from Cloudinary'));
            resolve({ url: result.secure_url, key: result.public_id });
          },
        );
        const stream = Readable.from(file.buffer);
        stream.pipe(upload);
      });
    } catch (err: any) {
      console.error('Upload catch error:', err);
      throw new BadRequestException(err.message || 'Unknown error');
    }
  }

  @Get()
  @Permissions('questions:read')
  findAll(@Query() query: QueryQuestionsDto) {
    return this.questionsService.findAll(query);
  }

  @Get('filters')
  @Permissions('questions:read')
  getFilterOptions() {
    return this.questionsService.getFilterOptions();
  }

  @Get('filters/dynamic')
  @Permissions('questions:read')
  getDynamicFilterOptions(
    @Query('examType') examType?: string,
    @Query('class') className?: string,
    @Query('subject') subject?: string,
  ) {
    return this.questionsService.getDynamicFilterOptions({ examType, class: className, subject });
  }

  @Get(':id')
  @Permissions('questions:read')
  findById(@Param('id') id: string) {
    return this.questionsService.findById(id);
  }

  @Put(':id')
  @Permissions('questions:update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    try {
      return await this.questionsService.update(id, dto, userId, req);
    } catch (e: any) {
      throw new BadRequestException(`Update failed: ${e.message || e}`);
    }
  }

  @Patch(':id/status')
  @Permissions('questions:review', 'questions:approve', 'questions:publish')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    return this.questionsService.updateStatus(id, dto, userId, req);
  }

  @Post('bulk-status')
  @Permissions('questions:review', 'questions:approve')
  bulkUpdateStatus(
    @Body() dto: BulkUpdateStatusDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    return this.questionsService.bulkUpdateStatus(dto, userId, req);
  }

  @Post('bulk-delete')
  @Permissions('questions:create')
  bulkDelete(
    @Body() dto: BulkDeleteDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    return this.questionsService.bulkRemove(dto.questionIds, userId, req);
  }

  @Delete(':id')
  @Permissions('questions:create')
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    return this.questionsService.remove(id, userId, req);
  }
}
