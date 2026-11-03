import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../backend/api';
import type { Room } from '../backend/contracts';
import { errorText, ServiceError } from '../backend/errors';
import { clearRoomRequest, readRoomRequest, writeRoomRequest, type RoomRequest } from '../lib/room-request';
import { AccountGate, ErrorNotice } from './Shared';
export function AdminPage() { return <AccountGate admin destination="#/admin"><AdminDashboard /></AccountGate>; }
function AdminDashboard() {
  const auth = useAuth(); const userId = auth.identity!.id;
  const [pending, setPending] = useState<RoomRequest | null>(() => { try { return readRoomRequest(sessionStorage, userId); } catch { return null; } });
  const [title, setTitle] = useState(pending?.title || ''); const [rooms, setRooms] = useState<Room[]>([]); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); try { setRooms(await api.adminRooms()); setError(''); } catch (e) { setError(errorText(e)); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); const interval = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 15000); return () => clearInterval(interval); }, [load]);
  async function create() {
    setError(''); if (!pending && (title.trim().length < 2 || title.trim().length > 80 || /[\p{Cc}<>]/u.test(title))) { setError(errorText(new ServiceError('INVALID_TITLE'))); return; }
    setBusy(true);
    try {
      const request = pending || { id: crypto.randomUUID(), title: title.trim() };
      // Persist BEFORE the network call. A refresh/retry reuses the same operation.
      try { writeRoomRequest(sessionStorage, userId, request); } catch { throw new ServiceError('SESSION_STORAGE'); }
      setPending(request);
      const room = await api.createRoom(request.id, request.title);
      const saved = { ...request, roomId: room.id };
      writeRoomRequest(sessionStorage, userId, saved); setPending(saved); await load();
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  return <div className="admin-layout"><section className="outline-panel"><span className="eyebrow">АЛДЫН АЛА ДАЙЫНДАУ</span><h2>Сайыс бөлмесін құру</h2><p>Бөлмені ашып, тікелей викторинаны таңдаңыз. Қатысушыларды кодпен немесе QR арқылы шақырыңыз; кейін сайысты бастаңыз.</p><form className="account-form" onSubmit={e => { e.preventDefault(); void create(); }}><label htmlFor="room-title">Бөлме атауы</label><input id="room-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} required disabled={busy || !!pending} autoComplete="off" />{!pending?.roomId && <button type="submit" className="button primary" disabled={busy}><Plus size={17} />{busy ? 'Құрылуда…' : pending ? 'Сол сұрауды қайта көру' : 'Бөлмені дайындау'}</button>}</form>{error && <ErrorNotice error={error} retry={() => void (pending && !pending.roomId ? create() : load())} />}{pending?.roomId && <div className="created-room"><p role="status">Бөлме дайын. Сілтеме мен QR-кодты күту бөлмесінен алыңыз.</p><a className="button primary" href={`#/lobby?room=${pending.roomId}`}>Бөлмені ашу <ArrowRight size={17} /></a><button type="button" className="button secondary" onClick={() => { try { clearRoomRequest(sessionStorage, userId); setPending(null); setTitle(''); } catch { setError(errorText(new ServiceError('SESSION_STORAGE'))); } }}>Тағы бір бөлме дайындау</button></div>}<p className="form-help">Сағатына 5 бөлмеге дейін. Белгісіз жауаптан кейін қайталау бастапқы сұрау ID-ін сақтайды.</p></section><section className="outline-panel"><div className="section-heading"><div><span className="eyebrow">ӘКІМШІГЕ ҒАНА</span><h2>Дайындалған бөлмелер</h2></div><button type="button" className="icon-button" onClick={() => void load()} disabled={loading} aria-label="Бөлмелерді жаңарту"><RefreshCw size={19} /></button></div>{loading && <p role="status">Бөлмелер жүктелуде…</p>}{rooms.length ? <ul className="admin-rooms">{rooms.map(room => <li key={room.id}><a href={`#/lobby?room=${room.id}`}><strong>{room.title}</strong><span>{room.code} · {room.status === 'closed' ? 'Жабық' : room.locked ? 'Қосылу бұғатталған' : 'Күту күйі'}</span><ArrowRight size={19} /></a></li>)}</ul> : !loading && <p>Бөлмелер әлі жоқ. Нақты сервер деректері ғана көрсетіледі.</p>}</section></div>;
}
