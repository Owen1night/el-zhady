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
const h = await liveHarness();
if (!h.realPostgres) { await h.close(); throw new Error('Browser integration requires isolated PostgreSQL on loopback port 55433'); }
process.env.VITE_SUPABASE_URL='https://quiz-test.invalid';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_local_fixture_only';
process.env.VITE_PUBLIC_SITE_URL='https://owen1night.github.io/el-zhady/';
process.env.VITE_TURNSTILE_SITE_KEY='';
const vite = await createServer({server:{host:'127.0.0.1',port:4175,strictPort:true}});
await vite.listen();
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.CHROMIUM_EXECUTABLE_PATH} : existsSync('/usr/bin/chromium') ? {executablePath:'/usr/bin/chromium'} : {}),args:['--no-sandbox']});
const contexts:BrowserContext[]=[]; const errors:string[]=[]; const responses:{rpc:string;payload:unknown}[]=[];
const tokens=new Map<string,string>(); let loseNextAnswer=false;
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
      if(!identity) {await route.fulfill({status:401,json:{message:'AUTH_REQUIRED'}});return;}
      if(url.pathname==='/auth/v1/user') {await route.fulfill({json:user});return;}
      if(url.pathname.startsWith('/rest/v1/rpc/')) {
        const name=url.pathname.split('/').at(-1)!;
        const allowed=['my_access','save_profile','admin_create_room','get_lobby','join_room','lobby_heartbeat','available_live_quizzes','configure_live_quiz','start_live_quiz','live_quiz_state','submit_live_quiz_answer','admin_live_quiz_review','cancel_live_quiz','admin_room_action','my_competition_history'];
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
  await mkdir('work/stage3-browser',{recursive:true});
  await h.rpc(actors.host,'save_profile',['Жүргізуші']);await h.rpc(actors.player,'save_profile',['Айдана']);
  const host=await session(actors.host);const player=await session(actors.player,true);const guest=await session(actors.guest,true);
  await host.page.goto(root+'#/admin');await host.page.locator('#room-title').fill('Сыныптың тікелей викторинасы');await host.page.getByRole('button',{name:'Бөлмені дайындау',exact:true}).click();
  await host.page.getByRole('link',{name:'Бөлмені ашу',exact:true}).click();
  const code=(await (await visible(host.page,'.room-code')).textContent())!.trim();const roomId=new URL('https://local.invalid/'+host.page.url().split('#')[1].replace(/^\//,'')).searchParams.get('room')!;
  assert.match(code,/^[A-F0-9]{8}$/);assert(roomId);
  for(const [s,name] of [[player,'Бірдей есім'],[guest,'Бірдей есім']] as const) {
    await s.page.goto(root+`#/join?code=${code}`);await s.page.locator('#join-name').fill(name);await s.page.getByRole('button',{name:'Сайысқа қосылу',exact:true}).click();await visible(s.page,'.room-code');
  }
  await host.page.getByRole('button',{name:'Викторинаны таңдау',exact:true}).click();
  await host.page.waitForFunction(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent?.includes('Сайысты бастау'));return b&&!b.disabled;});
  assert((await host.page.locator('.join-url').getAttribute('href'))?.startsWith('https://owen1night.github.io/el-zhady/#/join?code='));
  await host.page.getByRole('button',{name:'Үлкен экранға арналған көрсетілім режимі',exact:true}).click();
  await host.page.getByRole('button',{name:'Сайысты бастау',exact:true}).click();await visible(player.page,'.quiz-countdown');
  await guest.page.screenshot({path:'work/stage3-browser/countdown-360.png',fullPage:true});
  for(let n=1;n<=10;n++) {
    await clock(epoch+3000+(n-1)*20000+1500);
    for(const s of [player,guest]) { await textEventually(s.page,'.quiz-progress',`Сұрақ ${n} / 10`); await noOverflow(s.page,`360px question ${n}`); }
    const prefix=`q${String(n).padStart(2,'0')}`;
    if(n===1) {
      // A committed answer whose HTTP acknowledgement is lost must recover via state.
      loseNextAnswer=true;
      await player.page.locator(`[data-option-id="${prefix}_0"]`).tap();
      await textEventually(player.page,'.answer-feedback','Жауап серверде сақталды');
      await player.page.reload();await textEventually(player.page,'.answer-feedback','Жауап серверде сақталды');
      assert.equal(await player.page.locator('.quiz-option.chosen').getAttribute('data-option-id'),`${prefix}_0`);
      await noOverflow(player.page,'360px question');
      for (const button of await player.page.locator('.quiz-option').all()) { const box=await button.boundingBox();assert(box&&box.width>=44&&box.height>=44); }
      await player.page.screenshot({path:'work/stage3-browser/question-360.png',fullPage:true});
      await textEventually(host.page,'.quiz-progress','Сұрақ 1 / 10');
      // Real hash-navigation confirmation, keyboard accessible dialog.
      await player.page.evaluate(()=>{location.hash='/timeline';});await visible(player.page,'dialog','Сайыстан шығасыз ба?');
      assert((await player.page.locator('dialog').textContent())?.includes('Жинаған ұпайларыңыз сақталады'));
      await player.page.getByRole('button',{name:'Сайыста қалу',exact:true}).click();assert(player.page.url().includes('#/lobby'));
      await host.page.waitForFunction(()=>document.documentElement.classList.contains('presentation'));
      const bottom=await host.page.locator('.quiz-options').evaluate(el=>el.getBoundingClientRect().bottom);
      assert(bottom<=1080,'host question/options fit the presentation viewport after phase scroll');
      await host.page.screenshot({path:'work/stage3-browser/host-1920.png',fullPage:true});
    } else if(n===2) {await player.page.keyboard.press('Tab');await player.page.locator(`[data-option-id="${prefix}_0"]`).focus();assert.notEqual(await player.page.locator(`[data-option-id="${prefix}_0"]`).evaluate(el=>getComputedStyle(el).outlineStyle),'none');await player.page.keyboard.press('Enter');}
    else await player.page.locator(`[data-option-id="${prefix}_0"]`).tap();
    await guest.page.locator(`[data-option-id="${prefix}_${n===1?1:0}"]`).tap();
    for(const s of [player,guest]) await textEventually(s.page,'.answer-feedback','Жауап серверде сақталды');
    if(n===1) {
      const current=responses.filter(r=>r.rpc==='live_quiz_state').at(-1)!.payload as {question?:unknown};
      assert(!JSON.stringify(current.question).includes('correct_option_id'));assert(!JSON.stringify(current).includes('30000000-0000-4000-8000-000000000002'));
    }
    if(n===2) {
      await player.page.evaluate(()=>{location.hash='/timeline';});await visible(player.page,'dialog');await player.page.getByRole('button',{name:'Шығу',exact:true}).click();
      await player.page.waitForURL('**/#/timeline');await player.page.goto(root+`#/lobby?room=${roomId}`);await textEventually(player.page,'.answer-feedback','Жауап серверде сақталды');
    }
    if(n===3) await host.page.close(); // two questions progress with no host browser
    await clock(epoch+3000+(n-1)*20000+15000);
    for(const s of [player,guest]) {await visible(s.page,'.quiz-explanation');await visible(s.page,'.quiz-leaderboard');}
    if(n===1) {await noOverflow(guest.page,'360px reveal');await guest.page.screenshot({path:'work/stage3-browser/reveal-360.png',fullPage:true});}
    if(n===4) {host.page=await host.context.newPage();await host.page.goto(root+`#/lobby?room=${roomId}`);await visible(host.page,'.quiz-explanation');}
  }
  await clock(epoch+203000);
  for(const s of [host,player,guest]) {await visible(s.page,'.quiz-podium');await noOverflow(s.page,s===host?'1920px final':'360px final');}
  assert.equal(await host.page.locator('.standings-row:not(.table-heading)').count(),2);
  await host.page.getByRole('button',{name:'Сұрақтар бойынша әкімші есебі',exact:true}).click();await host.page.waitForFunction(()=>document.querySelectorAll('.admin-quiz-review>details').length===10);
  await host.page.screenshot({path:'work/stage3-browser/final-1920.png',fullPage:true});await guest.page.screenshot({path:'work/stage3-browser/final-360.png',fullPage:true});
  await player.page.goto(root+'#/profile');await visible(player.page,'.history-list','сайыс ұпайы');assert((await player.page.locator('.profile-total').textContent())?.includes('— / 100'));
  await player.page.reload();await visible(player.page,'.history-list','сайыс ұпайы');await noOverflow(player.page,'360px history');
  // Reduced motion: verify quiz animation CSS actually resolves to none.
  await guest.page.emulateMedia({reducedMotion:'reduce'});assert.equal(await guest.page.locator('.podium-place').first().evaluate(el=>getComputedStyle(el).animationName),'none');
  const cancelRoom=await h.createRoom();
  await h.rpc(actors.player,'join_room',[cancelRoom.code,'Айдана']);await h.rpc(actors.guest,'join_room',[cancelRoom.code,'Қонақ']);await h.rpc(actors.host,'configure_live_quiz',[cancelRoom.id,'kz-1939-1953-v1']);
  await host.page.goto(root+`#/lobby?room=${cancelRoom.id}`);await host.page.getByRole('button',{name:'Сайысты бастау',exact:true}).click();await visible(host.page,'.quiz-countdown');
  await host.page.getByRole('button',{name:'Сайысты тоқтату',exact:true}).click();await visible(host.page,'dialog','Сайысты тоқтату керек пе?');await host.page.getByRole('button',{name:'Сайысты тоқтатуды растау',exact:true}).click();await textEventually(host.page,'.live-heading','Сайыс тоқтатылды');
  await host.page.emulateMedia({reducedMotion:'reduce'});assert.equal(await host.page.locator('.quiz-podium').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: real isolated PostgreSQL; three browser contexts (host 1920px, registered + guest 360px); ten questions; taps/keyboard; committed-answer transport failure; refresh; no-host progression; reveal/podium/admin detail/history; no overflow; reduced motion; no page errors.');
  console.log('NOT tested: hosted Supabase Auth/JWT verification, Google, CAPTCHA, hosted Realtime/Cron, physical iPhone/Android. Fixture Auth and routed REST transport are test-only.');
} finally {for(const context of contexts)await context.close();await browser.close();await vite.close();await h.close();}
