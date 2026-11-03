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
const h = await liveHarness(true);
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
const bank='kz-1939-1953-bank-v2';
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
        const allowed=['my_access','save_profile','admin_create_room','get_lobby','join_room','lobby_heartbeat','available_live_quizzes','configure_live_quiz','configure_competition','start_competition_round','reveal_competition_results','admin_delete_room','admin_competition_round_review','start_live_quiz','live_quiz_state','submit_live_quiz_answer','admin_live_quiz_review','cancel_live_quiz','admin_room_action','my_competition_history'];
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
  await mkdir('work/competition-browser',{recursive:true});
  await h.rpc(actors.host,'save_profile',['Жүргізуші']);await h.rpc(actors.player,'save_profile',['Айдана']);
  const host=await session(actors.host);const player=await session(actors.player,true);const guest=await session(actors.guest,true);
  await host.page.goto(root+'#/admin');await host.page.locator('#room-title').fill('Екі кезеңдік сайыс');await host.page.getByRole('button',{name:'Бөлмені дайындау',exact:true}).click();
  await visible(host.page,'.created-room');assert(await host.page.locator('#room-title').isDisabled());
  await host.page.getByRole('button',{name:'Тағы бір бөлме дайындау',exact:true}).click();assert(await host.page.locator('#room-title').isEnabled());
  await host.page.locator('.admin-rooms a').filter({hasText:'Екі кезеңдік сайыс'}).click();
  const code=(await (await visible(host.page,'.room-code')).textContent())!.trim();const roomId=new URL('https://local.invalid/'+host.page.url().split('#')[1].replace(/^\//,'')).searchParams.get('room')!;
  const joinPage=async(page:Page,name:string)=>{await page.goto(root+`#/join?code=${code}`);await page.locator('#join-name').fill(name);await page.getByRole('button',{name:'Сайысқа қосылу',exact:true}).click();await visible(page,'.room-code');};
  await joinPage(player.page,'Айдана');await joinPage(guest.page,'Қонақ');
  await visible(host.page,'#quiz-version');await host.page.locator('#quiz-version').selectOption(bank);await host.page.locator('#round-count').selectOption('2');
  await host.page.getByRole('button',{name:'Викторинаны таңдау',exact:true}).click();
  await visible(host.page,'.qr-preview');await host.page.getByRole('button',{name:'QR-кодты үлкейту',exact:true}).click();await visible(host.page,'dialog.qr-dialog');
  assert.equal(await host.page.locator('.projector-qr>strong').textContent(),code);assert((await host.page.locator('.projector-qr img').getAttribute('src'))?.startsWith('data:image/svg+xml'));
  const qr=await host.page.locator('dialog.qr-dialog').boundingBox();assert(qr&&qr.width===1920&&qr.height===1080);await host.page.screenshot({path:'work/competition-browser/projector-1920.png'});
  await host.page.keyboard.press('Escape');await host.page.locator('dialog.qr-dialog').waitFor({state:'hidden'});assert.equal(await host.page.locator('dialog[open]').count(),0);assert(host.page.url().includes(roomId));
  await host.page.setViewportSize({width:360,height:800});await host.page.getByRole('button',{name:'QR-кодты үлкейту',exact:true}).click();await noOverflow(host.page,'projector 360px');await host.page.screenshot({path:'work/competition-browser/projector-360.png'});await host.page.getByRole('button',{name:'Жабу',exact:true}).click();await host.page.locator('dialog.qr-dialog').waitFor({state:'hidden'});await host.page.setViewportSize({width:1920,height:1080});
  await host.page.locator('.participant-list>li').filter({hasText:'Айдана'}).getByRole('button',{name:'Бөлмеден шығару',exact:true}).click();await host.page.getByRole('button',{name:'Растау',exact:true}).click();
  await visible(player.page,'.service-error','бөлмеден шығарды');await player.page.locator('.room-code').waitFor({state:'hidden'});
  await player.page.reload();await visible(player.page,'.service-error','бөлмеден шығарды');await joinPage(player.page,'Айдана');
  await host.page.waitForFunction(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent?.includes('Сайысты бастау'));return b&&!b.disabled;});
  await host.page.getByRole('button',{name:'Үлкен экранға арналған көрсетілім режимі',exact:true}).click();
  await host.page.getByRole('button',{name:'Сайысты бастау',exact:true}).click();await visible(guest.page,'.quiz-countdown');
  assert.equal((await h.rpc<{error:string}>(actors.outsider,'join_room',[code,'Кешіккен адам'])).error,'ROOM_LOCKED');
  let sid=(await h.query<{id:string}>('select id from public.live_quiz_sessions where room_id=$1 and round_number=1',[roomId])).rows[0].id;
  const questions=(await h.query<{question_id:string;correct_option_id:string}>('select question_id,correct_option_id from el_zhady_private.live_quiz_snapshot where session_id=$1 order by ordinal',[sid])).rows;
  for(let n=1;n<=10;n++) {
    await clock(epoch+3000+(n-1)*20000+1500);
    for(const s of [player,guest]){await textEventually(s.page,'.quiz-progress',`Сұрақ ${n} / 10`);await noOverflow(s.page,`question ${n} 360px`);}
    const correct=questions[n-1].correct_option_id;
    if(n===1)loseNextAnswer=true;
    await player.page.locator(`[data-option-id="${correct}"]`).tap();await textEventually(player.page,'.answer-feedback','Жауап серверде сақталды');
    if(n===1){await player.page.reload();await textEventually(player.page,'.answer-feedback','Жауап серверде сақталды');assert.equal(await player.page.locator('.quiz-option.chosen').getAttribute('data-option-id'),correct);await player.page.screenshot({path:'work/competition-browser/question-360.png',fullPage:true});}
    const guestAnswer=n===1?guest.page.locator(`.quiz-option:not([data-option-id="${correct}"])`).first():guest.page.locator(`[data-option-id="${correct}"]`);
    await guestAnswer.tap();await textEventually(guest.page,'.answer-feedback','Жауап серверде сақталды');
    const latest=responses.filter(r=>r.rpc==='live_quiz_state').at(-1)!.payload;assert(!JSON.stringify(latest).includes('correct_option_id'));if(n<10)assert(!JSON.stringify(latest).includes(questions[n].question_id));
    if(n===3)await host.page.close();
    await clock(epoch+3000+(n-1)*20000+15000);
    for(const s of [player,guest]){await visible(s.page,'.quiz-explanation');assert.equal(await s.page.locator('.quiz-leaderboard').count(),0);}
    if(n===4){host.page=await host.context.newPage();await host.page.goto(root+`#/lobby?room=${roomId}`);await visible(host.page,'.quiz-explanation');}
  }
  await clock(epoch+203000);await visible(host.page,'.round-waiting');
  for(const s of [player,guest]){await visible(s.page,'.round-waiting','Ойын аяқталды. Келесі ойынның басталуын күтіңіз.');assert.equal(await s.page.locator('.standings-table').count(),0);assert.equal(await s.page.locator('.quiz-podium').count(),0);}
  await guest.page.reload();await visible(guest.page,'.round-waiting');
  assert.equal((await h.rpc<{error:string}>(actors.outsider,'join_room',[code,'Кешіккен адам'])).error,'ROOM_LOCKED');
  await host.page.getByRole('button',{name:'Келесі ойынды бастау',exact:true}).click();await visible(guest.page,'.quiz-countdown');
  const secondStart=epoch+203000;
  sid=(await h.query<{id:string}>('select id from public.live_quiz_sessions where room_id=$1 and round_number=2',[roomId])).rows[0].id;
  const second=(await h.query<{correct_option_id:string}>('select correct_option_id from el_zhady_private.live_quiz_snapshot where session_id=$1 and ordinal=1',[sid])).rows[0];
  await clock(secondStart+4500);
  for(const s of [player,guest]){await textEventually(s.page,'.quiz-progress','Сұрақ 1 / 10');await s.page.locator(`[data-option-id="${second.correct_option_id}"]`).tap();await textEventually(s.page,'.answer-feedback','Жауап серверде сақталды');}
  await clock(secondStart+203000);
  for(const s of [player,guest]){await visible(s.page,'.final-waiting','Сайыс аяқталды. Жүргізуші нәтижені жариялағанша күтіңіз.');assert.equal(await s.page.locator('.quiz-podium,.standings-table,.own-competition-result').count(),0);}
  await visible(host.page,'.final-waiting');await host.page.getByRole('button',{name:'Нәтижені көрсету',exact:true}).click();
  await guest.page.waitForFunction(()=>document.querySelector('.quiz-podium')?.getAttribute('data-podium-stage')==='2');
  await guest.page.reload();await visible(guest.page,'.quiz-podium');assert.equal(await guest.page.locator('.quiz-podium').getAttribute('data-podium-stage'),'settled');
  await host.page.waitForFunction(()=>document.querySelector('.quiz-podium')?.getAttribute('data-podium-stage')==='settled');
  for(const s of [player,guest]){await visible(s.page,'.own-competition-result');assert.equal(await s.page.locator('.standings-table').count(),0);await noOverflow(s.page,'final podium 360px');}
  assert.equal(await host.page.locator('.standings-row:not(.table-heading)').count(),2);await guest.page.screenshot({path:'work/competition-browser/final-360.png',fullPage:true});
  await host.page.getByRole('button',{name:'Бөлмені жабу',exact:true}).click();await host.page.getByRole('button',{name:'Растау',exact:true}).click();
  for(const s of [player,guest]){await s.page.waitForURL('**/#/home');await visible(s.page,'.room-exit-notice','Жүргізуші бөлмені жапты');}
  await guest.page.goto(root+`#/lobby?room=${roomId}`);await guest.page.waitForURL('**/#/home');
  await host.page.getByRole('button',{name:'Бөлмені біржола жою',exact:true}).click();await host.page.getByRole('button',{name:'Бөлмені біржола жоюды растау',exact:true}).click();await host.page.waitForURL('**/#/admin');
  assert(await host.page.locator('#room-title').isEnabled());
  await player.page.goto(root+'#/profile');await visible(player.page,'.history-list','11990 сайыс ұпайы');assert((await player.page.locator('.profile-total').textContent())?.includes('— / 100'));
  assert.equal((await h.rpc<{error:string}>(actors.guest,'join_room',[code,'Қонақ'])).error,'ROOM_NOT_FOUND');
  // Tied third places and the exact shared 3 -> 2 -> 1 spotlight sequence.
  await h.query('delete from el_zhady_private.join_limits');await clock(epoch+1000000);const ties=await h.createRoom();
  for(const [uid,name] of [[actors.player,'Бірінші'],[actors.guest,'Екінші'],[actors.player2,'Үшінші А'],[actors.player3,'Үшінші Б']])await h.rpc(uid,'join_room',[ties.code,name]);
  await h.rpc(actors.host,'configure_competition',[ties.id,[{game_kind:'quiz',set_version:bank}]]);const st=await h.rpc<{session_id:string}>(actors.host,'start_competition_round',[ties.id,1]);
  const tq=(await h.query<{question_id:string;correct_option_id:string}>('select question_id,correct_option_id from el_zhady_private.live_quiz_snapshot where session_id=$1 order by ordinal',[st.session_id])).rows;
  await clock(epoch+1003000);await h.rpc(actors.guest,'submit_live_quiz_answer',[st.session_id,tq[0].question_id,tq[0].correct_option_id]);await clock(epoch+1017999);await h.rpc(actors.player,'submit_live_quiz_answer',[st.session_id,tq[0].question_id,tq[0].correct_option_id]);await clock(epoch+1037999);await h.rpc(actors.player,'submit_live_quiz_answer',[st.session_id,tq[1].question_id,tq[1].correct_option_id]);await clock(epoch+1203000);
  await host.page.goto(root+`#/lobby?room=${ties.id}`);await guest.page.goto(root+`#/lobby?room=${ties.id}`);await visible(guest.page,'.final-waiting');await host.page.getByRole('button',{name:'Нәтижені көрсету',exact:true}).click();
  for(const stage of ['3','2','1','settled'])for(const s of [host,guest])await s.page.waitForFunction(stage=>document.querySelector('.quiz-podium')?.getAttribute('data-podium-stage')===stage,stage,{timeout:15000});
  assert.equal(await guest.page.locator('.place-3 .podium-person').count(),2);assert.equal(await guest.page.locator('.standings-table').count(),0);assert.equal(await host.page.locator('.standings-row:not(.table-heading)').count(),4);await host.page.screenshot({path:'work/competition-browser/tied-podium-1920.png',fullPage:true});
  await guest.page.emulateMedia({reducedMotion:'reduce'});await guest.page.reload();await visible(guest.page,'.quiz-podium');assert.equal(await guest.page.locator('.quiz-podium').getAttribute('data-podium-stage'),'settled');assert.equal(await guest.page.locator('.podium-place').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  // Room-only identity block UI, and reconnect after a close while disconnected.
  await h.query('delete from el_zhady_private.join_limits');const mod=await h.createRoom();await h.rpc(actors.guest,'join_room',[mod.code,'Қонақ']);await h.rpc(actors.player,'join_room',[mod.code,'Айдана']);
  await host.page.goto(root+`#/lobby?room=${mod.id}`);await guest.page.goto(root+`#/lobby?room=${mod.id}`);
  await host.page.locator('.participant-list>li').filter({hasText:'Қонақ'}).getByRole('button',{name:'Шығару және осы бөлмеге кіруін бұғаттау',exact:true}).click();await host.page.getByRole('button',{name:'Растау',exact:true}).click();await visible(guest.page,'.service-error','бұғатталған');
  assert.equal((await h.rpc<{error:string}>(actors.guest,'join_room',[mod.code,'Басқа есім'])).error,'ROOM_BLOCKED');
  await player.page.goto(root+`#/lobby?room=${mod.id}`);await visible(player.page,'.room-code');unreachable.add(actors.player);
  await host.page.getByRole('button',{name:'Бөлмені жабу',exact:true}).click();await host.page.getByRole('button',{name:'Растау',exact:true}).click();unreachable.delete(actors.player);
  await player.page.reload();await player.page.waitForURL('**/#/home');await visible(player.page,'.room-exit-notice','Жүргізуші бөлмені жапты');
  assert.deepEqual(errors,[]);
  console.log('PASS: real PostgreSQL + three Chromium sessions; remove/manual rejoin/block; two quiz rounds with persisted draws/roster and manual transition; no participant standings; host final reveal; refresh skips replay; shared 3->2->1 podium with tied third; QR fullscreen desktop/mobile; closure/live/reconnect, deletion/history, unchanged practice; touch/reduced motion/no overflow.');
  console.log('Fixture Auth/REST and controlled SQL clock; not hosted Supabase/Realtime/Cron or physical iPhone/Android.');
} catch(error) { for(const [i,c] of contexts.entries())for(const p of c.pages()){console.log('Failure page',i,p.url());await p.screenshot({path:`work/competition-browser/failure-${i}.png`,fullPage:true}).catch(()=>{});}throw error;
} finally {for(const context of contexts)await context.close();await browser.close();await vite.close();await h.close();}
