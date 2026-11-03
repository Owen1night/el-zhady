import land from '../assets/atlas-land.svg';
import { useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { LiveQuestion } from './types';
/** The same accessible answer controls work with touch, mouse and keyboard. */
export function MapChallenge({ question, chosen, disabled, reveal, onAnswer }: {question:LiveQuestion;chosen:string|null;disabled:boolean;reveal:boolean;onAnswer:(id:string)=>void}) {
  const locations=question.payload?.locations || [];
  const labels=new Map(question.options.map((o,i)=>[o.id,'ABCD'[i]]));
  return <div className="map-challenge"><div className="atlas-board" aria-label="Орындарды таңдау картасы">
    <svg viewBox="0 0 1000 400" preserveAspectRatio="none" role="img" aria-label="Еуропа мен Қазақстанның шартты координат торы"><defs><pattern id="atlas-grid" width="100" height="80" patternUnits="userSpaceOnUse"><path d="M100 0H0V80" fill="none" stroke="currentColor" strokeWidth="1"/></pattern></defs><image href={land} width="1000" height="400" preserveAspectRatio="none"/><rect width="1000" height="400" fill="url(#atlas-grid)"/><path d="M80 280Q250 50 440 180T900 300" className="atlas-route"/><text x="24" y="30">БАТЫС → ШЫҒЫС</text><text x="24" y="380">10° E</text><text x="850" y="380">80° E</text></svg>
    {locations.map(l=><button type="button" key={l.id} data-location-id={l.id} style={{left:`${8+(l.lon-10)/70*84}%`,top:`${10+(63-l.lat)/23*75}%`}} disabled={disabled} onClick={()=>onAnswer(l.id)} aria-label={`${labels.get(l.id)}: ${l.text}`} aria-pressed={chosen===l.id} className={`atlas-marker ${chosen===l.id?'chosen':''} ${reveal&&question.correct_option_id===l.id?'correct':''}`}>{labels.get(l.id)}</button>)}
  </div><p className="caption">Шартты оқу картасы: орындар жуық берілген; шекаралар мен әскер қозғалысы бейнеленбеген. Сызық — графикалық бағыттауыш. Төмендегі тізім картамен тең. Негізгі құрлық сұлбасы: Natural Earth, қоғамдық игілік.</p>
    <div className="quiz-options">{question.options.map((o,i)=><button key={o.id} type="button" disabled={disabled} onClick={()=>onAnswer(o.id)} aria-pressed={chosen===o.id} data-option-id={o.id} className={`quiz-option ${chosen===o.id?'chosen':''} ${reveal&&question.correct_option_id===o.id?'correct':''}`}><span className="option-letter">{'ABCD'[i]}</span>{o.text}{chosen===o.id&&<span className="option-selected">Сіздің таңдауыңыз</span>}</button>)}</div>
    {reveal&&<p className="map-answer-reveal" role="status">Картадағы дұрыс орын: {question.options.find(o=>o.id===question.correct_option_id)?.text}</p>}
  </div>;
}
export function TimelineChallenge({ question, chosen, disabled, reveal, onAnswer }: {question:LiveQuestion;chosen:string|null;disabled:boolean;reveal:boolean;onAnswer:(id:string)=>void}) {
  const [order,setOrder]=useState(()=>question.options.map(o=>o.id));
  const displayed=chosen?chosen.split('>'):order;
  function move(index:number,by:number){setOrder(items=>{const copy=[...items];[copy[index],copy[index+by]]=[copy[index+by],copy[index]];return copy;});}
  return <div className="timeline-challenge"><p>Оқиғаларды жоғары / төмен батырмаларымен ертеден кешке реттеңіз. Сүйреу қажет емес. Соңында ретті жіберіңіз.</p><ol className="order-list">{displayed.map((id,i)=><li key={id}><span className="order-position">{i+1}</span><strong>{question.options.find(o=>o.id===id)?.text}</strong><div><button type="button" className="icon-button" aria-label={`${i+1}-оқиғаны жоғары жылжыту`} disabled={disabled||i===0} onClick={()=>move(i,-1)}><ArrowUp size={20}/></button><button type="button" className="icon-button" aria-label={`${i+1}-оқиғаны төмен жылжыту`} disabled={disabled||i===3} onClick={()=>move(i,1)}><ArrowDown size={20}/></button></div></li>)}</ol>
  <button type="button" className="button primary submit-order" disabled={disabled} onClick={()=>onAnswer(order.join('>'))}>Ретті жіберу</button>
  {reveal&&<div className="timeline-answer-reveal"><h4>Дұрыс уақыт желісі</h4><ol>{question.correct_option_id?.split('>').map(id=><li key={id}>{question.options.find(o=>o.id===id)?.text}</li>)}</ol></div>}
  </div>;
}
