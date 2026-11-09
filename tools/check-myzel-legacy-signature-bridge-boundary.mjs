#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const fieldPath = 'src/features/topology/myzelSpatialEffectField.ts';
const bridgePath = 'src/features/topology/myzelLegacySignatureBridge.ts';
const typesPath = 'src/features/topology/myzelSpatialFieldTypes.ts';
const gestaltPath = 'src/features/topology/myzelConstellationGestalt.ts';
const readerPath = 'src/features/topology/myzelBallSpectralFieldReader.ts';
const geometryPath = 'src/features/topology/myzelAuraOverlapGeometry.ts';
const configPath = 'src/features/topology/myzelNodeSpatialConfig.ts';
const mixPath = 'src/features/topology/myzelSpatialEffectMix.ts';

const field = read(fieldPath);
const bridge = exists(bridgePath) ? read(bridgePath) : '';
const types = exists(typesPath) ? read(typesPath) : '';
const gestalt = exists(gestaltPath) ? read(gestaltPath) : '';
const reader = exists(readerPath) ? read(readerPath) : '';
const geometry = exists(geometryPath) ? read(geometryPath) : '';
const config = exists(configPath) ? read(configPath) : '';
const mix = exists(mixPath) ? read(mixPath) : '';
const failures = [];

const mustContain = [
  [bridge, "import type { MyzelSpatialFieldProbe } from './myzelSpatialFieldTypes'", 'legacy signature bridge must import only the spatial field probe type from the shared types boundary'],
  [bridge, 'export interface MyzelLegacySignatureBlendArgs', 'legacy signature bridge must expose its blend args contract'],
  [bridge, 'export interface MyzelLegacySignatureBlend', 'legacy signature bridge must expose its blend return contract'],
  [bridge, 'export function blendSpatialFieldIntoLegacySignature', 'legacy signature bridge must export the blend function'],
  [bridge, 'const weights = probe.gestalt.paletteWeights', 'legacy signature bridge must preserve palette-weight access'],
  [bridge, 'const fieldTension = clamp01', 'legacy signature bridge must preserve field tension derivation'],
  [bridge, 'probe.ball.relationTension * 0.5', 'legacy signature bridge must preserve relation tension contribution'],
  [bridge, 'probe.gestalt.clusterMass * 0.24', 'legacy signature bridge must preserve cluster mass contribution'],
  [bridge, 'weights.unstableNoise * 0.14', 'legacy signature bridge must preserve unstable noise tension contribution'],
  [bridge, 'probe.ball.localRoughness * 0.12', 'legacy signature bridge must preserve local roughness tension contribution'],
  [bridge, 'const fieldBrightness = clamp01', 'legacy signature bridge must preserve field brightness derivation'],
  [bridge, 'probe.ball.localBrightness * 0.38', 'legacy signature bridge must preserve local brightness contribution'],
  [bridge, 'weights.glassAir * 0.22', 'legacy signature bridge must preserve glass/air contribution'],
  [bridge, 'weights.reedFormant * 0.14', 'legacy signature bridge must preserve reed/formant contribution'],
  [bridge, 'weights.metalCluster * 0.12', 'legacy signature bridge must preserve metal-cluster contribution'],
  [bridge, 'probe.ball.spatialEffectMix.spectralTilt * 0.14', 'legacy signature bridge must preserve spectral tilt contribution'],
  [bridge, 'const fieldFlux = clamp01', 'legacy signature bridge must preserve field flux derivation'],
  [bridge, 'probe.ball.voidPressure * 0.24', 'legacy signature bridge must preserve void pressure flux contribution'],
  [bridge, 'probe.ball.relationTension * 0.36', 'legacy signature bridge must preserve relation tension flux contribution'],
  [bridge, 'probe.gestalt.asymmetry * 0.16', 'legacy signature bridge must preserve asymmetry flux contribution'],
  [bridge, 'probe.gestalt.linearity * 0.08', 'legacy signature bridge must preserve linearity flux contribution'],
  [bridge, 'probe.ball.localRoughness * 0.16', 'legacy signature bridge must preserve roughness flux contribution'],
  [bridge, 'constellationTension: clamp01(legacyTension * 0.82 + fieldTension * 0.18)', 'legacy signature bridge must preserve legacy/field tension mix ratio'],
  [bridge, 'constellationBrightness: clamp01(legacyBrightness * 0.84 + fieldBrightness * 0.16)', 'legacy signature bridge must preserve legacy/field brightness mix ratio'],
  [bridge, 'constellationFlux: clamp01(legacyFlux * 0.86 + fieldFlux * 0.14)', 'legacy signature bridge must preserve legacy/field flux mix ratio'],
  [field, "from './myzelLegacySignatureBridge'", 'spatial effect field must import delegated legacy signature bridge'],
  [field, 'blendSpatialFieldIntoLegacySignature', 'spatial effect field must preserve legacy signature bridge barrel export compatibility'],
  [field, 'export function computeMyzelSpatialFieldProbe', 'spatial effect field must still own probe assembly/orchestration'],
  [types, 'export interface MyzelSpatialFieldProbe', 'shared types boundary must still own spatial field probe contract'],
  [gestalt, 'export function analyzeMyzelConstellationGestalt', 'constellation gestalt boundary must remain separate from legacy bridge'],
  [reader, 'export function readMyzelBallSpectralField', 'ball spectral reader must remain separate from legacy bridge'],
  [geometry, 'export function computeMyzelAuraOverlaps', 'aura overlap geometry must remain separate from legacy bridge'],
  [config, 'export function buildMyzelNodeSpatialConfig', 'node spatial config must remain separate from legacy bridge'],
  [mix, 'export function createEmptyMyzelSpatialEffectMix', 'spatial effect mix must remain separate from legacy bridge'],
];

for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const forbiddenInField = [
  'const weights = probe.gestalt.paletteWeights',
  'probe.ball.relationTension * 0.5',
  'probe.ball.localBrightness * 0.38',
  'probe.ball.voidPressure * 0.24',
  'constellationTension: clamp01(legacyTension * 0.82 + fieldTension * 0.18)',
  'constellationBrightness: clamp01(legacyBrightness * 0.84 + fieldBrightness * 0.16)',
  'constellationFlux: clamp01(legacyFlux * 0.86 + fieldFlux * 0.14)',
];
for (const needle of forbiddenInField) {
  if (field.includes(needle)) failures.push(`spatial effect field still owns legacy signature blend detail: ${needle}`);
}

const forbiddenInBridge = [
  'computeMyzelSpatialFieldProbe',
  'readMyzelBallSpectralField',
  'computeMyzelAuraOverlaps',
  'analyzeMyzelConstellationGestalt',
  'buildMyzelNodeSpatialConfig',
  'getMyzelPresetWitnessHue',
  'createEmptyMyzelSpatialEffectMix',
  'addMyzelModuleToSpatialEffectMix',
  'normalizeMyzelSpatialEffectMix',
  'resolveMyzelRelationCompatibility',
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
for (const needle of forbiddenInBridge) {
  if (bridge.includes(needle)) failures.push(`legacy signature bridge must stay pure bridge math and must not own reader/config/mix/UI/audio detail: ${needle}`);
}

const bridgeForbiddenRuntimeImports = ['import {', "from 'react'", 'from "react"', '../xensonar/', '../../xensonar/'];
for (const needle of bridgeForbiddenRuntimeImports) {
  if (bridge.includes(needle)) failures.push(`legacy signature bridge must not import runtime/UI implementation detail: ${needle}`);
}

const fieldLineCount = field.split('\n').length;
if (fieldLineCount > 85) failures.push(`myzelSpatialEffectField.ts should stay very thin after legacy bridge extraction; found ${fieldLineCount} lines`);

if (failures.length) {
  console.error('[myzel-legacy-signature-bridge-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[myzel-legacy-signature-bridge-boundary] OK');
