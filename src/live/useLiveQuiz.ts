import { useCallback, useEffect, useRef, useState } from 'react';
import { liveApi } from './api';
import { supabase } from '../backend/client';
import { errorText, serviceError } from '../backend/errors';
import type { LiveState } from './types';
/** Polls authoritative projections; the visual timer never advances the game. */
export function useLiveQuiz(roomId: string) {
  const [state, setState] = useState<LiveState | null>(null);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0); const [remaining, setRemaining] = useState(0);
  const timing = useRef({ server: 0, received: 0, ends: 0 });
  const retry = useCallback(() => setAttempt(n => n + 1), []);
  useEffect(() => {
    let active = true; let inFlight = false; let denied = false; let retryAfter = 0;
    async function load() {
      if (!active || inFlight || denied || performance.now() < retryAfter) return;
      inFlight = true;
      const sent = performance.now();
      try {
        const next = await liveApi.state(roomId); const received = performance.now();
        if (active) {
          timing.current = { server: Date.parse(next.server_now) + Math.min(2000, (received - sent) / 2), received, ends: Date.parse(next.phase_ends_at || '') };
          retryAfter = 0; setState(next); setError('');
        }
      } catch (e) {
        if (active) {
          retryAfter = performance.now() + 5000; setError(errorText(e));
          if (['ROOM_ACCESS_DENIED','AUTH_REQUIRED','REMOVED'].includes(serviceError(e).code)) { setState(null); denied = true; }
        }
      } finally { inFlight = false; if (active) setLoading(false); }
    }
    void load();
    const poll = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 1000);
    function visible() { if (document.visibilityState === 'visible') void load(); }
    const channel = supabase?.channel(`live-quiz:${roomId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'live_quiz_sessions', filter: `room_id=eq.${roomId}` }, () => void load()).subscribe();
    window.addEventListener('online', visible); document.addEventListener('visibilitychange', visible);
    return () => { active = false; clearInterval(poll); if (channel) void supabase?.removeChannel(channel); window.removeEventListener('online', visible); document.removeEventListener('visibilitychange', visible); };
  }, [roomId, attempt]);
  useEffect(() => {
    function tick() { const t = timing.current; setRemaining(Number.isFinite(t.ends) ? Math.max(0, Math.ceil((t.ends - t.server - (performance.now() - t.received)) / 1000)) : 0); }
    tick(); const interval = setInterval(tick, 150); return () => clearInterval(interval);
  }, [state]);
  return { state, error, loading, retry, remaining };
}
