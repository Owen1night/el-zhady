import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const pin='6b0d69bd937eb4550a89ede4744203d265c781cd';
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),pin);
process.env.VITE_SUPABASE_URL='';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='';process.env.VITE_PUBLIC_SITE_URL='https://owen1night.github.io/el-zhady/';
const dir='work/pr5-review';await mkdir(dir,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:4181,strictPort:true}});await server.listen();
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {for(const width of [1920,360]){
 const page=await browser.newPage({viewport:{width,height:width===360?800:1080},isMobile:width===360,hasTouch:width===360,deviceScaleFactor:1});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const section of ['home','front','heroes','homefront','postwar','timeline','sources']){
  await page.goto('http://127.0.0.1:4181/el-zhady/#/'+section);await page.locator('h1').waitFor();if(section!=='home')await page.locator(section==='timeline'?'.learning-timeline':'.reading-sources').first().waitFor();await page.evaluate(()=>document.fonts.ready);assert(await page.evaluate(()=>document.fonts.check('16px "Noto Sans"','Қазақ')&&document.fonts.check('16px "Noto Serif"','Қазақ')),'Kazakh webfonts must load');await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo({top:0,behavior:'instant'});});await page.waitForTimeout(200);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),section+'/'+width+' overflow');
  await page.screenshot({path:dir+'/'+section+'-'+width+'.png',fullPage:true});
 }
 if(width===360){await page.getByRole('button',{name:'Бөлімдер',exact:true}).click();await page.screenshot({path:dir+'/menu-360.png',fullPage:true});}
 assert.deepEqual(errors,[]);await page.close();console.log('Pinned PR5 '+width+'px captures passed; fonts loaded; no overflow/page errors.');
}
 const files=await Promise.all((await readdir(dir)).filter(f=>f.endsWith('.png')).map(async file=>({file,sha256:createHash('sha256').update(await readFile(dir+'/'+file)).digest('hex')})));
 await writeFile(dir+'/provenance.json',JSON.stringify({source_commit:pin,captured_on:'2026-11-03',engine:'Chromium emulation, not physical Safari',backend:'unconfigured; public content only',files},null,2)+'\n');
}finally{await browser.close();await server.close();}
