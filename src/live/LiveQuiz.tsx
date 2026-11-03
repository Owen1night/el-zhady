import { useEffect, useRef, useState } from 'react';
import { Check, Clock3, Play, Trophy } from 'lucide-react';
import type { Lobby } from '../backend/contracts';
import { errorText } from '../backend/errors';
import { Dialog } from '../components/Dialog';
import { ErrorNotice } from '../features/Shared';
import { liveApi } from './api';
import { leaveLive, registerLiveGuard } from './navigationGuard';
import type { Acknowledgement, LiveState, QuizChoice, Review, Standing } from './types';
import type { useLiveQuiz } from './useLiveQuiz';
type Feed = ReturnType<typeof useLiveQuiz>;
export function LiveQuiz({ roomId, lobby, feed, onChanged }: { roomId: string; lobby: Lobby; feed: Feed; onChanged: () => void }) {
  const { state, remaining, retry } = feed;
  const stage = useRef<HTMLElement>(null);
  const [choices, setChoices] = useState<QuizChoice[]>([]); const [version, setVersion] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [cancel, setCancel] = useState(false); const [destination, setDestination] = useState<string | null>(null);
  const [submission, setSubmission] = useState<{ question: string; option: string; ack?: Acknowledgement; failed?: boolean } | null>(null);
  const [review, setReview] = useState<Review[] | null>(null);
  const running = state?.session?.status === 'running';
  const editable = !state?.session || state.session.status === 'ready';
  useEffect(() => {
    if (!lobby.can_manage || !editable) return;
    let active = true;
    liveApi.choices().then(data => { if (active) { setChoices(data); setVersion(v => v || data[0]?.version || ''); } }).catch(e => { if (active) setError(errorText(e)); });
    return () => { active = false; };
  }, [lobby.can_manage, editable, feed.loading, state?.session?.set_version]);
  useEffect(() => {
    if (!running) { setDestination(null); return; }
    const unregister = registerLiveGuard(setDestination);
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', unload);
    return () => { unregister(); window.removeEventListener('beforeunload', unload); };
  }, [running]);
  useEffect(() => {
    if (!state?.session || !['countdown','question','reveal','finished'].includes(state.phase || '') || document.querySelector('dialog[open]')) return;
    const frame = requestAnimationFrame(() => {
      const target = stage.current?.querySelector<HTMLElement>(state.phase === 'reveal' ? '.quiz-explanation' : state.phase === 'finished' ? '.live-heading' : '.quiz-progress');
      target?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [state?.phase, state?.question?.id]);
  async function action(fn: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await fn(); retry(); onChanged(); setCancel(false); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function answer(option: string) {
    if (!state?.question || !state.session) return;
    const question = state.question.id;
    setSubmission({ question, option }); setBusy(true); setError('');
    try { const ack = await liveApi.submit(state.session.id, question, option); setSubmission({ question, option: ack.option_id, ack }); retry(); }
    catch (e) { setSubmission({ question, option, failed: true }); setError(errorText(e)); }
    finally { setBusy(false); }
  }
  async function loadReview() { setBusy(true); setError(''); try { setReview(await liveApi.review(roomId)); } catch(e) { setError(errorText(e)); } finally { setBusy(false); } }
  const question = state?.question;
  const local = submission?.question === question?.id ? submission : null;
  const accepted = state?.my_answer || local?.ack;
  const selected = accepted?.option_id || local?.option;
  const canStart = !!state?.session && state.session.status === 'ready' && !!state.scheduler_ready && lobby.participants.some(p => p.id !== lobby.my_participant_id) && lobby.room.status !== 'closed';
  return <section ref={stage} className={`live-quiz ${lobby.can_manage ? 'host-view' : 'player-view'}`} aria-label="Тікелей викторина">
    <div className="live-heading"><div><span className="eyebrow">ЕЛ ЖАДЫ · ТІКЕЛЕЙ ВИКТОРИНА</span><h2>{state?.phase === 'finished' ? 'Сайыс қорытындысы' : state?.phase === 'cancelled' ? 'Сайыс тоқтатылды' : 'Бір уақыт. Он сұрақ.'}</h2></div><span className="live-badge">10 × 15 с</span></div>
    {feed.error && <ErrorNotice error={feed.error} retry={retry} />}
    {error && <ErrorNotice error={error} retry={() => { setError(''); retry(); if (lobby.can_manage && editable) void liveApi.choices().then(setChoices).catch(e => setError(errorText(e))); }} />}
    {feed.loading && !state && <p role="status">Сайыс күйі тексерілуде…</p>}
    {!feed.error && state && editable && <>
      <p>Әр сұраққа 15 секунд, түсіндірме мен аралық нәтижеге 5 секунд. Дұрыс жауап: 1000 негізгі + 0–100 жылдамдық ұпайы; қате не жауапсыз сұрақ: 0. Сервердің қабылдау уақыты есептеледі. Тікелей сайыс ұпайлары жеке жаттығудың /100 нәтижесіне қосылмайды.</p>
      {lobby.can_manage ? <div className="quiz-setup"><label htmlFor="quiz-version">Сұрақтар жинағы</label><select id="quiz-version" value={version} disabled={busy || lobby.room.status === 'closed'} onChange={e => setVersion(e.target.value)}>{choices.length ? choices.map(c => <option key={c.version} value={c.version}>{c.title} · {c.question_count} сұрақ</option>) : <option value="">Жинақ қолжетімсіз</option>}</select><button type="button" className="button secondary" disabled={busy || !version || lobby.room.status === 'closed'} onClick={() => void action(() => liveApi.configure(roomId, version))}>{state.session?.set_version === version ? 'Таңдауды қайта сақтау' : 'Викторинаны таңдау'}</button>
      <p className="form-help">{state.session ? `Бекітілген нұсқа: ${state.session.set_version}.` : 'Алдымен викторинаны таңдаңыз.'} Жүргізуші сайыскер ретінде тіркелмейді. Бастау жаңа қатысушылардың кіруін бұғаттайды.</p>
      {state.session && !state.scheduler_ready && <p className="service-notice">Автоматты жүргізу қызметі дайын емес. STAGE3_SETUP.md бойынша Supabase Cron тапсырмасын қосыңыз.</p>}
      <button type="button" className="button primary start-quiz" disabled={busy || !canStart} onClick={() => void action(() => liveApi.start(roomId))}><Play size={19} />{busy ? 'Орындалуда…' : 'Сайысты бастау'}</button>{!lobby.participants.some(p => p.id !== lobby.my_participant_id) && <p>Кемінде бір қатысушыны күтеміз.</p>}</div> : <div className="waiting-note"><strong>Жүргізушіні күтеміз.</strong> {state.session ? 'Викторина таңдалған. Басталғанда осы экран автоматты жаңарады.' : 'Жүргізуші викторинаны дайындайды.'}</div>}
    </>}
    {running && <>
      <div className="quiz-progress"><span>{state.phase === 'countdown' ? 'Дайындалыңыз' : `Сұрақ ${state.question_number} / 10`}</span><span className="quiz-timer" role="timer" aria-label={`Қалған уақыт: ${remaining} секунд`}><Clock3 size={21} />{remaining}<small>с</small></span></div>
      <p className="sr-only" role="status">{state.phase === 'countdown' ? 'Сайыс басталады.' : `${state.question_number}-сұрақ. ${state.phase === 'reveal' ? 'Дұрыс жауап пен түсіндірме.' : 'Жауап қабылдануда.'}`}</p>
      {state.phase === 'countdown' ? <div className="quiz-countdown"><span key={remaining}>{remaining || '·'}</span><p>Дайын болыңыз. Жауапты бір рет жібересіз.</p></div> : question && <div className="quiz-question" key={question.id}><h3>{question.prompt}</h3><div className="quiz-options">{question.options.map((option, i) => {
        const correct = state.phase === 'reveal' && option.id === question.correct_option_id;
        const chosen = selected === option.id;
        return <button key={option.id} type="button" data-option-id={option.id} className={`quiz-option ${chosen ? 'chosen' : ''} ${correct ? 'correct' : ''} ${state.phase === 'reveal' && chosen && !correct ? 'incorrect' : ''}`} disabled={state.phase !== 'question' || !state.my_participant_id || !!selected || busy || remaining === 0 || !!feed.error} onClick={() => void answer(option.id)} aria-pressed={chosen}><span className="option-letter">{'ABCD'[i]}</span><span>{option.text}</span>{correct && <Check size={22} aria-label="Дұрыс жауап" />}{chosen && <span className="option-selected">Сіздің таңдауыңыз</span>}</button>;
      })}</div>
      {state.phase === 'question' && <div className="answer-feedback" role="status">{!state.my_participant_id ? 'Жүргізуші экраны · жауап бермейсіз.' : accepted ? <><Check size={18} /> Жауап серверде сақталды. Келесі сұрақты күтіңіз.</> : local?.failed ? <>Жауаптың қабылдануы расталмады. <button type="button" className="button secondary" disabled={busy || remaining === 0} onClick={() => void answer(local.option)}>Сол жауапты қайта жіберу</button></> : local ? 'Жауап серверге жіберілуде…' : remaining === 0 ? 'Уақыт аяқталды. Сервер күйін күтеміз…' : 'Бір жауапты таңдаңыз. Жіберілген жауап өзгертілмейді.'}</div>}
      {state.phase === 'reveal' && <div className="quiz-explanation"><span className="eyebrow">ДҰРЫС ЖАУАП ЖӘНЕ ТҮСІНДІРМЕ</span><p><strong>{question.options.find(o => o.id === question.correct_option_id)?.text}</strong></p><p>{question.explanation}</p>{state.my_participant_id && <strong>{accepted ? accepted.is_correct ? `Дұрыс · ${accepted.raw_points} сайыс ұпайы` : 'Қате жауап · 0 ұпай' : 'Жауап берілмеді · 0 ұпай'}</strong>}<Sources items={question.source_refs || []} /></div>}
      </div>}
      {state.phase === 'reveal' && <Leaderboard state={state} />}
      {lobby.can_manage && <button type="button" className="button danger-button cancel-quiz" onClick={() => setCancel(true)} disabled={busy}>Сайысты тоқтату</button>}
    </>}
    {state?.phase === 'finished' && <><p className="quiz-finished-note" role="status">Нәтижелер серверде сақталды. Ең көбі 11 000 сайыс ұпайы; бұл жаттығудың /100 шкаласы емес.</p><div className="quiz-podium" aria-label="Үздік үш орын">{[1,2,3].map(rank => { const winners = state.leaderboard?.filter(p => p.eligible && p.rank === rank) || []; return winners.length ? <div className={`podium-place place-${rank}`} key={rank}><Trophy size={26} /><span>{rank}-орын</span>{winners.map(p => <strong key={p.participant_id}>{p.display_name} <small>#{p.display_suffix}</small></strong>)}</div> : null; })}</div><Leaderboard state={state} /></>}
    {state?.phase === 'cancelled' && <p className="waiting-note" role="status">Сайыс әкімші шешімімен тоқтатылды. Қабылданған жауаптар сақталған; аяқталған сайыстар рейтингіне кірмейді. Жаңа сайыс үшін жаңа бөлме қажет.</p>}
    {lobby.can_manage && !!state?.revealed_count && <div className="admin-quiz-review"><button type="button" className="button secondary" disabled={busy} onClick={() => void loadReview()}>{review ? 'Сұрақтық есепті жаңарту' : 'Сұрақтар бойынша әкімші есебі'}</button><p className="form-help">Тек жауабы ашылған сұрақтар. Жауап берілмесе — 0. Бұл есеп қатысушыларға қолжетімсіз.</p>{review?.map(q => <details key={q.question_id}><summary>{q.ordinal}. {q.prompt}</summary><p>{q.explanation}</p><ul>{q.answers.map(a => <li key={a.participant_id}>{a.display_name} · #{a.display_suffix}: {q.options.find(o => o.id === a.option_id)?.text || 'Жауап жоқ'} — {a.raw_points} ұпай{a.received_at && ` · ${new Date(a.received_at).toLocaleTimeString('kk-KZ')}`}</li>)}</ul><Sources items={q.source_refs || []} /></details>)}</div>}
    {cancel && <Dialog title="Сайысты тоқтату керек пе?" onClose={() => { if (!busy) setCancel(false); }}><p>Жауаптар сақталады, бірақ бұл сайыс аяқталған рейтингке кірмейді. Сайыс пен бөлме жабылады; жалғастыру мүмкін емес.</p>{error && <ErrorNotice error={error} />}<div className="dialog-actions"><button type="button" className="button secondary" disabled={busy} onClick={() => setCancel(false)}>Жалғастыру</button><button type="button" className="button danger-button" disabled={busy} onClick={() => void action(() => liveApi.cancel(roomId))}>Сайысты тоқтатуды растау</button></div></Dialog>}
    {destination !== null && <Dialog title="Сайыстан шығасыз ба?" onClose={() => setDestination(null)}><p>Жинаған ұпайларыңыз сақталады. Сайыс жалғаса береді, ал өткізіп алған сұрақтарыңызға 0 ұпай беріледі. Осы браузердегі сеанс сақталса, бөлмеге қайта орала аласыз.</p><div className="dialog-actions"><button type="button" className="button secondary" onClick={() => setDestination(null)}>Сайыста қалу</button><button type="button" className="button primary" onClick={() => { const next = destination; setDestination(null); leaveLive(next); }}>Шығу</button></div></Dialog>}
  </section>;
}
function Sources({ items }: { items: NonNullable<LiveState['question']>['source_refs'] }) { return <details className="quiz-sources"><summary>Дереккөздер</summary><ul>{items?.map(s => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a><span>{s.publisher} · {s.locator}</span></li>)}</ul></details>; }
function Leaderboard({ state }: { state: LiveState }) {
  const rows: Standing[] = state.leaderboard || [];
  return <section className="quiz-leaderboard"><div className="section-heading"><h3>{state.phase === 'finished' ? 'Толық нәтижелер' : 'Аралық нәтиже'}</h3><span>{state.revealed_count} / 10 сұрақ ашылды</span></div><p className="form-help">Алдымен дұрыс жауап саны, содан кейін жылдамдық ұпайы. Екеуі де тең болса, орын ортақ (мысалы, 1, 1, 3). Үшінші орынды бөліскендердің бәрі тұғырға шығады.</p><div className="standings-table" role="table" aria-label="Сайыс нәтижелері"><div className="standings-row table-heading" role="row"><span role="columnheader">Орын / есім</span><span role="columnheader">Дұрыс</span><span role="columnheader">Жылд.</span><span role="columnheader">Ұпай</span></div>{rows.map(p => <div className={`standings-row ${p.participant_id === state.my_participant_id ? 'my-standing' : ''}`} key={p.participant_id} role="row"><span role="cell"><b>{p.rank ?? '—'}</b><span>{p.display_name} <small>#{p.display_suffix}{p.participant_id === state.my_participant_id ? ' · Сіз' : ''}</small>{!p.eligible && <small>Рейтингтен тыс · шығарылған</small>}</span></span><span role="cell">{p.correct_count}/10</span><span role="cell">{p.speed_points}</span><strong role="cell">{p.raw_points}</strong></div>)}</div></section>;
}
