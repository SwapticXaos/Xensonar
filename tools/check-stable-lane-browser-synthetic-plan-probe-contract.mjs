#!/usr/bin/env node
import fs from 'node:fs';

const browserProbe = fs.readFileSync('tools/check-stable-lane-browser-responsibility-readout.mjs', 'utf8');
const panel = fs.readFileSync('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const markers = [
  ['browser probe', browserProbe, 'liveSyntheticSilentPlanProbe'],
  ['browser probe', browserProbe, 'silentPlanProbe'],
  ['browser probe', browserProbe, 'Silent-Plan Probe'],
  ['browser probe', browserProbe, 'liveBootProbe'],
  ['browser probe', browserProbe, 'liveAudioProbe'],
  ['panel', panel, 'runRootFollowStableLaneSyntheticSilentPlanProbe'],
  ['panel', panel, 'data-root-follow-synthetic-silent-plan-probe'],
  ['panel', panel, 'syntheticSilentProbeFrameDelta'],
  ['panel', panel, 'syntheticSilentProbeLaneQuantaDelta'],
];
const missing = markers.filter(([, content, marker]) => !content.includes(marker));
if (!pkg.scripts?.['xensonar:check-stable-lane-browser-synthetic-plan-probe-contract']) {
  missing.push(['package.json', '', 'xensonar:check-stable-lane-browser-synthetic-plan-probe-contract']);
}
if (missing.length) {
  console.error('[check-stable-lane-browser-synthetic-plan-probe-contract] FAIL');
  for (const [where, , marker] of missing) console.error(`- ${where}: ${marker}`);
  process.exit(1);
}
console.log('[check-stable-lane-browser-synthetic-plan-probe-contract] OK');
