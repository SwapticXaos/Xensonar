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
const hookPath = 'src/features/xensonar/audio/useAppAudioReadinessRuntimeBoundary.ts';
const rackPath = 'src/features/xensonar/audio/useAppAudioDeviceRackRuntimeBoundary.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-audio-readiness-runtime-boundary';

for (const rel of [appPath, hookPath, rackPath, mapPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const hook = exists(hookPath) ? read(hookPath) : '';
const rack = exists(rackPath) ? read(rackPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

requireText('App.tsx', app, 'useAppAudioReadinessRuntimeBoundary({');
requireText('App.tsx', app, 'const audioReadinessRuntimeBoundary = useAppAudioReadinessRuntimeBoundary({');
requireText('App.tsx', app, 'warmMyzelAudioRuntime,');
requireText('App.tsx', app, 'applyRealtimeDroneOvertones,');
requireText('App.tsx', app, 'ensureMyzelSynth,');
requireText('App.tsx', app, 'buildRoom3TopologyActions({');
requireText('App.tsx', app, 'warmMyzelAudioRuntime,');

for (const forbidden of [
  'const initAudio = async () => {',
  'const prewarmAudioRuntime = async (ctx: AudioContext) => {',
  'const ensureAudioReady = async () => {',
  'const ensureKeyboardPitchAudioReadyOnce = () => {',
  'void ensureXensonarBlobWorkletSmokeTest(ctx);',
  'scheduleSilentAudioWarmupSweep(ctx, [mainBus, mainBus, droneBus, rhythmBus, spaceBus]);',
]) {
  forbidText('App.tsx audio-readiness body', app, forbidden);
}

requireText('audio readiness boundary', hook, 'export function useAppAudioReadinessRuntimeBoundary');
for (const required of [
  'new window.AudioContext({ latencyHint: "interactive" })',
  'args.ensureFinalMixBus(ctx)',
  'args.getLiveMasterBus(ctx, "drone")',
  'args.getLiveMasterBus(ctx, "rhythm")',
  'args.getLiveMasterBus(ctx, "space")',
  'scheduleSilentAudioWarmupSweep(ctx, [mainBus, mainBus, droneBus, rhythmBus, spaceBus])',
  'args.applyRealtimeDroneOvertones()',
  'args.ensureMyzelSynth(ctx)',
  'ensureXensonarBlobWorkletSmokeTest(ctx)',
  'recordAudioPressureAdaptiveAction("keyboard-input-audio-ready-latched")',
  'reportXensonarPromiseFailure("audio", "keyboard-pitch-audio-ready-latch", error)',
  'audioReadinessRuntimeBoundaryExtractedFromAppTsx: true',
  'noWaveStarterBassRootFollowOrRoom3BodyHotPathMoved: true',
  'fullBrowserSanityRequiredAfterThisCut: true',
]) {
  requireText('audio readiness boundary', hook, required);
}

for (const forbidden of [
  'requestWaveStarterLaneAttack',
  'emitWaveStarterAttack',
  'playWaveStartSound',
  'playBassNote',
  'buildAppStableRhythmLaneBassNoteActionProbe',
  'useAppStableRhythmLaneSchedulerEffectProbe',
  'startAppStableRhythmLaneSchedulerLoopProbe',
  'useRootFollow',
  'materialLoopPlayback',
  'triggerRoom3BodyExciterPlayback',
  'runParticleNexusToneOrchestrator',
  'window.addEventListener',
  'requestAnimationFrame',
]) {
  forbidText('audio readiness boundary should not absorb live attack/root-follow/body paths', hook, forbidden);
}

requireText('audio device rack boundary still owns device rack', rack, 'audioDeviceRackRuntimeBoundaryExtractedFromAppTsx: true');
requireText('Monolith map status union', map, "'audio-readiness-runtime-boundary-extracted'");
if (!map.includes("status: 'audio-readiness-runtime-boundary-extracted'") && !map.includes("status: 'drone-graph-routing-boundary-extracted'")) failures.push('Monolith map livePerformanceState missing audio-readiness status or successor status');
if (!map.includes('audio-readiness warmup/latch surface now live outside App.tsx') && !map.includes('audio-readiness')) failures.push('Monolith map current role missing audio-readiness lineage');
if (!map.includes("firstSafeMove: 'audio-readiness-runtime-boundary-extracted'") && !map.includes("firstSafeMove: 'resonance-keyboard-input-effect-boundary-extracted'") && !map.includes("firstSafeMove: 'drone-graph-routing-boundary-extracted'") && !map.includes("firstSafeMove: 'drone-frame-mix-sync-boundary-extracted'") && !map.includes("firstSafeMove: 'myzel-topology-runtime-loop-boundary-extracted'") && !map.includes("firstSafeMove: 'room3-body-audio-runtime-boundary-extracted'") && !map.includes("firstSafeMove: 'resonance-nexus-main-loop-segment-audited'")) failures.push('Monolith map next cuts missing audio-readiness successor firstSafeMove');
if (!map.includes("strongestNextCandidate: 'livePerformanceState'") && !map.includes("strongestNextCandidate: 'globalInputAndMetronome'") && !map.includes("strongestNextCandidate: 'room3TopologyRuntime'") && !map.includes("strongestNextCandidate: 'resonanceNexusMainLoop'")) failures.push('Monolith map next candidate missing audio-readiness successor strongestNextCandidate');
if (!map.includes('resonance keyboard input effect or MetaPreset boundaries') && !map.includes('jiOsc ownership-resolution')) failures.push('Monolith map next useful move missing audio-readiness successor planning');

if (pkg.scripts?.[scriptName] !== 'node tools/check-app-audio-readiness-runtime-boundary.mjs') {
  failures.push(`package script missing ${scriptName}`);
}
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);

const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  hookLines: hook.split(/\r?\n/).length,
  contract: {
    audioReadinessRuntimeBoundaryExtractedFromAppTsx: true,
    noWaveStarterBassRootFollowOrRoom3BodyHotPathMoved: true,
    fullBrowserSanityRequiredAfterThisCut: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-audio-readiness-runtime-boundary] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-audio-readiness-runtime-boundary] ok');
console.log(JSON.stringify(report, null, 2));
