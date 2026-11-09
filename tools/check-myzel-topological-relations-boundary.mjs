#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const framePath = 'src/features/topology/myzelRoom3Frame.ts';
const relationPath = 'src/features/topology/myzelTopologicalRelations.ts';
const snapshotPath = 'src/features/topology/myceliumSnapshot.ts';
const snapshotAssemblyPath = 'src/features/topology/myzelRoom3SnapshotAssembly.ts';
const typesPath = 'src/features/topology/myzelSpatialFieldTypes.ts';
const readerPath = 'src/features/topology/myzelBallSpectralFieldReader.ts';
const geometryPath = 'src/features/topology/myzelAuraOverlapGeometry.ts';

const frame = exists(framePath) ? read(framePath) : '';
const relation = exists(relationPath) ? read(relationPath) : '';
const snapshot = exists(snapshotPath) ? read(snapshotPath) : '';
const snapshotAssembly = exists(snapshotAssemblyPath) ? read(snapshotAssemblyPath) : '';
const types = exists(typesPath) ? read(typesPath) : '';
const reader = exists(readerPath) ? read(readerPath) : '';
const geometry = exists(geometryPath) ? read(geometryPath) : '';
const failures = [];

const mustContain = [
  [relation, "import type { MyzelTopologicalRelationSnapshot } from './myceliumSnapshot'", 'topological relation boundary must return the existing snapshot contract'],
  [relation, "import type { MyzelSpatialFieldProbe } from './myzelSpatialFieldTypes'", 'topological relation boundary must read from the spatial-field probe type boundary'],
  [relation, "import { parseJiRatioLabel } from '../resonance/weaveMath'", 'topological relation boundary must preserve JI-ratio label parsing'],
  [relation, 'export function buildMyzelTopologicalRelations', 'topological relation boundary must export the relation builder'],
  [relation, 'relationPairKey', 'topological relation boundary must preserve pair-key normalization'],
  [relation, 'spatialFieldProbe.ball.activeRelations.map', 'topological relation boundary must preserve active relation overlay'],
  [relation, 'spatialFieldProbe.auraOverlaps', 'topological relation boundary must preserve aura-overlap source'],
  [relation, 'activeRelation?.tension ?? overlap.interference * 0.68 + overlap.overlap * 0.22', 'topological relation boundary must preserve relation tension fallback'],
  [relation, 'activeRelation?.crossModAmount ?? overlap.interference * 0.72 + overlap.sparkle * 0.16', 'topological relation boundary must preserve cross-mod fallback'],
  [relation, 'ratioA: clamp(parseJiRatioLabel(overlap.nodeALabel) ?? 1, 0.25, 6)', 'topological relation boundary must preserve ratioA parsing clamp'],
  [relation, 'ratioB: clamp(parseJiRatioLabel(overlap.nodeBLabel) ?? 1, 0.25, 6)', 'topological relation boundary must preserve ratioB parsing clamp'],
  [relation, 'b.interference * 0.52 + b.overlap * 0.26 + b.relationTension * 0.18 + b.sparkle * 0.04', 'topological relation boundary must preserve sort priority weights'],
  [relation, '.slice(0, Math.max(0, Math.floor(limit)))', 'topological relation boundary must preserve bounded relation output'],
  [snapshotAssembly, "import { buildMyzelTopologicalRelations } from './myzelTopologicalRelations'", 'snapshot assembly must import delegated topological relation builder'],
  [snapshotAssembly, 'const myzelTopologicalRelations = buildMyzelTopologicalRelations(spatialFieldProbe, 6)', 'snapshot assembly must delegate topological relation assembly'],
  [snapshot, 'export interface MyzelTopologicalRelationSnapshot', 'snapshot contract must still own topological relation payload type'],
  [types, 'export interface MyzelSpatialFieldProbe', 'spatial field type boundary must still own probe contract'],
  [reader, 'activeRelations: activeRelations.slice(0, 12)', 'ball spectral reader must remain the active-relation source'],
  [geometry, 'export function computeMyzelAuraOverlaps', 'aura overlap geometry must remain separate from topological relation projection'],
];

for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const forbiddenInFrame = [
  'parseJiRatioLabel',
  'activeSpatialRelationsByPair',
  'activeRelation?.tension ?? overlap.interference * 0.68 + overlap.overlap * 0.22',
  'activeRelation?.crossModAmount ?? overlap.interference * 0.72 + overlap.sparkle * 0.16',
  'ratioA: clamp(parseJiRatioLabel',
  'ratioB: clamp(parseJiRatioLabel',
  'myzelTopologicalRelations = spatialFieldProbe.auraOverlaps',
  "import { buildMyzelTopologicalRelations } from './myzelTopologicalRelations'",
];
for (const needle of forbiddenInFrame) {
  if (frame.includes(needle)) failures.push(`room3 frame still owns topological relation projection detail: ${needle}`);
}

const forbiddenInRelation = [
  'computeMyzelSpatialFieldProbe',
  'readMyzelBallSpectralField',
  'computeMyzelAuraOverlaps',
  'analyzeMyzelConstellationGestalt',
  'buildMyzelNodeSpatialConfig',
  'blendSpatialFieldIntoLegacySignature',
  'computeNodalRelationLayer',
  'CanvasRenderingContext2D',
  'document.',
  'window.',
  'AudioContext',
  'OscillatorNode',
  'GainNode',
  'React',
  'useState',
  'useRef',
  'useEffect',
];
for (const needle of forbiddenInRelation) {
  if (relation.includes(needle)) failures.push(`topological relation boundary must stay a pure snapshot projector and must not own runtime/UI/audio/probe detail: ${needle}`);
}

const relationForbiddenRuntimeImports = ['from \'react\'', 'from "react"', '../xensonar/', '../../xensonar/'];
for (const needle of relationForbiddenRuntimeImports) {
  if (relation.includes(needle)) failures.push(`topological relation boundary must not import UI/audio runtime detail: ${needle}`);
}

const frameLineCount = frame.split('\n').length;
if (frameLineCount > 390) failures.push(`myzelRoom3Frame.ts should not grow during relation projection extraction; found ${frameLineCount} lines`);

if (failures.length) {
  console.error('[myzel-topological-relations-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[myzel-topological-relations-boundary] OK');
