#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fieldPath = 'src/features/topology/myzelSpatialEffectField.ts';
const mixPath = 'src/features/topology/myzelSpatialEffectMix.ts';
const readerPath = 'src/features/topology/myzelBallSpectralFieldReader.ts';
const geometryPath = 'src/features/topology/myzelAuraOverlapGeometry.ts';
const field = read(fieldPath);
const reader = fs.existsSync(path.join(root, readerPath)) ? read(readerPath) : '';
const geometry = fs.existsSync(path.join(root, geometryPath)) ? read(geometryPath) : '';
const mix = fs.existsSync(path.join(root, mixPath)) ? read(mixPath) : '';

const failures = [];
const mustContain = [
  [mix, 'export function createEmptyMyzelSpatialEffectMix', 'spatial effect mix boundary must export empty-mix factory'],
  [mix, 'export function addMyzelModuleToSpatialEffectMix', 'spatial effect mix boundary must export module accumulator'],
  [mix, 'export function normalizeMyzelSpatialEffectMix', 'spatial effect mix boundary must export normalizer'],
  [mix, 'export function resolveMyzelRelationCompatibility', 'spatial effect mix boundary must export relation compatibility resolver'],
  [mix, 'export function getPrimaryMyzelEffectFamily', 'spatial effect mix boundary must export primary-family reader'],
  [mix, 'export function getDominantMyzelModuleAmount', 'spatial effect mix boundary must export dominant module amount reader'],
  [mix, "case 'wavefolder':", 'mix boundary must preserve wavefolder accumulation'],
  [mix, "case 'formant_filter':", 'mix boundary must preserve formant accumulation'],
  [mix, "case 'sub_harmonic':", 'mix boundary must preserve sub accumulation'],
  [mix, "case 'resonator':", 'mix boundary must preserve resonator accumulation'],
  [mix, "case 'grain_blur':", 'mix boundary must preserve grain accumulation'],
  [mix, "case 'spectral_tilt':", 'mix boundary must preserve spectral tilt accumulation'],
  [mix, "case 'resonator:sub':", 'relation compatibility must preserve sub/resonator chemistry'],
  [mix, "case 'delay:distortion':", 'relation compatibility must preserve delay/distortion chemistry'],
  [mix, "case 'formant:grain':", 'relation compatibility must preserve formant/grain chemistry'],
  [reader, "from './myzelSpatialEffectMix'", 'Myzel ball reader must import the mix boundary'],
  [geometry, "from './myzelSpatialEffectMix'", 'Myzel aura overlap geometry must import the mix boundary'],
  [reader, 'createEmptyMyzelSpatialEffectMix()', 'Myzel ball reader must use delegated empty-mix factory'],
  [reader, 'addMyzelModuleToSpatialEffectMix(', 'Myzel ball reader must use delegated module accumulator'],
  [reader, 'normalizeMyzelSpatialEffectMix(', 'Myzel ball reader must use delegated mix normalizer'],
  [geometry, 'resolveMyzelRelationCompatibility(', 'Myzel aura overlap geometry must use delegated relation compatibility'],
  [geometry, 'getPrimaryMyzelEffectFamily(', 'Myzel aura overlap geometry must use delegated primary-family reader'],
  [reader, 'getDominantMyzelModuleAmount(', 'Myzel ball reader must use delegated dominant-module reader'],
  [field, 'export function computeMyzelSpatialFieldProbe', 'main field file must still own probe assembly'],
  [reader, 'export function readMyzelBallSpectralField', 'ball reader boundary must own ball reading'],
  [geometry, 'export function computeMyzelAuraOverlaps', 'aura overlap geometry boundary must own aura overlap geometry'],
  [field, "from './myzelAuraOverlapGeometry'", 'main field file must delegate aura overlap geometry'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const forbiddenInField = [
  'function emptySpatialEffectMix',
  'function addModuleToMix',
  'function normalizeSpatialEffectMix',
  'function relationCompatibility',
  'function primaryFamily',
  'function dominantModuleAmount',
];
for (const needle of forbiddenInField) {
  if (field.includes(needle)) failures.push(`myzelSpatialEffectField.ts still owns mix/relation helper: ${needle}`);
}

const forbiddenInMix = [
  'computeMyzelSpatialFieldProbe',
  'readMyzelBallSpectralField',
  'computeMyzelAuraOverlaps',
  'analyzeMyzelConstellationGestalt',
  'SemanticNode',
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
for (const needle of forbiddenInMix) {
  if (mix.includes(needle)) failures.push(`mix boundary must stay pure and must not own field/UI/audio runtime detail: ${needle}`);
}

const mixAmountFields = [
  'wavefolderAmount',
  'formantAmount',
  'shimmerAmount',
  'bitcrusherAmount',
  'subAmount',
  'resonatorAmount',
  'grainBlurAmount',
  'driveAmount',
  'chorusAmount',
  'spectralTilt',
  'brightness',
  'roughness',
  'body',
  'vowel',
  'q',
];
for (const fieldName of mixAmountFields) {
  const matches = mix.match(new RegExp(`\\b${fieldName}\\b`, 'g')) ?? [];
  if (matches.length < 2) failures.push(`mix boundary may have lost field normalization/default coverage: ${fieldName}`);
}

if (failures.length) {
  console.error('[myzel-spatial-effect-mix-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[myzel-spatial-effect-mix-boundary] OK');
