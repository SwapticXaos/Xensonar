#!/usr/bin/env node
import fs from 'node:fs';

const bridgePath = 'src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts';
const panelPath = 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx';
const packagePath = 'package.json';
const bridge = fs.readFileSync(bridgePath, 'utf8');
const panel = fs.readFileSync(panelPath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const requiredBridgeMarkers = [
  'RootFollowStableLaneSyntheticSilentProbeResult',
  'runRootFollowStableLaneSyntheticSilentPlanProbe',
  'makeSyntheticSilentStableLaneTransfer',
  "probeKind: 'stable-lane-synthetic-silent-plan'",
  'stableLaneSyntheticSilentProbeAttemptCount',
  'stableLaneSyntheticSilentProbePostedCount',
  'stableLaneSyntheticSilentProbeAckCount',
  'stableLaneSyntheticSilentProbeFrameDelta',
  '__XENSONAR_STABLE_LANE_SYNTHETIC_SILENT_PLAN_PROBE__',
  'gain: 0',
  'stableLaneBlend: 0',
];
const requiredPanelMarkers = [
  'runRootFollowStableLaneSyntheticSilentPlanProbe',
  'syntheticSilentProbeRunKeyRef',
  'data-root-follow-synthetic-silent-plan-probe',
  'Silent-Plan Probe',
  '__XENSONAR_STABLE_LANE_SYNTHETIC_SILENT_PLAN_PROBE__',
  'syntheticSilentProbeFrameDelta',
  'syntheticSilentProbeLaneQuantaDelta',
];
const missing = [];
for (const marker of requiredBridgeMarkers) if (!bridge.includes(marker)) missing.push(`${bridgePath}: ${marker}`);
for (const marker of requiredPanelMarkers) if (!panel.includes(marker)) missing.push(`${panelPath}: ${marker}`);
if (!pkg.scripts?.['xensonar:check-stable-lane-synthetic-silent-plan-probe']) {
  missing.push('package.json: xensonar:check-stable-lane-synthetic-silent-plan-probe script');
}
if (missing.length > 0) {
  console.error('[check-stable-lane-synthetic-silent-plan-probe] missing markers');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}
console.log('[check-stable-lane-synthetic-silent-plan-probe] OK');
