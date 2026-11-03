// Dev-only authoring. Never import into src; run to regenerate the NEW draft seed.
import { writeFile, readFile } from 'node:fs/promises';
import type { Source, TimelineEvent } from '../src/data/types';
// Frozen source snapshot: future public copy edits must never rewrite applied SQL.
const {sources:learningSources,timeline:learningTimeline}=JSON.parse(await readFile('supabase/content/learning-v3.json','utf8')) as {sources:Source[];timeline:TimelineEvent[]};
const version='kz-1939-1953-mixed-v3';
const extraSources=[
 {id:'europe',title:'World War II in Europe',publisher:'United States Holocaust Memorial Museum',url:'https://encyclopedia.ushmm.org/content/en/article/world-war-ii-in-europe'},
 {id:'eastern',title:'The Soviet Union and the Eastern Front',publisher:'United States Holocaust Memorial Museum',url:'https://encyclopedia.ushmm.org/content/en/article/the-soviet-union-and-the-eastern-front'},
 {id:'invasion',title:'Invasion of the Soviet Union, June 1941',publisher:'United States Holocaust Memorial Museum',url:'https://encyclopedia.ushmm.org/content/en/article/invasion-of-the-soviet-union-june-1941'}];
const refs=(id:string,locator:string)=>{const s=[...learningSources,...extraSources].find(s=>s.id===id)!;return {title:s.title,publisher:s.publisher,url:s.url,locator,checked_on:'2026-11-03'};};
const literal=(v:unknown)=>`'${String(v).replaceAll("'","''")}'`;
const json=(v:unknown)=>literal(JSON.stringify(v))+'::jsonb';
const rows:string[]=[];let ordinal=20;
function add(kind:string,prompt:string,options:{id:string;text:string}[],correct:string,explanation:string,source:ReturnType<typeof refs>[],payload:object={}){ordinal++;const id=`34000000-0000-4000-8000-${String(ordinal).padStart(12,'0')}`;rows.push(`(${literal(id)},${literal(version)},${ordinal},${literal(prompt)},${json(options)},${literal(correct)},${literal(explanation)},${json(source)},${literal(kind)},${json(payload)})`);}
const quizzes:[string,string[],string,string,string][]=[
 ['Семей полигонындағы алғашқы кеңестік ядролық сынақтың жылы қайсы?',['1949','1939','1941','1946'],'1949 жылғы 29 тамыз.','ctbto','First Soviet test: 29 August 1949'],
 ['Орталық біріккен киностудия қай кезеңде жұмыс істеді?',['1941–1944','1930–1933','1946–1950','1951–1953'],'ЦОКС Алматыда 1941–1944 жылдары жұмыс істеді.','cinema','Title and opening paragraphs'],
 ['Алматыдағы ЦОКС құрамына қай студиялар эвакуацияланды?',['Мосфильм мен Ленфильм','Тек соғыстан кейінгі телестудиялар','Тек шетелдік студиялар','Тек радиостанциялар'],'Мосфильм мен Ленфильм жергілікті студиямен бірікті.','cinema','Composition of TsOKS'],
 ['1941 жылы Оралға келген №231 зауыт қай қаладан көшірілді?',['Ленинградтан','Алматыдан','Семейден','Ташкенттен'],'№231 зауыт Ленинградтан Оралға көшірілді.','west','1941 жылғы 10–11 қыркүйек, №231 зауыт'],
 ['Тылдағы балаларға қамқорлықтың деректе аталған түрі қайсы?',['Санаторийлер мен балабақша топтарын ұйымдастыру','Барлық мектепті жабу','Балаларға көмек көрсетпеу','Тек ересектерді орналастыру'],'Мақала балалар санаторийлері мен қосымша балабақша топтарын атайды.','west','Балаларға қамқорлық абзацы'],
 ['Соғыстан кейін Өскеменде қай өндіріс орны алғашқы өнімін бере бастады?',['Қорғасын-мырыш комбинаты','Кино бірлестігі','Мұхит кеме зауыты','Пошта маркасы фабрикасы'],'Өскемен қорғасын-мырыш комбинаты алғашқы мырышын берді.','recovery','Түсті металлургия абзацы'],
 ['Соғыстан кейінгі экономикалық саясатта қай салаға басымдық берілді?',['Ауыр және әскери өнеркәсіпке','Тек туризмге','Тек ойын-сауыққа','Тек жеке автокөлікке'],'Дерек ауыр өнеркәсіп пен әскери-өнеркәсіп бағытын атайды.','recovery','Негізгі экономикалық бағыттар'],
 ['Дерек қай соғыстан кейінгі жылды ауыл шаруашылығы үшін қиын деп сипаттайды?',['1946','1939','1940','1941'],'Мақала 1946 жылдың ауыл шаруашылығындағы қиындықтарын сипаттайды.','recovery','Соғыстан кейінгі алғашқы 1946 жыл'],
 ['Соғыстан кейінгі қалпына келтіру жоспары қай жылдарды қамтыды?',['1946–1950','1939–1941','1941–1943','1951–1953'],'Заң 1946–1950 жылдарға арналған.','recovery','Өнеркәсіп бөлімі, 1946 жылғы 18 наурыз'],
 ['Соғыс жылдары Алматыдағы киноөндірісте қандай ұйым жұмыс істеді?',['Орталық біріккен киностудия','Тек телехабарлар орталығы','Тек теңіз штабы','Тек ғарыш агенттігі'],'ЦОКС — Орталық біріккен киностудия.','cinema','Title and opening paragraphs'],
];
for(const [prompt,texts,explanation,s,l] of quizzes){const n=ordinal+1;const opts=texts.map((text,i)=>({id:`v3q${n}_${i}`,text}));add('quiz',prompt,opts,opts[0].id,explanation,[refs(s,l)]);}
const cities:Record<string,{text:string;lon:number;lat:number}>={
 almaty:{text:'Алматы',lon:76.9,lat:43.2},oral:{text:'Орал',lon:51.4,lat:51.2},semey:{text:'Семей полигонының өңірі',lon:78.0,lat:50.0},moscow:{text:'Мәскеу',lon:37.6,lat:55.8},warsaw:{text:'Варшава',lon:21.0,lat:52.2},berlin:{text:'Берлин',lon:13.4,lat:52.5},stalingrad:{text:'Сталинград (қазіргі Волгоград)',lon:44.5,lat:48.7},kursk:{text:'Курск',lon:36.2,lat:51.7},leningrad:{text:'Ленинград (қазіргі Санкт-Петербург)',lon:30.3,lat:59.9},vitebsk:{text:'Витебск',lon:30.2,lat:55.2}};
const maps:[string,string,string,string,string][]=[
 ['1941–1944 жылдардағы ЦОКС жұмыс істеген қаланы таңдаңыз.','almaty','cinema','Opening paragraphs','Алматы — ЦОКС жұмыс істеген қала.'],
 ['1941 жылы №231 зауыттың жабдықтарын қабылдаған қаланы табыңыз.','oral','west','№231 зауыт туралы абзац','Оралға Ленинградтан зауыт көшірілді.'],
 ['1949 жылғы алғашқы кеңестік ядролық сынақ өткен өңірді көрсетіңіз.','semey','ctbto','First Soviet test paragraph','Семей сынақ полигоны. Белгі нақты сынақ нүктесі емес, өңірді көрсетеді.'],
 ['1941 жылғы желтоқсандағы кеңестік қарсы шабуыл қай қаланың түбінде болды?','moscow','invasion','Military Offensives, December 1941','Мәскеу түбіндегі қарсы шабуыл.'],
 ['1939 жылы басып алынған Польша астанасын таңдаңыз.','warsaw','europe','1939 section, German troops parade through Warsaw','Варшава — Польша астанасы.'],
 ['1945 жылғы сәуірде кеңес әскері қоршауға алған Германия астанасын табыңыз.','berlin','europe','1945 section, encirclement of capital','Берлин — Германия астанасы.'],
 ['1942–1943 жылдардағы Еділ бойындағы ірі шайқас өткен қаланы таңдаңыз.','stalingrad','eastern','The Eastern Front, 1942–1943','Шайқас Сталинградта өтті.'],
 ['1943 жылғы шілдедегі неміс шабуылы мен кеңестік жеңіс байланысты орынды табыңыз.','kursk','eastern','1943–1944 section, July 1943','Курск шайқасы.'],
 ['1941 жылдың қыркүйегінде неміс әскері солтүстікте қақпасына жеткен қаланы таңдаңыз.','leningrad','invasion','Military Offensives, late September 1941','Ленинград.'],
 ['1944 жылғы 26 маусымда кеңес әскері азат еткен қаланы көрсетіңіз.','vitebsk','eastern','Soviet military advance in Vitebsk caption','Витебск.'],
];
for(const [prompt,city,s,l,explanation] of maps){const alternatives=Object.keys(cities).filter(id=>id!==city);const picked=[city,...alternatives.filter(id=>Math.abs(cities[id].lon-cities[city].lon)>8||Math.abs(cities[id].lat-cities[city].lat)>5).slice(0,3)];const options=picked.map(id=>({id,text:cities[id].text}));add('map',prompt,options,city,explanation,[refs(s,l)],{locations:picked.map(id=>({id,...cities[id]}))});}
const groups=[ [0,1,7,10],[2,3,8,11],[0,4,7,9],[1,5,8,10],[3,6,9,11],[0,2,5,7],[1,3,9,10],[2,4,8,11],[0,6,7,10],[1,4,9,11] ];
for(const [i,indices] of groups.entries()) {const events=indices.map(n=>learningTimeline[n]).sort((a,b)=>a.date.localeCompare(b.date));const options=events.map(e=>({id:e.id,text:e.title}));const source=events.flatMap(e=>e.sourceRefs.map(r=>refs(r.sourceId,r.locator)));add('timeline',`Оқиғаларды ертеден кешке реттеңіз · ${i+1}-топ`,options,options.map(o=>o.id).join('>'),events.map(e=>`${e.date}: ${e.title}`).join('; '),source);}
let sql=`begin;\n-- LIVE_PRIVATE_MIXED_V3: immutable authored content, never a frontend import.\ninsert into el_zhady_private.live_quiz_sets values('${version}','Ел жады: 30 викторина + 10 карта + 10 хронология',true,'LIVE_PRIVATE_MIXED_V3','2026-11-03');\ninsert into el_zhady_private.live_quiz_questions(id,set_version,ordinal,prompt,options,correct_option_id,explanation,source_refs)\nselect ('34000000-0000-4000-8000-'||lpad(ordinal::text,12,'0'))::uuid,'${version}',ordinal,prompt,options,correct_option_id,explanation,source_refs\nfrom el_zhady_private.live_quiz_questions where set_version='kz-1939-1953-bank-v2';\n`;
// The old SCORM path now contains later material; change only the new copied row.
sql+=`update el_zhady_private.live_quiz_questions set source_refs=${json([refs('recovery','Өнеркәсіп бөлімі: 1946 жылғы наурыз, 1946–1950 жоспары')])} where set_version='${version}' and ordinal=7;\n`;
sql+='insert into el_zhady_private.live_quiz_questions(id,set_version,ordinal,prompt,options,correct_option_id,explanation,source_refs,game_kind,payload) values\n'+rows.join(',\n')+';\n';
sql+=`do $$ begin if (select count(*) from el_zhady_private.live_quiz_questions where set_version='${version}')<>50 then raise exception 'Expected 50 sourced questions';end if;end $$;\ncommit;\n`;
const path='supabase/migrations/20261103000400_mixed_bank_v3.sql';
if(process.argv.includes('--check')) {if(await readFile(path,'utf8')!==sql)throw new Error('Generated draft seed differs');}else await writeFile(path,sql);
console.log('Private v3 seed: 30 quiz, 10 map, 10 timeline; supported max 3 rounds, at most one map/timeline each.');
