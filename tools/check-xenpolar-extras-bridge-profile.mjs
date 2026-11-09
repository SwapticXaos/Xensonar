#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repo = path.resolve(path.dirname(__filename), '..');
const read = (rel) => fs.readFileSync(path.join(repo, rel), 'utf8');
const fail = (message) => {
  console.error(`[xenpolar-extras-bridge-profile] ${message}`);
  process.exit(1);
};

const appText = read('src/App.tsx');
const viteText = read('vite.config.ts');
const fullBridgeText = read('src/features/xensonar/rooms/xenpolarExtrasBridge.full.ts');
const coreBridgeText = read('src/features/xensonar/rooms/xenpolarExtrasBridge.core.ts');
const facadeText = read('src/features/xensonar/rooms/xenpolarExtrasBridge.ts');
const packageJson = JSON.parse(read('package.json'));

const forbiddenAppEdges = [
  './features/xenpolar/',
  '@/features/xenpolar/',
  'features/xenpolar/rooms/useXenpolarController',
  'features/xenpolar/interpretation/xenpolarLoopInterpreter',
  'features/xenpolar/rooms/irrlichtArenaAudioPlayback',
  'features/xenpolar/rooms/irrlichtArenaAudioMath',
  'features/xenpolar/rooms/irrlichtArenaState',
];
const appViolations = forbiddenAppEdges.filter((needle) => appText.includes(needle));
if (appViolations.length) fail(`App.tsx still imports Extras/Xenpolar directly: ${appViolations.join(', ')}`);

if (!appText.includes('@/features/xensonar/rooms/xenpolarExtrasBridge')) {
  fail('App.tsx does not use the explicit xenpolarExtrasBridge import seam.');
}

if (!viteText.includes('xenpolarExtrasBridge.core.ts') || !viteText.includes('xenpolarExtrasBridge.full.ts')) {
  fail('vite.config.ts does not alias the bridge to core/full implementations.');
}

if (coreBridgeText.includes('@/features/xenpolar/') || coreBridgeText.includes('../features/xenpolar/') || coreBridgeText.includes('../../xenpolar/')) {
  fail('core bridge must not import the Extras/Xenpolar body.');
}

const requiredFullBridgeEdges = [
  '@/features/xenpolar/rooms/useXenpolarController',
  '@/features/xenpolar/interpretation/xenpolarLoopInterpreter',
  '@/features/xenpolar/rooms/irrlichtArenaAudioPlayback',
];
const missingFullBridgeEdges = requiredFullBridgeEdges.filter((needle) => !fullBridgeText.includes(needle));
if (missingFullBridgeEdges.length) fail(`full bridge is missing real Extras edges: ${missingFullBridgeEdges.join(', ')}`);

if (!facadeText.includes("./xenpolarExtrasBridge.core")) {
  fail('default TypeScript facade should remain the core-safe fallback; Vite aliases full builds to xenpolarExtrasBridge.full.ts.');
}

if (!packageJson.scripts?.['build:modular:core'] || !packageJson.scripts?.['build:core-singlefile']) {
  fail('core build scripts are missing.');
}

console.log('[xenpolar-extras-bridge-profile] ok: App.tsx uses bridge seam; default facade is core-safe; Vite full profile keeps real Extras implementation.');
