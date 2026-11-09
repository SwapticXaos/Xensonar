#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const failures = [];
const requireText = (label, haystack, needle) => {
  if (!haystack.includes(needle)) failures.push(`${label} missing ${needle}`);
};
const forbidText = (label, haystack, needle) => {
  if (haystack.includes(needle)) failures.push(`${label} must not contain ${needle}`);
};

const appPath = 'src/App.tsx';
const hookPath = 'src/features/xensonar/audio/useAppAudioControlSchedulerRuntimeBoundary.ts';
const tasksPath = 'src/features/xensonar/audio/audioControlSchedulerTasks.ts';
const typesPath = 'src/features/xensonar/audio/audioControlSchedulerRuntimeTypes.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const scriptName = 'xensonar:check-app-audio-control-scheduler-runtime-boundary';

for (const rel of [appPath, hookPath, tasksPath, typesPath, mapPath, pkgPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const hook = exists(hookPath) ? read(hookPath) : '';
const tasks = exists(tasksPath) ? read(tasksPath) : '';
const types = exists(typesPath) ? read(typesPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };

requireText('App.tsx', app, 'useAppAudioControlSchedulerRuntimeBoundary({');
requireText('App.tsx', app, 'controlSchedulerRuntimeBoundaryExtractedFromAppTsx: true');
requireText('App.tsx', app, 'noWaveStarterBassOrRootFollowHotPathMoved: true');
requireText('App.tsx', app, 'fullBrowserSanityRequiredAfterThisCut: true');
for (const forbidden of [
  'const scheduler = createControlScheduler({',
  'scheduler.start();',
  'scheduler.stop();',
  'readDescriptorProbe(probe, audioNow)',
  'updateLiveMasteringSystem(liveMaster',
  'updateMyzelPostFxRouter(router',
  'updateTransientDriveDevice(device',]) {
  forbidText('App.tsx audio-control scheduler body', app, forbidden);
}

requireText('audio control scheduler boundary', hook, 'export function useAppAudioControlSchedulerRuntimeBoundary');
requireText('audio control scheduler boundary', hook, 'useEffect(() => {');
requireText('audio control scheduler boundary', hook, 'const scheduler = createControlScheduler({');
requireText('audio control scheduler boundary', hook, 'tasks: createAppAudioControlSchedulerTasks(args)');
requireText('audio control scheduler boundary', hook, 'scheduler.start();');
requireText('audio control scheduler boundary', hook, 'scheduler.stop();');
if (hook.split(/\r?\n/).length > 100) failures.push('audio control scheduler lifecycle owner must stay <= 100 lines');
for (const taskId of [
  'id: "collective-memory"',
  'id: "psychedelic-spiral"',
  'id: "transient-drive"',
  'id: "enter-psyfx"',
  'id: "schwarmdeuter"',
  'id: "myzel-post-fx"',
  'id: "live-mastering"',
  'id: "audio-tap-monitor"',
]) {
  requireText('audio control scheduler task owner', tasks, taskId);
  forbidText('audio control scheduler lifecycle owner', hook, taskId);
}
requireText('audio control scheduler task owner', tasks, 'export function createAppAudioControlSchedulerTasks');
for (const forbidden of ['useEffect(', 'createControlScheduler(', 'scheduler.start()', 'scheduler.stop()', 'requestAnimationFrame']) {
  forbidText('audio control scheduler task owner must not own lifecycle', tasks, forbidden);
}
requireText('audio control scheduler runtime types', types, 'export type AppAudioControlSchedulerRuntimeBoundaryArgs');
requireText('audio control scheduler boundary successor', types, 'deviceEnsureFunctionsComeFromAudioDeviceRackBoundary: true');
requireText('audio control scheduler boundary', types, 'controlSchedulerRuntimeBoundaryExtractedFromAppTsx: true');
requireText('audio control scheduler boundary', types, 'noWaveStarterBassOrRootFollowHotPathMoved: true');
requireText('audio control scheduler boundary', types, 'fullBrowserSanityRequiredAfterThisCut: true');
for (const forbidden of [
  'requestWaveStarterLaneAttack',
  'emitWaveStarterAttack',
  'playBassNote',
  'buildAppStableRhythmLaneBassNoteActionProbe',
  'useAppStableRhythmLaneSchedulerEffectProbe',
  'startAppStableRhythmLaneSchedulerLoopProbe',
  'useRootFollow',
  'rootFollow',
  'materialLoopPlayback',
  'AudioWorklet',
  'window.addEventListener',
  'requestAnimationFrame',
]) {
  forbidText('audio control scheduler lifecycle owner should not absorb live attack/root-follow paths', hook, forbidden);
  forbidText('audio control scheduler task owner should not absorb live attack/root-follow paths', tasks, forbidden);
}

requireText('Monolith map status union', map, "'audio-control-scheduler-runtime-boundary-extracted'");
if (!map.includes("status: 'audio-control-scheduler-runtime-boundary-extracted'") && !map.includes("status: 'audio-device-rack-runtime-boundary-extracted'") && !map.includes("status: 'audio-readiness-runtime-boundary-extracted'") && !map.includes("status: 'resonance-keyboard-input-effect-boundary-extracted'") && !map.includes("status: 'drone-graph-routing-boundary-extracted'")) failures.push('Monolith map livePerformanceState missing audio-control successor status');
if (!map.includes("firstSafeMove: 'audio-control-scheduler-runtime-boundary-extracted'") && !map.includes("firstSafeMove: 'audio-device-rack-runtime-boundary-extracted'") && !map.includes("firstSafeMove: 'audio-readiness-runtime-boundary-extracted'") && !map.includes("firstSafeMove: 'resonance-keyboard-input-effect-boundary-extracted'") && !map.includes("firstSafeMove: 'drone-graph-routing-boundary-extracted'")) failures.push('Monolith map next cuts missing audio-control successor firstSafeMove');
requireText('Monolith map hot-path guard', map, 'no WaveStarter/Bass/Root-Follow hot path moved');

if (pkg.scripts?.[scriptName] !== 'node tools/check-app-audio-control-scheduler-runtime-boundary.mjs') {
  failures.push(`package script missing ${scriptName}`);
}

const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  hookLines: hook.split(/\r?\n/).length,
  taskOwnerLines: tasks.split(/\r?\n/).length,
  typeOwnerLines: types.split(/\r?\n/).length,
  contract: {
    audioControlSchedulerRuntimeBoundaryExtractedFromAppTsx: true,
    deviceEnsureFunctionsComeFromAudioDeviceRackBoundary: true,
    noWaveStarterBassOrRootFollowHotPathMoved: true,
    fullBrowserSanityRequiredAfterThisCut: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-audio-control-scheduler-runtime-boundary] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-audio-control-scheduler-runtime-boundary] ok');
console.log(JSON.stringify(report, null, 2));
