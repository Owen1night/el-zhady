import { createClient } from '@supabase/supabase-js';
import { backendConfig } from './config';
import { fetchWithDeadline } from './fetch';
// Same-origin deployment stays static. Only the public project key belongs here.
export const supabase = backendConfig ? createClient(backendConfig.url, backendConfig.key, {
  auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true, storageKey: 'el-zhady:auth:v1' },
  global: { fetch: fetchWithDeadline },
  realtime: { params: { eventsPerSecond: 5 } },
}) : null;
