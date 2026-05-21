import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Clock,
  Award,
  BookOpen,
  Tag,
  User,
  Calendar,
  GitBranch,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';
import QuestionRenderer from './QuestionRenderer';
import { cn } from '../../utils/cn';
import { DIFFICULTY_COLORS, TYPE_LABELS } from '../../utils/constants';

export default function QuestionDetail({ question, onStatusChange, onEdit, onDelete, userRole }) {
  const [showAnswer, setShowAnswer] = useState(false);

  if (!question) return null;

  const isAdmin = userRole === 'ADMIN';
  const canReview = isAdmin || ['SUPER_ADMIN', 'REVIEWER'].includes(userRole);
  const canPublish = isAdmin || ['SUPER_ADMIN', 'PUBLISHER'].includes(userRole);
  const canEdit = isAdmin || ['SUPER_ADMIN', 'MODERATOR'].includes(userRole);

  const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const item = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* Header card */}
      <motion.div variants={item} className="glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-accent-400/15 to-transparent" />

        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2.5">
              <span className="font-mono text-sm text-dark-400 bg-dark-800/40 px-2.5 py-0.5 rounded-lg">{question.questionId}</span>
              <StatusBadge status={question.status} />
              <span className="text-xs text-dark-500 glass-frosted px-2 py-0.5 rounded-md">v{question.version}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('rounded-lg glass-frosted px-2.5 py-1 text-xs font-semibold', DIFFICULTY_COLORS[question.difficulty])}>
                {question.difficulty}
              </span>
              <span className="rounded-lg bg-accent-500/[0.08] border border-accent-500/10 px-2.5 py-1 text-xs font-semibold text-accent-400">
                {TYPE_LABELS[question.questionType]}
              </span>
              {question.examType?.map((et) => (
                <span key={et} className="rounded-lg glass-frosted px-2.5 py-1 text-xs text-dark-200">{et}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button variant="secondary" size="sm" onClick={onEdit}>Edit</Button>
            )}
            {isAdmin && onDelete && (
              <Button variant="danger" size="sm" icon={Trash2} onClick={onDelete}>Delete</Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetaItem icon={BookOpen} label="Chapter" value={question.chapter} />
          <MetaItem icon={Tag} label="Topic" value={question.topic} />
          <MetaItem icon={Clock} label="Time" value={`${question.estimatedTimeSeconds}s`} />
          <MetaItem icon={Award} label="Marks" value={`+${question.marks} / -${question.negativeMarks}`} />
        </div>

        {question.subTopic && (
          <p className="text-xs text-dark-400 mt-3">
            Sub-topic: <span className="text-dark-200">{question.subTopic}</span>
          </p>
        )}
      </motion.div>

      {/* Question body */}
      <motion.div variants={item} className="glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

        <h3 className="text-base font-medium text-white leading-relaxed mb-6">
          {question.question}
        </h3>

        <QuestionRenderer question={question} showAnswer={showAnswer} />

        <div className="mt-5 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={showAnswer ? EyeOff : Eye}
            onClick={() => setShowAnswer(!showAnswer)}
          >
            {showAnswer ? 'Hide Answer' : 'Show Answer'}
          </Button>
        </div>

        {showAnswer && question.answerExplanation?.correctExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-5 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4 backdrop-blur-sm"
          >
            <p className="text-xs font-semibold text-emerald-400 mb-1.5">Explanation</p>
            <p className="text-sm text-dark-200 leading-relaxed">
              {question.answerExplanation.correctExplanation}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Common misconceptions */}
      {question.commonMisconceptions?.length > 0 && (
        <motion.div variants={item} className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-amber-400/10 to-transparent" />
          <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" /> Common Misconceptions
          </h4>
          <ul className="space-y-2">
            {question.commonMisconceptions.map((m, i) => (
              <li key={i} className="text-sm text-dark-200 flex items-start gap-2.5">
                <span className="text-amber-500/40 mt-1">•</span> {m}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Review comment */}
      {question.reviewComment && (
        <motion.div variants={item} className="glass-card rounded-2xl p-6">
          <h4 className="text-sm font-semibold text-dark-200 mb-2">Review Comment</h4>
          <p className="text-sm text-dark-300 italic leading-relaxed">"{question.reviewComment}"</p>
        </motion.div>
      )}

      {/* Version history */}
      {question.previousVersions?.length > 0 && (
        <motion.div variants={item} className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
          <h4 className="text-sm font-semibold text-dark-200 flex items-center gap-2 mb-3">
            <GitBranch className="h-4 w-4 text-accent-400" /> Version History
          </h4>
          <div className="space-y-2">
            {question.previousVersions.map((v, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-dark-400 glass-frosted rounded-lg px-3 py-2">
                <span className="font-mono text-accent-300/70">v{v.version}</span>
                <span className="text-dark-600">—</span>
                <span className="flex-1">{v.changeReason || 'Edit'}</span>
                <span className="text-dark-500">{new Date(v.changedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Activity */}
      <motion.div variants={item} className="glass-card rounded-2xl p-6">
        <h4 className="text-sm font-semibold text-dark-200 mb-3">Activity</h4>
        <div className="space-y-2.5 text-xs text-dark-400">
          {question.uploadedBy && (
            <div className="flex items-center gap-2.5">
              <User className="h-3.5 w-3.5 text-accent-400/50" />
              Uploaded by <span className="text-dark-200">{question.uploadedBy.name || question.uploadedBy.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <Calendar className="h-3.5 w-3.5 text-accent-400/50" />
            Created <span className="text-dark-200">{new Date(question.createdAt).toLocaleString()}</span>
          </div>
          {question.reviewedBy && (
            <div className="flex items-center gap-2.5">
              <User className="h-3.5 w-3.5 text-accent-400/50" />
              Reviewed by <span className="text-dark-200">{question.reviewedBy.name || question.reviewedBy.email}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div variants={item} className="glass-card rounded-2xl p-5 flex flex-wrap items-center gap-3">
        {question.status !== 'PUBLISHED' && canPublish && (
          <Button variant="primary" size="sm" onClick={() => onStatusChange('PUBLISHED')}>
            Publish
          </Button>
        )}
        {question.status === 'PUBLISHED' && canPublish && (
          <Button variant="secondary" size="sm" onClick={() => onStatusChange('DRAFT')}>
            Unpublish to Draft
          </Button>
        )}
        {isAdmin && onDelete && (
          <Button variant="danger" size="sm" icon={Trash2} onClick={onDelete} className="ml-auto">
            Delete Question
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}

function MetaItem({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl glass-frosted p-3">
      <div className="flex items-center gap-1.5 text-dark-400 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-accent-400/50" />
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-sm text-dark-100 truncate font-medium">{value || '—'}</p>
    </div>
  );
}
