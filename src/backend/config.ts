import { publicUrl } from '../lib/public-url';
export const publishedSite = 'https://owen1night.github.io/el-zhady/';
export function readBackendConfig(url: string | undefined, key: string | undefined): { url: string; key: string } | null {
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') return null;
    if (key.startsWith('sb_publishable_') && /^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return { url: parsed.origin, key };
    // Legacy anon JWTs are public; a service-role JWT must NEVER become a client.
    const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (key.split('.').length !== 3 || payload.role !== 'anon') return null;
    return { url: parsed.origin, key };
  } catch { return null; }
}
export const siteUrl = publicUrl(import.meta.env?.VITE_PUBLIC_SITE_URL) || publishedSite;
export const backendConfig = readBackendConfig(import.meta.env?.VITE_SUPABASE_URL, import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY);
