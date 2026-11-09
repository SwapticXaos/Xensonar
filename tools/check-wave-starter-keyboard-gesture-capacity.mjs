#!/usr/bin/env node
import fs from 'node:fs';
const files = {
  capacity: 'src/features/xensonar/audio/waveStarterKeyboardGestureCapacity.ts',
  input: 'src/features/xensonar/input/resonanceKeyboardPitchCommandAssemblyBoundary.ts',
  ui: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  pkg: 'package.json',
};
for (const rel of Object.values(files)) if (!fs.existsSync(rel)) throw new Error(`${rel} missing`);
const read = (rel) => fs.readFileSync(rel, 'utf8');
const capacity = read(files.capacity);
for (const token of [
  'xensonar-wave-starter-keyboard-event-admission',
  '__XENSONAR_WAVE_STARTER_KEYBOARD_EVENT_ADMISSION__',
  'directEventContract: true',
  'crisisManagementIsSupportOnly: true',
  'preservesGlobalLanes: true',
  'preservesPlayedKeysUntilPressureForcesDrop: true',
  'keyboard-wave-event-9061-direct',
  'keyboard-wave-event-preview-suppressed',
  'waveStarterOptions: undefined',
  'readWaveStarterKeyboardCapacityPressureHint',
  'formatWaveStarterKeyboardGestureCapacityUiValue',
]) if (!capacity.includes(token)) throw new Error(`capacity missing ${token}`);
for (const forbidden of [
  'gliss-watch-worklet-prep',
  'gliss-soft-attack',
  'gliss-body-preserved',
  'gliss-drop-global-lane-protection',
  'workletFirstCapacityPrinciple',
  'keyboardGlissandoWorkletDirect',
  'keyboardGlissandoWorkletOnly',
]) if (capacity.includes(forbidden)) throw new Error(`capacity must not contain old route token ${forbidden}`);
const input = read(files.input);
for (const token of [
  'noteWaveStarterKeyboardEventAdmissionHotPath',
  'keyboardWavePreview',
  'waveStarterOptions: undefined',
]) if (!input.includes(token)) throw new Error(`input missing ${token}`);
for (const forbidden of [
  "capacityDecision.route === 'gliss-soft-attack'",
  "capacityDecision.route === 'gliss-body-preserved'",
  "capacityDecision.route === 'gliss-drop-global-lane-protection'",
]) if (input.includes(forbidden)) throw new Error(`input must not branch on old Wellenstarter route ${forbidden}`);
const ui = read(files.ui);
for (const token of ['Wellenstarter Keyboard-Kapazität', 'buildWaveStarterKeyboardGestureCapacityReport', 'formatWaveStarterKeyboardGestureCapacityUiValue']) if (!ui.includes(token)) throw new Error(`ui missing ${token}`);
const pkg = read(files.pkg);
if (!pkg.includes('"xensonar:check-wave-starter-keyboard-gesture-capacity"')) throw new Error('package script missing keyboard capacity check');
if (!/"version": "(?:3\.2\.91\.6\.9\.190\.13|3\.2\.91\.7\.0\.3|3\.2\.91\.7\.1)"/.test(pkg)) throw new Error('package version must be 3.2.91.6.9.190.13, 3.2.91.7.0.3 or 3.2.91.7.1');
console.log('wave-starter keyboard event admission OK');
