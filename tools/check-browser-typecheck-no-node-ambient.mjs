#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const browserBasePath = resolve(root, 'tsconfig.typecheck.browser.json');
const browserBase = JSON.parse(readFileSync(browserBasePath, 'utf8'));
const failures = [];
if (browserBase.extends !== './tsconfig.app.json') failures.push('tsconfig.typecheck.browser.json must extend ./tsconfig.app.json');
if (!browserBase.compilerOptions || !Array.isArray(browserBase.compilerOptions.types) || browserBase.compilerOptions.types.length !== 0) {
  failures.push('tsconfig.typecheck.browser.json must set compilerOptions.types to [] to keep @types/node out of browser/source chunks');
}
for (const name of readdirSync(root)) {
  if (!/^tsconfig\.typecheck\.(micro|chunk|half-|entry)/.test(name) || !name.endsWith('.json')) continue;
  const path = resolve(root, name);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  if (data.extends !== './tsconfig.typecheck.browser.json') {
    failures.push(`${name} must extend ./tsconfig.typecheck.browser.json, not the generic app config`);
  }
}
if (failures.length) {
  console.error('[browser-typecheck-no-node-ambient] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[browser-typecheck-no-node-ambient] PASS: browser/source typecheck corridors inherit types:[] and do not load @types/node ambiently.');
