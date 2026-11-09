#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`[carrier-integral-synthetic-root-follow-build-boundary] ${message}`);
    process.exit(1);
  }
};

const boundaryPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralSyntheticRootFollowBuild.ts';
const auditionPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralAudition.ts';
const routesPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts';
const artifactRoutesPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralRootFollowArtifactRoutes.ts';
const indexPath = 'src/features/l3lab/spectralForge/integral/index.ts';
for (const relative of [boundaryPath, auditionPath, routesPath, artifactRoutesPath, indexPath]) {
  assert(fs.existsSync(path.join(root, relative)), `Missing ${relative}`);
}
const boundary = read(boundaryPath);
const audition = read(auditionPath);
const routes = read(routesPath);
const artifactRoutes = read(artifactRoutesPath);
const index = read(indexPath);

assert(boundary.includes('export function buildCarrierIntegralSyntheticRootFollowBuild'), 'Boundary must export buildCarrierIntegralSyntheticRootFollowBuild.');
assert(boundary.includes('buildSpectralForgeV2RootFollowEntryConfig'), 'Boundary must own the synthetic Root-Follow build call.');
assert(boundary.includes('resolveCarrierLoopBodyPreviewAuditionRequestForMachine'), 'Boundary must preserve CarrierLoopBody preview request resolution.');
assert(boundary.includes("presetId: 'carrier_strict'"), 'Boundary must preserve carrier_strict transfer profile.');
assert(!boundary.includes('audioEngine'), 'Boundary must not own AudioEngine playback.');
assert(!boundary.includes('playRootFollowSynthPreview'), 'Boundary must not play Root-Follow preview.');

assert(
  audition.includes('buildCarrierIntegralSyntheticRootFollowArtifactRoute'),
  'Audition facade must delegate root-follow artifacts to the artifact route boundary.',
);
assert(routes.includes('buildCarrierIntegralSyntheticRootFollowBuild'), 'Audition routes must call shared synthetic build boundary.');
assert(artifactRoutes.includes('buildCarrierIntegralSyntheticRootFollowBuild'), 'Root-Follow artifact routes must call shared synthetic build boundary.');
assert(!audition.includes('buildSpectralForgeV2RootFollowEntryConfig'), 'Audition facade must not inline synthetic Root-Follow build.');
assert(!routes.includes('buildSpectralForgeV2RootFollowEntryConfig'), 'Audition routes must not inline synthetic Root-Follow build.');
assert(!artifactRoutes.includes('buildSpectralForgeV2RootFollowEntryConfig'), 'Root-Follow artifact routes must not inline synthetic Root-Follow build.');
assert(index.includes("export * from './carrierIntegralSyntheticRootFollowBuild';"), 'index.ts must export synthetic Root-Follow build boundary.');

console.log('[carrier-integral-synthetic-root-follow-build-boundary] ok');
