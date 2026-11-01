import { useState } from 'react';
import { LockKeyhole, RefreshCw, Users, Wifi } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { backendConfig } from '../backend/config';
import { api } from '../backend/api';
import { errorText } from '../backend/errors';
import { isUuid, recentActivity } from '../lib/validation';
import { Dialog } from '../components/Dialog';
import { ErrorNotice, ServiceNotice } from './Shared';
import { RoomShare } from './RoomShare';
import { useLobby } from './useLobby';
export function LobbyPage({ roomId }: { roomId: string | null }) {
  const auth = useAuth();
  if (!backendConfig || auth.status === 'loading' || auth.status === 'error') return <><ServiceNotice /><a className="inline-link" href="#/join">Код арқылы қосылуға оралу</a></>;
  if (!isUuid(roomId) || !auth.identity) return <div className="account-gate"><h2>Бөлме коды арқылы қосылыңыз.</h2><p>Күту бөлмесіне кіру үшін аккаунт немесе осы браузердегі қонақ сеансы керек.</p><a className="button primary" href="#/join">Сайысқа қосылу</a></div>;
  return <ConnectedLobby roomId={roomId} />;
}
function ConnectedLobby({ roomId }: { roomId: string }) {
  const { lobby, loading, error, connection, retry } = useLobby(roomId);
  const [confirm, setConfirm] = useState<{ action: 'close' | 'remove'; participant?: string; name?: string } | null>(null);
  const [busy, setBusy] = useState(false); const [actionError, setActionError] = useState('');
  async function action(type: 'lock' | 'unlock' | 'close' | 'remove', participant?: string) {
    setBusy(true); setActionError('');
    try { await api.roomAction(roomId, type, participant); setConfirm(null); retry(); }
    catch (e) { setActionError(errorText(e)); } finally { setBusy(false); }
  }
  return <div className="lobby-layout"><div className="lobby-heading"><span className={`connection-status ${connection}`}><Wifi size={17} />{connection === 'live' ? 'Realtime қосылған' : connection === 'offline' ? 'Байланыс жоқ' : connection === 'polling' ? 'Кезеңдік жаңарту (15 с)' : 'Байланыс тексерілуде'}</span><button type="button" className="button secondary" onClick={retry} disabled={loading}><RefreshCw size={16} /> Жаңарту</button></div>{error && <ErrorNotice error={error} retry={retry} />}{loading && !lobby && <p className="service-loading" role="status">Күту бөлмесі жүктелуде…</p>}
    {lobby && <><section className="room-banner"><div><span className="eyebrow">БӨЛМЕ КОДЫ</span><strong className="room-code">{lobby.room.code}</strong></div><div><h2>{lobby.room.title}</h2><p>{lobby.room.status === 'closed' ? 'Бөлме жабық.' : lobby.room.locked ? 'Жаңа қатысушыларға кіру бұғатталған.' : 'Қатысушылар күту бөлмесіне қосыла алады.'}</p></div><span className="room-count"><Users size={21} />{lobby.participants.length} / {lobby.room.capacity}</span></section><div className="waiting-note"><strong>{lobby.room.status === 'closed' ? 'Сайыс бөлмесі жабылды.' : 'Күту күйі.'}</strong> Ойын мен ұпай есептеу әлі іске қосылмаған. Қазір тапсырма басталмайды.</div>
    {lobby.can_manage && <section className="host-controls" aria-label="Жүргізуші басқаруы"><span className="eyebrow">ӘКІМШІ БАСҚАРУЫ</span>{actionError && <ErrorNotice error={actionError} />}<div><button type="button" className="button secondary" disabled={busy || lobby.room.status === 'closed'} onClick={() => void action(lobby.room.locked ? 'unlock' : 'lock')}><LockKeyhole size={16} />{lobby.room.locked ? 'Қосылуға рұқсат беру' : 'Қосылуды бұғаттау'}</button><button type="button" className="button danger-button" disabled={busy || lobby.room.status === 'closed'} onClick={() => setConfirm({ action: 'close' })}>Бөлмені жабу</button></div></section>}
    <section className="outline-panel"><div className="section-heading"><div><span className="eyebrow">ҚАТЫСУШЫЛАР</span><h2>Бір кеңістік. Бөлек есімдер.</h2></div><p>Мәртебе соңғы әрекет уақытын көрсетеді.<br />Ол адамның онлайн екенін дәлелдемейді.</p></div>{lobby.participants.length ? <ul className="participant-list">{lobby.participants.map(p => <li key={p.id}><span className="participant-number">#{String(p.display_suffix).padStart(2, '0')}</span><div><strong>{p.display_name}</strong>{p.id === lobby.my_participant_id && <span className="you-label">Сіз</span>}<span className="activity-time">{recentActivity(p.last_seen_at) ? 'Жақында белсенді болды' : 'Соңғы әрекетке біраз уақыт өтті'}</span></div>{lobby.can_manage && <button type="button" className="button secondary" disabled={busy} onClick={() => setConfirm({ action: 'remove', participant: p.id, name: p.display_name })}>Шығару</button>}</li>)}</ul> : <p>Қатысушылар әлі қосылмаған. Бөлмені алдын ала дайындауға болады.</p>}</section>
    <section className="outline-panel lobby-results"><span className="eyebrow">ОСЫ САЙЫСТЫҢ НӘТИЖЕЛЕРІ</span><h2>Нәтиже тақтасы</h2>{lobby.results.length ? <ul className="history-list">{lobby.results.map(r => <li key={r.participant_id}><strong>{r.display_name_snapshot} · #{r.display_suffix}</strong><span>{r.score} / {r.max_score}</span></li>)}</ul> : <p>Нәтижелер жоқ. Болашақта оларды тек сервер есептеп сақтайды.</p>}</section>{lobby.can_manage && <RoomShare code={lobby.room.code} />}</>}
    {confirm && <Dialog title={confirm.action === 'close' ? 'Бөлмені жабу' : 'Қатысушыны шығару'} onClose={() => { if (!busy) setConfirm(null); }}><p>{confirm.action === 'close' ? 'Бөлме жабылған соң жаңа қатысушылар қосыла алмайды. Бұл кезеңде қайта ашу қарастырылмаған.' : `${confirm.name} осы бөлмеге осы сеанспен қайта қосыла алмайды. Сақталған нәтиже жойылмайды.`}</p>{actionError && <ErrorNotice error={actionError} />}<div className="dialog-actions"><button type="button" className="button secondary" disabled={busy} onClick={() => setConfirm(null)}>Бас тарту</button><button type="button" className="button primary" disabled={busy} onClick={() => void action(confirm.action, confirm.participant)}>{busy ? 'Орындалуда…' : 'Растау'}</button></div></Dialog>}
  </div>;
}
