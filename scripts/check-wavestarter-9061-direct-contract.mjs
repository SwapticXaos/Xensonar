import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`[check-wavestarter-9061-direct-contract] FAIL: ${message}`);
  process.exit(1);
};

const app = read('src/App.tsx');
const playIdx = app.indexOf('const playWaveStartSound =');
const directIdx = app.indexOf('!requiresModernWaveStarterLane(options)', playIdx);
const laneIdx = app.indexOf('requestWaveStarterLaneAttack(', playIdx);
if (playIdx < 0) fail('playWaveStartSound not found in App.tsx');
if (directIdx < 0) fail('legacy 9061 direct branch not found in playWaveStartSound');
if (laneIdx < 0) fail('requestWaveStarterLaneAttack not found after playWaveStartSound');
if (!(playIdx < directIdx && directIdx < laneIdx)) {
  fail('normal Wellenstarter direct contract must be established before requestWaveStarterLaneAttack');
}

const emit = read('src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts');
const directGateBranchIdx = emit.indexOf('args.options?.legacy9061DirectGate === true');
const directFnIdx = emit.indexOf('function emitWaveStarter9061DirectAttack');
const canAdmitIdx = emit.indexOf('transientRuntime.canAdmitVoice("wave")');
const voiceSpecIdx = emit.indexOf('buildWaveStarterVoiceSpec({', directGateBranchIdx);
const workletShadowIdx = emit.indexOf('postWaveStarterWorkletVoiceSpecShadow(args.ctx', directGateBranchIdx);
const failoverIdx = emit.indexOf('publishWaveStarterFailoverDecisionGate({', directGateBranchIdx);
const laneReportIdx = emit.indexOf('recordAudioPressureAdaptiveAction("wave-starter-lane-space-routed")', directGateBranchIdx);
for (const [name, idx] of [
  ['legacy9061DirectGate branch', directGateBranchIdx],
  ['emitWaveStarter9061DirectAttack', directFnIdx],
  ['canAdmitVoice("wave")', canAdmitIdx],
  ['buildWaveStarterVoiceSpec', voiceSpecIdx],
  ['postWaveStarterWorkletVoiceSpecShadow', workletShadowIdx],
  ['publishWaveStarterFailoverDecisionGate', failoverIdx],
  ['wave-starter-lane-space-routed report', laneReportIdx],
]) {
  if (idx < 0) fail(`${name} not found`);
}
if (!(directFnIdx < canAdmitIdx && canAdmitIdx < directGateBranchIdx && directGateBranchIdx < laneReportIdx && laneReportIdx < voiceSpecIdx && laneReportIdx < workletShadowIdx && laneReportIdx < failoverIdx)) {
  fail('9061 direct gate must exist before the modern lane/report/VoiceSpec/Worklet/failover path');
}

const capacity = read('src/features/xensonar/audio/waveStarterKeyboardGestureCapacity.ts');
const resolverStart = capacity.indexOf('export function resolveWaveStarterKeyboardGestureCapacity');
const resolverEnd = capacity.indexOf('export function publishWaveStarterKeyboardGestureCapacityDecision', resolverStart);
if (resolverStart < 0 || resolverEnd < 0) fail('keyboard capacity resolver boundaries not found');
const resolver = capacity.slice(resolverStart, resolverEnd);
for (const forbidden of [
  'makeWaveOptions',
  'keyboardGlissandoWorkletDirect',
  'keyboardGlissandoWorkletOnly',
  'microOrchestrated',
  'microAttackSoftening: congestion',
  'previewWave: false',
  'gliss-drop-global-lane-protection',
]) {
  if (resolver.includes(forbidden)) {
    fail(`keyboard Wellenstarter resolver still contains modern hot-path orchestration: ${forbidden}`);
  }
}
if (!resolver.includes('waveStarterOptions: undefined')) {
  fail('keyboard Wellenstarter resolver must not emit WaveStarter options into the direct hit path');
}

console.log('[check-wavestarter-9061-direct-contract] OK: normal Wellenstarter events use the 9061 direct gate before modern orchestration.');
