#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src/features/l3lab/spectralForge/integral');
const runtimePath = path.join(srcDir, 'carrierIntegralDieterV2EmbodimentRuntime.ts');
const auditionPath = path.join(srcDir, 'carrierIntegralAudition.ts');
const auditionRoutesPath = path.join(srcDir, 'carrierIntegralAuditionRoutes.ts');
const artifactRoutesPath = path.join(srcDir, 'carrierIntegralRootFollowArtifactRoutes.ts');
const indexPath = path.join(srcDir, 'index.ts');

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing expected file: ${path.relative(root, file)}`);
  return fs.readFileSync(file, 'utf8');
}
function requireIncludes(text, needle, label) {
  if (!text.includes(needle)) throw new Error(`${label} must include: ${needle}`);
}
function requireNotIncludes(text, needle, label) {
  if (text.includes(needle)) throw new Error(`${label} must not include: ${needle}`);
}

const runtime = read(runtimePath);
const audition = read(auditionPath);
const auditionRoutes = read(auditionRoutesPath);
const artifactRoutes = read(artifactRoutesPath);
const index = read(indexPath);

requireIncludes(runtime, 'export type CarrierIntegralDieterV2EmbodimentRuntimeArgs', 'Dieter V2 runtime boundary');
requireIncludes(runtime, 'export type CarrierIntegralDieterV2EmbodimentRuntime', 'Dieter V2 runtime boundary');
requireIncludes(runtime, 'export function buildDieterV2EmbodimentRuntime', 'Dieter V2 runtime boundary');
requireIncludes(runtime, 'extractSpectralSkeleton', 'Dieter V2 runtime boundary');
requireIncludes(runtime, 'buildCarrierLatentBodyFormFromSkeleton', 'Dieter V2 runtime boundary');
requireIncludes(runtime, 'hydrateVirtualBodyMedium', 'Dieter V2 runtime boundary');
requireIncludes(runtime, 'buildNeutralCarrierDonorV2Tensor', 'Dieter V2 runtime boundary');
requireIncludes(runtime, 'buildDonorTimbreAtlas', 'Dieter V2 runtime boundary');
requireIncludes(runtime, 'buildV2EmbodimentField', 'Dieter V2 runtime boundary');
requireIncludes(runtime, 'buildSpectralForgeV2RootFollowEntryConfig', 'Dieter V2 runtime boundary');
requireIncludes(runtime, 'carrier-integral-neutral-pigment:dieter-v2-auto-hydrated', 'Dieter V2 runtime boundary');
requireIncludes(runtime, 'deriveTransferProfile', 'Dieter V2 runtime boundary');
requireIncludes(runtime, "presetId: 'carrier_strict'", 'Dieter V2 runtime boundary');
requireNotIncludes(runtime, 'audioEngine', 'Dieter V2 runtime boundary');
requireNotIncludes(runtime, 'playRenderedAudioBufferPreview', 'Dieter V2 runtime boundary');
requireNotIncludes(runtime, 'renderCarrierDonorV2CompositeToBuffer', 'Dieter V2 runtime boundary');
requireNotIncludes(runtime, 'console.', 'Dieter V2 runtime boundary');

requireIncludes(audition, 'buildCarrierIntegralDieterV2RootFollowArtifactRoute', 'carrierIntegralAudition facade');
requireNotIncludes(audition, 'buildDieterV2EmbodimentRuntime', 'carrierIntegralAudition facade');
for (const file of [
  ['carrierIntegralAudition facade', audition],
  ['carrierIntegralAuditionRoutes', auditionRoutes],
  ['carrierIntegralRootFollowArtifactRoutes', artifactRoutes],
]) {
  const [label, text] = file;
  requireNotIncludes(text, 'function buildDieterV2EmbodimentRuntime', label);
  requireNotIncludes(text, 'buildCarrierLatentBodyFormFromSkeleton', label);
  requireNotIncludes(text, 'hydrateVirtualBodyMedium', label);
  requireNotIncludes(text, 'buildV2EmbodimentField', label);
  requireNotIncludes(text, 'buildAnchorContinuityGraph', label);
  requireNotIncludes(text, 'buildGestaltField', label);
}
requireIncludes(auditionRoutes, 'buildDieterV2EmbodimentRuntime', 'carrierIntegralAuditionRoutes');
requireIncludes(auditionRoutes, 'buildDieterV2EmbodimentRuntime({', 'carrierIntegralAuditionRoutes');
requireIncludes(artifactRoutes, 'buildDieterV2EmbodimentRuntime', 'carrierIntegralRootFollowArtifactRoutes');
requireIncludes(artifactRoutes, 'buildDieterV2EmbodimentRuntime({', 'carrierIntegralRootFollowArtifactRoutes');

requireIncludes(index, 'carrierIntegralDieterV2EmbodimentRuntime', 'integral index');

console.log('OK spectralforge carrier integral Dieter V2 embodiment runtime boundary');
