#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`[carrier-integral-root-follow-artifact-route-boundary] ${message}`);
    process.exit(1);
  }
};

const auditionPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralAudition.ts';
const artifactRoutesPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralRootFollowArtifactRoutes.ts';
const syntheticBuildPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralSyntheticRootFollowBuild.ts';
const indexPath = 'src/features/l3lab/spectralForge/integral/index.ts';

for (const relative of [auditionPath, artifactRoutesPath, syntheticBuildPath, indexPath]) {
  assert(fs.existsSync(path.join(root, relative)), `Missing ${relative}`);
}

const audition = read(auditionPath);
const artifactRoutes = read(artifactRoutesPath);
const syntheticBuild = read(syntheticBuildPath);
const index = read(indexPath);

for (const symbol of [
  'buildCarrierIntegralDonatelloRootFollowArtifactRoute',
  'buildCarrierIntegralRawRootFollowArtifactRoute',
  'buildCarrierIntegralDieterV2RootFollowArtifactRoute',
  'buildCarrierIntegralSyntheticRootFollowArtifactRoute',
]) {
  assert(artifactRoutes.includes(`export function ${symbol}`), `Artifact route boundary must export ${symbol}.`);
  assert(audition.includes(`${symbol}(routeArgs)`), `carrierIntegralAudition.ts must delegate ${symbol} through routeArgs.`);
}

assert(
  audition.includes('switch (resolveCarrierIntegralAuditionRouteKind(request.machineId))'),
  'carrierIntegralAudition.ts must keep route-kind switch as facade orchestration.',
);

for (const forbidden of [
  'extractSpectralSkeleton(',
  'buildDonatelloFormantPlan(',
  'buildDonatelloMaterialRootFollowEntryConfig(',
  'buildDieterV2EmbodimentRuntime(',
  'buildCarrierIntegralSyntheticRootFollowBuild({',
]) {
  assert(!audition.includes(forbidden), `carrierIntegralAudition.ts must not inline artifact route body: ${forbidden}`);
}

assert(
  artifactRoutes.includes('buildCarrierIntegralSyntheticRootFollowBuild'),
  'Artifact route boundary must preserve shared synthetic Root-Follow build usage.',
);
assert(
  syntheticBuild.includes('buildSpectralForgeV2RootFollowEntryConfig'),
  'Synthetic build boundary must continue owning the shared Root-Follow entry config build.',
);
assert(
  artifactRoutes.includes('buildDieterV2EmbodimentRuntime'),
  'Artifact route boundary must preserve explicit Dieter V2 runtime usage for root-follow artifacts.',
);
assert(
  artifactRoutes.includes('buildCarrierIntegralDonatelloFormantBodyModel'),
  'Artifact route boundary must preserve Donatello FormantBody model use for root-follow artifacts.',
);
assert(
  !artifactRoutes.includes('audioEngine'),
  'Root-Follow artifact route boundary must remain non-audible and not import AudioEngine.',
);
assert(
  index.includes("export * from './carrierIntegralRootFollowArtifactRoutes';"),
  'index.ts must export the root-follow artifact route boundary.',
);

console.log('[carrier-integral-root-follow-artifact-route-boundary] ok');
