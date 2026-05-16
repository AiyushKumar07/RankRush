import { cn } from '../../utils/cn';
import { Check, ArrowRight, Image as ImageIcon } from 'lucide-react';

function OptionItem({ option, isCorrect, showAnswer }) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3 transition-all',
        showAnswer && isCorrect
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : showAnswer && !isCorrect
          ? 'border-dark-600/50 bg-dark-800/30 opacity-60'
          : 'border-dark-600/50 bg-dark-800/30'
      )}
    >
      <span
        className={cn(
          'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold',
          showAnswer && isCorrect
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-dark-600 text-dark-300'
        )}
      >
        {showAnswer && isCorrect ? <Check className="h-3.5 w-3.5" /> : option.id}
      </span>
      <div className="flex-1">
        <p className="text-sm text-dark-100">{option.text}</p>
        {option.imageUrl && (
          <div className="mt-2 flex items-center gap-1 text-xs text-neon-cyan">
            <ImageIcon className="h-3 w-3" /> Image attached
          </div>
        )}
      </div>
    </div>
  );
}

function MCQRenderer({ question, showAnswer }) {
  return (
    <div className="space-y-2">
      {question.options?.map((opt) => (
        <OptionItem
          key={opt.id}
          option={opt}
          isCorrect={question.correctAnswer?.includes(opt.id)}
          showAnswer={showAnswer}
        />
      ))}
    </div>
  );
}

function MultiCorrectRenderer({ question, showAnswer }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-accent-400 mb-2">Multiple correct answers</p>
      {question.options?.map((opt) => (
        <OptionItem
          key={opt.id}
          option={opt}
          isCorrect={question.correctAnswer?.includes(opt.id)}
          showAnswer={showAnswer}
        />
      ))}
    </div>
  );
}

function AssertionReasonRenderer({ question, showAnswer }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-accent-500/20 bg-accent-500/5 p-4">
        <p className="text-xs font-medium text-accent-400 mb-1">Assertion</p>
        <p className="text-sm text-dark-100">{question.assertionStatement || question.question}</p>
      </div>
      {question.reasonStatement && (
        <div className="rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 p-4">
          <p className="text-xs font-medium text-neon-cyan mb-1">Reason</p>
          <p className="text-sm text-dark-100">{question.reasonStatement}</p>
        </div>
      )}
      {question.options && <MCQRenderer question={question} showAnswer={showAnswer} />}
    </div>
  );
}

function CaseBasedRenderer({ question, showAnswer }) {
  return (
    <div className="space-y-4">
      {question.caseStudy?.passage && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs font-medium text-amber-400 mb-2">Case Study Passage</p>
          <p className="text-sm text-dark-200 leading-relaxed">{question.caseStudy.passage}</p>
        </div>
      )}
      {question.caseStudy?.subQuestions?.map((sq, i) => (
        <div key={i} className="space-y-2">
          <p className="text-sm font-medium text-dark-100">
            Q{i + 1}. {sq.question}
          </p>
          {sq.options?.map((opt) => (
            <OptionItem
              key={opt.id}
              option={opt}
              isCorrect={sq.correctAnswer?.includes(opt.id)}
              showAnswer={showAnswer}
            />
          ))}
        </div>
      ))}
      {!question.caseStudy?.subQuestions?.length && question.options && (
        <MCQRenderer question={question} showAnswer={showAnswer} />
      )}
    </div>
  );
}

function MatchFollowingRenderer({ question, showAnswer }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium text-accent-400 mb-2">Column A</p>
          {question.matchPairs?.map((pair, i) => (
            <div key={i} className="rounded-lg border border-dark-600/50 bg-dark-800/30 p-2.5 mb-2">
              <span className="text-sm text-dark-100">{i + 1}. {pair.left}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs font-medium text-neon-cyan mb-2">Column B</p>
          {question.matchPairs?.map((pair, i) => (
            <div key={i} className="rounded-lg border border-dark-600/50 bg-dark-800/30 p-2.5 mb-2">
              <span className="text-sm text-dark-100">{String.fromCharCode(65 + i)}. {pair.right}</span>
            </div>
          ))}
        </div>
      </div>
      {showAnswer && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-xs font-medium text-emerald-400 mb-1">Correct Matching</p>
          <div className="flex flex-wrap gap-2">
            {question.matchPairs?.map((pair, i) => (
              <span key={i} className="flex items-center gap-1 text-sm text-dark-100">
                {i + 1} <ArrowRight className="h-3 w-3 text-emerald-400" />{' '}
                {String.fromCharCode(65 + i)}
              </span>
            ))}
          </div>
        </div>
      )}
      {question.options && <MCQRenderer question={question} showAnswer={showAnswer} />}
    </div>
  );
}

function TrueFalseRenderer({ question, showAnswer }) {
  const options = [
    { id: 'True', text: 'True' },
    { id: 'False', text: 'False' },
  ];

  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <OptionItem
          key={opt.id}
          option={opt}
          isCorrect={question.correctAnswer?.includes(opt.id)}
          showAnswer={showAnswer}
        />
      ))}
    </div>
  );
}

function DiagramRenderer({ question, showAnswer }) {
  return (
    <div className="space-y-4">
      {question.questionImageUrl && (
        <div className="rounded-xl border border-dark-600/50 overflow-hidden bg-dark-800/50 p-4 flex items-center justify-center">
          <img src={question.questionImageUrl} alt="Diagram" className="max-h-64 object-contain rounded" />
        </div>
      )}
      {!question.questionImageUrl && (
        <div className="rounded-xl border border-dashed border-neon-cyan/30 bg-neon-cyan/5 p-6 flex flex-col items-center gap-2 text-center">
          <ImageIcon className="h-8 w-8 text-neon-cyan/50" />
          <p className="text-xs text-neon-cyan/70">Diagram-based question — image not uploaded yet</p>
        </div>
      )}
      <MCQRenderer question={question} showAnswer={showAnswer} />
    </div>
  );
}

const RENDERERS = {
  MCQ: MCQRenderer,
  MULTI_CORRECT: MultiCorrectRenderer,
  ASSERTION_REASON: AssertionReasonRenderer,
  CASE_BASED: CaseBasedRenderer,
  MATCH_THE_FOLLOWING: MatchFollowingRenderer,
  TRUE_FALSE: TrueFalseRenderer,
  DIAGRAM_BASED: DiagramRenderer,
};

export default function QuestionRenderer({ question, showAnswer = false }) {
  const Renderer = RENDERERS[question.questionType] || MCQRenderer;
  return <Renderer question={question} showAnswer={showAnswer} />;
}
