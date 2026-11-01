import type { SectionId } from '../data/types';
import { sections } from '../data/content';
const key = 'el-zhady:foundation:v1';
export type Preferences = { presentation: boolean; visited: SectionId[] };
const initial: Preferences = { presentation: false, visited: [] };
export function readPreferences(): Preferences {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || 'null');
    if (!raw || typeof raw !== 'object') return initial;
    return { presentation: raw.presentation === true, visited: Array.isArray(raw.visited) ? [...new Set(raw.visited.filter((id: unknown): id is SectionId => sections.some(s => s.id === id)))] as SectionId[] : [] };
  } catch { return initial; }
}
export function savePreferences(value: Preferences): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
export function resetPreferences(): boolean {
  try { localStorage.removeItem(key); return true; } catch { return false; }
}
