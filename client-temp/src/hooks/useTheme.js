/**
 * useTheme — minimal light/dark hook.
 *
 * Reads/writes data-theme="light" | "dark" on <html>, persists in localStorage,
 * falls back to OS preference on first load. Pair with <ThemeToggle />.
 */
import { useEffect, useState, useCallback } from "react";

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("rr-theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("rr-theme", theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme(t => (t === "light" ? "dark" : "light")), []);

  return { theme, setTheme, toggle };
}

/**
 * usePlan — preview-only Free / Pro switch. In production, replace this hook
 * body with `useAuth().user.plan`.
 */
export function usePlan() {
  const [plan, setPlan] = useState(() => localStorage.getItem("rr-plan") || "free");
  useEffect(() => {
    document.documentElement.setAttribute("data-plan", plan);
    localStorage.setItem("rr-plan", plan);
  }, [plan]);
  return { plan, setPlan };
}
