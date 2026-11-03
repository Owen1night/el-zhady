import { PlayerName } from '../components/PlayerName';
import { earnedPlace } from '../lib/player-label';
import { useEffect, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import type { Standing } from './types';
/** Animate only an observed server reveal transition. A refresh starts settled. */
export function Podium({ rows, animate, serverNow, revealedAt }: { rows: Standing[]; animate: boolean; serverNow: string; revealedAt: string | null }) {
  const finished = useRef(false);
  const places = [3,2,1].filter(rank => rows.some(p => p.rank === rank));
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [step, setStep] = useState(animate && !reduced ? 0 : places.length);
  useEffect(() => { const query = matchMedia('(prefers-reduced-motion: reduce)'); const change = () => setReduced(query.matches); query.addEventListener('change', change); return () => query.removeEventListener('change', change); }, []);
  useEffect(() => {
    if (!animate || reduced || finished.current) { finished.current = true; setStep(places.length); return; }
    const elapsed = Math.max(0, Date.parse(serverNow) - Date.parse(revealedAt || serverNow));
    const start = performance.now() - elapsed;
    const tick = () => { const next = Math.min(places.length, Math.floor((performance.now() - start) / 3000)); if (next === places.length) finished.current = true; setStep(next); };
    tick(); const timer = setInterval(tick, 100); return () => clearInterval(timer);
    // Capture the server time once for this reveal, never restart on a state poll.
  }, [animate, reduced, revealedAt, places.length]);
  const settled = step >= places.length;
  const spotlight = places[step];
  if (!places.length) return <div className="quiz-podium" data-podium-stage="settled"><p>Рейтингке кірген қатысушылар жоқ.</p></div>;
  return <div className={`quiz-podium podium-sequence ${settled ? 'settled podium-celebrate' : `spotlight-${spotlight}`}`} data-podium-stage={settled ? 'settled' : spotlight} aria-label="Үздік үш орын">
    <span className="sr-only" role="status">{settled ? 'Сайыс жеңімпаздары жарияланды.' : `${spotlight}-орын`}</span>
    {[3,1,2].map(rank => {
      const winners = rows.filter(p => p.rank === rank);
      if (!winners.length) return null;
      const pending = !settled && places.indexOf(rank) > step;
      return <div key={rank} className={`podium-place place-${rank} ${rank === spotlight && !settled ? 'spotlight' : ''} ${pending ? 'podium-pending' : ''}`} aria-hidden={pending}>
        <Trophy size={30} /><span>{earnedPlace(rank)}</span>{winners.map(p => <div className="podium-person" key={p.participant_id}><strong><PlayerName name={p.display_name} id={p.participant_id} /></strong><small>{p.raw_points} ұпай</small></div>)}
      </div>;
    })}
  </div>;
}
