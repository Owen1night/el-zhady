import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../backend/api';
import { supabase } from '../backend/client';
import type { Lobby } from '../backend/contracts';
import { errorText, serviceError } from '../backend/errors';
export function useLobby(roomId: string) {
  const auth = useAuth(); const [attempt, setAttempt] = useState(0);
  const [lobby, setLobby] = useState<Lobby | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [connection, setConnection] = useState<'connecting' | 'live' | 'polling' | 'offline'>('connecting');
  const retry = useCallback(() => setAttempt(a => a + 1), []);
  useEffect(() => {
    setLobby(null); setError(''); setLoading(true); setConnection('connecting');
    if (!supabase || !auth.identity || auth.status !== 'ready') { setLoading(false); return; }
    let active = true; let running = false; let pending = false; let denied = false;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      if (running) { pending = true; return; }
      if (denied || !active) return;
      running = true;
      try {
        const next = await api.lobby(roomId);
        if (active) { setLobby(next); setError(''); }
      } catch (e) {
        if (active) {
          setError(errorText(e));
          if (['ROOM_ACCESS_DENIED','REMOVED','ROOM_NOT_FOUND','AUTH_REQUIRED'].includes(serviceError(e).code)) { setLobby(null); denied = true; }
          else setConnection(navigator.onLine ? 'polling' : 'offline');
        }
      } finally { running = false; if (active) setLoading(false); if (pending) { pending = false; void load(); } }
    }
    function schedule() { clearTimeout(debounce); debounce = setTimeout(() => void load(), 250); }
    function onOnline() { denied = false; setConnection('polling'); void load(); }
    function onOffline() { setConnection('offline'); }
    function onVisible() { if (document.visibilityState === 'visible') void load(); }
    void load();
    const channel = supabase.channel(`lobby:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${roomId}` }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_results', filter: `room_id=eq.${roomId}` }, schedule)
      .subscribe(status => { if (!active) return; if (status === 'SUBSCRIBED') { setConnection('live'); void load(); } else if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)) setConnection(navigator.onLine ? 'polling' : 'offline'); });
    const connectionDeadline = setTimeout(() => { if (active) setConnection(previous => previous === 'connecting' ? 'polling' : previous); }, 12000);
    const poll = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 15000);
    const beat = setInterval(() => { if (!denied && document.visibilityState === 'visible') void api.heartbeat(roomId).catch(() => {}); }, 25000);
    window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline); document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; clearTimeout(connectionDeadline); clearInterval(poll); clearInterval(beat); clearTimeout(debounce); void supabase!.removeChannel(channel); window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); document.removeEventListener('visibilitychange', onVisible); };
  }, [roomId, auth.identity?.id, auth.status, attempt]);
  return { lobby, loading, error, connection, retry };
}
