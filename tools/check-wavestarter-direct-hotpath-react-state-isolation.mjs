#!/usr/bin/env node
import fs from 'node:fs';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const boundary = fs.readFileSync('src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts', 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const directStart = boundary.indexOf('function emitWaveStarter9061DirectAttack');
const directEnd = boundary.indexOf('\nexport function emitWaveStarterAttack', directStart);
if (directStart < 0 || directEnd < 0) {
  fail('direct attack function boundary not found');
} else {
  const directBlock = boundary.slice(directStart, directEnd);
  for (const forbidden of [
    'setState',
    'setNParams',
    'updateNParams',
    'requestWaveStarterLaneAttack',
    'buildWaveStarterVoiceSpec',
    'postWaveStarterWorkletVoiceSpecShadow',
    'publishWaveStarterFailoverDecisionGate',
    'recordWaveStarterFailoverGateLedgerEntry',
    'recordAudioPressureAdaptiveAction',
    'publishWaveStarter',
  ]) {
    if (directBlock.includes(forbidden)) fail(`direct hotpath contains forbidden marker: ${forbidden}`);
  }
  for (const required of [
    'args.transientRuntime.canAdmitVoice("wave")',
    'primeTokenShadow: false',
    'attackSoftening: 1',
    'silentHotPath: true',
  ]) {
    if (!directBlock.includes(required)) fail(`direct hotpath missing required marker: ${required}`);
  }
}

const playStart = app.indexOf('const playWaveStartSound');
const emitStart = app.indexOf('const emitWaveStartSound', playStart);
if (playStart < 0 || emitStart < 0) {
  fail('App playWaveStartSound/emitWaveStartSound ordering not found');
} else {
  const playBlock = app.slice(playStart, emitStart);
  for (const required of [
    'if (!requiresModernWaveStarterLane(options))',
    'asLegacy9061WaveStarterDirectOptions(',
    'return;',
    'requestWaveStarterLaneAttack',
  ]) {
    if (!playBlock.includes(required)) fail(`App direct switch missing required marker: ${required}`);
  }
  const directIdx = playBlock.indexOf('asLegacy9061WaveStarterDirectOptions(');
  const laneIdx = playBlock.indexOf('requestWaveStarterLaneAttack');
  if (!(directIdx >= 0 && laneIdx >= 0 && directIdx < laneIdx)) {
    fail('App direct gate must appear before requestWaveStarterLaneAttack');
  }
  for (const forbidden of ['setNParams', 'updateNParams', 'setKeyboardWindowStamp', 'setState']) {
    if (playBlock.includes(forbidden)) fail(`App direct switch contains React/UI-state marker: ${forbidden}`);
  }
}

if (failures.length) {
  console.error('[check-wavestarter-direct-hotpath-react-state-isolation] FAIL');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log('[check-wavestarter-direct-hotpath-react-state-isolation] OK: direct Wellenstarter fast-path is ref/native-runtime based and does not route through React state, Worklet VoiceSpec, failover ledger, or hot-path telemetry.');
