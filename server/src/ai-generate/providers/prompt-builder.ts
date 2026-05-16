/**
 * Shared prompt builder for all AI providers.
 * Constructs the system prompt and user prompt that enforce the question JSON schema.
 */

import type { AiGenerationRequest } from './ai-provider.interface.js';

const QUESTION_SCHEMA_DESCRIPTION = `
Each question MUST follow this exact JSON structure:
{
  "questionId": "<unique-id>",           // e.g. "AI_MCQ_001"
  "examType": ["NEET"],                  // Array: CBSE, NEET, AIIMS, JIPMER, STATE_PMT, OLYMPIAD
  "class": "12",                         // Class level
  "subject": "<subject>",
  "unit": "<unit-name>",                 // Optional unit
  "chapter": "<chapter-name>",
  "topic": "<topic>",
  "subTopic": "<sub-topic>",             // Optional
  "questionType": "<type>",              // MCQ, MULTI_CORRECT, ASSERTION_REASON, CASE_BASED, MATCH_THE_FOLLOWING, TRUE_FALSE, DIAGRAM_BASED
  "difficulty": "<level>",               // Easy, Medium, Hard, Expert
  "question": "<question-text>",
  "questionImageUrl": null,              // Always null for AI-generated
  "options": [                           // Array of options (for MCQ, MULTI_CORRECT, DIAGRAM_BASED)
    { "id": "A", "text": "<option-text>", "imageUrl": null },
    { "id": "B", "text": "<option-text>", "imageUrl": null },
    { "id": "C", "text": "<option-text>", "imageUrl": null },
    { "id": "D", "text": "<option-text>", "imageUrl": null }
  ],
  "matchPairs": [],                      // For MATCH_THE_FOLLOWING: [{ "left": "...", "right": "..." }]
  "caseStudy": null,                     // For CASE_BASED: { "passage": "...", "subQuestions": [...] }
  "assertionStatement": null,            // For ASSERTION_REASON
  "reasonStatement": null,               // For ASSERTION_REASON
  "correctAnswer": ["A"],                // Array of correct option IDs
  "answerExplanation": {
    "correctExplanation": "<detailed-explanation>",
    "incorrectExplanation": null
  },
  "PYQ_tags": [],
  "estimatedTimeSeconds": 60,
  "marks": 4,
  "negativeMarks": 1,
  "isDiagramBased": false,
  "isCaseBased": false,
  "isNcertLineBased": false,
  "commonMisconceptions": ["<misconception-1>"],
  "tags": ["<tag1>", "<tag2>"]
}
`;

const TYPE_SPECIFIC_INSTRUCTIONS: Record<string, string> = {
  MCQ: `For MCQ questions:
- Provide exactly 4 options (A, B, C, D)
- Exactly ONE correct answer in correctAnswer array
- Set "questionType": "MCQ"
- Marks: 4, Negative marks: 1`,

  MULTI_CORRECT: `For Multi-Correct questions:
- Provide exactly 4 options (A, B, C, D)
- At least 2 correct answers in correctAnswer array
- Set "questionType": "MULTI_CORRECT"
- Marks: 4, Negative marks: 1`,

  ASSERTION_REASON: `For Assertion-Reason questions:
- Set "assertionStatement" to the assertion
- Set "reasonStatement" to the reason
- Options should be standard A-R options:
  A: Both Assertion and Reason are true, and Reason is the correct explanation
  B: Both Assertion and Reason are true, but Reason is NOT the correct explanation
  C: Assertion is true, Reason is false
  D: Assertion is false, Reason is true
- Set "questionType": "ASSERTION_REASON"`,

  CASE_BASED: `For Case-Based questions:
- Set "isCaseBased": true
- Provide "caseStudy" with a detailed passage and 4-5 sub-questions
- Each sub-question must have options and correctAnswer
- Set "questionType": "CASE_BASED"
- The main question field should be a summary/title
- correctAnswer for the main question can be ["CASE"]`,

  MATCH_THE_FOLLOWING: `For Match-the-Following questions:
- Provide at least 4 pairs in "matchPairs": [{ "left": "...", "right": "..." }]
- Options should describe the matching pattern (e.g., "A-1, B-2, C-3, D-4")
- Set "questionType": "MATCH_THE_FOLLOWING"`,

  TRUE_FALSE: `For True/False questions:
- Provide options with id "A" (True) and "B" (False)
- correctAnswer must be ["True"] or ["False"]
- Set "questionType": "TRUE_FALSE"`,

  DIAGRAM_BASED: `For Diagram-Based questions:
- Set "isDiagramBased": true
- Describe the diagram clearly in the question text (since we cannot generate images)
- Provide 4 options
- Set "questionType": "DIAGRAM_BASED"`,
};

export class PromptBuilder {
  static buildSystemPrompt(): string {
    return `You are an expert educational content creator specializing in creating high-quality exam questions for Indian competitive exams (NEET, CBSE, etc.).

Your task is to generate questions in a precise JSON format. You MUST return ONLY valid JSON — no markdown, no code fences, no explanations outside the JSON.

${QUESTION_SCHEMA_DESCRIPTION}

CRITICAL RULES:
1. Return a JSON array of question objects. Nothing else.
2. Every question must be factually accurate and exam-standard quality.
3. Explanations must be detailed and educational.
4. Each question must have a unique questionId in format "AI_<TYPE>_<3-digit-number>" (e.g., AI_MCQ_001).
5. Do NOT include markdown formatting in the response. Return raw JSON only.
6. Every field shown in the schema must be present (use null for inapplicable fields).
7. Common misconceptions should reflect real student mistakes.`;
  }

  static buildUserPrompt(request: AiGenerationRequest): string {
    const typeBreakdown = request.questionTypes
      .map((qt) => `- ${qt.count} × ${qt.type}`)
      .join('\n');

    const typeInstructions = request.questionTypes
      .map((qt) => TYPE_SPECIFIC_INSTRUCTIONS[qt.type] || '')
      .filter(Boolean)
      .join('\n\n');

    const totalCount = request.questionTypes.reduce((sum, qt) => sum + qt.count, 0);

    let prompt = `Generate exactly ${totalCount} questions with the following specification:

Subject: ${request.subject}
Topic: ${request.topic}`;

    if (request.subTopic) prompt += `\nSub-topic: ${request.subTopic}`;
    if (request.difficulty) prompt += `\nDifficulty: ${request.difficulty}`;
    if (request.className) prompt += `\nClass: ${request.className}`;
    if (request.examType?.length) prompt += `\nExam Types: ${request.examType.join(', ')}`;

    prompt += `\n\nQuestion Type Breakdown:\n${typeBreakdown}`;

    if (typeInstructions) {
      prompt += `\n\nType-Specific Instructions:\n${typeInstructions}`;
    }

    if (request.additionalInstructions) {
      prompt += `\n\nAdditional Instructions: ${request.additionalInstructions}`;
    }

    prompt += `\n\nRemember: Return ONLY a valid JSON array. No markdown, no explanation, no code fences.`;

    return prompt;
  }
}
