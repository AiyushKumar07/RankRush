import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { WorkflowStatus, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { QuestionValidator } from './question-validator.js';
import {
  UploadQuizBankDto,
  UpdateQuestionDto,
  UpdateStatusDto,
  BulkUpdateStatusDto,
  QueryQuestionsDto,
} from './dto/questions.dto.js';

const VALID_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  DRAFT: [WorkflowStatus.PENDING_REVIEW, WorkflowStatus.PUBLISHED],
  PENDING_REVIEW: [WorkflowStatus.APPROVED, WorkflowStatus.REJECTED, WorkflowStatus.PUBLISHED],
  APPROVED: [WorkflowStatus.PUBLISHED, WorkflowStatus.REJECTED, WorkflowStatus.DRAFT],
  REJECTED: [WorkflowStatus.DRAFT, WorkflowStatus.PENDING_REVIEW, WorkflowStatus.PUBLISHED],
  PUBLISHED: [WorkflowStatus.DRAFT],
};

@Injectable()
export class QuestionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async upload(dto: UploadQuizBankDto, userId: string, req: any) {
    const { quizBank } = dto;
    if (!Array.isArray(quizBank) || quizBank.length === 0) {
      throw new BadRequestException('quizBank must be a non-empty array');
    }

    // Ensure all questions have a unique questionId before validation (overwrite any provided)
    quizBank.forEach((q) => {
      q.questionId = uuidv4();
    });

    const batchId = uuidv4();
    const validationErrors = QuestionValidator.validateBatch(quizBank);
    const errorIds = new Set(validationErrors.map((e) => e.questionId));

    const validQuestions: any[] = [];
    let duplicateCount = 0;

    for (const q of quizBank) {
      if (errorIds.has(q.questionId)) continue;

      const hash = QuestionValidator.generateContentHash(q);
      const dup = await this.prisma.question.findFirst({
        where: { contentHash: hash },
      });

      if (dup) {
        duplicateCount++;
        validationErrors.push({
          questionId: q.questionId,
          index: quizBank.indexOf(q),
          errors: [`Duplicate of existing question: ${dup.questionId}`],
        });
        continue;
      }

      validQuestions.push({
        questionId: q.questionId,
        examType: q.examType || [],
        class: q.class,
        subject: q.subject,
        unit: q.unit,
        chapter: q.chapter,
        topic: q.topic,
        subTopic: q.subTopic,
        questionType: q.questionType,
        difficulty: q.difficulty,
        question: q.question,
        questionImageUrl: q.questionImageUrl,
        options: q.options || [],
        matchPairs: q.matchPairs || [],
        caseStudy: q.caseStudy || undefined,
        assertionStatement: q.assertionStatement,
        reasonStatement: q.reasonStatement,
        correctAnswer: q.correctAnswer || [],
        answerExplanation: q.answerExplanation || undefined,
        PYQ_tags: q.PYQ_tags || [],
        estimatedTimeSeconds: q.estimatedTimeSeconds ?? 60,
        marks: q.marks ?? 1,
        negativeMarks: q.negativeMarks ?? 0,
        isDiagramBased: q.isDiagramBased ?? false,
        isCaseBased: q.isCaseBased ?? false,
        isNcertLineBased: q.isNcertLineBased ?? false,
        commonMisconceptions: q.commonMisconceptions || [],
        status: WorkflowStatus.DRAFT,
        uploadedBy: userId,
        uploadBatchId: batchId,
        contentHash: hash,
        version: 1,
        tags: q.tags || [],
      });
    }

    const insertedIds: string[] = [];
    for (const qData of validQuestions) {
      try {
        const created = await this.prisma.question.create({ data: qData });
        insertedIds.push(created.questionId);
      } catch (e: any) {
        if (e.code === 'P2002') {
          validationErrors.push({
            questionId: qData.questionId,
            index: 0,
            errors: [`Duplicate questionId: ${qData.questionId}`],
          });
        }
      }
    }

    const batchStatus =
      validationErrors.length === 0
        ? 'COMPLETED'
        : insertedIds.length > 0
          ? 'PARTIAL'
          : 'FAILED';

    await this.prisma.uploadBatch.create({
      data: {
        batchId,
        fileName: dto.fileName || 'upload.json',
        uploadedBy: userId,
        totalQuestions: quizBank.length,
        validQuestions: insertedIds.length,
        invalidQuestions: validationErrors.length,
        duplicateQuestions: duplicateCount,
        validationErrors: validationErrors.map((ve) => ({
          questionId: ve.questionId,
          index: ve.index,
          errors: ve.errors,
        })),
        status: batchStatus as any,
        questionIds: insertedIds,
      },
    });

    await this.audit.log({
      action: 'BULK_UPLOAD',
      entityType: 'Upload',
      entityId: batchId,
      performedBy: userId,
      details: {
        total: quizBank.length,
        valid: insertedIds.length,
        invalid: validationErrors.length,
      },
      req,
    });

    return {
      message: `Upload processed: ${insertedIds.length}/${quizBank.length} questions added`,
      data: {
        batchId,
        totalReceived: quizBank.length,
        inserted: insertedIds.length,
        duplicates: duplicateCount,
        errors: validationErrors,
        status: batchStatus,
      },
    };
  }

  async findAll(query: QueryQuestionsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.QuestionWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.questionType) where.questionType = query.questionType;
    if (query.difficulty) where.difficulty = query.difficulty;
    if (query.subject) where.subject = query.subject;
    if (query.chapter) where.chapter = query.chapter;
    if (query.topic) where.topic = query.topic;
    if (query.class) where.class = query.class;
    if (query.uploadBatchId) where.uploadBatchId = query.uploadBatchId;
    if (query.examType) where.examType = { hasSome: query.examType.split(',') };

    if (query.search) {
      where.OR = [
        { question: { contains: query.search, mode: 'insensitive' } },
        { questionId: { contains: query.search, mode: 'insensitive' } },
        { topic: { contains: query.search, mode: 'insensitive' } },
        { chapter: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.question.count({ where }),
    ]);

    const questionsWithUsers = await Promise.all(
      questions.map(async (q) => {
        const uploadedBy = q.uploadedBy
          ? await this.prisma.user.findUnique({
              where: { id: q.uploadedBy },
              select: { name: true, email: true },
            })
          : null;
        const reviewedBy = q.reviewedBy
          ? await this.prisma.user.findUnique({
              where: { id: q.reviewedBy },
              select: { name: true, email: true },
            })
          : null;
        return {
          ...q,
          _id: q.id,
          uploadedBy: uploadedBy || q.uploadedBy,
          reviewedBy: reviewedBy || q.reviewedBy,
        };
      }),
    );

    return {
      data: { questions: questionsWithUsers },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');

    const resolve = async (uid: string | null) =>
      uid
        ? this.prisma.user.findUnique({
            where: { id: uid },
            select: { name: true, email: true, role: true },
          })
        : null;

    const [uploadedBy, reviewedBy, approvedBy, publishedBy] = await Promise.all(
      [
        resolve(question.uploadedBy),
        resolve(question.reviewedBy),
        resolve(question.approvedBy),
        resolve(question.publishedBy),
      ],
    );

    return {
      data: {
        question: {
          ...question,
          _id: question.id,
          uploadedBy,
          reviewedBy,
          approvedBy,
          publishedBy,
        },
      },
    };
  }

  async update(id: string, dto: UpdateQuestionDto, userId: string, req: any) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');

    const previousVersion = {
      version: question.version,
      data: question as any,
      changedBy: userId,
      changedAt: new Date(),
      changeReason: dto.changeReason || 'Edit',
    };

    const { changeReason, ...updates } = dto;
    const newVersion = question.version + 1;

    let contentHash = question.contentHash;
    if (updates.question || updates.correctAnswer) {
      const merged = { ...question, ...updates };
      contentHash = QuestionValidator.generateContentHash(merged);
    }

    const updated = await this.prisma.question.update({
      where: { id },
      data: {
        ...updates,
        version: newVersion,
        contentHash,
        previousVersions: {
          push: previousVersion,
        },
      },
    });

    await this.audit.log({
      action: 'UPDATE',
      entityType: 'Question',
      entityId: question.questionId,
      performedBy: userId,
      previousState: { status: question.status, version: question.version },
      newState: { status: updated.status, version: newVersion },
      req,
    });

    return {
      message: 'Question updated',
      data: { question: { ...updated, _id: updated.id } },
    };
  }

  async updateStatus(
    id: string,
    dto: UpdateStatusDto,
    userId: string,
    req: any,
  ) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');

    const allowed = VALID_TRANSITIONS[question.status];
    if (!allowed?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${question.status} to ${dto.status}`,
      );
    }

    const data: any = {
      status: dto.status,
      reviewComment: dto.comment || question.reviewComment,
    };

    if (dto.status === WorkflowStatus.APPROVED) data.approvedBy = userId;
    if (dto.status === WorkflowStatus.PUBLISHED) data.publishedBy = userId;
    if (
      dto.status === WorkflowStatus.APPROVED ||
      dto.status === WorkflowStatus.REJECTED
    ) {
      data.reviewedBy = userId;
    }

    const updated = await this.prisma.question.update({ where: { id }, data });

    await this.audit.log({
      action: 'STATUS_CHANGE',
      entityType: 'Question',
      entityId: question.questionId,
      performedBy: userId,
      previousState: { status: question.status },
      newState: { status: dto.status },
      details: { comment: dto.comment },
      req,
    });

    return {
      message: `Status changed to ${dto.status}`,
      data: { question: { ...updated, _id: updated.id } },
    };
  }

  async bulkUpdateStatus(dto: BulkUpdateStatusDto, userId: string, req: any) {
    const data: any = { status: dto.status };
    if (dto.comment) data.reviewComment = dto.comment;
    if (dto.status === WorkflowStatus.APPROVED) data.approvedBy = userId;
    if (dto.status === WorkflowStatus.PUBLISHED) data.publishedBy = userId;
    if (
      dto.status === WorkflowStatus.APPROVED ||
      dto.status === WorkflowStatus.REJECTED
    ) {
      data.reviewedBy = userId;
    }

    const result = await this.prisma.question.updateMany({
      where: { id: { in: dto.questionIds } },
      data,
    });

    await this.audit.log({
      action:
        dto.status === WorkflowStatus.APPROVED ? 'BULK_APPROVE' : 'BULK_REJECT',
      entityType: 'Question',
      entityId: dto.questionIds.join(','),
      performedBy: userId,
      details: {
        count: result.count,
        status: dto.status,
        comment: dto.comment,
      },
      req,
    });

    return {
      message: `${result.count} questions updated`,
      data: { modifiedCount: result.count },
    };
  }

  async remove(id: string, userId: string, req: any) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');

    await this.prisma.question.delete({ where: { id } });

    await this.audit.log({
      action: 'DELETE',
      entityType: 'Question',
      entityId: question.questionId,
      performedBy: userId,
      previousState: question as any,
      req,
    });

    return { message: 'Question deleted', data: null };
  }

  async getFilterOptions() {
    const [subjects, chapters, topics, classes, examTypes] = await Promise.all([
      this.prisma.question.findMany({
        select: { subject: true },
        distinct: ['subject'],
      }),
      this.prisma.question.findMany({
        select: { chapter: true },
        distinct: ['chapter'],
      }),
      this.prisma.question.findMany({
        select: { topic: true },
        distinct: ['topic'],
      }),
      this.prisma.question.findMany({
        select: { class: true },
        distinct: ['class'],
      }),
      this.prisma.question.findMany({
        select: { examType: true },
        distinct: ['examType'],
      }),
    ]);

    const uniqueExamTypes = [...new Set(examTypes.flatMap((e) => e.examType))];

    return {
      data: {
        subjects: subjects.map((s) => s.subject).sort(),
        chapters: chapters.map((c) => c.chapter).sort(),
        topics: topics.map((t) => t.topic).sort(),
        classes: classes.map((c) => c.class).sort(),
        examTypes: uniqueExamTypes.sort(),
      },
    };
  }

  async getDynamicFilterOptions(filters: {
    examType?: string;
    class?: string;
    subject?: string;
  }) {
    const where: Prisma.QuestionWhereInput = {
      status: 'PUBLISHED',
    };

    if (filters.examType) {
      where.examType = { hasSome: filters.examType.split(',') };
    }
    if (filters.class) {
      where.class = { in: filters.class.split(',') };
    }
    if (filters.subject) {
      where.subject = filters.subject;
    }

    const questions = await this.prisma.question.findMany({
      where,
      select: {
        examType: true,
        class: true,
        subject: true,
        chapter: true,
        topic: true,
      },
    });

    const subjects = [...new Set(questions.map((q) => q.subject))].sort();
    const classes = [...new Set(questions.map((q) => q.class))].sort();
    const chapters = [...new Set(questions.map((q) => q.chapter))].sort();
    const topics = [...new Set(questions.map((q) => q.topic))].sort();
    const examTypes = [...new Set(questions.flatMap((q) => q.examType))].sort();

    return {
      data: {
        subjects,
        classes,
        chapters,
        topics,
        examTypes,
        totalQuestions: questions.length,
      },
    };
  }
}
