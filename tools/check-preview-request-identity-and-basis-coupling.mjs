#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const hookPath = 'src/features/l3lab/spectralForge/components/harmonizerPanel/useBasisHearingAudition.ts';
const sessionPath = 'src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts';
const requestKeyPath = 'src/features/l3lab/spectralForge/components/previewSession/spectralForgePreviewRequestKey.ts';
const routesPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts';
const hook = readFileSync(hookPath, 'utf8');
const session = readFileSync(sessionPath, 'utf8');
const requestKey = readFileSync(requestKeyPath, 'utf8');
const routes = readFileSync(routesPath, 'utf8');

const fail = (message) => {
  console.error(`[xensonar][preview-request-identity-basis-coupling] ${message}`);
  process.exit(1);
};

for (const needle of [
  'type BasisHearingCoupledSessionUpdate',
  'function updateBasisHearingAndSession',
  "session: { type: 'ready'",
  "session: { type: 'playing'",
  "session: { type: 'play-ended'",
  "session: { type: 'error'",
  'isCurrentGeneration(generation) && previewSessionDriver.isCurrentRequest(previewRequest)',
]) {
  if (!hook.includes(needle)) fail(`Basis-Hearing coupling guard missing: ${needle}`);
}

const hookBody = hook.slice(hook.indexOf('export function useBasisHearingAudition'));
for (const forbidden of [
  'previewSessionDriver.markReady(',
  'previewSessionDriver.markPlaying(',
  'previewSessionDriver.markPlayEnded(',
  'previewSessionDriver.markError(',
]) {
  if (hookBody.includes(forbidden)) {
    fail(`free session mutation still appears inside hook body: ${forbidden}`);
  }
}

for (const needle of [
  'isCurrentRequest: (request: SpectralForgePreviewRequest) => boolean;',
  'isCurrentRequest: requestMatchesCurrent',
  'requestMatchesCurrent(request)',
]) {
  if (!session.includes(needle)) fail(`session driver is missing current-request guard: ${needle}`);
}

for (const needle of [
  'loopPreview is intentionally omitted here: it is a playback transport flag',
  'not a render/prepared-buffer identity',
]) {
  if (!requestKey.includes(needle)) fail(`request-key playback-only loop contract missing: ${needle}`);
}

for (const needle of [
  'paramsHash: "pure-dieter-raw-render"',
  'buildStableHarmonicXplorePreviewParamsHash(context)',
  'buildSpektralSyntheseParamsHash(spectralData)',
  'const token = buildCarrierIntegralBertHarmonicPolytracePreviewKey({',
  'paramsHash: `${args.cachePrefix}:${token}`',
]) {
  if (!routes.includes(needle)) fail(`route request identity audit marker missing: ${needle}`);
}

for (const needle of [
  "version: 'spectral-forge-transport-preview-request-v2'",
  'carrierIntegralSource: unknown;',
  'carrierIntegralPreset: unknown;',
  'carrierIntegralBodySource: unknown;',
  'carrierIntegralParams: unknown;',
  'synthLab: unknown;',
  'harmonicXplore: unknown;',
  'carrierIntegral: stableCarrierIntegralForTransportPreview(input)',
]) {
  if (!requestKey.includes(needle)) fail(`transport request identity is missing current Carrier-Integral input: ${needle}`);
}

console.log('[xensonar] preview request identity + basis coupling guard green');
