import test from 'node:test';
import assert from 'node:assert/strict';
import { actors as a, liveHarness, testEpoch } from './live-harness';
import type { LiveState } from '../../src/live/types';
const bank='kz-1939-1953-mixed-v3';
test('mixed live challenges, room reservations, target-specific timeout and private reveal',async t=>{
 const h=await liveHarness(true,true);let now=testEpoch;const state=(uid:string,id:string)=>h.rpc<LiveState>(uid,'live_quiz_state',[id]);
 async function room(kinds=['quiz','map','timeline'],version=bank){now+=1000000;await h.setTime(now);await h.query('delete from el_zhady_private.join_limits');const r=await h.createRoom();for(const uid of [a.player,a.guest])await h.rpc(uid,'join_room',[r.code,'Бір есім']);await h.rpc(a.host,'configure_competition',[r.id,kinds.map(game_kind=>({game_kind,set_version:version}))]);return r;}
 async function start(r:string,n=1){const result=await h.rpc<{session_id:string;starts_at:string}>(a.host,'start_competition_round',[r,n]);return {sid:result.session_id,at:Date.parse(result.starts_at)};}
 async function snapshot(sid:string){return (await h.query<{question_id:string;ordinal:number;correct_option_id:string;content_key:string}>("select * from el_zhady_private.live_quiz_snapshot where session_id=$1 order by ordinal",[sid])).rows;}
 try{
 assert.equal((await h.query<{enabled:boolean}>("select relrowsecurity enabled from pg_class where oid='el_zhady_private.room_question_draws'::regclass")).rows[0].enabled,true);
 await t.test('reserve all three quiz draws atomically; no room repeats across retry, refresh or copied bank IDs',async()=>{
  const r=await room(['quiz','quiz','quiz']);const s=await start(r.id);const rows=(await h.query<{content_key:string}>('select * from el_zhady_private.room_question_draws where room_id=$1',[r.id])).rows;assert.equal(rows.length,30);assert.equal(new Set(rows.map(q=>q.content_key)).size,30);
  const before=await snapshot(s.sid);await start(r.id);await state(a.guest,r.id);assert.deepEqual(await snapshot(s.sid),before);
  const other=await room(['quiz','quiz','quiz']);await start(other.id);assert.equal((await h.query('select * from el_zhady_private.room_question_draws where room_id=$1',[other.id])).rows.length,30,'reuse in another room allowed');
  const bad=await h.createRoom();await assert.rejects(()=>h.rpc(a.host,'configure_competition',[bad.id,[1,2,3].map(()=>({game_kind:'quiz',set_version:'kz-1939-1953-bank-v2'}))]),/INSUFFICIENT_QUESTION_BANK/);
  await assert.rejects(()=>h.rpc(a.host,'configure_competition',[bad.id,[1,2].map(()=>({game_kind:'map',set_version:bank}))]),/INVALID_LINEUP/);
  const copied=await room(['quiz']);await h.rpc(a.host,'configure_competition',[copied.id,['kz-1939-1953-v1','kz-1939-1953-bank-v2','kz-1939-1953-bank-v2'].map(set_version=>({game_kind:'quiz',set_version}))]);
  await assert.rejects(()=>start(copied.id),/INSUFFICIENT_QUESTION_BANK/,'copied prompts with new IDs cannot fill the room');
  assert.equal((await h.query('select * from el_zhady_private.room_question_draws where room_id=$1',[copied.id])).rows.length,0,'failed whole-room draw rolls back every reservation');
  assert.equal((await state(a.host,copied.id)).competition?.status,'ready');
  const changed=await room(['quiz']);await h.query("update el_zhady_private.live_quiz_sets set published=false where version=$1",[bank]);await assert.rejects(()=>start(changed.id),/INVALID_LINEUP/);await h.query('update el_zhady_private.live_quiz_sets set published=true where version=$1',[bank]);
  assert.equal((await state(a.host,changed.id)).competition?.status,'ready');assert.equal((await h.query('select * from el_zhady_private.room_question_draws where room_id=$1',[changed.id])).rows.length,0);
 });
 await t.test('early end is host-only, keeps accepted scores, uses normal reveal, duplicate/stale calls cannot end next question',async()=>{
  const r=await room(['quiz']);const s=await start(r.id);const qs=await snapshot(s.sid);now=s.at;await h.setTime(now);
  await h.rpc(a.player,'submit_live_quiz_answer',[s.sid,qs[0].question_id,qs[0].correct_option_id]);
  await assert.rejects(()=>h.rpc(a.guest,'end_live_question',[r.id,s.sid,qs[0].question_id]),/ADMIN_REQUIRED/);
  now+=2000;await h.setTime(now);const ends=await Promise.all([1,2].map(()=>h.rpc<{closed:boolean}>(a.host,'end_live_question',[r.id,s.sid,qs[0].question_id])));assert.equal(ends.filter(e=>e.closed).length,1);
  for(const uid of [a.host,a.player,a.guest]){const v=await state(uid,r.id);assert.equal(v.phase,'reveal');assert.equal(v.question?.correct_option_id,qs[0].correct_option_id);assert.equal(Date.parse(v.phase_ends_at!),now+5000);}
  const p=await state(a.player,r.id);assert.equal(p.my_answer?.raw_points,1100);assert.equal((await state(a.guest,r.id)).my_answer,null);
  await assert.rejects(()=>h.rpc(a.guest,'submit_live_quiz_answer',[s.sid,qs[0].question_id,qs[0].correct_option_id]),/ANSWER_WINDOW_CLOSED/);
  assert.equal((await h.rpc(a.player,'submit_live_quiz_answer',[s.sid,qs[0].question_id,'different'])).accepted,true,'lost-ack retry returns original accepted answer');
  now+=5000;await h.setTime(now);assert.equal((await state(a.guest,r.id)).phase,'question');
  assert.equal((await h.rpc<{closed:boolean}>(a.host,'end_live_question',[r.id,s.sid,qs[0].question_id])).closed,false);
  const next=await state(a.guest,r.id);assert.equal(next.question?.id,qs[1].question_id);assert.equal(Date.parse(next.phase_ends_at!)-now,15000);assert.equal(Date.parse(next.question!.opens_at),now);
  await h.rpc(a.guest,'submit_live_quiz_answer',[s.sid,qs[1].question_id,qs[1].correct_option_id]);
  now+=15000;await h.setTime(now);const atExpiry=await h.rpc<{closed:boolean}>(a.host,'end_live_question',[r.id,s.sid,qs[1].question_id]);assert.equal(atExpiry.closed,false);assert.equal((await state(a.player,r.id)).phase,'reveal');
  assert.equal((await h.query('select * from el_zhady_private.live_quiz_answers where session_id=$1',[s.sid])).rows.length,2);
 });
 await t.test('normalized half-window speed, invalid/wrong timeline answers and answer-versus-timeout serialization',async()=>{
  const r=await room();
  for(let round=1;round<=3;round++){
   const ss=await start(r.id,round);const qs=await snapshot(ss.sid);const seconds=[15,25,40][round-1];now=ss.at+seconds*500;await h.setTime(now);
   await h.rpc(a.player,'submit_live_quiz_answer',[ss.sid,qs[0].question_id,qs[0].correct_option_id]);
   if(round===3){await assert.rejects(()=>h.rpc(a.guest,'submit_live_quiz_answer',[ss.sid,qs[0].question_id,'forged>order']),/INVALID_OPTION/);await h.rpc(a.guest,'submit_live_quiz_answer',[ss.sid,qs[0].question_id,qs[0].correct_option_id.split('>').reverse().join('>')]);}
   await Promise.all([h.rpc(a.host,'end_live_question',[r.id,ss.sid,qs[0].question_id]),h.rpc(a.host,'end_live_question',[r.id,ss.sid,qs[0].question_id])]);
   const result=await state(a.player,r.id);assert.equal(result.my_answer?.speed_points,50);assert.equal(result.my_answer?.raw_points,1050);
   if(round===3){const wrong=await state(a.guest,r.id);assert.equal(wrong.my_answer?.raw_points,0);assert.equal(wrong.my_answer?.is_correct,false);}
   now=ss.at+10*(seconds+5)*1000;await h.setTime(now);await state(a.host,r.id);
  }
  const race=await room(['quiz']);const ss=await start(race.id);const qs=await snapshot(ss.sid);now=ss.at+4000;await h.setTime(now);
  const attempts=await Promise.allSettled([h.rpc(a.guest,'submit_live_quiz_answer',[ss.sid,qs[0].question_id,qs[0].correct_option_id]),h.rpc(a.host,'end_live_question',[race.id,ss.sid,qs[0].question_id])]);
  const rows=(await h.query('select * from el_zhady_private.live_quiz_answers where session_id=$1',[ss.sid])).rows;assert.equal(rows.length,attempts[0].status==='fulfilled'?1:0);
  assert.equal((await state(a.guest,race.id)).phase,'reveal');now+=5000;await h.setTime(now);assert.equal(Date.parse((await state(a.guest,race.id)).phase_ends_at!)-now,15000);
 });
 await t.test('full mixed competition: comparable maxima, manual starts, stable reconnect, source reveals and private results',async()=>{
  const r=await room();for(const uid of [a.player2,a.player3])await h.rpc(uid,'join_room',[r.code,'Бір есім']);const kinds=['quiz','map','timeline'];
  for(let round=1;round<=3;round++){
   const s=await start(r.id,round);const qs=await snapshot(s.sid);const seconds=[15,25,40][round-1];
   for(const q of qs){now=s.at+(q.ordinal-1)*(seconds+5)*1000;await h.setTime(now);const before=await state(a.guest,r.id);assert.equal(before.question?.game_kind,kinds[round-1]);assert.equal(before.question?.correct_option_id,undefined);assert.equal(before.question?.source_refs,undefined);assert.deepEqual(before.leaderboard,[]);assert.deepEqual(before.final_standings,[]);
    if(q.ordinal===1)await h.rpc(a.player2,'submit_live_quiz_answer',[s.sid,q.question_id,q.correct_option_id]);await h.rpc(a.player,'submit_live_quiz_answer',[s.sid,q.question_id,q.correct_option_id]);const answer=await h.rpc(a.guest,'submit_live_quiz_answer',[s.sid,q.question_id,q.correct_option_id]);assert.deepEqual((await state(a.guest,r.id)).my_answer,answer,'refresh projection restores exact accepted map/order choice');
    now+=seconds*1000;await h.setTime(now);const reveal=await state(a.guest,r.id);assert.equal(reveal.phase,'reveal');assert.equal(reveal.my_answer?.raw_points,1100);assert(reveal.question?.source_refs?.length);assert.equal(reveal.question?.correct_option_id,q.correct_option_id);
   }
   now=s.at+10*(seconds+5)*1000;await h.setTime(now);const host=await state(a.host,r.id);assert.equal(host.session?.status,'completed');assert.equal(host.leaderboard?.filter(x=>x.raw_points===11000).length,2);assert.equal(host.competition?.status,round<3?'between_rounds':'awaiting_reveal');
   now+=60000;await h.setTime(now);assert.equal((await state(a.guest,r.id)).competition?.status,round<3?'between_rounds':'awaiting_reveal','no automatic next-round start/reveal');
  }
  await assert.rejects(()=>h.rpc(a.guest,'reveal_competition_results',[r.id]),/ADMIN_REQUIRED/);const before=await state(a.guest,r.id);assert.deepEqual(before.podium,[]);assert.equal(before.own_result,null);
  await h.rpc(a.host,'reveal_competition_results',[r.id]);const results=await state(a.guest,r.id);assert.equal(results.own_result?.raw_points,33000);assert.equal(results.own_result?.rank,1);assert.equal(results.podium?.length,3);assert.deepEqual(results.final_standings,[]);const fourth=await state(a.player3,r.id);assert.equal(fourth.own_result?.rank,4);assert(!results.podium?.some(p=>p.participant_id===fourth.own_result?.participant_id));assert(!JSON.stringify(results).includes(fourth.own_result!.participant_id));
  for(const uid of [a.player,a.guest]) {for(const table of ['live_quiz_questions','live_quiz_snapshot','room_question_draws'])await assert.rejects(()=>h.asUser(uid,q=>q(`select * from el_zhady_private.${table}`)),/permission denied/);assert.equal((await h.asUser(uid,q=>q('select * from public.live_quiz_results'))).rows.length,0);}
  assert.equal((await h.query("select * from pg_publication_tables where pubname='supabase_realtime' and tablename like '%results%'")).rows.length,0);
 });
 }finally{await h.close();}
});

test('upgrade preserves earned competition results and private history',async()=>{
 const h=await liveHarness(true);try {
  const r=await h.createRoom();await h.rpc(a.player,'save_profile',['Оқырман']);await h.rpc(a.player,'join_room',[r.code,'Оқырман']);await h.rpc(a.host,'configure_live_quiz',[r.id,'kz-1939-1953-bank-v2']);
  const started=await h.rpc<{session_id:string;starts_at:string}>(a.host,'start_competition_round',[r.id,1]);const at=Date.parse(started.starts_at);await h.setTime(at);
  const q=(await h.query<{question_id:string;correct_option_id:string}>('select * from el_zhady_private.live_quiz_snapshot where session_id=$1 order by ordinal',[started.session_id])).rows[0];await h.rpc(a.player,'submit_live_quiz_answer',[started.session_id,q.question_id,q.correct_option_id]);await h.setTime(at+200000);await h.rpc(a.host,'reveal_competition_results',[r.id]);
  const results=(await h.query('select * from public.live_quiz_results')).rows;const history=await h.rpc(a.player,'my_competition_history');
  const {readFile}=await import('node:fs/promises');for(const f of ['20261103000300_mixed_live_engine.sql','20261103000400_mixed_bank_v3.sql'])await h.exec(await readFile(new URL('../migrations/'+f,import.meta.url),'utf8'));
  assert.deepEqual((await h.query('select * from public.live_quiz_results')).rows,results);assert.deepEqual(await h.rpc(a.player,'my_competition_history'),history);assert.equal((await h.rpc<LiveState>(a.player,'live_quiz_state',[r.id])).competition?.status,'revealed');
 }finally{await h.close();}
});
