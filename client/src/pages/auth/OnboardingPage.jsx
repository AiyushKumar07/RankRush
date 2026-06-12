import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Target, Trophy, HeartPulse, BookOpen, School, Lock,
  Sparkles, GraduationCap, Flag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { userAPI, authAPI } from '../../services/api'
import AuthLayout from '../../components/layouts/AuthLayout'
import './SignupPage.css'
import './OnboardingPage.css'

// Goal chip → backend target enum (Boards | NEET | JEE | Other), matching SignupPage.
const GOAL_TO_TARGET = { 'jee-main': 'JEE', 'jee-adv': 'JEE', neet: 'NEET', boards: 'Boards' }

function OnboardingRightPanel() {
  return (
    <>
      <span className="eyebrow">★ One last step</span>
      <h2>Tell us where you're <em>headed.</em></h2>
      <div className="perk-list">
        <div className="perk">
          <div className="ico"><GraduationCap size={18} /></div>
          <div><h4>Calibrated quiz library</h4><p>We tune your question pool to your class and board from day one.</p></div>
        </div>
        <div className="perk">
          <div className="ico"><Flag size={18} /></div>
          <div><h4>Ranked against your cohort</h4><p>Your leaderboard is students chasing the same exam — not the whole platform.</p></div>
        </div>
        <div className="perk">
          <div className="ico"><Sparkles size={18} /></div>
          <div><h4>Change anytime</h4><p>Everything here can be updated later from your Profile.</p></div>
        </div>
      </div>
    </>
  )
}

export default function OnboardingPage() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  const [studentClass, setStudentClass] = useState(user?.class || 'Class 12')
  const [board, setBoard] = useState(user?.board || 'CBSE')
  const [school, setSchool] = useState(user?.school || '')
  const [selectedGoals, setSelectedGoals] = useState(() => {
    // Map any existing targets back to goal chips, else default to JEE Main.
    const targets = Array.isArray(user?.target) ? user.target : []
    if (targets.includes('JEE')) return ['jee-main']
    if (targets.includes('NEET')) return ['neet']
    if (targets.includes('Boards')) return ['boards']
    return ['jee-main']
  })

  // Password is optional — only offered to accounts that don't have one yet
  // (i.e. Google SSO sign-ups). Lets them add an email+password login.
  const canSetPassword = user ? !user.hasPassword : false
  const [wantPassword, setWantPassword] = useState(false)
  const [password, setPassword] = useState('')

  const [submitting, setSubmitting] = useState(false)

  const pwStrength = (() => {
    if (password.length < 8) return 'weak'
    const hasNum = /\d/.test(password)
    const hasSym = /[^a-zA-Z0-9]/.test(password)
    if (password.length >= 10 && hasNum && hasSym) return 'strong'
    if (password.length >= 8 && (hasNum || hasSym)) return 'med'
    return 'weak'
  })()

  const handleComplete = async () => {
    const target = [...new Set(selectedGoals.map((g) => GOAL_TO_TARGET[g]).filter(Boolean))]
    if (!studentClass) {
      toast.error('Please select your class')
      return
    }
    if (!target.length) {
      toast.error('Pick at least one thing you’re targeting')
      return
    }
    if (wantPassword && password && password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    // CompleteProfileDto requires firstName/lastName — Google provides these,
    // but fall back to splitting the display name just in case.
    const firstName = user?.firstName || user?.name?.split(' ')[0] || ''
    const lastName =
      user?.lastName || user?.name?.split(' ').slice(1).join(' ') || ''

    setSubmitting(true)
    try {
      const res = await userAPI.completeProfile({
        firstName,
        lastName,
        class: studentClass,
        board,
        school: school || undefined,
        target,
      })

      let passwordSet = false
      if (canSetPassword && wantPassword && password) {
        try {
          await authAPI.setPassword({ newPassword: password })
          passwordSet = true
        } catch (err) {
          // Profile saved fine; surface the password failure but don't block entry.
          toast.error(err?.message || 'Profile saved, but setting the password failed.')
        }
      }

      // Merge the server's updated fields and flip the local onboarding flag so
      // the route guard lets the user into the app.
      updateUser({
        ...user,
        ...res.data.user,
        isOnboarded: true,
        hasPassword: user?.hasPassword || passwordSet,
      })

      toast.success('You’re all set — welcome to RankRush!')
      navigate('/app')
    } catch (err) {
      toast.error(err?.message || 'Could not save your profile. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="signup-page">
      <AuthLayout rightPanel={<OnboardingRightPanel />}>
        <span className="eyebrow">Welcome{user?.firstName ? `, ${user.firstName}` : ''}</span>
        <h1>Set up your <em>profile.</em></h1>
        <p className="sub">A couple of quick details so we can calibrate your quizzes. Change anytime in Profile.</p>

        <div className="two-col">
          <div className="form-field">
            <label>Class / Standard</label>
            <select value={studentClass} onChange={(e) => setStudentClass(e.target.value)}>
              <option>Class 9</option><option>Class 10</option><option>Class 11</option>
              <option>Class 12</option><option>Dropper</option>
            </select>
          </div>
          <div className="form-field">
            <label>Board</label>
            <select value={board} onChange={(e) => setBoard(e.target.value)}>
              <option>CBSE</option><option>ICSE</option><option>State board</option><option>IB</option>
            </select>
          </div>
        </div>

        <div className="form-field">
          <label>What are you targeting?</label>
        </div>
        <div className="goal-grid">
          {[
            { id: 'jee-main', icon: Target, name: 'JEE Main', desc: 'PCM · Engineering' },
            { id: 'jee-adv', icon: Trophy, name: 'JEE Advanced', desc: 'Top IIT seats' },
            { id: 'neet', icon: HeartPulse, name: 'NEET', desc: 'PCB · Medical' },
            { id: 'boards', icon: BookOpen, name: 'Board exams', desc: 'Class 10 / 12' },
          ].map(({ id, icon: Icon, name, desc }) => (
            <div
              key={id}
              className={`goal${selectedGoals.includes(id) ? ' on' : ''}`}
              onClick={() => setSelectedGoals((prev) =>
                prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
              )}
            >
              <div className="ico"><Icon size={16} /></div>
              <div className="text">
                <span className="name">{name}</span>
                <span className="desc">{desc}</span>
              </div>
              {selectedGoals.includes(id) && <span className="goal-check">✓</span>}
            </div>
          ))}
        </div>

        <div className="form-field">
          <label>School or coaching centre <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--rr-fg-dim)', fontFamily: 'var(--rr-font-sans)' }}>(optional)</span></label>
          <div className="input-shell"><School size={16} className="left" /><input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="e.g. Allen Career Institute, Kota" /></div>
        </div>

        {canSetPassword && (
          <div className="form-field">
            <label className="pw-optin">
              <input
                type="checkbox"
                checked={wantPassword}
                onChange={(e) => setWantPassword(e.target.checked)}
              />
              <span>Also set a password so you can sign in with email (optional)</span>
            </label>
            {wantPassword && (
              <>
                <div className="input-shell" style={{ marginTop: 8 }}>
                  <Lock size={16} className="left" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    autoComplete="new-password"
                  />
                </div>
                {password && (
                  <>
                    <div className={`pw-strength ${pwStrength}`}><span></span><span></span><span></span></div>
                    <div className="pw-hint"><span>Use 10+ characters · 1 number · 1 symbol</span><span className={`lvl ${pwStrength}`}>{pwStrength === 'strong' ? 'Strong' : pwStrength === 'med' ? 'Medium' : 'Weak'}</span></div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <button className="submit-btn" onClick={handleComplete} disabled={submitting} style={{ width: '100%' }}>
          {submitting ? 'Saving…' : 'Enter RankRush'}<ArrowRight size={16} />
        </button>
      </AuthLayout>
    </div>
  )
}
