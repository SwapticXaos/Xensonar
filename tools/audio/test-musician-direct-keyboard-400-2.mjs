import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { build } from 'esbuild';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');

const contractPath = 'src/features/xensonar/audio/waveStarter9061DirectContract.ts';
const contractSource = read(contractPath);
const keyboardSource = read('src/features/xensonar/input/resonanceKeyboardPitchCommandAssemblyBoundary.ts');
const appSource = read('src/App.tsx');
const emitSource = read('src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts');

for (const marker of [
  "options?.keyboardGestureSource === 'keyboard-direct'",
  "options?.keyboardGestureSource === 'keyboard-glissando'",
  'requestedAtMs: immediateKeyboard ? undefined : options?.requestedAtMs',
  'keyboardGestureSource: options?.keyboardGestureSource',
]) assert(contractSource.includes(marker), `direct contract missing: ${marker}`);

for (const marker of [
  "keyboardGestureSource: 'keyboard-direct'",
  "keyboardGestureSource: 'keyboard-direct'",
  "recordAdaptiveAction('keyboard-input-gliss-coalesced')",
  'previewWave: false',
]) assert(keyboardSource.includes(marker), `keyboard assembly missing: ${marker}`);

const playStart = appSource.indexOf('const playWaveStartSound =');
const playEnd = appSource.indexOf('const emitWaveStartSound =', playStart);
assert(playStart >= 0 && playEnd > playStart, 'playWaveStartSound block missing');
const playSlice = appSource.slice(playStart, playEnd);
const immediateIdx = playSlice.indexOf('isImmediateKeyboardWaveStarterGesture(options)');
const safeLaneIdx = playSlice.indexOf('getWaveStarterDirectSafeLane().request');
assert(immediateIdx >= 0 && safeLaneIdx > immediateIdx, 'keyboard must bypass DirectSafeLane before non-interactive safe-lane routing');
assert(playSlice.includes('asLegacy9061WaveStarterDirectOptions(options)'), 'keyboard must retain 90.61 direct contract');

const emitStart = appSource.indexOf('const emitWaveStartSound =');
const emitEnd = appSource.indexOf('waveStarterDirectEmitRef.current = emitWaveStartSound', emitStart);
assert(emitStart >= 0 && emitEnd > emitStart, 'emitWaveStartSound block missing');
const appEmit = appSource.slice(emitStart, emitEnd);
assert(appEmit.includes('const immediateKeyboard = isImmediateKeyboardWaveStarterGesture(options);'), 'emit boundary must identify live keyboard gesture');
assert(appEmit.includes("selection.kind === 'preset' && !entrophonActive && !immediateKeyboard"), 'C11 Direct implant must exclude immediate keyboard when Entrophon is off');

const directStart = emitSource.indexOf('function emitWaveStarter9061DirectAttack');
const directEnd = emitSource.indexOf('export function emitWaveStarterAttack', directStart);
assert(directStart >= 0 && directEnd > directStart, '90.61 direct renderer missing');
const directSlice = emitSource.slice(directStart, directEnd);
for (const marker of [
  'transientRuntime.canAdmitVoice("wave")',
  'attackSoftening: 1',
  'silentHotPath: true',
]) assert(directSlice.includes(marker), `90.61 direct local protection missing: ${marker}`);
for (const forbidden of [
  'buildWaveStarterVoiceSpec',
  'postWaveStarterWorkletVoiceSpecShadow',
  'publishWaveStarterFailoverDecisionGate',
]) assert(!directSlice.includes(forbidden), `90.61 direct path regained control-plane work: ${forbidden}`);

const bundle = await build({
  entryPoints: [path.join(root, contractPath)],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
for (const source of ['keyboard-direct', 'keyboard-glissando']) {
  const input = {requestedAtMs: 123, keyboardGestureSource: source, waveStarterPresetOverride: 'tape_halo'};
  assert.equal(api.isImmediateKeyboardWaveStarterGesture(input), true);
  const out = api.asLegacy9061WaveStarterDirectOptions(input);
  assert.equal(out.legacy9061DirectGate, true);
  assert.equal(out.keyboardGestureSource, source);
  assert.equal(out.requestedAtMs, undefined, 'live keyboard must not carry stale DOM age into audio timing');
}
const scheduled = api.asLegacy9061WaveStarterDirectOptions({requestedAtMs: 123});
assert.equal(scheduled.requestedAtMs, 123, 'non-keyboard direct events must keep their scheduling provenance');

// Behavioural keyboard proof: direct hits/chords stay immediate, while a dense
// run retains the 6.8.7 continuous-gliss coalescing instead of allocating a new
// full voice graph on every key.
const keyboardBundle = await build({
  stdin: {
    contents: `
      export { runResonanceKeyboardPitchCommandAssemblyBoundary } from './src/features/xensonar/input/resonanceKeyboardPitchCommandAssemblyBoundary.ts';
      export { createResonanceKeyboardPitchLaneState } from './src/features/xensonar/input/resonanceKeyboardPitchLane.ts';
      export { KAMMERTON_KEYS, KAMMERTON_KEY_CODES } from './src/features/xensonar/domain/instrumentData.ts';
    `,
    resolveDir: root,
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});
const keyboardApi = await import('data:text/javascript;base64,' + Buffer.from(keyboardBundle.outputFiles[0].text).toString('base64'));
const state = keyboardApi.createResonanceKeyboardPitchLaneState();
const commits = [];
let nowMs = 1000;
const baseArgs = {
  keyboardMirrorActive: false,
  keyboardWindowOffset: 0,
  params: {gridBase: 220, gridTuning: '12edo'},
  pitchLaneState: state,
  rootFollowLoopActive: false,
  preventDefault() {},
  ensureKeyboardPitchAudioReadyOnce: () => true,
  recordAdaptiveAction() {},
  commitCursorY: (targetY, options) => commits.push({targetY, options}),
  shouldEmitKeyboardHoldWavePreview: () => true,
  resolveKeyboardWaveStarterSoundPreset: () => 'tape_halo',
};
for (let i = 0; i < 6; i++) {
  keyboardApi.runResonanceKeyboardPitchCommandAssemblyBoundary({
    ...baseArgs,
    event: {key: keyboardApi.KAMMERTON_KEYS[i], code: keyboardApi.KAMMERTON_KEY_CODES[i], repeat: false, timeStamp: nowMs},
    nowMs,
  });
  nowMs += 12;
}
assert.equal(commits.length, 6);
assert.equal(commits[0].options.previewWave, true);
assert.equal(commits[0].options.waveStarterOptions.keyboardGestureSource, 'keyboard-direct');
assert(commits.slice(3).some(c => c.options.previewWave === false), 'dense run must retain 6.8.7 gliss coalescing');


console.log(JSON.stringify({
  pass: true,
  contract: 'musician-first-keyboard-now-or-never-400.2',
  semantics: {
    keyboardDirect: 'bypass-safe-lane-and-direct-c11-when-entrophon-off',
    keyboardGlissando: '6.8.7-continuous-coalescing-preserved',
    directHitsAndChords: 'immediate-now-or-never',
    entrophonOn: 'dedicated-entrophon-renderer-unchanged',
    foundation: 'beat-material-rfl-untouched',
  },
  directRendererSha256: sha('src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts'),
}, null, 2));
