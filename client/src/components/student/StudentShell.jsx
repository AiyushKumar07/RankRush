import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home, BookOpen, Flame, Trophy, Users, MessageCircle, Bookmark, Video,
  Coins, Gift, Receipt, Crown, Search, Sun, Moon, Bell, LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ShellContext } from '../../context/shell';
import api from '../../services/api';
import { useRrTheme } from '../../hooks/useRrTheme';
import { cn } from '../../utils/cn';
import '../../styles/rr-tokens.css';
import '../../styles/app-shell.css';

/* Brand chevron-stack mark — shared across every new-design surface. */
export function BrandMark({ className = 'rr-mark' }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M5 14L12 7L19 14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 19L12 12L19 19" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
      </svg>
    </div>
  );
}

/* Shared app shell (sidebar + topbar) for the migrated student pages.
   Each page renders <StudentShell page="dash" active="home">…</StudentShell>;
   `page` becomes a root modifier class so the page's own CSS can scope under
   `.rr-app.<page>` without colliding with sibling pages. Theme is shared and
   persisted via useRrTheme so it survives navigation between pages. */
export default function StudentShell({ page, active, crumb, wide = false, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, choice, setChoice } = useRrTheme();

  // "View as" plan toggle — seeded from the user's real plan, drives data-plan.
  const realPlan = String(user?.plan).toLowerCase() === 'pro' ? 'pro' : 'free';
  const [plan, setPlan] = useState(realPlan);

  const [tokenBalance, setTokenBalance] = useState(null);

  // Pull the real token balance for the wallet pill (silent on failure).
  useEffect(() => {
    let alive = true;
    api.get('/tokens/balance')
      .then((res) => { if (alive) setTokenBalance(res?.data?.balance ?? null); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const firstName = user?.firstName || user?.name?.split(' ')[0] || 'Student';
  const lastName = user?.lastName || '';
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || user?.name || 'Student';
  const initial = (firstName || 'S').charAt(0).toUpperCase();
  const avatarUrl = user?.profilePicture || user?.avatar || null;
  const tokenCount = tokenBalance ?? (plan === 'pro' ? 50 : 12);
  const planLabel = `${plan === 'pro' ? 'Pro' : 'Free'} · class ${user?.class || '12'}`;

  async function signOut() {
    await logout();
    navigate('/app/login');
  }

  return (
    <ShellContext.Provider value={{ theme, choice, setChoice, plan, setPlan }}>
    <div className={cn('rr-scope rr-app', page)} data-theme={theme} data-plan={plan}>
      {/* =========== SIDEBAR =========== */}
      <aside className="sidebar">
        <div className="rr-brand">
          <BrandMark />
          <span className="rr-name">Rank<b>Rush</b></span>
        </div>

        <div className="sb-group">
          <span className="sb-label">Study</span>
          <Link className={cn('sb-item', active === 'home' && 'active')} to="/app/dashboard"><Home /><span>Home</span></Link>
          <Link className={cn('sb-item', active === 'quizzes' && 'active')} to="/app/quizzes"><BookOpen /><span>Quizzes</span></Link>
          <Link className={cn('sb-item', active === 'activity' && 'active')} to="/app/activity"><Flame /><span>Activity</span></Link>
        </div>

        <div className="sb-group">
          <span className="sb-label">Coming soon</span>
          <span className="sb-item soon"><Trophy /><span>Leaderboard</span><span className="pill soon">Soon</span></span>
          <span className="sb-item soon"><Users /><span>Study Groups</span><span className="pill soon">Soon</span></span>
          <span className="sb-item soon"><MessageCircle /><span>Chat</span><span className="pill soon">Soon</span></span>
          <span className="sb-item soon"><Bookmark /><span>Notes</span><span className="pill soon">Soon</span></span>
          <span className="sb-item soon"><Video /><span>Lectures</span><span className="pill soon">Soon</span></span>
        </div>

        <div className="sb-group">
          <span className="sb-label">Account</span>
          <Link className={cn('sb-item', active === 'tokens' && 'active')} to="/app/pricing"><Coins /><span>Tokens</span><span className="pill tabular">{tokenCount}</span></Link>
          <Link className={cn('sb-item', active === 'refer' && 'active')} to="/app/refer-and-earn"><Gift /><span>Refer &amp; Earn</span></Link>
          <Link className={cn('sb-item', active === 'billing' && 'active')} to="/app/billing"><Receipt /><span>Billing</span></Link>
          <Link className={cn('sb-item', active === 'pricing' && 'active')} to="/app/pricing" data-pricing="true"><Crown /><span>Pricing</span><span className="pill">PRO</span></Link>
        </div>

        <div className="sb-footer">
          <div className="avatar-block">
            <Link className="avatar-link" to="/app/profile">
              <div className="avatar">{avatarUrl ? <img src={avatarUrl} alt={displayName} /> : initial}</div>
              <div className="meta">
                <div className="name">{displayName}</div>
                <div className="plan">{planLabel}</div>
              </div>
            </Link>
            <button className="logout" onClick={signOut} title="Sign out" aria-label="Sign out"><LogOut /></button>
          </div>
        </div>
      </aside>

      {/* =========== MAIN =========== */}
      <main>
        <div className="topbar">
          <div className="tb-search">
            <Search />
            <input placeholder="Search…" />
            <kbd>⌘K</kbd>
          </div>
          <div className="tb-actions">
            <div className="plan-switch">
              <span className="sw-label">View as</span>
              <button className={cn(plan === 'free' && 'active')} onClick={() => setPlan('free')}>Free</button>
              <button className={cn(plan === 'pro' && 'active')} onClick={() => setPlan('pro')}>Pro</button>
            </div>
            <div className="theme-toggle" role="tablist">
              <button className={cn(theme === 'light' && 'active')} onClick={() => setChoice('light')} aria-label="Light"><Sun /></button>
              <button className={cn(theme === 'dark' && 'active')} onClick={() => setChoice('dark')} aria-label="Dark"><Moon /></button>
            </div>
            <Link to="/app/pricing" className={cn('token-wallet', plan === 'pro' && 'pro')}>
              <Coins /><span className="label-text">Tokens</span><span className="coin tabular">{tokenCount}</span>
            </Link>
            <button className="tb-icon-btn" aria-label="Notifications"><Bell /><span className="indicator" /></button>
          </div>
        </div>

        <div className={cn('main', wide && 'wide')}>
          {crumb ? <div className="crumb">{crumb}</div> : null}
          {children}
        </div>
      </main>
    </div>
    </ShellContext.Provider>
  );
}
