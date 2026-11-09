#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const framePath = 'src/features/topology/myzelRoom3Frame.ts';
const snapshotAssemblyPath = 'src/features/topology/myzelRoom3SnapshotAssembly.ts';
const physicsPath = 'src/features/topology/myzelRoom3FramePhysics.ts';
const metricsPath = 'src/features/topology/myzelRoom3FrameMetrics.ts';
const canvasPath = 'src/features/topology/myzelRoom3CanvasRenderer.ts';
const fieldPath = 'src/features/topology/myzelSpatialEffectField.ts';
const relationsPath = 'src/features/topology/myzelTopologicalRelations.ts';

const frame = exists(framePath) ? read(framePath) : '';
const assembly = exists(snapshotAssemblyPath) ? read(snapshotAssemblyPath) : '';
const physics = exists(physicsPath) ? read(physicsPath) : '';
const metrics = exists(metricsPath) ? read(metricsPath) : '';
const canvas = exists(canvasPath) ? read(canvasPath) : '';
const field = exists(fieldPath) ? read(fieldPath) : '';
const relations = exists(relationsPath) ? read(relationsPath) : '';
const failures = [];

if (!exists(snapshotAssemblyPath)) failures.push('myzelRoom3SnapshotAssembly.ts must exist');

const mustContain = [
  [assembly, "import type { MyceliumSnapshot } from './myceliumSnapshot'", 'snapshot assembly must own the MyceliumSnapshot construction contract'],
  [assembly, "import { blendSpatialFieldIntoLegacySignature } from './myzelLegacySignatureBridge'", 'snapshot assembly must own the legacy/spatial constellation blend handoff'],
  [assembly, "import { buildMyzelTopologicalRelations } from './myzelTopologicalRelations'", 'snapshot assembly must own topological relation snapshot projection for the final snapshot'],
  [assembly, 'export type MyzelRoom3ConstellationState', 'snapshot assembly must expose the constellation-state value shape'],
  [assembly, 'export type AssembleMyzelRoom3SnapshotArgs', 'snapshot assembly must expose its args contract'],
  [assembly, 'export type MyzelRoom3SnapshotAssembly', 'snapshot assembly must expose its result contract'],
  [assembly, 'export function assembleMyzelRoom3Snapshot', 'snapshot assembly must export the snapshot builder'],
  [assembly, 'const ratioDelta = constellationSignature.ratios.reduce', 'snapshot assembly must preserve ratio delta calculation'],
  [assembly, 'previousConstellation.flux * 0.82 + signatureDelta * 0.52', 'snapshot assembly must preserve legacy constellation flux smoothing'],
  [assembly, 'const spatialConstellation = blendSpatialFieldIntoLegacySignature({', 'snapshot assembly must preserve legacy/spatial bridge call'],
  [assembly, 'const nearestAuraStrength = nearestSpatialNode', 'snapshot assembly must preserve nearest aura strength calculation'],
  [assembly, 'const myzelTopologicalRelations = buildMyzelTopologicalRelations(spatialFieldProbe, 6)', 'snapshot assembly must preserve topological relation limit'],
  [assembly, 'snapshot: {', 'snapshot assembly must own the final MyceliumSnapshot object literal'],
  [assembly, 'myzelSpatialWavefolder: spatialFieldProbe.ball.spatialEffectMix.wavefolderAmount', 'snapshot assembly must map spatial effect mix into snapshot'],
  [assembly, 'myzelPrimaryRelationRatioB: primaryTopologicalRelation?.ratioB ?? 1', 'snapshot assembly must preserve primary relation snapshot fallbacks'],
  [frame, "import { assembleMyzelRoom3Snapshot } from './myzelRoom3SnapshotAssembly'", 'Room III frame must delegate final snapshot construction'],
  [frame, 'const snapshotAssembly = assembleMyzelRoom3Snapshot({', 'Room III frame must call the snapshot assembly boundary'],
  [frame, 'snapshot: snapshotAssembly.snapshot', 'Room III frame must return the assembled snapshot without rebuilding it'],
  [frame, "export type { MyzelRoom3ConstellationState } from './myzelRoom3SnapshotAssembly'", 'Room III frame must keep constellation-state type compatibility by re-export'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const forbiddenInFrame = [
  'const ratioDelta = constellationSignature.ratios.reduce',
  'const signatureDelta = clamp(',
  'const spatialConstellation = blendSpatialFieldIntoLegacySignature({',
  'const nearestAuraStrength = nearestSpatialNode',
  'const myzelTopologicalRelations = buildMyzelTopologicalRelations(spatialFieldProbe, 6)',
  'const primaryTopologicalRelation = myzelTopologicalRelations[0] ?? null',
  'snapshot: {',
  'myzelSpatialWavefolder: spatialFieldProbe.ball.spatialEffectMix.wavefolderAmount',
  'myzelNearestPresetId: nearestSpatialNode?.config.presetId ?? null',
  'myzelPrimaryRelationRatioB: primaryTopologicalRelation?.ratioB ?? 1',
  "import { clamp } from '../xensonar/helpers'",
  "import { buildMyzelTopologicalRelations } from './myzelTopologicalRelations'",
  "blendSpatialFieldIntoLegacySignature",
];
for (const needle of forbiddenInFrame) {
  if (frame.includes(needle)) failures.push(`Room III frame still owns snapshot assembly detail: ${needle}`);
}

const forbiddenInAssembly = [
  "from './myzelRoom3Frame'",
  'advanceMyzelRoom3CursorPhysics',
  'computeMyzelRoom3FrameMetrics',
  'computeConstellationSignature',
  'computeMyzelSpatialFieldProbe',
  'computeNodalRelationLayer',
  'CanvasRenderingContext2D',
  'renderMyzelRoom3Canvas',
  'node.energy +=',
  'node.energy =',
  'cur.vx +=',
  'cur.vy +=',
  'AudioContext',
  'OscillatorNode',
  'GainNode',
  'document.',
  'window.',
  'from \'react\'',
  'from "react"',
  'useState',
  'useRef',
  'useEffect',
];
for (const needle of forbiddenInAssembly) {
  if (assembly.includes(needle)) failures.push(`snapshot assembly must stay assembly-only/non-physics/non-render/audio/UI: ${needle}`);
}

if (physics.includes('assembleMyzelRoom3Snapshot') || metrics.includes('assembleMyzelRoom3Snapshot') || canvas.includes('assembleMyzelRoom3Snapshot') || field.includes('assembleMyzelRoom3Snapshot') || relations.includes('assembleMyzelRoom3Snapshot')) {
  failures.push('snapshot assembly should only be consumed by the Room III frame orchestrator');
}

const frameLineCount = frame.split('\n').length;
const assemblyLineCount = assembly.split('\n').length;
if (frameLineCount > 175) failures.push(`myzelRoom3Frame.ts should shrink after snapshot assembly extraction; found ${frameLineCount} lines`);
if (assemblyLineCount > 235) failures.push(`myzelRoom3SnapshotAssembly.ts should stay bounded; found ${assemblyLineCount} lines`);

if (failures.length) {
  console.error('[myzel-room3-snapshot-assembly-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[myzel-room3-snapshot-assembly-boundary] OK');
