#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const fieldPath = 'src/features/topology/myzelSpatialEffectField.ts';
const readerPath = 'src/features/topology/myzelBallSpectralFieldReader.ts';
const mixPath = 'src/features/topology/myzelSpatialEffectMix.ts';
const configPath = 'src/features/topology/myzelNodeSpatialConfig.ts';
const geometryPath = 'src/features/topology/myzelAuraOverlapGeometry.ts';
const gestaltPath = 'src/features/topology/myzelConstellationGestalt.ts';

const field = read(fieldPath);
const geometry = exists(geometryPath) ? read(geometryPath) : '';
const gestalt = exists(gestaltPath) ? read(gestaltPath) : '';
const reader = exists(readerPath) ? read(readerPath) : '';
const mix = exists(mixPath) ? read(mixPath) : '';
const config = exists(configPath) ? read(configPath) : '';
const failures = [];

const mustContain = [
  [reader, 'export function readMyzelBallSpectralField', 'ball spectral reader boundary must export the ball/local-field reader'],
  [reader, 'function distanceToSegment', 'ball spectral reader boundary must own relation-line distance reading'],
  [reader, 'function gaussianAuraWeight', 'ball spectral reader boundary must own local aura weighting math'],
  [reader, 'createEmptyMyzelSpatialEffectMix()', 'ball spectral reader must preserve empty local-mix fallback'],
  [reader, 'addMyzelModuleToSpatialEffectMix(', 'ball spectral reader must accumulate node modules into the local mix'],
  [reader, 'normalizeMyzelSpatialEffectMix(', 'ball spectral reader must normalize the local spatial mix'],
  [reader, 'getDominantMyzelModuleAmount(', 'ball spectral reader must preserve relation cross-mod boost reading'],
  [reader, 'getPrimaryMyzelEffectFamily(', 'ball spectral reader must preserve relation family reading'],
  [reader, 'resolveMyzelRelationCompatibility(', 'ball spectral reader must preserve relation chemistry lookup'],
  [reader, 'const activeRelations: MyzelSpatialRelation[]', 'ball spectral reader must still produce active relation records'],
  [reader, 'const relationBand = clamp', 'ball spectral reader must preserve relation-band line weighting'],
  [reader, 'const crossModAmount = clamp01(tension * chemistry)', 'ball spectral reader must preserve cross-mod amount derivation'],
  [reader, 'relationTension = Math.max(relationTension, tension)', 'ball spectral reader must preserve max-tension accumulation'],
  [reader, 'activeRelations.sort((a, b) => b.tension - a.tension)', 'ball spectral reader must sort active relations by tension'],
  [reader, 'voidPressure', 'ball spectral reader must preserve void-pressure calculation'],
  [field, "from './myzelBallSpectralFieldReader'", 'spatial effect field must import the delegated ball spectral reader'],
  [field, 'ball: readMyzelBallSpectralField({ ball, nodes, nodeConfigs, width, height })', 'spatial effect field must delegate ball reading during probe assembly'],
  [field, 'export function computeMyzelSpatialFieldProbe', 'spatial effect field must still own probe assembly'],
  [geometry, 'export function computeMyzelAuraOverlaps', 'aura overlap geometry boundary must own aura overlap geometry'],
  [field, "from './myzelAuraOverlapGeometry'", 'spatial effect field must delegate aura overlap geometry'],
  [field, "from './myzelConstellationGestalt'", 'spatial effect field must import delegated constellation gestalt analysis'],
  [field, 'gestalt: analyzeMyzelConstellationGestalt(nodes, width, height)', 'spatial effect field must delegate constellation gestalt during probe assembly'],
  [gestalt, 'export function analyzeMyzelConstellationGestalt', 'constellation gestalt boundary must own gestalt analysis'],
  [mix, 'export function resolveMyzelRelationCompatibility', 'mix boundary must remain the source of relation chemistry constants'],
  [config, 'export function buildMyzelNodeSpatialConfig', 'node config boundary must remain the source of node configs consumed by the reader'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const forbiddenInField = [
  'export function readMyzelBallSpectralField',
  'function distanceToSegment',
  'const activeRelations: MyzelSpatialRelation[]',
  'const relationBand = clamp',
  'const crossModAmount = clamp01(tension * chemistry)',
  'getDominantMyzelModuleAmount(',
  'normalizeMyzelSpatialEffectMix(',
  'addMyzelModuleToSpatialEffectMix(',
  'createEmptyMyzelSpatialEffectMix()',
];
for (const needle of forbiddenInField) {
  if (field.includes(needle)) failures.push(`spatial effect field still owns ball/relation reader detail: ${needle}`);
}

const forbiddenInReader = [
  'computeMyzelSpatialFieldProbe',
  'computeMyzelAuraOverlaps',
  'analyzeMyzelConstellationGestalt',
  'buildMyzelNodeSpatialConfig(',
  'getMyzelPresetWitnessHue',
  'MYZEL_NODE_EFFECT_KERNEL_DEFINITIONS',
  'MYZEL_NODE_AURA_PRESET_DEFINITIONS',
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
for (const needle of forbiddenInReader) {
  if (reader.includes(needle)) failures.push(`ball spectral reader must stay pure and must not own probe/config/UI/audio runtime detail: ${needle}`);
}

const relationFields = [
  'nodeAId',
  'nodeBId',
  'nodeALabel',
  'nodeBLabel',
  'familyA',
  'familyB',
  'presetA',
  'presetB',
  'tension',
  'crossModAmount',
  'distance',
  'distanceToBall',
];
for (const fieldName of relationFields) {
  if (!reader.includes(fieldName)) failures.push(`ball spectral reader may have lost active relation field: ${fieldName}`);
}

const mixTouchpoints = [
  'mix.roughness += crossModAmount',
  'mix.q += crossModAmount',
  'mix.shimmerAmount += crossModAmount',
  'mix.wavefolderAmount += crossModAmount',
  'spatialEffectMix: normalizedMix',
];
for (const needle of mixTouchpoints) {
  if (!reader.includes(needle)) failures.push(`ball spectral reader may have lost relation-driven mix modulation: ${needle}`);
}

const fieldLineCount = field.split('\n').length;
if (fieldLineCount > 520) failures.push(`myzelSpatialEffectField.ts should stay reduced after ball reader extraction; found ${fieldLineCount} lines`);

if (failures.length) {
  console.error('[myzel-ball-spectral-field-reader-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[myzel-ball-spectral-field-reader-boundary] OK');
