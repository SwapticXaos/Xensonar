#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (path) => fs.readFileSync(path, 'utf8');
const must = (path, needle, label) => {
  if (!read(path).includes(needle)) failures.push(`${path}: missing ${label}`);
};
const mustNot = (path, needle, label) => {
  if (read(path).includes(needle)) failures.push(`${path}: forbidden ${label}`);
};

must('src/features/xensonar/rootFollow/rootFollowWorkletShadowReport.ts', '"pilot-starved"', 'pilot health state type');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowReport.ts', 'resolveRootFollowWorkletPilotHealth', 'pilot health resolver');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowReport.ts', 'lastGranularPilotAcceptedWindowCount', 'granular pilot accepted window count');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowReport.ts', 'lastGranularPilotBufferAvailable', 'granular pilot buffer availability');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowReport.ts', 'lastBufferTransferCopiedByteLength', 'buffer transfer copied byte telemetry');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowReport.ts', 'summarizeRootFollowWorkletPilotHealth', 'pilot health summary export');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowReport.ts', 'pilot-starved', 'starved pilot status');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowReport.ts', 'pilot-ready', 'ready pilot status');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'getRootFollowWorkletShadowBridgeSnapshot', 'optional snapshot getter');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisRootFollowTab.tsx', 'Pilot-Health zählt Acks', 'UI explains pilot health telemetry');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisRootFollowTab.tsx', 'starved', 'UI names starved pilot truth state');
mustNot('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'worklet-granular-pilot-primary', 'health patch must not introduce a primary/replacing pilot');

if (failures.length) {
  console.error('[check-root-follow-worklet-pilot-health] FAIL');
  failures.forEach((failure) => console.error(' - ' + failure));
  process.exit(1);
}
console.log('[check-root-follow-worklet-pilot-health] OK');
