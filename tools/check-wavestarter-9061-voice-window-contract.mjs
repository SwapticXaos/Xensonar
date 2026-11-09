#!/usr/bin/env node
import fs from 'node:fs';

const fail = (message) => {
  console.error(`[check-wavestarter-9061-voice-window-contract] FAIL: ${message}`);
  process.exit(1);
};
const read = (path) => fs.readFileSync(path, 'utf8');

const app = read('src/App.tsx');
const audioLaneContracts = read('src/features/xensonar/audio/audioLaneContracts.ts');
const transientRuntime = read('src/features/resonance/transientRuntime.ts');

for (const marker of [
  'XENSONAR_TRANSIENT_RUNTIME_VOICE_LIMITS',
  'softLimit: 52',
  'hardLimit: 84',
  'wave: 22',
  'other: 14',
]) {
  if (!audioLaneContracts.includes(marker)) fail(`90.61 voice-limit contract missing ${marker}`);
}

for (const marker of [
  'XENSONAR_TRANSIENT_RUNTIME_VOICE_WINDOWS_MS',
  'wave: 24',
]) {
  if (!audioLaneContracts.includes(marker)) fail(`quasi-simultaneity window contract missing ${marker}`);
}

for (const marker of [
  '...XENSONAR_TRANSIENT_RUNTIME_VOICE_LIMITS',
  'sourceMinOccupancyMs: XENSONAR_TRANSIENT_RUNTIME_VOICE_WINDOWS_MS',
  'silentHotPathSources: { wave: true }',
]) {
  if (!app.includes(marker)) fail(`App runtime must use central transient contract: ${marker}`);
}

for (const forbidden of [
  'softLimit: 56',
  'hardLimit: 88',
  'perSourceHard: { particle: 30, wave: 24, drum: 18, other: 16 }',
]) {
  if (app.includes(forbidden)) fail(`App must not keep drifted inline voice-limit numbers: ${forbidden}`);
}

for (const marker of [
  'sourceMinOccupancyMs?: Partial<Record<TransientSource, number>>',
  'DEFAULT_SOURCE_MIN_OCCUPANCY_MS',
  'minOccupiedUntilMs: readRuntimeNowMs() + Math.max(0, sourceMinOccupancyMs[plan.source])',
  'const remainingOccupancyMs = managed.minOccupiedUntilMs - readRuntimeNowMs()',
  'setTimeout(() => finishVoiceRelease(managed), Math.ceil(remainingOccupancyMs))',
  'pendingReleaseTimers.forEach((timer) => clearTimeout(timer))',
]) {
  if (!transientRuntime.includes(marker)) fail(`TransientRuntime must implement voice-window occupancy without a second event-rate gate: ${marker}`);
}

for (const forbidden of [
  'droppedKeyboardWaveEvents',
  'rejectedKeyboardWaveEvents',
  'keyboardWaveEventRate',
  'lastRejectedKeyboardWave',
  'queuedKeyboardWave',
  'deferredKeyboardWave',
]) {
  if (transientRuntime.includes(forbidden) || app.includes(forbidden)) {
    fail(`No dropped-event ledger/queue/rate gate allowed for Keyboard Wellenstarter: ${forbidden}`);
  }
}

console.log('[check-wavestarter-9061-voice-window-contract] PASS');
