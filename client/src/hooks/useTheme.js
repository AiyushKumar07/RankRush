/**
 * useTheme — light/dark/auto hook.
 *
 * `preference` is the user choice ("light" | "dark" | "auto") and is persisted
 * to localStorage. `theme` is the resolved value applied to <html data-theme=…>.
 * In "auto" mode the resolved value follows `prefers-color-scheme` live.
 */
import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "rr-theme";

function resolve(pref) {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [preference, setPreferenceState] = useState(() => {
    if (typeof window === "undefined") return "auto";
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "auto" ? stored : "auto";
  });
  const [theme, setTheme] = useState(() => resolve(preference));

  useEffect(() => {
    setTheme(resolve(preference));
    localStorage.setItem(STORAGE_KEY, preference);
  }, [preference]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (preference !== "auto" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setTheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((p) => {
    setPreferenceState(p === "light" || p === "dark" || p === "auto" ? p : "auto");
  }, []);

  const toggle = useCallback(() => {
    setPreferenceState(p => (resolve(p) === "light" ? "dark" : "light"));
  }, []);

  return { theme, preference, setTheme: setPreference, setPreference, toggle };
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
