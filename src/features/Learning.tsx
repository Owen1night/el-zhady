import { useState } from 'react';
import { learningFacts, learningFigures, learningGroups, learningSources, learningTimeline } from '../data/learning';
import type { SourceReference } from '../data/types';
export function References({ refs }: { refs: readonly SourceReference[] }) {
  return <ul className="reading-sources">{refs.map(ref => { const source = learningSources.find(s => s.id === ref.sourceId)!; return <li key={`${ref.sourceId}:${ref.locator}`}><a href={source.url} target="_blank" rel="noreferrer">{source.publisher} · {source.title}</a><span>{ref.locator}</span></li>; })}</ul>;
}
export function LearningReadings({ section }: { section: string }) {
  const ids = learningGroups[section] || learningFacts.map(f => f.id);
  return <div className="learning-collection"><p className="editorial-status">Алғашқы дерекке негізделген оқу топтамасы · 03.11.2026. Мәтіндер дереккөздермен салыстырылды; академиялық және қазақша редакторлық рецензия әлі қажет.</p>
    {section === 'heroes' && <div className="people-grid">{learningFigures.map(p => <article className="outline-panel" key={p.id}><span className="eyebrow">{p.role === 'hero' ? 'ҚЫСҚАША ТАНЫСТЫРУ · МАЙДАН' : 'ҚЫСҚАША ТАНЫСТЫРУ · ҒЫЛЫМ ЖӘНЕ ҚОҒАМ'}</span><h2>{p.name}</h2><p>{p.biography}</p><References refs={p.sourceRefs} /></article>)}</div>}
    <div className="reading-grid">{ids.map((id,i) => { const f = learningFacts.find(f => f.id === id)!; return <article className="reading-card" id={f.id} key={id}><span className="archive-stamp">{String(i+1).padStart(2,'0')} / {f.period === 'postwar' ? '1946–1953' : '1939–1945'}</span><h2>{f.title}</h2><p>{f.text}</p><References refs={f.sourceRefs} /></article>; })}</div>
    {(section === 'heroes' || section === 'front') && <figure className="archive-artifact"><div className="artifact-monogram" aria-hidden="true">ММ<br /><small>1995</small></div><figcaption><strong>Еске алу жәдігері: Мәншүк Мәметоваға арналған 1995 жылғы пошта маркасы.</strong><p>Бұл соғыс кезіндегі сурет емес. Автор: Қазақстан поштасы. Commons сипаттамасында PD-KZ-exempt (ресми белгі, қоғамдық игілік) деп берілген. Түпнұсқа бейне қашықтағы қорға тиесілі; мұнда оның каталог сілтемесі беріледі.</p><References refs={[{sourceId:'stamp',locator:'Description, Date, Author, Permission; original file 331 × 198'}]} /><a className="inline-link" href="https://upload.wikimedia.org/wikipedia/commons/4/41/Manshuk_Mametova_stamp.jpg" target="_blank" rel="noreferrer">Марканың түпнұсқасын ашу ↗</a></figcaption></figure>}
  </div>;
}
export function LearningTimeline() {
  const [period,setPeriod] = useState('all');
  return <section className="learning-timeline"><div className="period-tabs" role="group" aria-label="Хронология кезеңі">{[['all','Барлығы'],['context','1939–1941'],['war','Майдан және тыл'],['postwar','1946–1953']].map(([id,label]) => <button type="button" key={id} aria-pressed={period===id} className={period===id?'active':''} onClick={()=>setPeriod(id)}>{label}</button>)}</div><ol>{learningTimeline.filter(e=>period==='all'||e.period===period).map(e=><li key={e.id}><time dateTime={e.date}>{e.date}</time><div><h3>{e.title}</h3><p>{e.description}</p><References refs={e.sourceRefs}/></div></li>)}</ol><p className="caption">Тек жыл немесе ай көрсетілген жерде нақты күн берілмейді. Әр жазба өз оқиғасын ғана сипаттайды.</p></section>;
}

export function SourceCatalog() { return <section className="outline-panel"><h2>Оқу топтамасының дереккөздері</h2><p>Ашылып салыстырылған деректер. Мәтіндер — қысқаша авторлық мазмұндама; суреттерге қатысты құқық мәтін құқықтарынан бөлек қаралады.</p><ol className="reading-sources">{learningSources.map(s=><li key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a><span>{s.author} · {s.publisher} · {s.publicationDate || 'Жарияланған күні көрсетілмеген'} · қаралған: {s.accessedOn}</span></li>)}</ol></section>; }
