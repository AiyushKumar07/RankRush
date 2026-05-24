import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Flame, Trophy, BookOpen, Target, TrendingUp, ArrowRight,
  Play, Sparkles, Award, TrendingDown, CheckCircle, Loader2,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStudentStats } from '../../context/StudentStatsContext';
import { studentAPI } from '../../services/api';
import StatCard from '../../components/student/StatCard';
import BadgeShelf from '../../components/student/BadgeShelf';

function greet() {
  const h = new Date().getHours();
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Late night grind';
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { stats } = useStudentStats();
  const firstName = user?.firstName || user?.name?.split(' ')[0] || 'there';

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    studentAPI
      .getDashboard()
      .then((res) => {
        if (mounted) setDashboard(res?.data || null);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const recentActivity = dashboard?.recentActivity || [];
  const topicInsights = dashboard?.topicInsights || { strong: [], weak: [] };
  const badges = dashboard?.badges || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-dark-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"
      >
        <div>
          <p className="text-xs uppercase tracking-widest text-dark-400 mb-1">
            {greet()}
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            Hey {firstName}, <span className="gradient-text">let&apos;s rush the ranks</span>
          </h1>
          <p className="text-dark-300 mt-2 max-w-xl">
            You&apos;re on a <span className="text-orange-300 font-semibold">{stats?.streak ?? 0}-day streak</span>{' '}
            {stats?.quizzesAttempted > 0 && (
              <>
                with <span className="text-accent-300 font-semibold">{stats?.accuracy ?? 0}%</span> accuracy.{' '}
              </>
            )}
            Keep the momentum going.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/app/quizzes"
            className="px-5 py-2.5 rounded-xl glass-frosted hover:border-accent-500/20 text-dark-100 hover:text-white text-sm font-medium flex items-center gap-2 transition-all"
          >
            Browse Quizzes
            <ArrowRight className="h-4 w-4" />
          </Link>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-semibold shadow-lg shadow-accent-500/20 flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Quick Practice
          </motion.button>
        </div>
      </motion.div>

      {/* Top row: Streak + Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak Tracker (Custom Card) */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/15 via-transparent to-amber-500/[0.06]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-200 flex items-center gap-1.5">
                <Flame className="h-4 w-4" /> Daily Streak
              </span>
              <span className="text-2xl font-extrabold gradient-text">{stats?.streak ?? 0}</span>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mt-4">
              {Array.from({ length: 7 }).map((_, i) => {
                const streak = stats?.streak ?? 0;
                const active = streak > 0 && i < (streak % 7 || 7);
                return (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`h-7 rounded border ${active ? 'bg-gradient-to-br from-orange-500/40 to-amber-500/25 border-orange-400/40' : 'bg-white/[0.02] border-white/[0.05]'} flex items-center justify-center`}
                  >
                    {active && <CheckCircle className="h-3 w-3 text-orange-200" />}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        <StatCard
          icon={BookOpen}
          label="Quizzes Taken"
          value={stats?.quizzesAttempted ?? 0}
          hint="Total completed"
          tone="accent"
        />
        <StatCard
          icon={CheckCircle}
          label="Questions Solved"
          value={stats?.questionsSolved ?? 0}
          hint="Across all topics"
          tone="cyan"
        />
        <StatCard
          icon={Target}
          label="Avg. Accuracy"
          value={`${stats?.accuracy ?? 0}%`}
          hint="Overall accuracy"
          tone="emerald"
        />
      </div>

      {/* Weak vs Strong Topics */}
      {(topicInsights.strong.length > 0 || topicInsights.weak.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-dark-400">Performance</p>
              <h3 className="text-xl font-bold text-white">Topic Insights</h3>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Strong Topics */}
            <div className="glass-card rounded-2xl p-5 border-emerald-500/10">
              <h4 className="text-sm font-semibold text-emerald-300 flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4" /> Strongest Topics
              </h4>
              {topicInsights.strong.length > 0 ? (
                <ul className="space-y-3">
                  {topicInsights.strong.map((topic, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span className="text-sm text-dark-100 font-medium">{topic.topic}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-dark-400 text-xs">{topic.attempts} Qs</span>
                        <span className="text-sm font-bold text-white w-10 text-right">{topic.accuracy}%</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-dark-400">Complete more quizzes to see insights</p>
              )}
            </div>
            
            {/* Weak Topics */}
            <div className="glass-card rounded-2xl p-5 border-rose-500/10">
              <h4 className="text-sm font-semibold text-rose-300 flex items-center gap-2 mb-4">
                <TrendingDown className="h-4 w-4" /> Needs Improvement
              </h4>
              {topicInsights.weak.length > 0 ? (
                <ul className="space-y-3">
                  {topicInsights.weak.map((topic, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span className="text-sm text-dark-100 font-medium">{topic.topic}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-dark-400 text-xs">{topic.attempts} Qs</span>
                        <span className="text-sm font-bold text-white w-10 text-right">{topic.accuracy}%</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-dark-400">Complete more quizzes to see insights</p>
              )}
              {topicInsights.weak.length > 0 && (
                <Link
                  to="/app/quizzes"
                  className="mt-4 w-full text-xs py-2 rounded-lg bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 transition-colors font-semibold block text-center"
                >
                  Practice Weak Topics
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Badges & Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-dark-400">Achievements</p>
              <h3 className="text-xl font-bold text-white">Your badges</h3>
            </div>
            <span className="text-xs text-dark-400">
              <span className="font-semibold text-accent-300">{badges.filter((b) => b.unlocked).length}</span> /{' '}
              {badges.length} unlocked
            </span>
          </div>
          <BadgeShelf badges={badges} />
        </div>

        {/* Recent activity feed */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent activity</h3>
          </div>
          {recentActivity.length > 0 ? (
            <ul className="space-y-3">
              {recentActivity.slice(0, 5).map((a, i) => {
                const Icon = { Trophy, Flame, Award, Target, Sparkles, Play, BookOpen }[a.icon] || Sparkles;
                const tone = {
                  emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
                  orange: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
                  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
                  cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
                  purple: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
                  slate: 'bg-white/[0.04] text-dark-200 border-white/[0.06]',
                }[a.tone] || 'bg-white/[0.04] text-dark-200 border-white/[0.06]';
                return (
                  <motion.li
                    key={a.id}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 py-2"
                  >
                    <div className={`p-2 rounded-lg border ${tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-dark-100 font-medium truncate">{a.title}</p>
                      <p className="text-[11px] text-dark-400">{a.meta}</p>
                    </div>
                    <span className="text-[11px] text-dark-500">{a.when}</span>
                  </motion.li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-8">
              <Sparkles className="h-6 w-6 text-dark-500 mx-auto mb-2" />
              <p className="text-sm text-dark-400">No activity yet — start a quiz!</p>
            </div>
          )}
        </div>
      </div>

      {/* Subscription Banner */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden mt-6">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/[0.05]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/25 to-orange-500/15 border border-amber-400/25">
              <Crown className="h-6 w-6 text-amber-200" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">RankRush Free</h3>
              <p className="text-sm text-dark-300">Unlock adaptive quizzes, full analytics, and Live Chat with Pro.</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-dark-950 text-sm font-bold shadow-lg shadow-amber-500/20"
          >
            Upgrade to Pro
          </motion.button>
        </div>
      </div>
    </div>
  );
}
