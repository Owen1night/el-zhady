/** An explicit deployment URL is required. Never share the current local origin. */
export function publicUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null;
    if (!host.includes('.') || host.endsWith('.local') || host.endsWith('.localhost') || host === 'localhost' || host.includes(':')) return null;
    if (/^\d+(\.\d+){3}$/.test(host)) return null;
    return url.href.endsWith('/') ? url.href : `${url.href}/`;
  } catch { return null; }
}
