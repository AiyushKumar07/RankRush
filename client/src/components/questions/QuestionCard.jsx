import { motion } from 'framer-motion';
import { Clock, Award, BookOpen, ChevronRight, Image as ImageIcon } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { cn } from '../../utils/cn';
import { DIFFICULTY_COLORS, TYPE_LABELS } from '../../utils/constants';

export default function QuestionCard({ question, onClick, selected, onSelect }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      whileHover={{ y: -2 }}
      className={cn(
        'glass-card rounded-xl p-5 cursor-pointer transition-all duration-200 group',
        selected && 'ring-2 ring-accent-500/50 bg-accent-500/5'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {onSelect && (
          <label className="mt-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect(question._id)}
              className="h-4 w-4 rounded border-dark-500 bg-dark-700 text-accent-500 focus:ring-accent-500/50 cursor-pointer"
            />
          </label>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[11px] font-mono text-dark-400">{question.questionId}</span>
            <StatusBadge status={question.status} />
            <span
              className={cn(
                'rounded-md bg-dark-700/50 px-2 py-0.5 text-[11px] font-medium',
                DIFFICULTY_COLORS[question.difficulty]
              )}
            >
              {question.difficulty}
            </span>
            <span className="rounded-md bg-accent-500/10 px-2 py-0.5 text-[11px] font-medium text-accent-400">
              {TYPE_LABELS[question.questionType] || question.questionType}
            </span>
            {question.isDiagramBased && (
              <span className="rounded-md bg-neon-cyan/10 px-2 py-0.5 text-[11px] font-medium text-neon-cyan flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> Diagram
              </span>
            )}
          </div>

          <p className="text-sm text-dark-100 leading-relaxed line-clamp-2 mb-3">
            {question.question}
          </p>

          <div className="flex items-center gap-4 text-[11px] text-dark-400">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {question.chapter}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {question.estimatedTimeSeconds}s
            </span>
            <span className="flex items-center gap-1">
              <Award className="h-3 w-3" />
              {question.marks} mark{question.marks !== 1 ? 's' : ''}
            </span>
            {question.examType?.length > 0 && (
              <span className="text-accent-300">{question.examType.join(', ')}</span>
            )}
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-dark-500 group-hover:text-accent-400 transition-colors flex-shrink-0 mt-1" />
      </div>
    </motion.div>
  );
}
