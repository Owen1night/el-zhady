import { safeDestination } from '../lib/navigation';
export const destinationKey = 'el-zhady:oauth-destination';
export function inspectOAuthCallback(href: string) {
  const url = new URL(href);
  const query = url.searchParams;
  const hash = new URLSearchParams(url.hash.slice(1));
  const code = query.get('code');
  const hasCode = query.has('code');
  const hashAuth = hash.has('error') || hash.has('error_code') || hash.has('access_token');
  const failed = query.has('error') || query.has('error_code') || query.has('error_description') || hashAuth || (hasCode && (!code || code.length > 2048));
  for (const key of ['code','error','error_code','error_description']) query.delete(key);
  if (hashAuth) url.hash = '';
  return { code: !failed ? code : null, failed, isCallback: hasCode || failed, cleanUrl: url.href };
}
export function oauthRedirectUrl(site: string): string {
  const url = new URL(site);
  if (url.protocol !== 'https:' || !url.pathname.endsWith('/')) throw new Error('Invalid callback URL');
  url.hash = ''; url.search = '';
  return url.href;
}
export function saveDestination(storage: Pick<Storage, 'setItem'>, hash: string) { storage.setItem(destinationKey, safeDestination(hash)); }
export function consumeDestination(storage: Pick<Storage, 'getItem' | 'removeItem'>): string {
  const value = safeDestination(storage.getItem(destinationKey)); storage.removeItem(destinationKey); return value;
}
