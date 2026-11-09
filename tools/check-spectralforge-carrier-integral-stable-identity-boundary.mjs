#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const paths = {
  identity: 'src/features/l3lab/spectralForge/integral/carrierIntegralStableIdentity.ts',
  materialCache: 'src/features/l3lab/spectralForge/integral/materialBodyPreviewCache.ts',
  renderedCache: 'src/features/l3lab/spectralForge/integral/carrierIntegralRenderedPreviewCache.ts',
  bodySources: 'src/features/l3lab/spectralForge/integral/carrierIntegralBodySources.ts',
  registry: 'src/features/l3lab/spectralForge/integral/carrierIntegralRegistry.ts',
  synthLab: 'src/features/l3lab/spectralForge/integral/carrierIntegralSynthLab.ts',
  index: 'src/features/l3lab/spectralForge/integral/index.ts',
};

function read(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    failures.push(`${rel} missing`);
    return '';
  }
  return fs.readFileSync(abs, 'utf8');
}
function has(label, text, marker) {
  if (!text.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
}
function lacks(label, text, marker) {
  if (text.includes(marker)) failures.push(`${label} must not contain marker: ${marker}`);
}

const identity = read(paths.identity);
const materialCache = read(paths.materialCache);
const renderedCache = read(paths.renderedCache);
const bodySources = read(paths.bodySources);
const registry = read(paths.registry);
const synthLab = read(paths.synthLab);
const index = read(paths.index);

for (const marker of [
  'stableCarrierIntegralJson',
  'carrierIntegralFnv1aShortHash',
  'carrierIntegralHash31',
  'carrierIntegralRound3',
  'carrierIntegralFixed4',
]) has(paths.identity, identity, marker);

for (const forbidden of [
  'AudioEngine',
  'audioEngine',
  'AudioContext',
  'document.',
  'window.',
  '../state/store',
]) lacks(paths.identity, identity, forbidden);

for (const marker of [
  "./carrierIntegralStableIdentity",
  'stableCarrierIntegralJson',
  'carrierIntegralFnv1aShortHash',
  'carrierIntegralFixed4',
]) has(paths.materialCache, materialCache, marker);
for (const oldLocal of ['function stableJson', 'function shortHash']) lacks(paths.materialCache, materialCache, oldLocal);

for (const marker of [
  "./carrierIntegralStableIdentity",
  'stableCarrierIntegralJson(args.snapshot.waveformMix)',
  'stableCarrierIntegralJson(args.synthLab.paramsPatch ?? {})',
]) has(paths.renderedCache, renderedCache, marker);
lacks(paths.renderedCache, renderedCache, 'JSON.stringify(args.snapshot.waveformMix)');
lacks(paths.renderedCache, renderedCache, 'JSON.stringify(args.synthLab.paramsPatch');

for (const marker of ["./carrierIntegralStableIdentity", 'carrierIntegralFnv1aShortHash(normalized)']) has(paths.bodySources, bodySources, marker);
lacks(paths.bodySources, bodySources, 'function stableStringHash');

for (const marker of ["./carrierIntegralStableIdentity", 'carrierIntegralHash31(normalized)', 'carrierIntegralRound3(params.minVoiceDurationBeats)']) has(paths.registry, registry, marker);
lacks(paths.registry, registry, 'return hash.toString(36);');

for (const marker of ["./carrierIntegralStableIdentity", 'carrierIntegralHash31(normalized)', 'carrierIntegralRound3(value)']) has(paths.synthLab, synthLab, marker);
lacks(paths.synthLab, synthLab, 'return hash.toString(36);');

has(paths.index, index, "carrierIntegralStableIdentity");

if (failures.length) {
  console.error('[spectralforge-carrier-integral-stable-identity-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  identityPath: paths.identity,
  message: 'Carrier Integral stable identity helpers are shared across preview cache, body-source fingerprints, synth params, and route signatures without audio/UI side effects.',
}, null, 2));
