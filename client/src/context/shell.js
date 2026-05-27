import { createContext, useContext } from 'react';

/* Shared state published by <StudentShell> (theme + "view as" plan) so pages
   rendered inside the shell can read/drive it — e.g. the Profile page's
   Appearance tab and plan banner. Returns an empty object outside a shell. */
export const ShellContext = createContext(null);

export function useShell() {
  return useContext(ShellContext) || {};
}
