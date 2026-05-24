import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, SlidersHorizontal, Clock, Target, Play, BookOpen, Loader2, TrendingUp, RefreshCw, X, Coins,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { studentAPI } from '../../services/api';
import { cn } from '../../utils/cn';
import { useTokenWallet } from '../../hooks/useTokenWallet';

const DIFFICULTY_TONES = {
  Easy: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  Medium: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  Hard: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
};

function deriveDifficulty(q) {
  const m = q.totalMarks ?? q.totalQuestions ?? 20;
  if (m <= 20) return 'Easy';
  if (m <= 60) return 'Medium';
  return 'Hard';
}



function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
        active
          ? 'bg-accent-500/15 text-accent-200 border-accent-500/30'
          : 'bg-white/[0.02] text-dark-300 border-white/[0.05] hover:text-dark-100 hover:border-white/[0.1]',
      )}
    >
      {children}
    </button>
  );
}

function QuizCard({ quiz, index }) {
  const difficulty = deriveDifficulty(quiz);
  const progress = quiz.inProgress ? 50 : 0; // Server flags in-progress attempts
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -3 }}
      className="glass-card rounded-2xl p-5 hover-lift relative overflow-hidden group flex flex-col"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-accent-500/10 to-transparent" />
      <div className="relative flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-300 bg-accent-500/10 px-2 py-0.5 rounded-md border border-accent-500/20">
            {quiz.subject || 'General'}
          </span>
          <span className={cn(
            'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border',
            DIFFICULTY_TONES[difficulty],
          )}>
            {difficulty}
          </span>
        </div>

        <h3 className="text-base font-semibold text-white leading-snug mb-1.5 line-clamp-2">
          {quiz.title}
        </h3>
        <p className="text-xs text-dark-400 line-clamp-2 mb-4">
          {quiz.description || `${quiz.chapter || ''}${quiz.topic ? ' · ' + quiz.topic : ''}` || 'Test your understanding'}
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] py-2">
            <div className="text-sm font-semibold text-dark-100">{quiz.totalQuestions || '—'}</div>
            <div className="text-[10px] text-dark-400 uppercase tracking-wider">Qs</div>
          </div>
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] py-2">
            <div className="text-sm font-semibold text-dark-100">
              {quiz.timeLimitMins ? `${Math.round(quiz.timeLimitMins)}m` : '—'}
            </div>
            <div className="text-[10px] text-dark-400 uppercase tracking-wider">Time</div>
          </div>
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] py-2">
            <div className="text-sm font-semibold text-dark-100">{quiz.totalMarks ?? '—'}</div>
            <div className="text-[10px] text-dark-400 uppercase tracking-wider">Marks</div>
          </div>
        </div>

        {progress > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-dark-400">In progress</span>
              <span className="text-accent-300 font-semibold">{progress}%</span>
            </div>
            <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8 }}
                className="h-full bg-gradient-to-r from-accent-500 to-neon-cyan rounded-full"
              />
            </div>
          </div>
        )}

        <button
          onClick={() => quiz.onStartClick(quiz)}
          className="mt-auto w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-400 hover:to-accent-500 text-white text-sm font-semibold shadow-lg shadow-accent-500/20 transition-all"
        >
          {progress > 0 ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Resume Quiz
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              Start Quiz
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

export default function StudentQuizzesPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  
  const { wallet } = useTokenWallet();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    studentAPI
      .listAvailableQuizzes({ limit: 60 })
      .then((res) => {
        if (!mounted) return;
        // Server response shape may be { data: { quizzes: [...] } } or array — handle defensively
        const list =
          res?.data?.quizzes ||
          res?.data?.items ||
          res?.data ||
          res?.quizzes ||
          [];
        setQuizzes(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message || 'Could not load quizzes');
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const subjects = useMemo(() => {
    const s = new Set(quizzes.map((q) => q.subject).filter(Boolean));
    return ['All', ...Array.from(s)];
  }, [quizzes]);

  const filtered = useMemo(() => {
    return quizzes.filter((q) => {
      if (subject !== 'All' && q.subject !== subject) return false;
      if (difficulty !== 'All' && deriveDifficulty(q) !== difficulty) return false;
      if (search && !`${q.title} ${q.subject} ${q.chapter || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [quizzes, subject, difficulty, search]);

  const inProgress = quizzes.filter((q) => q.inProgress).length;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-dark-400 mb-1">Library</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          Quizzes <span className="gradient-text">built to push you</span>
        </h1>
        <p className="text-dark-300 mt-2 max-w-xl">
          Browse, filter and attempt published quizzes. Pick up where you left off — your progress is saved.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-500/10 text-accent-300 border border-accent-500/15"><BookOpen className="h-4 w-4" /></div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-dark-400">Available</p>
            <p className="text-lg font-bold text-white">{quizzes.length}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/15"><Target className="h-4 w-4" /></div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-dark-400">Filtered</p>
            <p className="text-lg font-bold text-white">{filtered.length}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/15"><Clock className="h-4 w-4" /></div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-dark-400">In progress</p>
            <p className="text-lg font-bold text-white">{inProgress}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/15"><TrendingUp className="h-4 w-4" /></div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-dark-400">Subjects</p>
            <p className="text-lg font-bold text-white">{subjects.length - 1}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, subject, or chapter"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl glass-input text-sm text-dark-100 placeholder-dark-400 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-dark-400">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-dark-500">Subject:</span>
            {subjects.map((s) => (
              <FilterChip key={s} active={subject === s} onClick={() => setSubject(s)}>{s}</FilterChip>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-dark-500">Difficulty:</span>
            {['All', 'Easy', 'Medium', 'Hard'].map((d) => (
              <FilterChip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>{d}</FilterChip>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-dark-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading quizzes…
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-rose-300 font-semibold">Couldn&apos;t load quizzes</p>
          <p className="text-sm text-dark-400 mt-2">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <BookOpen className="h-8 w-8 text-dark-400 mx-auto mb-3" />
          <p className="text-lg font-semibold text-white mb-1">
            {quizzes.length === 0 ? 'No quizzes published yet' : 'No quizzes match your filters'}
          </p>
          <p className="text-sm text-dark-400">
            {quizzes.length === 0
              ? 'Check back soon — new quizzes are added regularly.'
              : 'Try clearing a filter or searching for a different topic.'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((q, i) => (
            <QuizCard key={q.id || q.quizId || i} quiz={{ ...q, onStartClick: setSelectedQuiz }} index={i} />
          ))}
        </div>
      )}

      {/* Token Consumption Modal */}
      {selectedQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/80 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-3xl p-6 md:p-8 max-w-md w-full relative"
          >
            <button 
              onClick={() => setSelectedQuiz(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-dark-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center mb-6">
              <div className="h-16 w-16 mx-auto bg-accent-500/10 rounded-full flex items-center justify-center mb-4">
                <Coins className="h-8 w-8 text-accent-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Ready to Start?</h2>
              <p className="text-dark-300 text-sm">
                Attempting <span className="text-white font-semibold">{selectedQuiz.title}</span> will consume <span className="text-accent-400 font-bold">1 Token</span>.
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 mb-6 flex items-center justify-between">
              <span className="text-dark-200 font-medium">Your Balance:</span>
              <span className="text-xl font-bold text-white flex items-center gap-2">
                {wallet?.balance ?? '...'} <Coins className="h-4 w-4 text-accent-400" />
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {(wallet?.balance || 0) > 0 ? (
                <button
                  onClick={() => {
                    toast(`Starting quiz ${selectedQuiz.title}... (API Call Needed)`);
                    setSelectedQuiz(null);
                  }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-accent-500 to-neon-cyan text-white font-bold tracking-wide hover:shadow-[0_0_20px_rgba(124,107,245,0.4)] transition-all"
                >
                  Confirm & Start Quiz
                </button>
              ) : (
                <button
                  onClick={() => navigate('/app/pricing')}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold tracking-wide hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all"
                >
                  Buy Tokens to Continue
                </button>
              )}
              <button
                onClick={() => setSelectedQuiz(null)}
                className="w-full py-3.5 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
