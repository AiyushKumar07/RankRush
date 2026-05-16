import { createHash } from 'crypto';

const EXAM_TYPES = ['CBSE', 'NEET', 'AIIMS', 'JIPMER', 'STATE_PMT', 'OLYMPIAD'];
const QUESTION_TYPES = [
  'MCQ',
  'MULTI_CORRECT',
  'ASSERTION_REASON',
  'CASE_BASED',
  'MATCH_THE_FOLLOWING',
  'TRUE_FALSE',
  'DIAGRAM_BASED',
];
const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard', 'Expert'];

export class QuestionValidator {
  static validate(question: any, index = 0): string[] {
    const errors: string[] = [];

    if (!question.questionId || typeof question.questionId !== 'string') {
      errors.push(`[${index}] questionId is required and must be a string`);
    }

    if (!Array.isArray(question.examType) || question.examType.length === 0) {
      errors.push(`[${index}] examType must be a non-empty array`);
    } else {
      for (const et of question.examType) {
        if (!EXAM_TYPES.includes(et)) {
          errors.push(`[${index}] Invalid examType: ${et}`);
        }
      }
    }

    if (!question.class) errors.push(`[${index}] class is required`);
    if (!question.subject) errors.push(`[${index}] subject is required`);
    if (!question.chapter) errors.push(`[${index}] chapter is required`);
    if (!question.topic) errors.push(`[${index}] topic is required`);

    if (
      !question.questionType ||
      !QUESTION_TYPES.includes(question.questionType)
    ) {
      errors.push(`[${index}] Invalid questionType: ${question.questionType}`);
    }

    if (
      !question.difficulty ||
      !DIFFICULTY_LEVELS.includes(question.difficulty)
    ) {
      errors.push(`[${index}] Invalid difficulty: ${question.difficulty}`);
    }

    if (!question.question?.trim()) {
      errors.push(`[${index}] question text is required`);
    }

    if (
      !Array.isArray(question.correctAnswer) ||
      question.correctAnswer.length === 0
    ) {
      errors.push(`[${index}] correctAnswer must be a non-empty array`);
    }

    this.validateByType(question, index, errors);

    return errors;
  }

  private static validateByType(
    question: any,
    index: number,
    errors: string[],
  ) {
    switch (question.questionType) {
      case 'MCQ':
      case 'DIAGRAM_BASED':
        if (!question.options || question.options.length < 2) {
          errors.push(`[${index}] MCQ/Diagram must have at least 2 options`);
        }
        if (question.correctAnswer?.length !== 1) {
          errors.push(`[${index}] MCQ must have exactly one correct answer`);
        }
        break;
      case 'MULTI_CORRECT':
        if (!question.options || question.options.length < 2) {
          errors.push(`[${index}] Multi-correct must have at least 2 options`);
        }
        if (!question.correctAnswer || question.correctAnswer.length < 2) {
          errors.push(
            `[${index}] Multi-correct must have at least 2 correct answers`,
          );
        }
        break;
      case 'MATCH_THE_FOLLOWING':
        if (!question.matchPairs || question.matchPairs.length < 2) {
          errors.push(`[${index}] Match-the-following needs at least 2 pairs`);
        }
        break;
      case 'TRUE_FALSE':
        if (
          question.correctAnswer?.length !== 1 ||
          !['True', 'False'].includes(question.correctAnswer[0])
        ) {
          errors.push(`[${index}] True/False answer must be "True" or "False"`);
        }
        break;
      case 'CASE_BASED':
        if (question.isCaseBased && !question.caseStudy?.passage) {
          errors.push(`[${index}] Case-based questions require a passage`);
        }
        break;
    }
  }

  static validateBatch(questions: any[]) {
    const allErrors: { questionId: string; index: number; errors: string[] }[] =
      [];
    const seenIds = new Set<string>();

    questions.forEach((q, i) => {
      if (seenIds.has(q.questionId)) {
        allErrors.push({
          questionId: q.questionId,
          index: i,
          errors: [`Duplicate questionId in batch: ${q.questionId}`],
        });
      } else if (q.questionId) {
        seenIds.add(q.questionId);
      }
      const errors = this.validate(q, i);
      if (errors.length > 0) {
        allErrors.push({
          questionId: q.questionId || `index_${i}`,
          index: i,
          errors,
        });
      }
    });

    return allErrors;
  }

  static generateContentHash(question: any): string {
    const normalized = `${question.question}|${question.questionType}|${(question.correctAnswer || []).sort().join(',')}`;
    return createHash('sha256')
      .update(normalized.toLowerCase().trim())
      .digest('hex');
  }
}
