#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const framePath = 'src/features/topology/myzelRoom3Frame.ts';
const metricsPath = 'src/features/topology/myzelRoom3FrameMetrics.ts';
const physicsPath = 'src/features/topology/myzelRoom3FramePhysics.ts';
const canvasPath = 'src/features/topology/myzelRoom3CanvasRenderer.ts';
const relationsPath = 'src/features/topology/myzelTopologicalRelations.ts';
const fieldPath = 'src/features/topology/myzelSpatialEffectField.ts';

const frame = exists(framePath) ? read(framePath) : '';
const metrics = exists(metricsPath) ? read(metricsPath) : '';
const physics = exists(physicsPath) ? read(physicsPath) : '';
const canvas = exists(canvasPath) ? read(canvasPath) : '';
const relations = exists(relationsPath) ? read(relationsPath) : '';
const field = exists(fieldPath) ? read(fieldPath) : '';
const failures = [];

if (!exists(metricsPath)) failures.push('myzelRoom3FrameMetrics.ts must exist');

const mustContain = [
  [metrics, "import type { SemanticNode } from '../xensonar/domain/runtimeTypes'", 'metrics boundary must keep SemanticNode type contract explicit'],
  [metrics, "import type { MyzelRoom3Cursor } from './myzelRoom3FramePhysics'", 'metrics boundary must read the shared cursor shape without owning physics'],
  [metrics, 'export type MyzelRoom3FrameMetricsArgs', 'metrics boundary must expose its args contract'],
  [metrics, 'export type MyzelRoom3FrameMetrics', 'metrics boundary must expose its result contract'],
  [metrics, 'export function computeMyzelRoom3FrameMetrics', 'metrics boundary must export the pure metric reader'],
  [metrics, 'Strukturelle Resonanz: Myzel vibriert intensiv an', 'metrics boundary must preserve intense resonance status line'],
  [metrics, 'Lokale Verdichtung um', 'metrics boundary must preserve local densification status line'],
  [metrics, "'Fließendes Myzel'", 'metrics boundary must preserve flowing-myzel fallback status line'],
  [metrics, 'const nodeEnergyByLabel = Object.fromEntries(nodes.map((node) => [node.label, node.energy]))', 'metrics boundary must preserve node energy map'],
  [metrics, 'const centerX = nodes.reduce((sum, node) => sum + node.x, 0) / Math.max(1, nodes.length)', 'metrics boundary must preserve layout center X calculation'],
  [metrics, 'const centerY = nodes.reduce((sum, node) => sum + node.y, 0) / Math.max(1, nodes.length)', 'metrics boundary must preserve layout center Y calculation'],
  [metrics, 'let nearestNode: SemanticNode | null = null', 'metrics boundary must own nearest-node scan'],
  [metrics, 'const nodeDist = Math.hypot(node.x - cursor.x, node.y - cursor.y)', 'metrics boundary must preserve cursor-to-node distance scan'],
  [metrics, '(1 - clamp(layoutSpread, 0, 1)) * 0.45', 'metrics boundary must preserve coherence layout weight'],
  [metrics, 'clamp(nearestNode?.energy ?? 0, 0, 1) * 0.35', 'metrics boundary must preserve coherence energy weight'],
  [metrics, '(1 - clamp(nearestNodeDist / 220, 0, 1)) * 0.2', 'metrics boundary must preserve coherence distance weight'],
  [metrics, 'tension * 0.45 + clamp(Math.hypot(cursor.vx, cursor.vy) / 12, 0, 1) * 0.3 + maxEnergy * 0.25', 'metrics boundary must preserve tension-field formula'],
  [frame, "import { computeMyzelRoom3FrameMetrics } from './myzelRoom3FrameMetrics'", 'room3 frame must delegate layout/nearest/coherence metrics'],
  [frame, 'const frameMetrics = computeMyzelRoom3FrameMetrics({', 'room3 frame must consume the metrics boundary explicitly'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const forbiddenInFrame = [
  'const statusLine = activeNode',
  'const nodeEnergyByLabel = Object.fromEntries(nodes.map((node) => [node.label, node.energy]))',
  'const centerX = nodes.reduce((sum, node) => sum + node.x, 0) / Math.max(1, nodes.length)',
  'const centerY = nodes.reduce((sum, node) => sum + node.y, 0) / Math.max(1, nodes.length)',
  'let nearestNode: SemanticNode | null = null',
  'let nearestNodeDist = Number.POSITIVE_INFINITY',
  '(1 - clamp(layoutSpread, 0, 1)) * 0.45',
  'tension * 0.45 + clamp(Math.hypot(cur.vx, cur.vy) / 12, 0, 1) * 0.3 + maxEnergy * 0.25',
];
for (const needle of forbiddenInFrame) {
  if (frame.includes(needle)) failures.push(`room3 frame still owns metrics detail: ${needle}`);
}

const forbiddenInMetrics = [
  'advanceMyzelRoom3CursorPhysics',
  'node.energy +=',
  'node.energy =',
  'cur.vx',
  'cur.vy',
  'computeMyzelSpatialFieldProbe',
  'blendSpatialFieldIntoLegacySignature',
  'computeNodalRelationLayer',
  'computeConstellationSignature',
  'buildMyzelTopologicalRelations',
  'CanvasRenderingContext2D',
  'renderMyzelRoom3Canvas',
  'MyceliumSnapshot',
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
for (const needle of forbiddenInMetrics) {
  if (metrics.includes(needle)) failures.push(`metrics boundary must stay pure/non-physics/non-render/audio/UI: ${needle}`);
}

if (physics.includes('computeMyzelRoom3FrameMetrics') || canvas.includes('computeMyzelRoom3FrameMetrics') || relations.includes('computeMyzelRoom3FrameMetrics') || field.includes('computeMyzelRoom3FrameMetrics')) {
  failures.push('frame metrics boundary should only be consumed by the Room III frame orchestrator');
}

const frameLineCount = frame.split('\n').length;
const metricsLineCount = metrics.split('\n').length;
if (frameLineCount > 215) failures.push(`myzelRoom3Frame.ts should shrink after metrics extraction; found ${frameLineCount} lines`);
if (metricsLineCount > 95) failures.push(`myzelRoom3FrameMetrics.ts should stay compact; found ${metricsLineCount} lines`);

if (failures.length) {
  console.error('[myzel-room3-frame-metrics-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[myzel-room3-frame-metrics-boundary] OK');
