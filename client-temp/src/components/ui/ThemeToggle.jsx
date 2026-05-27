/**
 * ThemeToggle — segmented light/dark control. Drop into any topbar.
 */
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "var(--rr-surface)",
        border: "1px solid var(--rr-border)",
        borderRadius: "var(--rr-r-full)",
        padding: 3,
      }}
    >
      {[
        { key: "light", Icon: Sun },
        { key: "dark", Icon: Moon },
      ].map(({ key, Icon }) => (
        <button
          key={key}
          onClick={() => setTheme(key)}
          aria-label={key}
          aria-selected={theme === key}
          style={{
            background: theme === key ? "var(--rr-ink-900)" : "transparent",
            color: theme === key ? "var(--rr-bg)" : "var(--rr-fg-muted)",
            border: 0,
            padding: "5px 10px",
            borderRadius: "var(--rr-r-full)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            transition: "all 140ms",
          }}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}
