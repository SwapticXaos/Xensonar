#!/usr/bin/env node
import fs from 'node:fs';
const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} must not contain ${needle}`); };
const pkg = JSON.parse(read('package.json'));
if (!['3.2.91.6.9.190.13', '3.2.91.7.0.3', '3.2.91.7.1', '3.2.91.7.2', '3.2.91.7.4.6', '3.2.91.7.4.7', '3.2.91.7.4.8'].includes(pkg.version)) failures.push(`package version is ${pkg.version}`);
if (!pkg.scripts?.['xensonar:check-keyboard-wave-admission-cold-report']) failures.push('missing cold-report check script');
const input = read('src/features/xensonar/input/resonanceKeyboardPitchCommandAssemblyBoundary.ts');
for (const token of [
  'resolveKeyboardWellenstarterBallPosition({',
  'syncRootFollowInput: rootFollowLoopActive',
  'waveStarterOptions: undefined',
]) requireText('keyboard command assembly', input, token);
for (const forbidden of [
  'noteWaveStarterKeyboardEventAdmissionHotPath(',
  'resolveWaveStarterKeyboardGestureCapacity({',
  'publishWaveStarterKeyboardGestureCapacityDecision(capacityDecision)',
  'capacityDecision.waveStarterOptions',
  'capacityDecision.previewWave',
  'capacityDecision.congestionState',
  'capacityDecision.rootFollowSegmentQuantizeHint',
  'getAudioPressureBias?.()',
  'getActiveScheduledToneCount?.()',
]) forbidText('keyboard command assembly hot path', input, forbidden);
const capacity = read('src/features/xensonar/audio/waveStarterKeyboardGestureCapacity.ts');
for (const token of [
  'noteWaveStarterKeyboardEventAdmissionHotPath',
  "hotPathReportMode: 'cold-only'",
  'Reports werden nur kalt aus dem Krisenmanager gebaut',
  'readWaveStarterKeyboardCapacityPressureHint(): number {\n  return 0;',
]) requireText('keyboard capacity', capacity, token);
forbidText('keyboard capacity', capacity, 'let lastDecision: WaveStarterKeyboardGestureCapacityDecision | null');
const manifest = read('docs/MERGE_READINESS_3.2.91.6.9.190.7_audio_branch.md');
requireText('merge readiness manifest', manifest, 'Nachtrag 9.190.13');
requireText('merge readiness manifest', manifest, 'Keyboard-Wellenereignis-Diagnose ist cold-report only');
if (failures.length) {
  console.error('[keyboard-wave-admission-cold-report] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, contract: 'keyboard-wave-admission-cold-report', version: pkg.version }, null, 2));
