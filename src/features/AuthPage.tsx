import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { backendConfig } from '../backend/config';
import { errorText } from '../backend/errors';
import { navigate, safeDestination } from '../lib/navigation';
import { ErrorNotice, ProfileForm, ServiceNotice, SignOutButton } from './Shared';
export function AuthPage({ next }: { next: string | null }) {
  const auth = useAuth(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const destination = safeDestination(next);
  return <div className="two-column account-layout"><section className="outline-panel"><span className="eyebrow">ЖЕКЕ ОҚУ ЖОЛЫ</span><h2>{auth.identity && !auth.identity.anonymous ? 'Қош келдіңіз.' : 'Google арқылы кіру'}</h2><p>Тұрақты аккаунт жеке профильге және болашақ жаттығу нәтижелерін құрылғылар арасында сақтауға арналған. Жаттығу ойындары әлі дайын емес.</p>
    <ServiceNotice />
    {auth.status === 'ready' && auth.identity && !auth.identity.anonymous ? <>{auth.profile ? <><p className="account-name">{auth.profile.display_name}</p><button type="button" className="button primary" onClick={() => navigate(destination)}>Жалғастыру <ArrowRight size={17} /></button><SignOutButton /></> : <><p>Алғашқы кіру: өзіңізге көрсетілетін есім таңдаңыз.</p><ProfileForm onSaved={() => navigate(destination)} /></>}</> : <>
      {error && <ErrorNotice error={error} retry={() => setError('')} />}
      <button type="button" className="button primary google-button" disabled={!backendConfig || busy || auth.status === 'loading'} onClick={async () => { setBusy(true); setError(''); try { await auth.google(destination); } catch (e) { setError(errorText(e)); } finally { setBusy(false); } }}><span aria-hidden="true" className="google-letter">G</span>{busy ? 'Google бетіне өту…' : 'Google арқылы кіру'}</button>
      {auth.identity?.anonymous && <p className="form-help">Қазір қонақ сеансы қолданылады. Google арқылы кіру қонақ нәтижелерін жеке профильге көшірмейді.</p>}
    </>}
    <p className="form-help">Email/құпиясөз арқылы тіркелу бұл кезеңде ұсынылмайды.</p></section><aside className="join-aside"><span className="eyebrow">АККАУНТСЫЗ ҚАТЫСУ</span><h2>Сайысқа қонақ ретінде.</h2><p>Google немесе email қажет емес. Жүргізушіден бөлме кодын алып, көрсетілетін есім енгізіңіз.</p><a className="button secondary" href="#/join">Сайысқа қосылу <ArrowRight size={18} /></a><p className="form-help">Қонақтың тұрақты профилі болмайды. Нәтиже сайыстағы есіммен сақталады.</p></aside></div>;
}
