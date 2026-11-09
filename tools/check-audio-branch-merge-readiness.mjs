#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);
const failures = [];
const requireFile = (file) => {
  if (!exists(file)) failures.push(`missing ${file}`);
  return exists(file) ? read(file) : '';
};
const requireText = (label, content, needle) => {
  if (!content.includes(needle)) failures.push(`${label} missing ${needle}`);
};
const forbidText = (label, content, needle) => {
  if (content.includes(needle)) failures.push(`${label} must not contain ${needle}`);
};

const pkg = JSON.parse(requireFile('package.json'));
const scripts = pkg.scripts || {};
for (const scriptName of [
  'xensonar:check-audio-branch-merge-readiness',
  'xensonar:check-wavestarter-9061-direct-contract',
  'xensonar:check-wavestarter-hold-pattern-workbench',
  'xensonar:check-wavestarter-9061-silent-transient-hot-path',
  'xensonar:check-root-follow-crackle-truth-modes',
  'xensonar:check-root-follow-fixed-anchor-default',
  'xensonar:check-root-follow-legacy-relief-gate-contract',
]) {
  if (!scripts[scriptName]) failures.push(`package.json missing script ${scriptName}`);
}

const contract = requireFile('src/features/xensonar/audio/waveStarter9061DirectContract.ts');
for (const marker of [
  'WAVE_STARTER_9061_DIRECT_CONTRACT_ID',
  'requiresModernWaveStarterLane',
  'asLegacy9061WaveStarterDirectOptions',
  'legacy9061DirectGate: true',
  'waveStarterGestureLoopWorkletBridge',
  'waveStarterGestureLoopWorkletOnly',
  'synthWorkletFailoverCandidate',
  'sampleWorkletFailoverCandidate',
]) {
  requireText('waveStarter9061DirectContract', contract, marker);
}

const app = requireFile('src/App.tsx');
requireText('App.tsx', app, 'from "./features/xensonar/audio/waveStarter9061DirectContract"');
requireText('App.tsx', app, 'if (!requiresModernWaveStarterLane(options))');
requireText('App.tsx', app, 'asLegacy9061WaveStarterDirectOptions(options)');
forbidText('App.tsx', app, 'const requiresModernWaveStarterLane = (options?: WaveStarterEmitOptions)');
forbidText('App.tsx', app, 'const asLegacy9061WaveStarterDirectOptions = (');
const playIdx = app.indexOf('const playWaveStartSound =');
const directIdx = app.indexOf('!requiresModernWaveStarterLane(options)', playIdx);
const requestIdx = app.indexOf('requestWaveStarterLaneAttack(', playIdx);
if (!(playIdx >= 0 && directIdx > playIdx && requestIdx > directIdx)) {
  failures.push('App.tsx playWaveStartSound must branch to 9061 direct contract before requestWaveStarterLaneAttack');
}

const emit = requireFile('src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts');
for (const marker of [
  'args.options?.legacy9061DirectGate === true',
  'emitWaveStarter9061DirectAttack(args)',
  'transientRuntime.canAdmitVoice("wave")',
  'silentHotPath: true',
  'primeTokenShadow: false',
]) {
  requireText('waveStarterEmitAttackBoundary', emit, marker);
}

const rootFollowReliefGateContract = requireFile('src/features/xensonar/rootFollow/rootFollowLegacyReliefGateContract.ts');
requireText('rootFollowLegacyReliefGateContract', rootFollowReliefGateContract, 'resolveRootFollowLegacyReliefGate');
requireText('rootFollowLegacyReliefGateContract', rootFollowReliefGateContract, 'stable-lane-primary-audition');
const rootFollowVoiceEngineOptions = requireFile('src/features/xensonar/performanceCrisis/rootFollowVoiceEngineOptions.ts');
requireText('rootFollowVoiceEngineOptions', rootFollowVoiceEngineOptions, 'ROOT_FOLLOW_VOICE_ENGINE_OPTIONS');
requireText('rootFollowVoiceEngineOptions', rootFollowVoiceEngineOptions, 'Worklet Stable-Lane Primary Test');

const rootFollowRenderer = requireFile('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts');
for (const marker of [
  'worklet-stable-lane-primary-audition',
  'primaryAudition: boolean',
  'stableLaneBlend: 0.86',
  'legacyBlend: 0,',
]) {
  requireText('rootFollowMaterialRenderer', rootFollowRenderer, marker);
}
const anchor = requireFile('src/features/xensonar/rootFollow/rootFollowAnchorMode.ts');
requireText('rootFollowAnchorMode', anchor, 'Flexibel (knistert manchmal)');
const bank = requireFile('src/features/xensonar/material/useRootFollowLoopBankController.ts');
requireText('useRootFollowLoopBankController', bank, 'resolveDefaultRootFollowAnchorHz');
requireText('useRootFollowLoopBankController', bank, 'rootHz: defaultAnchorHz');

const manifest = requireFile('docs/MERGE_READINESS_3.2.91.6.9.190.7_audio_branch.md');
for (const marker of [
  'App.tsx-Entflechtung',
  'Spectral-Forge',
  '90.61',
  'Wellenstarter',
  'Root Follow',
  'Kammerton/2',
  'Flexibel (knistert manchmal)',
  '9.190.7 App.tsx-Ausnahme',
  'nicht als Freibrief',
  'rootFollowLegacyReliefGateContract',
]) {
  requireText('merge readiness manifest', manifest, marker);
}

if (failures.length) {
  console.error('[audio-branch-merge-readiness] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  contract: 'audio-branch-merge-readiness',
  version: pkg.version,
  appPlayWaveStartSoundOrder: { playIdx, directIdx, requestIdx },
}, null, 2));
