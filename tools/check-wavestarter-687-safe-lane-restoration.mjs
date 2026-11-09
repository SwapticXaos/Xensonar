#!/usr/bin/env node
import fs from 'node:fs';
const fail = (m) => { console.error(`[check-wavestarter-687-safe-lane-restoration] FAIL: ${m}`); process.exit(1); };
const read = (p) => fs.readFileSync(p, 'utf8');
const app = read('src/App.tsx');
const lane = read('src/features/xensonar/audio/waveStarterDirectSafeLane.ts');
const guard = read('src/features/xensonar/audio/waveStarterLaneGuard.ts');

for (const marker of [
  'createWaveStarterDirectSafeLane',
  'getWaveStarterDirectSafeLane().request(baseFreq, isSector, options)',
  'options?.legacy9061DirectGate === true',
  'emitWaveStartSound(baseFreq, isSector, asLegacy9061WaveStarterDirectOptions(options))',
]) if (!app.includes(marker)) fail(`App missing ${marker}`);

for (const marker of [
  'const DEFER_FLUSH_MS = 6;',
  'const DEFER_SOFT_MAX_MS = 26;',
  'const DEFER_STALE_MS = 34;',
  'const DEFER_FORCE_DROP_MS = 42;',
  'pending = { baseFreq, isSector, requestedAtMs, attempts, options };',
  'fromDeferredSlot: true',
  "admission.kind !== 'admit-full'",
  'deps.emitDirectAttack(',
]) if (!lane.includes(marker)) fail(`safe lane missing ${marker}`);

for (const forbidden of [
  'waveStarterWorklet',
  'failover',
  'performanceCrisis',
  'publishLiveReport',
  'recordAdaptiveAction',
  'rootFollow',
]) if (lane.includes(forbidden)) fail(`safe lane must stay minimal: ${forbidden}`);

if (!guard.includes('const recentDefersHardLimit = policy ? Math.max(4, Math.floor(staleDropMs / 2)) : 8;')) {
  fail('default/no-policy guard must retain the 6.8.7 hard-overload defer threshold');
}

console.log('[check-wavestarter-687-safe-lane-restoration] PASS');
