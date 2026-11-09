#!/usr/bin/env node
import fs from 'node:fs';

const path = 'src/features/xensonar/rooms/ResonanceGuidePanel.tsx';
const src = fs.readFileSync(path, 'utf8');
const failures = [];
for (const needle of [
  'Partikel-Zeitkörper durchschalten',
  '16/24/27/32/64 Slots',
  'other',
  'Bezugstakte',
]) {
  if (!src.includes(needle)) failures.push(`${path}: missing ${needle}`);
}
for (const forbidden of ['16tel, 32tel, 64tel']) {
  if (src.includes(forbidden)) failures.push(`${path}: stale guide copy ${forbidden}`);
}
if (failures.length) {
  console.error('[resonance-guide-quantize-copy] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[resonance-guide-quantize-copy] OK');
