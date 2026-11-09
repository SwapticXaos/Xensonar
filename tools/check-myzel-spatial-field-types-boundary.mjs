#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const typesPath = 'src/features/topology/myzelSpatialFieldTypes.ts';
const fieldPath = 'src/features/topology/myzelSpatialEffectField.ts';
const mixPath = 'src/features/topology/myzelSpatialEffectMix.ts';
const configPath = 'src/features/topology/myzelNodeSpatialConfig.ts';
const readerPath = 'src/features/topology/myzelBallSpectralFieldReader.ts';
const geometryPath = 'src/features/topology/myzelAuraOverlapGeometry.ts';
const gestaltPath = 'src/features/topology/myzelConstellationGestalt.ts';
const runtimePath = 'src/features/xensonar/myzelSynth/myzelRoom3RuntimeBoundary.ts';

const types = exists(typesPath) ? read(typesPath) : '';
const field = exists(fieldPath) ? read(fieldPath) : '';
const mix = exists(mixPath) ? read(mixPath) : '';
const config = exists(configPath) ? read(configPath) : '';
const reader = exists(readerPath) ? read(readerPath) : '';
const geometry = exists(geometryPath) ? read(geometryPath) : '';
const gestalt = exists(gestaltPath) ? read(gestaltPath) : '';
const runtime = exists(runtimePath) ? read(runtimePath) : '';
const failures = [];

const mustContain = [
  [types, 'export type MyzelEffectModuleType =', 'types boundary must own effect module type union'],
  [types, 'export type MyzelEffectFamily =', 'types boundary must own effect family union'],
  [types, 'export type MyzelNodePresetId =', 'types boundary must own node preset id union'],
  [types, 'export type MyzelNodeEffectId = MyzelEffectModuleType', 'types boundary must own node effect id alias'],
  [types, 'export interface MyzelNodeTimbreProfile', 'types boundary must own node timbre profile'],
  [types, 'export interface MyzelNodeEffectModule', 'types boundary must own node effect module contract'],
  [types, 'export type MyzelNodeAuraSource =', 'types boundary must own node aura source contract'],
  [types, 'export interface MyzelNodeAuraBuildContext', 'types boundary must own aura build context'],
  [types, 'export interface MyzelNodeAuraPresetDefinition', 'types boundary must own aura preset definition'],
  [types, 'export interface MyzelNodeSpatialConfig', 'types boundary must own node spatial config'],
  [types, 'export interface MyzelConstellationGestalt', 'types boundary must own constellation gestalt contract'],
  [types, 'export interface MyzelSpatialEffectMix', 'types boundary must own spatial effect mix contract'],
  [types, 'export interface MyzelSpatialRelation', 'types boundary must own relation contract'],
  [types, 'export interface MyzelBallSpectralReading', 'types boundary must own ball spectral reading contract'],
  [types, 'export interface MyzelAuraOverlap', 'types boundary must own aura overlap contract'],
  [types, 'export interface MyzelSpatialFieldProbe', 'types boundary must own spatial field probe contract'],
  [field, "import type { MyzelSpatialFieldProbe } from './myzelSpatialFieldTypes'", 'spatial effect field must import probe type from the types boundary'],
  [field, "} from './myzelSpatialFieldTypes'", 'spatial effect field must re-export type compatibility from the types boundary'],
  [mix, "from './myzelSpatialFieldTypes'", 'spatial mix boundary must import its contracts from the types boundary'],
  [config, "from './myzelSpatialFieldTypes'", 'node spatial config boundary must import its contracts from the types boundary'],
  [reader, "from './myzelSpatialFieldTypes'", 'ball spectral reader must import its contracts from the types boundary'],
  [geometry, "from './myzelSpatialFieldTypes'", 'aura overlap geometry must import its contracts from the types boundary'],
  [gestalt, "from './myzelSpatialFieldTypes'", 'constellation gestalt must import its contract from the types boundary'],
  [runtime, "from '../../topology/myzelSpatialFieldTypes'", 'runtime boundary must import MyzelSpatialFieldProbe from the types boundary'],
];

for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const forbiddenInTypes = [
  'import ',
  'export function',
  'const ',
  'let ',
  'function ',
  'SemanticNode',
  'computeMyzelSpatialFieldProbe',
  'blendSpatialFieldIntoLegacySignature',
  'readMyzelBallSpectralField',
  'computeMyzelAuraOverlaps',
  'analyzeMyzelConstellationGestalt',
  'buildMyzelNodeSpatialConfig',
  'getMyzelPresetWitnessHue',
  'createEmptyMyzelSpatialEffectMix',
  'document.',
  'window.',
  'React',
  'useState',
  'useRef',
  'useEffect',
  'AudioContext',
  'OscillatorNode',
  'GainNode',
];
for (const needle of forbiddenInTypes) {
  if (types.includes(needle)) failures.push(`types boundary must stay pure data-only and not contain: ${needle}`);
}

const fieldForbiddenTypeOwners = [
  'export type MyzelEffectModuleType =',
  'export type MyzelEffectFamily =',
  'export type MyzelNodePresetId =',
  'export interface MyzelNodeTimbreProfile',
  'export interface MyzelNodeEffectModule',
  'export interface MyzelNodeSpatialConfig',
  'export interface MyzelConstellationGestalt',
  'export interface MyzelSpatialEffectMix',
  'export interface MyzelSpatialRelation',
  'export interface MyzelBallSpectralReading',
  'export interface MyzelAuraOverlap',
  'export interface MyzelSpatialFieldProbe',
];
for (const needle of fieldForbiddenTypeOwners) {
  if (field.includes(needle)) failures.push(`spatial effect field still owns shared type declaration: ${needle}`);
}

const siblingPaths = [
  [mixPath, mix],
  [configPath, config],
  [readerPath, reader],
  [geometryPath, geometry],
  [gestaltPath, gestalt],
];
for (const [rel, content] of siblingPaths) {
  if (content.includes("from './myzelSpatialEffectField'")) {
    failures.push(`${rel} must not import shared types from myzelSpatialEffectField.ts after types boundary extraction`);
  }
}
if (runtime.includes("from '../../topology/myzelSpatialEffectField'")) {
  failures.push(`${runtimePath} must not import MyzelSpatialFieldProbe from myzelSpatialEffectField.ts after types boundary extraction`);
}

const requiredTypeTokens = [
  'wavefolderAmount', 'formantAmount', 'shimmerAmount', 'bitcrusherAmount', 'subAmount', 'resonatorAmount', 'grainBlurAmount', 'driveAmount', 'chorusAmount', 'spectralTilt',
  'localHarmonicity', 'localFormantShift', 'localRoughness', 'localBrightness', 'localBody', 'nearestNodeWeight', 'relationTension', 'voidPressure', 'activeRelations',
  'density', 'asymmetry', 'linearity', 'clusterMass', 'averageDistance', 'axisAngle', 'axisStrength', 'paletteWeights',
  'glassAir', 'metalCluster', 'reedFormant', 'unstableNoise', 'warmChoir',
  'auraOverlaps', 'nodeConfigs',
];
for (const token of requiredTypeTokens) {
  if (!types.includes(token)) failures.push(`types boundary may have lost shared contract token: ${token}`);
}

const fieldLineCount = field.split('\n').length;
if (fieldLineCount > 130) failures.push(`myzelSpatialEffectField.ts should be thin after shared type extraction; found ${fieldLineCount} lines`);

if (failures.length) {
  console.error('[myzel-spatial-field-types-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[myzel-spatial-field-types-boundary] OK');
