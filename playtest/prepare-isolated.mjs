import {readFile,writeFile,appendFile,mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
export function settings(env) {
 const repo=env.GITHUB_REPOSITORY||'';
 assert(/^[A-Za-z0-9-]+\/[A-Za-z0-9_-]+$/.test(repo),'Use a separate ordinary GitHub Pages repository');
 assert(repo.toLowerCase()!=='owen1night/el-zhady','Refusing the production repository');
 const [owner,name]=repo.split('/');
 const site=new URL('https://'+owner+'.github.io/'+name+'/').href;
 const backend=new URL(env.PLAYTEST_SUPABASE_URL||'');
 const match=/^([a-z0-9]{20})\.supabase\.co$/.exec(backend.hostname);
 assert(match&&backend.protocol==='https:'&&backend.pathname==='/'&&!backend.search&&!backend.hash&&!backend.username&&!backend.password&&!backend.port,'Use the fresh test project HTTPS URL');
 const prod=env.PRODUCTION_SUPABASE_PROJECT_REF||'';
 assert(/^[a-z0-9]{20}$/.test(prod),'Confirm the existing production project reference (public ID, not a key)');
 assert(match[1]!==prod,'Refusing the production backend');
 const key=env.PLAYTEST_SUPABASE_PUBLISHABLE_KEY||'';
 assert(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key),'Use the test project public publishable key only');
 const captcha=env.PLAYTEST_TURNSTILE_SITE_KEY||'';
 assert(!captcha||/^[A-Za-z0-9_-]{10,100}$/.test(captcha),'Invalid public Turnstile site key');
 return {repo,site,backend:backend.origin,key,captcha,ref:match[1]};
}
export async function prepare(root,env) {
 const s=settings(env),prefix='el-zhady:playtest:'+s.ref+':';
 const patches=[
 ['src/backend/client.ts','el-zhady:auth:v1',prefix+'auth:v1'],
 ['src/auth/oauth.ts','el-zhady:oauth-destination',prefix+'oauth-destination'],
 ['src/lib/storage.ts','el-zhady:foundation:v1',prefix+'foundation:v1'],
 ['src/lib/room-request.ts','el-zhady:room-request:',prefix+'room-request:'],
 ['src/auth/AuthProvider.tsx','el-zhady:auth-storage-probe',prefix+'auth-storage-probe'],
 ['src/lib/room-exit.ts',"const noticeKey = 'el-zhady:room-exit';","const noticeKey = '"+prefix+"room-exit';"],
 ['scripts/pages-health.mjs',"const published = 'https://owen1night.github.io/el-zhady/';","const published = '"+s.site+"';"],
 ];
 for(const [file,from,to] of patches){const path=join(root,file);const data=await readFile(path,'utf8');assert(data.includes(from),'Expected pinned source text missing: '+file);await writeFile(path,data.replaceAll(from,to));}
 const index=join(root,'index.html');const html=await readFile(index,'utf8');assert(html.includes('<body>'),'Expected body');
 await writeFile(index,html.replace('<body>','<body><aside style="padding:12px;background:#ffedb5;color:#342a10;text-align:center;font:600 14px sans-serif">ISOLATED PLAYTEST · '+s.repo+' · Supabase '+s.ref+'</aside>'));
 const lines=['VITE_PUBLIC_SITE_URL='+s.site,'PUBLIC_SITE_URL='+s.site,'VITE_SUPABASE_URL='+s.backend,'VITE_SUPABASE_PUBLISHABLE_KEY='+s.key,'VITE_TURNSTILE_SITE_KEY='+s.captcha].join('\n')+'\n';
 if(env.GITHUB_ENV)await appendFile(env.GITHUB_ENV,lines);
 return s;
}
if(process.argv.includes('--self-test')){
 const fixture={GITHUB_REPOSITORY:'Example/el-zhady-playtest',PLAYTEST_SUPABASE_URL:'https://'+'t'.repeat(20)+'.supabase.co',PRODUCTION_SUPABASE_PROJECT_REF:'p'.repeat(20),PLAYTEST_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture_only'};
 assert.equal(settings(fixture).site,'https://example.github.io/el-zhady-playtest/');
 for(const bad of [{GITHUB_REPOSITORY:'Owen1night/el-zhady'},{PLAYTEST_SUPABASE_URL:'https://'+'p'.repeat(20)+'.supabase.co'},{PLAYTEST_SUPABASE_PUBLISHABLE_KEY:'sb_secret_forbidden'},{PRODUCTION_SUPABASE_PROJECT_REF:''}])assert.throws(()=>settings({...fixture,...bad}));
 const temp=await mkdtemp(join(tmpdir(),'el-zhady-prepare-'));
 try{for(const file of ['src/backend/client.ts','src/auth/oauth.ts','src/lib/storage.ts','src/lib/room-request.ts','src/auth/AuthProvider.tsx','src/lib/room-exit.ts','scripts/pages-health.mjs','index.html']){await mkdir(join(temp,file.substring(0,file.lastIndexOf('/'))),{recursive:true});await writeFile(join(temp,file),await readFile(file));}
 await prepare(temp,fixture);const client=await readFile(join(temp,'src/backend/client.ts'),'utf8');assert(!client.includes("storageKey: 'el-zhady:auth:v1'"));assert(client.includes('el-zhady:playtest:'));const notice=await readFile(join(temp,'src/lib/room-exit.ts'),'utf8');assert(notice.includes("CustomEvent('el-zhady:room-exit'"),'Do not break room-exit event wiring');assert((await readFile(join(temp,'scripts/pages-health.mjs'),'utf8')).includes("const published = 'https://example.github.io/el-zhady-playtest/';"));console.log('PASS: isolated repo/backend guards, public-key guard, storage namespaces, callback/QR origin and public verifier URL; no network/SQL performed.');}finally{await rm(temp,{recursive:true,force:true});}
}else if(process.argv.includes('--fixture-build')){
 assert(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='Owen1night/el-zhady'&&process.env.GITHUB_REF==='refs/heads/codex/isolated-playtest-guide','Fixture build is CI-only on the review helper branch');
 await prepare(process.cwd(),{...process.env,GITHUB_REPOSITORY:'Example/el-zhady-playtest',PLAYTEST_SUPABASE_URL:'https://'+'t'.repeat(20)+'.supabase.co',PRODUCTION_SUPABASE_PROJECT_REF:'p'.repeat(20),PLAYTEST_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture_only',PLAYTEST_TURNSTILE_SITE_KEY:''});
 console.log('Prepared ephemeral fixture build only: no SQL, network calls, service configuration or deployment.');
}else{await prepare(process.cwd(),process.env);console.log('Prepared isolated test build; public configuration values withheld.');}
