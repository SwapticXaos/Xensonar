#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const notes = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function requireIncludes(file, pattern, label = pattern) {
  const text = read(file);
  if (!text.includes(pattern)) failures.push(`${file} does not include ${label}`);
}

function requireFile(file) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing ${file}`);
}

requireFile('package.json');
requireFile('package-lock.json');
requireFile('.npmrc');
requireFile('tools/prepare-vite-html-toolchain.mjs');
requireFile('tools/build-vite-html-portable.mjs');
requireFile('tools/run-command-with-heartbeat.mjs');

const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts || {};
if (scripts['patch:setup'] !== 'node tools/prepare-vite-html-toolchain.mjs') {
  failures.push(`patch:setup must use prepare-vite-html-toolchain.mjs; got ${scripts['patch:setup'] || '<missing>'}`);
}
if (!String(scripts['patch:setup:npm-ci'] || '').startsWith('npm ci')) {
  failures.push('patch:setup:npm-ci must keep a raw npm ci escape hatch');
}
if (!String(scripts['patch:html:core'] || '').includes('build-vite-html-portable.mjs')) failures.push('patch:html:core must use portable HTML builder');
if (!String(scripts['patch:html:full'] || '').includes('build-vite-html-portable.mjs')) failures.push('patch:html:full must use portable HTML builder');

const npmrc = read('.npmrc');
for (const setting of ['prefer-offline=true', 'audit=false', 'fund=false', 'progress=false']) {
  if (!npmrc.includes(setting)) failures.push(`.npmrc missing ${setting}`);
}

requireIncludes('tools/prepare-vite-html-toolchain.mjs', 'runWithHeartbeat', 'heartbeat-wrapped npm ci');
requireIncludes('tools/prepare-vite-html-toolchain.mjs', 'XENSONAR_INSTALL_TIMEOUT_MS', 'configurable install timeout');
requireIncludes('tools/prepare-vite-html-toolchain.mjs', 'viteReady()', 'vite readiness check');
requireIncludes('tools/build-vite-html-portable.mjs', 'prepare-vite-html-toolchain.mjs', 'portable builder prepare step');
requireIncludes('tools/build-vite-html-portable.mjs', 'XENSONAR_BUILD_TIMEOUT_MS', 'configurable build timeout');

const lock = JSON.parse(read('package-lock.json'));
if (lock.version !== pkg.version) notes.push(`package-lock root version ${lock.version} differs from package.json ${pkg.version}`);
if (lock.packages?.['']?.version !== pkg.version) notes.push(`package-lock packages[""].version ${lock.packages?.['']?.version} differs from package.json ${pkg.version}`);

if (notes.length) {
  console.warn('[vite-harness-path] notes:');
  for (const note of notes) console.warn(`- ${note}`);
}
if (failures.length) {
  console.error('[vite-harness-path] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[vite-harness-path] OK');
console.log(JSON.stringify({
  version: pkg.version,
  patchSetup: scripts['patch:setup'],
  rawNpmCiEscapeHatch: scripts['patch:setup:npm-ci'],
  coreHtml: scripts['patch:html:core'],
  fullHtml: scripts['patch:html:full'],
}, null, 2));
