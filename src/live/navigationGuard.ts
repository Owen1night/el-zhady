// App checks this before accepting a changed hash. Never intercept external URLs.
let guard: ((destination: string) => void) | null = null;
let bypass: string | null = null;
export function registerLiveGuard(fn: (destination: string) => void) { guard = fn; return () => { if (guard === fn) guard = null; }; }
export function mayNavigate(destination: string) {
  if (bypass === destination) { bypass = null; return true; }
  if (!guard) return true;
  guard(destination); return false;
}
export function leaveLive(destination: string) { bypass = destination; window.location.hash = destination; }
