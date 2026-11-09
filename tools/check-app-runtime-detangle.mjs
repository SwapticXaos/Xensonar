#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';

const failures = [];
function requireFile(path) {
  if (!existsSync(path)) failures.push(`missing ${path}`);
}
function requireContains(path, needle) {
  const text = readFileSync(path, 'utf8');
  if (!text.includes(needle)) failures.push(`${path} does not contain ${needle}`);
}
function requireNotContains(path, needle) {
  const text = readFileSync(path, 'utf8');
  if (text.includes(needle)) failures.push(`${path} still contains ${needle}`);
}

requireFile('src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts');
requireFile('src/features/xensonar/diagnostics/audioPairTherapistActions.ts');
requireFile('src/features/xensonar/material/materialLoopRuntimeBoundary.ts');
requireFile('src/features/xensonar/audioTraffic/quantizedTrafficQueueBoundary.ts');
requireFile('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts');
requireContains('src/App.tsx', 'useAudioBurstRecorderRuntimeBoundary');
requireContains('src/App.tsx', 'runAudioPairTherapistRuntimeReset');
requireContains('src/App.tsx', 'stopMaterialLoopRuntimeBoundary');
requireContains('src/App.tsx', 'useRootFollowRuntimeBoundaryRefs');
requireContains('src/App.tsx', 'useMaterialLoopRuntimeBoundaryRefs');
requireContains('src/features/xensonar/material/materialLoopRuntimeBoundary.ts', 'stopMaterialLoopPlaybackNodesBoundary');
requireContains('src/features/xensonar/rootFollow/rootFollowRuntimeBoundary.ts', 'stopRootFollowPlaybackNodesBoundary');
requireContains('src/App.tsx', 'resetQuantizedTrafficQueuesBoundary');
requireContains('src/App.tsx', 'startQuantizedCollisionRuntime');
requireContains('src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts', 'appendAudioBurstSnapshotRuntime');
requireContains('src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts', 'useAudioBurstRecorderRuntimeBoundary');
requireContains('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts', 'deferOverflowTraffic');
requireNotContains('src/App.tsx', 'const snapshotAgentHits = () =>');
requireNotContains('src/App.tsx', 'if (admittedTotal >= 6) break;');
requireNotContains('src/App.tsx', 'downloadAudioBurstRecorderLog(audioBurstRecorderRef.current');
requireNotContains('src/App.tsx', 'audioTrafficForensicsRef.current = createEmptyAudioTrafficForensicsState();\n    updateNParams({ rootFollowLoopActive: false, materialLoopActive: false });');
const appLines = readFileSync('src/App.tsx', 'utf8').split('\n').length;
if (appLines > 7600) failures.push(`App.tsx grew to ${appLines} lines; expected <= 7600 after burst diagnostics runtime boundary extraction`);

if (failures.length) {
  console.error('[xensonar-app-runtime-detangle] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`[xensonar-app-runtime-detangle] ok · App.tsx ${appLines} lines`);
