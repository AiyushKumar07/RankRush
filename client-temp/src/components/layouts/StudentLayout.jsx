/**
 * StudentLayout — sidebar + topbar shell for /app/* routes.
 *
 * Responsive:
 *   >980px — 240px sidebar
 *   720–980px — 64px icon-only sidebar
 *   <720px — sidebar hidden, hamburger opens drawer overlay
 */
import { useState, useEffect, useCallback } from "react";
import {
  Outlet,
  NavLink,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Home,
  BookOpen,
  Flame,
  Trophy,
  Users,
  MessageCircle,
  Bookmark,
  Video,
  Coins,
  Gift,
  Receipt,
  Crown,
  Search,
  Bell,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import RRBrand from "../brand/RRBrand";
import ThemeToggle from "../ui/ThemeToggle";
import TokenWallet from "../ui/TokenWallet";
import { useAuth } from "../../context/AuthContext";
import { EntitlementsProvider, useEntitlements } from "../../hooks/useEntitlements";
import { tokensAPI } from "../../services/api";
import "./StudentLayout.css";

// Map the real plan name from the server (Free / Starter / Pro / Institutional / …)
// down to a coarse slug used for theming and PRO-pill display.
function planNameToSlug(name) {
  if (!name) return "free";
  const lower = name.toLowerCase();
  if (lower.includes("pro")) return "pro";
  if (lower.includes("free")) return "free";
  return "paid"; // Starter, custom tiers — paid but not Pro
}

const STUDY = [
  { to: "/app", icon: Home, label: "Home" },
  { to: "/app/quizzes", icon: BookOpen, label: "Quizzes", pill: "147" },
  { to: "/app/activity", icon: Flame, label: "Activity" },
];

const COMING_SOON = [
  { icon: Trophy, label: "Leaderboard" },
  { icon: Users, label: "Study Groups" },
  { icon: MessageCircle, label: "Chat" },
  { icon: Bookmark, label: "Notes" },
  { icon: Video, label: "Lectures" },
];

// Pill values are filled in at render time from live data (token balance,
// plan slug). Defined as a function so the values can't go stale at
// module-load.
function buildAccountNav({ tokenBalance }) {
  return [
    { to: "/app/tokens", icon: Coins, label: "Tokens", pill: String(tokenBalance ?? 0) },
    { to: "/app/refer", icon: Gift, label: "Refer & Earn" },
    { to: "/app/billing", icon: Receipt, label: "Billing" },
    {
      to: "/app/pricing",
      icon: Crown,
      label: "Pricing",
      pill: "PRO",
      isPricing: true,
    },
  ];
}

export default function StudentLayout() {
  return (
    <EntitlementsProvider>
      <StudentLayoutInner />
    </EntitlementsProvider>
  );
}

function StudentLayoutInner() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { planName } = useEntitlements();
  const plan = planNameToSlug(planName); // "free" | "paid" | "pro"

  const [tokenBalance, setTokenBalance] = useState(0);
  useEffect(() => {
    let cancelled = false;
    tokensAPI.getBalance()
      .then((res) => {
        if (cancelled) return;
        const balance = res?.data?.balance ?? res?.balance ?? 0;
        setTokenBalance(balance);
      })
      .catch(() => { /* ignore — keep last balance */ });
    return () => { cancelled = true; };
  }, [planName]); // refetch after a plan change

  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const displayUser = {
    name: user?.firstName
      ? `${user.firstName} ${user.lastName?.[0] || ""}.`
      : user?.name || "Student",
    initial: user?.firstName?.[0] || user?.name?.[0] || "S",
  };

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate("/login");
  }, [logout, navigate]);

  return (
      <div className="student-app">
        {/* Drawer backdrop (mobile) */}
        {drawerOpen && (
          <div className="drawer-backdrop" onClick={closeDrawer} />
        )}

        {/* SIDEBAR */}
        <aside className={`student-sidebar ${drawerOpen ? "open" : ""}`}>
          <div className="sidebar-top-row">
            <RRBrand to="/app" />
            <button
              className="drawer-close"
              onClick={closeDrawer}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          <SidebarGroup label="Study">
            {STUDY.map((item) => (
              <SidebarItem key={item.to} {...item} />
            ))}
          </SidebarGroup>

          <SidebarGroup label="Coming soon">
            {COMING_SOON.map((item) => (
              <SidebarItem key={item.label} {...item} soon />
            ))}
          </SidebarGroup>

          <SidebarGroup label="Account">
            {buildAccountNav({ tokenBalance }).map((item) => (
              <SidebarItem key={item.label} {...item} plan={plan} />
            ))}
          </SidebarGroup>

          <div className="sidebar-footer-wrap">
            <Link to="/app/profile" className="sidebar-footer">
              <div className="sidebar-avatar">{displayUser.initial}</div>
              <div className="sidebar-user-meta">
                <div className="sidebar-user-name">{displayUser.name}</div>
                <div className="sidebar-user-plan">
                  {planName || "Free"}
                  {user?.class ? ` · ${user.class}` : ""}
                </div>
              </div>
            </Link>
            <button
              className="sidebar-logout"
              onClick={handleLogout}
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="student-main">
          <Topbar
            tokenBalance={tokenBalance}
            plan={plan}
            onMenuClick={() => setDrawerOpen(true)}
          />
          <Outlet />
        </main>
      </div>
  );
}

function SidebarGroup({ label, children }) {
  return (
    <div className="sb-group">
      <span className="sb-label">{label}</span>
      {children}
    </div>
  );
}

function SidebarItem({ to, icon: Icon, label, pill, soon, isPricing, plan }) {
  const inner = ({ isActive } = {}) => (
    <div
      className={`sb-item ${isActive ? "active" : ""} ${soon ? "soon" : ""}`}
    >
      <Icon size={17} className="sb-icon" />
      <span className="sb-text">{label}</span>
      {pill && (
        <span
          className="sb-pill"
          style={{
            background: soon
              ? "color-mix(in oklab, var(--rr-amber-500) 16%, transparent)"
              : isPricing && plan === "free"
                ? "var(--rr-lime-400)"
                : undefined,
            color: soon
              ? "var(--rr-amber-500)"
              : isPricing && plan === "free"
                ? "#0E0E13"
                : undefined,
            fontWeight: soon || isPricing ? 600 : undefined,
            textTransform: soon ? "uppercase" : undefined,
          }}
        >
          {soon ? "Soon" : pill}
        </span>
      )}
    </div>
  );

  if (soon || !to) return <span>{inner()}</span>;
  return (
    <NavLink to={to} end style={{ textDecoration: "none" }}>
      {({ isActive }) => inner({ isActive })}
    </NavLink>
  );
}

function Topbar({ tokenBalance, plan, onMenuClick }) {
  return (
    <div className="student-topbar">
      <button
        className="hamburger"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <div className="tb-search">
        <Search size={16} />
        <input placeholder="Search quizzes, topics, friends…" />
        <kbd>⌘K</kbd>
      </div>

      <div className="tb-actions">
        <ThemeToggle />
        <TokenWallet balance={tokenBalance} plan={plan} />
        <button className="tb-icon-btn" aria-label="Notifications">
          <Bell size={17} />
          <span className="tb-indicator" />
        </button>
      </div>
    </div>
  );
}
