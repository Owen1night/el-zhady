import { useState } from 'react';
import { LockKeyhole, RefreshCw, Users, Wifi } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { backendConfig } from '../backend/config';
import { api } from '../backend/api';
import { errorText } from '../backend/errors';
import { isUuid, recentActivity } from '../lib/validation';
import { navigate } from '../lib/navigation';
import { Dialog } from '../components/Dialog';
import { ErrorNotice, ServiceNotice } from './Shared';
import { RoomShare } from './RoomShare';
import { useLobby } from './useLobby';
import { useLiveQuiz } from '../live/useLiveQuiz';
import { LiveQuiz } from '../live/LiveQuiz';
type Action = 'close' | 'remove' | 'block' | 'delete';
const titles: Record<Action,string> = { close: 'Бөлмені жабу', remove: 'Бөлмеден шығару', block: 'Шығару және осы бөлмеге кіруін бұғаттау', delete: 'Бөлмені біржола жою' };
export function LobbyPage({ roomId }: { roomId: string | null }) {
  const auth = useAuth();
  if (!backendConfig || auth.status === 'loading' || auth.status === 'error') return <><ServiceNotice /><a className="inline-link" href="#/join">Код арқылы қосылуға оралу</a></>;
  if (!isUuid(roomId) || !auth.identity) return <div className="account-gate"><h2>Бөлме коды арқылы қосылыңыз.</h2><p>Күту бөлмесіне кіру үшін аккаунт немесе осы браузердегі қонақ сеансы керек.</p><a className="button primary" href="#/join">Сайысқа қосылу</a></div>;
  return <ConnectedLobby roomId={roomId} />;
}
function ConnectedLobby({ roomId }: { roomId: string }) {
  const { lobby, loading, error, connection, retry } = useLobby(roomId);
  const live = useLiveQuiz(roomId);
  const started = !!live.state?.competition?.started_at;
  const [confirm, setConfirm] = useState<{ action: Action; participant?: string; name?: string } | null>(null);
  const [busy, setBusy] = useState(false); const [actionError, setActionError] = useState('');
  async function action(type: Action | 'lock' | 'unlock', participant?: string) {
    setBusy(true); setActionError('');
    try {
      if (type === 'delete') { await api.deleteRoom(roomId); setConfirm(null); navigate('#/admin'); return; }
      else await api.roomAction(roomId, type, participant);
      setConfirm(null); retry(); live.retry();
    } catch (e) { setActionError(errorText(e)); } finally { setBusy(false); }
  }
  return <div className="lobby-layout">
    <div className="lobby-heading"><span className={`connection-status ${connection}`}><Wifi size={17} />{connection === 'live' ? 'Realtime қосылған' : connection === 'offline' ? 'Байланыс жоқ' : connection === 'polling' ? 'Кезеңдік жаңарту (2 с)' : 'Байланыс тексерілуде'}</span><button type="button" className="button secondary" onClick={retry} disabled={loading}><RefreshCw size={16} /> Жаңарту</button></div>
    {error && <><ErrorNotice error={error} retry={retry} /><a className="inline-link" href="#/join">Код пен есім арқылы өзім қайта қосылу</a></>}
    {loading && !lobby && <p className="service-loading" role="status">Күту бөлмесі жүктелуде…</p>}
    {lobby && <>
      <section className="room-banner"><div><span className="eyebrow">БӨЛМЕ КОДЫ</span><strong className="room-code">{lobby.room.code}</strong></div><div><h2>{lobby.room.title}</h2><p>{lobby.room.status === 'closed' ? 'Бөлме біржола жабық. Қайта ашылмайды.' : lobby.room.locked ? 'Жаңа қатысушыларға кіру бұғатталған.' : 'Қатысушылар күту бөлмесіне қосыла алады.'}</p></div><span className="room-count"><Users size={21} />{lobby.participants.length} / {lobby.room.capacity}</span></section>
      {lobby.can_manage && <section className="host-controls" aria-label="Жүргізуші басқаруы"><span className="eyebrow">ӘКІМШІ БАСҚАРУЫ</span>{actionError && <ErrorNotice error={actionError} />}<div>
        <button type="button" className="button secondary" disabled={busy || started || lobby.room.status === 'closed'} onClick={() => void action(lobby.room.locked ? 'unlock' : 'lock')}><LockKeyhole size={16} />{lobby.room.locked ? 'Қосылуға рұқсат беру' : 'Қосылуды бұғаттау'}</button>
        {lobby.room.status === 'closed' ? <button type="button" className="button danger-button" disabled={busy} onClick={() => setConfirm({ action: 'delete' })}>Бөлмені біржола жою</button> : <button type="button" className="button danger-button" disabled={busy} onClick={() => setConfirm({ action: 'close' })}>Бөлмені жабу</button>}
      </div>{started && <p className="form-help">Сайыс басталған соң кезеңдердің арасында да жаңа қатысушылар қосылмайды. Тізімдегі шығарылмаған қатысушылар қайта байланыса алады.</p>}</section>}
      <LiveQuiz roomId={roomId} lobby={lobby} feed={live} />
      <section className="outline-panel"><div className="section-heading"><div><span className="eyebrow">ҚАТЫСУШЫЛАР</span><h2>Бір кеңістік. Бөлек есімдер.</h2></div><p>Мәртебе соңғы әрекет уақытын көрсетеді.<br />Ол адамның онлайн екенін дәлелдемейді.</p></div>
        {lobby.participants.length ? <ul className="participant-list">{lobby.participants.map(p => <li key={p.id}><span className="participant-number">#{String(p.display_suffix).padStart(2, '0')}</span><div><strong>{p.display_name}</strong>{p.id === lobby.my_participant_id && <span className="you-label">Сіз</span>}<span className="activity-time">{recentActivity(p.last_seen_at) ? 'Жақында белсенді болды' : 'Соңғы әрекетке біраз уақыт өтті'}</span></div>
          {lobby.can_manage && lobby.room.status !== 'closed' && <div className="moderation-actions"><button type="button" className="button secondary" disabled={busy} onClick={() => setConfirm({ action: 'remove', participant: p.id, name: p.display_name })}>Бөлмеден шығару</button><button type="button" className="button danger-button" disabled={busy} onClick={() => setConfirm({ action: 'block', participant: p.id, name: p.display_name })}>Шығару және осы бөлмеге кіруін бұғаттау</button></div>}
        </li>)}</ul> : <p>Қатысушылар әлі қосылмаған. Бөлмені алдын ала дайындауға болады.</p>}
      </section>
      {lobby.can_manage && lobby.results.length > 0 && <section className="outline-panel lobby-results"><h2>Бұрынғы сайыс жазбалары</h2><ul className="history-list">{lobby.results.map(r => <li key={r.participant_id}><strong>{r.display_name_snapshot} · #{r.display_suffix}</strong><span>{r.score} / {r.max_score}</span></li>)}</ul></section>}
      {lobby.can_manage && lobby.room.status !== 'closed' && <RoomShare code={lobby.room.code} />}
    </>}
    {confirm && <Dialog title={titles[confirm.action]} onClose={() => { if (!busy) setConfirm(null); }}>
      <p>{confirm.action === 'close' ? 'Бұл әрекет түпкілікті: бөлме қайта ашылмайды. Қатысушылар басты бетке қайтады, аяқталмаған кезең тоқтайды. Бұрын есептеліп сақталған нәтижелер жойылмайды.' : confirm.action === 'delete' ? 'Бөлме мен оның кезеңдері, жауаптары және қатысу деректері біржола жойылады. Ескі код пен QR жарамсыз болады. Сақталған сайыс тарихы, жеке жаттығу нәтижелері және аккаунттар сақталады.' : confirm.action === 'block' ? `${confirm.name}: осы ішкі сәйкестік тек осы бөлмеге қайта кіре алмайды. Есімі бірдей басқа адам бұғатталмайды. Жаңа қонақ сәйкестігіне бұл тыйым автоматты түрде көшпейді.` : `${confirm.name} бірден шығарылады. Қосылу ашық болса, код пен есім арқылы өзі қайта кіре алады; автоматты түрде қосылмайды. Басталған сайысқа қайта қосылу мүмкін емес.`}</p>
      {actionError && <ErrorNotice error={actionError} />}<div className="dialog-actions"><button type="button" className="button secondary" disabled={busy} onClick={() => setConfirm(null)}>Бас тарту</button><button type="button" className="button danger-button" disabled={busy} onClick={() => void action(confirm.action, confirm.participant)}>{busy ? 'Орындалуда…' : confirm.action === 'delete' ? 'Бөлмені біржола жоюды растау' : 'Растау'}</button></div>
    </Dialog>}
  </div>;
}
