/**
 * AdminLayout — sidebar + topbar shell for /admin/* routes.
 *
 * Responsive:
 *   >980px — 248px sidebar
 *   720–980px — 64px icon-only sidebar
 *   <720px — sidebar hidden, hamburger opens drawer overlay
 */
import { useState, useEffect, useCallback } from "react";
import { Outlet, NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Receipt,
  BookOpen, List, HelpCircle,
  Users,
  Crown, Ticket,
  Search, Bell, Menu, X, LogOut,
} from "lucide-react";
import RRBrand from "../brand/RRBrand";
import ThemeToggle from "../ui/ThemeToggle";
import { useAuth } from "../../context/AuthContext";
import { EnvTag } from "../admin/EnvSwitcher";
import "./AdminLayout.css";

const OVERVIEW = [
  { to: "/admin",              icon: LayoutDashboard, label: "Dashboard",   pill: "Live", pillClass: "live" },
  { to: "/admin/transactions", icon: Receipt,         label: "Transactions" },
];

const CATALOG = [
  { to: "/admin/quizzes",  icon: BookOpen,    label: "Quizzes",   pill: "147" },
  { icon: List,            label: "Topics",    pill: "38" },
  { icon: HelpCircle,      label: "Questions", pill: "2,941" },
];

const STUDENTS = [
  { icon: Users,  label: "All students", pill: "12,481" },
];

const MONETISATION = [
  { to: "/admin/plans", icon: Crown,  label: "Plans",        pill: "3" },
  { to: "/admin/codes", icon: Ticket, label: "Redeem codes", pill: "8" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const displayUser = {
    name: user?.name || 'Admin',
    initial: user?.name?.[0] || 'A',
  };

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/admin/login');
  }, [logout, navigate]);

  return (
    <div className="admin-app">
      {drawerOpen && <div className="drawer-backdrop" onClick={closeDrawer} />}

      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${drawerOpen ? "open" : ""}`}>
        <div className="admin-brand-row">
          <RRBrand to="/admin" />
          <EnvTag />
          <button className="drawer-close" onClick={closeDrawer} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <SidebarGroup label="Overview">
          {OVERVIEW.map((item) => <SidebarItem key={item.label} {...item} />)}
        </SidebarGroup>

        <SidebarGroup label="Catalog">
          {CATALOG.map((item) => <SidebarItem key={item.label} {...item} />)}
        </SidebarGroup>

        <SidebarGroup label="Students">
          {STUDENTS.map((item) => <SidebarItem key={item.label} {...item} />)}
        </SidebarGroup>

        <SidebarGroup label="Monetisation">
          {MONETISATION.map((item) => <SidebarItem key={item.label} {...item} />)}
        </SidebarGroup>

        <div className="sidebar-footer-wrap">
          <Link to="#" className="sidebar-footer">
            <div className="sidebar-avatar admin-avatar">{displayUser.initial}</div>
            <div className="sidebar-user-meta">
              <div className="sidebar-user-name">{displayUser.name}</div>
              <div className="sidebar-user-plan">
                <span style={{ color: "var(--rr-emerald-500)" }}>●</span> Owner · Admin
              </div>
            </div>
          </Link>
          <button className="sidebar-logout" onClick={handleLogout} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ minWidth: 0 }}>
        <AdminTopbar onMenuClick={() => setDrawerOpen(true)} />
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

function SidebarItem({ to, icon: Icon, label, pill, pillClass }) {
  const inner = ({ isActive } = {}) => (
    <div className={`sb-item ${isActive ? "active" : ""} ${!to ? "soon" : ""}`}>
      {isActive && <span className="sb-active-bar" />}
      <Icon size={17} className="sb-icon" />
      <span className="sb-text">{label}</span>
      {pill && (
        <span
          className="sb-pill"
          style={{
            background: pillClass === "live"
              ? "color-mix(in oklab, var(--rr-emerald-500) 16%, transparent)"
              : undefined,
            color: pillClass === "live"
              ? "var(--rr-emerald-500)"
              : undefined,
            fontWeight: pillClass === "live" ? 600 : undefined,
          }}
        >
          {pill}
        </span>
      )}
    </div>
  );

  if (!to) return <span>{inner()}</span>;
  return (
    <NavLink to={to} end style={{ textDecoration: "none" }}>
      {({ isActive }) => inner({ isActive })}
    </NavLink>
  );
}

function AdminTopbar({ onMenuClick }) {
  return (
    <div className="admin-topbar">
      <button className="hamburger" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <div className="tb-search">
        <Search size={16} />
        <input placeholder="Search students, quizzes, transactions…" />
        <kbd>⌘K</kbd>
      </div>

      <div className="tb-actions">
        <ThemeToggle />
        <button className="tb-icon-btn" aria-label="Notifications">
          <Bell size={16} />
          <span className="tb-indicator" />
        </button>
      </div>
    </div>
  );
}
