import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, ChevronDown, CheckSquare, X, FileQuestion, Upload as UploadIcon, BarChart3, Activity, Sparkles } from 'lucide-react';
import { questionsAPI, analyticsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import QuestionCard from '../components/questions/QuestionCard';
import QuestionDetail from '../components/questions/QuestionDetail';
import QuestionEditor from '../components/questions/QuestionEditor';
import UploadModal from '../components/upload/UploadModal';
import AiGenerateModal from '../components/ai-generate/AiGenerateModal';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import StatCard from '../components/dashboard/StatCard';
import toast from 'react-hot-toast';
import { WORKFLOW_STATES, TYPE_LABELS } from '../utils/constants';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [editModal, setEditModal] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false);

  const loadStats = async () => {
    try {
      const res = await analyticsAPI.getDashboard();
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadQuestions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...filters };
      if (search) params.search = search;
      const res = await questionsAPI.getAll(params);
      setQuestions(res.data.questions);
      setPagination(res.pagination);
    } catch (err) {
      toast.error('Failed to load questions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStats();
    loadQuestions();
  }, [loadQuestions]);

  const handleSelectToggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === questions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(questions.map((q) => q._id)));
  };

  const handleBulkAction = async (status) => {
    if (selectedIds.size === 0) return;
    try {
      await questionsAPI.bulkUpdateStatus({ questionIds: Array.from(selectedIds), status });
      toast.success(`${selectedIds.size} questions updated to ${status}`);
      setSelectedIds(new Set());
      loadQuestions(pagination.page);
      loadStats();
    } catch (err) {
      toast.error('Bulk action failed');
      console.error(err);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await questionsAPI.updateStatus(selectedQuestion._id, { status });
      toast.success(`Status changed to ${status}`);
      setDetailOpen(false);
      loadQuestions(pagination.page);
      loadStats();
    } catch (err) {
      toast.error(err?.message || 'Status update failed');
      console.error(err);
    }
  };

  const handleEdit = () => {
    setEditModal(true);
  };

  const handleSaveEdit = async (rawData) => {
    try {
      const {
        _id, id, createdAt, updatedAt, uploadedBy, reviewedBy, approvedBy, publishedBy,
        status, version, previousVersions, contentHash, uploadBatchId, reviewComment, metadata,
        ...editableFields
      } = rawData;

      await questionsAPI.update(selectedQuestion._id, {
        ...editableFields,
        changeReason: 'Admin edit',
      });
      toast.success('Question updated');
      setEditModal(false);
      try {
        const res = await questionsAPI.getById(selectedQuestion._id);
        setSelectedQuestion(res.data.question);
      } catch (_) { /* detail refresh failed */ }
      loadQuestions(pagination.page);
    } catch (err) {
      toast.error(err?.message || 'Update failed');
      console.error(err);
    }
  };

  const handleQuestionClick = async (q) => {
    try {
      const res = await questionsAPI.getById(q._id);
      setSelectedQuestion(res.data.question);
      setDetailOpen(true);
    } catch (err) {
      toast.error('Failed to load question');
      console.error(err);
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
            Dashboard & Questions
          </motion.h1>
          <motion.p
            className="text-sm text-dark-400 mt-1.5 flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            Manage all your questions in one place
            <motion.span
              className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.p>
        </div>
        <motion.div
          className="flex gap-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button variant="secondary" icon={Sparkles} onClick={() => setAiGenerateOpen(true)}>
            AI Generate
          </Button>
          <Button icon={UploadIcon} onClick={() => setUploadModalOpen(true)}>
            Upload Questions
          </Button>
        </motion.div>
      </div>

      {/* Stat cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } },
        }}
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <StatCard icon={FileQuestion} label="Total Questions" value={stats?.overview?.totalQuestions || 0} color="accent" />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <StatCard icon={Activity} label="Drafts" value={stats?.overview?.drafts || 0} color="amber" />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <StatCard icon={CheckSquare} label="Published" value={stats?.overview?.published || 0} color="emerald" />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <StatCard icon={BarChart3} label="This Week" value={stats?.overview?.weeklyUploads || 0} color="cyan" />
        </motion.div>
      </motion.div>

      {/* Search & filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions, topics, chapters..."
            className="w-full rounded-xl glass-input pl-11 pr-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none"
          />
        </div>
        <Button variant="secondary" icon={Filter} onClick={() => setShowFilters(!showFilters)}>
          Filters
          {Object.keys(filters).length > 0 && (
            <span className="ml-1.5 rounded-full bg-accent-500/20 border border-accent-500/15 px-2 py-0.5 text-[10px] font-semibold text-accent-400">
              {Object.keys(filters).length}
            </span>
          )}
        </Button>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-2xl p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FilterSelect label="Status" value={filters.status || ''} onChange={(v) => setFilters(f => v ? { ...f, status: v } : (() => { const n = { ...f }; delete n.status; return n; })())} options={Object.values(WORKFLOW_STATES).map(s => ({ value: s, label: s.replace(/_/g, ' ') }))} />
                <FilterSelect label="Type" value={filters.questionType || ''} onChange={(v) => setFilters(f => v ? { ...f, questionType: v } : (() => { const n = { ...f }; delete n.questionType; return n; })())} options={Object.entries(TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
                <FilterSelect label="Difficulty" value={filters.difficulty || ''} onChange={(v) => setFilters(f => v ? { ...f, difficulty: v } : (() => { const n = { ...f }; delete n.difficulty; return n; })())} options={['Easy', 'Medium', 'Hard', 'Expert'].map(d => ({ value: d, label: d }))} />
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" icon={X} onClick={() => setFilters({})}>Clear All</Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card rounded-2xl px-5 py-3.5 flex items-center gap-3"
          >
            <span className="text-sm text-accent-300 font-semibold">{selectedIds.size} selected</span>
            <div className="flex gap-2 ml-auto">
              <Button size="sm" variant="success" onClick={() => handleBulkAction('PUBLISHED')}>Publish All</Button>
              <Button size="sm" variant="secondary" onClick={() => handleBulkAction('DRAFT')}>Move to Drafts</Button>
              <Button size="sm" variant="danger" onClick={() => handleBulkAction('REJECTED')}>Reject All</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Deselect</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-dark-700/40 rounded-lg w-3/4 mb-3" />
              <div className="h-3 bg-dark-700/30 rounded-lg w-1/2" />
            </div>
          ))}
        </div>
      ) : questions.length === 0 ? (
        <EmptyState icon={FileQuestion} title="No questions found" description="Upload a JSON file to get started, or adjust your filters." />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={CheckSquare} onClick={handleSelectAll}>
              {selectedIds.size === questions.length ? 'Deselect All' : 'Select All'}
            </Button>
            <span className="text-xs text-dark-500">{pagination.total} questions</span>
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {questions.map((q) => (
                <QuestionCard key={q._id} question={q} selected={selectedIds.has(q._id)} onSelect={handleSelectToggle} onClick={() => handleQuestionClick(q)} />
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
                const page = i + 1;
                return (
                  <motion.button
                    key={page}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => loadQuestions(page)}
                    className={`h-9 w-9 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      page === pagination.page
                        ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/25'
                        : 'glass-frosted text-dark-400 hover:text-white'
                    }`}
                  >
                    {page}
                  </motion.button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Question Details" maxWidth="max-w-3xl">
        <QuestionDetail question={selectedQuestion} onStatusChange={handleStatusChange} onEdit={handleEdit} userRole={user?.role} />
      </Modal>

      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Question" maxWidth="max-w-2xl">
        {selectedQuestion && <QuestionEditor question={selectedQuestion} onSave={handleSaveEdit} onCancel={() => setEditModal(false)} />}
      </Modal>

      <UploadModal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} onSuccess={() => { loadQuestions(); loadStats(); }} />

      <AiGenerateModal isOpen={aiGenerateOpen} onClose={() => setAiGenerateOpen(false)} onSuccess={() => { loadQuestions(); loadStats(); }} />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-dark-400 mb-2 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl glass-input px-4 py-2.5 pr-9 text-xs text-white focus:outline-none"
        >
          <option value="">All</option>
          {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dark-500 pointer-events-none" />
      </div>
    </div>
  );
}
