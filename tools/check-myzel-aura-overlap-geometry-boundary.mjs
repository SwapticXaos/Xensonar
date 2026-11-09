#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const fieldPath = 'src/features/topology/myzelSpatialEffectField.ts';
const geometryPath = 'src/features/topology/myzelAuraOverlapGeometry.ts';
const gestaltPath = 'src/features/topology/myzelConstellationGestalt.ts';
const readerPath = 'src/features/topology/myzelBallSpectralFieldReader.ts';
const mixPath = 'src/features/topology/myzelSpatialEffectMix.ts';
const configPath = 'src/features/topology/myzelNodeSpatialConfig.ts';

const field = read(fieldPath);
const geometry = exists(geometryPath) ? read(geometryPath) : '';
const gestalt = exists(gestaltPath) ? read(gestaltPath) : '';
const reader = exists(readerPath) ? read(readerPath) : '';
const mix = exists(mixPath) ? read(mixPath) : '';
const config = exists(configPath) ? read(configPath) : '';
const failures = [];

const mustContain = [
  [geometry, 'export function computeMyzelAuraOverlaps', 'aura overlap geometry boundary must export overlap computation'],
  [geometry, 'type NodeSpatialConfigEntry', 'aura overlap geometry boundary must declare its node-config entry input shape'],
  [geometry, 'function gaussianAuraWeight', 'aura overlap geometry boundary must own soft aura field weighting'],
  [geometry, 'const radiusA = clamp', 'aura overlap geometry must preserve radius-A expansion'],
  [geometry, 'const radiusB = clamp', 'aura overlap geometry must preserve radius-B expansion'],
  [geometry, 'const rawOverlap = clamp01', 'aura overlap geometry must preserve raw overlap derivation'],
  [geometry, 'const midpointX =', 'aura overlap geometry must preserve weighted midpoint X'],
  [geometry, 'const midpointY =', 'aura overlap geometry must preserve weighted midpoint Y'],
  [geometry, 'const fieldAAtMid = gaussianAuraWeight', 'aura overlap geometry must preserve field-A-at-midpoint reading'],
  [geometry, 'const fieldBAtMid = gaussianAuraWeight', 'aura overlap geometry must preserve field-B-at-midpoint reading'],
  [geometry, 'const softness = clamp01(softProduct', 'aura overlap geometry must preserve softness derivation'],
  [geometry, 'if (softness <= 0.035) continue', 'aura overlap geometry must preserve small-overlap rejection threshold'],
  [geometry, 'getPrimaryMyzelEffectFamily(', 'aura overlap geometry must still read primary effect families'],
  [geometry, 'resolveMyzelRelationCompatibility(', 'aura overlap geometry must still use relation chemistry'],
  [geometry, 'const interference = clamp01', 'aura overlap geometry must preserve interference derivation'],
  [geometry, 'const sparkle = clamp01', 'aura overlap geometry must preserve sparkle derivation'],
  [geometry, 'getMyzelPresetWitnessHue(', 'aura overlap geometry must preserve witness hue averaging'],
  [geometry, 'return overlaps.sort((a, b) => b.interference - a.interference).slice(0, 22)', 'aura overlap geometry must preserve sort/limit behavior'],
  [field, "from './myzelAuraOverlapGeometry'", 'spatial effect field must import delegated aura overlap geometry'],
  [field, 'computeMyzelAuraOverlaps', 'spatial effect field must preserve computeMyzelAuraOverlaps barrel export compatibility'],
  [field, 'getMyzelPresetWitnessHue', 'spatial effect field must preserve preset witness hue barrel export compatibility'],
  [field, 'const auraOverlaps = computeMyzelAuraOverlaps(nodeConfigs)', 'spatial effect field must delegate aura overlaps during probe assembly'],
  [field, 'export function computeMyzelSpatialFieldProbe', 'spatial effect field must still own probe assembly'],
  [field, "from './myzelConstellationGestalt'", 'spatial effect field must import delegated constellation gestalt analysis'],
  [field, 'gestalt: analyzeMyzelConstellationGestalt(nodes, width, height)', 'spatial effect field must delegate constellation gestalt during probe assembly'],
  [gestalt, 'export function analyzeMyzelConstellationGestalt', 'constellation gestalt boundary must own gestalt analysis'],
  [reader, 'export function readMyzelBallSpectralField', 'ball spectral reader boundary must remain separate from overlap geometry'],
  [mix, 'export function resolveMyzelRelationCompatibility', 'mix boundary must remain source of relation chemistry'],
  [mix, 'export function getPrimaryMyzelEffectFamily', 'mix boundary must remain source of primary-family reading'],
  [config, 'export function getMyzelPresetWitnessHue', 'node spatial config boundary must remain source of preset witness hue'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const overlapFields = [
  'nodeAId',
  'nodeBId',
  'nodeALabel',
  'nodeBLabel',
  'presetA',
  'presetB',
  'familyA',
  'familyB',
  'x: midpointX',
  'y: midpointY',
  'distance',
  'overlap: rawOverlap',
  'softness',
  'interference',
  'sparkle',
  'hue: (hueA + hueB) / 2',
];
for (const needle of overlapFields) {
  if (!geometry.includes(needle)) failures.push(`aura overlap geometry may have lost overlap field: ${needle}`);
}

const forbiddenInField = [
  'function gaussianAuraWeight',
  'const rawOverlap = clamp01',
  'const midpointX =',
  'const midpointY =',
  'const fieldAAtMid = gaussianAuraWeight',
  'const fieldBAtMid = gaussianAuraWeight',
  'const softProduct = Math.sqrt',
  'const interference = clamp01(softness',
  'const sparkle = clamp01(interference',
  'return overlaps.sort((a, b) => b.interference - a.interference).slice(0, 22)',
];
for (const needle of forbiddenInField) {
  if (field.includes(needle)) failures.push(`spatial effect field still owns aura overlap geometry detail: ${needle}`);
}

const forbiddenInGeometry = [
  'computeMyzelSpatialFieldProbe',
  'readMyzelBallSpectralField',
  'analyzeMyzelConstellationGestalt',
  'buildMyzelNodeSpatialConfig(',
  'createEmptyMyzelSpatialEffectMix()',
  'addMyzelModuleToSpatialEffectMix(',
  'normalizeMyzelSpatialEffectMix(',
  'distanceToSegment',
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
for (const needle of forbiddenInGeometry) {
  if (geometry.includes(needle)) failures.push(`aura overlap geometry must stay pure and must not own probe/reader/config/UI/audio detail: ${needle}`);
}

const fieldLineCount = field.split('\n').length;
if (fieldLineCount > 450) failures.push(`myzelSpatialEffectField.ts should stay reduced after aura overlap extraction; found ${fieldLineCount} lines`);

if (failures.length) {
  console.error('[myzel-aura-overlap-geometry-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[myzel-aura-overlap-geometry-boundary] OK');
