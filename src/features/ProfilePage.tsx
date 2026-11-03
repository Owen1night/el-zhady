import { PlayerName } from '../components/PlayerName';
import { earnedPlace } from '../lib/player-label';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../backend/api';
import type { CompetitionHistory, PracticeResult } from '../backend/contracts';
import { errorText } from '../backend/errors';
import { activityPlan } from '../data/content';
import { navigate, safeDestination } from '../lib/navigation';
import { AccountGate, ErrorNotice, ProfileForm, SignOutButton } from './Shared';
export function ProfilePage({ next }: { next: string | null }) {
  const auth = useAuth();
  return <AccountGate><div className="profile-layout"><section className="outline-panel"><span className="eyebrow">ЖЕКЕ ПРОФИЛЬ</span><h2>{auth.profile ? auth.profile.display_name : 'Есіміңізді таңдаңыз'}</h2><p>Бұл — тек өзіңізге қолжетімді профиль. Жаттығу нәтижелері мен сайыс тарихы бөлек сақталады.</p><ProfileForm initial={auth.profile?.display_name} onSaved={() => { if (next) navigate(safeDestination(next)); }} /><SignOutButton /></section><ProfileResults /></div></AccountGate>;
}
function ProfileResults() {
  const auth = useAuth(); const [practice, setPractice] = useState<PracticeResult[]>([]); const [history, setHistory] = useState<CompetitionHistory[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const [scores, competitions] = await Promise.all([api.practice(), api.history()]); setPractice(scores); setHistory(competitions); }
    catch (e) { setError(errorText(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (auth.identity && !auth.identity.anonymous) void load(); }, [auth.identity?.id, auth.identity?.anonymous, load]);
  const total = practice.reduce((sum, result) => sum + result.score, 0);
  return <div><section className="outline-panel"><span className="eyebrow">ЖАТТЫҒУ НӘТИЖЕЛЕРІ</span><h2>Бес әрекет. 100 ұпай.</h2><p>Әр әрекет — ең көбі 20 ұпай. Жеке жаттығулар әлі іске қосылмаған; нәтиже ойдан толтырылмайды.</p>{error ? <ErrorNotice error={error} retry={() => void load()} /> : loading ? <p role="status">Нәтижелер тексерілуде…</p> : <><div className="score-slots">{activityPlan.map(a => { const result = practice.find(p => p.activity_id === a.id); return <div key={a.id}><span>{a.title}</span><strong>{result ? `${result.score} / 20` : '— / 20'}</strong></div>; })}</div><div className="profile-total"><strong>Жалпы жаттығу ұпайы</strong><span>{practice.length ? total : '—'} / 100</span></div><p className="form-help">{practice.length ? `Орындалған әрекет: ${practice.length} / 5. Толық қорытынды барлық әрекеттен кейін беріледі.` : 'Жаттығу нәтижелері әлі жоқ.'}</p></>}</section><section className="outline-panel history-panel"><span className="eyebrow">САЙЫС ТАРИХЫ</span><h2>Жаттығудан бөлек.</h2>{!loading && !error && (history.length ? <ul className="history-list">{history.map(h => <li key={h.session_id || h.participant_id}><strong>{h.room_title}</strong><span><PlayerName name={h.display_name} id={h.participant_id} /> — {h.scoring_kind === 'live_quiz_raw' ? `${h.score} сайыс ұпайы · дұрыс ${h.correct_count}/${h.question_count || 10} · жылдамдық ${h.speed_points} · ${h.eligible ? h.rank ? earnedPlace(h.rank) : 'орын жарияланбаған' : 'рейтингтен тыс'}` : `${h.score} / ${h.max_score}`}</span></li>)}</ul> : <p>Тұрақты аккаунтпен аяқталған сайыс нәтижелері әлі жоқ. Қонақ ретінде алынған нәтиже есім ұқсастығына қарай профильге қосылмайды.</p>)}</section></div>;
}
