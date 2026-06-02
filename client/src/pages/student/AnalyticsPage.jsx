import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft, Loader2, Target, TrendingUp, TrendingDown,
  CircleCheck, BarChart3, Sparkles, BookOpen, Lock, Crown, ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { studentAPI } from '../../services/api'
import { useEntitlements } from '../../hooks/useEntitlements'
import './AnalyticsPage.css'

function unwrap(res) { return res?.data ?? res ?? null }

// Same subject → colour-key mapping as QuizzesPage / QuizHistoryPage.
const SUBJECT_KEYS = [
  { match: /math/i,        key: 'math',    color: 'var(--rr-violet-500)' },
  { match: /physics/i,     key: 'physics', color: 'var(--rr-cyan-500)' },
  { match: /chem/i,        key: 'chem',    color: 'var(--rr-amber-500)' },
  { match: /(bio|botany|zoology)/i, key: 'bio', color: 'var(--rr-emerald-500)' },
]
function subjectColor(s) {
  return SUBJECT_KEYS.find((k) => k.match.test(s))?.color ?? 'var(--rr-fg-muted)'
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { hasFeature, loading: entLoading, planName } = useEntitlements()
  const unlocked = hasFeature('DETAILED_ANALYTICS')

  useEffect(() => {
    // Skip the fetch entirely for locked users — the paywall renders
    // immediately and the endpoint would just return capped data anyway.
    if (entLoading) return
    if (!unlocked) { setLoading(false); return }
    setLoading(true)
    studentAPI.getTopicAnalytics(30)
      .then((res) => setData(unwrap(res) ?? null))
      .catch((err) => {
        toast.error(err?.message || 'Failed to load analytics')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [entLoading, unlocked])

  const summary = data?.summary
  const strong = data?.strong || []
  const weak = data?.weak || []
  const bySubject = data?.bySubject || []
  const needsMore = data?.needsMore || []

  const hasData = (summary?.quizzesCompleted ?? 0) > 0

  // Subject distribution % (for the breakdown bars).
  const maxSubjectQuestions = useMemo(
    () => bySubject.reduce((m, s) => Math.max(m, s.questions), 0),
    [bySubject],
  )

  return (
    <div className="main">
      <div className="page-head">
        <Link to="/app" className="an-back" aria-label="Back to dashboard">
          <ChevronLeft size={16} />
        </Link>
        <div>
          <div className="crumb">
            <Link to="/app">Home</Link> / Analytics
          </div>
          <h1>Your analytics</h1>
          <p className="sub">
            Overall accuracy, your sharpest and weakest topics, and where you're spending most of your quiz time. Built from every completed attempt — no time window.
          </p>
        </div>
      </div>

      {entLoading || loading ? (
        <div className="an-empty"><Loader2 size={18} className="an-spin" /> Loading analytics…</div>
      ) : !unlocked ? (
        <AnalyticsPaywall planName={planName} />
      ) : !hasData ? (
        <div className="an-empty">
          <strong>No analytics yet.</strong>
          <p>Complete a few quizzes and we'll start building topic-level insights here.</p>
          <Link to="/app/quizzes" className="btn btn-accent btn-sm" style={{ marginTop: 14 }}>
            Browse quizzes
          </Link>
        </div>
      ) : (
        <>
          <div className="an-summary">
            <div className="an-stat">
              <span className="lbl"><Target size={12} /> Overall accuracy</span>
              <strong>{summary.accuracy}%</strong>
              <span className="hint">{summary.totalCorrect} of {summary.totalAnswered} questions</span>
            </div>
            <div className="an-stat">
              <span className="lbl"><CircleCheck size={12} /> Quizzes completed</span>
              <strong>{summary.quizzesCompleted}</strong>
              <span className="hint">All-time</span>
            </div>
            <div className="an-stat">
              <span className="lbl"><BookOpen size={12} /> Topics tracked</span>
              <strong>{summary.topicsTracked}</strong>
              <span className="hint">With enough samples to rank</span>
            </div>
            <div className="an-stat">
              <span className="lbl"><BarChart3 size={12} /> Subjects covered</span>
              <strong>{bySubject.length}</strong>
              <span className="hint">Across all completed quizzes</span>
            </div>
          </div>

          <div className="an-row">
            <TopicList
              tone="strong"
              title="Crushing it"
              subtitle="Top topics by accuracy"
              icon={<TrendingUp size={16} />}
              topics={strong}
              emptyHint="Not enough data yet — keep at it."
            />
            <TopicList
              tone="weak"
              title="Needs work"
              subtitle="Lowest accuracy topics — start here"
              icon={<TrendingDown size={16} />}
              topics={weak}
              emptyHint="No weak topics — you're crushing everything."
            />
          </div>

          <div className="an-section">
            <div className="an-section-head">
              <div>
                <h2><BarChart3 size={16} /> Subject breakdown</h2>
                <p className="an-sub">Average accuracy and quiz count per subject</p>
              </div>
            </div>
            <div className="an-subject-list">
              {bySubject.length === 0 ? (
                <div className="an-empty inline">Complete at least one quiz to see your subject mix.</div>
              ) : (
                bySubject.map((s) => (
                  <div key={s.subject} className="an-subject">
                    <div className="an-subject-head">
                      <span className="an-subject-name">
                        <span className="dot" style={{ background: subjectColor(s.subject) }} />
                        {s.subject}
                      </span>
                      <span className="an-subject-acc">{s.accuracy}%</span>
                    </div>
                    <div className="an-subject-bar">
                      <div
                        className="fill"
                        style={{
                          width: `${(s.questions / Math.max(1, maxSubjectQuestions)) * 100}%`,
                          background: subjectColor(s.subject),
                        }}
                      />
                    </div>
                    <div className="an-subject-meta">
                      <span>{s.questions} questions answered</span>
                      <span>{s.quizzes} quiz{s.quizzes === 1 ? '' : 'zes'}</span>
                      <span>Avg score {s.avgPercentage}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {needsMore.length > 0 && (
            <div className="an-section">
              <div className="an-section-head">
                <div>
                  <h2><Sparkles size={16} /> Needs more samples</h2>
                  <p className="an-sub">Topics you've touched but haven't attempted enough to rank yet</p>
                </div>
              </div>
              <div className="an-needs-more">
                {needsMore.map((t) => (
                  <div key={t.topic} className="an-chip">
                    <span className="dot" style={{ background: subjectColor(t.subject) }} />
                    <span className="label">{t.topic}</span>
                    <span className="meta">{t.attempts} Q{t.attempts === 1 ? '' : 's'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TopicList({ tone, title, subtitle, icon, topics, emptyHint }) {
  const color = tone === 'strong' ? 'var(--rr-emerald-500)' : 'var(--rr-coral-500)'
  return (
    <div className="an-card">
      <div className="an-card-head">
        <div>
          <h2 style={{ color }}>{icon} {title}</h2>
          <p className="an-sub">{subtitle}</p>
        </div>
      </div>
      <div className="an-topic-list">
        {topics.length === 0 ? (
          <div className="an-empty inline">{emptyHint}</div>
        ) : (
          topics.map((t) => (
            <div key={t.topic} className={`an-topic ${tone}`}>
              <div className="an-topic-head">
                <span className="an-topic-name">
                  <span className="dot" style={{ background: subjectColor(t.subject) }} />
                  {t.subject ? `${t.subject} · ${t.topic}` : t.topic}
                </span>
                <span className="an-topic-acc">{t.accuracy}%</span>
              </div>
              <div className="an-topic-bar">
                <div className="fill" style={{ width: `${t.accuracy}%`, background: color }} />
              </div>
              <div className="an-topic-meta">
                <span>{t.attempts} question{t.attempts === 1 ? '' : 's'} answered</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function AnalyticsPaywall({ planName }) {
  return (
    <div className="an-paywall">
      <div className="an-paywall-glow" aria-hidden />
      <div className="an-paywall-body">
        <span className="an-paywall-chip"><Crown size={12} /> Pro feature</span>
        <h2>Detailed analytics is part of Pro.</h2>
        <p>
          Pro unlocks the full topic breakdown, per-subject accuracy, and topics
          you've touched but haven't attempted enough to rank yet. You're on the{' '}
          <b>{planName ?? 'Free'}</b> plan, which shows the top 5 strong and weak
          topics on your dashboard.
        </p>
        <ul className="an-paywall-list">
          <li><Lock size={12} /> Unlimited strong / weak topics (you currently see 5)</li>
          <li><Lock size={12} /> Per-subject accuracy + volume breakdown</li>
          <li><Lock size={12} /> "Needs more samples" — topics with promising signals</li>
        </ul>
        <div className="an-paywall-cta">
          <Link to="/app/pricing" className="btn btn-lime btn-lg">
            See Pro plans <ArrowRight size={14} />
          </Link>
          <Link
            to="/app"
            className="btn btn-ghost btn-lg"
            style={{ color: '#FAFAF7', border: '1px solid rgba(255,255,255,0.18)' }}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}