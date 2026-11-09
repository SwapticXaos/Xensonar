#!/usr/bin/env node
import fs from 'node:fs';

const hookPath = 'src/features/l3lab/spectralForge/components/harmonizerPanel/useBasisHearingAudition.ts';
const sessionHookPath = 'src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts';
const cachePath = 'src/features/l3lab/spectralForge/components/harmonizerPanel/basisHearingPreviewCache.ts';
const hook = fs.readFileSync(hookPath, 'utf8');
const sessionHook = fs.readFileSync(sessionHookPath, 'utf8');
const cache = fs.readFileSync(cachePath, 'utf8');

function fail(message) {
  console.error(`[check-basis-hearing-session-owns-cache] ${message}`);
  process.exit(1);
}

for (const forbidden of [
  'basisHearingPreparedCacheRef',
  'basisHearingPrewarmInflightRef',
  'basisHearingPreviewSessionRef',
  'new Map<string, BasisHearingPreparedEntry>',
  'new Map<string, Promise<SpectralForgeBasisHearingPrewarmResult>>',
]) {
  if (hook.includes(forbidden)) fail(`useBasisHearingAudition still owns cache/session internals: ${forbidden}`);
}

for (const required of [
  'useSpectralForgePreviewSession<',
  'const generation = beginGeneration();',
  'getPreparedEntry(stableRequestKey)',
  'getOrStartInflight(',
  'rememberPreparedEntry(stableRequestKey, createBasisHearingPreparedEntry(prewarmResult))',
  'previewSessionDriver.schedule(previewRequest)',
  'updateBasisHearingAndSession({',
  "session: { type: 'ready'",
]) {
  if (!hook.includes(required)) fail(`useBasisHearingAudition missing session-owned contract: ${required}`);
}

if (hook.includes('previewSession.beginGeneration()') || hook.includes('previewSession.getOrStartInflight(')) {
  fail('useBasisHearingAudition still uses whole previewSession object inside callback instead of stable destructured methods');
}

for (const required of [
  'export function useSpectralForgePreviewSession',
  'preparedByRequestKeyRef',
  'inflightByRequestKeyRef',
  'sessionStateRef',
  'generationRef',
  'getPreparedEntry',
  'rememberPreparedEntry',
  'getOrStartInflight',
  'trimPreparedPreviewCache',
  'SPECTRAL_FORGE_PREVIEW_PREPARED_CACHE_MAX_ENTRIES',
]) {
  if (!sessionHook.includes(required)) fail(`preview session hook missing cache/session ownership: ${required}`);
}

for (const forbidden of [
  'function trimBasisHearingPreparedCache',
  'rememberBasisHearingPreparedEntry(',
  'BASIS_HEARING_PREPARED_CACHE_MAX_ENTRIES',
]) {
  if (cache.includes(forbidden)) fail(`basis cache boundary still owns mutable cache lifecycle: ${forbidden}`);
}

if (!cache.includes('export function buildBasisHearingStableRequestKey')) fail('basis cache boundary must still own stable request-key building.');
if (!cache.includes('export function createBasisHearingPreparedEntry')) fail('basis cache boundary must only adapt prewarm result to prepared entry.');

console.log('[check-basis-hearing-session-owns-cache] OK');
