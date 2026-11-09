#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const framePath = 'src/features/topology/myzelRoom3Frame.ts';
const physicsPath = 'src/features/topology/myzelRoom3FramePhysics.ts';
const canvasPath = 'src/features/topology/myzelRoom3CanvasRenderer.ts';
const relationsPath = 'src/features/topology/myzelTopologicalRelations.ts';
const fieldPath = 'src/features/topology/myzelSpatialEffectField.ts';

const frame = exists(framePath) ? read(framePath) : '';
const physics = exists(physicsPath) ? read(physicsPath) : '';
const canvas = exists(canvasPath) ? read(canvasPath) : '';
const relations = exists(relationsPath) ? read(relationsPath) : '';
const field = exists(fieldPath) ? read(fieldPath) : '';
const failures = [];

const mustContain = [
  [physics, "import type { SemanticNode } from '../xensonar/domain/runtimeTypes'", 'physics boundary must keep the SemanticNode contract explicit'],
  [physics, 'export type MyzelRoom3Cursor', 'physics boundary must own the cursor data contract'],
  [physics, 'export type MyzelRoom3Params', 'physics boundary must own the mutable frame-physics params contract'],
  [physics, 'export function advanceMyzelRoom3CursorPhysics', 'physics boundary must export the cursor/frame physics step'],
  [physics, 'const dissipationRate = 0.005 + slimLayers * 0.02', 'physics boundary must preserve node energy dissipation formula'],
  [physics, 'const force = (1 / (nodeDist + 10)) * tension * 500', 'physics boundary must preserve node pull formula'],
  [physics, 'if (nodeDist < 80) node.energy += 0.015 * (1 - slimLayers * 0.5)', 'physics boundary must preserve near-node excitation formula'],
  [physics, 'cur.vx += (Math.random() - 0.5) * 2.5', 'physics boundary must preserve horizontal stochastic drift'],
  [physics, 'cur.vy += (Math.random() - 0.5) * 2.5', 'physics boundary must preserve vertical stochastic drift'],
  [physics, 'cur.vx *= 0.94', 'physics boundary must preserve velocity damping'],
  [physics, 'cur.vy *= 0.94', 'physics boundary must preserve velocity damping'],
  [physics, 'cur.vx = Math.abs(cur.vx)', 'physics boundary must preserve left-wall bounce semantics'],
  [physics, 'cur.vx = -Math.abs(cur.vx)', 'physics boundary must preserve right-wall bounce semantics'],
  [physics, 'cur.vy = Math.abs(cur.vy)', 'physics boundary must preserve top-wall bounce semantics'],
  [physics, 'cur.vy = -Math.abs(cur.vy)', 'physics boundary must preserve bottom-wall bounce semantics'],
  [physics, 'return { maxEnergy, dominantFreq, activeNode }', 'physics boundary must return the legacy frame energy readout'],
  [frame, "import { advanceMyzelRoom3CursorPhysics } from './myzelRoom3FramePhysics'", 'room3 frame must delegate physics advancement to the boundary'],
  [frame, "export type { MyzelRoom3Cursor, MyzelRoom3Params } from './myzelRoom3FramePhysics'", 'room3 frame must re-export cursor/params types for legacy imports'],
  [frame, 'const { maxEnergy, dominantFreq, activeNode } = advanceMyzelRoom3CursorPhysics({', 'room3 frame must consume the physics result explicitly'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const forbiddenInFrame = [
  'const dissipationRate = 0.005 + slimLayers * 0.02',
  'let pullX = 0',
  'let pullY = 0',
  'node.energy += 0.015',
  'node.energy = Math.max(0, Math.min(1, node.energy - dissipationRate))',
  'cur.vx += (Math.random() - 0.5) * 2.5',
  'cur.vy += (Math.random() - 0.5) * 2.5',
  'cur.vx *= 0.94',
  'cur.vy *= 0.94',
  'cur.x = 0',
  'cur.x = width',
  'cur.y = 0',
  'cur.y = height',
];
for (const needle of forbiddenInFrame) {
  if (frame.includes(needle)) failures.push(`room3 frame still owns cursor physics detail: ${needle}`);
}

const forbiddenInPhysics = [
  'CanvasRenderingContext2D',
  'renderMyzelRoom3Canvas',
  'computeMyzelSpatialFieldProbe',
  'blendSpatialFieldIntoLegacySignature',
  'computeNodalRelationLayer',
  'computeConstellationSignature',
  'buildMyzelTopologicalRelations',
  'MyceliumSnapshot',
  'previousConstellation',
  'constellationState',
  'spatialFieldProbe',
  'statusLine',
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
for (const needle of forbiddenInPhysics) {
  if (physics.includes(needle)) failures.push(`physics boundary must not own frame/canvas/audio/UI runtime detail: ${needle}`);
}

if (canvas.includes('advanceMyzelRoom3CursorPhysics') || relations.includes('advanceMyzelRoom3CursorPhysics') || field.includes('advanceMyzelRoom3CursorPhysics')) {
  failures.push('cursor physics boundary should only be consumed by the Room III frame orchestrator');
}

const frameLineCount = frame.split('\n').length;
const physicsLineCount = physics.split('\n').length;
if (frameLineCount > 225) failures.push(`myzelRoom3Frame.ts should shrink after physics extraction; found ${frameLineCount} lines`);
if (physicsLineCount > 115) failures.push(`myzelRoom3FramePhysics.ts should stay a compact physics boundary; found ${physicsLineCount} lines`);

if (failures.length) {
  console.error('[myzel-room3-frame-physics-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[myzel-room3-frame-physics-boundary] OK');
