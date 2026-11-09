#!/usr/bin/env node
import fs from 'node:fs';

const fail = (message) => {
  console.error(`[check-wsb-position-contract-rfl-reads-ball] FAIL: ${message}`);
  process.exit(1);
};
const read = (path) => fs.readFileSync(path, 'utf8');

const boundary = read('src/features/xensonar/input/resonanceKeyboardPitchCommandAssemblyBoundary.ts');
const contract = read('src/features/xensonar/input/wellenstarterBallPositionContract.ts');
const app = read('src/App.tsx');

for (const marker of [
  'resolveKeyboardWellenstarterBallPosition({',
  'wsbTarget.kind === \'muted-keyboard-wsb-position\'',
  'targetY: wsbTarget.targetY',
  'targetHz: wsbTarget.targetHz',
  'previewWave: allowWavePreview',
  'syncRootFollowInput: rootFollowLoopActive',
  'waveStarterOptions: undefined',
]) {
  if (!boundary.includes(marker)) fail(`keyboard assembly missing ${marker}`);
}

for (const forbidden of [
  'resolveResonanceKeyboardPitchCommand({',
  'resolveResonanceRootFollowControlDecision({',
  'noteWaveStarterKeyboardEventAdmissionHotPath(',
  'setRootFollowInputTargetHz(',
  'rootFollowControlDecision',
  "recordAdaptiveAction('root-follow-input-freeze-last-valid')",
  "recordAdaptiveAction('root-follow-input-rate-limited')",
]) {
  if (boundary.includes(forbidden)) fail(`keyboard assembly must not couple WSB movement to ${forbidden}`);
}

for (const marker of [
  'export function resolveKeyboardWellenstarterBallPosition',
  'keyboardWindowFrequency(',
  'targetY: yFromFreq(targetHz)',
  "kind: 'keyboard-wsb-position'",
  "kind: 'muted-keyboard-wsb-position'",
]) {
  if (!contract.includes(marker)) fail(`WSB position contract missing ${marker}`);
}

if (!app.includes('options.syncRootFollowInput !== false')) {
  fail('App cursor commit must still make cursor/WSB position the Root-Follow input by default.');
}

console.log('[check-wsb-position-contract-rfl-reads-ball] PASS');
