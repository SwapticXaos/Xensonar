#!/usr/bin/env node
import fs from 'node:fs';

const fail = (message) => {
  console.error(`[check-keyboard-9061-fastpath-rfl-off] FAIL: ${message}`);
  process.exit(1);
};
const read = (path) => fs.readFileSync(path, 'utf8');

const boundary = read('src/features/xensonar/input/resonanceKeyboardPitchCommandAssemblyBoundary.ts');
const contract = read('src/features/xensonar/input/wellenstarterBallPositionContract.ts');
const router = read('src/features/xensonar/input/resonanceKeyboardInputRouter.ts');

if (!boundary.includes('resolveKeyboardWellenstarterBallPosition({')) {
  fail('Keyboard pitch path must resolve the Wellenstarter-Ball target directly.');
}
if (!contract.includes('keyboardWindowFrequency(') || !contract.includes('targetY: yFromFreq(targetHz)')) {
  fail('WSB position contract must compute pitch directly from keyboardWindowFrequency/yFromFreq.');
}
if (!boundary.includes('previewWave: allowWavePreview')) {
  fail('Keyboard path must directly preview the normal Wellenstarter wave when audio/hold policy allows it.');
}
if (!boundary.includes('syncRootFollowInput: rootFollowLoopActive')) {
  fail('RFL-off must not sync Root-Follow input, while RFL-on reads the same WSB position.');
}
if (!boundary.includes('waveStarterOptions: undefined')) {
  fail('Keyboard path must keep normal Wellenstarter on the direct/no-special-options route.');
}
for (const forbidden of [
  'resolveResonanceKeyboardPitchCommand({',
  'resolveResonanceRootFollowControlDecision({',
  'noteWaveStarterKeyboardEventAdmissionHotPath(',
  'setRootFollowInputTargetHz(',
  'rootFollowControlDecision',
]) {
  if (boundary.includes(forbidden)) {
    fail(`Keyboard WSB movement path must bypass pitch-lane/RFL/admission management: ${forbidden}`);
  }
}
if (!router.includes('rootFollowLoopActive,') || !router.includes('runResonanceKeyboardPitchCommandAssemblyBoundary')) {
  fail('Router must pass rootFollowLoopActive into the pitch command boundary.');
}
console.log('[check-keyboard-9061-fastpath-rfl-off] PASS');
