import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, ArrowRight, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { backendConfig } from '../backend/config';
import { errorText } from '../backend/errors';
import { navigate } from '../lib/navigation';
import { validateName } from '../lib/validation';
export function ErrorNotice({ error, retry }: { error: string; retry?: () => void }) {
  return <div className="service-error" role="alert"><AlertCircle size={21} /><div><p>{error}</p>{retry && <button type="button" className="button secondary" onClick={retry}><RefreshCw size={16} /> Қайта көру</button>}</div></div>;
}
export function ServiceNotice() {
  const auth = useAuth();
  if (!backendConfig) return <div className="service-unavailable"><span className="eyebrow">ҚЫЗМЕТ ӘЛІ БАПТАЛМАҒАН</span><h2>Тарихи бөлімдер ашық.</h2><p>Аккаунт пен сайыс үшін Supabase қызметін қосу қажет. Қазір деректер серверге сақталмайды және бөлмеге қосылу орындалмайды.</p><a className="button secondary" href="#/timeline">Тарихты зерттеу <ArrowRight size={17} /></a></div>;
  if (auth.status === 'loading') return <div className="service-loading" role="status">Сеанс тексерілуде… Егер қызмет жауап бермесе, қайта көру мүмкіндігі көрсетіледі.</div>;
  if (auth.status === 'error') return <ErrorNotice error={auth.error} retry={() => void auth.retry()} />;
  return null;
}
export function AccountGate({ children, destination = '#/profile', admin = false }: { children: ReactNode; destination?: string; admin?: boolean }) {
  const auth = useAuth();
  const [error, setError] = useState('');
  if (!backendConfig || auth.status === 'loading' || auth.status === 'error') return <ServiceNotice />;
  if (!auth.identity || auth.identity.anonymous) return <div className="account-gate"><span className="eyebrow">ТҰРАҚТЫ АККАУНТ</span><h2>Оқу жолыңызды сақтаңыз.</h2><p>Жеке профиль мен жаттығу нәтижелерін құрылғылар арасында сақтау үшін Google арқылы кіріңіз. Қонақтарға сайыс бөлмесі қолжетімді.</p><a className="button primary" href={`#/auth?next=${encodeURIComponent(destination)}`}>Google арқылы кіру <ArrowRight size={18} /></a><a className="inline-link" href="#/join">Сайысқа қонақ ретінде қосылу <ArrowRight size={16} /></a>{error && <ErrorNotice error={error} />}</div>;
  if (admin && !auth.admin) return <div className="account-gate"><h2>Әкімші рұқсаты қажет.</h2><p>Бұл аккаунтқа әкімші құқығы берілмеген. Есім немесе профиль баптауы бұл құқықты өзгертпейді.</p><button type="button" className="button secondary" onClick={() => { setError(''); void auth.retry().catch(e => setError(errorText(e))); }}>Рұқсатты қайта тексеру</button></div>;
  return children;
}
export function SignOutButton() {
  const auth = useAuth(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  return <div>{error && <ErrorNotice error={error} retry={() => setError('')} />}<button type="button" className="button secondary" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await auth.signOut(); navigate('#/auth'); } catch (e) { setError(errorText(e)); } finally { setBusy(false); } }}><LogOut size={17} />{busy ? 'Шығу орындалуда…' : auth.identity?.anonymous ? 'Қонақ сеансынан шығу' : 'Осы браузердегі сеанстан шығу'}</button></div>;
}
export function ProfileForm({ onSaved, initial = '' }: { onSaved?: () => void; initial?: string }) {
  const auth = useAuth(); const [name, setName] = useState(initial); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [saved, setSaved] = useState(false);
  useEffect(() => { setName(initial); }, [initial]);
  return <form className="account-form" onSubmit={async e => {
    e.preventDefault(); setError(''); setSaved(false);
    const clean = validateName(name);
    if (!clean) { setError(errorText({ message: 'INVALID_NAME' })); return; }
    setBusy(true);
    try { await auth.saveProfile(clean); setSaved(true); onSaved?.(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }}><label htmlFor="profile-name">Көрсетілетін есім</label><input id="profile-name" name="display-name" value={name} onChange={e => setName(e.target.value)} maxLength={80} autoComplete="nickname" required aria-describedby="profile-name-help" disabled={busy} /><p id="profile-name-help" className="form-help">2–40 таңба. Бұл есім сайыста көрінуі мүмкін. Email көрсетілмейді.</p>{error && <ErrorNotice error={error} />}<button type="submit" className="button primary" disabled={busy}>{busy ? 'Сақталуда…' : 'Есімді сақтау'}</button>{saved && <p className="form-success" role="status">Есім сақталды.</p>}</form>;
}
