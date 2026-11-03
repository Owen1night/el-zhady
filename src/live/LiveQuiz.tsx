import { answerText } from './answer-text';
import { MapChallenge, TimelineChallenge } from './Challenge';
import { PlayerName } from '../components/PlayerName';
import { earnedPlace } from '../lib/player-label';
import { useEffect, useRef, useState } from 'react';
import { Check, Clock3, Play } from 'lucide-react';
import type { Lobby } from '../backend/contracts';
import { errorText } from '../backend/errors';
import { Dialog } from '../components/Dialog';
import { ErrorNotice } from '../features/Shared';
import { Podium } from './Podium';
import { liveApi } from './api';
import { leaveLive, registerLiveGuard } from './navigationGuard';
import type { Acknowledgement, GameKind, LiveState, QuizChoice, Review, Standing } from './types';
import type { useLiveQuiz } from './useLiveQuiz';
type Feed = ReturnType<typeof useLiveQuiz>;
export function LiveQuiz({ roomId, lobby, feed }: { roomId: string; lobby: Lobby; feed: Feed }) {
  const { state, remaining, retry } = feed;
  const stage = useRef<HTMLElement>(null);
  const [lineupMode,setLineupMode] = useState('mixed');
  const [customKinds,setCustomKinds] = useState<GameKind[]>(['quiz','map','timeline']);
  const loadedConfiguration = useRef<string | null>(null);
  const [choices, setChoices] = useState<QuizChoice[]>([]); const [version, setVersion] = useState(''); const [roundCount, setRoundCount] = useState(1); const [reviewRound, setReviewRound] = useState(0);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [cancel, setCancel] = useState(false); const [destination, setDestination] = useState<string | null>(null);
  const [submission, setSubmission] = useState<{ question: string; option: string; ack?: Acknowledgement; failed?: boolean } | null>(null);
  const [review, setReview] = useState<Review[] | null>(null);
  const kinds = lineupMode === 'mixed' ? ['quiz','map','timeline'] as const : lineupMode === 'quiz' ? Array.from({length: roundCount}, ()=>'quiz' as const) : customKinds.slice(0,roundCount);
  const capacity = choices.find(c=>c.version===version)?.counts;
  const enough = !!capacity && kinds.every(k=>capacity[k]>=10*kinds.filter(x=>x===k).length);
  const running = state?.session?.status === 'running';
  const editable = !state?.competition || state.competition.status === 'ready';
  const competing = !!state?.competition?.started_at && !['revealed','cancelled'].includes(state.competition.status);
  const previousStatus = useRef(state?.competition?.status);
  const [revealEvent, setRevealEvent] = useState(false);
  const justRevealed = previousStatus.current === 'awaiting_reveal' && state?.competition?.status === 'revealed';
  useEffect(() => { if (justRevealed) setRevealEvent(true); previousStatus.current = state?.competition?.status; }, [state?.competition?.status, justRevealed]);
  useEffect(() => {
    if (state?.competition?.status==='ready' && state.lineup?.length && loadedConfiguration.current!==state.competition.id) {
      loadedConfiguration.current=state.competition.id;const saved=state.lineup.map(item=>item.game_kind);setVersion(state.lineup[0].set_version);setRoundCount(saved.length);setCustomKinds([...saved,...['quiz','map','timeline'] as GameKind[]].slice(0,3));setLineupMode(saved.join(',')==='quiz,map,timeline'?'mixed':saved.every(k=>k==='quiz')?'quiz':'custom');
    }
  }, [state?.competition?.id,state?.lineup]);
  useEffect(() => {
    if (!lobby.can_manage || !editable) return;
    let active = true;
    liveApi.choices().then(data => { if (active) { setChoices(data); setVersion(v => v || data.find(c => c.version==='kz-1939-1953-mixed-v3')?.version || data[0]?.version || ''); } }).catch(e => { if (active) setError(errorText(e)); });
    return () => { active = false; };
  }, [lobby.can_manage, editable, feed.loading, state?.session?.set_version]);
  useEffect(() => {
    if (!competing) { setDestination(null); return; }
    const unregister = registerLiveGuard(setDestination);
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', unload);
    return () => { unregister(); window.removeEventListener('beforeunload', unload); };
  }, [competing]);
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
    try { await fn(); retry(); setCancel(false); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function answer(option: string) {
    if (!state?.question || !state.session) return;
    const question = state.question.id;
    setSubmission({ question, option }); setBusy(true); setError('');
    try { const ack = await liveApi.submit(state.session.id, question, option); setSubmission({ question, option: ack.option_id, ack }); retry(); }
    catch (e) { setSubmission({ question, option, failed: true }); setError(errorText(e)); }
    finally { setBusy(false); }
  }
  async function loadReview() { setBusy(true); setError(''); try { setReview(await liveApi.review(roomId, reviewRound || state?.competition?.current_round || 1)); } catch(e) { setError(errorText(e)); } finally { setBusy(false); } }
  const question = state?.question;
  const local = submission?.question === question?.id ? submission : null;
  const accepted = state?.my_answer || local?.ack;
  const selected = accepted?.option_id || local?.option;
  const canStart = !!state?.session && state.session.status === 'ready' && !!state.scheduler_ready && lobby.participants.some(p => p.id !== lobby.my_participant_id) && lobby.room.status !== 'closed';
  return <section ref={stage} className={`live-quiz ${lobby.can_manage ? 'host-view' : 'player-view'}`} aria-label="Тікелей викторина">
    <div className="live-heading"><div><span className="eyebrow">ЕЛ ЖАДЫ · ТІКЕЛЕЙ ВИКТОРИНА</span><h2>{state?.competition?.status === 'revealed' ? 'Сайыс қорытындысы' : state?.phase === 'cancelled' ? 'Сайыс тоқтатылды' : 'Бір уақыт. Он сұрақ.'}</h2></div><span className="live-badge">Кезең {state?.competition?.current_round || 1} / {state?.round_count || kinds.length}</span></div>
    {feed.error && <ErrorNotice error={feed.error} retry={retry} />}
    {error && <ErrorNotice error={error} retry={() => { setError(''); retry(); if (lobby.can_manage && editable) void liveApi.choices().then(setChoices).catch(e => setError(errorText(e))); }} />}
    {feed.loading && !state && <p role="status">Сайыс күйі тексерілуде…</p>}
    {!feed.error && state && editable && <>
      <p>Викторина: 15 с; карта: 25 с; хронология: 40 с. Әр ашылымға 5 с. Әр ойын — 10 тапсырма, ең көбі 11 000 ұпай. Хронология толық дұрыс реттелгенде ғана ұпай беріледі. Дұрыс жауап: 1000 негізгі + 0–100 жылдамдық ұпайы; қате не жауапсыз сұрақ: 0. Сервердің қабылдау уақыты есептеледі. Тікелей сайыс ұпайлары жеке жаттығудың /100 нәтижесіне қосылмайды.</p>
      {lobby.can_manage ? <div className="quiz-setup"><label htmlFor="quiz-version">Сұрақтар жинағы</label><select id="quiz-version" value={version} disabled={busy || lobby.room.status === 'closed'} onChange={e => setVersion(e.target.value)}>{choices.length ? choices.map(c => <option key={c.version} value={c.version}>{c.title} · қорда {c.bank_size} сұрақ</option>) : <option value="">Жинақ қолжетімсіз</option>}</select><label htmlFor="lineup-mode">Ойындар реті</label><select id="lineup-mode" disabled={busy} value={lineupMode} onChange={e=>setLineupMode(e.target.value)}><option value="mixed">Ұсыныс: викторина → карта → хронология</option><option value="quiz">Тек викторина</option><option value="custom">Өз ретім</option></select>{lineupMode!=='mixed'&&<><label htmlFor="round-count">Кезеңдер саны</label><select id="round-count" value={roundCount} disabled={busy} onChange={e=>setRoundCount(Number(e.target.value))}><option value={1}>1 кезең</option><option value={2}>2 кезең</option><option value={3}>3 кезең</option></select></>}{lineupMode==='custom'&&customKinds.slice(0,roundCount).map((kind,index)=><label key={index}>{index+1}-кезең<select value={kind} disabled={busy} onChange={e=>setCustomKinds(items=>items.map((item,i)=>i===index?e.target.value as GameKind:item))}><option value="quiz">Викторина</option><option value="map">Карта</option><option value="timeline">Хронология</option></select></label>)}<p className="form-help">Әр бөлменің барлық кезеңіне сұрақтар бір рет, қайталанбай таңдалады. Сервер қор жеткіліктілігін қайта тексереді. Карта мен хронология бір реттен қосылады. Қате не жауапсыз тапсырма: 0. Дұрыс жауап саны бірінші, бірдей болса — уақыт үлесіне келтірілген жылдамдық ұпайы.</p>{!enough&&<p className="service-notice">Таңдалған ретке сұрақ қоры жеткіліксіз немесе жаңа қызмет әлі бапталмаған.</p>}<button type="button" className="button secondary" disabled={busy||!version||!enough||lobby.room.status==='closed'} onClick={()=>void action(()=>liveApi.configureGames(roomId,version,[...kinds]))}>Ойындар ретін сақтау</button>
      <p className="form-help">{state.session ? `Бекітілген нұсқа: ${state.session.set_version}.` : 'Алдымен викторинаны таңдаңыз.'} Жүргізуші сайыскер ретінде тіркелмейді. Бастау жаңа қатысушылардың кіруін бұғаттайды.</p>
      {state.session && !state.scheduler_ready && <p className="service-notice">Автоматты жүргізу қызметі дайын емес. STAGE3_SETUP.md бойынша Supabase Cron тапсырмасын қосыңыз.</p>}
      <button type="button" className="button primary start-quiz" disabled={busy || !canStart} onClick={() => void action(() => liveApi.start(roomId))}><Play size={19} />{busy ? 'Орындалуда…' : 'Сайысты бастау'}</button>{!lobby.participants.some(p => p.id !== lobby.my_participant_id) && <p>Кемінде бір қатысушыны күтеміз.</p>}</div> : <div className="waiting-note"><strong>Жүргізушіні күтеміз.</strong> {state.session ? 'Викторина таңдалған. Басталғанда осы экран автоматты жаңарады.' : 'Жүргізуші викторинаны дайындайды.'}</div>}
    </>}
    {!!state?.lineup?.length && <ol className="lineup-summary" aria-label="Серверде сақталған ойындар реті">{state.lineup.map(item=><li key={item.round_number}>{item.round_number}-кезең · {item.game_kind==='map'?'Карта':item.game_kind==='timeline'?'Хронология':'Викторина'}</li>)}</ol>}
    {running && <>
      <div className="quiz-progress"><span>{state.phase === 'countdown' ? 'Дайындалыңыз' : `${state.session?.game_kind==='map'?'Карта':state.session?.game_kind==='timeline'?'Хронология':'Сұрақ'} ${state.question_number} / 10`}</span><span className="quiz-timer" role="timer" aria-label={`Қалған уақыт: ${remaining} секунд`}><Clock3 size={21} />{remaining}<small>с</small></span>{lobby.can_manage && state.phase==='question' && question && remaining>0 && !feed.error && <button type="button" className="button secondary end-question" disabled={busy||remaining===0||!!feed.error} onClick={()=>void action(()=>liveApi.endQuestion(roomId,state.session!.id,question.id))}>Сұрақты аяқтау</button>}</div><progress className="question-progress" aria-label="Кезеңнің орындалуы" value={state.revealed_count||0} max={10} />
      <p className="sr-only" role="status">{state.phase === 'countdown' ? 'Сайыс басталады.' : `${state.question_number}-сұрақ. ${state.phase === 'reveal' ? 'Дұрыс жауап пен түсіндірме.' : 'Жауап қабылдануда.'}`}</p>
      {state.phase === 'countdown' ? <div className="quiz-countdown"><span key={remaining}>{remaining || '·'}</span><p>Дайын болыңыз. Жауапты бір рет жібересіз.</p></div> : question && <div className="quiz-question" data-question-id={question.id} key={question.id}><h3>{question.prompt}</h3>{question.game_kind==='map' ? <MapChallenge question={question} chosen={selected || null} disabled={state.phase!=='question'||!state.my_participant_id||!!selected||busy||remaining===0||!!feed.error} reveal={state.phase==='reveal'} onAnswer={option=>void answer(option)}/> : question.game_kind==='timeline' ? <TimelineChallenge question={question} chosen={selected || null} disabled={state.phase!=='question'||!state.my_participant_id||!!selected||busy||remaining===0||!!feed.error} reveal={state.phase==='reveal'} onAnswer={option=>void answer(option)}/> : <div className="quiz-options">{question.options.map((option, i) => {
        const correct = state.phase === 'reveal' && option.id === question.correct_option_id;
        const chosen = selected === option.id;
        return <button key={option.id} type="button" data-option-id={option.id} className={`quiz-option ${chosen ? 'chosen' : ''} ${correct ? 'correct' : ''} ${state.phase === 'reveal' && chosen && !correct ? 'incorrect' : ''}`} disabled={state.phase !== 'question' || !state.my_participant_id || !!selected || busy || remaining === 0 || !!feed.error} onClick={() => void answer(option.id)} aria-pressed={chosen}><span className="option-letter">{'ABCD'[i]}</span><span>{option.text}</span>{correct && <Check size={22} aria-label="Дұрыс жауап" />}{chosen && <span className="option-selected">Сіздің таңдауыңыз</span>}</button>;
      })}</div>
      }
      {state.phase === 'question' && <div className="answer-feedback" role="status">{!state.my_participant_id ? 'Жүргізуші экраны · жауап бермейсіз.' : accepted ? <><Check size={18} /> Жауап серверде сақталды. Келесі сұрақты күтіңіз.</> : local?.failed ? <>Жауаптың қабылдануы расталмады. <button type="button" className="button secondary" disabled={busy || remaining === 0} onClick={() => void answer(local.option)}>Сол жауапты қайта жіберу</button></> : local ? 'Жауап серверге жіберілуде…' : remaining === 0 ? 'Уақыт аяқталды. Сервер күйін күтеміз…' : 'Бір жауапты таңдаңыз. Жіберілген жауап өзгертілмейді.'}</div>}
      {state.phase === 'reveal' && <div className="quiz-explanation"><span className="eyebrow">ДҰРЫС ЖАУАП ЖӘНЕ ТҮСІНДІРМЕ</span>{question.game_kind!=='timeline'&&<p><strong>{question.options.find(o => o.id === question.correct_option_id)?.text}</strong></p>}<p>{question.explanation}</p>{state.my_participant_id && <strong>{accepted ? accepted.is_correct ? `Дұрыс · ${accepted.raw_points} сайыс ұпайы` : 'Қате жауап · 0 ұпай' : 'Жауап берілмеді · 0 ұпай'}</strong>}<Sources items={question.source_refs || []} /></div>}
      </div>}
      {state.phase === 'reveal' && lobby.can_manage && <Leaderboard state={state} />}
      {lobby.can_manage && <button type="button" className="button danger-button cancel-quiz" onClick={() => setCancel(true)} disabled={busy}>Сайысты тоқтату</button>}
    </>}
    {state?.competition?.status === 'between_rounds' && <div className="round-waiting" role="status">{lobby.can_manage ? <><h3>Кезең аяқталды. Нәтижелері сақталды.</h3><Leaderboard state={state} /><button type="button" className="button primary" disabled={busy} onClick={() => void action(() => liveApi.start(roomId, state.competition!.current_round + 1))}>Келесі ойынды бастау</button></> : <p>Ойын аяқталды. Келесі ойынның басталуын күтіңіз.</p>}</div>}
    {state?.competition?.status === 'awaiting_reveal' && <div className="final-waiting">{lobby.can_manage ? <><p>Барлық кезең аяқталды. Қорытынды серверде сақталды.</p><button type="button" className="button primary reveal-results" disabled={busy} onClick={() => void action(() => liveApi.reveal(roomId))}>Нәтижені көрсету</button><Leaderboard state={{...state, leaderboard: state.final_standings, total_questions: (state.round_count || 1) * 10}} /></> : <p role="status">Сайыс аяқталды. Жүргізуші нәтижені жариялағанша күтіңіз.</p>}</div>}
    {state?.competition?.status === 'revealed' && <><p className="quiz-finished-note" role="status">Нәтижелер серверде сақталды. Ең көбі {(state.round_count || 1) * 11000} сайыс ұпайы; бұл жаттығудың /100 шкаласы емес.</p><Podium rows={state.podium || []} animate={revealEvent || justRevealed} serverNow={state.server_now} revealedAt={state.competition.revealed_at} />{lobby.can_manage ? <Leaderboard state={{...state, leaderboard: state.final_standings, total_questions: (state.round_count || 1) * 10}} /> : state.own_result && <section className="own-competition-result" aria-label="Менің сайыс нәтижем"><span className="eyebrow">МЕНІҢ НӘТИЖЕМ</span><h3><PlayerName name={state.own_result.display_name} id={state.own_result.participant_id} /></h3><strong>{state.own_result.raw_points} сайыс ұпайы</strong><p>Дұрыс: {state.own_result.correct_count} / {(state.round_count || 1) * 10} · Жылдамдық: {state.own_result.speed_points} · {state.own_result.eligible ? earnedPlace(state.own_result.rank) : 'Рейтингтен тыс'}</p></section>}</>}
    {state?.phase === 'cancelled' && <p className="waiting-note" role="status">Сайыс әкімші шешімімен тоқтатылды. Қабылданған жауаптар сақталған; аяқталған сайыстар рейтингіне кірмейді. Жаңа сайыс үшін жаңа бөлме қажет.</p>}
    {lobby.can_manage && !!state?.revealed_count && <div className="admin-quiz-review"><label htmlFor="review-round">Есеп кезеңі</label><select id="review-round" disabled={busy} value={reviewRound || state.competition?.current_round || 1} onChange={e => { setReviewRound(Number(e.target.value)); setReview(null); }}>{Array.from({length: state.competition?.current_round || 1}, (_, i) => <option key={i} value={i+1}>{i+1}-кезең</option>)}</select><button type="button" className="button secondary" disabled={busy} onClick={() => void loadReview()}>{review ? 'Сұрақтық есепті жаңарту' : 'Сұрақтар бойынша әкімші есебі'}</button><p className="form-help">Тек жауабы ашылған сұрақтар. Жауап берілмесе — 0. Бұл есеп қатысушыларға қолжетімсіз.</p>{review?.map(q => <details key={q.question_id}><summary>{q.ordinal}. {q.prompt}</summary><p>{q.explanation}</p><ul>{q.answers.map(a => <li key={a.participant_id}><PlayerName name={a.display_name} id={a.participant_id} />: {answerText(q.options,a.option_id)} — {a.raw_points} ұпай{a.received_at && ` · ${new Date(a.received_at).toLocaleTimeString('kk-KZ')}`}</li>)}</ul><Sources items={q.source_refs || []} /></details>)}</div>}
    {cancel && <Dialog title="Сайысты тоқтату керек пе?" onClose={() => { if (!busy) setCancel(false); }}><p>Жауаптар сақталады, бірақ бұл сайыс аяқталған рейтингке кірмейді. Сайыс пен бөлме жабылады; жалғастыру мүмкін емес.</p>{error && <ErrorNotice error={error} />}<div className="dialog-actions"><button type="button" className="button secondary" disabled={busy} onClick={() => setCancel(false)}>Жалғастыру</button><button type="button" className="button danger-button" disabled={busy} onClick={() => void action(() => liveApi.cancel(roomId))}>Сайысты тоқтатуды растау</button></div></Dialog>}
    {destination !== null && <Dialog title="Сайыстан шығасыз ба?" onClose={() => setDestination(null)}><p>Жинаған ұпайларыңыз сақталады. Сайыс жалғаса береді, ал өткізіп алған сұрақтарыңызға 0 ұпай беріледі. Осы браузердегі сеанс сақталса, бөлмеге қайта орала аласыз.</p><div className="dialog-actions"><button type="button" className="button secondary" onClick={() => setDestination(null)}>Сайыста қалу</button><button type="button" className="button primary" onClick={() => { const next = destination; setDestination(null); leaveLive(next); }}>Шығу</button></div></Dialog>}
  </section>;
}
function Sources({ items }: { items: NonNullable<LiveState['question']>['source_refs'] }) { return <details className="quiz-sources"><summary>Дереккөздер</summary><ul>{items?.map(s => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a><span>{s.publisher} · {s.locator}</span></li>)}</ul></details>; }
function Leaderboard({ state }: { state: LiveState }) {
  const rows: Standing[] = state.leaderboard || [];
  return <section className="quiz-leaderboard"><div className="section-heading"><h3>{state.phase === 'finished' ? 'Толық нәтижелер' : 'Аралық нәтиже'}</h3><span>{state.phase === 'finished' ? state.total_questions || 10 : state.revealed_count} / {state.total_questions || 10} сұрақ ашылды</span></div><p className="form-help">Алдымен дұрыс жауап саны, содан кейін жылдамдық ұпайы. Екеуі де тең болса, орын ортақ (мысалы, 1, 1, 3). Үшінші орынды бөліскендердің бәрі тұғырға шығады.</p><div className="standings-table" role="table" aria-label="Сайыс нәтижелері"><div className="standings-row table-heading" role="row"><span role="columnheader">Орын / есім</span><span role="columnheader">Дұрыс</span><span role="columnheader">Жылд.</span><span role="columnheader">Ұпай</span></div>{rows.map(p => <div className={`standings-row ${p.participant_id === state.my_participant_id ? 'my-standing' : ''}`} key={p.participant_id} role="row"><span role="cell"><b>{earnedPlace(p.rank)}</b><span><PlayerName name={p.display_name} id={p.participant_id} /><small>{p.participant_id === state.my_participant_id ? 'Сіз' : ''}</small>{!p.eligible && <small>Рейтингтен тыс · шығарылған</small>}</span></span><span role="cell">{p.correct_count}/{state.total_questions || 10}</span><span role="cell">{p.speed_points}</span><strong role="cell">{p.raw_points}</strong></div>)}</div></section>;
}
