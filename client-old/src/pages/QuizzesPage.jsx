import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Trash2, Edit2, PlayCircle, Clock, Award, BookOpen, CheckSquare, FileQuestion, Activity, Sparkles } from 'lucide-react';
import { quizzesAPI } from '../services/api';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import StatCard from '../components/dashboard/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import QuizBuilderModal from '../components/quizzes/QuizBuilderModal';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  
  // Modal State
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);

  const loadQuizzes = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const res = await quizzesAPI.getAll(params);
      setQuizzes(res.data.quizzes);
      setPagination(res.pagination);
    } catch (err) {
      toast.error('Failed to load quizzes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  const handleCreate = () => {
    setEditingQuiz(null);
    setBuilderOpen(true);
  };

  const handleEdit = async (quiz) => {
    try {
      // Fetch full quiz details including questions
      const res = await quizzesAPI.getById(quiz._id);
      setEditingQuiz(res.data.quiz);
      setBuilderOpen(true);
    } catch (err) {
      toast.error('Failed to load quiz details');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;
    try {
      await quizzesAPI.delete(id);
      toast.success('Quiz deleted');
      loadQuizzes(pagination.page);
    } catch (err) {
      toast.error('Failed to delete quiz');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await quizzesAPI.updateStatus(id, { status: newStatus });
      toast.success(`Quiz status updated to ${newStatus}`);
      loadQuizzes(pagination.page);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-2xl font-bold text-white tracking-tight"
          >
            Quizzes
          </motion.h1>
          <motion.p
            className="text-sm text-dark-400 mt-1.5 flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            Create and manage assessment quizzes
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button icon={Plus} onClick={handleCreate}>
            Create Quiz
          </Button>
        </motion.div>
      </div>

      {/* Stats Summary (Placeholder logic for now, using pagination total) */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } },
        }}
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <StatCard icon={CheckSquare} label="Total Quizzes" value={pagination.total || 0} color="accent" />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <StatCard icon={Activity} label="Active Quizzes" value={quizzes.filter(q => q.status === 'ACTIVE').length || 0} color="emerald" />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <StatCard icon={FileQuestion} label="Draft Quizzes" value={quizzes.filter(q => q.status === 'DRAFT').length || 0} color="amber" />
        </motion.div>
      </motion.div>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search quizzes by title or ID..."
          className="w-full rounded-xl glass-input pl-11 pr-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none"
        />
      </div>

      {/* Quiz List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse h-32" />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <EmptyState 
          icon={PlayCircle} 
          title="No quizzes found" 
          description="Create your first quiz by clicking the button below." 
          action={<Button onClick={handleCreate} icon={Plus}>Create Quiz</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {quizzes.map((quiz) => (
              <motion.div
                key={quiz._id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card rounded-2xl p-5 group flex flex-col hover-lift"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-col items-start gap-2">
                    <span className="text-[10px] font-mono text-dark-400 bg-dark-800/40 px-2 py-0.5 rounded-md">
                      {quiz.quizId}
                    </span>
                    <StatusBadge status={quiz.status} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(quiz)}
                      className="p-1.5 rounded-lg text-dark-300 hover:text-white hover:bg-white/10 transition-colors"
                      title="Edit Quiz"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(quiz._id)}
                      className="p-1.5 rounded-lg text-dark-300 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Delete Quiz"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                  {quiz.title}
                </h3>
                {quiz.description && (
                  <p className="text-sm text-dark-300 line-clamp-2 mb-4 flex-1">
                    {quiz.description}
                  </p>
                )}

                <div className="mt-auto pt-4 border-t border-white/[0.04]">
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-dark-200">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-accent-400" />
                      {quiz.subject}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileQuestion className="w-3.5 h-3.5 text-neon-cyan" />
                      {quiz.totalQuestions} Qs
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {quiz.timeLimitMins}m
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-neon-purple" />
                      {quiz.totalMarks} Marks
                    </span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-4">
                    {quiz.status === 'DRAFT' && (
                      <Button size="sm" variant="success" className="w-full" onClick={() => handleStatusChange(quiz._id, 'ACTIVE')}>
                        Activate Quiz
                      </Button>
                    )}
                    {quiz.status === 'ACTIVE' && (
                      <Button size="sm" variant="secondary" className="w-full" onClick={() => handleStatusChange(quiz._id, 'ARCHIVED')}>
                        Archive Quiz
                      </Button>
                    )}
                    {quiz.status === 'ARCHIVED' && (
                      <Button size="sm" variant="primary" className="w-full" onClick={() => handleStatusChange(quiz._id, 'ACTIVE')}>
                        Reactivate
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <QuizBuilderModal 
        isOpen={builderOpen} 
        onClose={() => {
          setBuilderOpen(false);
          setEditingQuiz(null);
        }}
        onSuccess={() => loadQuizzes(pagination.page)}
        initialQuiz={editingQuiz}
      />
    </div>
  );
}
