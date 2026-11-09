#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const requireText = (source, text, message) => {
  if (!source.includes(text)) failures.push(message);
};
const requireOrder = (source, tokens, message) => {
  let cursor = -1;
  for (const token of tokens) {
    cursor = source.indexOf(token, cursor + 1);
    if (cursor < 0) {
      failures.push(message);
      return;
    }
  }
};

const liveLoad = read('src/features/soundLibrary/liveMelodicSampleLoad.ts');
const waveSample = read('src/features/soundLibrary/waveStarterSamplePlayback.ts');
const particleSample = read('src/features/soundLibrary/particleSamplePlayback.ts');
const residentSample = read('src/features/soundLibrary/residentSamplePlayback.ts');
const granular = read('src/features/soundLibrary/residentGranularPlaybackScheduler.ts');
const particleDispatch = read('src/features/xensonar/audio/particlePlaybackDispatch.ts');
const particleOrchestrator = read('src/features/xensonar/audio/particleNexusToneOrchestrator.ts');
const particleAssembly = read('src/features/xensonar/audio/particleRuntimeRequestAssemblyBoundary.ts');
const actionSurface = read('src/features/xensonar/audio/useAppNexusAudioActionSurfaceBoundary.ts');
const body = read('src/features/xensonar/audio/room3BodyExciterPlaybackBoundary.ts');
const harmonic = read('src/features/xensonar/audio/waveStarterHarmonicPlaybackOrchestrator.ts');
const readiness = read('src/features/xensonar/audio/useAppAudioReadinessRuntimeBoundary.ts');
const app = read('src/App.tsx');

for (const [token, message] of [
  ['pendingByContext', 'live sample loads must share in-flight work per AudioContext'],
  ['readyBySampleId', 'live sample profiles must remain synchronously ready after prewarm'],
  ['generationBySampleId', 'sample cache invalidation must be generation-safe'],
  ['libraryGeneration += 1', 'whole-library invalidation must retire in-flight decodes'],
  ['MAX_READY_DECODED_BYTES', 'decoded live sample memory must remain bounded'],
  ['MELODIC_SAMPLE_LIBRARY_UPDATED_EVENT', 'sample metadata changes must invalidate the live profile'],
  ["reason: 'wall-clock-stale'", 'immediate sample gestures need a wall-clock stale gate'],
  ["reason: 'scheduled-onset-stale'", 'scheduled sample gestures need an audio-onset stale gate'],
  ['const hasPreparationWindow = scheduledStartTime !== null', 'only future-scheduled notes may await cold sample preparation'],
  ['return Promise.resolve(null)', 'cold immediate sample gestures must never replay after I/O'],
]) requireText(liveLoad, token, message);

for (const [source, label, allocationToken] of [
  [waveSample, 'Wellenstarter sample', 'source = own(ctx.createBufferSource())'],
  [particleSample, 'particle sample', 'source = own(ctx.createBufferSource())'],
  [residentSample, 'resident sample', 'const tone = own(args.ctx.createBiquadFilter())'],
]) {
  requireOrder(source, [
    'resolveLiveSampleAttackFreshness({',
    'const lease = args.acquireVoice?.()',
    allocationToken,
  ], `${label} must reject stale work and reserve a voice before node construction`);
}

for (const [token, message] of [
  ['const schedulers = new WeakMap<AudioContext, ResidentGranularScheduler>()', 'resident grains need one scheduler per AudioContext'],
  ['const MAX_STARTS_PER_TICK = 12', 'resident grains need a global construction budget'],
  ['const MAX_ACTIVE_GRAINS = 96', 'resident grains need a bounded active pool'],
  ["when < now - LATE_GRAIN_DROP_SEC", 'resident grains must skip expired onsets'],
  ['const orderedJobs = [...jobs.slice(rotation), ...jobs.slice(0, rotation)]', 'resident grain jobs must rotate fairly'],
  ['noteEnd - noteStart) / grainSpacing', 'resident grain count must cover the complete note at its actual spacing'],
  ['job.latticePhase', 'simultaneous resident voices need decorrelated source lattices'],
]) requireText(granular, token, message);

requireOrder(particleDispatch, [
  "if (presetRoute.kind === 'sample')",
  "const onSampleStarted = (played: boolean)",
  'triggerBody();',
  'playSecondaryExciters();',
  'void playParticleSample({',
], 'sample-selected particles must grant their core sample the first event slot');
requireText(particleDispatch, 'requestedAtMs: request.requestedAtMs', 'particle dispatch must preserve the original gesture clock');
requireText(particleOrchestrator, 'requestedAtMs: request.requestedAtMs', 'particle orchestrator must preserve the original gesture clock');
requireText(particleAssembly, 'requestedAtMs: input.requestedAtMs', 'particle request assembly must preserve the original gesture clock');
requireOrder(actionSurface, ['const playNexusAgentTone', 'const requestedAtMs = readLiveSampleClockMs()', 'runParticleNexusToneOrchestrator({'], 'particle gesture clock must be captured before orchestration');

requireOrder(harmonic, [
  'for (const tone of buildWaveStarterPresetToneSpecs',
  'if (startedToneCount > 0)',
  'callbacks.triggerBodyExciter(',
], 'Wellenstarter body must follow an admitted harmonic excitation');
requireOrder(body, [
  'const lease = options?.acquireVoice',
  'source = createSource()',
  'source.start(startAt)',
], 'Room III body sources must reserve, construct, then start');

requireOrder(readiness, [
  'for (const device of args.liveDeviceWarmups',
  'scheduleSilentAudioWarmupSweep(',
  'prewarmLiveMelodicSampleSelections(',
], 'power-on warmup must construct the stable rack and prime selected samples');
requireText(app, 'liveDeviceWarmups: [', 'App must provide the live effect rack warmup list');

if (failures.length) {
  console.error('[live-instrument-runtime-130] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[live-instrument-runtime-130] PASS: source-shape invariants only; audible/hardware proof remains separate');
