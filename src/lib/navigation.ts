import { sections } from '../data/content';
import type { SectionId } from '../data/types';
export type AccountRoute = 'auth' | 'profile' | 'join' | 'lobby' | 'admin';
export type RouteName = SectionId | AccountRoute | 'missing';
export function parseRoute(hash: string): { name: RouteName; params: URLSearchParams } {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const name = path || 'home';
  return { name: sections.some(s => s.id === name) || ['auth','profile','join','lobby','admin'].includes(name) ? name as RouteName : 'missing', params: new URLSearchParams(query) };
}
export function safeDestination(value: string | null | undefined): string {
  if (!value || !/^#\/[a-z]+(?:\?[^#]*)?$/.test(value) || value.length > 300) return '#/profile';
  const parsed = parseRoute(value);
  if (parsed.name === 'missing' || parsed.name === 'auth') return '#/profile';
  // Return only our route and known non-URL parameters; never an arbitrary redirect.
  if (parsed.name === 'join') {
    const code = parsed.params.get('code');
    return code && /^[A-F0-9]{8}$/i.test(code) ? `#/join?code=${code.toUpperCase()}` : '#/join';
  }
  if (parsed.name === 'lobby') {
    const room = parsed.params.get('room');
    return room && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(room) ? `#/lobby?room=${room}` : '#/join';
  }
  return `#/${parsed.name}`;
}
export function joinUrl(base: string, code: string): string {
  const url = new URL(base);
  if (url.protocol !== 'https:' || !/^[A-F0-9]{8}$/.test(code)) throw new Error('Invalid join URL');
  url.hash = `/join?code=${code}`;
  return url.href;
}
export function navigate(hash: string) { window.location.hash = safeDestination(hash); }
