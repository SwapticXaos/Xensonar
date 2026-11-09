#!/usr/bin/env node
import fs from 'node:fs';

const fail = (message) => {
  console.error(`[check-wave-starter-9061-keyboard-runtime-parity] FAIL: ${message}`);
  process.exit(1);
};
const read = (path) => fs.readFileSync(path, 'utf8');

const app = read('src/App.tsx');
const keyboardBoundary = read('src/features/xensonar/input/resonanceKeyboardPitchCommandAssemblyBoundary.ts');
const keyboardContract = read('src/features/xensonar/input/wellenstarterBallPositionContract.ts');
const keyboardEffect = read('src/features/xensonar/input/useAppResonanceKeyboardInputEffectBoundary.ts');
const router = read('src/features/xensonar/input/resonanceKeyboardInputRouter.ts');
const transient = read('src/features/resonance/transientRuntime.ts');

if (!app.includes('...XENSONAR_TRANSIENT_RUNTIME_VOICE_LIMITS')) {
  fail('App transient runtime must use the central 90.61 App voice-limit contract, not inline drifted numbers.');
}
const audioLaneContracts = read('src/features/xensonar/audio/audioLaneContracts.ts');
for (const marker of ['softLimit: 52', 'hardLimit: 84', 'wave: 22', 'other: 14']) {
  if (!audioLaneContracts.includes(marker)) fail(`90.61 App voice-limit contract missing ${marker}`);
}
if (!app.includes('silentHotPathSources: { wave: true }')) {
  fail('Wellenstarter must remain a silent hot-path source.');
}
if (!app.includes('rootFollowLoopActive: !!nParamsUI.rootFollowLoopActive')) {
  fail('Keyboard boundary must receive rootFollowLoopActive so RFL sync can be skipped when off.');
}
if (!keyboardEffect.includes('readonly rootFollowLoopActive?: boolean') || !keyboardEffect.includes('rootFollowLoopActive: args.rootFollowLoopActive === true')) {
  fail('Keyboard effect must forward rootFollowLoopActive into the router.');
}
if (!router.includes('rootFollowLoopActive: boolean') || !router.includes('rootFollowLoopActive,')) {
  fail('Keyboard router runtime must carry rootFollowLoopActive.');
}
if (!keyboardBoundary.includes('rootFollowLoopActive: boolean')) {
  fail('Pitch command boundary must accept rootFollowLoopActive.');
}
if (!keyboardBoundary.includes('resolveKeyboardWellenstarterBallPosition({')) {
  fail('Keyboard pitch command must resolve the WSB position before emission/RFL sync.');
}
if (!keyboardContract.includes('keyboardWindowFrequency(') || !keyboardContract.includes('targetY: yFromFreq(targetHz)')) {
  fail('WSB contract must retain the 90.61 keyboard-window pitch-to-y mapping.');
}
if (!keyboardBoundary.includes('syncRootFollowInput: rootFollowLoopActive')) {
  fail('Keyboard cursor commits must only sync RFL input when RFL is active.');
}
for (const forbidden of [
  'resolveResonanceRootFollowControlDecision({',
  'noteWaveStarterKeyboardEventAdmissionHotPath(',
  'rootFollowControlDecision',
]) {
  if (keyboardBoundary.includes(forbidden)) fail(`Keyboard pitch hotpath must not contain ${forbidden}`);
}
if (!transient.includes('isSilentHotPathSource(source)') || !transient.includes('externalPressureBias = isSilentHotPathSource(source)')) {
  fail('Transient runtime must keep external pressure out of silent Wellenstarter sources.');
}
console.log('[check-wave-starter-9061-keyboard-runtime-parity] PASS');
