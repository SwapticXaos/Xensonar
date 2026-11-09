#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const panel = fs.readFileSync('src/features/xensonar/rooms/ResonanceSoundPalettePanel.tsx', 'utf8');
const presets = fs.readFileSync('src/features/xensonar/domain/metaPresets.ts', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

for (const needle of [
  'Glücksrad-Manager',
  'WHEEL_ORDER_STORAGE_KEY',
  'orderedWheelPresets',
  'Slot-Zufall',
  'Synth-/Meta-Parameter',
]) {
  if (!panel.includes(needle)) failures.push(`missing panel marker: ${needle}`);
}
for (const needle of [
  'Celestial Pad',
  'Psy-Prog',
  'Dream Modal',
  'Bleak Sci-Fi',
  'Meditation',
  'Harmonic Mystery',
  'Tribal Blues',
  'Space Whole-Tone',
  'Gamelan Pelog',
  'Maqam Rast',
  'Bohlen-Pierce Drone',
  'DEFAULT_META_PRESET_WHEEL_SLOT_IDS',
]) {
  if (!presets.includes(needle)) failures.push(`missing preset marker: ${needle}`);
}
if (!pkg.scripts?.['xensonar:check-meta-preset-wheel-manager']) failures.push('missing package script xensonar:check-meta-preset-wheel-manager');
if (presets.includes('53edo')) failures.push('should not silently import unsupported 53edo into Xensonar grid contract');
if (presets.includes('gamelan_pelog')) failures.push('should not use foreign gamelan_pelog tuning id in Xensonar presets');

if (failures.length) {
  console.error('[meta-preset-wheel-manager] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  patch: '118_meta_preset_wheel_manager_basis',
  wheelSlots: 8,
  libraryMarkers: 13,
  persistence: 'wheel order via localStorage; user snapshot capture pending',
  proofClass: 'source-shape/static UI contract + production build; not a browser drag/drop smoke test and not a Klang proof',
}, null, 2));
