export function validateName(value: string): string | null {
  const name = value.trim().replace(/\s+/g, ' ');
  return /[\p{Cc}<>]/u.test(value) || Array.from(name).length < 2 || Array.from(name).length > 40 ? null : name;
}
export function validateCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  return /^[A-F0-9]{8}$/.test(code) ? code : null;
}
export function isUuid(value: string | null): value is string { return !!value && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value); }
/** A timestamp is recent activity, never proof of an online connection. */
export function recentActivity(timestamp: string, now = Date.now()): boolean {
  const time = Date.parse(timestamp);
  return Number.isFinite(time) && now - time >= -10000 && now - time < 65000;
}
