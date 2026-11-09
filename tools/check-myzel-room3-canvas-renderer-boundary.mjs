#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const framePath = 'src/features/topology/myzelRoom3Frame.ts';
const rendererPath = 'src/features/topology/myzelRoom3CanvasRenderer.ts';
const nodeConfigPath = 'src/features/topology/myzelNodeSpatialConfig.ts';
const typesPath = 'src/features/topology/myzelSpatialFieldTypes.ts';
const runtimeBoundaryPath = 'src/features/xensonar/myzelSynth/myzelRoom3RuntimeBoundary.ts';

const frame = exists(framePath) ? read(framePath) : '';
const renderer = exists(rendererPath) ? read(rendererPath) : '';
const nodeConfig = exists(nodeConfigPath) ? read(nodeConfigPath) : '';
const types = exists(typesPath) ? read(typesPath) : '';
const runtimeBoundary = exists(runtimeBoundaryPath) ? read(runtimeBoundaryPath) : '';
const failures = [];

const mustContain = [
  [renderer, "import type { SemanticNode } from '../xensonar/domain/runtimeTypes'", 'canvas renderer must keep the SemanticNode drawing contract explicit'],
  [renderer, "import { getMyzelPresetWitnessHue } from './myzelNodeSpatialConfig'", 'canvas renderer must get witness hues from node spatial config, not the frame barrel'],
  [renderer, "import type { MyzelSpatialFieldProbe } from './myzelSpatialFieldTypes'", 'canvas renderer must depend on the spatial-field type boundary'],
  [renderer, 'export function renderMyzelRoom3Canvas', 'canvas renderer must export the existing render function'],
  [renderer, 'ctx: CanvasRenderingContext2D', 'canvas renderer must retain the canvas context contract'],
  [renderer, "c.fillStyle = '#0a0a0c'", 'canvas renderer must preserve Room III background fill'],
  [renderer, 'const nodeWitnessById = new Map(spatialFieldProbe.nodeConfigs.map((entry) => [entry.id, entry]))', 'canvas renderer must preserve node witness lookup'],
  [renderer, 'spatialFieldProbe.nodeConfigs.forEach', 'canvas renderer must preserve aura drawing pass'],
  [renderer, 'spatialFieldProbe.ball.activeRelations.forEach', 'canvas renderer must preserve active relation drawing pass'],
  [renderer, 'nodes.forEach((node) =>', 'canvas renderer must preserve node drawing pass'],
  [renderer, 'const ballAuraRadius = 14 + spatialFieldProbe.ball.voidPressure * 28 + spatialFieldProbe.ball.relationTension * 24', 'canvas renderer must preserve ball aura radius formula'],
  [renderer, 'c.lineTo(cur.x - cur.vx * 6, cur.y - cur.vy * 6)', 'canvas renderer must preserve velocity tail drawing'],
  [frame, "export { renderMyzelRoom3Canvas } from './myzelRoom3CanvasRenderer'", 'room3 frame must re-export the renderer for legacy imports'],
  [runtimeBoundary, "renderMyzelRoom3Canvas", 'Room III runtime boundary must still receive the renderer through the stable frame import path'],
  [nodeConfig, 'export function getMyzelPresetWitnessHue', 'node spatial config must remain the witness-hue source'],
  [types, 'export interface MyzelSpatialFieldProbe', 'spatial field type boundary must still own the renderer input probe contract'],
];

for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const forbiddenInFrame = [
  'CanvasRenderingContext2D',
  'fillRect(0, 0, width, height)',
  'nodeWitnessById',
  'c.strokeStyle',
  'c.fillStyle',
  'getMyzelPresetWitnessHue',
  'spatialFieldProbe.ball.activeRelations.forEach',
  'ballAuraRadius',
  'velocity tail',
];
for (const needle of forbiddenInFrame) {
  if (frame.includes(needle)) failures.push(`room3 frame still owns canvas rendering detail: ${needle}`);
}

const forbiddenInRenderer = [
  'advanceMyzelRoom3Frame',
  'computeMyzelSpatialFieldProbe',
  'blendSpatialFieldIntoLegacySignature',
  'computeNodalRelationLayer',
  'computeConstellationSignature',
  'buildMyzelTopologicalRelations',
  'MyceliumSnapshot',
  'previousConstellation',
  'constellationState',
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
for (const needle of forbiddenInRenderer) {
  if (renderer.includes(needle)) failures.push(`canvas renderer must stay a drawing boundary and must not own frame/audio/UI runtime detail: ${needle}`);
}

const frameLineCount = frame.split('\n').length;
const rendererLineCount = renderer.split('\n').length;
if (frameLineCount > 285) failures.push(`myzelRoom3Frame.ts should shrink after canvas rendering extraction; found ${frameLineCount} lines`);
if (rendererLineCount > 150) failures.push(`myzelRoom3CanvasRenderer.ts should stay a thin renderer; found ${rendererLineCount} lines`);

if (failures.length) {
  console.error('[myzel-room3-canvas-renderer-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[myzel-room3-canvas-renderer-boundary] OK');
