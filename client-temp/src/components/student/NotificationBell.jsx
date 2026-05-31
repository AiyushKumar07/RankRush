import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  Trophy,
  TrendingUp,
  Coins,
  Medal,
  Flame,
  Crown,
  Gift,
  Bell as BellIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationsAPI } from '../../services/api';
import './NotificationBell.css';

const POLL_INTERVAL_MS = 30_000;
const TOP_TOAST_DURATION = 5500;

/**
 * Icon + tone per notification type. Keeps the dropdown row visually
 * consistent with the activity feed without coupling the two.
 */
const TYPE_VISUAL = {
  QUIZ_RESULT:      { Icon: Trophy,     tone: 'emerald' },
  RANK_MOVEMENT:    { Icon: TrendingUp, tone: 'cyan'    },
  TOKEN_CREDIT:     { Icon: Coins,      tone: 'lime'    },
  BADGE_EARNED:     { Icon: Medal,      tone: 'amber'   },
  STREAK_MILESTONE: { Icon: Flame,      tone: 'orange'  },
  SUBSCRIPTION:    { Icon: Crown,      tone: 'violet'  },
  SYSTEM:           { Icon: BellIcon,   tone: 'neutral' },
};

function timeAgo(iso) {
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  const seconds = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h ago`;
  if (seconds < 7 * 86_400) return `${Math.round(seconds / 86_400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function NotificationRow({ item, onClick, onMarkRead, onDelete }) {
  const visual = TYPE_VISUAL[item.type] || TYPE_VISUAL.SYSTEM;
  const { Icon } = visual;
  const isUnread = !item.readAt;
  return (
    <div
      className={`nb-row ${isUnread ? 'nb-row-unread' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onClick(item)}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(item); }}
    >
      <div className={`nb-row-icon nb-tone-${visual.tone}`}>
        <Icon size={14} />
      </div>
      <div className="nb-row-body">
        <div className="nb-row-title">
          {item.title}
          {isUnread && <span className="nb-unread-dot" />}
        </div>
        {item.body && <div className="nb-row-text">{item.body}</div>}
        <div className="nb-row-time">{timeAgo(item.createdAt)}</div>
      </div>
      <div className="nb-row-actions">
        {isUnread && (
          <button
            type="button"
            className="nb-row-btn"
            title="Mark as read"
            onClick={(e) => { e.stopPropagation(); onMarkRead(item); }}
          >
            <Check size={12} />
          </button>
        )}
        <button
          type="button"
          className="nb-row-btn nb-row-btn-danger"
          title="Delete"
          onClick={(e) => { e.stopPropagation(); onDelete(item); }}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const popupRef = useRef(null);
  const triggerRef = useRef(null);

  // Track the most-recent createdAt we've seen so the polling loop can
  // surface NEW notifications as a top-middle toast without showing
  // every existing one on first load.
  const seenAtRef = useRef(0);

  const fetchList = useCallback(async (opts = {}) => {
    const { silent = false } = opts;
    if (!silent) setLoading(true);
    try {
      const res = await notificationsAPI.list({ limit: 30 });
      const payload = res?.data || res;
      const fetched = payload?.items || [];
      const count = payload?.unreadCount ?? 0;
      setItems(fetched);
      setUnreadCount(count);
      // First-load: seed seenAtRef so we don't toast on every old item.
      // Subsequent loads: anything newer than seenAtRef is "new" → toast.
      const newestTs = fetched.length
        ? new Date(fetched[0].createdAt).getTime()
        : 0;
      if (!silent || seenAtRef.current === 0) {
        seenAtRef.current = newestTs;
      } else if (newestTs > seenAtRef.current) {
        // Fire a top-middle toast for the newest one we haven't seen.
        const fresh = fetched.filter(
          (n) => new Date(n.createdAt).getTime() > seenAtRef.current,
        );
        // Limit toast spam: show at most 3 (most recent first).
        fresh.slice(0, 3).forEach((n) => {
          const visual = TYPE_VISUAL[n.type] || TYPE_VISUAL.SYSTEM;
          toast.custom(
            (t) => (
              <div
                className={`nb-toast ${t.visible ? 'nb-toast-in' : 'nb-toast-out'}`}
                role="status"
                onClick={() => {
                  toast.dismiss(t.id);
                  if (n.link) navigate(n.link);
                }}
              >
                <div className={`nb-row-icon nb-tone-${visual.tone}`}>
                  <visual.Icon size={14} />
                </div>
                <div className="nb-toast-body">
                  <div className="nb-toast-title">{n.title}</div>
                  {n.body && <div className="nb-toast-text">{n.body}</div>}
                </div>
              </div>
            ),
            { duration: TOP_TOAST_DURATION, position: 'top-center', id: `notif-${n.id}` },
          );
        });
        seenAtRef.current = newestTs;
      }
    } catch {
      // Silent — the bell is best-effort.
    } finally {
      if (!silent) setLoading(false);
    }
  }, [navigate]);

  // Initial fetch (silent so it doesn't surface a loading state on every
  // route render) + polling on an interval. Also re-fetches when the
  // window/tab regains focus, which is when students actually look.
  useEffect(() => {
    fetchList({ silent: true });
    const id = setInterval(() => fetchList({ silent: true }), POLL_INTERVAL_MS);
    const onFocus = () => fetchList({ silent: true });
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchList]);

  // Close on outside click / Esc.
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (popupRef.current && popupRef.current.contains(e.target)) return;
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleRowClick = useCallback(async (item) => {
    if (!item.readAt) {
      try { await notificationsAPI.markRead(item.id); } catch { /* swallow */ }
    }
    setOpen(false);
    if (item.link) navigate(item.link);
    // Optimistic update so the dropdown doesn't re-fetch just to flip
    // a single read flag.
    setItems((prev) => prev.map((p) => p.id === item.id ? { ...p, readAt: p.readAt || new Date().toISOString() } : p));
    setUnreadCount((c) => Math.max(0, c - (item.readAt ? 0 : 1)));
  }, [navigate]);

  const handleMarkRead = useCallback(async (item) => {
    try { await notificationsAPI.markRead(item.id); } catch { return; }
    setItems((prev) => prev.map((p) => p.id === item.id ? { ...p, readAt: new Date().toISOString() } : p));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const handleDelete = useCallback(async (item) => {
    try { await notificationsAPI.deleteOne(item.id); } catch { return; }
    setItems((prev) => prev.filter((p) => p.id !== item.id));
    if (!item.readAt) setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try { await notificationsAPI.markAllRead(); } catch { return; }
    setItems((prev) => prev.map((p) => p.readAt ? p : { ...p, readAt: new Date().toISOString() }));
    setUnreadCount(0);
  }, []);

  const handleClearAll = useCallback(async () => {
    if (!items.length) return;
    if (!window.confirm('Delete all notifications? This can’t be undone.')) return;
    try { await notificationsAPI.deleteAll(); } catch { return; }
    setItems([]);
    setUnreadCount(0);
  }, [items.length]);

  const badge = useMemo(() => {
    if (unreadCount <= 0) return null;
    return unreadCount > 9 ? '9+' : String(unreadCount);
  }, [unreadCount]);

  return (
    <div className="nb-root">
      <button
        ref={triggerRef}
        type="button"
        className="tb-icon-btn nb-trigger"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={17} />
        {badge && <span className="nb-badge">{badge}</span>}
      </button>

      {open && (
        <div ref={popupRef} className="nb-popup" role="dialog" aria-label="Notifications">
          <div className="nb-popup-head">
            <div className="nb-popup-title">
              Notifications
              {unreadCount > 0 && (
                <span className="nb-popup-count">{unreadCount} new</span>
              )}
            </div>
            <div className="nb-popup-tools">
              <button
                type="button"
                className="nb-tool-btn"
                disabled={unreadCount === 0}
                onClick={handleMarkAllRead}
                title="Mark all as read"
              >
                <CheckCheck size={12} />
                <span>Mark all read</span>
              </button>
              <button
                type="button"
                className="nb-tool-btn nb-tool-danger"
                disabled={items.length === 0}
                onClick={handleClearAll}
                title="Delete all"
              >
                <Trash2 size={12} />
                <span>Clear</span>
              </button>
            </div>
          </div>
          <div className="nb-popup-body">
            {loading ? (
              <div className="nb-empty">Loading…</div>
            ) : items.length === 0 ? (
              <div className="nb-empty">
                <Bell size={20} />
                <span>No notifications yet</span>
                <small>Quiz results, rank moves and bonuses will show up here.</small>
              </div>
            ) : (
              items.map((n) => (
                <NotificationRow
                  key={n.id}
                  item={n}
                  onClick={handleRowClick}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
