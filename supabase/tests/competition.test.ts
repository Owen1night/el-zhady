import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { actors as a, liveHarness, testEpoch as epoch } from './live-harness';
import type { LiveState } from '../../src/live/types';
const bank='kz-1939-1953-bank-v2';
test('Competition lifecycle, roster, reveal privacy and immutable draws',async t=>{
 const h=await liveHarness(true);let clock=epoch;
 const state=(uid:string,room:string)=>h.rpc<LiveState>(uid,'live_quiz_state',[room]);
 const history=async(uid:string,code:string)=>(await h.rpc<{room_code:string;score:number;max_score:number}[]>(uid,'my_competition_history')).filter(r=>r.room_code===code);
 const join=(uid:string,code:string,name='Ортақ есім')=>h.rpc<{participant_id:string;error?:string}>(uid,'join_room',[code,name]);
 async function room(users:string[]=[a.player,a.guest],rounds=1){
  await h.query('delete from el_zhady_private.join_limits');clock+=1000000;await h.setTime(clock);
  const room=await h.createRoom();const members=[];for(const uid of users)members.push(await join(uid,room.code));
  await h.rpc(a.host,'configure_competition',[room.id,Array.from({length:rounds},()=>({game_kind:'quiz',set_version:bank}))]);
  return {room,members};
 }
 async function round(roomId:string,n:number){const start=clock;const result=await h.rpc<{session_id:string}>(a.host,'start_competition_round',[roomId,n]);return {sid:result.session_id,start};}
 async function finish(start:number){clock=start+203000;await h.setTime(clock);await h.query('select el_zhady_private.tick_live_quizzes()');}
 try{
  await t.test('remove requires explicit rejoin, block is identity/room scoped and new names cannot bypass it',async()=>{
   const {room:r,members}=await room();
   await h.rpc(a.host,'admin_room_action',[r.id,'remove',members[0].participant_id]);
   await assert.rejects(()=>state(a.player,r.id),/ROOM_REMOVED/);
   await assert.rejects(()=>h.rpc(a.player,'get_lobby',[r.id]),/ROOM_REMOVED/);
   await assert.rejects(()=>h.rpc(a.player,'lobby_heartbeat',[r.id]).then(()=>state(a.player,r.id)),/ROOM_REMOVED/);
   assert.equal((await join(a.player,r.code)).participant_id,members[0].participant_id);
   await Promise.all([h.rpc(a.host,'admin_room_action',[r.id,'block',members[0].participant_id]),h.rpc(a.host,'admin_room_action',[r.id,'block',members[0].participant_id])]);
   assert.equal((await join(a.player,r.code,'Басқа есім')).error,'ROOM_BLOCKED');
   assert.equal((await join(a.outsider,r.code,'Ортақ есім')).error,undefined);
   const other=await room([a.player]);assert.equal(other.members.length,1);
   await assert.rejects(()=>h.rpc(a.guest,'admin_room_action',[r.id,'block',members[1].participant_id]),/ADMIN_REQUIRED/);
  });
  await t.test('multi-round lineup freezes roster; manual transitions and late joins stay locked between games',async()=>{
   const {room:r,members}=await room([a.host,a.player,a.guest],2);
   await assert.rejects(()=>h.rpc(a.host,'configure_competition',[r.id,[{game_kind:'map',set_version:bank}]]),/INVALID_LINEUP/);
   await assert.rejects(()=>h.rpc(a.guest,'start_competition_round',[r.id,1]),/ADMIN_REQUIRED/);
   const starts=await Promise.all(Array.from({length:5},()=>h.rpc<{session_id:string;starts_at:string}>(a.host,'start_competition_round',[r.id,1])));
   assert(starts.every(s=>s.session_id===starts[0].session_id&&s.starts_at===starts[0].starts_at));const start=clock;
   assert.equal((await state(a.host,r.id)).my_participant_id,null);
   assert.equal((await join(a.outsider,r.code)).error,'ROOM_LOCKED');
   assert.equal((await join(a.guest,r.code)).participant_id,members[2].participant_id);
   await finish(start);const waiting=await state(a.guest,r.id);assert.equal(waiting.competition?.status,'between_rounds');assert.equal(waiting.session?.status,'completed');
   assert.equal((await join(a.outsider,r.code)).error,'ROOM_LOCKED');
   await assert.rejects(()=>h.rpc(a.host,'admin_room_action',[r.id,'unlock',null]),/COMPETITION_STARTED/);
   await h.setTime(clock+100000);assert.equal((await state(a.player,r.id)).competition?.status,'between_rounds');
   const firstAgain=await h.rpc<{session_id:string}>(a.host,'start_competition_round',[r.id,1]);assert.equal(firstAgain.session_id,starts[0].session_id);
   const next=await Promise.all(Array.from({length:4},()=>h.rpc<{session_id:string}>(a.host,'start_competition_round',[r.id,2])));assert(next.every(s=>s.session_id===next[0].session_id));
   const roster=await h.query<{session_id:string;ids:string[]}>('select session_id,array_agg(participant_id order by participant_id) ids from el_zhady_private.live_quiz_roster where session_id in($1,$2) group by session_id',[starts[0].session_id,next[0].session_id]);
   assert.deepEqual(roster.rows[0].ids,roster.rows[1].ids);assert.equal(roster.rows[0].ids.length,2);
   await assert.rejects(()=>h.rpc(a.player,'start_competition_round',[r.id,2]),/ADMIN_REQUIRED/);
  });
  await t.test('draw is ten distinct questions, one shared order, stable under retries/reconnect; fresh rounds vary',async()=>{
   const selections:string[]=[];
   for(let run=0;run<4;run++){
    const {room:r}=await room();const {sid,start}=await round(r.id,1);
    const before=(await h.query<{question_id:string;ordinal:number;correct_option_id:string}>('select question_id,ordinal,correct_option_id from el_zhady_private.live_quiz_snapshot where session_id=$1 order by ordinal',[sid])).rows;
    assert.equal(before.length,10);assert.equal(new Set(before.map(q=>q.question_id)).size,10);selections.push(before.map(q=>q.question_id).join(','));
    await h.setTime(start+4000);
    const p=await state(a.player,r.id);const g=await state(a.guest,r.id);
    assert.equal(p.question?.id,g.question?.id);assert.equal(p.question?.prompt,g.question?.prompt);assert.equal(p.question?.ordinal,1);
    assert.equal(p.question?.correct_option_id,undefined);assert.equal(p.question?.explanation,undefined);assert.equal(p.question?.source_refs,undefined);
    assert(!JSON.stringify(p).includes(before[1].question_id));
    const ack=await h.rpc(a.player,'submit_live_quiz_answer',[sid,before[0].question_id,before[0].correct_option_id]);
    assert.deepEqual((await state(a.player,r.id)).my_answer,ack);
    await h.rpc(a.host,'start_competition_round',[r.id,1]);
    assert.deepEqual((await h.query('select question_id,ordinal,correct_option_id from el_zhady_private.live_quiz_snapshot where session_id=$1 order by ordinal',[sid])).rows,before);
    for(const uid of [a.player,a.guest,a.host])await assert.rejects(()=>h.asUser(uid,q=>q('select * from el_zhady_private.live_quiz_questions')),/permission denied/);
   }
   assert(new Set(selections).size>1,'fresh sessions must not always replay the same draw/order');
  });
  await t.test('raw score endpoints/subscriptions do not disclose standings; final reveal is host-only, persisted and idempotent',async()=>{
   const {room:r}=await room([a.player,a.guest,a.player2,a.player3]);const {sid,start}=await round(r.id,1);
   const qs=(await h.query<{question_id:string;correct_option_id:string}>('select question_id,correct_option_id from el_zhady_private.live_quiz_snapshot where session_id=$1 order by ordinal',[sid])).rows;
   await h.setTime(start+17999);await h.rpc(a.player,'submit_live_quiz_answer',[sid,qs[0].question_id,qs[0].correct_option_id]);
   await h.setTime(start+23000);await h.rpc(a.guest,'submit_live_quiz_answer',[sid,qs[1].question_id,qs[1].correct_option_id]);
   await h.setTime(start+37999);await h.rpc(a.player,'submit_live_quiz_answer',[sid,qs[1].question_id,qs[1].correct_option_id]);
   await finish(start);const host=await state(a.host,r.id);assert.equal(host.competition?.status,'awaiting_reveal');assert.equal(host.final_standings?.length,4);
   assert.deepEqual(host.final_standings?.map(r=>[r.correct_count,r.speed_points,r.rank]),[[2,0,1],[1,100,2],[0,0,3],[0,0,3]]);
   await h.query('create policy fixture_permissive_result_read on public.live_quiz_results for select to authenticated using(true)');
   await h.query('create policy fixture_permissive_legacy_read on public.competition_results for select to authenticated using(true)');
   for(const uid of [a.player,a.guest]){
    const hidden=await state(uid,r.id);assert.deepEqual(hidden.final_standings,[]);assert.deepEqual(hidden.leaderboard,[]);assert.deepEqual(hidden.podium,[]);assert.equal(hidden.own_result,null);
    assert.deepEqual((await h.rpc<{results:unknown[]}>(uid,'get_lobby',[r.id])).results,[]);
    for(const table of ['live_quiz_results','competition_results'])assert.equal((await h.asUser(uid,q=>q(`select * from public.${table}`))).rows.length,0);
    await assert.rejects(()=>h.rpc(uid,'reveal_competition_results',[r.id]),/ADMIN_REQUIRED/);
    await assert.rejects(()=>h.rpc(uid,'admin_competition_round_review',[r.id,1]),/ADMIN_REQUIRED/);
   }
   await h.query('drop policy fixture_permissive_result_read on public.live_quiz_results');await h.query('drop policy fixture_permissive_legacy_read on public.competition_results');
   assert.deepEqual(await history(a.player,r.code),[]);
   assert.equal((await h.query("select * from pg_publication_tables where pubname='supabase_realtime' and tablename in('live_quiz_results','competition_results')")).rows.length,0);
   const reveals=await Promise.all(Array.from({length:6},()=>h.rpc<{revealed_at:string}>(a.host,'reveal_competition_results',[r.id])));assert(reveals.every(r=>r.revealed_at===reveals[0].revealed_at));
   const final=await state(a.player,r.id);assert.equal(final.competition?.status,'revealed');assert.equal(final.podium?.length,4);assert.equal(final.podium?.filter(p=>p.rank===3).length,2);
   assert.deepEqual(final.final_standings,[]);assert.deepEqual(final.leaderboard,[]);assert.equal(final.own_result?.correct_count,2);
   assert.equal((await h.rpc<unknown[]>(a.player,'my_competition_history')).length,1);
   assert.equal((await h.asUser(a.guest,q=>q('select * from public.live_quiz_results'))).rows.length,0);
   await h.query('update auth.users set is_anonymous=false where id=$1',[a.guest]);assert.deepEqual(await h.rpc(a.guest,'my_competition_history'),[]);await h.query('update auth.users set is_anonymous=true where id=$1',[a.guest]);
   await h.setTime(clock+100000);assert.equal((await state(a.guest,r.id)).competition?.revealed_at,final.competition?.revealed_at);
  });
  await t.test('two-round totals combine matching quiz scales only; intermediate standings stay private',async()=>{
   const {room:r}=await room(undefined,2);
   for(let n=1;n<=2;n++){
    const {sid,start}=await round(r.id,n);const q=(await h.query<{question_id:string;correct_option_id:string}>('select question_id,correct_option_id from el_zhady_private.live_quiz_snapshot where session_id=$1 order by ordinal limit 1',[sid])).rows[0];
    await h.setTime(start+3000);await h.rpc(a.player,'submit_live_quiz_answer',[sid,q.question_id,q.correct_option_id]);await finish(start);
    assert.deepEqual((await state(a.guest,r.id)).leaderboard,[]);assert.deepEqual(await history(a.player,r.code),[]);
   }
   await h.rpc(a.host,'reveal_competition_results',[r.id]);const final=await state(a.player,r.id);
   assert.equal(final.own_result?.raw_points,2200);assert.equal(final.own_result?.correct_count,2);
   const saved=await history(a.player,r.code);assert.equal(saved.length,1);assert.equal(saved[0].score,2200);assert.equal(saved[0].max_score,22000);
  });
  await t.test('close is final for active clients and refreshed reads; delete requires closure and preserves history/practice/Auth',async()=>{
   const {room:r,members}=await room();const {start}=await round(r.id,1);await finish(start);await h.rpc(a.host,'reveal_competition_results',[r.id]);
   await h.query("insert into public.practice_results(user_id,activity_id,score,content_version) values($1,'quiz',12,'test-only') on conflict(user_id,activity_id) do update set score=12",[a.player]);
   await h.query('insert into public.competition_results(participant_id,room_id,display_name_snapshot,display_suffix,score) select id,room_id,display_name,display_suffix,50 from public.room_participants where id=$1',[members[0].participant_id]);
   const before=await h.rpc(a.player,'my_competition_history');
   await assert.rejects(()=>h.rpc(a.host,'admin_delete_room',[r.id]),/CLOSE_BEFORE_DELETE/);
   await h.rpc(a.host,'admin_room_action',[r.id,'close',null]);
   for(const uid of [a.player,a.guest]){await assert.rejects(()=>state(uid,r.id),/ROOM_CLOSED/);await assert.rejects(()=>h.rpc(uid,'get_lobby',[r.id]),/ROOM_CLOSED/);assert.equal((await join(uid,r.code)).error,'ROOM_CLOSED');}
   await assert.rejects(()=>h.rpc(a.host,'admin_room_action',[r.id,'unlock',null]),/ROOM_CLOSED/);
   await assert.rejects(()=>h.rpc(a.player,'admin_delete_room',[r.id]),/ADMIN_REQUIRED/);
   await Promise.all([h.rpc(a.host,'admin_delete_room',[r.id]),h.rpc(a.host,'admin_delete_room',[r.id])]);
   assert.equal((await h.query('select * from public.rooms where id=$1',[r.id])).rows.length,0);
   for(const table of ['live_quiz_sessions','live_quiz_results','room_participants','competition_results'])assert.equal((await h.query(`select * from public.${table} where room_id=$1`,[r.id])).rows.length,0);
   assert.deepEqual(await h.rpc(a.player,'my_competition_history'),before);
   assert.equal((await h.asUser(a.player,q=>q('select score from public.practice_results'))).rows[0].score,12);
   assert.equal((await h.query('select * from auth.users where id=$1',[a.player])).rows.length,1);
   assert.equal((await h.query('select * from el_zhady_private.saved_competition_history where source_kind=$1 and registered_user_id is null and identity_kind=$2',['competition','guest'])).rows.length>0,true);
   await assert.rejects(()=>state(a.guest,r.id),/ROOM_DELETED/);assert.equal((await join(a.outsider,r.code)).error,'ROOM_NOT_FOUND');
  });
  await t.test('closing a running room cancels further answers, keeps prior completed-round history and prevents reconnect',async()=>{
   const {room:r}=await room(undefined,2);const first=await round(r.id,1);await finish(first.start);const next=await round(r.id,2);
   await h.rpc(a.host,'admin_room_action',[r.id,'close',null]);
   assert.equal((await h.query<{status:string}>('select status from public.live_quiz_sessions where id=$1',[next.sid])).rows[0].status,'cancelled');
   await assert.rejects(()=>state(a.guest,r.id),/ROOM_CLOSED/);
   const prior=await history(a.player,r.code);assert.equal(prior.length,1);
   await h.rpc(a.host,'admin_delete_room',[r.id]);assert.deepEqual(await history(a.player,r.code),prior);
  });
  await t.test('removal after roster freeze cannot rejoin, removed answers denied across rounds, and deletion retries do not recreate rooms',async()=>{
   const {room:r,members}=await room();const started=await round(r.id,1);
   await h.rpc(a.host,'admin_room_action',[r.id,'remove',members[0].participant_id]);assert.equal((await join(a.player,r.code)).error,'ROOM_LOCKED');
   const q=(await h.query<{question_id:string;correct_option_id:string}>('select question_id,correct_option_id from el_zhady_private.live_quiz_snapshot where session_id=$1 limit 1',[started.sid])).rows[0];
   await assert.rejects(()=>h.rpc(a.player,'submit_live_quiz_answer',[started.sid,q.question_id,q.correct_option_id]),/ROOM_ACCESS_DENIED/);
   const request=randomUUID();const created=await h.rpc<{id:string}>(a.host,'admin_create_room',[request,'Жойылатын бөлме']);await h.rpc(a.host,'admin_room_action',[created.id,'close',null]);await h.rpc(a.host,'admin_delete_room',[created.id]);
   await assert.rejects(()=>h.rpc(a.host,'admin_create_room',[request,'Жойылатын бөлме']),/ROOM_DELETED/);
  });
  t.diagnostic(h.realPostgres?'Independent PostgreSQL connections used for races':'PGlite serial fallback; CI separately uses real PostgreSQL');
 }finally{await h.close();}
});

test('Upgrade existing completed Stage 3 data without rewriting results or reapplying old migrations',async()=>{
 const h=await liveHarness();
 try{
  const r=await h.createRoom();const who=await h.rpc<{participant_id:string}>(a.player,'join_room',[r.code,'Тұрақты есім']);
  await h.rpc(a.guest,'join_room',[r.code,'Қонақ']);await h.rpc(a.host,'configure_live_quiz',[r.id,'kz-1939-1953-v1']);
  const start=await h.rpc<{session_id:string}>(a.host,'start_live_quiz',[r.id]);await h.setTime(epoch+3000);
  const q=(await h.query<{question_id:string;correct_option_id:string}>('select question_id,correct_option_id from el_zhady_private.live_quiz_snapshot where session_id=$1 order by ordinal limit 1',[start.session_id])).rows[0];
  await h.rpc(a.player,'submit_live_quiz_answer',[start.session_id,q.question_id,q.correct_option_id]);await h.setTime(epoch+203000);await h.rpc(a.player,'live_quiz_state',[r.id]);await h.rpc(a.host,'admin_room_action',[r.id,'close',null]);
  const waiting=await h.createRoom();await h.rpc(a.guest,'join_room',[waiting.code,'Ескі тыйым']);const member=(await h.query<{participant_id:string}>('select participant_id from el_zhady_private.memberships where room_id=$1',[waiting.id])).rows[0];await h.rpc(a.host,'admin_room_action',[waiting.id,'remove',member.participant_id]);
  const {readFile}=await import('node:fs/promises');
  await h.exec(await readFile(new URL('../migrations/20261103000100_competition_lifecycle.sql',import.meta.url),'utf8'));
  await h.exec(await readFile(new URL('../migrations/20261103000200_question_bank_v2.sql',import.meta.url),'utf8'));
  const migrated=await h.rpc<LiveState>(a.host,'live_quiz_state',[r.id]);assert.equal(migrated.competition?.status,'revealed');assert.equal(migrated.podium?.find(p=>p.participant_id===who.participant_id)?.raw_points,1100);
  assert.equal((await h.rpc<{error:string}>(a.guest,'join_room',[waiting.code,'Ескі тыйым'])).error,'ROOM_BLOCKED');
  const before=await h.rpc(a.player,'my_competition_history');await h.rpc(a.host,'admin_delete_room',[r.id]);assert.deepEqual(await h.rpc(a.player,'my_competition_history'),before);
 }finally{await h.close();}
});
