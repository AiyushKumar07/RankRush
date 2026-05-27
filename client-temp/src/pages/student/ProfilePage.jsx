import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Camera, Share2, Pencil, Flame, Target, CircleCheck, Trophy,
  CircleUser, Bell, Palette, Lock, Sun, Moon, Monitor,
  Info, Link as LinkIcon, Check, Leaf, ArrowUp,
  LogOut, Laptop, Smartphone, Monitor as MonitorDevice,
  RotateCcw, Trash2, GraduationCap
} from 'lucide-react'
import './ProfilePage.css'

const TABS = [
  { key: 'account', label: 'Account', icon: CircleUser },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'security', label: 'Security', icon: Lock },
]

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('account')
  const [themeCard, setThemeCard] = useState('light')

  const [toggles, setToggles] = useState({
    streakReminder: true,
    weeklyRank: true,
    friendJoins: true,
    productUpdates: false,
    streakExpire: true,
    rankMovement: true,
    weakTopics: false,
    reduceMotion: false,
    compactLayout: false,
  })

  const toggle = (key) => setToggles(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="main">

      <div className="crumb">/ Account / Profile</div>

      <div className="profile-card">
        <div className="profile-cover"></div>
        <div className="profile-header">
          <div className="profile-avatar">
            A
            <div className="avatar-edit"><Camera size={14} /></div>
          </div>
          <div className="profile-meta">
            <h1>Astitva Rathore</h1>
            <p className="tagline">Class <b>12</b> · targeting <b>JEE Main 2026</b> · <b>Allen, Kota</b> · member since <b>Jan 2026</b></p>
            <div className="pill-row">
              <span className="badge violet"><GraduationCap size={12} />JEE Main · PCM</span>
              <span className="badge warn"><Flame size={12} />17-day streak</span>
              <span className="badge lime"><Trophy size={12} />Top 5% · this week</span>
              <span className="badge neutral">Free plan</span>
            </div>
          </div>
          <div className="profile-actions">
            <button className="btn btn-secondary"><Share2 size={14} />Share profile</button>
            <button className="btn btn-accent"><Pencil size={14} />Edit profile</button>
          </div>
        </div>
      </div>

      <div className="qs-row">
        <div className="qs-cell amber">
          <span className="lbl"><Flame size={12} />Streak</span>
          <div className="v">17<small> days</small></div>
        </div>
        <div className="qs-cell emerald">
          <span className="lbl"><Target size={12} />Accuracy</span>
          <div className="v">92.4<small>%</small></div>
        </div>
        <div className="qs-cell violet">
          <span className="lbl"><CircleCheck size={12} />Questions</span>
          <div className="v">1,247</div>
        </div>
        <div className="qs-cell cyan">
          <span className="lbl"><Trophy size={12} />Best rank</span>
          <div className="v">#88</div>
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
            <h3>You're on the Free plan</h3>
            <span className="desc">2 tokens per month · renews on 1 June 2026. Upgrade for 10× the quizzes.</span>
          </div>
          <Link to="/pricing" className="btn btn-lime"><ArrowUp size={14} />See plans</Link>
        </div>

        <div className="settings-card">
          <div className="head">
            <div>
              <h2>Personal info</h2>
              <span className="sub">Tell us who you are. Used on your profile and the leaderboard.</span>
            </div>
            <span className="badge neutral"><CircleCheck size={12} style={{ color: 'var(--rr-emerald-500)' }} />Verified email</span>
          </div>
          <div className="body">
            <div className="form-grid">
              <div className="field"><label>First name</label><input defaultValue="Astitva" /></div>
              <div className="field"><label>Last name</label><input defaultValue="Rathore" /></div>
              <div className="field"><label>Email</label><input type="email" defaultValue="astitva.r@gmail.com" disabled /><span className="helper"><Info size={12} />Change via Security tab</span></div>
              <div className="field"><label>Phone</label><input type="tel" defaultValue="+91 98765 43210" /></div>
              <div className="field"><label>Date of birth</label><input type="date" defaultValue="2008-04-12" /></div>
              <div className="field"><label>Username</label><input defaultValue="astitva-rt7k" /><span className="helper"><LinkIcon size={12} />rankrush.in/u/astitva-rt7k</span></div>
            </div>
          </div>
          <div className="foot">
            <span className="note">Changes save automatically</span>
            <div className="right">
              <button className="btn btn-ghost btn-sm">Cancel</button>
              <button className="btn btn-accent btn-sm"><Check size={14} />Save changes</button>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="head">
            <div>
              <h2>Academic profile</h2>
              <span className="sub">Determines which quizzes appear in your library and what we calibrate against.</span>
            </div>
          </div>
          <div className="body">
            <div className="form-grid">
              <div className="field"><label>Class / Standard</label><select defaultValue="Class 12"><option>Class 9</option><option>Class 10</option><option>Class 11</option><option>Class 12</option><option>Dropper</option></select></div>
              <div className="field"><label>Board</label><select defaultValue="CBSE"><option>CBSE</option><option>ICSE</option><option>State board</option><option>IB</option></select></div>
              <div className="field"><label>Target exam</label><select defaultValue="JEE Main"><option>JEE Main</option><option>JEE Advanced</option><option>NEET</option><option>BITSAT</option><option>Board exams only</option></select></div>
              <div className="field"><label>Stream</label><select defaultValue="PCM (Physics, Chemistry, Maths)"><option>PCM (Physics, Chemistry, Maths)</option><option>PCB (Physics, Chemistry, Biology)</option><option>PCMB</option></select></div>
              <div className="field"><label>School / Coaching centre</label><input defaultValue="Allen Career Institute, Kota" /></div>
              <div className="field"><label>City</label><input defaultValue="Kota, Rajasthan" /></div>
            </div>
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS TAB */}
      <div className={`tab-content${activeTab === 'notifications' ? ' active' : ''}`}>
        <div className="settings-card">
          <div className="head"><div><h2>Email notifications</h2><span className="sub">What lands in your inbox.</span></div></div>
          <div className="body">
            <div className="tog-row"><div className="text"><span className="title">Daily streak reminder</span><span className="desc">Quiet nudge at 8 PM if you haven't taken a quiz today.</span></div><div className={`tog${toggles.streakReminder ? ' on' : ''}`} onClick={() => toggle('streakReminder')}></div></div>
            <div className="tog-row"><div className="text"><span className="title">Weekly rank report</span><span className="desc">Every Sunday — where you climbed, where you slipped.</span></div><div className={`tog${toggles.weeklyRank ? ' on' : ''}`} onClick={() => toggle('weeklyRank')}></div></div>
            <div className="tog-row"><div className="text"><span className="title">Friend joins via your link</span><span className="desc">Get notified when a referred friend signs up or upgrades.</span></div><div className={`tog${toggles.friendJoins ? ' on' : ''}`} onClick={() => toggle('friendJoins')}></div></div>
            <div className="tog-row"><div className="text"><span className="title">Product updates</span><span className="desc">New features, new quiz drops, occasional newsletter.</span></div><div className={`tog${toggles.productUpdates ? ' on' : ''}`} onClick={() => toggle('productUpdates')}></div></div>
          </div>
        </div>
        <div className="settings-card">
          <div className="head"><div><h2>Push notifications</h2><span className="sub">Browser &amp; mobile alerts.</span></div></div>
          <div className="body">
            <div className="tog-row"><div className="text"><span className="title">Streak about to expire</span><span className="desc">3-hour warning so you don't lose a streak you've earned.</span></div><div className={`tog${toggles.streakExpire ? ' on' : ''}`} onClick={() => toggle('streakExpire')}></div></div>
            <div className="tog-row"><div className="text"><span className="title">Rank movement</span><span className="desc">When you climb or drop more than 10 ranks in a day.</span></div><div className={`tog${toggles.rankMovement ? ' on' : ''}`} onClick={() => toggle('rankMovement')}></div></div>
            <div className="tog-row"><div className="text"><span className="title">New quiz in your weak topics</span><span className="desc">Quizzes calibrated to topics you're under 70% on.</span></div><div className={`tog${toggles.weakTopics ? ' on' : ''}`} onClick={() => toggle('weakTopics')}></div></div>
          </div>
        </div>
      </div>

      {/* APPEARANCE TAB */}
      <div className={`tab-content${activeTab === 'appearance' ? ' active' : ''}`}>
        <div className="settings-card">
          <div className="head"><div><h2>Theme</h2><span className="sub">Light during the day, dark at night. Or let your OS decide.</span></div></div>
          <div className="body">
            <div className="theme-cards">
              <div className={`theme-card light${themeCard === 'light' ? ' on' : ''}`} onClick={() => setThemeCard('light')}>
                <div className="theme-preview"></div>
                <div className="name"><Sun size={16} />Light</div>
                <span className="sub">Warm paper background. Default.</span>
              </div>
              <div className={`theme-card dark${themeCard === 'dark' ? ' on' : ''}`} onClick={() => setThemeCard('dark')}>
                <div className="theme-preview"></div>
                <div className="name"><Moon size={16} />Dark</div>
                <span className="sub">Ink-deep background. Easy on the eyes at night.</span>
              </div>
              <div className={`theme-card auto${themeCard === 'auto' ? ' on' : ''}`} onClick={() => setThemeCard('auto')}>
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
            <div className="tog-row"><div className="text"><span className="title">Reduce motion</span><span className="desc">Turn off the rank-bar animations and spring transitions. Honours <span style={{ fontFamily: 'var(--rr-font-mono)', color: 'var(--rr-fg)' }}>prefers-reduced-motion</span>.</span></div><div className={`tog${toggles.reduceMotion ? ' on' : ''}`} onClick={() => toggle('reduceMotion')}></div></div>
            <div className="tog-row"><div className="text"><span className="title">Compact layout</span><span className="desc">Tighter spacing on the dashboard and quiz cards. Helps on small laptops.</span></div><div className={`tog${toggles.compactLayout ? ' on' : ''}`} onClick={() => toggle('compactLayout')}></div></div>
          </div>
        </div>
      </div>

      {/* SECURITY TAB */}
      <div className={`tab-content${activeTab === 'security' ? ' active' : ''}`}>
        <div className="settings-card">
          <div className="head"><div><h2>Password</h2><span className="sub">Last changed 4 weeks ago. We recommend rotating every 90 days.</span></div></div>
          <div className="body">
            <div className="form-grid">
              <div className="field"><label>Current password</label><input type="password" defaultValue="••••••••••" /></div>
              <div className="field"><label>New password</label><input type="password" placeholder="At least 10 characters" /></div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>Confirm new password</label><input type="password" placeholder="Type it once more" /></div>
            </div>
          </div>
          <div className="foot">
            <span className="note">Strong, unique, never re-used.</span>
            <div className="right"><button className="btn btn-accent btn-sm"><Lock size={14} />Update password</button></div>
          </div>
        </div>

        <div className="settings-card">
          <div className="head">
            <div><h2>Active sessions</h2><span className="sub">Devices currently signed in. Revoke any you don't recognise.</span></div>
            <button className="btn btn-secondary btn-sm"><LogOut size={14} />Sign out of all</button>
          </div>
          <div className="body">
            <div className="session-row current">
              <div className="dev-ico"><Laptop size={16} /></div>
              <div className="info"><span className="dev-name">MacBook Pro · Safari</span><span className="dev-loc">Kota, Rajasthan · 49.207.xx.xx</span></div>
              <span className="pill-now">This device</span>
              <button className="btn-revoke" disabled>—</button>
            </div>
            <div className="session-row">
              <div className="dev-ico"><Smartphone size={16} /></div>
              <div className="info"><span className="dev-name">iPhone 14 · Mobile Safari</span><span className="dev-loc">Kota, Rajasthan · 2 hours ago</span></div>
              <span className="when">Active 2h ago</span>
              <button className="btn-revoke">Revoke</button>
            </div>
            <div className="session-row">
              <div className="dev-ico"><MonitorDevice size={16} /></div>
              <div className="info"><span className="dev-name">Windows PC · Chrome</span><span className="dev-loc">Jaipur · 4 days ago</span></div>
              <span className="when">4 days ago</span>
              <button className="btn-revoke">Revoke</button>
            </div>
          </div>
        </div>

        <div className="settings-card danger-card">
          <div className="head"><div><h2>Danger zone</h2><span className="sub">Permanent actions. No undo.</span></div></div>
          <div className="body">
            <div className="danger-row">
              <div><div className="title">Reset all progress</div><div className="desc">Clears your streak, accuracy, rank history, and badges. Your account stays.</div></div>
              <button className="btn-danger"><RotateCcw size={14} />Reset progress</button>
            </div>
            <div className="danger-row">
              <div><div className="title">Delete account</div><div className="desc">Removes your data permanently. Active subscriptions are not refunded.</div></div>
              <button className="btn-danger"><Trash2 size={14} />Delete account</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
