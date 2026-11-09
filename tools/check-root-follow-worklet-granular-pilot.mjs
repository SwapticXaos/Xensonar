#!/usr/bin/env node
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function assertContains(path, needle, message = needle) {
  const text = read(path);
  if (!text.includes(needle)) {
    console.error(`[check-root-follow-worklet-granular-pilot] Missing in ${path}: ${message}`);
    process.exit(1);
  }
}
function assertNotContains(path, needle, message = needle) {
  const text = read(path);
  if (text.includes(needle)) {
    console.error(`[check-root-follow-worklet-granular-pilot] Forbidden in ${path}: ${message}`);
    process.exit(1);
  }
}

assertContains(
  'src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts',
  "'worklet-granular-pilot'",
  'voice-engine mode exposes the active granular pilot',
);
assertContains(
  'src/features/xensonar/performanceCrisis/rootFollowVoiceEngineOptions.ts',
  'Worklet Granular-Pilot',
  'UI exposes Worklet Granular-Pilot explicitly',
);
assertContains(
  'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  'Legacy-Materialpfad bleibt Referenz/Fallback',
  'UI states that Legacy material remains reference/fallback',
);
assertContains(
  'src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts',
  "root-follow-worklet-granular-pilot-plan",
  'bridge posts/handles active granular pilot plan',
);
assertContains(
  'src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts',
  'sampleBuffers = new Map()',
  'worklet stores bounded transferred sample windows',
);
assertContains(
  'src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts',
  'publishRootFollowWorkletGranularPilotBufferAndPlan',
  'single bounded buffer + active plan publication helper exists',
);
assertContains(
  'src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts',
  'additivePilotOverLegacy: true',
  'pilot remains additive over Legacy material path',
);
assertContains(
  'src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts',
  'granularWorkletPilotEnabled',
  'material renderer gates active pilot by voice-engine mode',
);
assertContains(
  'src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts',
  'publishRootFollowWorkletGranularPilotBufferAndPlan',
  'material renderer routes bounded buffer + render plan to pilot helper',
);
assertContains(
  'src/features/xensonar/rootFollow/rootFollowGranularWorkletRenderPlan.ts',
  'activeAudioPath: boolean',
  'render plan can truthfully mark active pilot vs shadow',
);
assertContains(
  'src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts',
  'ROOT_FOLLOW_GRANULAR_WORKLET_ACTIVE_PILOT_PREPARATION',
  'migration ledger records active granular pilot preparation',
);
assertNotContains(
  'src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts',
  'refs.gainRef.current.disconnect',
  'pilot must not disconnect or replace Legacy material path',
);

console.log('[check-root-follow-worklet-granular-pilot] OK');
