#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const failures = [];
const requireText = (name, text, needle, message) => {
  if (!text.includes(needle)) failures.push(`${name}: ${message}`);
};
const forbidText = (name, text, needle, message) => {
  if (text.includes(needle)) failures.push(`${name}: ${message}`);
};

const pkg = JSON.parse(read('package.json'));
if (!['3.2.91.6.9.190.13', '3.2.91.7.0.3', '3.2.91.7.1'].includes(pkg.version)) failures.push(`package version is ${pkg.version}`);

const types = read('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts');
const registry = read('src/features/xensonar/performanceCrisis/performanceCrisisPresetRegistry.ts');
const contract = read('src/features/xensonar/performanceCrisis/waveStarterSpecialPathIsolationContract.ts');
const hook = read('src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.ts');
const runtime = read('src/features/xensonar/audio/waveStarterLaneRuntime.ts');
const bridge = read('src/features/xensonar/input/waveStarterGestureLoopWorkletBridge.ts');
const panel = read('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx');
const docs = read('docs/MERGE_READINESS_3.2.91.6.9.190.7_audio_branch.md');

requireText('types', types, 'WaveStarterSpecialPathIsolationPolicy', 'must expose special path isolation type');
for (const key of [
  'holdGestureLoopWorkletBridge',
  'holdGestureLegacyFallback',
  'deferredSlot',
  'staleFailoverCandidates',
  'workletShadowMirroring',
  'liveReports',
]) {
  requireText('types', types, key, `missing policy key ${key}`);
  requireText('registry', registry, key, `preset registry must configure ${key}`);
  requireText('panel', panel, key, `crisis manager must display ${key}`);
}
requireText('contract', contract, 'WAVE_STARTER_SPECIAL_PATH_ISOLATION_GLOBAL', 'must publish browser-readable isolation contract');
requireText('hook', hook, 'publishWaveStarterSpecialPathIsolationToBrowser', 'UI policy state must publish isolation contract');
requireText('runtime', runtime, 'waveStarterSpecialPathDisabled', 'runtime must understand disabled special path marker');
requireText('runtime', runtime, '!isolation.holdGestureLoopWorkletBridge', 'hold bridge off must fail closed in runtime');
requireText('runtime', runtime, '!isolation.deferredSlot', 'deferred slot off must fail closed in runtime');
requireText('runtime', runtime, '!isolation.staleFailoverCandidates', 'failover off must fail closed in runtime');
requireText('runtime', runtime, '!getSpecialPathIsolation().workletShadowMirroring', 'shadow mirroring off must prevent worklet mirror');
requireText('runtime', runtime, 'publishLiveReportIfAllowed', 'live reports must be guarded');
requireText('bridge', bridge, 'readWaveStarterSpecialPathIsolationFromBrowser', 'hold bridge resolver must read current isolation contract');
requireText('bridge', bridge, 'waveStarterSpecialPathDisabled: true', 'disabled hold bridge must pass explicit disabled marker');
requireText('bridge', bridge, 'specialPathAllowed: false', 'disabled hold bridge report must say off');
requireText('docs', docs, 'Nachtrag 9.190.10', 'merge document must record 9.190.10 isolation patch');
forbidText('runtime', runtime, 'publishLiveReport();\n        return;', 'hot path should use guarded report publisher');

if (failures.length) {
  console.error('WaveStarter special path isolation contract check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('WaveStarter special path isolation contract OK');
