#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];
const requireText = (label, content, needle) => {
  if (!content.includes(needle)) failures.push(`${label} missing ${needle}`);
};
const forbidText = (label, content, needle) => {
  if (content.includes(needle)) failures.push(`${label} must not contain ${needle}`);
};

const pkg = JSON.parse(read('package.json'));
if (!['3.2.91.6.9.190.13', '3.2.91.7.0.3', '3.2.91.7.1'].includes(pkg.version)) failures.push(`package version is ${pkg.version}`);
for (const script of [
  'xensonar:check-audio-branch-simplify-without-behavior-change',
  'xensonar:check-wave-starter-keyboard-gesture-capacity',
  'xensonar:check-wavestarter-9061-direct-contract',
  'xensonar:check-wavestarter-hold-pattern-workbench',
]) if (!pkg.scripts?.[script]) failures.push(`package.json missing ${script}`);

const soundPanel = read('src/features/xensonar/rooms/ResonanceSoundPalettePanel.tsx');
for (const marker of [
  'Enter-Hold Muster',
  'Klaviatur-Hold Muster',
  'waveStarterHoldPatternSteps',
  'keyboardHoldPatternSteps',
]) requireText('ResonanceSoundPalettePanel', soundPanel, marker);
for (const forbidden of [
  'renderHoldSegmentControl',
  "label: 'Wellenstart Hold'",
  "label: 'Klaviatur Hold'",
  'WAVE_STARTER_HOLD_SEGMENT_OPTIONS',
  'isDefaultWaveStarterHoldSegment',
]) forbidText('ResonanceSoundPalettePanel', soundPanel, forbidden);

const capacity = read('src/features/xensonar/audio/waveStarterKeyboardGestureCapacity.ts');
for (const marker of [
  'xensonar-wave-starter-keyboard-event-admission',
  'keyboard-wave-event-9061-direct',
  'keyboard-wave-event-preview-suppressed',
  'waveStarterOptions: undefined',
  'Viele schnelle Ereignisse bleiben normale Wellenstarter',
]) requireText('waveStarterKeyboardGestureCapacity', capacity, marker);
for (const forbidden of [
  'gliss-watch-worklet-prep',
  'gliss-soft-attack',
  'gliss-body-preserved',
  'gliss-drop-global-lane-protection',
  'workletFirstCapacityPrinciple',
  'keyboardGlissandoWorkletDirect',
]) forbidText('waveStarterKeyboardGestureCapacity', capacity, forbidden);

const app = read('src/App.tsx');
requireText('App.tsx', app, 'if (!requiresModernWaveStarterLane(options))');
requireText('App.tsx', app, 'asLegacy9061WaveStarterDirectOptions(options)');

const manifest = read('docs/MERGE_READINESS_3.2.91.6.9.190.7_audio_branch.md');
for (const marker of [
  'Nachtrag 9.190.9',
  'App.tsx nicht berührt',
  'Hold-UI-Dopplung',
  'Keyboard-Wellenereignisse',
  'Spezialpfade bleiben merge-kritisch',
]) requireText('merge readiness manifest', manifest, marker);

if (failures.length) {
  console.error('[audio-branch-simplify-without-behavior-change] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, contract: 'audio-branch-simplify-without-behavior-change', version: pkg.version }, null, 2));
