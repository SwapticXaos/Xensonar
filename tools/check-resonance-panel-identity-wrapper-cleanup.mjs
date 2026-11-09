#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const fail = (message) => {
  console.error(`[resonance-panel-identity-wrapper-cleanup] ${message}`);
  process.exit(1);
};

const props = read('src/features/xensonar/rooms/resonancePanelProps.ts');
const coordinator = read('src/features/xensonar/rooms/resonancePanelCoordinator.ts');
const chrome = read('src/features/xensonar/layout/appChromeProps.ts');

const deletedIdentityBuilders = [
  'buildResonanceStatusStripProps',
  'buildResonanceParallelEffectsPanelProps',
  'buildRecordingTakePanelProps',
  'buildResonanceBurstDiagnosticsPanelProps',
];
for (const token of deletedIdentityBuilders) {
  if (props.includes(`export function ${token}`)) fail(`resonancePanelProps.ts should not export identity builder ${token}.`);
  if (coordinator.includes(token)) fail(`resonancePanelCoordinator.ts should not depend on identity builder ${token}.`);
  if (chrome.includes(token)) fail(`appChromeProps.ts should not depend on identity builder ${token}.`);
}

for (const token of [
  'resonanceParallelEffectsPanelProps: args.parallelEffects',
  'recordingTakePanelProps: args.recordingTake',
  'resonanceBurstDiagnosticsPanelProps: args.burstDiagnostics',
]) {
  if (!coordinator.includes(token)) fail(`resonancePanelCoordinator.ts should pass through ${token}.`);
}
if (!chrome.includes('resonanceStatusStripProps: args.resonanceStatusStrip')) {
  fail('appChromeProps.ts should pass resonanceStatusStrip through directly.');
}

for (const token of [
  "import { ResonanceStatusStrip } from '../rooms/ResonanceStatusStrip';",
  'resonanceStatusStrip: ComponentProps<typeof ResonanceStatusStrip>',
]) {
  if (!chrome.includes(token)) fail(`appChromeProps.ts should use direct ResonanceStatusStrip ComponentProps contract: ${token}`);
}
for (const token of [
  "import { ResonanceBurstDiagnosticsPanel } from './ResonanceBurstDiagnosticsPanel';",
  "import { ResonanceParallelEffectsPanel } from './ResonanceParallelEffectsPanel';",
  "import { RecordingTakePanel } from './RecordingTakePanel';",
  'parallelEffects: ComponentProps<typeof ResonanceParallelEffectsPanel>',
  'recordingTake: ComponentProps<typeof RecordingTakePanel>',
  'burstDiagnostics: ComponentProps<typeof ResonanceBurstDiagnosticsPanel>',
]) {
  if (!coordinator.includes(token)) fail(`resonancePanelCoordinator.ts should use direct component prop contract: ${token}`);
}

for (const semanticBuilder of [
  'buildRecordingMarkerSideRailsProps',
  'buildResonanceControlCorePanelProps',
  'buildResonanceSoundPalettePanelProps',
  'buildResonanceGrooveBassPanelProps',
]) {
  if (!props.includes(`export function ${semanticBuilder}`)) fail(`semantic builder ${semanticBuilder} should remain; it is not an identity wrapper.`);
}

for (const forbidden of [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'requestAnimationFrame(',
  'window.addEventListener',
]) {
  if (coordinator.includes(forbidden) || chrome.includes(forbidden)) fail(`identity cleanup should not move runtime logic into coordinator/chrome: ${forbidden}`);
}

if (exists('src/features/xensonar/rooms/resonancePanelIdentityProps.ts')) {
  fail('No replacement resonancePanelIdentityProps.ts wrapper file should be introduced.');
}

console.log('[resonance-panel-identity-wrapper-cleanup] ok');
