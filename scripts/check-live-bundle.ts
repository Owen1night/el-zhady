import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const seed=await readFile('supabase/migrations/20261101000300_live_quiz_content_v1.sql','utf8');
const prompts=[...seed.matchAll(/\('30000000-[^']+','[^']+',\d+,'((?:[^']|'')*)'/g)].map(m=>m[1].replaceAll("''","'"));
assert.equal(prompts.length,10,'all ten private prompts must be checked');
const files=await readdir('dist/assets');
const payload=(await Promise.all(files.filter(f=>f.endsWith('.js')).map(f=>readFile(`dist/assets/${f}`,'utf8')))).join('\n');
for(const value of ['LIVE_QUIZ_PRIVATE_CONTENT_V1','30000000-0000-4000-8000-',...prompts]) assert(!payload.includes(value),`Private quiz content entered the browser bundle`);
console.log('Bundle checked: private seed marker, stable question IDs and all ten prompts absent. Reveal field names are intentionally allowed.');
