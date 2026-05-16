import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Award, BookOpen, ChevronRight, Image as ImageIcon } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { cn } from '../../utils/cn';
import { DIFFICULTY_COLORS, TYPE_LABELS } from '../../utils/constants';

export default function QuestionCard({ question, onClick, selected, onSelect }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      onMouseMove={handleMouseMove}
      className={cn(
        'glass-card rounded-2xl p-5 cursor-pointer group relative overflow-hidden',
        selected && 'ring-2 ring-accent-500/40 bg-accent-500/[0.04]'
      )}
      onClick={onClick}
    >
      {/* Mouse-following radial glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(300px circle at ${mousePos.x}% ${mousePos.y}%, rgba(124,107,245,0.06), transparent 60%)`,
        }}
      />

      {/* Animated top shine on hover */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-400/20 to-transparent"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      />

      {/* Left accent bar on selection */}
      {selected && (
        <motion.div
          layoutId="selectedBar"
          className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-full bg-gradient-to-b from-accent-400 to-accent-600"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        />
      )}

      <div className="relative flex items-start gap-4">
        {onSelect && (
          <label className="mt-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <motion.div whileTap={{ scale: 0.8 }}>
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onSelect(question._id)}
                className="h-4 w-4 rounded border-dark-500 bg-dark-700/50 text-accent-500 focus:ring-accent-500/30 cursor-pointer accent-accent-500"
              />
            </motion.div>
          </label>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <motion.span
              className="text-[11px] font-mono text-dark-400 bg-dark-800/40 px-2 py-0.5 rounded-md"
              whileHover={{ scale: 1.05, color: '#9585ff' }}
            >
              {question.questionId}
            </motion.span>
            <StatusBadge status={question.status} />
            <motion.span
              className={cn(
                'rounded-md glass-frosted px-2 py-0.5 text-[11px] font-semibold',
                DIFFICULTY_COLORS[question.difficulty]
              )}
              whileHover={{ scale: 1.08 }}
            >
              {question.difficulty}
            </motion.span>
            <motion.span
              className="rounded-md bg-accent-500/[0.08] border border-accent-500/10 px-2 py-0.5 text-[11px] font-semibold text-accent-400"
              whileHover={{ scale: 1.08 }}
            >
              {TYPE_LABELS[question.questionType] || question.questionType}
            </motion.span>
            {question.isDiagramBased && (
              <motion.span
                className="rounded-md bg-neon-cyan/[0.08] border border-neon-cyan/10 px-2 py-0.5 text-[11px] font-medium text-neon-cyan flex items-center gap-1"
                whileHover={{ scale: 1.08 }}
              >
                <ImageIcon className="h-3 w-3" /> Diagram
              </motion.span>
            )}
          </div>

          <p className="text-sm text-dark-100 leading-relaxed line-clamp-2 mb-3">
            {question.question}
          </p>

          <div className="flex items-center gap-5 text-[11px] text-dark-400">
            <motion.span className="flex items-center gap-1.5" whileHover={{ color: '#9585ff', x: 2 }}>
              <BookOpen className="h-3 w-3" />
              {question.chapter}
            </motion.span>
            <motion.span className="flex items-center gap-1.5" whileHover={{ color: '#00e8c6', x: 2 }}>
              <Clock className="h-3 w-3" />
              {question.estimatedTimeSeconds}s
            </motion.span>
            <motion.span className="flex items-center gap-1.5" whileHover={{ color: '#f59e0b', x: 2 }}>
              <Award className="h-3 w-3" />
              {question.marks} mark{question.marks !== 1 ? 's' : ''}
            </motion.span>
            {question.examType?.length > 0 && (
              <span className="text-accent-300/70">{question.examType.join(', ')}</span>
            )}
          </div>
        </div>

        <motion.div
          className="flex-shrink-0 mt-1 rounded-lg bg-white/[0.03] p-1.5 group-hover:bg-accent-500/10 transition-all duration-300"
          whileHover={{ scale: 1.2 }}
          animate={{ x: [0, 3, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronRight className="h-4 w-4 text-dark-500 group-hover:text-accent-400 transition-colors" />
        </motion.div>
      </div>
    </motion.div>
  );
}
