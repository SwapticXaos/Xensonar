#!/usr/bin/env node
import fs from 'node:fs';

const fail = (message) => {
  console.error(`[check-wavestarter-hold-path-forensics] FAIL: ${message}`);
  process.exit(1);
};
const read = (path) => fs.readFileSync(path, 'utf8');

const app = read('src/App.tsx');
const forensics = read('src/features/xensonar/input/waveStarterHoldPathForensics.ts');
const bridge = read('src/features/xensonar/input/waveStarterGestureLoopWorkletBridge.ts');
const clock = read('src/features/xensonar/input/waveStarterHoldSegmentClock.ts');

for (const marker of [
  'WAVE_STARTER_HOLD_PATH_FORENSICS_GLOBAL',
  '__XENSONAR_WAVE_STARTER_HOLD_PATH_FORENSICS__',
  '__xensonarReadWaveStarterHoldPathForensics',
  'browserFamily: "firefox" | "opera" | "chromium" | "safari" | "unknown"',
  'processorOwnershipReport',
  'instrumentEngineReport',
  'bridgeReport',
  'pilotReport',
  'inferredHoldPath',
  'worklet-processor-owned-hold',
  'gesture-loop-bridge-with-legacy-fallback',
  'gesture-loop-bridge-worklet-only',
  'legacy-or-direct-hold-reference',
  'summarizeWaveStarterHoldLaneStateForensics',
]) {
  if (!forensics.includes(marker)) fail(`missing forensics marker: ${marker}`);
}

for (const marker of [
  'publishWaveStarterHoldPathForensicsSnapshot',
  'phase: "segment-pulse"',
  'repeat-absorbed',
  'phase: "release"',
  'bridgeDecision,',
  'pulse,',
]) {
  if (!app.includes(marker)) fail(`App must publish hold-path forensics marker: ${marker}`);
}

for (const marker of [
  'collectDueWaveStarterHoldGestureLoopPulses',
  'reason: "gesture-loop-segment-pulse"',
  'extendPolicy: gesture.extendPolicy',
]) {
  if (!clock.includes(marker)) fail(`hold clock contract unexpectedly changed/missing: ${marker}`);
}

for (const marker of [
  'waveStarterGestureLoopWorkletOnly: !isolation.holdGestureLegacyFallback',
  'legacyFallbackPreserved: isolation.holdGestureLegacyFallback',
  'publishWaveStarterGestureLoopWorkletBridgeDecision',
]) {
  if (!bridge.includes(marker)) fail(`bridge contract unexpectedly changed/missing: ${marker}`);
}

for (const forbidden of [
  'keyboardHoldEventRate',
  'queuedHoldPulse',
  'deferredHoldPulse',
  'retryHoldPulse',
  'holdPulseBacklog',
]) {
  if (forensics.includes(forbidden) || app.includes(forbidden)) {
    fail(`forensics must not introduce a Hold queue/rate-policy: ${forbidden}`);
  }
}

console.log('[check-wavestarter-hold-path-forensics] PASS');
