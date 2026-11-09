#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const requireText = (label, text, needle) => {
  if (!text.includes(needle)) failures.push(`${label}: missing ${needle}`);
};
const forbidText = (label, text, needle) => {
  if (text.includes(needle)) failures.push(`${label}: forbidden ${needle}`);
};

const ownership = read('src/features/xensonar/audio/waveStarterWorkletRuntimeOwnership.ts');
const emit = read('src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts');
const bridge = read('src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts');
const reducer = read('src/features/xensonar/audio/waveStarterWorkletPilotMessageReducer.ts');
const balancedCore = read('src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.core.ts');
const presets = read('src/features/xensonar/performanceCrisis/performanceCrisisPresetRegistry.ts');
const direct = read('src/features/xensonar/audio/waveStarter9061DirectContract.ts');

requireText('ownership', ownership, "audibleDefaultOwner: 'legacy-9061-main-thread'");
requireText('ownership', ownership, "workletRole: 'explicit-special-path-only'");
requireText('ownership', ownership, 'isExplicitWaveStarterWorkletSpecialPath');
for (const marker of [
  'keyboardGlissandoWorkletDirect',
  'waveStarterGestureLoopWorkletBridge',
  'synthWorkletFailoverCandidate',
  'sampleWorkletFailoverCandidate',
]) requireText('ownership', ownership, marker);

const workletGate = emit.indexOf('if (isExplicitWaveStarterWorkletSpecialPath(args.options))');
const voiceSpec = emit.indexOf('const voiceSpec = buildWaveStarterVoiceSpec({');
const fx = emit.indexOf('ensureWaveStarterFxRoutes({', workletGate);
if (!(workletGate >= 0 && voiceSpec > workletGate && fx > voiceSpec)) {
  failures.push('emit: Worklet VoiceSpec/failover block must be inside the explicit-special-path gate and before normal FX/playback');
}
requireText('direct contract', direct, 'Normal Wellenstarter hits stay on the 90.61-style direct path.');

requireText('bridge', bridge, 'attachWaveStarterWorkletPilotMessageReducer(node, nextHandle);');
forbidText('bridge', bridge, 'node.port.onmessage = (event: MessageEvent) => {');
requireText('reducer', reducer, 'node.port.onmessage = (event: MessageEvent) => {');
requireText('reducer', reducer, 'recordWaveStarterFailoverCandidateAckLedgerEntry');
requireText('reducer', reducer, 'processorOwnedHoldGestureStartAcceptedCount');

const bridgeLines = bridge.split(/\r?\n/).length;
if (bridgeLines > 700) failures.push(`bridge: expected <=700 lines after message reducer extraction, got ${bridgeLines}`);

requireText('balanced core', balancedCore, 'workletShadowMirroring: false');
requireText('preset registry', presets, 'const balancedSpecialPathIsolation');
requireText('preset registry', presets, 'workletShadowMirroring: false');
requireText('preset registry', presets, 'waveStarter: waveStarter("defer", 8, 18, true, balancedSpecialPathIsolation)');

if (failures.length) {
  console.error('[wave-starter-worklet-runtime-ownership] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`[wave-starter-worklet-runtime-ownership] OK · direct Wellenstarter remains 90.61/main-thread; Worklet orchestration is explicit-special-path only; pilot bridge ${bridgeLines} lines; Balanciert shadow off.`);
