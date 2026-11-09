#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const fieldPath = 'src/features/topology/myzelSpatialEffectField.ts';
const gestaltPath = 'src/features/topology/myzelConstellationGestalt.ts';
const readerPath = 'src/features/topology/myzelBallSpectralFieldReader.ts';
const geometryPath = 'src/features/topology/myzelAuraOverlapGeometry.ts';
const configPath = 'src/features/topology/myzelNodeSpatialConfig.ts';
const mixPath = 'src/features/topology/myzelSpatialEffectMix.ts';

const field = read(fieldPath);
const gestalt = exists(gestaltPath) ? read(gestaltPath) : '';
const reader = exists(readerPath) ? read(readerPath) : '';
const geometry = exists(geometryPath) ? read(geometryPath) : '';
const config = exists(configPath) ? read(configPath) : '';
const mix = exists(mixPath) ? read(mixPath) : '';
const failures = [];

const mustContain = [
  [gestalt, 'export function analyzeMyzelConstellationGestalt', 'constellation gestalt boundary must export the gestalt analyzer'],
  [gestalt, 'type NodeLike = SemanticNode &', 'constellation gestalt boundary must declare its own node input shape'],
  [gestalt, 'const average =', 'constellation gestalt boundary must own pair-distance averaging helper'],
  [gestalt, 'paletteWeights: { glassAir: 0.28', 'constellation gestalt boundary must preserve empty-field fallback palette'],
  [gestalt, 'const areaRatio =', 'constellation gestalt boundary must preserve area-ratio density calculation'],
  [gestalt, 'const density = clamp01', 'constellation gestalt boundary must preserve density calculation'],
  [gestalt, 'const asymmetry = clamp01', 'constellation gestalt boundary must preserve asymmetry calculation'],
  [gestalt, 'const linearity = clamp01', 'constellation gestalt boundary must preserve linearity calculation'],
  [gestalt, 'const pairDistances: number[]', 'constellation gestalt boundary must preserve pair-distance scan'],
  [gestalt, 'const clusterMass = pairDistances.length', 'constellation gestalt boundary must preserve cluster-mass derivation'],
  [gestalt, 'const axisAngle = 0.5 * Math.atan2', 'constellation gestalt boundary must preserve principal-axis angle derivation'],
  [gestalt, 'const axisStrength = clamp01', 'constellation gestalt boundary must preserve axis-strength derivation'],
  [gestalt, 'const glassAir = clamp01', 'constellation gestalt boundary must preserve glass/air palette weight'],
  [gestalt, 'const metalCluster = clamp01', 'constellation gestalt boundary must preserve metal-cluster palette weight'],
  [gestalt, 'const reedFormant = clamp01', 'constellation gestalt boundary must preserve reed/formant palette weight'],
  [gestalt, 'const unstableNoise = clamp01', 'constellation gestalt boundary must preserve unstable-noise palette weight'],
  [gestalt, 'const warmChoir = clamp01', 'constellation gestalt boundary must preserve warm-choir palette weight'],
  [field, "from './myzelConstellationGestalt'", 'spatial effect field must import delegated constellation gestalt analyzer'],
  [field, 'export { analyzeMyzelConstellationGestalt, blendSpatialFieldIntoLegacySignature, computeMyzelAuraOverlaps, getMyzelPresetWitnessHue }', 'spatial effect field must preserve gestalt/bridge/overlap/witness barrel export compatibility'],
  [field, 'gestalt: analyzeMyzelConstellationGestalt(nodes, width, height)', 'spatial effect field must delegate gestalt assembly during probe read'],
  [field, 'export function computeMyzelSpatialFieldProbe', 'spatial effect field must still own probe assembly/orchestration'],
  [reader, 'export function readMyzelBallSpectralField', 'ball reader boundary must remain separate from gestalt analysis'],
  [geometry, 'export function computeMyzelAuraOverlaps', 'aura overlap geometry boundary must remain separate from gestalt analysis'],
  [config, 'export function buildMyzelNodeSpatialConfig', 'node config boundary must remain separate from gestalt analysis'],
  [mix, 'export function resolveMyzelRelationCompatibility', 'spatial mix boundary must remain separate from gestalt analysis'],
];

for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const forbiddenInField = [
  'const pairDistances: number[]',
  'const averageDistance = average(pairDistances)',
  'const clusterMass = pairDistances.length',
  'const axisAngle = 0.5 * Math.atan2',
  'const glassAir = clamp01',
  'const metalCluster = clamp01',
  'const reedFormant = clamp01',
  'const unstableNoise = clamp01',
  'const warmChoir = clamp01',
  'paletteWeights: { glassAir: 0.28',
];
for (const needle of forbiddenInField) {
  if (field.includes(needle)) failures.push(`spatial effect field still owns constellation gestalt detail: ${needle}`);
}

const forbiddenInGestalt = [
  'computeMyzelSpatialFieldProbe',
  'readMyzelBallSpectralField',
  'computeMyzelAuraOverlaps',
  'buildMyzelNodeSpatialConfig(',
  'getMyzelPresetWitnessHue',
  'createEmptyMyzelSpatialEffectMix',
  'addMyzelModuleToSpatialEffectMix',
  'normalizeMyzelSpatialEffectMix',
  'resolveMyzelRelationCompatibility',
  'distanceToSegment',
  'gaussianAuraWeight',
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
for (const needle of forbiddenInGestalt) {
  if (gestalt.includes(needle)) failures.push(`constellation gestalt boundary must stay pure and must not own probe/reader/geometry/config/mix/UI/audio detail: ${needle}`);
}

const paletteFields = ['glassAir', 'metalCluster', 'reedFormant', 'unstableNoise', 'warmChoir'];
for (const fieldName of paletteFields) {
  const matches = gestalt.match(new RegExp(`\\b${fieldName}\\b`, 'g')) ?? [];
  if (matches.length < 2) failures.push(`constellation gestalt boundary may have lost palette field coverage: ${fieldName}`);
}

const metricFields = ['density', 'asymmetry', 'linearity', 'clusterMass', 'averageDistance', 'centroidX', 'centroidY', 'axisAngle', 'axisStrength'];
for (const fieldName of metricFields) {
  if (!gestalt.includes(fieldName)) failures.push(`constellation gestalt boundary may have lost metric field: ${fieldName}`);
}

const fieldLineCount = field.split('\n').length;
if (fieldLineCount > 370) failures.push(`myzelSpatialEffectField.ts should stay reduced after constellation gestalt extraction; found ${fieldLineCount} lines`);

if (failures.length) {
  console.error('[myzel-constellation-gestalt-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[myzel-constellation-gestalt-boundary] OK');
