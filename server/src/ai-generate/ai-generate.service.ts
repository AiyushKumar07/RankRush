import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiJobStatus, AiProvider, WorkflowStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AiProviderFactory } from './providers/ai-provider.factory.js';
import { QuestionValidator } from '../questions/question-validator.js';
import type { AiGenerationRequest } from './providers/ai-provider.interface.js';
import { AiGenerateRequestDto } from './dto/ai-generate.dto.js';

const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
};

const ALGORITHM = 'aes-256-cbc';

@Injectable()
export class AiGenerateService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private config: ConfigService,
  ) {}

  // ── Encryption helpers ─────────────────────────────────────────────

  private deriveKey(userId: string): Buffer {
    const secret = this.config.get<string>('JWT_SECRET') || 'fallback_secret';
    return scryptSync(`${secret}:${userId}`, 'rankrush_salt', 32);
  }

  encryptApiKey(apiKey: string, userId: string): string {
    const key = this.deriveKey(userId);
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  decryptApiKey(encryptedKey: string, userId: string): string {
    try {
      const key = this.deriveKey(userId);
      const [ivHex, encrypted] = encryptedKey.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      throw new BadRequestException('Failed to decrypt API key. Key may be corrupted or from a different user.');
    }
  }

  // ── Key management endpoints ───────────────────────────────────────

  async verifyKey(provider: string, apiKey: string) {
    const providerInstance = AiProviderFactory.getProvider(provider);
    const result = await providerInstance.verifyKey(apiKey);
    return { data: result };
  }

  async listModels(provider: string, apiKey: string) {
    const providerInstance = AiProviderFactory.getProvider(provider);
    const result = await providerInstance.listModels(apiKey);
    return { data: result };
  }

  encrypt(apiKey: string, userId: string) {
    const encrypted = this.encryptApiKey(apiKey, userId);
    return { data: { encryptedKey: encrypted } };
  }

  // ── Providers ──────────────────────────────────────────────────────

  getAvailableProviders() {
    return {
      data: {
        providers: AiProviderFactory.getAllProviders(),
        envConfigured: AiProviderFactory.getEnvConfiguredProviders(),
      },
    };
  }

  // ── Generate ───────────────────────────────────────────────────────

  private resolveApiKey(dto: { encryptedApiKey?: string; provider: string }, userId: string): string | undefined {
    if (dto.encryptedApiKey) {
      return this.decryptApiKey(dto.encryptedApiKey, userId);
    }
    return undefined; // will fall back to env key inside provider
  }

  async generate(dto: AiGenerateRequestDto, userId: string, req: any) {
    const providerKey = dto.provider.toUpperCase();
    const provider = AiProviderFactory.getProvider(providerKey);
    const apiKey = this.resolveApiKey(dto, userId);

    // If neither env key nor frontend key, reject
    if (!apiKey && !provider.isConfigured) {
      throw new BadRequestException(
        `No API key available for ${providerKey}. Please configure it in the AI Settings panel.`,
      );
    }

    const totalRequested = dto.questionTypes.reduce((sum, qt) => sum + qt.count, 0);
    if (totalRequested > 50) {
      throw new BadRequestException('Maximum 50 questions can be generated per request');
    }

    const jobId = uuidv4();
    const job = await this.prisma.aiGenerationJob.create({
      data: {
        jobId,
        provider: providerKey as AiProvider,
        status: AiJobStatus.PROCESSING,
        subject: dto.subject,
        topic: dto.topic,
        subTopic: dto.subTopic,
        questionTypes: dto.questionTypes as any,
        difficulty: dto.difficulty as any,
        className: dto.className,
        examType: dto.examType || [],
        additionalInstructions: dto.additionalInstructions,
        totalRequested,
        requestedBy: userId,
      },
    });

    try {
      const aiRequest: AiGenerationRequest = {
        subject: dto.subject,
        topic: dto.topic,
        subTopic: dto.subTopic,
        questionTypes: dto.questionTypes,
        difficulty: dto.difficulty,
        className: dto.className,
        examType: dto.examType,
        additionalInstructions: dto.additionalInstructions,
      };

      const result = await provider.generate(aiRequest, apiKey, dto.model);

      const costRate = COST_PER_MILLION[result.model] || { input: 0, output: 0 };
      const estimatedCost =
        (result.usage.promptTokens * costRate.input +
          result.usage.completionTokens * costRate.output) / 1_000_000;

      await this.prisma.aiProviderLog.create({
        data: {
          jobId: job.id,
          provider: providerKey as AiProvider,
          model: result.model,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          estimatedCost,
          latencyMs: result.latencyMs,
          success: true,
        },
      });

      const { inserted, errors } = await this.processGeneratedQuestions(
        result.questions, dto, userId, jobId,
      );

      const status = inserted.length === 0
        ? AiJobStatus.FAILED
        : inserted.length < totalRequested
          ? AiJobStatus.PARTIAL
          : AiJobStatus.COMPLETED;

      await this.prisma.aiGenerationJob.update({
        where: { id: job.id },
        data: {
          status,
          totalGenerated: inserted.length,
          totalFailed: errors.length,
          generatedQuestionIds: inserted,
          errors: errors.length > 0 ? (errors as any) : undefined,
          completedAt: new Date(),
        },
      });

      await this.audit.log({
        action: 'AI_GENERATE',
        entityType: 'AiGenerationJob',
        entityId: jobId,
        performedBy: userId,
        details: {
          provider: providerKey,
          totalRequested,
          totalGenerated: inserted.length,
          totalFailed: errors.length,
          model: result.model,
          tokens: result.usage.totalTokens,
          latencyMs: result.latencyMs,
          cost: estimatedCost.toFixed(4),
        },
        req,
      });

      return {
        message: `Generated ${inserted.length}/${totalRequested} questions`,
        data: {
          jobId, provider: providerKey, status, totalRequested,
          totalGenerated: inserted.length, totalFailed: errors.length,
          generatedQuestionIds: inserted, errors,
          usage: result.usage, model: result.model,
          latencyMs: result.latencyMs, estimatedCost: estimatedCost.toFixed(4),
        },
      };
    } catch (error: any) {
      await this.prisma.aiProviderLog.create({
        data: {
          jobId: job.id, provider: providerKey as AiProvider,
          model: 'unknown', errorMessage: error.message || String(error),
          success: false,
        },
      });
      await this.prisma.aiGenerationJob.update({
        where: { id: job.id },
        data: {
          status: AiJobStatus.FAILED,
          errors: [{ message: error.message || String(error) }] as any,
          completedAt: new Date(),
        },
      });
      throw new BadRequestException(`AI generation failed: ${error.message || 'Unknown error'}`);
    }
  }

  // ── Process generated questions ────────────────────────────────────

  private async processGeneratedQuestions(
    rawQuestions: any[], dto: AiGenerateRequestDto, userId: string, jobId: string,
  ): Promise<{ inserted: string[]; errors: any[] }> {
    const inserted: string[] = [];
    const errors: any[] = [];

    for (let i = 0; i < rawQuestions.length; i++) {
      const q = rawQuestions[i];
      try {
        const enriched = {
          ...q,
          questionId: `AI_${uuidv4()}`,
          subject: q.subject || dto.subject,
          topic: q.topic || dto.topic,
          subTopic: q.subTopic || dto.subTopic || null,
          chapter: q.chapter || dto.topic,
          class: q.class || dto.className || '12',
          difficulty: q.difficulty || dto.difficulty || 'Medium',
          examType: q.examType || dto.examType || ['NEET'],
        };

        const validationErrors = QuestionValidator.validate(enriched, i);
        if (validationErrors.length > 0) {
          errors.push({ index: i, questionId: enriched.questionId, errors: validationErrors, raw: enriched });
          continue;
        }

        const hash = QuestionValidator.generateContentHash(enriched);
        const dup = await this.prisma.question.findFirst({ where: { contentHash: hash } });
        if (dup) {
          errors.push({ index: i, questionId: enriched.questionId, errors: [`Duplicate of existing question: ${dup.questionId}`] });
          continue;
        }

        const created = await this.prisma.question.create({
          data: {
            questionId: enriched.questionId, examType: enriched.examType,
            class: enriched.class, subject: enriched.subject,
            unit: enriched.unit || null, chapter: enriched.chapter,
            topic: enriched.topic, subTopic: enriched.subTopic,
            questionType: enriched.questionType, difficulty: enriched.difficulty,
            question: enriched.question, questionImageUrl: enriched.questionImageUrl || null,
            options: enriched.options || [], matchPairs: enriched.matchPairs || [],
            caseStudy: enriched.caseStudy || undefined,
            assertionStatement: enriched.assertionStatement || null,
            reasonStatement: enriched.reasonStatement || null,
            correctAnswer: enriched.correctAnswer || [],
            answerExplanation: enriched.answerExplanation || undefined,
            PYQ_tags: enriched.PYQ_tags || [],
            estimatedTimeSeconds: enriched.estimatedTimeSeconds ?? 60,
            marks: enriched.marks ?? 4, negativeMarks: enriched.negativeMarks ?? 1,
            isDiagramBased: enriched.isDiagramBased ?? false,
            isCaseBased: enriched.isCaseBased ?? false,
            isNcertLineBased: enriched.isNcertLineBased ?? false,
            commonMisconceptions: enriched.commonMisconceptions || [],
            status: WorkflowStatus.DRAFT, uploadedBy: userId,
            uploadBatchId: `ai-gen-${jobId}`, contentHash: hash, version: 1,
            tags: [...(enriched.tags || []), 'ai-generated', `provider:${dto.provider.toLowerCase()}`],
            metadata: { aiGenerated: true, provider: dto.provider, jobId } as any,
          },
        });
        inserted.push(created.questionId);
      } catch (e: any) {
        errors.push({ index: i, questionId: q.questionId || `index_${i}`, errors: [e.message || String(e)] });
      }
    }
    return { inserted, errors };
  }

  // ── Retry ──────────────────────────────────────────────────────────

  async retry(jobId: string, userId: string, req: any, encryptedApiKey?: string) {
    const job = await this.prisma.aiGenerationJob.findUnique({ where: { jobId } });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    if (job.retryCount >= job.maxRetries) {
      throw new BadRequestException(`Maximum retries (${job.maxRetries}) exceeded for job ${jobId}`);
    }
    if (job.status !== AiJobStatus.FAILED && job.status !== AiJobStatus.PARTIAL) {
      throw new BadRequestException(`Only FAILED or PARTIAL jobs can be retried. Current: ${job.status}`);
    }

    await this.prisma.aiGenerationJob.update({
      where: { id: job.id }, data: { retryCount: job.retryCount + 1 },
    });

    const dto: AiGenerateRequestDto = {
      provider: job.provider, subject: job.subject, topic: job.topic,
      subTopic: job.subTopic || undefined,
      questionTypes: job.questionTypes as any,
      difficulty: job.difficulty || undefined,
      className: job.className || undefined,
      examType: job.examType,
      additionalInstructions: job.additionalInstructions || undefined,
      encryptedApiKey,
    };
    return this.generate(dto, userId, req);
  }

  // ── Jobs ───────────────────────────────────────────────────────────

  async getJobs(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [jobs, total] = await Promise.all([
      this.prisma.aiGenerationJob.findMany({
        where: { requestedBy: userId }, orderBy: { createdAt: 'desc' },
        skip, take: limit, include: { providerLogs: true },
      }),
      this.prisma.aiGenerationJob.count({ where: { requestedBy: userId } }),
    ]);
    return { data: { jobs }, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getJob(jobId: string) {
    const job = await this.prisma.aiGenerationJob.findUnique({
      where: { jobId }, include: { providerLogs: true },
    });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    return { data: { job } };
  }
}
