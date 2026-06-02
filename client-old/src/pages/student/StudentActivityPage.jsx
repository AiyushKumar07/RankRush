import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Flame, Trophy, Award, Target, Sparkles, Play, BookOpen, User, FileText, TrendingUp,
  Loader2, CheckCircle2, ShieldAlert, XCircle, Clock, AlertTriangle,
} from 'lucide-react';
import ActivityHeatmap from '../../components/student/ActivityHeatmap';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { useStudentStats } from '../../context/StudentStatsContext';
import { studentAPI } from '../../services/api';

const ICONS = { Trophy, Flame, Award, Target, Sparkles, Play, BookOpen, FileText, User };
const TONES = {
  emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  orange: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  purple: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  slate: 'bg-white/[0.04] text-dark-200 border-white/[0.06]',
};

export default function StudentActivityPage() {
  const { stats } = useStudentStats();
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    studentAPI
      .getActivity({ limit: 20 })
      .then((res) => {
        if (mounted) setActivityData(res?.data || null);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const activities = activityData?.activities || [];
  const subjectPerformance = activityData?.subjectPerformance || [];

  const processedHeatmap = useMemo(() => {
    return (activityData?.heatmap || []).map((cell) => ({
      ...cell,
      date: new Date(cell.date),
    }));
  }, [activityData?.heatmap]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-dark-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading activity…
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-dark-400 mb-1">Activity</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          Your <span className="gradient-text">learning rhythm</span>
        </h1>
        <p className="text-dark-300 mt-2 max-w-xl">
          See exactly when and how you study. Subjects mastered, and every quiz, badge, and milestone.
        </p>
      </div>

      {/* Quick stats strip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-300 border border-orange-500/15">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-dark-400">Streak</p>
            <p className="text-lg font-bold text-white">{stats?.streak ?? 0}d</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-500/10 text-accent-300 border border-accent-500/15">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-dark-400">Quizzes</p>
            <p className="text-lg font-bold text-white">{stats?.quizzesAttempted ?? 0}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/15">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-dark-400">Accuracy</p>
            <p className="text-lg font-bold text-white">{stats?.accuracy ?? 0}%</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/15">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-dark-400">XP</p>
            <p className="text-lg font-bold text-white">{stats?.xp ?? 0}</p>
          </div>
        </div>
      </motion.div>

      {/* Activity Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="glass-card rounded-2xl p-6"
      >
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-widest text-dark-400">Activity Map</p>
          <h2 className="text-lg font-semibold text-white">Quiz Practice Heatmap</h2>
        </div>
        <ActivityHeatmap cells={processedHeatmap} />
      </motion.div>



      {/* Attempt History */}
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-widest text-dark-400">Records</p>
          <h2 className="text-lg font-semibold text-white">Quiz Attempts</h2>
        </div>
        
        {activityData?.attempts?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.05] text-dark-400 text-xs uppercase tracking-wider">
                  <th className="pb-3 font-medium">Quiz</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Score</th>
                  <th className="pb-3 font-medium">Time Spent</th>
                  <th className="pb-3 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {activityData.attempts.map((attempt) => {
                  const isDisqualified = attempt.status === 'FAILED_PROCTORING';
                  const isCompleted = attempt.status === 'COMPLETED';
                  const violations = attempt.proctoringViolations || [];

                  return (
                    <tr key={attempt.id} className="border-b border-white/[0.02] last:border-b-0 hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 pr-4">
                        <p className="text-white font-medium">{attempt.quizTitle}</p>
                        <p className="text-[11px] text-dark-400">{attempt.quizSubject}</p>
                      </td>
                      <td className="py-4 pr-4 align-top">
                        {isDisqualified ? (
                          <div className="flex items-start gap-1.5 text-rose-400">
                            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-xs">Disqualified</p>
                              {violations.length > 0 && (
                                <ul className="text-[10px] mt-1 text-rose-300/70 list-disc list-inside">
                                  {violations.map((v, i) => (
                                    <li key={i}>{v.details}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        ) : isCompleted ? (
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="font-semibold text-xs">Completed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-dark-400">
                            <Clock className="h-4 w-4" />
                            <span className="font-semibold text-xs capitalize">{attempt.status.toLowerCase().replace('_', ' ')}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 pr-4 align-top">
                        <span className="text-white font-semibold">{attempt.score}</span>
                        <span className="text-dark-400 text-xs"> / {attempt.totalMarks}</span>
                        {isCompleted && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-dark-300">
                            {attempt.percentage}%
                          </span>
                        )}
                      </td>
                      <td className="py-4 pr-4 text-dark-200 align-top">
                        {Math.floor((attempt.timeTakenSecs || 0) / 60)}m {(attempt.timeTakenSecs || 0) % 60}s
                      </td>
                      <td className="py-4 text-right text-dark-400 text-xs align-top">
                        {new Date(attempt.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpen className="h-6 w-6 text-dark-500 mx-auto mb-2" />
            <p className="text-sm text-dark-400">No attempts yet.</p>
          </div>
        )}
      </div>

      {/* Activity feed */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-dark-400">Timeline</p>
            <h2 className="text-lg font-semibold text-white">Recent activity</h2>
          </div>
          <Activity className="h-4 w-4 text-dark-400" />
        </div>
        {activities.length > 0 ? (
          <ul className="space-y-1">
            {activities.map((a, i) => {
              const Icon = ICONS[a.icon] || Sparkles;
              const tone = TONES[a.tone] || TONES.slate;
              return (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 py-3 border-b border-white/[0.03] last:border-b-0"
                >
                  <div className={`p-2 rounded-lg border ${tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dark-100 font-medium">{a.title}</p>
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
            <p className="text-sm text-dark-400">No activity yet — complete your first quiz to start tracking!</p>
          </div>
        )}
      </div>
    </div>
  );
}
