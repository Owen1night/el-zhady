import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../backend/api';
import { backendConfig } from '../backend/config';
import { errorText, ServiceError } from '../backend/errors';
import { validateCode, validateName } from '../lib/validation';
import { ErrorNotice, ServiceNotice, SignOutButton } from './Shared';
import { Captcha } from './Captcha';
export function JoinPage({ code: initial }: { code: string | null }) {
  const auth = useAuth(); const [code, setCode] = useState(initial || ''); const [name, setName] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [captcha, setCaptcha] = useState(''); const [captchaAttempt, setCaptchaAttempt] = useState(0);
  const needCaptcha = !auth.identity && !!import.meta.env.VITE_TURNSTILE_SITE_KEY;
  async function join() {
    setError(''); const roomCode = validateCode(code); const displayName = validateName(name ?? auth.profile?.display_name ?? '');
    if (!roomCode) { setError(errorText(new ServiceError('INVALID_ROOM_CODE'))); return; }
    if (!displayName) { setError(errorText(new ServiceError('INVALID_NAME'))); return; }
    setBusy(true);
    try { await auth.ensureIdentity(captcha); const membership = await api.joinRoom(roomCode, displayName); window.location.hash = `#/lobby?room=${membership.room_id}`; }
    catch (e) { setError(errorText(e)); if (needCaptcha) { setCaptcha(''); setCaptchaAttempt(value => value + 1); } } finally { setBusy(false); }
  }
  return <div className="two-column account-layout"><section className="outline-panel"><span className="eyebrow">ҚОНАҚҚА ДА, АККАУНТҚА ДА</span><h2>Бөлмеге қосылу</h2><p>{auth.identity && !auth.identity.anonymous ? 'Тұрақты аккаунтыңыз қолданылады. Қосымша қонақ сеансы жасалмайды.' : 'Google мен email қажет емес. Қосылғанда осы браузерге қауіпсіз қонақ сеансы жасалады.'}</p><ServiceNotice /><form className="account-form" onSubmit={e => { e.preventDefault(); void join(); }}><label htmlFor="room-code">Бөлме коды</label><input id="room-code" name="room-code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={16} placeholder="8 таңбалы код" required disabled={busy} aria-describedby="room-code-help" /><p id="room-code-help" className="form-help">Жүргізуші берген 8 таңбалы код: A–F, 0–9.</p><label htmlFor="join-name">Көрсетілетін есім</label><input id="join-name" name="nickname" value={name ?? auth.profile?.display_name ?? ''} onChange={e => setName(e.target.value)} autoComplete="nickname" maxLength={80} placeholder="Есіміңіз" disabled={busy} required /><p className="form-help">2–40 таңба. Бірдей есімдер ID белгісімен ажыратылады; ол жарыстағы орын емес; email жиналмайды және көрсетілмейді.</p>{needCaptcha && <Captcha key={captchaAttempt} onToken={setCaptcha} />}{error && <ErrorNotice error={error} retry={() => void join()} />}<button type="submit" className="button primary" disabled={!backendConfig || busy || (needCaptcha && !captcha)}>{busy ? 'Қосылу тексерілуде…' : 'Сайысқа қосылу'}<ArrowRight size={17} /></button></form></section><aside className="join-aside"><span className="eyebrow">СЕАНС ЖӘНЕ НӘТИЖЕ</span><h2>Есім сақталады.<br />Қонақ профилі жасалмайды.</h2><p>Сайыс нәтижесі қатысушының ішкі ID-іне және сайыстағы есіміне бекітіледі. Есімі бірдей аккаунтпен автоматты түрде байланыстырылмайды.</p><p>Бетті қалыпты жаңарту қонақтың қатысуын сақтайды. Браузер деректерін тазарту, инкогнито терезені жабу немесе құрылғыны ауыстыру қонақ кіруін қалпына келтіруге кедергі болуы мүмкін.</p><div className="waiting-note">Әр кезеңде 10 тапсырма: викторинаға 15 с, картаға 25 с, хронологияға 40 с. Қатысу басталғанда бекітіледі; жаңа қатысушылар кейін кіре алмайды.</div><a className="inline-link" href="#/auth">Тұрақты аккаунтпен кіру <ArrowRight size={16} /></a>{(auth.identity?.anonymous || auth.status === 'error') && <div><p className="form-help">Сеанстан шығу осы қонақтың бөлмесіне автоматты қайта кіруді тоқтатуы мүмкін.</p><SignOutButton /></div>}</aside></div>;
}
