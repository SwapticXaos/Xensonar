#!/usr/bin/env node
import fs from 'node:fs';

const rendererPath = 'src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts';
const renderer = fs.readFileSync(rendererPath, 'utf8');

const required = [
  'const STABLE_LANE_RELIEF_MIN_RENDERED_FRAMES = 8192',
  'const STABLE_LANE_RELIEF_MIN_ACTIVE_QUANTA = 8',
  'stableLaneReliefReady: boolean',
  'stableLaneWarmupReason: string | null',
  'activeRenderQuantumCount: number',
  'args.stableLaneRenderedFrameCount < STABLE_LANE_RELIEF_MIN_RENDERED_FRAMES',
  'args.stableLaneActiveRenderQuantumCount < STABLE_LANE_RELIEF_MIN_ACTIVE_QUANTA',
  'legacyBlend: 0.68',
  'stableLaneBlend: 0.56',
  'legacyBlend: 0,',
  'stableLaneBlend: 0.72',
  'stableLaneReliefReady: stableLaneBlend.stableLaneReliefReady',
  'stableLaneWarmupReason: stableLaneBlend.stableLaneWarmupReason',
  'stableLaneRenderedFrameCount: granularWorkletPilotHealth.stableLaneRenderedFrameCount',
  'stableLaneActiveRenderQuantumCount: granularWorkletPilotHealth.stableLaneActiveRenderQuantumCount',
  'activeRenderQuantumCount: granularWorkletPilotHealth.activeRenderQuantumCount',
  'stable-lane-sustained-replaces-legacy-material-slice',
];

const missing = required.filter((needle) => !renderer.includes(needle));
if (renderer.includes('stableLaneEnabled && args.stableLaneProven && !args.primaryCandidateCanMuteLegacy')) {
  missing.push('old proven-only legacy relief predicate is still present');
}
if (!/stableLaneReliefReady\s*=\s*stableLaneWarmupReason === null/.test(renderer)) {
  missing.push('stableLaneReliefReady must be derived from the sustained warmup gate');
}

if (missing.length) {
  console.error('[check-stable-lane-sustained-relief-gate] missing sustained relief contracts:');
  for (const needle of missing) console.error(`- ${needle}`);
  process.exit(1);
}

console.log('[check-stable-lane-sustained-relief-gate] OK');
