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
const rackPath = 'src/features/xensonar/audio/useAppAudioDeviceRackRuntimeBoundary.ts';
const controlPath = 'src/features/xensonar/audio/useAppAudioControlSchedulerRuntimeBoundary.ts';
const controlTypesPath = 'src/features/xensonar/audio/audioControlSchedulerRuntimeTypes.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const scriptName = 'xensonar:check-app-audio-device-rack-runtime-boundary';

for (const rel of [appPath, rackPath, controlPath, controlTypesPath, mapPath, pkgPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const rack = exists(rackPath) ? read(rackPath) : '';
const control = exists(controlPath) ? read(controlPath) : '';
const controlTypes = exists(controlTypesPath) ? read(controlTypesPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };

requireText('App.tsx', app, 'useAppAudioDeviceRackRuntimeBoundary({');
requireText('App.tsx', app, 'const audioDeviceRackRuntimeBoundary = useAppAudioDeviceRackRuntimeBoundary({');
requireText('App.tsx', app, 'deviceEnsureFunctionsComeFromAudioDeviceRackBoundary: true');
requireText('App.tsx', app, 'ensureRecordingDestination,');

for (const forbidden of [
  'const ensureFinalMixBus = (ctx: AudioContext) => ensureFinalMixBusRuntime',
  'const ensureDrumMixBus = (ctx: AudioContext) => ensureDrumMixBusRuntime',
  'const getLiveMasterBus = (ctx: AudioContext',
  'const getLiveMasterEffectBus = (ctx: AudioContext',
  'const recordAudioTapSnapshot = (audioNow: number) => {',
  'const beginTransientEvent = (source: TransientSource',
  'const ensureCollectiveMemoryFx = (ctx: AudioContext) => {',
  'const ensurePsychedelicSpiralDevice = (ctx: AudioContext) => {',
  'const ensureTransientDriveDevice = (ctx: AudioContext) => {',
  'const ensureEnterHoldPsyFxDevice = (ctx: AudioContext) => {',
  'const ensureSchwarmdeuterDevice = (ctx: AudioContext) => {',
  'const ensureMyzelPostFxRouter = (ctx: AudioContext) => {',
  'const collectSchwarmSnapshots = (): ParticleVoiceSnapshot[] => {',
  'ensureLiveMasterRecordingDestinationRuntime(ctx, liveMasterBusRuntimeRefs',
]) {
  forbidText('App.tsx audio-device rack body', app, forbidden);
}

requireText('audio device rack boundary', rack, 'export function useAppAudioDeviceRackRuntimeBoundary');
for (const required of [
  'ensureFinalMixBusRuntime(ctx, args.liveMasterBusRuntimeRefs)',
  'ensureDrumMixBusRuntime(ctx, args.liveMasterBusRuntimeRefs)',
  'getLiveMasterBusRuntime(ctx, args.liveMasterBusRuntimeRefs, role)',
  'getLiveMasterEffectBusRuntime(ctx, args.liveMasterBusRuntimeRefs, effect)',
  'ensureLiveMasterRecordingDestinationRuntime(ctx, args.liveMasterBusRuntimeRefs, mode)',
  'createAudioTapSnapshot',
  'createCollectiveMemoryEffect',
  'createPsychedelicSpiralDevice',
  'createTransientDriveDevice',
  'createEnterHoldPsyFxDevice',
  'new Schwarmdeuter',
  'createMyzelPostFxRouter',
  'collectSchwarmSnapshots',
  'audioDeviceRackRuntimeBoundaryExtractedFromAppTsx: true',
  'noWaveStarterBassOrRootFollowHotPathMoved: true',
  'fullBrowserSanityRequiredAfterThisCut: true',
]) {
  requireText('audio device rack boundary', rack, required);
}

for (const forbidden of [
  'requestWaveStarterLaneAttack',
  'emitWaveStarterAttack',
  'playBassNote',
  'buildAppStableRhythmLaneBassNoteActionProbe',
  'useAppStableRhythmLaneSchedulerEffectProbe',
  'startAppStableRhythmLaneSchedulerLoopProbe',
  'useRootFollow',
  'materialLoopPlayback',
  'AudioWorklet',
  'window.addEventListener',
  'requestAnimationFrame',
]) {
  forbidText('audio device rack boundary should not absorb live attack/root-follow paths', rack, forbidden);
}

if (!control.includes('deviceEnsureFunctionsComeFromAudioDeviceRackBoundary: true') && !controlTypes.includes('deviceEnsureFunctionsComeFromAudioDeviceRackBoundary: true')) failures.push('audio control scheduler lineage missing deviceEnsureFunctionsComeFromAudioDeviceRackBoundary: true');
forbidText('audio control scheduler', control, 'appStillOwnsDeviceEnsureFunctions: true');

requireText('Monolith map status union', map, "'audio-device-rack-runtime-boundary-extracted'");
if (!map.includes("status: 'audio-device-rack-runtime-boundary-extracted'") && !map.includes("status: 'audio-readiness-runtime-boundary-extracted'") && !map.includes("status: 'resonance-keyboard-input-effect-boundary-extracted'") && !map.includes("status: 'drone-graph-routing-boundary-extracted'")) failures.push('Monolith map livePerformanceState missing audio-device-rack successor status');
if (!map.includes("firstSafeMove: 'audio-device-rack-runtime-boundary-extracted'") && !map.includes("firstSafeMove: 'audio-readiness-runtime-boundary-extracted'") && !map.includes("firstSafeMove: 'resonance-keyboard-input-effect-boundary-extracted'") && !map.includes("firstSafeMove: 'drone-graph-routing-boundary-extracted'")) failures.push('Monolith map next cuts missing audio-device-rack successor firstSafeMove');
if (!map.includes('audio device rack / bus and FX ensure surface now lives outside App.tsx') && !map.includes('audio device rack')) failures.push('Monolith map current role missing audio-device-rack lineage');

if (pkg.scripts?.[scriptName] !== 'node tools/check-app-audio-device-rack-runtime-boundary.mjs') {
  failures.push(`package script missing ${scriptName}`);
}

const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  rackLines: rack.split(/\r?\n/).length,
  contract: {
    audioDeviceRackRuntimeBoundaryExtractedFromAppTsx: true,
    noWaveStarterBassOrRootFollowHotPathMoved: true,
    fullBrowserSanityRequiredAfterThisCut: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-audio-device-rack-runtime-boundary] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-audio-device-rack-runtime-boundary] ok');
console.log(JSON.stringify(report, null, 2));
