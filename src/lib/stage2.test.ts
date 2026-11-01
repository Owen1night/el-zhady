import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectOAuthCallback, oauthRedirectUrl, saveDestination, consumeDestination } from '../auth/oauth';
import { safeDestination, parseRoute, joinUrl } from './navigation';
import { readBackendConfig } from '../backend/config';
import { validateCode, validateName, recentActivity } from './validation';
import { readRoomRequest, writeRoomRequest } from './room-request';
import { fetchWithDeadline } from '../backend/fetch';
import { bounded, ServiceError } from '../backend/errors';
function memoryStorage() { const data = new Map<string,string>(); return { getItem:(key:string)=>data.get(key)||null, setItem:(key:string,value:string)=>{data.set(key,value);}, removeItem:(key:string)=>{data.delete(key);} }; }
test('OAuth PKCE returns to the GitHub repository subpath and strips codes/errors', () => {
  const site='https://owen1night.github.io/el-zhady/';
  assert.equal(oauthRedirectUrl(site),site);
  const result=inspectOAuthCallback(site+'?code=one-time-code#/home');
  assert.equal(result.code,'one-time-code'); assert.equal(result.cleanUrl,site+'#/home'); assert.equal(result.isCallback,true);
  const failed=inspectOAuthCallback(site+'?error=access_denied&error_description=cancelled#/join');
  assert.equal(failed.failed,true); assert.equal(failed.code,null); assert.equal(failed.cleanUrl,site+'#/join');
  assert.equal(inspectOAuthCallback(site+'#error=access_denied').failed,true);
  assert.equal(inspectOAuthCallback(site+'?code=').failed,true);
  assert.equal(inspectOAuthCallback(site+'#/timeline').isCallback,false);
});
test('OAuth destination survives the redirect but cannot become an external/open redirect',()=>{
  const store=memoryStorage(); const destination='#/join?code=ABCDEF12';
  saveDestination(store,destination); assert.equal(consumeDestination(store),destination); assert.equal(consumeDestination(store),'#/profile');
  for(const unsafe of ['https://attacker.example/','//attacker.example','#/unknown','#/auth?next=https://attacker.example','#/profile?next=https://attacker.example']) assert.equal(safeDestination(unsafe),'#/profile');
  assert.equal(safeDestination('#/games'),'#/games');
  assert.equal(parseRoute('#/join?code=ABCDEF12').name,'join');
  assert.equal(joinUrl('https://owen1night.github.io/el-zhady/','ABCDEF12'),'https://owen1night.github.io/el-zhady/#/join?code=ABCDEF12');
});
test('configuration refuses secret/service-role keys, malformed keys and non-HTTPS projects',()=>{
  const jwt=(role:string)=>`header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
  assert.equal(readBackendConfig(undefined,undefined),null);
  assert.equal(readBackendConfig('https://project.supabase.co','sb_secret_NEVER_USE'),null);
  assert.equal(readBackendConfig('https://project.supabase.co',jwt('service_role')),null);
  assert.equal(readBackendConfig('https://project.supabase.co',jwt('authenticated')),null);
  assert.equal(readBackendConfig('http://project.supabase.co','sb_publishable_public'),null);
  assert.equal(readBackendConfig('https://project.supabase.co','plain-unknown-key'),null);
  assert.equal(readBackendConfig('https://project.supabase.co',jwt('anon'))?.url,'https://project.supabase.co');
  assert(readBackendConfig('https://project.supabase.co','sb_publishable_public'));
});
test('name/code validation supports Kazakh and rejects unsafe/invalid input',()=>{
  assert.equal(validateName('  Әлия  Мәншүк '),'Әлия Мәншүк');
  for(const invalid of ['А','<script>','a\nb','X'.repeat(41)]) assert.equal(validateName(invalid),null);
  assert.equal(validateCode(' abcdef12 '),'ABCDEF12'); assert.equal(validateCode('ABC-123'),null);
  assert.equal(recentActivity(new Date(100000).toISOString(),120000),true);
  assert.equal(recentActivity('invalid'),false);
});
test('admin retry request survives refresh and is scoped by account, not display name',()=>{
  const storage=memoryStorage(); const request={id:'10000000-0000-4000-8000-000000000001',title:'Тарих сайысы'};
  writeRoomRequest(storage,'account-1',request);
  assert.deepEqual(readRoomRequest(storage,'account-1'),request); assert.equal(readRoomRequest(storage,'account-2'),null);
});
test('authentication/request timeout is finite and rejects instead of endless loading',async()=>{
  await assert.rejects(()=>bounded(new Promise(()=>{}),10),(error:unknown)=>error instanceof ServiceError && error.code==='TIMEOUT');
  assert.equal(await bounded(Promise.resolve('ready'),50),'ready');
});

test('fetch timeout actually aborts the network operation without modern AbortSignal helpers', async () => {
  let aborted = false;
  const neverResponds = ((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => {
    init?.signal?.addEventListener('abort', () => { aborted = true; reject(new DOMException('Aborted', 'AbortError')); });
  })) as typeof fetch;
  await assert.rejects(() => fetchWithDeadline('https://service.invalid', undefined, 10, neverResponds), { name: 'AbortError' });
  assert.equal(aborted, true);
});
