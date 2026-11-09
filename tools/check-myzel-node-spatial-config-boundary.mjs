#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const fieldPath = 'src/features/topology/myzelSpatialEffectField.ts';
const configPath = 'src/features/topology/myzelNodeSpatialConfig.ts';
const readerPath = 'src/features/topology/myzelBallSpectralFieldReader.ts';
const geometryPath = 'src/features/topology/myzelAuraOverlapGeometry.ts';
const gestaltPath = 'src/features/topology/myzelConstellationGestalt.ts';
const field = read(fieldPath);
const config = exists(configPath) ? read(configPath) : '';
const geometry = exists(geometryPath) ? read(geometryPath) : '';
const gestalt = exists(gestaltPath) ? read(gestaltPath) : '';
const reader = exists(readerPath) ? read(readerPath) : '';
const failures = [];

const mustContain = [
  [config, 'export function buildMyzelNodeSpatialConfig', 'node spatial config boundary must export the node config builder'],
  [config, 'export function inferMyzelNodeEffect', 'node spatial config boundary must export effect inference'],
  [config, 'export function inferMyzelNodePreset', 'node spatial config boundary must export legacy preset inference'],
  [config, 'export function getMyzelNodeAuraPresetDefinition', 'node spatial config boundary must export preset definition reader'],
  [config, 'export function buildMyzelNodeAuraModules', 'node spatial config boundary must export aura module builder'],
  [config, 'export function getMyzelPresetWitnessHue', 'node spatial config boundary must export witness hue mapping used by aura overlaps'],
  [geometry, 'getMyzelPresetWitnessHue(', 'aura overlap geometry must consume witness hue mapping'],
  [config, 'MYZEL_NODE_EFFECT_KERNEL_DEFINITIONS', 'node spatial config boundary must own the effect-kernel registry'],
  [config, 'MYZEL_NODE_AURA_PRESET_DEFINITIONS', 'node spatial config boundary must own legacy preset compatibility definitions'],
  [config, 'const MYZEL_NODE_EFFECT_DEFAULT_RING', 'node spatial config boundary must preserve the default effect ring'],
  [config, 'function effectIdToCompatPresetId', 'node spatial config boundary must preserve effect -> compat preset mapping'],
  [config, 'function compatPresetToEffectId', 'node spatial config boundary must preserve compat preset -> effect mapping'],
  [config, "case 'subwurzel':", 'node spatial config boundary must preserve subwurzel compatibility'],
  [config, "case 'dreckecke':", 'node spatial config boundary must preserve dreckecke compatibility'],
  [config, "case 'shimmerhof':", 'node spatial config boundary must preserve shimmerhof compatibility'],
  [config, "case 'metallcluster':", 'node spatial config boundary must preserve metallcluster compatibility'],
  [config, "case 'koernung':", 'node spatial config boundary must preserve koernung compatibility'],
  [config, "case 'custom':", 'node spatial config boundary must preserve custom fallback compatibility'],
  [field, "from './myzelNodeSpatialConfig'", 'spatial effect field must import the node spatial config boundary'],
  [field, 'buildMyzelNodeSpatialConfig(node, index, width, height)', 'spatial effect field must delegate node config construction'],
  [field, 'export function computeMyzelSpatialFieldProbe', 'spatial effect field must still own probe assembly'],
  [field, "from './myzelBallSpectralFieldReader'", 'spatial effect field must delegate ball reading to the ball spectral reader boundary'],
  [reader, 'export function readMyzelBallSpectralField', 'ball spectral reader boundary must own ball reading after node config extraction'],
  [geometry, 'export function computeMyzelAuraOverlaps', 'aura overlap geometry boundary must own aura overlap geometry after node config extraction'],
  [field, "from './myzelAuraOverlapGeometry'", 'spatial effect field must delegate aura overlap geometry'],
  [field, "from './myzelConstellationGestalt'", 'spatial effect field must import delegated constellation gestalt analysis'],
  [field, 'gestalt: analyzeMyzelConstellationGestalt(nodes, width, height)', 'spatial effect field must delegate constellation gestalt during probe assembly'],
  [gestalt, 'export function analyzeMyzelConstellationGestalt', 'constellation gestalt boundary must own gestalt analysis'],
];

for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const effectIds = [
  'drive',
  'wavefolder',
  'formant_filter',
  'shimmer_delay',
  'bitcrusher',
  'sub_harmonic',
  'comb_filter',
  'spectral_tilt',
  'grain_blur',
  'chorus',
  'resonator',
];
for (const effectId of effectIds) {
  if (!config.includes(`${effectId}: { id: '${effectId}'`) && !config.includes(`'${effectId}',`)) {
    failures.push(`node spatial config boundary may have lost effect id coverage: ${effectId}`);
  }
}

const legacyPresetIds = [
  'koerper',
  'glas',
  'metall',
  'luft',
  'koernung',
  'vokal',
  'dreckecke',
  'vokalecke',
  'shimmerhof',
  'metallcluster',
  'subwurzel',
  'custom',
];
for (const presetId of legacyPresetIds) {
  if (!config.includes(`${presetId}: {`) && !config.includes(`case '${presetId}':`)) {
    failures.push(`node spatial config boundary may have lost legacy preset coverage: ${presetId}`);
  }
}

const forbiddenInField = [
  'MYZEL_NODE_EFFECT_KERNEL_DEFINITIONS',
  'MYZEL_NODE_AURA_PRESET_DEFINITIONS',
  'MYZEL_NODE_EFFECT_DEFAULT_RING',
  'MYZEL_JI_EFFECT_PRESET_RING',
  'function parseNodeEffectId',
  'function parseNodeEffectPresetId',
  'function effectIdToCompatPresetId',
  'function compatPresetToEffectId',
  'function resolveMyzelNodeSpatialConfig',
  'function buildMyzelEffectKernelModules',
];
for (const needle of forbiddenInField) {
  if (field.includes(needle)) failures.push(`spatial effect field still owns node spatial config detail: ${needle}`);
}

const forbiddenInConfig = [
  'computeMyzelSpatialFieldProbe',
  'computeMyzelAuraOverlaps',
  'analyzeMyzelConstellationGestalt',
  'createEmptyMyzelSpatialEffectMix',
  'addMyzelModuleToSpatialEffectMix',
  'normalizeMyzelSpatialEffectMix',
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
for (const needle of forbiddenInConfig) {
  if (config.includes(needle)) failures.push(`node spatial config boundary must stay pure and must not own field/mix/UI/audio runtime detail: ${needle}`);
}

const fieldLineCount = field.split('\n').length;
if (fieldLineCount > 700) failures.push(`myzelSpatialEffectField.ts should stay reduced after node config extraction; found ${fieldLineCount} lines`);

if (failures.length) {
  console.error('[myzel-node-spatial-config-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[myzel-node-spatial-config-boundary] OK');
