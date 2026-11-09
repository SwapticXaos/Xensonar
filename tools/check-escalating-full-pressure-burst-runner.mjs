#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const runnerPath = resolve(root, 'tools/run-escalating-full-pressure-burst-runner.mjs');
const runner = readFileSync(runnerPath, 'utf8');
const required = [
  'escalatingStimulus',
  'L0-warmup-active-lanes',
  'L1-root-follow-keyboard-glissando',
  'L2-apostroph-hold-long-tones',
  'L3-wavestarter-dauerfeuer',
  'L4-particle-ringwave-resident-reaction',
  'L5-combo-all-lanes-pressure',
  'L6-dauerfeuer-no-mercy',
  'apostroph-hold',
  'Quote',
  'uiBurstRecorderProbe',
  'Aufzeichnung starten',
  'Aufzeichnung stoppen',
  'dummyRootFollowUpload',
  'dummyMaterialUpload',
  'Root Follow Loop Aktiv',
  'Materialspur Aktiv',
  'Drums Aktiv',
  'Bass Aktiv',
  'particle-ringwave-resident-reaction',
  'firstStallLevel',
  'highestCompletedLevel',
  'recoveredAfterCooldown',
];
const missing = required.filter((needle) => !runner.includes(needle));
if (missing.length) {
  console.error('[escalating-full-pressure-burst-runner] missing required tokens:');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}
if (/Scheinmess|fake|mock-results/i.test(runner)) {
  console.error('[escalating-full-pressure-burst-runner] runner must not contain fake/mock result language.');
  process.exit(1);
}
console.log('[escalating-full-pressure-burst-runner] OK');
