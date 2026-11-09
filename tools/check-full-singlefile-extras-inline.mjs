import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const htmlPath = path.resolve(root, process.argv[2] ?? 'dist/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const keys = ['resonanzwerk', 'zone', 'strangeAttractors', 'melodieQuest'];
const problems = [];

if (!html.includes('id="xensonar-embedded-standalone-payload"')) {
  problems.push('missing inline embedded standalone payload script');
}
if (!html.includes('window.__XENSONAR_EMBEDDED_STANDALONE_APPS__=')) {
  problems.push('missing window.__XENSONAR_EMBEDDED_STANDALONE_APPS__ assignment');
}
if (html.includes('Core-Test-Build: Irrlicht/Xenpolar ist als Extras-Körper abgetrennt.')) {
  problems.push('core bridge message leaked into full singlefile HTML');
}
for (const key of keys) {
  if (!html.includes(`"${key}"`)) problems.push(`missing inline standalone key ${key}`);
}

const rootMatches = html.match(/id="root"/g) ?? [];
if (rootMatches.length !== 1) {
  problems.push(`expected exactly one #root in HTML shell, found ${rootMatches.length}`);
}

if (problems.length) {
  console.error('[xensonar-full-singlefile-extras-inline] FAILED');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log('[xensonar-full-singlefile-extras-inline] OK');
console.log(JSON.stringify({ html: path.relative(root, htmlPath), bytes: fs.statSync(htmlPath).size, embeddedKeys: keys, rootCount: rootMatches.length }, null, 2));
