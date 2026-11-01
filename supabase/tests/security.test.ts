import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('Stage 2 migration — PostgreSQL RLS, RPCs and identity isolation', async t => {
  const db = new PGlite();
  try {
    await db.exec(await readFile(new URL('./bootstrap.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../migrations/20261101000100_stage2_foundation.sql', import.meta.url), 'utf8'));
    const ids = { admin: '00000000-0000-4000-8000-000000000001', student: '00000000-0000-4000-8000-000000000002', guest: '00000000-0000-4000-8000-000000000003', other: '00000000-0000-4000-8000-000000000004', guest2: '00000000-0000-4000-8000-000000000005', guest3: '00000000-0000-4000-8000-000000000006', limited: '00000000-0000-4000-8000-000000000007' };
    for (const [kind, id] of Object.entries(ids)) await db.query('insert into auth.users(id,is_anonymous) values($1,$2)', [id, ['guest','guest2','guest3','limited'].includes(kind)]);
    await db.query('insert into el_zhady_private.admins(user_id) values($1)', [ids.admin]);
    async function user<T>(id: string, action: () => Promise<T>): Promise<T> {
      await db.exec('set role authenticated'); await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      try { return await action(); } finally { await db.exec('reset role'); }
    }
    async function value<T = Record<string, unknown>>(sql: string, args: unknown[] = []): Promise<T> { return (await db.query<{ value: T }>(sql, args)).rows[0].value; }
    let room: { id: string; code: string }; let registered: { participant_id: string; room_id: string }; let guest: typeof registered; let guest2: typeof registered;
    await t.test('RLS enabled on every app table; unauthenticated callers cannot invoke privileged RPCs', async () => {
      const rows = (await db.query<{ relrowsecurity: boolean }>("select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','el_zhady_private') and c.relkind='r'")).rows;
      assert.equal(rows.length, 10); assert(rows.every(row => row.relrowsecurity));
      await db.exec('set role anon');
      try { await assert.rejects(() => db.query("select public.join_room('ABCDEF12','Қонақ')"), /permission denied/); } finally { await db.exec('reset role'); }
    });
    await t.test('first profile creation and subsequent reuse are idempotent and private', async () => {
      await user(ids.student, async () => {
        assert.equal((await db.query('select * from public.profiles')).rows.length, 0);
        const first = await value<{user_id:string;created_at:string}>("select public.save_profile('Айдана') as value");
        const second = await value<typeof first>("select public.save_profile('Айдана Ж') as value");
        assert.equal(first.user_id, second.user_id); assert.equal(first.created_at, second.created_at);
        assert.equal((await db.query('select * from public.profiles')).rows.length, 1);
      });
      await user(ids.other, async () => assert.equal((await db.query('select * from public.profiles')).rows.length, 0));
    });
    await t.test('metadata cannot assign admin; direct privilege writes and non-admin room controls fail', async () => {
      await db.query('update auth.users set raw_user_meta_data=$1 where id=$2', [{admin:true, role:'admin'},ids.student]);
      await user(ids.student, async () => {
        const access = await value<{admin:boolean}>('select public.my_access() as value'); assert.equal(access.admin,false);
        await assert.rejects(() => db.query('insert into el_zhady_private.admins(user_id) values($1)', [ids.student]), /permission denied/);
        await assert.rejects(() => db.query("select public.admin_create_room(gen_random_uuid(),'Бөлме')"), /ADMIN_REQUIRED/);
      });
      await db.query('insert into el_zhady_private.admins(user_id) values($1)', [ids.guest]);
      await user(ids.guest, async () => assert.equal((await value<{admin:boolean}>('select public.my_access() as value')).admin,false));
    });
    await t.test('anonymous identities do not get profile, practice or admin privileges', async () => {
      await user(ids.guest, async () => {
        await assert.rejects(() => db.query("select public.save_profile('Қонақ')"), /REGISTERED_REQUIRED/);
        assert.equal((await db.query('select * from public.profiles')).rows.length,0);
        await assert.rejects(() => db.query("insert into public.practice_results(user_id,activity_id,score,content_version) values($1,'quiz',20,'v1')", [ids.guest]), /permission denied/);
        await assert.rejects(() => db.query('select public.my_competition_history()'), /REGISTERED_REQUIRED/);
      });
    });
    await t.test('admin room creation retry reuses the original room and title', async () => {
      await user(ids.admin, async () => {
        const request='10000000-0000-4000-8000-000000000001';
        room = await value('select public.admin_create_room($1,$2) as value',[request,'Тарих сайысы']);
        const again=await value<{id:string;title:string}>('select public.admin_create_room($1,$2) as value',[request,'Өзгерген атау']);
        assert.equal(room.id,again.id); assert.equal(again.title,'Тарих сайысы'); assert.match(room.code,/^[A-F0-9]{8}$/);
      });
    });
    await t.test('invalid room/name rejected; duplicate retries preserve participant identity and original name', async () => {
      await user(ids.student, async () => {
        assert.equal((await value("select public.join_room('wrong','Айдана') as value")).error,'INVALID_ROOM_CODE');
        assert.equal((await value("select public.join_room('FFFFFFFF','Айдана') as value")).error,'ROOM_NOT_FOUND');
        assert.equal((await value('select public.join_room($1,$2) as value',[room.code,'<script>'])).error,'INVALID_NAME');
        registered=await value('select public.join_room($1,$2) as value',[room.code,'Айдана']);
        assert.deepEqual(await value('select public.join_room($1,$2) as value',[room.code,'Басқа есім']),registered);
      });
      guest=await user(ids.guest,()=>value('select public.join_room($1,$2) as value',[room.code,'Айдана']));
      assert.deepEqual(await user(ids.guest,()=>value('select public.join_room($1,$2) as value',[room.code,'Айдана'])),guest);
      guest2=await user(ids.guest2,()=>value('select public.join_room($1,$2) as value',[room.code,'Айдана']));
      assert.notEqual(guest.participant_id,guest2.participant_id);
      const list=(await db.query<{display_suffix:number}>('select display_suffix from public.room_participants')).rows;
      assert.equal(list.length,3); assert.equal(new Set(list.map(p=>p.display_suffix)).size,3);
    });
    await t.test('outsiders cannot enumerate rooms, participants or results; lobby has no emails/auth IDs', async () => {
      await user(ids.other, async () => {
        for(const table of ['rooms','room_participants','competition_results']) assert.equal((await db.query(`select * from public.${table}`)).rows.length,0);
        await assert.rejects(()=>db.query('select public.get_lobby($1)',[room.id]),/ROOM_ACCESS_DENIED/);
        await assert.rejects(()=>db.query('select * from el_zhady_private.memberships'),/permission denied/);
      });
      await user(ids.guest,async()=>{
        const data=await value<{participants:Record<string,unknown>[];my_participant_id:string}>('select public.get_lobby($1) as value',[room.id]);
        assert.equal(data.participants.length,3); assert.equal(data.my_participant_id,guest.participant_id);
        assert(data.participants.every(p=>!('user_id' in p)&&!('email' in p)&&!('identity_kind' in p)));
        assert(!JSON.stringify(data).includes(ids.student));
      });
    });
    await t.test('locked/full rooms reject newcomers while membership survives refresh/reconnection', async () => {
      await user(ids.admin,()=>db.query("select public.admin_room_action($1,'lock')",[room.id]));
      assert.equal((await user(ids.guest3,()=>value('select public.join_room($1,$2) as value',[room.code,'Жаңа қонақ']))).error,'ROOM_LOCKED');
      assert.deepEqual(await user(ids.guest,()=>value('select public.join_room($1,$2) as value',[room.code,'Айдана'])),guest);
      const restored=await user(ids.guest,()=>value<{my_participant_id:string}>('select public.get_lobby($1) as value',[room.id])); assert.equal(restored.my_participant_id,guest.participant_id);
      await user(ids.admin,()=>db.query("select public.admin_room_action($1,'unlock')",[room.id]));
      await db.query('update public.rooms set capacity=3 where id=$1',[room.id]);
      assert.equal((await user(ids.guest3,()=>value('select public.join_room($1,$2) as value',[room.code,'Жаңа қонақ']))).error,'ROOM_FULL');
    });
    await t.test('only trusted scoring can write results; names do not link guest history to accounts', async () => {
      const records=[registered,guest,guest2];
      for(const m of records) await db.query("insert into public.competition_results(participant_id,room_id,display_name_snapshot,display_suffix,score) select id,room_id,display_name,display_suffix,80 from public.room_participants where id=$1",[m.participant_id]);
      await user(ids.student,async()=>{
        await assert.rejects(()=>db.query('update public.competition_results set score=100'),/permission denied/);
        await assert.rejects(()=>db.query("insert into public.practice_results values($1,'quiz',20,20,'v1',now())",[ids.student]),/permission denied/);
        await assert.rejects(()=>db.query('select * from el_zhady_private.answer_keys'),/permission denied/);
        const history=await value<{participant_id:string}[]>('select public.my_competition_history() as value');assert.equal(history.length,1);assert.equal(history[0].participant_id,registered.participant_id);
      });
      await db.query('update auth.users set is_anonymous=false where id=$1',[ids.guest2]);
      await user(ids.guest2,async()=>assert.deepEqual(await value('select public.my_competition_history() as value'),[]));
      assert.equal((await db.query('select * from public.competition_results')).rows.length,3);
    });
    await t.test('practice rows stay private; a trusted server can write but clients cannot mutate rooms or participants', async () => {
      await db.exec('set role service_role');
      try { await db.query("insert into public.practice_results(user_id,activity_id,score,content_version) values($1,'quiz',12,'test-only')", [ids.student]); }
      finally { await db.exec('reset role'); }
      await user(ids.student, async () => {
        assert.equal((await db.query('select * from public.practice_results')).rows.length, 1);
        await assert.rejects(() => db.query("update public.room_participants set display_name='Өзгерту'"), /permission denied/);
        await assert.rejects(() => db.query('update public.rooms set locked=false'), /permission denied/);
        await assert.rejects(() => db.query("update public.profiles set display_name='Өзгерту'"), /permission denied/);
      });
      for (const other of [ids.guest, ids.other, ids.admin]) await user(other, async () => assert.equal((await db.query('select * from public.practice_results')).rows.length, 0));
    });
    await t.test('admin removal revokes reads and rejoining; closing is idempotent and blocks entry', async () => {
      for(let i=0;i<2;i++) await user(ids.admin,()=>db.query("select public.admin_room_action($1,'remove',$2)",[room.id,guest.participant_id]));
      await user(ids.guest,async()=>{
        assert.equal((await db.query('select * from public.room_participants')).rows.length,0);
        await assert.rejects(()=>db.query('select public.get_lobby($1)',[room.id]),/ROOM_ACCESS_DENIED/);
        assert.equal((await value('select public.join_room($1,$2) as value',[room.code,'Айдана'])).error,'REMOVED');
      });
      assert.equal((await db.query('select * from public.competition_results')).rows.length,3);
      for(let i=0;i<2;i++) await user(ids.admin,()=>db.query("select public.admin_room_action($1,'close')",[room.id]));
      assert.equal((await user(ids.guest3,()=>value('select public.join_room($1,$2) as value',[room.code,'Жаңа қонақ']))).error,'ROOM_CLOSED');
    });
    await t.test('failed room probes consume the rate limit instead of rolling it back', async()=>{
      await user(ids.limited,async()=>{
        for(let i=0;i<10;i++) assert.equal((await value("select public.join_room('FFFFFFFF','Қонақ') as value")).error,'ROOM_NOT_FOUND');
        assert.equal((await value("select public.join_room('FFFFFFFF','Қонақ') as value")).error,'RATE_LIMITED');
      });
      await db.query("update el_zhady_private.join_limits set window_start=now()-interval '2 minutes' where user_id=$1",[ids.limited]);
      assert.equal((await user(ids.limited,()=>value("select public.join_room('FFFFFFFF','Қонақ') as value"))).error,'ROOM_NOT_FOUND');
    });
    await t.test('room creation quota does not break retry idempotency',async()=>{
      await user(ids.admin,async()=>{
        for(let i=2;i<=5;i++) await value('select public.admin_create_room($1,$2) as value',[`10000000-0000-4000-8000-${String(i).padStart(12,'0')}`,'Дайын бөлме']);
        await assert.rejects(()=>db.query("select public.admin_create_room(gen_random_uuid(),'Артық бөлме')"),/ROOM_CREATE_LIMIT/);
        const original=await value<{id:string}>('select public.admin_create_room($1,$2) as value',['10000000-0000-4000-8000-000000000001','Тарих сайысы']);assert.equal(original.id,room.id);
      });
    });
  } finally { await db.close(); }
});
