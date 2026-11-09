import { readFileSync } from 'node:fs';

const bridge = readFileSync('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'utf8');
const renderer = readFileSync('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'utf8');
const traffic = readFileSync('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'utf8');
const ui = readFileSync('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'utf8');

const required = [
  ['bridge snapshot exposes stableLaneRenderedFrameDelta', bridge, 'stableLaneRenderedFrameDelta: number'],
  ['bridge snapshot exposes stableLaneActiveRenderQuantumCount', bridge, 'stableLaneActiveRenderQuantumCount: number'],
  ['bridge snapshot exposes lastStableLaneFrameAdvanceAtMs', bridge, 'lastStableLaneFrameAdvanceAtMs: number | null'],
  ['worklet increments lane-specific active quanta', bridge, 'this.stableLaneActiveRenderQuantumCount += 1'],
  ['throughput posts lane-specific active quanta', bridge, 'stableLaneActiveRenderQuantumCount: this.stableLaneActiveRenderQuantumCount'],
  ['main thread computes stable frame delta', bridge, 'stableLaneRenderedFrameDelta = throughputMeter ? Math.max(0, nextStableLaneRenderedFrameCount - handle.snapshot.stableLaneRenderedFrameCount) : 0'],
  ['main thread records last stable frame advance timestamp', bridge, 'nextStableLaneFrameAdvanceAtMs = stableLaneRenderedFrameDelta > 0 ? nowMs() : handle.snapshot.lastStableLaneFrameAdvanceAtMs'],
  ['renderer has frame advance freshness threshold', renderer, 'STABLE_LANE_RELIEF_MAX_FRAME_ADVANCE_AGE_MS = 450'],
  ['renderer gates relief on lane-specific quanta', renderer, 'stableLaneActiveRenderQuantumCount < STABLE_LANE_RELIEF_MIN_ACTIVE_QUANTA'],
  ['renderer gates relief on fresh frame delta', renderer, 'stable-lane-frame-advance-window-stale'],
  ['traffic snapshot exposes frame delta', traffic, 'workletStableLaneRenderedFrameDelta: number'],
  ['traffic snapshot exposes frame freshness', traffic, 'workletStableLaneFrameAdvanceFresh: boolean'],
  ['UI readout exposes frame delta', ui, 'label="Frame-Delta"'],
  ['UI readout exposes lane quanta', ui, 'label="Lane-Quanten"'],
];

const missing = required.filter(([_, haystack, needle]) => !haystack.includes(needle));
if (missing.length) {
  console.error('[check-stable-lane-relief-frame-delta-gate] FAIL');
  for (const [label, , needle] of missing) {
    console.error(`- ${label}: missing ${needle}`);
  }
  process.exit(1);
}
console.log('[check-stable-lane-relief-frame-delta-gate] OK: Stable-Lane relief now requires a fresh lane-specific frame-delta window before Legacy Root/Material slice relief.');
