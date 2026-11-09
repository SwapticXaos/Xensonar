#!/usr/bin/env node
import { createCheck } from './lib/check-kit.mjs';

const check = createCheck('check-app-xenpolar-game-arena-runtime-boundary');
const { read, exists, requireText, forbidText, failures } = check;

const files = {
  app: 'src/App.tsx',
  boundary: 'src/features/xensonar/rooms/useAppXenpolarGameArenaRuntimeBoundary.ts',
  frameRuntime: 'src/features/xensonar/rooms/useIrrlichtArenaFrameRuntime.ts',
  gameplay: 'src/features/xensonar/rooms/irrlichtArenaGameplayFrame.ts',
  renderer: 'src/features/xensonar/rooms/irrlichtArenaFrameRenderer.ts',
  commons: 'src/features/xensonar/rooms/irrlichtArenaLevel3CommonsFrame.ts',
  types: 'src/features/xensonar/rooms/irrlichtArenaRuntimeBoundaryTypes.ts',
  pkg: 'package.json',
};

for (const rel of Object.values(files)) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(files.app) ? read(files.app) : '';
const boundary = exists(files.boundary) ? read(files.boundary) : '';
const frameRuntime = exists(files.frameRuntime) ? read(files.frameRuntime) : '';
const gameplay = exists(files.gameplay) ? read(files.gameplay) : '';
const renderer = exists(files.renderer) ? read(files.renderer) : '';
const commons = exists(files.commons) ? read(files.commons) : '';
const types = exists(files.types) ? read(files.types) : '';
const pkg = exists(files.pkg) ? JSON.parse(read(files.pkg)) : { scripts: {} };

requireText('App.tsx', app, 'useAppXenpolarGameArenaRuntimeBoundary({');
requireText('App.tsx material bridge', app, 'enterArenaWorkspace,');
requireText('App.tsx game scene bridge', app, 'startGameRun,');

requireText('arena boundary', boundary, 'useIrrlichtArenaFrameRuntime({');
requireText('arena boundary', boundary, 'const enterArenaWorkspace = (startLevel: number) => {');
requireText('arena boundary', boundary, 'const startGameRun = async () => {');
requireText('arena boundary', boundary, 'return { enterArenaWorkspace, startGameRun };');
for (const forbidden of [
  'requestAnimationFrame(',
  'commonsClock +=',
  'commonsStep = (g.commonsStep + 1) % 16',
  'drawSurrealLandscape',
  'const tick = (now: number)',
]) forbidText('arena composition boundary', boundary, forbidden);

requireText('frame runtime', frameRuntime, 'export function useIrrlichtArenaFrameRuntime');
requireText('frame runtime', frameRuntime, 'runIrrlichtArenaLevel3PreGameplayFrame(state, dt);');
requireText('frame runtime', frameRuntime, 'runIrrlichtArenaGameplayFrame({');
requireText('frame runtime', frameRuntime, 'drawIrrlichtArenaFrame(ctx, state, now);');
requireText('frame runtime', frameRuntime, 'runIrrlichtArenaLevel3PostGameplayFrame(state, dt, secondaryLevel3Dt);');
requireText('frame runtime', frameRuntime, 'rafId = requestAnimationFrame(tick);');
requireText('frame runtime', frameRuntime, 'return () => cancelAnimationFrame(rafId);');
if ((frameRuntime.match(/useEffect\s*\(/g) || []).length !== 1) failures.push('frame runtime must own exactly one React effect');
if ((frameRuntime.match(/requestAnimationFrame\(tick\)/g) || []).length !== 2) failures.push('frame runtime must have exactly one initial and one continuation RAF scheduling site');

requireText('gameplay frame', gameplay, 'export function runIrrlichtArenaGameplayFrame');
requireText('gameplay frame', gameplay, 'captureIrrlichtArenaEvent(');
for (const forbidden of ['requestAnimationFrame(', 'commonsClock', 'commonsStepDur']) forbidText('gameplay frame', gameplay, forbidden);

requireText('renderer', renderer, 'export function drawIrrlichtArenaFrame');
requireText('renderer', renderer, 'function drawSurrealLandscape');
for (const forbidden of ['requestAnimationFrame(', 'AudioContext', 'playScheduledTone']) forbidText('renderer', renderer, forbidden);

requireText('Level-3 commons owner', commons, 'runIrrlichtArenaLevel3PreGameplayFrame');
requireText('Level-3 commons owner', commons, 'runIrrlichtArenaLevel3PostGameplayFrame');
requireText('Level-3 commons owner', commons, 'g.commonsClock += dt;');
requireText('Level-3 commons owner', commons, 'g.commonsStep = (g.commonsStep + 1) % 16;');
requireText('Level-3 commons owner', commons, 'g.bolts.push');
for (const forbidden of ['requestAnimationFrame(', 'useEffect(', 'setGameHud(']) forbidText('Level-3 commons owner', commons, forbidden);

requireText('arena boundary types', types, 'export type AppXenpolarGameKeyState');
requireText('arena boundary types', types, 'export type AppXenpolarGamePlayScheduledTone');

const boundaryLines = boundary.split(/\r?\n/).length;
const frameRuntimeLines = frameRuntime.split(/\r?\n/).length;
if (boundaryLines > 260) failures.push(`arena composition boundary too large: ${boundaryLines} > 260`);
if (frameRuntimeLines > 200) failures.push(`arena frame runtime too large: ${frameRuntimeLines} > 200`);

const rafOwners = [boundary, frameRuntime, gameplay, renderer, commons].filter((text) => text.includes('requestAnimationFrame(')).length;
if (rafOwners !== 1) failures.push(`expected exactly one Arena RAF owner, got ${rafOwners}`);
const commonsOwners = [boundary, frameRuntime, gameplay, renderer, commons].filter((text) => text.includes('commonsClock +=')).length;
if (commonsOwners !== 1) failures.push(`expected exactly one commonsClock write owner, got ${commonsOwners}`);

const scriptName = 'xensonar:check-app-xenpolar-game-arena-runtime-boundary';
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-xenpolar-game-arena-runtime-boundary.mjs') {
  failures.push(`package script missing ${scriptName}`);
}

const report = {
  ok: failures.length === 0,
  boundaryLines,
  frameRuntimeLines,
  rafOwners,
  commonsOwners,
  contract: {
    patch281LegacyRafOwners: 4,
    patch285RafOwners: 1,
    mainGameplayOrderPreserved: 'legacy-pre -> gameplay/render/HUD -> legacy-post',
    commonsClockSingleOwner: true,
    coreBuildProfileStillUsesDormantBoundaryReplacement: true,
    noRootFollowOrWellenstarterOwnershipMoved: true,
  },
  failures,
};

check.finish(report);
