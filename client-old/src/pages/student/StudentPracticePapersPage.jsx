import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Search, Clock, Users, Trophy, Play, Calendar, Filter, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { studentAPI } from '../../services/api';
import { cn } from '../../utils/cn';

const DIFFICULTY_TONES = {
  Easy: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  Medium: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  Hard: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
};

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

function PaperCard({ paper, index }) {
  const difficulty = paper.difficulty || 'Medium';
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -3 }}
      className="glass-card rounded-2xl p-5 hover-lift relative overflow-hidden group flex flex-col"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-neon-cyan/10 to-transparent" />
      <div className="relative flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neon-cyan bg-neon-cyan/10 px-2 py-0.5 rounded-md border border-neon-cyan/20">
            {paper.subject}
          </span>
          <span className={cn(
            'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border',
            DIFFICULTY_TONES[difficulty],
          )}>
            {difficulty}
          </span>
        </div>

        <h3 className="text-base font-semibold text-white leading-snug mb-1.5">
          {paper.title}
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-dark-400 mb-4">
          {paper.year && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {paper.year}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {(paper.attempts || 0).toLocaleString()} attempts
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] py-2 text-center">
            <div className="text-sm font-semibold text-dark-100 inline-flex items-center gap-1">
              <Clock className="h-3 w-3 text-dark-300" />
              {paper.timeLimitMins || '—'}m
            </div>
            <div className="text-[10px] text-dark-400 uppercase tracking-wider">Duration</div>
          </div>
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] py-2 text-center">
            <div className="text-sm font-semibold text-dark-100 inline-flex items-center gap-1">
              <FileText className="h-3 w-3 text-dark-300" />
              {paper.totalQuestions}
            </div>
            <div className="text-[10px] text-dark-400 uppercase tracking-wider">Questions</div>
          </div>
        </div>

        {paper.lastScore != null && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-emerald-200 inline-flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                Your last score
              </span>
              <span className="text-sm font-bold text-emerald-300">{paper.lastScore}%</span>
            </div>
          </div>
        )}

        <button
          onClick={() => toast(`Mock test launcher coming soon — "${paper.title}"`, { icon: '📝' })}
          className="mt-auto w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-neon-cyan/80 to-emerald-500/80 hover:from-neon-cyan hover:to-emerald-500 text-dark-950 text-sm font-bold transition-all"
        >
          <Play className="h-3.5 w-3.5" />
          {paper.lastScore != null ? 'Reattempt' : 'Start Mock'}
        </button>
      </div>
    </motion.div>
  );
}

export default function StudentPracticePapersPage() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('All');
  const [year, setYear] = useState('All');

  useEffect(() => {
    let mounted = true;
    studentAPI
      .listAvailableQuizzes({ type: 'PRACTICE_PAPER', limit: 60 })
      .then((res) => {
        if (!mounted) return;
        const list = res?.data?.quizzes || res?.data?.items || res?.data || [];
        setPapers(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const subjects = useMemo(() => ['All', ...Array.from(new Set(papers.map((p) => p.subject).filter(Boolean)))], [papers]);
  const years = useMemo(() => ['All', ...Array.from(new Set(papers.map((p) => p.year).filter(Boolean))).sort((a, b) => b - a)], [papers]);

  const filtered = useMemo(
    () =>
      papers.filter((p) => {
        if (subject !== 'All' && p.subject !== subject) return false;
        if (year !== 'All' && p.year !== year) return false;
        if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [papers, subject, year, search],
  );

  return (
    <div className="space-y-8 pb-16">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-dark-400 mb-1">Mock Tests</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          Practice Papers & <span className="gradient-text">Full Mocks</span>
        </h1>
        <p className="text-dark-300 mt-2 max-w-xl">
          Previous year papers and full-length mocks calibrated for JEE, NEET, and Boards. Simulated exam conditions, real ranking.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search papers"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl glass-input text-sm text-dark-100 placeholder-dark-400 outline-none"
            />
          </div>
          <Filter className="h-4 w-4 text-dark-400" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-dark-500">Subject:</span>
            {subjects.map((s) => (
              <FilterChip key={s} active={subject === s} onClick={() => setSubject(s)}>{s}</FilterChip>
            ))}
          </div>
          {years.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest text-dark-500">Year:</span>
              {years.map((y) => (
                <FilterChip key={y} active={year === y} onClick={() => setYear(y)}>{y}</FilterChip>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-dark-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading practice papers…
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p, i) => <PaperCard key={p.id || p.quizId || i} paper={p} index={i} />)}
          </div>

          {filtered.length === 0 && (
            <div className="glass-card rounded-2xl p-10 text-center">
              <FileText className="h-8 w-8 text-dark-400 mx-auto mb-3" />
              <p className="text-lg font-semibold text-white mb-1">
                {papers.length === 0 ? 'No practice papers available yet' : 'No papers match your filters'}
              </p>
              <p className="text-sm text-dark-400">
                {papers.length === 0
                  ? 'Check back soon — practice papers are added regularly.'
                  : 'Try changing your filters.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
