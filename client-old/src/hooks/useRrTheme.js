import { useEffect, useState } from 'react';

/* Shared theme state for the new-design RankRush surfaces.
   `choice` is what the user picked (light/dark/auto) and is persisted across
   pages in localStorage; `theme` is the applied value, derived during render
   (Auto follows the OS color scheme). The hook also keeps the document
   background in step so overscroll matches the page. */

const STORAGE_KEY = 'rr-theme';
// `.rr-app` paints `--rr-bg-alt`, so the body fallback uses the same paper-2 tone.
const PAGE_BG = { light: '#F4F2EC', dark: '#10101A' };

function readChoice() {
  if (typeof window === 'undefined') return 'light';
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'dark' || v === 'auto' || v === 'light' ? v : 'light';
}

export function useRrTheme() {
  const [choice, setChoiceState] = useState(readChoice);
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const theme = choice === 'auto' ? (systemDark ? 'dark' : 'light') : choice;

  // Track the OS color scheme so the "Auto" choice can follow it.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Keep the document background in step with the applied theme.
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = PAGE_BG[theme];
    return () => { document.body.style.backgroundColor = prev; };
  }, [theme]);

  function setChoice(next) {
    setChoiceState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* storage unavailable — keep in-memory */ }
  }

  return { theme, choice, setChoice };
}
