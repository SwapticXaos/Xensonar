#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const exists = (p) => existsSync(join(root, p));
const read = (p) => readFileSync(join(root, p), 'utf8');
const requireFile = (p) => { if (!exists(p)) failures.push(`missing ${p}`); };
const requireContains = (p, needle, note = '') => {
  if (!exists(p)) return;
  if (!read(p).includes(needle)) failures.push(`${p} missing ${needle}${note ? ` · ${note}` : ''}`);
};
const requireNotContains = (p, needle, note = '') => {
  if (!exists(p)) return;
  if (read(p).includes(needle)) failures.push(`${p} must not contain ${needle}${note ? ` · ${note}` : ''}`);
};

for (const p of [
  'src/features/xensonar/myzelSynth/myzelRoom3RuntimeBoundary.ts',
  'src/features/topology/myzelRoom3Frame.ts',
  'src/features/topology/residentFieldFrame.ts',
  'src/features/topology/topologyViewFocus.ts',
  'src/features/topology/myzelSpatialEffectField.ts',
  'src/features/topology/nodalRelationLayer.ts',
]) requireFile(p);

for (const marker of [
  'advanceMyzelRoom3Frame',
  'computeMyzelSpatialFieldProbe',
  'computeNodalRelationLayer',
  'MyzelRoom3Frame',
]) requireContains('src/features/topology/myzelRoom3Frame.ts', marker);

for (const marker of [
  'buildResidentFieldFrame',
  'collectResidentFieldWaveCollisionEvents',
  'ResidentFieldWaveCollisionEvent',
]) requireContains('src/features/topology/residentFieldFrame.ts', marker);

for (const marker of [
  'advanceMyzelSynthRoom3Runtime',
  'buildMyzelResidentFieldRuntimeFrame',
]) requireContains('src/features/xensonar/myzelSynth/myzelRoom3RuntimeBoundary.ts', marker);

for (const marker of ['field', 'sound', 'routing', 'export', 'TOPOLOGY_VIEW_FOCUS_OPTIONS']) {
  requireContains('src/features/topology/topologyViewFocus.ts', marker);
}

requireNotContains('src/App.tsx', 'for (const node of nodes) {\n    const dx = node.x - cur.x;', 'Room III frame physics belongs in myzelRoom3Frame/runtime boundary, not App.tsx.');
requireNotContains('src/App.tsx', 'lastResidentWaveTrigger', 'Resident field debounce belongs in residentFieldFrame, not App.tsx.');

const appLines = exists('src/App.tsx') ? read('src/App.tsx').split('\n').length : 99999;
if (appLines >= 7765) failures.push(`App.tsx ${appLines} lines; expected below 6.8.7 baseline while activating Myzel Room III slice.`);

if (failures.length) {
  console.error('[room3-frame-runtime-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`[room3-frame-runtime-boundary] ok · App.tsx ${appLines} lines`);
