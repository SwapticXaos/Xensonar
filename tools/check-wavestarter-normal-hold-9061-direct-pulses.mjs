#!/usr/bin/env node
import fs from 'node:fs';

const fail = (message) => {
  console.error(`[check-wavestarter-normal-hold-9061-direct-pulses] FAIL: ${message}`);
  process.exit(1);
};
const read = (path) => fs.readFileSync(path, 'utf8');

const bridge = read('src/features/xensonar/input/waveStarterGestureLoopWorkletBridge.ts');
const direct = read('src/features/xensonar/audio/waveStarter9061DirectContract.ts');
const runtime = read('src/features/xensonar/audio/waveStarterLaneRuntime.ts');
const forensics = read('src/features/xensonar/input/waveStarterHoldPathForensics.ts');


for (const marker of [
  'hold-gesture-loop-9061-direct-pulse',
  'if (!forceSustainExtend)',
  'legacy9061DirectGate: true',
  'workletBridge: false',
  'workletFirst: false',
  'legacyFallbackPreserved: true',
  'waveStarterGestureLoopWorkletBridge: true',
  'waveStarterGestureLoopWorkletOnly: !isolation.holdGestureLegacyFallback',
  'apostrophe-safe-extend',
]) {
  if (!bridge.includes(marker)) fail(`bridge missing marker: ${marker}`);
}

const directPulseIdx = bridge.indexOf('hold-gesture-loop-9061-direct-pulse');
const workletBridgeIdx = bridge.indexOf('hold-gesture-loop-worklet-bridge:${sourceIntent}:apostrophe-safe-extend');
if (directPulseIdx < 0 || workletBridgeIdx < 0 || directPulseIdx > workletBridgeIdx) {
  fail('normal Hold direct pulse branch must appear before apostrophe Worklet bridge branch');
}

for (const marker of [
  'waveStarterPresetOverride: options?.waveStarterPresetOverride',
  'legacy9061DirectGate: true',
]) {
  if (!direct.includes(marker)) fail(`direct contract missing marker: ${marker}`);
}


for (const marker of [
  'if (args.bridgeDecision && !args.bridgeDecision.workletBridge)',
  'return "legacy-or-direct-hold-reference";',
]) {
  if (!forensics.includes(marker)) fail(`forensics missing direct-hold inference marker: ${marker}`);
}

for (const forbidden of [
  'keyboardHoldEventRate',
  'queuedHoldPulse',
  'deferredHoldPulse',
  'retryHoldPulse',
  'holdPulseBacklog',
]) {
  if (bridge.includes(forbidden) || runtime.includes(forbidden) || forensics.includes(forbidden)) {
    fail(`normal Hold direct-pulse repair must not introduce a Hold queue/rate-policy: ${forbidden}`);
  }
}

console.log('[check-wavestarter-normal-hold-9061-direct-pulses] PASS');
