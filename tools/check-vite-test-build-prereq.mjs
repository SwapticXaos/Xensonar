#!/usr/bin/env node
import fs from 'node:fs';

function fail(message) {
  console.error(`[vite-test-build-prereq] ${message}`);
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const scripts = packageJson.scripts || {};

if (scripts['patch:setup'] !== 'npm ci --prefer-offline --no-audit --no-fund') {
  fail('patch:setup must remain the normal npm-ci path');
}
if (scripts['patch:setup:cache'] !== 'node tools/hydrate-node-modules-from-npm-cache.mjs') {
  fail('missing cache hydration fallback script');
}
if (!String(scripts['build:core-test'] || '').includes('XENSONAR_CORE_TEST_BUILD=1')) {
  fail('build:core-test must keep the real core-test Vite profile');
}

const hydrateTool = fs.readFileSync('tools/hydrate-node-modules-from-npm-cache.mjs', 'utf8');
if (!hydrateTool.includes('isCompatibleOptionalPackage')) {
  fail('cache hydration fallback must skip incompatible optional native packages');
}
if (!hydrateTool.includes("'.bin'")) {
  fail('cache hydration fallback must reconstruct bin links');
}

const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
if (!viteConfig.includes('viteSingleFile()')) {
  fail('Vite test HTML must still be produced by vite-plugin-singlefile');
}
if (!viteConfig.includes('__XENSONAR_CORE_TEST_BUILD__')) {
  fail('Vite config must preserve the compile-time core-test marker');
}

console.log('[vite-test-build-prereq] OK');
