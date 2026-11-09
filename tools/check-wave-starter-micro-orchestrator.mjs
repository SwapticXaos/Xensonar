#!/usr/bin/env node
import fs from 'node:fs';
import { XENSONAR_ARCHITECTURE_LINE } from './xensonar-project-line.mjs';

const read = (path) => {
  if (!fs.existsSync(path)) throw new Error(`Missing ${path}`);
  return fs.readFileSync(path, 'utf8');
};

const runtime = read('src/features/xensonar/audio/waveStarterLaneRuntime.ts');
const micro = read('src/features/xensonar/audio/waveStarterMicroOrchestrator.ts');
const app = read('src/App.tsx');
const emitBoundary = read('src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts');
const emitState = read('src/features/xensonar/audio/waveStarterEmitState.ts');
const pressure = read('src/core/audio/audioPressureMap.ts');
const pkg = JSON.parse(read('package.json'));
const failures = [];
const requireText = (label, content, needle) => {
  if (!content.includes(needle)) failures.push(`${label} missing ${JSON.stringify(needle)}`);
};
const forbidText = (label, content, needle) => {
  if (content.includes(needle)) failures.push(`${label} still contains forbidden ${JSON.stringify(needle)}`);
};

requireText('micro orchestrator', micro, 'resolveWaveStarterMicroRelease');
requireText('micro orchestrator', micro, "kind: 'emit-micro'");
requireText('micro orchestrator', micro, "kind: 'retry-slot'");
requireText('micro orchestrator', micro, "kind: 'drop-stale'");
requireText('micro orchestrator', micro, 'preserveStrongAttacks');
requireText('runtime', runtime, 'resolveWaveStarterMicroRelease');
requireText('runtime', runtime, "wave-starter-lane-micro-released");
requireText('runtime', runtime, 'microOrchestrated');
requireText('runtime', runtime, 'microGainScale');
requireText('runtime', runtime, 'microVoiceDemandMul');
requireText('App.tsx', app, 'type WaveStarterEmitOptions');
requireText('emit state boundary', emitState, 'const microGainScale = args.options?.microOrchestrated');
requireText('emit state boundary', emitState, 'const microVoiceDemandMul = args.options?.microOrchestrated');
requireText('emit state boundary', emitState, 'args.options.microGainScale ?? 0.84');
requireText('emit state boundary', emitState, 'args.options.microVoiceDemandMul ?? 0.82');
requireText('emit attack boundary', emitBoundary, 'baseRequestedVoices * microVoiceDemandMul');
requireText('pressure map', pressure, "'wave-starter-lane-micro-released'");

const flushBodyMatch = runtime.match(/flushDeferred\(\) \{[\s\S]*?\n    \},\n    clearDeferredTimer/);
if (!flushBodyMatch) failures.push('runtime flushDeferred body not found');
else {
  const flushBody = flushBodyMatch[0];
  const firstMicro = flushBody.indexOf('resolveWaveStarterMicroRelease');
  const firstStaleDrop = flushBody.indexOf("wave-starter-lane-stale-dropped");
  if (firstMicro < 0) failures.push('flushDeferred does not call micro orchestrator');
  if (firstStaleDrop >= 0 && firstStaleDrop < firstMicro) failures.push('stale drop still happens before micro orchestrator');
}

forbidText('runtime', runtime, 'if (!Number.isFinite(ageMs) || ageMs > policyTiming.forceDropMs)');

if (String(pkg.version) !== XENSONAR_ARCHITECTURE_LINE) failures.push(`unexpected version ${pkg.version}; expected canonical architecture line ${XENSONAR_ARCHITECTURE_LINE}`);

if (failures.length) {
  console.error('Wave-starter micro orchestrator check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, version: pkg.version }, null, 2));
