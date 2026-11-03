/** Local integration only: real isolated SQL/RLS with fixture Auth and routed HTTP.
 * No fixture transport, identity issuer or clock override is included in src/dist.
 */
import { createServer } from 'vite';
import { chromium } from 'playwright';
import type { BrowserContext, Page } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { actors, liveHarness, testEpoch as epoch } from '../../supabase/tests/live-harness';
const h = await liveHarness(true,true);
if (!h.realPostgres) { await h.close(); throw new Error('Browser integration requires isolated PostgreSQL on loopback port 55433'); }
process.env.VITE_SUPABASE_URL='https://quiz-test.invalid';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_local_fixture_only';
process.env.VITE_PUBLIC_SITE_URL='https://owen1night.github.io/el-zhady/';
process.env.VITE_TURNSTILE_SITE_KEY='';
const vite = await createServer({server:{host:'127.0.0.1',port:4175,strictPort:true}});
await vite.listen();
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.CHROMIUM_EXECUTABLE_PATH} : existsSync('/usr/bin/chromium') ? {executablePath:'/usr/bin/chromium'} : {}),args:['--no-sandbox']});
const contexts:BrowserContext[]=[]; const errors:string[]=[]; const responses:{rpc:string;payload:unknown}[]=[];
const tokens=new Map<string,string>(); let loseNextAnswer=false; const unreachable=new Set<string>();
const root='http://127.0.0.1:4175/el-zhady/';
async function session(uid:string,mobile=false) {
  const context=await browser.newContext(mobile?{viewport:{width:360,height:800},isMobile:true,hasTouch:true,deviceScaleFactor:1}:{viewport:{width:1920,height:1080}});contexts.push(context);
  const user={id:uid,aud:'authenticated',role:'authenticated',is_anonymous:uid===actors.guest,app_metadata:{provider:uid===actors.guest?'anonymous':'google'},user_metadata:{},identities:[],created_at:'2026-01-01T00:00:00Z'};
  const token=`${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,is_anonymous:user.is_anonymous})).toString('base64url')}.local_test_signature`;
  tokens.set(token,uid);
  await context.addInitScript(({token,user})=>localStorage.setItem('el-zhady:auth:v1',JSON.stringify({access_token:token,refresh_token:'local-fixture-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user})),{token,user});
  await context.routeWebSocket('wss://quiz-test.invalid/**',socket=>socket.close());
  await context.route('https://quiz-test.invalid/**',async route=>{
    try {
      const request=route.request(); const url=new URL(request.url());const identity=tokens.get((request.headers().authorization||'').replace(/^Bearer /,''));
      if(identity && unreachable.has(identity)) {await route.abort('internetdisconnected');return;}
      if(!identity) {await route.fulfill({status:401,json:{message:'AUTH_REQUIRED'}});return;}
      if(url.pathname==='/auth/v1/user') {await route.fulfill({json:user});return;}
      if(url.pathname.startsWith('/rest/v1/rpc/')) {
        const name=url.pathname.split('/').at(-1)!;
        const allowed=['my_access','save_profile','admin_create_room','get_lobby','join_room','lobby_heartbeat','available_live_quizzes','configure_live_quiz','configure_competition','start_competition_round','reveal_competition_results','admin_delete_room','admin_competition_round_review','start_live_quiz','live_quiz_state','submit_live_quiz_answer','admin_live_quiz_review','end_live_question','cancel_live_quiz','admin_room_action','my_competition_history'];
        assert(allowed.includes(name));
        const names=(await h.query<{proargnames:string[]|null}>("select proargnames from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname=$1",[name])).rows[0].proargnames || [];
        const body=request.postDataJSON()||{};const payload=await h.rpc(identity,name,names.map(n=>body[n]));responses.push({rpc:name,payload});
        if(name==='submit_live_quiz_answer'&&loseNextAnswer) {loseNextAnswer=false;await route.fulfill({status:503,json:{message:'test response lost after commit'}});return;}
        await route.fulfill({json:payload??null});return;
      }
      const table=url.pathname.split('/').at(-1)!;
      assert(['profiles','rooms','practice_results'].includes(table));
      const rows=(await h.asUser(identity,q=>q(`select * from public.${table}`))).rows;
      await route.fulfill({json:rows});
    } catch(e) {await route.fulfill({status:400,json:{message:(e as Error).message,code:'P0001'}});}
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  return {context,page};
}
async function visible(page:Page,selector:string,text?:string) {const item=text?page.locator(selector).filter({hasText:text}).first():page.locator(selector).first();await item.waitFor({state:'visible',timeout:15000});return item;}
async function textEventually(page:Page,selector:string,text:string) {await page.waitForFunction(({selector,text})=>document.querySelector(selector)?.textContent?.includes(text),{selector,text},{timeout:15000});}
async function noOverflow(page:Page,label:string) {assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${label}: no horizontal overflow`);}
async function clock(ms:number) {await h.setTime(ms);await h.query('select el_zhady_private.tick_live_quizzes()');}
try {
 await mkdir('work/mixed-browser',{recursive:true});await h.rpc(actors.host,'save_profile',['Жүргізуші']);
 const room=await h.createRoom();const host=await session(actors.host);const guest=await session(actors.guest,true);const player=await session(actors.player,true);
 await h.rpc(actors.guest,'join_room',[room.code,'Айдана']);await h.rpc(actors.player,'join_room',[room.code,'Айдана']);
 for(const person of [host,guest,player])await person.page.goto(root+`#/lobby?room=${room.id}`);
 await visible(host.page,'#lineup-mode');assert.equal(await host.page.locator('#lineup-mode').inputValue(),'mixed');
 await host.page.getByRole('button',{name:'Ойындар ретін сақтау',exact:true}).click();await visible(host.page,'.start-quiz');await host.page.locator('.start-quiz').click();
 let current=epoch;
 for(let round=1;round<=3;round++){
  if(round>1)await host.page.getByRole('button',{name:'Келесі ойынды бастау',exact:true}).click();
  await host.page.locator('.quiz-countdown').waitFor();
  const s=await h.query<{id:string;starts_at:Date;question_seconds:number}>('select * from public.live_quiz_sessions where room_id=$1 and round_number=$2',[room.id,round]);const sid=s.rows[0].id;current=new Date(s.rows[0].starts_at).getTime();
  const qs=(await h.query<{question_id:string;correct_option_id:string;game_kind:string}>('select * from el_zhady_private.live_quiz_snapshot where session_id=$1 order by ordinal',[sid])).rows;
  for(let i=0;i<10;i++){
   await clock(current);await guest.page.locator('.quiz-question').filter({has:guest.page.locator('h3')}).waitFor();
   await guest.page.waitForFunction(id=>document.querySelector('.quiz-question')?.getAttribute('data-question-id')===id,qs[i].question_id);
   await host.page.waitForFunction(id=>document.querySelector('.quiz-question')?.getAttribute('data-question-id')===id,qs[i].question_id);await host.page.locator('.end-question').waitFor();if(i===0){await host.page.locator('.end-question').scrollIntoViewIfNeeded();const b=await host.page.locator('.end-question').boundingBox();assert(b&&b.y>=0&&b.y+b.height<=1080);await host.page.screenshot({path:`work/mixed-browser/${round}-host-question.png`});}
   if(qs[i].game_kind==='timeline'){
    const target=qs[i].correct_option_id.split('>');
    for(let pos=0;pos<target.length;pos++){
     const text=(await h.query<{text:string}>("select o->>'text' text from el_zhady_private.live_quiz_snapshot q,jsonb_array_elements(q.options) o where session_id=$1 and question_id=$2 and o->>'id'=$3",[sid,qs[i].question_id,target[pos]])).rows[0].text;
     let at=await guest.page.locator('.order-list>li').allTextContents().then(rows=>rows.findIndex(row=>row.includes(text)));
     while(at>pos){const up=guest.page.locator('.order-list>li').nth(at).getByRole('button',{name:/жоғары/});await up.focus();await guest.page.keyboard.press('Enter');at--;}
    }await guest.page.locator('.submit-order').click();
   }else if(qs[i].game_kind==='map'){
    if(i===0)await guest.page.locator(`.atlas-marker[data-location-id="${qs[i].correct_option_id}"]`).click();
    else{const option=guest.page.locator(`[data-option-id="${qs[i].correct_option_id}"]`);await option.focus();await guest.page.keyboard.press('Enter');}
   }else{await guest.page.locator(`[data-option-id="${qs[i].correct_option_id}"]`).click();}
   await textEventually(guest.page,'.answer-feedback','Жауап серверде сақталды');
   assert.equal(await guest.page.locator('.end-question').count(),0,'guest has no host control');
   if(i===0){await guest.page.reload();await textEventually(guest.page,'.answer-feedback','Жауап серверде сақталды');await noOverflow(guest.page,'saved answer refresh');await guest.page.screenshot({path:`work/mixed-browser/${round}-mobile-saved.png`,fullPage:true});}
   await clock(current+2000);await host.page.locator('.end-question').click();
   // A delayed duplicate repeats the exact immutable target, never "current".
   await h.rpc(actors.host,'end_live_question',[room.id,sid,qs[i].question_id]);
   await textEventually(guest.page,'.quiz-explanation','ДҰРЫС ЖАУАП');await textEventually(host.page,'.quiz-explanation','ДҰРЫС ЖАУАП');
   await noOverflow(guest.page,'mobile reveal');await noOverflow(host.page,'1920px host reveal');
   if(i===0){await host.page.screenshot({path:`work/mixed-browser/${round}-host-reveal.png`,fullPage:true});}
   current+=7000;await clock(current);
   if(i<9){await guest.page.waitForFunction(id=>document.querySelector('.quiz-question')?.getAttribute('data-question-id')===id,qs[i+1].question_id);await h.rpc(actors.host,'end_live_question',[room.id,sid,qs[i].question_id]);const next=await h.rpc<import('../../src/live/types').LiveState>(actors.guest,'live_quiz_state',[room.id]);assert.equal(Date.parse(next.phase_ends_at!)-current,s.rows[0].question_seconds*1000);}
  }
  if(round<3){await textEventually(guest.page,'.round-waiting','Келесі ойынның басталуын күтіңіз');await clock(current+60000);current+=60000;await guest.page.reload();await textEventually(guest.page,'.round-waiting','Келесі ойынның басталуын күтіңіз');}
 }
 await textEventually(guest.page,'.final-waiting','Жүргізуші нәтижені жариялағанша');assert.equal(await guest.page.locator('.quiz-leaderboard').count(),0);
 await host.page.getByRole('button',{name:'Нәтижені көрсету',exact:true}).click();await visible(guest.page,'.own-competition-result');await guest.page.reload();await visible(guest.page,'.own-competition-result');
 assert.equal(await guest.page.locator('.quiz-leaderboard').count(),0);assert.equal(await guest.page.locator('.quiz-podium').getAttribute('data-podium-stage'),'settled');assert(!(await guest.page.locator('.quiz-podium').innerText()).includes('#'));await noOverflow(guest.page,'podium');
 assert.equal((await h.rpc<import('../../src/live/types').LiveState>(actors.guest,'live_quiz_state',[room.id])).own_result?.raw_points,33000);
 assert(!responses.some(r=>r.rpc==='live_quiz_state'&&JSON.stringify(r.payload).includes('LIVE_PRIVATE_MIXED_V3')));
 assert.deepEqual(errors,[]);console.log('PASS: three independent Chromium contexts; quiz → map → keyboard timeline; all 30 early timeouts with stale retries, full next timers, accepted-answer refresh in every kind, manual starts/reveal, private results, 360px/1920px layouts.');
}finally{for(const c of contexts)await c.close();await browser.close();await vite.close();await h.close();}
