import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actors as a, liveHarness, testEpoch as epoch } from './live-harness';
import type { LiveState, Review } from '../../src/live/types';
const qid = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const option = (n: number, i = 0) => `q${String(n).padStart(2,'0')}_${i}`;
const version = 'kz-1939-1953-v1';
test('Live quiz — authoritative PostgreSQL flow, isolation and recovery', async t => {
  const h = await liveHarness();
  t.diagnostic(h.realPostgres ? 'PostgreSQL 17: independent transaction connections, including concurrent races' : 'PGlite: serialized single connection; real races require LIVE_QUIZ_TEST_DATABASE_URL');
  const join = (uid: string, code: string) => h.rpc<{participant_id:string;error?:string}>(uid,'join_room',[code,'Бірдей есім']);
  const state = (uid: string, room: string) => h.rpc<LiveState>(uid,'live_quiz_state',[room]);
  const submit = (uid: string, sid: string, n: number, i = 0) => h.rpc<{accepted:true;option_id:string;received_at:string}>(uid,'submit_live_quiz_answer',[sid,qid(n),option(n,i)]);
  async function configured(users: string[]) {
    await h.setTime(epoch);
    const room = await h.createRoom();
    const members=[]; for(const uid of users) members.push(await join(uid,room.code));
    await h.rpc(a.host,'configure_live_quiz',[room.id,version]);
    return {room,members};
  }
  try {
    await t.test('new tables have RLS; private material cannot be read even by an admin browser', async () => {
      const rows=(await h.query<{relrowsecurity:boolean}>("select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','el_zhady_private') and c.relname like 'live_quiz_%' and c.relkind='r'")).rows;
      assert.equal(rows.length,7); assert(rows.every(r=>r.relrowsecurity));
      for(const uid of [a.player,a.guest,a.host]) for(const table of ['live_quiz_sets','live_quiz_questions','live_quiz_snapshot','live_quiz_roster','live_quiz_answers']) await assert.rejects(()=>h.asUser(uid,q=>q(`select * from el_zhady_private.${table}`)),/permission denied/);
      await assert.rejects(()=>h.asUser(a.player,q=>q('select el_zhady_private.tick_live_quizzes()')),/permission denied/);
      assert.deepEqual((await h.asUser(a.outsider,q=>q('select * from public.live_quiz_sessions'))).rows,[]);
      await h.query("update auth.users set raw_user_meta_data='{" + '"admin":true' + "}'::jsonb where id=$1",[a.player]);
      assert.equal((await h.rpc<{admin:boolean}>(a.player,'my_access')).admin,false);
      await assert.rejects(()=>h.asUser(a.player,q=>q('insert into el_zhady_private.admins values($1)',[a.player])),/permission denied/);
    });
    await t.test('production scheduler detection fails closed; exact active same-database job required',async()=>{
      await h.query(h.schedulerDefinition);
      assert.equal((await h.query<{ready:boolean}>('select el_zhady_private.live_quiz_scheduler_ready() ready')).rows[0].ready,false);
      // Catalog-shape fixture checks the predicate; this does not run pg_cron.
      await h.query('create schema cron');await h.query('create table cron.job(jobname text,active boolean,database text,command text)');
      await h.query("insert into cron.job values('el-zhady-live-quiz-v1',true,current_database(),'wrong command')");
      assert.equal((await h.query<{ready:boolean}>('select el_zhady_private.live_quiz_scheduler_ready() ready')).rows[0].ready,false);
      await h.query("update cron.job set command='select el_zhady_private.tick_live_quizzes();'");
      assert.equal((await h.query<{ready:boolean}>('select el_zhady_private.live_quiz_scheduler_ready() ready')).rows[0].ready,true);
      await h.query('update cron.job set active=false');
      assert.equal((await h.query<{ready:boolean}>('select el_zhady_private.live_quiz_scheduler_ready() ready')).rows[0].ready,false);
      await h.query('drop table cron.job');await h.query('drop schema cron');
      await h.query("create or replace function el_zhady_private.live_quiz_scheduler_ready() returns boolean language sql stable security definer set search_path='' as $$ select true $$");
    });
    let room: {id:string;code:string}; let sid: string; let playerId:string; let guestId:string;
    await t.test('configured start requires a scheduler and another participant; host is excluded; simultaneous starts freeze once',async()=>{
      const setup=await configured([a.host,a.player,a.guest]); room=setup.room; playerId=setup.members[1].participant_id;guestId=setup.members[2].participant_id;
      await assert.rejects(()=>h.rpc(a.guest,'start_live_quiz',[room.id]),/ADMIN_REQUIRED/);
      await assert.rejects(()=>h.rpc(a.player,'configure_live_quiz',[room.id,version]),/ADMIN_REQUIRED/);
      await h.query("create or replace function el_zhady_private.live_quiz_scheduler_ready() returns boolean language sql stable security definer set search_path='' as $$ select false $$");
      await assert.rejects(()=>h.rpc(a.host,'start_live_quiz',[room.id]),/QUIZ_SCHEDULER_REQUIRED/);
      await h.query("create or replace function el_zhady_private.live_quiz_scheduler_ready() returns boolean language sql stable security definer set search_path='' as $$ select true $$");
      const starts=await Promise.all(Array.from({length:6},()=>h.rpc<{session_id:string;starts_at:string}>(a.host,'start_live_quiz',[room.id])));
      sid=starts[0].session_id; assert(starts.every(s=>s.session_id===sid&&s.starts_at===starts[0].starts_at));
      const initial=await state(a.player,room.id);assert.equal(initial.phase,'countdown');assert.equal(initial.session?.roster_count,2);assert.equal(initial.question,null);
      assert.equal((await state(a.host,room.id)).my_participant_id,null);
      assert.equal((await join(a.outsider,room.code)).error,'ROOM_LOCKED');
      assert.equal((await join(a.guest,room.code)).participant_id,guestId);
      await assert.rejects(()=>h.rpc(a.host,'configure_live_quiz',[room.id,version]),/QUIZ_ALREADY_STARTED/);
      await assert.rejects(()=>h.rpc(a.host,'admin_room_action',[room.id,'unlock',null]),/QUIZ_RUNNING/);
      await assert.rejects(()=>h.rpc(a.host,'admin_room_action',[room.id,'close',null]),/QUIZ_RUNNING/);
      await assert.rejects(()=>submit(a.player,sid,1),/ANSWER_WINDOW_CLOSED/);
      // Editing the authoring set cannot change the frozen question snapshot.
      await h.query("update el_zhady_private.live_quiz_questions set prompt=prompt||' AUTHOR EDIT' where id=$1",[qid(1)]);
      await h.setTime(epoch+3000);
      assert(!((await state(a.player,room.id)).question?.prompt.includes('AUTHOR EDIT')));
      await h.query("update el_zhady_private.live_quiz_questions set prompt=replace(prompt,' AUTHOR EDIT','') where id=$1",[qid(1)]);
    });
    await t.test('current payload only, stable per-person shuffled options, no early keys, submissions or scores',async()=>{
      const p=await state(a.player,room.id);const g=await state(a.guest,room.id);
      assert.equal(p.phase,'question');assert.equal(p.question?.ordinal,1);assert.equal(p.question?.options.length,4);
      assert.equal(p.question?.correct_option_id,undefined);assert.equal(p.question?.explanation,undefined);assert.equal(p.question?.source_refs,undefined);
      assert(!JSON.stringify(p).includes(qid(2)));assert(!JSON.stringify(p).includes(a.player));assert(!JSON.stringify(p).includes('email'));
      assert.deepEqual((await state(a.player,room.id)).question?.options,p.question?.options);
      const shuffled=(await h.query<{pid:string;ids:string[]}>('select r.participant_id pid,array_agg(x->>\'id\' order by md5(r.participant_id::text||q.question_id::text||(x->>\'id\'))) ids from el_zhady_private.live_quiz_roster r join el_zhady_private.live_quiz_snapshot q on q.session_id=r.session_id cross join jsonb_array_elements(q.options) x where r.session_id=$1 and q.ordinal=1 group by r.participant_id',[sid])).rows;
      assert.deepEqual(p.question?.options.map(o=>o.id),shuffled.find(r=>r.pid===playerId)?.ids);
      assert.deepEqual(g.question?.options.map(o=>o.id),shuffled.find(r=>r.pid===guestId)?.ids);
      await assert.rejects(()=>state(a.outsider,room.id),/ROOM_ACCESS_DENIED/);
      await assert.rejects(()=>h.rpc(a.player,'admin_live_quiz_review',[room.id]),/ADMIN_REQUIRED/);
      assert.deepEqual(await h.rpc(a.host,'admin_live_quiz_review',[room.id]),[]);
      await assert.rejects(()=>submit(a.player,sid,2),/ANSWER_WINDOW_CLOSED/);
      await assert.rejects(()=>h.rpc(a.player,'submit_live_quiz_answer',[sid,qid(1),'bogus']),/INVALID_OPTION/);
      await assert.rejects(()=>h.rpc(a.player,'submit_live_quiz_answer',[sid,a.outsider,option(1)]),/INVALID_QUESTION/);
      await assert.rejects(()=>submit(a.host,sid,1),/NOT_IN_ROSTER/);
    });
    await t.test('full ten-question host + registered + guest run; immediate save, duplicate acknowledgements, late rejection and refresh',async()=>{
      for(let n=1;n<=10;n++) {
        const opens=epoch+3000+(n-1)*20000;
        await h.setTime(opens+1500);
        const ack=await submit(a.player,sid,n); assert.deepEqual(Object.keys(ack).sort(),['accepted','option_id','received_at']);
        // Concurrent conflicting retries never overwrite the first option.
        const retries=await Promise.all(Array.from({length:4},()=>submit(a.player,sid,n,1)));assert(retries.every(r=>JSON.stringify(r)===JSON.stringify(ack)));
        const restored=await state(a.player,room.id);assert.equal(restored.my_participant_id,playerId);assert.deepEqual(restored.my_answer,ack);
        assert.equal(restored.leaderboard?.find(r=>r.participant_id===playerId)?.correct_count,n-1);
        await h.setTime(opens+7500);await submit(a.guest,sid,n,n===1?1:0);
        const hidden=await state(a.host,room.id);assert.equal(hidden.question?.correct_option_id,undefined);assert.equal(hidden.my_answer,null);
        assert.equal(hidden.leaderboard?.find(r=>r.participant_id===playerId)?.correct_count,n-1);
        await h.setTime(opens+15000);
        const reveal=await state(a.guest,room.id);assert.equal(reveal.phase,'reveal');assert.equal(reveal.question?.correct_option_id,option(n));assert(reveal.question?.source_refs?.length);assert(reveal.question?.explanation);
        assert.equal(reveal.my_answer?.raw_points,n===1?0:1050);
        const review=await h.rpc<Review[]>(a.host,'admin_live_quiz_review',[room.id]);assert.equal(review.length,n);assert.equal(review[n-1].answers.length,2);
        assert.deepEqual(await submit(a.player,sid,n,2),ack); // accepted retry after deadline
        if(n<10) await assert.rejects(()=>submit(a.player,sid,n+1),/ANSWER_WINDOW_CLOSED/);
      }
      assert.equal((await h.query('select * from el_zhady_private.live_quiz_answers where session_id=$1',[sid])).rows.length,20);
      for(const sql of ['update public.live_quiz_results set correct_count=10','update public.live_quiz_sessions set phase_step=21','update el_zhady_private.live_quiz_answers set raw_points=1100']) await assert.rejects(()=>h.asUser(a.player,q=>q(sql)),/permission denied/);
      await assert.rejects(()=>h.rpc(a.player,'submit_live_quiz_answer',[sid,qid(10),option(10),999999]),/does not exist/);
    });
    await t.test('clock ticks without a host; simultaneous finalization is idempotent, snapshots/history saved and practice untouched',async()=>{
      await h.setTime(epoch+203000);
      await Promise.all([h.query('select el_zhady_private.tick_live_quizzes()'),...Array.from({length:8},(_,i)=>state(i%2?a.player:a.host,room.id))]);
      const final=await state(a.host,room.id);assert.equal(final.phase,'finished');assert.equal(final.session?.phase_step,21);
      assert.equal(final.leaderboard?.length,2);
      assert.deepEqual(final.leaderboard?.map(r=>[r.correct_count,r.speed_points,r.raw_points,r.rank]),[[10,900,10900,1],[9,450,9450,2]]);
      const before=await h.query('select * from public.live_quiz_results where session_id=$1 order by participant_id',[sid]);
      await h.setTime(epoch+300000);await h.query('select el_zhady_private.tick_live_quizzes()');await h.rpc(a.host,'start_live_quiz',[room.id]);
      assert.deepEqual((await h.query('select * from public.live_quiz_results where session_id=$1 order by participant_id',[sid])).rows,before.rows);
      const history=await h.rpc<{score:number;scoring_kind:string;correct_count:number}[]>(a.player,'my_competition_history');assert.equal(history.length,1);assert.equal(history[0].score,10900);assert.equal(history[0].scoring_kind,'live_quiz_raw');
      assert.deepEqual((await h.asUser(a.player,q=>q('select * from public.practice_results'))).rows,[]);
      await assert.rejects(()=>h.rpc(a.guest,'my_competition_history'),/REGISTERED_REQUIRED/);
      await h.query('update auth.users set is_anonymous=false where id=$1',[a.guest]);assert.deepEqual(await h.rpc(a.guest,'my_competition_history'),[]);await h.query('update auth.users set is_anonymous=true where id=$1',[a.guest]);
      assert.deepEqual((await h.asUser(a.outsider,q=>q('select * from public.live_quiz_results'))).rows,[]);
      await h.rpc(a.host,'admin_room_action',[room.id,'remove',guestId]);
      await assert.rejects(()=>state(a.guest,room.id),/ROOM_ACCESS_DENIED/);
      assert.deepEqual((await state(a.host,room.id)).leaderboard,final.leaderboard); // final ranking immutable
    });
    await t.test('deadline equality rejects unanswered submission; removed member loses reads/submits and remains unranked',async()=>{
      const {room,members}=await configured([a.player2,a.guest]);const start=await h.rpc<{session_id:string}>(a.host,'start_live_quiz',[room.id]);
      await h.setTime(epoch+3000);await submit(a.guest,start.session_id,1);
      await h.setTime(epoch+18000);await assert.rejects(()=>submit(a.player2,start.session_id,1),/ANSWER_WINDOW_CLOSED/);
      await h.rpc(a.host,'admin_room_action',[room.id,'remove',members[1].participant_id]);
      await assert.rejects(()=>submit(a.guest,start.session_id,1),/ROOM_ACCESS_DENIED/);await assert.rejects(()=>state(a.guest,room.id),/ROOM_ACCESS_DENIED/);
      assert.deepEqual((await h.asUser(a.guest,q=>q('select * from public.live_quiz_sessions where room_id=$1',[room.id]))).rows,[]);
      await h.setTime(epoch+203000);await h.query('select el_zhady_private.tick_live_quizzes()');
      const final=await state(a.host,room.id);const removed=final.leaderboard?.find(r=>r.participant_id===members[1].participant_id);assert.equal(removed?.raw_points,1100);assert.equal(removed?.eligible,false);assert.equal(removed?.rank,null);
      assert.equal(final.leaderboard?.find(r=>r.eligible)?.rank,1);
    });
    await t.test('correct count precedes speed, zero/unanswered scores, exact ties share third and cancelled sessions have no final ranks',async()=>{
      const {room}=await configured([a.player,a.guest,a.player2,a.player3]);const {session_id}=await h.rpc<{session_id:string}>(a.host,'start_live_quiz',[room.id]);
      await h.setTime(epoch+3000);await submit(a.guest,session_id,1); // 1 correct +100 speed
      await h.setTime(epoch+17999);await submit(a.player,session_id,1); // 0 speed
      await h.setTime(epoch+37999);await submit(a.player,session_id,2); // 2 correct +0 speed wins
      await h.setTime(epoch+203000);const final=await state(a.host,room.id);
      assert.deepEqual(final.leaderboard?.map(r=>[r.correct_count,r.speed_points,r.rank]),[[2,0,1],[1,100,2],[0,0,3],[0,0,3]]);
      assert.equal(final.leaderboard?.filter(r=>r.rank===3).length,2);
      const cancel=await configured([a.player,a.guest]);const started=await h.rpc<{session_id:string}>(a.host,'start_live_quiz',[cancel.room.id]);
      await h.setTime(epoch+3000);await submit(a.player,started.session_id,1);
      await assert.rejects(()=>h.rpc(a.guest,'cancel_live_quiz',[cancel.room.id]),/ADMIN_REQUIRED/);
      await Promise.all(Array.from({length:3},()=>h.rpc(a.host,'cancel_live_quiz',[cancel.room.id])));
      await h.setTime(epoch+300000);const cancelled=await state(a.host,cancel.room.id);assert.equal(cancelled.phase,'cancelled');assert(cancelled.leaderboard?.every(r=>r.rank===null));
      assert.equal((await h.query('select * from public.live_quiz_results where session_id=$1',[started.session_id])).rows.length,0);
      assert.equal((await h.query('select * from el_zhady_private.live_quiz_answers where session_id=$1',[started.session_id])).rows.length,1);
      assert.deepEqual(await h.rpc(a.host,'admin_live_quiz_review',[cancel.room.id]),[]); // q1 had not been revealed
      await assert.rejects(()=>h.rpc(a.host,'start_live_quiz',[cancel.room.id]),/QUIZ_CANCELLED/);
    });
    await t.test('simultaneous first submissions choose exactly one original answer; legacy history remains readable',async()=>{
      const {room,members}=await configured([a.player,a.guest]);const {session_id}=await h.rpc<{session_id:string}>(a.host,'start_live_quiz',[room.id]);await h.setTime(epoch+3000);
      const replies=await Promise.all(Array.from({length:8},(_,i)=>submit(a.player,session_id,1,i%2)));
      assert(replies.every(r=>r.option_id===replies[0].option_id&&r.received_at===replies[0].received_at));
      assert.equal((await h.query('select * from el_zhady_private.live_quiz_answers where session_id=$1',[session_id])).rows.length,1);
      await h.query("insert into public.competition_results(participant_id,room_id,display_name_snapshot,display_suffix,score) select id,room_id,display_name,display_suffix,50 from public.room_participants where id=$1",[members[0].participant_id]);
      const history=await h.rpc<{scoring_kind:string;score:number}[]>(a.player,'my_competition_history');assert(history.some(r=>r.scoring_kind==='legacy_100'&&r.score===50));
    });
    await t.test('permission is rechecked after a read waits behind concurrent removal',{skip:!h.realPostgres},async()=>{
      const {room,members}=await configured([a.player2,a.guest]);const {session_id}=await h.rpc<{session_id:string}>(a.host,'start_live_quiz',[room.id]);await h.setTime(epoch+3000);
      let pending:Promise<LiveState>|null=null;
      await h.asOwner!(async q=>{
        await q('select id from public.live_quiz_sessions where id=$1 for update',[session_id]);
        pending=state(a.guest,room.id);void pending.catch(()=>{});
        let waiting=false;
        for(let i=0;i<100;i++) {
          waiting=!!(await h.query("select 1 from pg_stat_activity where datname=current_database() and wait_event_type='Lock' and query like 'select public.live_quiz_state%'")).rows.length;
          if(waiting)break;await new Promise(resolve=>setTimeout(resolve,10));
        }
        assert(waiting,'member read must be blocked on the session lock before revocation');
        await q('update el_zhady_private.memberships set removed=true where participant_id=$1',[members[1].participant_id]);
        await q("update public.room_participants set status='removed' where id=$1",[members[1].participant_id]);
      });
      await assert.rejects(()=>pending!,/ROOM_ACCESS_DENIED/);
    });
    await t.test('empty roster cannot start and retries leave no partial frozen state',async()=>{
      const {room}=await configured([a.host]);await assert.rejects(()=>h.rpc(a.host,'start_live_quiz',[room.id]),/NO_PARTICIPANTS/);
      const waiting=await state(a.host,room.id);assert.equal(waiting.session?.status,'ready');
      assert.equal((await h.query('select * from el_zhady_private.live_quiz_snapshot where session_id=$1',[waiting.session?.id])).rows.length,0);
    });
  } finally { await h.close(); }
});
