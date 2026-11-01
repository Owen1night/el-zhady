import { readBackendConfig, publishedSite } from '../backend/config';
export const deploymentVariables = ['VITE_PUBLIC_SITE_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_TURNSTILE_SITE_KEY'] as const;
/** Diagnostics contain variable names only, never supplied values. */
export function deploymentConfigErrors(env: Record<string, string | undefined>): string[] {
  const missing = deploymentVariables.filter(name => !env[name]?.trim());
  if (missing.length) return missing.map(name => `${name}: missing`);
  const errors: string[] = [];
  try {
    if (new URL(env.VITE_PUBLIC_SITE_URL!).href !== publishedSite) errors.push('VITE_PUBLIC_SITE_URL: must match the published repository root');
  } catch { errors.push('VITE_PUBLIC_SITE_URL: invalid HTTPS URL'); }
  if (!readBackendConfig(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY)) errors.push('VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY: invalid public configuration');
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(env.VITE_TURNSTILE_SITE_KEY!)) errors.push('VITE_TURNSTILE_SITE_KEY: invalid public site key');
  return errors;
}
