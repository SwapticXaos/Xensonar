#!/usr/bin/env node
import fs from 'node:fs';

const rendererPath = 'src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts';
const policyPath = 'src/features/xensonar/rootFollow/rootFollowLaneOwnershipPolicy.ts';
const renderer = fs.readFileSync(rendererPath, 'utf8');
const policy = fs.readFileSync(policyPath, 'utf8');

const requiredPolicy = [
  'export function shouldRelieveLegacyRootFollowMaterialSlice',
  'stableLaneReliefReady: boolean',
  'args.stableLaneEnabled &&',
  'args.stableLaneReliefReady &&',
  '!args.primaryCandidateCanMuteLegacy',
  `return {\n    legacyBlend: 0,\n    stableLaneBlend: 0.72,`,
  'stableLaneReliefReady,',
];
const requiredRenderer = [
  'function markStableLaneLegacyRelief',
  'worklet-stable-lane-relieves-legacy-slice',
  'stable-lane-sustained-replaces-legacy-material-slice',
  'expectedEffect:',
  '"less-main-thread-root-material-slice-spawning-after-sustained-worklet-proof"',
  'gainBase: stableLaneBlend.stableLaneProven ? 0.058 : 0.042',
  'gainBase: stableLaneBlend.stableLaneProven ? 0.052 : 0.038',
];

const missing = [
  ...requiredPolicy.filter((needle) => !policy.includes(needle)).map((needle) => `policy:${needle}`),
  ...requiredRenderer.filter((needle) => !renderer.includes(needle)).map((needle) => `renderer:${needle}`),
];
if (policy.includes('stableLaneEnabled && args.stableLaneProven && !args.primaryCandidateCanMuteLegacy')) {
  missing.push('old proven-only relief predicate is still present');
}
if (missing.length) {
  console.error('[check-stable-lane-proven-legacy-slice-relief] missing required markers:');
  for (const needle of missing) console.error(`- ${needle}`);
  process.exit(1);
}

const reliefCalls = (renderer.match(/markStableLaneLegacyRelief\(/g) || []).length;
if (reliefCalls < 3) {
  console.error(`[check-stable-lane-proven-legacy-slice-relief] expected helper + flowing + fragment relief calls, found ${reliefCalls}`);
  process.exit(1);
}

const rawLegacyScheduleCalls = (renderer.match(/scheduleMaterialElasticSlice\(/g) || []).length;
const phaseWindowCalls = (renderer.match(/scheduleElasticPhaseWindow\(/g) || []).length;
if (rawLegacyScheduleCalls < 2 || phaseWindowCalls < 2) {
  console.error('[check-stable-lane-proven-legacy-slice-relief] legacy fallback scheduling calls were unexpectedly removed.');
  process.exit(1);
}

console.log('[check-stable-lane-proven-legacy-slice-relief] OK');
