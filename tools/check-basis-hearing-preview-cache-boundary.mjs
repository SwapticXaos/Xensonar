#!/usr/bin/env node
import fs from 'node:fs';

const panelPath = 'src/features/l3lab/spectralForge/components/HarmonizerPanel.tsx';
const cachePath = 'src/features/l3lab/spectralForge/components/harmonizerPanel/basisHearingPreviewCache.ts';

function fail(message) {
  console.error(`[check-basis-hearing-preview-cache-boundary] ${message}`);
  process.exit(1);
}

const panel = fs.readFileSync(panelPath, 'utf8');
const hook = fs.readFileSync('src/features/l3lab/spectralForge/components/harmonizerPanel/useBasisHearingAudition.ts', 'utf8');
const cache = fs.readFileSync(cachePath, 'utf8');

if (!hook.includes("from './basisHearingPreviewCache'")) {
  fail('useBasisHearingAudition must import the basis hearing preview cache boundary.');
}

for (const forbidden of [
  'buildCarrierIntegralSnapshotSpectralSignature',
  'stableCarrierIntegralJson',
  'BASIS_HEARING_PREPARED_CACHE_MAX_ENTRIES',
]) {
  if (panel.includes(forbidden)) {
    fail(`HarmonizerPanel still owns cache-key/cache-trimming internals: ${forbidden}`);
  }
}

for (const required of [
  'export function buildBasisHearingStableRequestKey',
  'export function createBasisHearingPreparedEntry',
  'stableSelectionForBasisHearing',
  'stableSynthLabForBasisHearing',
  'stableHarmonicXploreForBasisHearing',
]) {
  if (!cache.includes(required)) {
    fail(`cache boundary missing required contract: ${required}`);
  }
}

if (!cache.includes("version: 'basis-hearing-stable-request-v1'")) {
  fail('stable request key version changed or missing.');
}

console.log('[check-basis-hearing-preview-cache-boundary] OK');
