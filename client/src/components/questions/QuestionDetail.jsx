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
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';
import QuestionRenderer from './QuestionRenderer';
import { cn } from '../../utils/cn';
import { DIFFICULTY_COLORS, TYPE_LABELS } from '../../utils/constants';

export default function QuestionDetail({ question, onStatusChange, onEdit, userRole }) {
  const [showAnswer, setShowAnswer] = useState(false);

  if (!question) return null;

  const isAdmin = userRole === 'ADMIN';
  const canReview = isAdmin || ['SUPER_ADMIN', 'REVIEWER'].includes(userRole);
  const canPublish = isAdmin || ['SUPER_ADMIN', 'PUBLISHER'].includes(userRole);
  const canEdit = isAdmin || ['SUPER_ADMIN', 'MODERATOR'].includes(userRole);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm text-dark-400">{question.questionId}</span>
              <StatusBadge status={question.status} />
              <span className="text-xs text-dark-500">v{question.version}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'rounded-lg bg-dark-700/50 px-2.5 py-1 text-xs font-medium',
                  DIFFICULTY_COLORS[question.difficulty]
                )}
              >
                {question.difficulty}
              </span>
              <span className="rounded-lg bg-accent-500/10 px-2.5 py-1 text-xs font-medium text-accent-400">
                {TYPE_LABELS[question.questionType]}
              </span>
              {question.examType?.map((et) => (
                <span
                  key={et}
                  className="rounded-lg bg-dark-700/50 px-2.5 py-1 text-xs text-dark-200"
                >
                  {et}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {canEdit && question.status !== 'PUBLISHED' && (
              <Button variant="secondary" size="sm" onClick={onEdit}>
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <MetaItem icon={BookOpen} label="Chapter" value={question.chapter} />
          <MetaItem icon={Tag} label="Topic" value={question.topic} />
          <MetaItem icon={Clock} label="Time" value={`${question.estimatedTimeSeconds}s`} />
          <MetaItem icon={Award} label="Marks" value={`+${question.marks} / -${question.negativeMarks}`} />
        </div>

        {question.subTopic && (
          <p className="text-xs text-dark-400">
            Sub-topic: <span className="text-dark-200">{question.subTopic}</span>
          </p>
        )}
      </div>

      {/* Question body */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-base font-medium text-white leading-relaxed mb-6">
          {question.question}
        </h3>

        <QuestionRenderer question={question} showAnswer={showAnswer} />

        <div className="mt-4 flex items-center gap-3">
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
            className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
          >
            <p className="text-xs font-medium text-emerald-400 mb-1">Explanation</p>
            <p className="text-sm text-dark-200 leading-relaxed">
              {question.answerExplanation.correctExplanation}
            </p>
          </motion.div>
        )}
      </div>

      {/* Common misconceptions */}
      {question.commonMisconceptions?.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h4 className="text-sm font-medium text-amber-400 flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" /> Common Misconceptions
          </h4>
          <ul className="space-y-2">
            {question.commonMisconceptions.map((m, i) => (
              <li key={i} className="text-sm text-dark-200 flex items-start gap-2">
                <span className="text-dark-500 mt-0.5">•</span> {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Review comment */}
      {question.reviewComment && (
        <div className="glass-card rounded-2xl p-6">
          <h4 className="text-sm font-medium text-dark-200 mb-2">Review Comment</h4>
          <p className="text-sm text-dark-300 italic">"{question.reviewComment}"</p>
        </div>
      )}

      {/* Version history */}
      {question.previousVersions?.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h4 className="text-sm font-medium text-dark-200 flex items-center gap-2 mb-3">
            <GitBranch className="h-4 w-4" /> Version History
          </h4>
          <div className="space-y-2">
            {question.previousVersions.map((v, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-dark-400">
                <span className="font-mono">v{v.version}</span>
                <span>—</span>
                <span>{v.changeReason || 'Edit'}</span>
                <span className="ml-auto">{new Date(v.changedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tracking */}
      <div className="glass-card rounded-2xl p-6">
        <h4 className="text-sm font-medium text-dark-200 mb-3">Activity</h4>
        <div className="space-y-2 text-xs text-dark-400">
          {question.uploadedBy && (
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              Uploaded by {question.uploadedBy.name || question.uploadedBy.email}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            Created {new Date(question.createdAt).toLocaleString()}
          </div>
          {question.reviewedBy && (
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              Reviewed by {question.reviewedBy.name || question.reviewedBy.email}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="glass-card rounded-2xl p-6 flex flex-wrap gap-3">
        {question.status !== 'PUBLISHED' && canPublish && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onStatusChange('PUBLISHED')}
          >
            Publish Directly
          </Button>
        )}
        {question.status === 'PUBLISHED' && canPublish && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onStatusChange('DRAFT')}
          >
            Unpublish to Draft
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function MetaItem({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg bg-dark-800/50 p-3">
      <div className="flex items-center gap-1.5 text-dark-400 mb-1">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm text-dark-100 truncate">{value || '—'}</p>
    </div>
  );
}
