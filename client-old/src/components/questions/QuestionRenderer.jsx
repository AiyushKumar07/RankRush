import { cn } from '../../utils/cn';
import { Check, ArrowRight, Image as ImageIcon } from 'lucide-react';

function OptionItem({ option, isCorrect, showAnswer }) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3.5 transition-all duration-300 relative overflow-hidden',
        showAnswer && isCorrect
          ? 'border-emerald-500/25 bg-emerald-500/[0.04] backdrop-blur-sm'
          : showAnswer && !isCorrect
          ? 'border-dark-600/30 bg-dark-800/20 opacity-50'
          : 'border-white/[0.05] glass-frosted'
      )}
    >
      {showAnswer && isCorrect && (
        <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent" />
      )}
      <span
        className={cn(
          'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all',
          showAnswer && isCorrect
            ? 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10'
            : 'bg-white/[0.04] text-dark-300 border border-white/[0.06]'
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
    <div className="space-y-2.5">
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
    <div className="space-y-2.5">
      <p className="text-xs text-accent-400/80 mb-2 font-medium">Multiple correct answers</p>
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
      <div className="rounded-xl border border-accent-500/15 bg-accent-500/[0.04] p-4 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-accent-400/15 to-transparent" />
        <p className="text-xs font-semibold text-accent-400 mb-1.5">Assertion</p>
        <p className="text-sm text-dark-100 leading-relaxed">{question.assertionStatement || question.question}</p>
      </div>
      {question.reasonStatement && (
        <div className="rounded-xl border border-neon-cyan/15 bg-neon-cyan/[0.04] p-4 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-neon-cyan/15 to-transparent" />
          <p className="text-xs font-semibold text-neon-cyan mb-1.5">Reason</p>
          <p className="text-sm text-dark-100 leading-relaxed">{question.reasonStatement}</p>
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
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-amber-400/10 to-transparent" />
          <p className="text-xs font-semibold text-amber-400 mb-2">Case Study Passage</p>
          <p className="text-sm text-dark-200 leading-relaxed">{question.caseStudy.passage}</p>
        </div>
      )}
      {question.caseStudy?.subQuestions?.map((sq, i) => (
        <div key={i} className="space-y-2.5">
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-accent-400 mb-2.5">Column A</p>
          {question.matchPairs?.map((pair, i) => (
            <div key={i} className="rounded-xl glass-frosted p-3 mb-2.5">
              <span className="text-sm text-dark-100">{i + 1}. {pair.left}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs font-semibold text-neon-cyan mb-2.5">Column B</p>
          {question.matchPairs?.map((pair, i) => (
            <div key={i} className="rounded-xl glass-frosted p-3 mb-2.5">
              <span className="text-sm text-dark-100">{String.fromCharCode(65 + i)}. {pair.right}</span>
            </div>
          ))}
        </div>
      </div>
      {showAnswer && (
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4 backdrop-blur-sm">
          <p className="text-xs font-semibold text-emerald-400 mb-2">Correct Matching</p>
          <div className="flex flex-wrap gap-3">
            {question.matchPairs?.map((pair, i) => (
              <span key={i} className="flex items-center gap-1.5 text-sm text-dark-100 glass-frosted rounded-lg px-3 py-1.5">
                {i + 1} <ArrowRight className="h-3 w-3 text-emerald-400" /> {String.fromCharCode(65 + i)}
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
    <div className="space-y-2.5">
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
        <div className="rounded-xl glass-frosted overflow-hidden p-5 flex items-center justify-center">
          <img src={question.questionImageUrl} alt="Diagram" className="max-h-64 object-contain rounded-lg" />
        </div>
      )}
      {!question.questionImageUrl && (
        <div className="rounded-xl border border-dashed border-neon-cyan/20 bg-neon-cyan/[0.03] p-8 flex flex-col items-center gap-2.5 text-center backdrop-blur-sm">
          <ImageIcon className="h-8 w-8 text-neon-cyan/40" />
          <p className="text-xs text-neon-cyan/60">Diagram-based question — image not uploaded yet</p>
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
