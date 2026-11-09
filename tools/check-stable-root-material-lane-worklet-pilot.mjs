#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
function read(rel) { return readFileSync(resolve(root, rel), 'utf8'); }
function must(rel, needle, note) {
  if (!read(rel).includes(needle)) {
    console.error(`[stable-root-material-lane-worklet-pilot] missing ${note}: ${rel} :: ${needle}`);
    process.exit(1);
  }
}

must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "'worklet-stable-lane-pilot'", 'voice-engine mode type');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'Worklet Stable-Lane Pilot', 'UI option');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'publishRootFollowWorkletStableLaneBufferAndPlan', 'material renderer route');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'stableLaneWorkletPilotEnabled', 'stable lane policy gate');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'root-follow-worklet-stable-lane-plan', 'worklet message protocol');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'stableLaneHoldQuantumCount', 'hold-last-valid telemetry');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'stableLaneRenderedFrameCount', 'stable lane rendered-frame telemetry');
must('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'workletStableLaneRenderedFrameCount', 'audio traffic stable-lane stress field');
must('tools/analyze-burst-diagnosis-log-meter.mjs', 'maxWorkletStableLaneRenderedFrameCount', 'log-meter stable-lane column');
console.log('[stable-root-material-lane-worklet-pilot] OK');
