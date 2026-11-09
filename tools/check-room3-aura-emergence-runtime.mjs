#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (p) => readFileSync(join(root, p), 'utf8');
const failures = [];

const app = read('src/App.tsx');
const boundary = read('src/features/xensonar/myzelSynth/myzelRoom3RuntimeBoundary.ts');
const frame = read('src/features/topology/myzelRoom3Frame.ts');
const field = read('src/features/topology/myzelSpatialEffectField.ts');
const resident = read('src/features/topology/residentFieldFrame.ts');
const snapshot = read('src/features/topology/myceliumSnapshot.ts');

const mustContain = [
  [app, 'advanceMyzelSynthRoom3Runtime({', 'App.tsx must drive Room III via myzel synth runtime boundary'],
  [app, 'renderMyzelSynthRoom3RuntimeCanvas({', 'App.tsx must render Room III through runtime canvas boundary'],
  [app, 'buildMyzelResidentFieldRuntimeFrame({', 'App.tsx must build Resident Field frame through boundary'],
  [app, 'collectMyzelResidentFieldRuntimeWaveEvents({', 'App.tsx must collect resident wave events through boundary'],
  [boundary, 'renderMyzelRoom3Canvas(args)', 'boundary must expose the aura-capable Room III renderer'],
  [boundary, 'collectResidentFieldWaveCollisionEvents(args)', 'boundary must expose Resident Field collision events'],
  [frame, 'spatialFieldProbe.auraOverlaps', 'Room III frame must compute aura overlap relations'],
  [frame, 'renderMyzelRoom3Canvas', 'Room III frame must keep canvas renderer'],
  [frame, 'entry.config.auraRadius', 'Room III renderer must draw node aura radius fields'],
  [frame, 'getMyzelPresetWitnessHue(entry.config.presetId)', 'Room III renderer must color node auras by preset witness hue'],
  [frame, 'ballAuraRadius', 'Room III renderer must draw oscillator-ball aura'],
  [field, 'computeMyzelAuraOverlaps', 'Spatial field must compute aura overlaps'],
  [field, 'computeMyzelSpatialFieldProbe', 'Spatial field probe must drive runtime snapshot'],
  [resident, 'buildResidentFieldFrame', 'Resident Field frame builder must exist'],
  [resident, 'collectResidentFieldWaveCollisionEvents', 'Resident Field wave event collector must exist'],
  [snapshot, 'myzelTopologicalRelations', 'Snapshot must expose topological relations'],
  [snapshot, 'myzelNearestAuraStrength', 'Snapshot must expose nearest aura strength'],
  [snapshot, 'myzelPrimaryRelationInterference', 'Snapshot must expose relation interference'],
];
for (const [haystack, needle, message] of mustContain) {
  if (!haystack.includes(needle)) failures.push(`${message}: missing ${needle}`);
}

const appForbidden = [
  'computeConstellationSignature(refs.nodes',
  'applyResidentBallCoupling({',
  'collectResidentWaveCollisionEvents({',
];
for (const needle of appForbidden) {
  if (app.includes(needle)) failures.push(`App.tsx still owns old Room III inline/legacy path: ${needle}`);
}

const oldLoopNeedles = [
  'const { tension, slimLayers, rawReality } = tParams;',
  'for (const node of refs.nodes) {\n          const dx = node.x - cur.x;',
  'myceliumSnapshotRef.current = {\n          tension,',
];
for (const needle of oldLoopNeedles) {
  if (app.includes(needle)) failures.push(`App.tsx still contains old non-aura topology loop fragment: ${needle.slice(0, 60)}`);
}

if (failures.length) {
  console.error('[room3-aura-emergence-runtime] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[room3-aura-emergence-runtime] ok');
console.log(JSON.stringify({
  appUsesRuntimeBoundary: true,
  auraRenderer: true,
  residentFieldFrame: true,
  snapshotRelations: true,
}, null, 2));
