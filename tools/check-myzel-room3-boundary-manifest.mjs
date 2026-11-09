#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const failures = [];

const manifestPath = 'src/features/topology/myzelRoom3BoundaryManifest.ts';
const docPath = 'docs/MYZEL_ROOM3_BOUNDARY_MANIFEST_3.2.91.6.9.77.md';
const framePath = 'src/features/topology/myzelRoom3Frame.ts';
const spatialFieldPath = 'src/features/topology/myzelSpatialEffectField.ts';
const sanitySuitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';

if (!exists(manifestPath)) failures.push('myzelRoom3BoundaryManifest.ts must exist');
if (!exists(docPath)) failures.push('Boundary manifest documentation must exist');

const manifest = exists(manifestPath) ? read(manifestPath) : '';
const doc = exists(docPath) ? read(docPath) : '';
const frame = exists(framePath) ? read(framePath) : '';
const spatialField = exists(spatialFieldPath) ? read(spatialFieldPath) : '';
const sanitySuite = exists(sanitySuitePath) ? read(sanitySuitePath) : '';

const expectedFiles = [
  'myzelSpatialFieldTypes.ts',
  'myzelSpatialEffectMix.ts',
  'myzelNodeSpatialConfig.ts',
  'myzelBallSpectralFieldReader.ts',
  'myzelAuraOverlapGeometry.ts',
  'myzelConstellationGestalt.ts',
  'myzelLegacySignatureBridge.ts',
  'myzelTopologicalRelations.ts',
  'myzelRoom3CanvasRenderer.ts',
  'myzelRoom3FramePhysics.ts',
  'myzelRoom3FrameMetrics.ts',
  'myzelRoom3SnapshotAssembly.ts',
  'myzelRoom3Frame.ts',
];
for (const file of expectedFiles) {
  if (!manifest.includes(file)) failures.push(`Boundary manifest must name ${file}`);
  if (!doc.includes(file)) failures.push(`Boundary documentation must name ${file}`);
}

const expectedConcerns = [
  'types',
  'mix-chemistry',
  'node-config',
  'ball-field-reading',
  'aura-overlap-geometry',
  'constellation-gestalt',
  'legacy-signature-bridge',
  'topological-relations',
  'canvas-rendering',
  'frame-physics',
  'frame-metrics',
  'snapshot-assembly',
  'frame-orchestration',
];
for (const concern of expectedConcerns) {
  if (!manifest.includes(`'${concern}'`)) failures.push(`Boundary manifest must include concern ${concern}`);
}

const requiredFeatureRules = [
  'Add new audible node-combination behavior as a feature branch, not as a silent refactor.',
  'Do not collapse Sub, Crush, Resonator, Vibe, and related node devices into a generic drone/aura path.',
  'Patch behavior into the owning boundary file, not into a barrel/compatibility module.',
  'Use myzelRoom3Frame.ts as sequencer only unless the change is explicitly about sequencing.',
  'Use myzelSpatialEffectField.ts as probe orchestrator only unless the change is explicitly about probe orchestration.',
];
for (const rule of requiredFeatureRules) {
  if (!manifest.includes(rule)) failures.push(`Boundary manifest must retain merge/feature rule: ${rule}`);
}

const forbiddenRuntimeMarkers = [
  'CanvasRenderingContext2D',
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
  'node.energy +=',
  'cur.vx +=',
  'requestAnimationFrame',
];
for (const marker of forbiddenRuntimeMarkers) {
  if (manifest.includes(marker)) failures.push(`Boundary manifest must stay descriptive/static, found runtime marker: ${marker}`);
}

if (manifest.includes('export function') || manifest.includes('=>') || manifest.includes('Math.')) {
  failures.push('Boundary manifest must not become a calculation/runtime helper');
}

if (!sanitySuite.includes('xensonar:check-myzel-room3-boundary-manifest')) {
  failures.push('Refactor sanity suite must include the Myzel Room III boundary manifest guard');
}

if (frame.includes('MYZEL_ROOM3_BOUNDARY_RULES') || spatialField.includes('MYZEL_ROOM3_BOUNDARY_RULES')) {
  failures.push('Runtime/orchestrator files must not import the descriptive boundary manifest');
}

const manifestLineCount = manifest.split('\n').length;
if (manifestLineCount < 110) failures.push(`Boundary manifest looks too thin to protect the split; found ${manifestLineCount} lines`);
if (manifestLineCount > 260) failures.push(`Boundary manifest should remain compact; found ${manifestLineCount} lines`);

if (failures.length) {
  console.error('[myzel-room3-boundary-manifest] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[myzel-room3-boundary-manifest] OK');
