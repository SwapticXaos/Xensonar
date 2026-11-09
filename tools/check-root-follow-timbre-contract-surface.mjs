#!/usr/bin/env node
import fs from 'node:fs';

const file = fs.readFileSync('src/features/l3lab/spectralForge/integral/rootFollowTimbreContract.ts', 'utf8');
const index = fs.readFileSync('src/features/l3lab/spectralForge/integral/index.ts', 'utf8');
const markers = [
  'ROOT_FOLLOW_TIMBRE_CONTRACT_VERSION',
  'RootFollowPreviewTimbreSource',
  'RootFollowTimbreTransfer',
  'RootFollowTimbreRecommendation',
  'RootFollowTimbreContract',
  'previewTimbreSource:',
  'rootFollowTransfer:',
  'recommendedTransfer:',
  'knownLosses:',
  'resolveRootFollowTimbreContract(',
  "case 'harmonic-xplore-direct-carrier':",
  'Flavor-Tilts',
  'ratio-and-envelope',
  'manual-choice',
];
const missing = markers.filter((marker) => !file.includes(marker));
if (missing.length) {
  console.error('[xensonar][check-root-follow-timbre-contract-surface] Missing markers:', missing);
  process.exit(1);
}
if (!index.includes("export * from './rootFollowTimbreContract';")) {
  console.error('[xensonar][check-root-follow-timbre-contract-surface] rootFollowTimbreContract is not exported from integral index');
  process.exit(1);
}
console.log('[xensonar][check-root-follow-timbre-contract-surface] ok');
