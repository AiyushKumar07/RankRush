export const WORKFLOW_STATES = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PUBLISHED: 'PUBLISHED',
};

export const QUESTION_TYPES = {
  MCQ: 'MCQ',
  MULTI_CORRECT: 'MULTI_CORRECT',
  ASSERTION_REASON: 'ASSERTION_REASON',
  CASE_BASED: 'CASE_BASED',
  MATCH_THE_FOLLOWING: 'MATCH_THE_FOLLOWING',
  TRUE_FALSE: 'TRUE_FALSE',
  DIAGRAM_BASED: 'DIAGRAM_BASED',
};

export const STATUS_COLORS = {
  DRAFT: { bg: 'bg-gray-500/10', text: 'text-gray-400', dot: 'bg-gray-400' },
  PENDING_REVIEW: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  APPROVED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  REJECTED: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
  PUBLISHED: { bg: 'bg-accent-500/10', text: 'text-accent-400', dot: 'bg-accent-400' },
};

export const DIFFICULTY_COLORS = {
  Easy: 'text-emerald-400',
  Medium: 'text-amber-400',
  Hard: 'text-orange-400',
  Expert: 'text-red-400',
};

export const TYPE_LABELS = {
  MCQ: 'MCQ',
  MULTI_CORRECT: 'Multi-Correct',
  ASSERTION_REASON: 'Assertion & Reason',
  CASE_BASED: 'Case Based',
  MATCH_THE_FOLLOWING: 'Match Following',
  TRUE_FALSE: 'True / False',
  DIAGRAM_BASED: 'Diagram Based',
};
