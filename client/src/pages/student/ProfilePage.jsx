import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Camera, Share2, Pencil, Flame, Target, CircleCheck, Trophy,
  CircleUser, Bell, Palette, Lock, Sun, Moon, Monitor,
  Info, Link as LinkIcon, Check, Leaf, ArrowUp,
  LogOut, Laptop, Smartphone, Monitor as MonitorDevice,
  RotateCcw, Trash2, GraduationCap, HeartPulse, BookOpen, MoreHorizontal,
  Eye, EyeOff
} from 'lucide-react'
import { userAPI, authAPI, subscriptionPlansAPI } from '../../services/api'
import Modal from '../../components/ui/Modal'
import AvatarCropModal from '../../components/profile/AvatarCropModal'
import Badge, { ComingSoonChip } from '../../components/ui/Badge'
import BrandLoader from '../../components/brand/BrandLoader'
import Select from '../../components/ui/Select'
import { useAuth } from '../../context/AuthContext'
import { useEntitlements } from '../../hooks/useEntitlements'
import { useTheme } from '../../hooks/useTheme'
import { parsePhoneNumberFromString, getExampleNumber } from 'libphonenumber-js'
import examples from 'libphonenumber-js/mobile/examples'
import './ProfilePage.css'

const TABS = [
  { key: 'account', label: 'Account', icon: CircleUser },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'security', label: 'Security', icon: Lock },
]

const TARGET_OPTIONS = [
  { value: 'JEE',    icon: Trophy,          name: 'JEE',          desc: 'Main / Advanced · Engineering' },
  { value: 'NEET',   icon: HeartPulse,      name: 'NEET',         desc: 'PCB · Medical' },
  { value: 'Boards', icon: BookOpen,        name: 'Board exams',  desc: 'Class 10 / 12' },
  { value: 'Other',  icon: MoreHorizontal,  name: 'Other',        desc: 'BITSAT, CUET, foundation, etc.' },
]

const COUNTRY_CODES = [
  { code: '+91',  iso: 'IN', name: 'India' },
  { code: '+1',   iso: 'US', name: 'United States' },
  { code: '+1',   iso: 'CA', name: 'Canada' },
  { code: '+44',  iso: 'GB', name: 'United Kingdom' },
  { code: '+61',  iso: 'AU', name: 'Australia' },
  { code: '+971', iso: 'AE', name: 'United Arab Emirates' },
  { code: '+966', iso: 'SA', name: 'Saudi Arabia' },
  { code: '+974', iso: 'QA', name: 'Qatar' },
  { code: '+973', iso: 'BH', name: 'Bahrain' },
  { code: '+968', iso: 'OM', name: 'Oman' },
  { code: '+965', iso: 'KW', name: 'Kuwait' },
  { code: '+65',  iso: 'SG', name: 'Singapore' },
  { code: '+60',  iso: 'MY', name: 'Malaysia' },
  { code: '+66',  iso: 'TH', name: 'Thailand' },
  { code: '+62',  iso: 'ID', name: 'Indonesia' },
  { code: '+63',  iso: 'PH', name: 'Philippines' },
  { code: '+84',  iso: 'VN', name: 'Vietnam' },
  { code: '+880', iso: 'BD', name: 'Bangladesh' },
  { code: '+94',  iso: 'LK', name: 'Sri Lanka' },
  { code: '+977', iso: 'NP', name: 'Nepal' },
  { code: '+975', iso: 'BT', name: 'Bhutan' },
  { code: '+92',  iso: 'PK', name: 'Pakistan' },
  { code: '+93',  iso: 'AF', name: 'Afghanistan' },
  { code: '+86',  iso: 'CN', name: 'China' },
  { code: '+852', iso: 'HK', name: 'Hong Kong' },
  { code: '+853', iso: 'MO', name: 'Macau' },
  { code: '+886', iso: 'TW', name: 'Taiwan' },
  { code: '+81',  iso: 'JP', name: 'Japan' },
  { code: '+82',  iso: 'KR', name: 'South Korea' },
  { code: '+64',  iso: 'NZ', name: 'New Zealand' },
  { code: '+49',  iso: 'DE', name: 'Germany' },
  { code: '+33',  iso: 'FR', name: 'France' },
  { code: '+39',  iso: 'IT', name: 'Italy' },
  { code: '+34',  iso: 'ES', name: 'Spain' },
  { code: '+31',  iso: 'NL', name: 'Netherlands' },
  { code: '+32',  iso: 'BE', name: 'Belgium' },
  { code: '+41',  iso: 'CH', name: 'Switzerland' },
  { code: '+43',  iso: 'AT', name: 'Austria' },
  { code: '+46',  iso: 'SE', name: 'Sweden' },
  { code: '+47',  iso: 'NO', name: 'Norway' },
  { code: '+45',  iso: 'DK', name: 'Denmark' },
  { code: '+358', iso: 'FI', name: 'Finland' },
  { code: '+353', iso: 'IE', name: 'Ireland' },
  { code: '+351', iso: 'PT', name: 'Portugal' },
  { code: '+30',  iso: 'GR', name: 'Greece' },
  { code: '+48',  iso: 'PL', name: 'Poland' },
  { code: '+420', iso: 'CZ', name: 'Czechia' },
  { code: '+36',  iso: 'HU', name: 'Hungary' },
  { code: '+40',  iso: 'RO', name: 'Romania' },
  { code: '+7',   iso: 'RU', name: 'Russia' },
  { code: '+380', iso: 'UA', name: 'Ukraine' },
  { code: '+90',  iso: 'TR', name: 'Turkey' },
  { code: '+972', iso: 'IL', name: 'Israel' },
  { code: '+20',  iso: 'EG', name: 'Egypt' },
  { code: '+27',  iso: 'ZA', name: 'South Africa' },
  { code: '+234', iso: 'NG', name: 'Nigeria' },
  { code: '+254', iso: 'KE', name: 'Kenya' },
  { code: '+255', iso: 'TZ', name: 'Tanzania' },
  { code: '+256', iso: 'UG', name: 'Uganda' },
  { code: '+212', iso: 'MA', name: 'Morocco' },
  { code: '+55',  iso: 'BR', name: 'Brazil' },
  { code: '+52',  iso: 'MX', name: 'Mexico' },
  { code: '+54',  iso: 'AR', name: 'Argentina' },
  { code: '+56',  iso: 'CL', name: 'Chile' },
  { code: '+57',  iso: 'CO', name: 'Colombia' },
  { code: '+51',  iso: 'PE', name: 'Peru' },
]

function levenshtein(a, b) {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = new Array(n + 1)
  for (let j = 0; j <= n; j++) dp[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      if (a[i - 1] === b[j - 1]) dp[j] = prev
      else dp[j] = 1 + Math.min(prev, dp[j - 1], dp[j])
      prev = tmp
    }
  }
  return dp[n]
}

function arePasswordsSimilar(a, b) {
  if (!a || !b) return false
  const x = a.toLowerCase()
  const y = b.toLowerCase()
  if (x === y) return true
  if (x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x))) return true
  const d = levenshtein(x, y)
  const maxLen = Math.max(x.length, y.length)
  return maxLen > 0 && d / maxLen < 0.5
}

function formatRelativeTime(input) {
  if (!input) return null
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) return null
  const diffSec = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000))
  if (diffSec < 60) return 'just now'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
  const diffWk = Math.round(diffDay / 7)
  if (diffWk < 5) return `${diffWk} week${diffWk === 1 ? '' : 's'} ago`
  const diffMo = Math.round(diffDay / 30)
  if (diffMo < 12) return `${diffMo} month${diffMo === 1 ? '' : 's'} ago`
  const diffYr = Math.round(diffDay / 365)
  return `${diffYr} year${diffYr === 1 ? '' : 's'} ago`
}

function splitContactNumber(raw) {
  if (!raw) return { code: '+91', iso: 'IN', number: '' }
  const parsed = parsePhoneNumberFromString(String(raw).trim())
  if (parsed) {
    return {
      code: `+${parsed.countryCallingCode}`,
      iso: parsed.country || 'IN',
      number: parsed.nationalNumber || '',
    }
  }
  const trimmed = String(raw).trim()
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length)
  for (const c of sorted) {
    if (trimmed.startsWith(c.code)) {
      return { code: c.code, iso: c.iso, number: trimmed.slice(c.code.length).replace(/\D/g, '') }
    }
  }
  return { code: '+91', iso: 'IN', number: trimmed.replace(/\D/g, '') }
}

function validatePhone(iso, national) {
  if (!national) return { valid: false, error: null, formatted: '' }
  const parsed = parsePhoneNumberFromString(national, iso)
  if (!parsed) return { valid: false, error: 'Enter a valid phone number', formatted: '' }
  if (!parsed.isValid()) {
    const example = getExampleNumber(iso, examples)
    const hint = example ? ` (e.g. ${example.formatNational()})` : ''
    return { valid: false, error: `Not a valid ${iso} number${hint}`, formatted: '' }
  }
  return { valid: true, error: null, formatted: parsed.number }
}

function planBannerDesc(planName, isFreeTier, subscription) {
  const tokens = subscription?.pricing?.tokenCount
  const renewsAt = subscription?.nextRefreshDate ?? subscription?.endDate
  const renewsStr = renewsAt
    ? new Date(renewsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  if (isFreeTier) {
    const t = tokens ?? 2
    return `${t} tokens per month${renewsStr ? ` · renews on ${renewsStr}` : ''}. Upgrade for 10× the quizzes.`
  }
  const parts = []
  if (tokens != null) parts.push(`${tokens} tokens per cycle`)
  if (renewsStr) parts.push(`next refresh on ${renewsStr}`)
  return parts.length ? parts.join(' · ') : `You're on ${planName}.`
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('account')
  const { preference: themeCard, setPreference: setThemePreference } = useTheme()
  const [sessions, setSessions] = useState([])
  const [dangerModal, setDangerModal] = useState(null)
  // GitHub-style confirmation: the user must type their exact username to
  // arm a destructive action. Pasting is blocked so it's a deliberate act.
  const [dangerConfirm, setDangerConfirm] = useState('')
  // Drives the full-screen "we're resetting you" loader during a reset /
  // class change so the wipe doesn't feel instantaneous-then-jarring.
  const [dangerBusy, setDangerBusy] = useState(null)
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [pwStrength, setPwStrength] = useState({ score: 0, verdict: 'weak', suggestions: [], ok: false })
  const [pwVisible, setPwVisible] = useState({ current: false, new: false, confirm: false })
  const [profileData, setProfileData] = useState(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    phoneIso: 'IN',
    contactNumber: '',
    class: 'Class 12',
    board: 'CBSE',
    stream: 'PCM (Physics, Chemistry, Maths)',
    school: '',
    city: '',
    address: '',
    target: ['JEE']
  })
  const [photoModalOpen, setPhotoModalOpen] = useState(false)
  const navigate = useNavigate()
  const { logout, user, updateUser } = useAuth()
  const { planName, isFreeTier } = useEntitlements()
  const [subscription, setSubscription] = useState(null)

  const [toggles, setToggles] = useState({
    emailWeeklyRank: false,
    emailProductUpdates: false,
    pushStreakExpire: true,
    pushRankMovement: true,
    pushWeakTopics: false,
    pushFriendJoins: true,
    pushStreakReminder: true,
    reduceMotion: false,
    compactLayout: false,
  })

  // Clear the typed-username confirmation whenever the danger modal opens,
  // switches action, or closes — so a prior entry can't pre-arm a new one.
  useEffect(() => {
    setDangerConfirm('')
  }, [dangerModal])

  useEffect(() => {
    loadProfile()
    loadPreferences()
    loadSessions()
    subscriptionPlansAPI.mySubscription()
      .then((res) => setSubscription(res?.subscription ?? res?.data?.subscription ?? null))
      .catch(() => setSubscription(null))
  }, [])

  useEffect(() => {
    if (!passwords.new) {
      setPwStrength({ score: 0, verdict: 'weak', suggestions: [], ok: false })
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await authAPI.passwordStrength(passwords.new)
        if (res?.data) setPwStrength(res.data)
      } catch (err) {
        console.error(err)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [passwords.new])

  const loadProfile = async () => {
    try {
      const res = await userAPI.getProfile()
      const profileUser = res.data.user
      setProfileData(profileUser)
      // Keep auth state (and the rest of the app) in sync with the
      // freshly-loaded profile without dropping auth-only fields.
      updateUser({ ...user, ...profileUser })
      const { iso, number } = splitContactNumber(profileUser.contactNumber)
      setFormData({
        firstName: profileUser.firstName || '',
        lastName: profileUser.lastName || '',
        dob: profileUser.dob || '',
        phoneIso: iso,
        contactNumber: number,
        class: profileUser.class || 'Class 12',
        board: profileUser.board || 'CBSE',
        stream: profileUser.stream || 'PCM (Physics, Chemistry, Maths)',
        school: profileUser.school || '',
        city: profileUser.city || '',
        address: profileUser.address || '',
        target: Array.isArray(profileUser.target) && profileUser.target.length ? profileUser.target : ['JEE'],
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    if (!formData.target.length) {
      toast.error('Pick at least one target exam')
      return
    }
    // `class` is intentionally stripped from the profile update — the
    // only way to change it is via the Danger zone, which routes
    // through /user/change-class and triggers a hard progress reset
    // (the user's leaderboard partition and cohort can't safely
    // change in place).
    const { phoneIso, contactNumber, class: _omitClass, ...rest } = formData
    const phone = validatePhone(phoneIso, contactNumber)
    if (contactNumber && !phone.valid) {
      toast.error(phone.error || 'Enter a valid phone number')
      return
    }
    try {
      await userAPI.updateProfile({
        ...rest,
        contactNumber: phone.formatted || '',
      })
      toast.success('Profile updated successfully')
      loadProfile()
    } catch (err) {
      toast.error('Failed to update profile')
    }
  }

  const toggleTarget = (value) => {
    setFormData(p => {
      const has = p.target.includes(value)
      const next = has ? p.target.filter(t => t !== value) : [...p.target, value]
      return { ...p, target: next.length ? next : p.target }
    })
  }

  const loadPreferences = async () => {
    try {
      const res = await userAPI.getPreferences()
      const prefs = res.data.data
      if (prefs.theme === 'light' || prefs.theme === 'dark' || prefs.theme === 'auto') {
        setThemePreference(prefs.theme)
      }
      setToggles({
        emailWeeklyRank: prefs.emailWeeklyRank ?? false,
        emailProductUpdates: prefs.emailProductUpdates ?? false,
        pushStreakExpire: prefs.pushStreakExpire ?? true,
        pushRankMovement: prefs.pushRankMovement ?? true,
        pushWeakTopics: prefs.pushWeakTopics ?? false,
        pushFriendJoins: prefs.pushFriendJoins ?? true,
        pushStreakReminder: prefs.pushStreakReminder ?? true,
        reduceMotion: prefs.reduceMotion ?? false,
        compactLayout: prefs.compactLayout ?? false,
      })
    } catch (err) {
      console.error(err)
    }
  }

  const loadSessions = async () => {
    try {
      const res = await authAPI.getSessions()
      setSessions(res?.data?.sessions || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggle = async (key) => {
    const newVal = !toggles[key]
    setToggles(prev => ({ ...prev, [key]: newVal }))
    try {
      await userAPI.updatePreferences({ [key]: newVal })
      toast.success('Preference updated')
    } catch (err) {
      toast.error('Failed to save preference')
      setToggles(prev => ({ ...prev, [key]: !newVal }))
    }
  }

  const handleThemeChange = async (theme) => {
    setThemePreference(theme)
    try {
      await userAPI.updatePreferences({ theme })
    } catch (err) {
      console.error(err)
    }
  }

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) return toast.error('Passwords do not match')
    if (passwords.new.length < 8) return toast.error('Password must be at least 8 characters')
    if (!pwStrength.ok) return toast.error('Password is too weak')
    if (arePasswordsSimilar(passwords.current, passwords.new)) {
      return toast.error('New password is too similar to your current password')
    }
    try {
      await authAPI.changePassword({ currentPassword: passwords.current, newPassword: passwords.new })
      toast.success('Password updated successfully')
      setPasswords({ current: '', new: '', confirm: '' })
      loadProfile()
      loadSessions()
    } catch (err) {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to update password')
    }
  }

  const handleRevokeSession = async (id) => {
    try {
      await authAPI.revokeSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      toast.success('Session revoked')
    } catch (err) {
      toast.error('Failed to revoke session')
    }
  }

  const handleLogoutAll = async () => {
    try {
      await authAPI.logoutAll()
      toast.success('Signed out of all devices')
      await logout()
      navigate('/login')
    } catch (err) {
      toast.error('Failed to sign out')
    }
  }

  // Tracks the class the user has selected inside the class-change
  // modal. We don't reuse formData.class because it'd lose its sync
  // with the saved value if the user opens and cancels the modal.
  const [classChangeTarget, setClassChangeTarget] = useState('Class 12')

  const handleDangerAction = async () => {
    const action = dangerModal
    const username = profileData?.username || ''

    // GitHub-style safety gate: the typed (never pasted) username must match
    // exactly before any destructive action is allowed through.
    if (!username || dangerConfirm.trim() !== username) {
      toast.error('Type your username exactly to confirm')
      return
    }

    // change-class pre-checks that shouldn't trigger the wipe loader.
    if (action === 'change-class') {
      if (!classChangeTarget) {
        toast.error('Pick a class first')
        return
      }
      if (classChangeTarget === profileData?.class) {
        toast('Already on this class — nothing to change.', { icon: 'ℹ️' })
        setDangerModal(null)
        return
      }
    }

    const isWipe = action === 'reset' || action === 'change-class'
    // Swap the confirm dialog for a full-screen branded loader during a wipe.
    setDangerModal(null)
    if (isWipe) {
      setDangerBusy(
        action === 'reset' ? 'Resetting your progress…' : 'Switching class & resetting…',
      )
    }

    const startedAt = Date.now()
    try {
      if (action === 'reset') {
        await userAPI.resetProgress()
      } else if (action === 'change-class') {
        await userAPI.changeClass(classChangeTarget)
      } else if (action === 'delete') {
        await userAPI.deleteAccount()
      }

      // Hold the reset loader for a brief beat so the wipe reads as a
      // deliberate, weighty action rather than an instant flash.
      if (isWipe) {
        const MIN_MS = 1800
        const elapsed = Date.now() - startedAt
        if (elapsed < MIN_MS) await new Promise((r) => setTimeout(r, MIN_MS - elapsed))
      }

      if (action === 'reset') {
        toast.success('Progress reset successfully')
        await loadProfile()
      } else if (action === 'change-class') {
        toast.success(`Class updated to ${classChangeTarget}. Progress reset.`)
        await loadProfile()
      } else if (action === 'delete') {
        // Clear the now-orphaned local auth state, then send them off to
        // the farewell page instead of a cold redirect to login.
        await logout()
        navigate('/goodbye', { replace: true })
      }
    } catch (err) {
      const label =
        action === 'reset' ? 'reset progress'
          : action === 'change-class' ? 'change class'
          : 'delete account'
      toast.error(`Failed to ${label}`)
    } finally {
      setDangerBusy(null)
    }
  }

  return (
    <div className="main">

      <div className="crumb">/ Account / Profile</div>

      <div className="profile-card">
        <div className="profile-cover">
          <div className="profile-cover-inner">
            <div
              className="profile-avatar"
              onClick={() => setPhotoModalOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPhotoModalOpen(true) } }}
              title="Change profile photo"
            >
              {profileData?.profilePicture || profileData?.avatar ? (
                <img src={profileData.profilePicture || profileData.avatar} alt="Profile" className="profile-avatar-img" />
              ) : (
                (profileData?.firstName?.[0] || 'A').toUpperCase()
              )}
              <div className="avatar-edit"><Camera size={14} /></div>
            </div>
            <div className="profile-identity">
              <h1>{profileData?.firstName} {profileData?.lastName}</h1>
              <p className="tagline">
                Class <b>{profileData?.class || 'N/A'}</b> · targeting <b>{profileData?.target?.length ? profileData.target.join(' / ') : 'N/A'}</b> · <b>{profileData?.school || 'N/A'}</b> · member since <b>{profileData?.createdAt ? new Date(profileData.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' }) : 'N/A'}</b>
              </p>
            </div>
          </div>
        </div>
        <div className="profile-pillbar">
          <Badge variant="violet"><GraduationCap size={12} />{profileData?.target?.length ? profileData.target.join(' / ') : 'JEE'} · {profileData?.stream?.split(' ')[0] || 'PCM'}</Badge>
          {profileData?.stats?.streak > 0 && <Badge variant="warn"><Flame size={12} />{profileData.stats.streak}-day streak</Badge>}
          <Badge variant="lime"><Trophy size={12} />Top 5% · this week</Badge>
          <Badge variant={isFreeTier ? 'neutral' : 'lime'}>{planName || 'Free'} plan</Badge>
        </div>
      </div>

      <div className="qs-row">
        <div className="qs-cell amber">
          <span className="lbl"><Flame size={12} />Streak</span>
          <div className="v">{profileData?.stats?.streak ?? 0}<small> days</small></div>
        </div>
        <div className="qs-cell emerald">
          <span className="lbl"><Target size={12} />Accuracy</span>
          <div className="v">{profileData?.stats?.accuracy ?? 0}<small>%</small></div>
        </div>
        <div className="qs-cell violet">
          <span className="lbl"><CircleCheck size={12} />Quizzes</span>
          <div className="v">{profileData?.stats?.quizzes ?? 0}</div>
        </div>
        <div className="qs-cell cyan">
          <span className="lbl"><Trophy size={12} />Best rank</span>
          <div className="v">{profileData?.stats?.bestRank != null ? `#${profileData.stats.bestRank}` : '-'}</div>
        </div>
      </div>

      <div className="tab-nav" role="tablist">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} className={activeTab === t.key ? 'on' : ''} onClick={() => setActiveTab(t.key)}>
              <Icon size={15} />{t.label}
            </button>
          )
        })}
      </div>

      {/* ACCOUNT TAB */}
      <div className={`tab-content${activeTab === 'account' ? ' active' : ''}`}>
        <div className="plan-banner">
          <div className="ico"><Leaf size={24} /></div>
          <div className="meta-text">
            <h3>You're on the {planName || 'Free'} plan</h3>
            <span className="desc">{planBannerDesc(planName, isFreeTier, subscription)}</span>
          </div>
          <Link to={isFreeTier ? '/app/pricing' : '/app/billing'} className="btn btn-lime">
            <ArrowUp size={14} />{isFreeTier ? 'See plans' : 'Manage'}
          </Link>
        </div>

        <form className="settings-card" onSubmit={handleProfileSubmit}>
          <div className="head">
            <div>
              <h2>Personal info</h2>
              <span className="sub">Tell us who you are. Used on your profile and the leaderboard.</span>
            </div>
            {profileData?.isVerified && <Badge variant="neutral"><CircleCheck size={12} style={{ color: 'var(--rr-emerald-500)' }} />Verified email</Badge>}
          </div>
          <div className="body">
            <div className="form-grid">
              <div className="field"><label>First name</label><input value={formData.firstName} onChange={e => setFormData(p => ({...p, firstName: e.target.value}))} /></div>
              <div className="field"><label>Last name</label><input value={formData.lastName} onChange={e => setFormData(p => ({...p, lastName: e.target.value}))} /></div>
              <div className="field"><label>Date of Birth</label><input type="date" value={formData.dob} onChange={e => setFormData(p => ({...p, dob: e.target.value}))} /></div>
              <div className="field"><label>Email</label><input type="email" value={profileData?.email || ''} disabled /><span className="helper"><Info size={12} />Change via Security tab</span></div>
              <div className="field">
                <label>Phone</label>
                <div className="phone-input">
                  <Select
                    className="rr-select-compact"
                    value={formData.phoneIso}
                    onChange={(v) => setFormData(p => ({ ...p, phoneIso: v }))}
                    ariaLabel="Country code"
                    options={COUNTRY_CODES.map((c) => ({
                      value: c.iso,
                      label: `${c.iso} ${c.code}`,
                      searchText: `${c.iso} ${c.name} ${c.code}`,
                      _name: c.name,
                      _code: c.code,
                    }))}
                    renderValue={(opt) => <span>{opt.value} {opt._code}</span>}
                    renderOption={(opt) => (
                      <span className="cc-opt">
                        <span className="cc-iso">{opt._code}</span>
                        <span className="cc-name">{opt._name}</span>
                      </span>
                    )}
                  />
                  <input
                    className="phone-num"
                    type="tel"
                    inputMode="numeric"
                    value={formData.contactNumber}
                    onChange={e => setFormData(p => ({ ...p, contactNumber: e.target.value.replace(/\D/g, '') }))}
                    placeholder="Phone number"
                  />
                </div>
                {formData.contactNumber && !validatePhone(formData.phoneIso, formData.contactNumber).valid && (
                  <span className="pw-error">
                    {validatePhone(formData.phoneIso, formData.contactNumber).error}
                  </span>
                )}
              </div>
              <div className="field"><label>Username</label><input value={profileData?.username || ''} disabled /><span className="helper"><LinkIcon size={12} />rankrush.in/u/{profileData?.username || ''}</span></div>
            </div>
          </div>
          <div className="foot">
            <span className="note"></span>
            <div className="right">
              <button type="submit" className="btn btn-accent btn-sm"><Check size={14} />Save changes</button>
            </div>
          </div>
        </form>

        <form className="settings-card" onSubmit={handleProfileSubmit}>
          <div className="head">
            <div>
              <h2>Academic profile</h2>
              <span className="sub">Determines which quizzes appear in your library and what we calibrate against.</span>
            </div>
          </div>
          <div className="body">
            <div className="form-grid">
              <div className="field">
                <label>Class / Standard</label>
                <div className="locked-pill" title="Class can only be changed from the Danger Zone — it resets your progress.">
                  <Lock size={12} />
                  <span>{profileData?.class || formData.class || 'N/A'}</span>
                  <span className="locked-hint">Change via Danger zone</span>
                </div>
              </div>
              <div className="field">
                <label>Board</label>
                <Select
                  value={formData.board || 'CBSE'}
                  onChange={(v) => setFormData(p => ({ ...p, board: v }))}
                  ariaLabel="Board"
                  options={[
                    { value: 'CBSE',        label: 'CBSE' },
                    { value: 'ICSE',        label: 'ICSE' },
                    { value: 'State board', label: 'State board' },
                    { value: 'IB',          label: 'IB' },
                  ]}
                />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Target exam <span className="helper" style={{ marginLeft: 6 }}>Pick one or more</span></label>
                <div className="target-grid">
                  {TARGET_OPTIONS.map(({ value, icon: Icon, name, desc }) => {
                    const on = formData.target.includes(value)
                    return (
                      <div
                        key={value}
                        className={`target-chip${on ? ' on' : ''}`}
                        onClick={() => toggleTarget(value)}
                        role="checkbox"
                        aria-checked={on}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTarget(value) } }}
                      >
                        <div className="ico"><Icon size={16} /></div>
                        <div className="text">
                          <span className="name">{name}</span>
                          <span className="desc">{desc}</span>
                        </div>
                        {on && <span className="target-check"><Check size={12} /></span>}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="field">
                <label>Stream</label>
                <Select
                  value={formData.stream || 'PCM (Physics, Chemistry, Maths)'}
                  onChange={(v) => setFormData(p => ({ ...p, stream: v }))}
                  ariaLabel="Stream"
                  options={[
                    { value: 'PCM (Physics, Chemistry, Maths)',  label: 'PCM (Physics, Chemistry, Maths)' },
                    { value: 'PCB (Physics, Chemistry, Biology)', label: 'PCB (Physics, Chemistry, Biology)' },
                    { value: 'PCMB',                              label: 'PCMB' },
                  ]}
                />
              </div>
              <div className="field"><label>School / Coaching centre</label><input value={formData.school} onChange={e => setFormData(p => ({...p, school: e.target.value}))} /></div>
              <div className="field">
                <label>Address</label>
                <input
                  value={formData.address || ''}
                  onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                  placeholder="House / street · locality"
                  maxLength={500}
                />
              </div>
              <div className="field"><label>City</label><input value={formData.city || ''} onChange={e => setFormData(p => ({...p, city: e.target.value}))} /></div>
            </div>
          </div>
          <div className="foot">
            <span className="note"></span>
            <div className="right">
              <button type="submit" className="btn btn-accent btn-sm"><Check size={14} />Save changes</button>
            </div>
          </div>
        </form>
      </div>

      {/* NOTIFICATIONS TAB */}
      <div className={`tab-content${activeTab === 'notifications' ? ' active' : ''}`}>
        <div className="settings-card">
          <div className="head"><div><h2>Email notifications</h2><span className="sub">What lands in your inbox.</span></div></div>
          <div className="body">
            <div className="tog-row disabled" style={{ opacity: 0.6, pointerEvents: 'none' }}><div className="text"><span className="title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Weekly rank report <ComingSoonChip /></span><span className="desc">Every Sunday — where you climbed, where you slipped.</span></div><div className={`tog${toggles.emailWeeklyRank ? ' on' : ''}`}></div></div>
            <div className="tog-row disabled" style={{ opacity: 0.6, pointerEvents: 'none' }}><div className="text"><span className="title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Product updates <ComingSoonChip /></span><span className="desc">New features, new quiz drops, occasional newsletter.</span></div><div className={`tog${toggles.emailProductUpdates ? ' on' : ''}`}></div></div>
          </div>
        </div>
        <div className="settings-card">
          <div className="head"><div><h2>Push notifications</h2><span className="sub">Browser &amp; mobile alerts.</span></div></div>
          <div className="body">
            <div className="tog-row"><div className="text"><span className="title">Streak about to expire</span><span className="desc">3-hour warning so you don't lose a streak you've earned.</span></div><div className={`tog${toggles.pushStreakExpire ? ' on' : ''}`} onClick={() => handleToggle('pushStreakExpire')}></div></div>
            <div className="tog-row"><div className="text"><span className="title">Rank movement</span><span className="desc">When you climb or drop more than 10 ranks in a day.</span></div><div className={`tog${toggles.pushRankMovement ? ' on' : ''}`} onClick={() => handleToggle('pushRankMovement')}></div></div>
            <div className="tog-row"><div className="text"><span className="title">New quiz in your weak topics</span><span className="desc">Quizzes calibrated to topics you're under 70% on.</span></div><div className={`tog${toggles.pushWeakTopics ? ' on' : ''}`} onClick={() => handleToggle('pushWeakTopics')}></div></div>
            <div className="tog-row"><div className="text"><span className="title">Friend joins RankRush</span><span className="desc">When someone in your contacts joins the platform.</span></div><div className={`tog${toggles.pushFriendJoins ? ' on' : ''}`} onClick={() => handleToggle('pushFriendJoins')}></div></div>
            <div className="tog-row"><div className="text"><span className="title">Daily streak reminder</span><span className="desc">A gentle nudge to practice every day.</span></div><div className={`tog${toggles.pushStreakReminder ? ' on' : ''}`} onClick={() => handleToggle('pushStreakReminder')}></div></div>
          </div>
        </div>
      </div>

      {/* APPEARANCE TAB */}
      <div className={`tab-content${activeTab === 'appearance' ? ' active' : ''}`}>
        <div className="settings-card">
          <div className="head"><div><h2>Theme</h2><span className="sub">Light during the day, dark at night. Or let your OS decide.</span></div></div>
          <div className="body">
            <div className="theme-cards">
              <div className={`theme-card light${themeCard === 'light' ? ' on' : ''}`} onClick={() => handleThemeChange('light')}>
                <div className="theme-preview"></div>
                <div className="name"><Sun size={16} />Light</div>
                <span className="sub">Warm paper background. Default.</span>
              </div>
              <div className={`theme-card dark${themeCard === 'dark' ? ' on' : ''}`} onClick={() => handleThemeChange('dark')}>
                <div className="theme-preview"></div>
                <div className="name"><Moon size={16} />Dark</div>
                <span className="sub">Ink-deep background. Easy on the eyes at night.</span>
              </div>
              <div className={`theme-card auto${themeCard === 'auto' ? ' on' : ''}`} onClick={() => handleThemeChange('auto')}>
                <div className="theme-preview"></div>
                <div className="name"><Monitor size={16} />Auto</div>
                <span className="sub">Follows your OS preference.</span>
              </div>
            </div>
          </div>
        </div>
        <div className="settings-card">
          <div className="head"><div><h2>Display preferences</h2><span className="sub">How dense the interface feels.</span></div></div>
          <div className="body">
            <div className="tog-row"><div className="text"><span className="title">Reduce motion</span><span className="desc">Turn off the rank-bar animations and spring transitions. Honours <span style={{ fontFamily: 'var(--rr-font-mono)', color: 'var(--rr-fg)' }}>prefers-reduced-motion</span>.</span></div><div className={`tog${toggles.reduceMotion ? ' on' : ''}`} onClick={() => handleToggle('reduceMotion')}></div></div>
            <div className="tog-row"><div className="text"><span className="title">Compact layout</span><span className="desc">Tighter spacing on the dashboard and quiz cards. Helps on small laptops.</span></div><div className={`tog${toggles.compactLayout ? ' on' : ''}`} onClick={() => handleToggle('compactLayout')}></div></div>
          </div>
        </div>
      </div>

      {/* SECURITY TAB */}
      <div className={`tab-content${activeTab === 'security' ? ' active' : ''}`}>
        <div className="settings-card">
          <div className="head"><div><h2>Password</h2><span className="sub">{profileData?.passwordChangedAt ? `Last changed ${formatRelativeTime(profileData.passwordChangedAt)}` : profileData?.createdAt ? `Set when you created your account ${formatRelativeTime(profileData.createdAt)}` : 'Manage your account password'}. We recommend rotating every 90 days.</span></div></div>
          <div className="body">
            <div className="form-grid">
              <div className="field">
                <label>Current password</label>
                <div className="pw-input">
                  <input
                    type={pwVisible.current ? 'text' : 'password'}
                    value={passwords.current}
                    onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))}
                    placeholder="••••••••••"
                  />
                  <button
                    type="button"
                    className="pw-eye"
                    onClick={() => setPwVisible(v => ({ ...v, current: !v.current }))}
                    aria-label={pwVisible.current ? 'Hide password' : 'Show password'}
                  >
                    {pwVisible.current ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="field">
                <label>New password</label>
                <div className="pw-input">
                  <input
                    type={pwVisible.new ? 'text' : 'password'}
                    value={passwords.new}
                    onChange={(e) => setPasswords(p => ({ ...p, new: e.target.value }))}
                    placeholder="At least 10 characters"
                  />
                  <button
                    type="button"
                    className="pw-eye"
                    onClick={() => setPwVisible(v => ({ ...v, new: !v.new }))}
                    aria-label={pwVisible.new ? 'Hide password' : 'Show password'}
                  >
                    {pwVisible.new ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwords.new && (
                  <>
                    <div className={`pw-strength ${pwStrength.verdict?.replace(' ', '-') || 'weak'}`}>
                      <span></span><span></span><span></span><span></span>
                    </div>
                    <div className="pw-hint">
                      <span className="pw-hint-msg">
                        {passwords.current && arePasswordsSimilar(passwords.current, passwords.new) && (
                          <span className="pw-error">Too similar to your current password.</span>
                        )}
                      </span>
                      <span className="pw-hint-right">
                        <span className={`lvl ${pwStrength.verdict?.replace(' ', '-') || 'weak'}`}>
                          {pwStrength.verdict ? pwStrength.verdict[0].toUpperCase() + pwStrength.verdict.slice(1) : 'Weak'}
                        </span>
                        {pwStrength.suggestions?.length > 0 && (
                          <span className="pw-info" tabIndex={0} role="button" aria-label="Show password suggestions">
                            <Info size={13} />
                            <span className="pw-info-pop" role="tooltip">
                              <span className="pw-info-title">Ways to strengthen this password</span>
                              <ul>
                                {pwStrength.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                              </ul>
                            </span>
                          </span>
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Confirm new password</label>
                <div className="pw-input">
                  <input
                    type={pwVisible.confirm ? 'text' : 'password'}
                    value={passwords.confirm}
                    onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                    placeholder="Type it once more"
                  />
                  <button
                    type="button"
                    className="pw-eye"
                    onClick={() => setPwVisible(v => ({ ...v, confirm: !v.confirm }))}
                    aria-label={pwVisible.confirm ? 'Hide password' : 'Show password'}
                  >
                    {pwVisible.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwords.confirm && passwords.new !== passwords.confirm && (
                  <span className="pw-error">Passwords do not match.</span>
                )}
              </div>
            </div>
          </div>
          <div className="foot">
            <span className="note">Strong, unique, never re-used.</span>
            <div className="right">
              <button
                className="btn btn-accent btn-sm"
                onClick={handlePasswordChange}
                disabled={
                  !passwords.current ||
                  !passwords.new ||
                  passwords.new !== passwords.confirm ||
                  !pwStrength.ok ||
                  arePasswordsSimilar(passwords.current, passwords.new)
                }
              >
                <Lock size={14} />Update password
              </button>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="head">
            <div><h2>Active sessions</h2><span className="sub">Devices currently signed in. Revoke any you don't recognise.</span></div>
            <button className="btn btn-secondary btn-sm" onClick={handleLogoutAll}><LogOut size={14} />Sign out of all</button>
          </div>
          <div className="body">
            {sessions.map((s) => {
              const isCurrent = !!s.isCurrent
              const ua = (s.userAgent || s.rawUserAgent || '').toString()
              const isMobile = /mobile|iphone|android|ipad/i.test(ua)
              const Icon = isMobile ? Smartphone : Laptop
              const locParts = []
              if (s.location && s.location !== 'Unknown Location') locParts.push(s.location)
              if (s.ipAddress) locParts.push(s.ipAddress)
              const locText = locParts.length ? locParts.join(' · ') : 'Unknown location'
              const when = formatRelativeTime(s.createdAt) || ''
              return (
                <div className={`session-row ${isCurrent ? 'current' : ''}`} key={s.id}>
                  <div className="dev-ico"><Icon size={16} /></div>
                  <div className="info">
                    <span className="dev-name">{s.userAgent || 'Unknown Device'}</span>
                    <span className="dev-loc">{locText}{when ? ` · ${when}` : ''}</span>
                  </div>
                  {isCurrent ? <span className="pill-now">This device</span> : <span className="when">{when}</span>}
                  <button className="btn-revoke" disabled={isCurrent} onClick={() => handleRevokeSession(s.id)}>{isCurrent ? '—' : 'Revoke'}</button>
                </div>
              )
            })}
            {sessions.length === 0 && (
              <div className="session-empty">No active sessions found.</div>
            )}
          </div>
        </div>

        <div className="settings-card danger-card">
          <div className="head"><div><h2>Danger zone</h2><span className="sub">Permanent actions. No undo.</span></div></div>
          <div className="body">
            <div className="danger-row">
              <div>
                <div className="title">Change class</div>
                <div className="desc">
                  Currently <b>{profileData?.class || 'N/A'}</b>. Switching class
                  resets your progress (streak, rank, attempts) — your cohort
                  on the leaderboard cannot change in place.
                </div>
              </div>
              <button
                className="btn-danger"
                onClick={() => {
                  setClassChangeTarget(profileData?.class || 'Class 12')
                  setDangerModal('change-class')
                }}
              >
                <RotateCcw size={14} />Change class
              </button>
            </div>
            <div className="danger-row">
              <div><div className="title">Reset all progress</div><div className="desc">Clears your streak, accuracy, rank history, and badges. Your account stays.</div></div>
              <button className="btn-danger" onClick={() => setDangerModal('reset')}><RotateCcw size={14} />Reset progress</button>
            </div>
            <div className="danger-row">
              <div><div className="title">Delete account</div><div className="desc">Removes your data permanently. Active subscriptions are not refunded.</div></div>
              <button className="btn-danger" onClick={() => setDangerModal('delete')}><Trash2 size={14} />Delete account</button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={!!dangerModal}
        onClose={() => setDangerModal(null)}
        title={
          dangerModal === 'reset' ? 'Reset Progress'
            : dangerModal === 'change-class' ? 'Change class & reset progress'
            : 'Delete Account'
        }
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
            <button className="btn btn-secondary" onClick={() => setDangerModal(null)}>Cancel</button>
            <button
              className="btn btn-danger"
              onClick={handleDangerAction}
              disabled={dangerConfirm.trim() !== (profileData?.username || '')}
            >
              {dangerModal === 'reset' ? 'Reset Progress'
                : dangerModal === 'change-class' ? 'Change class & reset'
                : 'Delete Account'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {dangerModal === 'change-class' ? (
            <>
              <p style={{ color: 'var(--rr-fg-2)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
                Picking a different class will <b>wipe your streak, accuracy, rank history, and quiz attempts</b> the same way a reset does — then move you onto the new class's leaderboard. This can't be undone.
              </p>
              <div className="field">
                <label>New class</label>
                <Select
                  value={classChangeTarget}
                  onChange={(v) => setClassChangeTarget(v)}
                  ariaLabel="New class"
                  options={[
                    { value: 'Class 9',  label: 'Class 9'  },
                    { value: 'Class 10', label: 'Class 10' },
                    { value: 'Class 11', label: 'Class 11' },
                    { value: 'Class 12', label: 'Class 12' },
                    { value: 'Dropper',  label: 'Dropper'  },
                  ]}
                />
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--rr-fg-2)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
              {dangerModal === 'reset'
                ? 'Are you absolutely sure you want to reset all your progress? This action will wipe your streak, xp, accuracy, and badges. This cannot be undone.'
                : "We're sad to see you go. Are you sure you want to delete your account? This permanently removes all your data, progress, and active subscriptions — it can't be undone."}
            </p>
          )}

          {/* GitHub-style confirmation: type the exact username, no pasting. */}
          <div className="field">
            <label>
              To confirm, type your username{' '}
              <code className="danger-confirm-username">{profileData?.username || '—'}</code>
            </label>
            <input
              type="text"
              value={dangerConfirm}
              onChange={(e) => setDangerConfirm(e.target.value)}
              onPaste={(e) => {
                e.preventDefault()
                toast('Pasting is disabled — please type your username.', { icon: '✋' })
              }}
              onDrop={(e) => e.preventDefault()}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="your username"
              aria-label="Type your username to confirm"
            />
          </div>
        </div>
      </Modal>

      <AvatarCropModal
        open={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        onUploaded={(url) => {
          if (!url) return
          // Reflect the new photo locally and in the global auth user so the
          // sidebar/header avatar updates without a full reload.
          setProfileData((prev) => (prev ? { ...prev, profilePicture: url, avatar: url } : prev))
          if (user) updateUser({ ...user, profilePicture: url, avatar: url })
        }}
      />

      {dangerBusy && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'var(--rr-bg)',
            display: 'grid',
            placeItems: 'center',
          }}
          role="status"
          aria-live="polite"
        >
          <BrandLoader label={dangerBusy} fullscreen={false} />
        </div>
      )}

    </div>
  )
}
