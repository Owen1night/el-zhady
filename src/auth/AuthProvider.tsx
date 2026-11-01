import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../backend/client';
import { siteUrl } from '../backend/config';
import { api } from '../backend/api';
import { bounded, ServiceError, errorText } from '../backend/errors';
import type { Identity, Profile } from '../backend/contracts';
import { consumeDestination, inspectOAuthCallback, oauthRedirectUrl, saveDestination } from './oauth';
import { navigate } from '../lib/navigation';

type Snapshot = { identity: Identity | null; profile: Profile | null; admin: boolean };
type AuthState = Snapshot & { status: 'loading' | 'ready' | 'error' | 'unavailable'; error: string };
const empty: Snapshot = { identity: null, profile: null, admin: false };
const initial: AuthState = { ...empty, status: supabase ? 'loading' : 'unavailable', error: '' };
type AuthValue = AuthState & { retry: () => Promise<void>; google: (destination: string) => Promise<void>; signOut: () => Promise<void>; ensureIdentity: (captcha?: string) => Promise<Identity>; saveProfile: (name: string) => Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider missing'); return value; }

let callbackWasPresent = false;
let callbackWork: Promise<{ isCallback: boolean; destination: string }> | null = null;
function completeCallback() {
  if (callbackWork) return callbackWork;
  callbackWork = (async () => {
    const result = inspectOAuthCallback(window.location.href);
    callbackWasPresent = result.isCallback;
    if (!result.isCallback) return { isCallback: false, destination: '#/profile' };
    // Remove codes/errors from browser history even if exchange fails or times out.
    window.history.replaceState(null, '', result.cleanUrl);
    if (result.failed || !result.code || !supabase) throw new ServiceError('OAUTH_FAILED');
    const { error } = await bounded(supabase.auth.exchangeCodeForSession(result.code));
    if (error) throw new ServiceError('OAUTH_FAILED');
    let destination = '#/profile';
    try { destination = consumeDestination(sessionStorage); } catch { /* safe fallback */ }
    return { isCallback: true, destination };
  })();
  return callbackWork;
}
async function readIdentity(): Promise<Snapshot> {
  if (!supabase) throw new ServiceError('UNCONFIGURED');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) return empty;
  const verified = await supabase.auth.getUser();
  if (verified.error || !verified.data.user) throw verified.error || new ServiceError('AUTH_REQUIRED');
  const identity = { id: verified.data.user.id, anonymous: verified.data.user.is_anonymous === true };
  const access = await api.access();
  // Both client identity and server identity must agree before showing private UI.
  if (access.registered === identity.anonymous) throw new ServiceError('AUTH_REQUIRED');
  const profile = access.registered ? await api.profile(identity.id) : null;
  return { identity, profile, admin: access.admin === true && access.registered === true };
}
let guestWork: Promise<Identity> | null = null;
function requireSessionStorage() {
  try { localStorage.setItem('el-zhady:auth-storage-probe', '1'); localStorage.removeItem('el-zhady:auth-storage-probe'); }
  catch { throw new ServiceError('SESSION_STORAGE'); }
}
let guestWorkOwner = 0;
async function identityForJoin(captcha?: string): Promise<Identity> {
  if (!guestWork) {
    const owner = ++guestWorkOwner;
    guestWork = (async () => {
      if (!supabase) throw new ServiceError('UNCONFIGURED');
      const current = await supabase.auth.getSession();
      if (current.error) throw current.error;
      if (current.data.session) {
        // A stale/failed permanent session is never silently replaced by a guest.
        const existing = await supabase.auth.getUser();
        if (existing.error || !existing.data.user) throw existing.error || new ServiceError('AUTH_REQUIRED');
        return { id: existing.data.user.id, anonymous: existing.data.user.is_anonymous === true };
      }
      requireSessionStorage();
      if (import.meta.env.VITE_TURNSTILE_SITE_KEY && !captcha) throw new ServiceError('CAPTCHA_REQUIRED');
      const result = await supabase.auth.signInAnonymously({ options: { captchaToken: captcha } });
      if (result.error || !result.data.user) throw result.error || new ServiceError('AUTH_REQUIRED');
      return { id: result.data.user.id, anonymous: true };
    })();
    // Keep an outstanding identity operation shared even after the UI's deadline.
    // Retrying must not launch a second anonymous sign-up while the first settles.
    const clear = () => { if (guestWorkOwner === owner) guestWork = null; };
    void guestWork.then(clear, clear);
  }
  return bounded(guestWork);
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initial);
  const generation = useRef(0);
  const mounted = useRef(false);
  const refresh = useCallback(async (): Promise<Snapshot> => {
    const run = ++generation.current;
    if (!supabase) { setState({ ...empty, status: 'unavailable', error: '' }); return empty; }
    setState(previous => ({ ...previous, status: 'loading', error: '' }));
    try {
      const next = await bounded(readIdentity());
      if (mounted.current && generation.current === run) setState({ ...next, status: 'ready', error: '' });
      return next;
    } catch (error) {
      if (mounted.current && generation.current === run) setState({ ...empty, status: 'error', error: errorText(error) });
      throw error;
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    void (async () => {
      try {
        const callback = await completeCallback();
        if (!active) return;
        const next = await refresh();
        if (active && callback.isCallback) {
          if (!next.identity || next.identity.anonymous) throw new ServiceError('OAUTH_FAILED');
          if (!next.profile) window.location.hash = `#/profile?next=${encodeURIComponent(callback.destination)}`;
          else navigate(callback.destination);
        }
      } catch (error) {
        if (active) { setState({ ...empty, status: supabase ? 'error' : 'unavailable', error: errorText(error) });
          if (inspectOAuthCallback(window.location.href).isCallback) window.history.replaceState(null, '', inspectOAuthCallback(window.location.href).cleanUrl);
          if (callbackWasPresent && !window.location.hash.startsWith('#/join')) window.location.hash = '#/auth';
        }
      }
    })();
    const subscription = supabase?.auth.onAuthStateChange(event => {
      if (event === 'INITIAL_SESSION') return;
      // Do not call async Auth methods inside the SDK's auth-state lock.
      setTimeout(() => { if (active) void refresh().catch(() => {}); }, 0);
    });
    return () => { active = false; mounted.current = false; generation.current++; subscription?.data.subscription.unsubscribe(); };
  }, [refresh]);
  const value: AuthValue = {
    ...state,
    retry: async () => { await refresh().catch(() => {}); },
    google: async destination => {
      if (!supabase) throw new ServiceError('UNCONFIGURED');
      requireSessionStorage();
      try { saveDestination(sessionStorage, destination); } catch { throw new ServiceError('SESSION_STORAGE'); }
      const { data, error } = await bounded(supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: oauthRedirectUrl(siteUrl), skipBrowserRedirect: true } }));
      if (error || !data.url) throw new ServiceError('OAUTH_FAILED');
      window.location.assign(data.url);
    },
    signOut: async () => {
      if (!supabase) return;
      const { error } = await bounded(supabase.auth.signOut({ scope: 'local' }));
      if (error) throw error;
      generation.current++; setState({ ...empty, status: 'ready', error: '' });
    },
    ensureIdentity: async captcha => {
      const identity = await identityForJoin(captcha);
      await refresh(); return identity;
    },
    saveProfile: async name => { await api.saveProfile(name); await refresh(); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
