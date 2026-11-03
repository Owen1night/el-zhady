import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, CircleHelp, Clock3, Copy, Flag, GraduationCap, Landmark, Layers3, ListOrdered, MapPin, Menu, Monitor, Play, QrCode, RotateCcw, Shield, Target, X, UserRound, Users } from 'lucide-react';
import QRCode from 'qrcode';
import { activityPlan, facts, figures, periods, sectionPlans, sections, sources, theses, thesisPlan, videos } from './data/content';
import type { SectionId } from './data/types';
import { siteUrl } from './backend/config';
import { useAuth } from './auth/AuthProvider';
import { readRoomNotice, clearRoomNotice } from './lib/room-exit';
import { leaveLive } from './live/navigationGuard';
import { mayNavigate } from './live/navigationGuard';
import { parseRoute } from './lib/navigation';
import { AuthPage } from './features/AuthPage';
import { ProfilePage } from './features/ProfilePage';
import { JoinPage } from './features/JoinPage';
import { LobbyPage } from './features/LobbyPage';
import { AdminPage } from './features/AdminPage';
import { readPreferences, resetPreferences, savePreferences } from './lib/storage';
import { ArchiveArt } from './components/ArchiveArt';
import { Dialog } from './components/Dialog';

const icons = [CircleHelp, Layers3, ListOrdered, MapPin, Target];
const deploymentUrl = siteUrl;
const accountSections: Record<string, { label: string; eyebrow: string; title: string; description: string }> = {
  auth: { label: 'Кіру', eyebrow: 'АККАУНТ / ҚОНАҚ', title: 'Өз оқу жолыңыз.', description: 'Google арқылы тұрақты аккаунтпен кіріңіз немесе сайысқа қонақ ретінде қосылыңыз.' },
  profile: { label: 'Менің профилім', eyebrow: 'ЖЕКЕ КЕҢІСТІК', title: 'Менің профилім', description: 'Жеке жаттығу нәтижелері мен сайыс тарихы. Email жарияланбайды.' },
  join: { label: 'Сайысқа қосылу', eyebrow: 'ТІКЕЛЕЙ САЙЫС / ҚОСЫЛУ', title: 'Бір бөлмеде бас қосайық.', description: 'Көрсетілетін есім мен бөлме коды жеткілікті. Қонақтарға Google немесе email қажет емес.' },
  lobby: { label: 'Сайыс бөлмесі', eyebrow: 'ТІКЕЛЕЙ САЙЫС', title: 'Тікелей сайыс', description: 'Он сұрақтан тұратын тікелей викторина. Жүргізуші экраны мен жеке жауаптар бір сервер уақытына сүйенеді.' },
  admin: { label: 'Әкімші', eyebrow: 'ҚОРҒАЛҒАН БАСҚАРУ', title: 'Сайыс бөлмелерін дайындау', description: 'Тек серверде рұқсат берілген әкімшілерге арналған басқару аймағы.' },
};
const link = (id: SectionId) => `#/${id}`;
function Draft({ children = 'Материал дайындалуда' }: { children?: React.ReactNode }) { return <span className="draft"><span />{children}</span>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="empty-state"><BookOpen size={30} strokeWidth={1.3} /><h3>{title}</h3><p>{text}</p><Draft>Әзірлеу орны · тексерілген мазмұн жоқ</Draft></div>; }

export default function App() {
  const auth = useAuth();
  const [location, setLocation] = useState(() => parseRoute(window.location.hash));
  const current = location.name;
  const [roomNotice, setRoomNotice] = useState(readRoomNotice);
  useEffect(() => {
    const exit = (event: Event) => { setRoomNotice((event as CustomEvent<string>).detail); leaveLive('#/home'); };
    window.addEventListener('el-zhady:room-exit', exit);
    return () => window.removeEventListener('el-zhady:room-exit', exit);
  }, []);
  const [preferences, setPreferences] = useState(readPreferences);
  const [storageOk, setStorageOk] = useState(true);
  const [modal, setModal] = useState<'menu' | 'share' | 'reset' | string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(0);
  const [qr, setQr] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const main = useRef<HTMLElement>(null);
  const changed = useRef(false);
  useEffect(() => {
    let acceptedHash = window.location.hash;
    function onHash() {
      const destination = window.location.hash;
      if (destination === acceptedHash) return;
      if (!mayNavigate(destination)) { history.replaceState(null, '', `${window.location.pathname}${window.location.search}${acceptedHash}`); return; }
      acceptedHash = destination; changed.current = true; setLocation(parseRoute(destination)); setModal(null); window.scrollTo({ top: 0 });
    }
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    if (changed.current) main.current?.focus({ preventScroll: true });
    const label = sections.find(section => section.id === current)?.label || accountSections[current]?.label || 'Бөлім табылмады';
    document.title = `${label} · Ел жады`;
    const publicSection = sections.find(s => s.id === current);
    if (publicSection) setPreferences(previous => previous.visited.includes(publicSection.id) ? previous : { ...previous, visited: [...previous.visited, publicSection.id] });
  }, [current, location]);
  useEffect(() => { setStorageOk(savePreferences(preferences)); }, [preferences]);
  useEffect(() => {
    document.documentElement.classList.toggle('presentation', preferences.presentation);
    return () => document.documentElement.classList.remove('presentation');
  }, [preferences.presentation]);
  useEffect(() => {
    if (modal === 'share' && deploymentUrl) QRCode.toDataURL(deploymentUrl, { width: 256, margin: 2, color: { dark: '#292925', light: '#ffffff' } }).then(setQr).catch(() => setQr(''));
  }, [modal]);
  const section = sections.find(item => item.id === current) || accountSections[current];
  const selectedActivity = activityPlan.find(item => modal === item.id);
  async function copyUrl() {
    if (!deploymentUrl) return;
    try { await navigator.clipboard.writeText(deploymentUrl); setCopyMessage('Сілтеме көшірілді.'); }
    catch { setCopyMessage('Көшіру қолжетімсіз. Сілтемені мәтіннен көшіріңіз.'); }
  }
  const timeline = <div className="timeline-module">
    <div className="period-tabs" role="group" aria-label="Кезеңді таңдау">{periods.map((period, i) => <button key={period.id} aria-pressed={selectedPeriod === i} className={selectedPeriod === i ? 'active' : ''} onClick={() => setSelectedPeriod(i)}><span className="timeline-dot" /><span className="period-years">{period.years}</span><span>{period.title}</span></button>)}</div>
    <div className="period-detail" aria-live="polite"><div><span className="eyebrow">Кезеңге арналған мазмұн жоспары</span><h3>{periods[selectedPeriod].title}</h3><p>{periods[selectedPeriod].note}</p></div><Draft>Оқиғалар әлі енгізілмеген</Draft></div>
  </div>;
  return <>
    <a className="skip-link" href="#main" onClick={e => { e.preventDefault(); main.current?.focus(); main.current?.scrollIntoView(); }}>Негізгі мазмұнға өту</a>
    <header className="site-header"><div className="header-inner">
      <a className="brand" href={link('home')} aria-label="Ел жады — басты бет"><span className="brand-mark">ЕЖ</span><span className="brand-name">Ел жады<span>ҚАЗАҚСТАН · 1939–1953</span></span></a>
      <nav className="desktop-nav" aria-label="Негізгі навигация">{(['timeline', 'heroes', 'postwar', 'games'] as const).map(id => <a key={id} href={link(id)} aria-current={current === id ? 'page' : undefined}>{sections.find(s => s.id === id)?.label}</a>)}</nav>
      <div className="header-actions"><a className="account-link" href={auth.identity && !auth.identity.anonymous ? "#/profile" : "#/auth"} aria-label={auth.identity && !auth.identity.anonymous ? "Менің профилім" : "Аккаунтқа кіру"}><UserRound size={20} /><span>{auth.identity && !auth.identity.anonymous ? "Профиль" : "Кіру"}</span></a><button className="icon-button presentation-button" title="Көрсетілім режимі" aria-label="Үлкен экранға арналған көрсетілім режимі" aria-pressed={preferences.presentation} onClick={() => setPreferences(p => ({ ...p, presentation: !p.presentation }))}><Monitor size={20} /></button><button className="menu-button" aria-label="Бөлімдер" onClick={() => setModal('menu')} aria-haspopup="dialog"><Menu size={20} /><span>Бөлімдер</span></button></div>
    </div></header>
    {preferences.presentation && <div className="presentation-banner"><Monitor size={18} /> Көрсетілім режимі қосулы <button onClick={() => setPreferences(p => ({ ...p, presentation: false }))}>Шығу <X size={16} /></button></div>}
    <main id="main" tabIndex={-1} ref={main}>
      {roomNotice && <div className="page-width room-exit-notice" role="alert"><strong>{roomNotice}</strong><button type="button" className="icon-button" aria-label="Хабарламаны жабу" onClick={() => { clearRoomNotice(); setRoomNotice(''); }}><X size={20} /></button></div>}
      {current === 'home' ? <>
        <section className="hero page-width">
          <div className="hero-copy"><div className="eyebrow"><span className="small-rule" />ТАРИХТЫ ТАНУ. ЖАДТЫ САҚТАУ.</div><h1>Ел жады<span>Қазақстан,<br /><em>1939–1953.</em></span></h1><p className="hero-description">Ұлы Отан соғысы және соғыстан кейінгі Қазақстан <span>(1939–1953 жж.)</span></p><p className="hero-intro">Өткенді дерек арқылы түсінуге арналған<br className="desktop-break" /> университеттік оқу кеңістігі.</p><div className="hero-actions"><a className="button primary" href={link('timeline')}>Зерттеуді бастау <ArrowRight size={19} /></a><button className="button text-button" onClick={() => setModal('share')}><QrCode size={19} /> Телефонмен ашу</button></div><div className="hero-note"><span className="status-dot" /> Әзірлеу нұсқасы <span className="note-divider">/</span> Мазмұн дереккөздермен толықтырылады</div></div>
          <ArchiveArt />
        </section>
        <div className="collection-strip"><div className="page-width strip-inner"><div><BookOpen size={22} /><span>Бір тақырып. <strong>Бірнеше көзқарас.</strong></span></div><span>Майдан · Тыл · Ғылым · Мәдениет</span><a href="#explore" onClick={e => { e.preventDefault(); document.getElementById('explore')?.scrollIntoView(); }}>Бөлімдерді қарау <ArrowDown size={17} /></a></div></div>
        <section className="page-width section-space" id="explore"><div className="section-heading"><div><span className="eyebrow">ОҚУ БАҒЫТЫ</span><h2>Тарихқа үш қадам</h2></div><p>Уақытты бағдарлаңыз. Тақырыпты зерттеңіз.<br />Біліміңізді бекітуге дайындалыңыз.</p></div>
          <div className="journey-grid">{[{ id: 'timeline' as const, n: '01', title: 'Уақытты бағдарлау', text: '1939–1953 жылдар. Кезеңдер, оқиғалар және олардың байланысы.', Icon: Clock3, meta: 'ХРОНОЛОГИЯ' }, { id: 'front' as const, n: '02', title: 'Тарихты зерттеу', text: 'Майдан мен тыл. Адамдар, еңбек және соғыстан кейінгі өмір.', Icon: Landmark, meta: 'ТАҚЫРЫПТЫҚ БӨЛІМДЕР' }, { id: 'games' as const, n: '03', title: 'Білімді бекіту', text: 'Бес түрлі тапсырма. Жеке нәтиже және ортақ қорытынды жоспары.', Icon: GraduationCap, meta: 'ИНТЕРАКТИВТІ ӘРЕКЕТТЕР' }].map(item => <a className="journey-card" key={item.id} href={link(item.id)}><div className="journey-top"><span>{item.n}</span><item.Icon size={29} strokeWidth={1.2} /></div><h3>{item.title}</h3><p>{item.text}</p><div className="journey-bottom"><span>{item.meta}</span><ArrowUpRight size={22} /></div></a>)}</div>
        </section>
        <section className="timeline-section"><div className="page-width section-space"><div className="section-heading"><div><span className="eyebrow">1939 — 1953</span><h2>Бір дәуірдің белестері</h2></div><a className="inline-link" href={link('timeline')}>Уақыт желісін ашу <ArrowRight size={18} /></a></div>{timeline}<p className="caption">Кезеңдер — навигациялық бағдар. Даталар мен тарихи түсіндірмелер дереккөздермен тексерілуі тиіс.</p></div></section>
        <section className="page-width section-space"><div className="editorial-note"><Shield size={30} strokeWidth={1.2} /><div><span className="eyebrow">ДЕРЕККЕ ҚҰРМЕТ</span><h2>Тарих дәлдіктен басталады.</h2><p>Бұл — сайттың алғашқы құрылымдық нұсқасы. Тексерілген тарихи тезистер, фактілер, портреттер мен бейнелер әлі қосылған жоқ. Әр материал дереккөзбен және түсіндірмемен жарияланатын болады.</p></div><a className="inline-link" href={link('sources')}>Дереккөздер <ArrowUpRight size={18} /></a></div></section>
      </> : <div className="page-width inner-page">
        <a className="breadcrumb" href={link('home')}>Басты бет <ChevronRight size={14} /><span>{section?.label || 'Бөлім табылмады'}</span></a>
        <div className="page-heading"><span className="eyebrow">{section?.eyebrow || '404 / Навигация'}</span><h1>{section?.title || 'Бұл бөлім табылмады'}</h1><p>{section?.description || 'Бөлімдер мәзірінен оқу бағытын таңдаңыз.'}</p>{current !== 'results' && !accountSections[current] && <Draft />}</div>
        {current === 'missing' && <a className="button primary" href={link('home')}>Басты бетке оралу <ArrowRight size={18} /></a>}
        {current === 'timeline' && <>{timeline}<div className="two-column bottom-space"><div className="outline-panel"><span className="eyebrow">ҰҒЫМДАРДЫ АЖЫРАТУ</span><h2>Екі атау. Екі уақыт шегі.</h2><p>Екінші дүниежүзілік соғыс пен Ұлы Отан соғысы бөлек ұғымдар ретінде түсіндіріледі. Нақты даталар, ауқым және қолданылу контексті дереккөздермен қосылады.</p><Draft>Түсіндірме дайындалуда</Draft></div><div className="map-placeholder"><MapPin size={34} strokeWidth={1.2} /><h3>Тарихи картаға арналған орын</h3><p>Дерекке негізделген нүктелер, кезең таңдау және мәтіндік балама жоспарланған.</p><span className="caption">Карта мен анимация әлі жасалмаған</span></div></div></>}
        {sectionPlans[current] && <><div className="two-column"><div className="outline-panel"><span className="eyebrow">БӨЛІМНІҢ МАЗМҰН ЖОСПАРЫ</span><h2>Зерттеу бағыттары</h2><ol className="planned-list">{sectionPlans[current]?.map((text, i) => <li key={text}><span>{String(i + 1).padStart(2, '0')}</span>{text}</li>)}</ol></div><Empty title={current === 'heroes' ? 'Портреттер әлі қосылмаған' : 'Деректер қоры әзірге бос'} text="Тарихи мәтіндер мен суреттер тексерілген дереккөз, нақты сипаттама және авторлық құқық мәліметімен қосылады." /></div><div className="section-next"><p>Тақырыптарды уақыт желісімен байланыстырыңыз.</p><a className="button secondary" href={link('timeline')}>Хронологияға өту <ArrowRight size={18} /></a></div></>}
        {current === 'facts' && <><div className="stats-row"><div><strong>{theses.filter(x => x.status === 'verified').length}<small> / 10</small></strong><span>Тексерілген тезис</span></div><div><strong>{facts.filter(x => x.status === 'verified').length}<small> / 30</small></strong><span>Тексерілген факт</span></div><div><strong>{figures.filter(x => x.status === 'verified' && x.role === 'hero').length}<small> / 11</small></strong><span>Соғыс қаһарманы</span></div></div><div className="section-heading"><div><span className="eyebrow">РЕДАКЦИЯЛЫҚ ЖОСПАР</span><h2>10 тезиске арналған бағыт</h2></div><p>Төмендегі атаулар — дайын тезистер емес.<br />Олар мазмұнды әзірлеу жоспары.</p></div><ol className="thesis-grid">{thesisPlan.map((title, i) => <li key={title}><span>{String(i + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>Тезис, оған қатысты 3 жеке факт және дереккөздер қосылады.</p><Draft>Мазмұн жоқ</Draft></div></li>)}</ol></>}
        {current === 'videos' && <><div className="video-grid">{['Майдан және ерлік', 'Тыл және күнделікті өмір', 'Соғыстан кейінгі ғылым мен мәдениет'].map((title, i) => <article className="video-card" key={title}><div className="video-placeholder"><Play size={32} strokeWidth={1.2} /><span>БЕЙНЕ ОРНЫ / 0{i + 1}</span></div><div className="video-copy"><h2>{title}</h2><p>Тексерілген бейне сілтемесі, автор, субтитр және транскрипт қажет.</p><Draft>Бейне қосылмаған</Draft></div></article>)}</div><p className="caption">Қазір жұмыс істейтін бейне саны: {videos.filter(v => v.status === 'verified').length} / 3. Бос орындар бейне ойнатқыш емес.</p></>}
        {current === 'games' && <><div className="practice-requirement"><strong>Жаттығуға — тұрақты аккаунт.</strong><p>{auth.identity && !auth.identity.anonymous ? 'Аккаунтпен кірдіңіз. Жаттығу ойындары әлі дайын емес; төменде олардың жоспары ғана көрсетілген.' : 'Құрылғылар арасында жеке прогресті сақтау үшін аккаунт қажет. Қазір төмендегі жоспарларды қарауға болады; ойындар әлі дайын емес.'}</p><a className="inline-link" href={auth.identity && !auth.identity.anonymous ? '#/profile' : '#/auth?next=%23%2Fgames'}>{auth.identity && !auth.identity.anonymous ? 'Менің профилім' : 'Google арқылы кіру'} <ArrowRight size={16} /></a><a className="inline-link" href="#/join">Қонақ ретінде сайысқа қосылу <ArrowRight size={16} /></a></div><div className="activity-grid">{activityPlan.map((activity, i) => { const Icon = icons[i]; return <article className="activity-card" key={activity.id}><div className="activity-top"><Icon size={28} strokeWidth={1.4} /><span>{activity.number} / 05</span></div><span className="eyebrow">{activity.subtitle}</span><h2>{activity.title}</h2><p>{activity.method}</p><Draft>Тапсырма әлі қолжетімсіз</Draft><button className="button secondary" onClick={() => setModal(activity.id)}>Жоспарын көру <ArrowRight size={17} /></button></article>; })}</div><div className="notice"><Flag size={22} /><p>Жеке жаттығулар әлі іске қосылған жоқ. Әр әрекетте түсіндірме мен нәтиже, соңында жалпы ұпай көрсетіледі. Қазір ұпай есептелмейді.</p></div></>}
        {current === 'results' && <><div className="practice-requirement"><p>Аккаунттағы жеке жаттығу ұпайлары мен сайыс тарихы профильде бөлек көрсетіледі.</p><a className="inline-link" href="#/profile">Менің профилім <ArrowRight size={16} /></a></div><Empty title="Әлі нәтиже жоқ" text="Тапсырмалар іске қосылып, орындалғаннан кейін жеке нәтижелер мен жалпы қорытынды пайда болады. Бөлімге кіру тапсырманы орындау болып саналмайды." /><div className="results-plan"><h2>Нәтижелердің жоспарланған құрамы</h2>{activityPlan.map(a => <div key={a.id}><span>{a.title}</span><span className="pending-result">Күтілуде</span></div>)}<div className="total-result"><strong>Жалпы қорытынды</strong><span>Әлі есептелмейді</span></div></div><div className="preferences-panel"><div><h3>Осы құрылғыдағы баптаулар</h3><p>Қаралған бөлімдер: {preferences.visited.length} / 11. Бұл оқу жетістігі немесе баға емес. Көрсетілім режимі мен қаралған бөлімдер ғана осы браузерде сақталады.</p>{!storageOk && <p role="status">Браузерде сақтау қолжетімсіз. Баптаулар тек осы сеанста сақталады.</p>}</div><button className="button secondary" onClick={() => setModal('reset')}><RotateCcw size={17} /> Тазарту</button></div></>}
        {current === 'auth' && <AuthPage next={location.params.get('next')} />}
        {current === 'profile' && <ProfilePage next={location.params.get('next')} />}
        {current === 'join' && <JoinPage key={location.params.get('code')} code={location.params.get('code')} />}
        {current === 'lobby' && <LobbyPage roomId={location.params.get('room')} />}
        {current === 'admin' && <AdminPage />}
        {current === 'sources' && <><Empty title="Тексерілген дереккөздер әлі енгізілмеген" text="Кітаптар, мұрағат құжаттары, ғылыми мақалалар және музей материалдары тексерілгеннен кейін библиографиялық тізімге енгізіледі." /><div className="source-rules"><div><span className="eyebrow">01 / МӘТІН</span><h2>Нақты сілтеме</h2><p>Автор, еңбек атауы, баспа, жыл, бет немесе мұрағаттық шифр. Интернет материалында нақты URL мен қаралған күн.</p></div><div><span className="eyebrow">02 / МЕДИА</span><h2>Ашық атрибуция</h2><p>Сурет пен картаның авторы, коллекциясы, лицензиясы және сипаттамасы. Бейненің авторы мен тексерілген сілтемесі.</p></div><div><span className="eyebrow">03 / ТЕКСЕРУ</span><h2>Жауапқа негіздеме</h2><p>Әр дұрыс жауап түсіндірмемен және дереккөзбен бекітіледі. Тексерілмеген нұсқалар бағалауға жіберілмейді.</p></div></div><p className="caption">Тіркелген дереккөз саны: {sources.length}. Басты беттегі композиция — сайт үшін жасалған көркем графика; тарихи сурет немесе құжат емес.</p></>}
      </div>}
    </main>
    {current === 'home' && <section className="page-width competition-callout"><div><span className="eyebrow">БІРГЕ ҚАТЫСУ</span><h2>Сайысқа аккаунтсыз да қосылыңыз.</h2><p>Жүргізуші берген бөлме коды мен есіміңізді енгізіңіз. Жүргізуші бастаған 10 сұрақтық тікелей викторинаға қатысыңыз.</p></div><a className="button primary" href="#/join"><Users size={19} /> Сайысқа қосылу</a></section>}
    <footer className="site-footer"><div className="page-width"><div className="footer-top"><div><a className="footer-brand" href={link('home')}>Ел жады<span>Қазақстан, 1939–1953</span></a><p>Өткенді түсіну — келешекке жауапкершілік.</p></div><div className="footer-links"><a href={link('sources')}>Дереккөздер <ArrowUpRight size={16} /></a><a href={link('results')}>Менің нәтижем <ArrowUpRight size={16} /></a><button onClick={() => setModal('share')}>Сайтпен бөлісу <QrCode size={17} /></button></div></div><div className="footer-bottom"><span>Университеттік оқу жобасы</span><span>3-кезең · мазмұн әзірленуде</span><span>Қазақ тілінде</span></div></div></footer>
    {modal === 'menu' && <Dialog title="Оқу бөлімдері" wide onClose={() => setModal(null)}><nav className="all-sections" aria-label="Барлық бөлімдер">{sections.map((s, i) => <a key={s.id} href={link(s.id)} aria-current={current === s.id ? 'page' : undefined} onClick={() => setModal(null)}><span>{String(i).padStart(2, '0')}</span>{s.label}<ArrowUpRight size={18} /></a>)}</nav><nav className="account-menu" aria-label="Аккаунт және сайыс"><a href="#/join" onClick={() => setModal(null)}>Сайысқа қосылу <Users size={18} /></a><a href="#/profile" onClick={() => setModal(null)}>Менің профилім <UserRound size={18} /></a>{auth.admin && <a href="#/admin" onClick={() => setModal(null)}>Әкімші <Shield size={18} /></a>}</nav><p className="caption">Тарихи мазмұн әзірленуде. Қоғамдық бөлімдерді оқу үшін аккаунт қажет емес.</p></Dialog>}
    {modal === 'share' && <Dialog title="Телефонмен жалғастыру" onClose={() => setModal(null)}>{deploymentUrl ? <div className="share-content">{qr ? <img width={256} height={256} src={qr} alt="Сайттың жалпыға ашық сілтемесіне арналған QR-код" /> : <p>QR-код әлі дайын емес. Төмендегі сілтемені пайдаланыңыз.</p>}<a href={deploymentUrl}>{deploymentUrl}</a><button className="button primary" onClick={copyUrl}>{copyMessage.startsWith('Сілтеме') ? <Check size={18} /> : <Copy size={18} />} Сілтемені көшіру</button><p role="status">{copyMessage}</p></div> : <div className="share-content"><QrCode size={54} strokeWidth={1} /><h3>Жария сілтеме әлі бапталмаған</h3><p>Нақты GitHub Pages мекенжайы жарияланып, тексерілгеннен кейін осы жерде QR-код пен бөлісу сілтемесі пайда болады.</p><Draft>Жариялануы расталмаған</Draft></div>}</Dialog>}
    {selectedActivity && <Dialog title={selectedActivity.title} onClose={() => setModal(null)}><Draft>Бұл — әрекеттің жоспары</Draft><div className="activity-detail"><h3>Қалай орындалады?</h3><p>{selectedActivity.method}</p><h3>Қандай нәтиже беріледі?</h3><p>{selectedActivity.result}</p><h3>Әзірге не жетіспейді?</h3><p>Дереккөздермен бекітілген сұрақтар, жауаптар, бағалау, әрекет нәтижесі және құрылғыда сақтау логикасы әзірленуі тиіс.</p></div><button className="button secondary" onClick={() => setModal(null)}>Түсінікті</button></Dialog>}
    {modal === 'reset' && <Dialog title="Баптауларды тазарту" onClose={() => setModal(null)}><p>Осы браузердегі қаралған бөлімдер тізімі мен көрсетілім режимі тазартылады. Сервердегі профиль мен сайыс нәтижелері өзгермейді.</p><div className="dialog-actions"><button className="button secondary" onClick={() => setModal(null)}>Бас тарту</button><button className="button primary" onClick={() => { const ok = resetPreferences(); setPreferences({ presentation: false, visited: sections.some(s => s.id === current) ? [current as SectionId] : [] }); setStorageOk(ok); setModal(null); }}>Тазарту</button></div></Dialog>}
  </>;
}
