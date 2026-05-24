import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AiGenerateService } from './ai-generate.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  AiGenerateRequestDto,
  RetryJobDto,
  VerifyKeyDto,
  EncryptKeyDto,
  ListModelsDto,
} from './dto/ai-generate.dto.js';

@Controller('api/ai-generate')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AiGenerateController {
  constructor(private aiGenerateService: AiGenerateService) {}

  /** POST /api/ai-generate — Generate questions */
  @Post()
  @Permissions('questions:create')
  generate(
    @Body() dto: AiGenerateRequestDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    return this.aiGenerateService.generate(dto, userId, req);
  }

  /** POST /api/ai-generate/retry — Retry failed/partial job */
  @Post('retry')
  @Permissions('questions:create')
  retry(
    @Body() dto: RetryJobDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    return this.aiGenerateService.retry(
      dto.jobId,
      userId,
      req,
      dto.encryptedApiKey,
    );
  }

  /** POST /api/ai-generate/verify-key — Verify an API key */
  @Post('verify-key')
  @Permissions('questions:create')
  verifyKey(@Body() dto: VerifyKeyDto) {
    return this.aiGenerateService.verifyKey(dto.provider, dto.apiKey);
  }

  /** POST /api/ai-generate/encrypt-key — Encrypt an API key for safe storage */
  @Post('encrypt-key')
  @Permissions('questions:create')
  encryptKey(@Body() dto: EncryptKeyDto, @CurrentUser('id') userId: string) {
    return this.aiGenerateService.encrypt(dto.apiKey, userId);
  }

  /** POST /api/ai-generate/models — List models for a provider */
  @Post('models')
  @Permissions('questions:create')
  listModels(@Body() dto: ListModelsDto) {
    return this.aiGenerateService.listModels(dto.provider, dto.apiKey);
  }

  /** GET /api/ai-generate/providers — List all providers + env status */
  @Get('providers')
  @Permissions('questions:read')
  getProviders() {
    return this.aiGenerateService.getAvailableProviders();
  }

  /** GET /api/ai-generate/jobs — Job history */
  @Get('jobs')
  @Permissions('questions:read')
  getJobs(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.aiGenerateService.getJobs(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  /** GET /api/ai-generate/jobs/:jobId — Job details */
  @Get('jobs/:jobId')
  @Permissions('questions:read')
  getJob(@Param('jobId') jobId: string) {
    return this.aiGenerateService.getJob(jobId);
  }
}
