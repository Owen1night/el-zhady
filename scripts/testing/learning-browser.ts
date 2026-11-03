import { createServer } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const vite=await createServer({server:{host:'127.0.0.1',port:4180,strictPort:true}}); await vite.listen();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try {await mkdir('work/learning-browser',{recursive:true});for(const width of [360,1920]) {
 const page=await browser.newPage({viewport:{width,height:width===360?800:1080},isMobile:width===360,hasTouch:width===360}); const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4180/el-zhady/#/home');
 if(width===360){await page.getByRole('button',{name:'Бөлімдер',exact:true}).click();await page.getByRole('link',{name:'Ойынға қосылу',exact:true}).click();}else await page.getByRole('link',{name:'Ойынға қосылу',exact:true}).click();
 await page.locator('#room-code').waitFor();
 for(const section of ['front','heroes','homefront','postwar','timeline','sources']) {
  await page.goto('http://127.0.0.1:4180/el-zhady/#/'+section); await page.locator(section==='timeline'?'.learning-timeline':section==='sources'?'.reading-sources':'.reading-card').first().waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} ${section}: no overflow`);
  if(section==='timeline'){await page.getByRole('button',{name:'1946–1953',exact:true}).click();assert.equal(await page.locator('.learning-timeline>ol>li').count(),6);await page.getByRole('button',{name:'Барлығы',exact:true}).focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.learning-timeline>ol>li').count(),12);}
  if(section==='postwar')await page.screenshot({path:`work/learning-browser/postwar-${width}.png`,fullPage:true});
 }assert.deepEqual(errors,[]);await page.close();console.log(`${width}px: join menu, six sections, keyboard timeline, no overflow or page errors passed`);
}}finally{await browser.close();await vite.close();}
