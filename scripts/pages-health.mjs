// Public HTTPS release verification. No backend credentials or database access.
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir, mkdir, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
const published = 'https://owen1night.github.io/el-zhady/';
const manifestPath = 'work/pages-manifest.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function validPath(path) {
  return path === 'index.html' || path === 'deployment.json' || /^(?:assets|licenses)\/[A-Za-z0-9_.-]+$/.test(path);
}
if (process.argv[2] === 'create') {
  const commit = process.env.GITHUB_SHA;
  if (!/^[a-f0-9]{40}$/.test(commit || '')) throw new Error('A full release commit SHA is required');
  if ((process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL) !== published) throw new Error('Unexpected public deployment URL');
  await writeFile('dist/deployment.json', JSON.stringify({ commit }) + '\n');
  const paths = ['index.html', 'deployment.json', ...(await readdir('dist/assets')).map(f => `assets/${f}`), ...(await readdir('dist/licenses')).map(f => `licenses/${f}`)];
  if (!paths.every(validPath)) throw new Error('Unexpected asset path');
  const files = await Promise.all(paths.map(async path => ({ path, sha256: hash(await readFile(join('dist', path))) })));
  await mkdir('work', { recursive: true });
  await writeFile(manifestPath, JSON.stringify({ commit, url: published, files }, null, 2) + '\n');
  console.log(`Prepared public verification for ${commit}: ${files.length} files`);
} else if (process.argv[2] === 'verify') {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.url !== published || manifest.commit !== process.env.GITHUB_SHA || !Array.isArray(manifest.files) || manifest.files.length < 4 || !manifest.files.every(f => validPath(f.path) && /^[a-f0-9]{64}$/.test(f.sha256))) throw new Error('Invalid release verification manifest');
  const expected = new Map(manifest.files.map(f => [f.path, f.sha256]));
  for (const name of ['index.html','deployment.json']) if (!expected.has(name)) throw new Error(`Missing release file: ${name}`);
  async function check(path) {
    const url = new URL(path, manifest.url);
    url.searchParams.set('release', manifest.commit);
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'Cache-Control': 'no-cache' } });
    if (response.status !== 200) throw new Error(`${path}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (hash(bytes) !== expected.get(path)) throw new Error(`${path}: deployed bytes do not match this release`);
    if (path === 'deployment.json' && JSON.parse(bytes.toString('utf8')).commit !== manifest.commit) throw new Error('Published commit marker differs');
  }
  let lastError;
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      // Check the release marker first; allow Pages CDN publication to settle.
      await check('deployment.json');
      for (let i = 0; i < manifest.files.length; i += 5) await Promise.all(manifest.files.slice(i, i + 5).map(f => check(f.path)));
      const summary = `Verified ${published}\nDeployed commit: ${manifest.commit}\nHTTP 200 and SHA-256 matched for all ${manifest.files.length} files (HTML, JS, CSS, fonts, licences and commit marker).\n`;
      console.log(summary);
      if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
      process.exit(0);
    } catch (error) {
      lastError = error;
      console.log(`Public verification attempt ${attempt}/12: ${error.message}`);
      if (attempt < 12) await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  throw lastError;
} else {
  throw new Error('Use create or verify');
}
