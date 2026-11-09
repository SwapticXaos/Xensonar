#!/usr/bin/env node
import fs from 'node:fs';

function fail(message) {
  console.error(`[portable-vite-html-contract] ${message}`);
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const scripts = packageJson.scripts || {};
const requiredScripts = {
  'patch:setup:auto': 'node tools/prepare-vite-html-toolchain.mjs',
  'patch:html:core': 'node tools/build-vite-html-portable.mjs --profile core --slug core_test',
  'patch:html:full': 'node tools/build-vite-html-portable.mjs --profile full --slug full_browser',
  'xensonar:check-raster-workbench-drag-session-wiring': 'node tools/check-raster-workbench-drag-session-wiring.mjs',
};
for (const [name, expected] of Object.entries(requiredScripts)) {
  if (scripts[name] !== expected) fail(`${name} must be ${expected}`);
}

const prepare = fs.readFileSync('tools/prepare-vite-html-toolchain.mjs', 'utf8');
if (!prepare.includes('XENSONAR_NODE_MODULES_SOURCE')) fail('prepare tool must support old node_modules source import');
if (!prepare.includes('hydrate-node-modules-from-npm-cache.mjs')) fail('prepare tool must preserve cache hydration fallback');
if (!prepare.includes('run-command-with-heartbeat.mjs')) fail('prepare tool must run npm ci through heartbeat wrapper');
if (!prepare.includes('rebuildBinLinks')) fail('prepare tool must reconstruct .bin links after import/hydration');

const builder = fs.readFileSync('tools/build-vite-html-portable.mjs', 'utf8');
if (!builder.includes('XENSONAR_BUILD_TIMEOUT_MS')) fail('portable builder must expose generous build timeout');
if (!builder.includes('build:core-singlefile')) fail('portable builder must preserve core singlefile profile');
if (!builder.includes('build:full-browser-html')) fail('portable builder must preserve full browser html profile');
if (!builder.includes('check-tailwind-singlefile-css.mjs')) fail('portable builder must reject broken Tailwind singlefile CSS before artifact copy');
if (!builder.includes('check-raster-workbench-drag-session-wiring.mjs')) fail('portable builder must reject broken Raster-Werkbank drag-session wiring before artifact copy');

const rasterCheck = fs.readFileSync('tools/check-raster-workbench-drag-session-wiring.mjs', 'utf8');
if (!rasterCheck.includes('rackRowRefs')) fail('raster workbench check must forbid the stale rackRowRefs path');
if (!rasterCheck.includes('option.tuning')) fail('raster workbench check must forbid the stale option.tuning path');
if (!rasterCheck.includes('registerRow')) fail('raster workbench check must require rackDragSession.registerRow');

const shell = fs.readFileSync('tools/xensonar-patch-html.sh', 'utf8');
if (!shell.includes('patch:setup:auto')) fail('patch shell must use portable setup path');
if (!shell.includes('run-command-with-heartbeat.mjs')) fail('patch shell must run Vite through heartbeat wrapper');

console.log('[portable-vite-html-contract] OK');
