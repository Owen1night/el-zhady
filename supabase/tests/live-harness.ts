/** Isolated test databases only. This is never a browser/production backend. */
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
export type Query = <T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }>;
export const actors = {
  host: '40000000-0000-4000-8000-000000000001',
  player: '40000000-0000-4000-8000-000000000002',
  guest: '40000000-0000-4000-8000-000000000003',
  outsider: '40000000-0000-4000-8000-000000000004',
  player2: '40000000-0000-4000-8000-000000000005',
  player3: '40000000-0000-4000-8000-000000000006',
} as const;
export const testEpoch = Date.parse('2030-01-01T12:00:00.000Z');
export async function liveHarness(next = false, mixed = false) {
  const url = process.env.LIVE_QUIZ_TEST_DATABASE_URL;
  let query: Query; let exec: (sql: string) => Promise<unknown>; let asUser: <T>(uid: string, fn: (q: Query) => Promise<T>) => Promise<T>; let close: () => Promise<void>; let realPostgres = false;
  let asOwner: (<T>(fn: (q: Query) => Promise<T>) => Promise<T>) | null = null;
  if (url) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'postgresql:' || !['127.0.0.1','localhost'].includes(parsed.hostname) || parsed.port !== '55433' || parsed.pathname !== '/postgres') throw new Error('Use the isolated loopback test service at port 55433, never hosted Supabase');
    const admin = new Pool({ connectionString: url });
    const name = `el_zhady_live_test_${randomUUID().replaceAll('-', '')}`;
    for (const [role, extra] of [['anon',''],['authenticated',''],['service_role','bypassrls']]) await admin.query(`do $$ begin perform pg_advisory_xact_lock(58393044); if not exists(select 1 from pg_roles where rolname='${role}') then create role ${role} nologin ${extra}; end if; end $$;`);
    await admin.query(`create database ${name}`);
    parsed.pathname = `/${name}`;
    const pool = new Pool({ connectionString: parsed.href, max: 12 });
    query = (sql, params) => pool.query(sql, params);
    exec = sql => pool.query(sql);
    asUser = async (uid, fn) => {
      const client = await pool.connect();
      try { await client.query('begin'); await client.query('set local role authenticated'); await client.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]); const result=await fn((sql, params) => client.query(sql, params)); await client.query('commit'); return result; }
      catch(e) { await client.query('rollback'); throw e; } finally { client.release(); }
    };
    asOwner = async fn => {
      const client=await pool.connect();
      try { await client.query('begin'); const result=await fn((sql,params)=>client.query(sql,params));await client.query('commit');return result; }
      catch(e) {await client.query('rollback');throw e;}finally{client.release();}
    };
    close = async () => { await pool.end(); await admin.query(`drop database ${name}`); await admin.end(); };
    realPostgres = true;
  } else {
    const db = new PGlite(); let queue=Promise.resolve();
    query = (sql,params) => db.query(sql,params);
    exec = sql => db.exec(sql);
    asUser = (uid,fn) => {
      const result=queue.then(async()=>{ await db.exec('set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]); try{return await fn(query);}finally{await db.exec('reset role');}});
      queue=result.then(()=>{},()=>{}); return result;
    };
    close=()=>db.close();
  }
  try {
    let bootstrap=await readFile(new URL('./bootstrap.sql',import.meta.url),'utf8');
    if(realPostgres) bootstrap=bootstrap.replace(/^create role .*;\n/gm,'');
    await exec(bootstrap);
    if (next) await exec('create publication supabase_realtime');
    for(const file of ['20261101000100_stage2_foundation.sql','20261101000200_live_quiz.sql','20261101000300_live_quiz_content_v1.sql', ...(next ? ['20261103000100_competition_lifecycle.sql','20261103000200_question_bank_v2.sql'] : []), ...(mixed ? ['20261103000300_mixed_live_engine.sql','20261103000400_mixed_bank_v3.sql'] : [])]) await exec(await readFile(new URL(`../migrations/${file}`,import.meta.url),'utf8'));
    const schedulerDefinition = (await query<{definition:string}>("select pg_get_functiondef('el_zhady_private.live_quiz_scheduler_ready()'::regprocedure) definition")).rows[0].definition;
    // Test-only clock/scheduler boundary substitutes. No production input can set time.
    await exec("create table el_zhady_private.test_clock(at_time timestamptz not null); insert into el_zhady_private.test_clock values('2030-01-01T12:00:00Z'); create or replace function el_zhady_private.live_quiz_clock() returns timestamptz language sql volatile set search_path='' as $$select at_time from el_zhady_private.test_clock$$; create or replace function el_zhady_private.live_quiz_scheduler_ready() returns boolean language sql stable security definer set search_path='' as $$ select true $$;");
    for(const [key,id] of Object.entries(actors)) await query('insert into auth.users(id,is_anonymous) values($1,$2)',[id,key==='guest']);
    await query('insert into el_zhady_private.admins(user_id) values($1)',[actors.host]);
    async function rpc<T = Record<string, unknown>>(uid:string,name:string,args:unknown[]=[]) {
      if(name==='configure_competition' && Array.isArray(args[1])) args=[args[0],JSON.stringify(args[1])];
      if(!/^[a-z_]+$/.test(name))throw new Error('Invalid test RPC name');
      return asUser(uid,async q=>(await q<{value:T}>(`select public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) as value`,args)).rows[0].value);
    }
    return { query, exec, asUser, close, rpc, realPostgres, schedulerDefinition, asOwner,
      setTime: (time:number)=>query('update el_zhady_private.test_clock set at_time=$1',[new Date(time).toISOString()]),
      async createRoom() {
        // Reset only this isolated fixture's creation quota between test scenarios.
        await query("update el_zhady_private.room_requests set created_at=now()-interval '2 hours'");
        return rpc<{id:string;code:string}>(actors.host,'admin_create_room',[randomUUID(),'Ел жады · жергілікті сынақ']);
      },
    };
  } catch(e) { await close(); throw e; }
}
