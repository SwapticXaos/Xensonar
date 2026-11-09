import type { WaveStarterWorkletPilotSnapshot } from "./waveStarterWorkletPilotBridge";

export type WaveStarterWorkletVoicePoolCompactionDecision =
  | "no-worklet-pool-report"
  | "pool-idle"
  | "pool-allocating-only"
  | "pool-reusing-voices"
  | "pool-displacing-voices"
  | "pool-steal-fade-tailing";

export type WaveStarterWorkletVoicePoolCompactionReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-worklet-voice-pool-compaction";
  generatedAtIso: string;
  decision: WaveStarterWorkletVoicePoolCompactionDecision;
  synthMaxVoices: number;
  synthQueuedVoices: number;
  synthAllocatedCount: number;
  synthReusedCount: number;
  synthRecycledCount: number;
  synthDisplacedCount: number;
  synthPriorityDisplacedCount: number;
  synthLastDisplacedScore: number | null;
  synthStealFadeTailQueuedCount: number;
  synthStealFadeTailDroppedCount: number;
  synthStealFadeTailRenderFrameCount: number;
  synthStealFadeTailMaxTails: number;
  synthFreeCount: number;
  sampleMaxVoices: number;
  sampleQueuedVoices: number;
  sampleAllocatedCount: number;
  sampleReusedCount: number;
  sampleRecycledCount: number;
  sampleDisplacedCount: number;
  samplePriorityDisplacedCount: number;
  sampleLastDisplacedScore: number | null;
  sampleStealFadeTailQueuedCount: number;
  sampleStealFadeTailDroppedCount: number;
  sampleStealFadeTailRenderFrameCount: number;
  sampleStealFadeTailMaxTails: number;
  sampleFreeCount: number;
  compactionEnabled: true;
  priorityDisplacementEnabled: true;
  stealFadeTailEnabled: true;
  stealFadeTailIsOnlyForVoiceStealing: true;
  preservesLegacyPrimaryPath: true;
  keepsFailoverOnlyContract: true;
  doesNotEnablePrimaryReplacement: true;
  doesNotChangeSampleLoopParity: true;
  detail: string;
};

export const WAVE_STARTER_WORKLET_VOICE_POOL_COMPACTION_GLOBAL =
  "__XENSONAR_WAVE_STARTER_WORKLET_VOICE_POOL_COMPACTION__";

function n(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function publishReport(
  report: WaveStarterWorkletVoicePoolCompactionReport,
): WaveStarterWorkletVoicePoolCompactionReport {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[
      WAVE_STARTER_WORKLET_VOICE_POOL_COMPACTION_GLOBAL
    ] = report;
  }
  return report;
}

export function buildWaveStarterWorkletVoicePoolCompactionReport(
  pilotReport: WaveStarterWorkletPilotSnapshot | null,
): WaveStarterWorkletVoicePoolCompactionReport {
  const synthAllocated = n(pilotReport?.synthFailoverVoicePoolAllocatedCount);
  const sampleAllocated = n(pilotReport?.sampleFailoverVoicePoolAllocatedCount);
  const synthReused = n(pilotReport?.synthFailoverVoicePoolReusedCount);
  const sampleReused = n(pilotReport?.sampleFailoverVoicePoolReusedCount);
  const synthDisplaced = n(pilotReport?.synthFailoverVoicePoolDisplacedCount);
  const sampleDisplaced = n(pilotReport?.sampleFailoverVoicePoolDisplacedCount);
  const synthStealFadeRendered = n(pilotReport?.synthFailoverStealFadeTailRenderFrameCount);
  const sampleStealFadeRendered = n(pilotReport?.sampleFailoverStealFadeTailRenderFrameCount);
  const hasPoolCounters =
    synthAllocated + sampleAllocated + synthReused + sampleReused > 0;
  const decision: WaveStarterWorkletVoicePoolCompactionDecision = !pilotReport
    ? "no-worklet-pool-report"
    : synthStealFadeRendered + sampleStealFadeRendered > 0
      ? "pool-steal-fade-tailing"
      : synthDisplaced + sampleDisplaced > 0
        ? "pool-displacing-voices"
        : synthReused + sampleReused > 0
        ? "pool-reusing-voices"
        : hasPoolCounters
          ? "pool-allocating-only"
          : "pool-idle";
  return publishReport({
    version: 1,
    reportKind: "xensonar-wave-starter-worklet-voice-pool-compaction",
    generatedAtIso: new Date().toISOString(),
    decision,
    synthMaxVoices: n(pilotReport?.synthFailoverVoicePoolMaxVoices),
    synthQueuedVoices: n(pilotReport?.synthFailoverLastQueuedVoiceCount),
    synthAllocatedCount: synthAllocated,
    synthReusedCount: synthReused,
    synthRecycledCount: n(pilotReport?.synthFailoverVoicePoolRecycledCount),
    synthDisplacedCount: synthDisplaced,
    synthPriorityDisplacedCount: n(
      pilotReport?.synthFailoverVoicePoolPriorityDisplacedCount,
    ),
    synthLastDisplacedScore:
      pilotReport?.synthFailoverVoicePoolLastDisplacedScore ?? null,
    synthStealFadeTailQueuedCount: n(
      pilotReport?.synthFailoverStealFadeTailQueuedCount,
    ),
    synthStealFadeTailDroppedCount: n(
      pilotReport?.synthFailoverStealFadeTailDroppedCount,
    ),
    synthStealFadeTailRenderFrameCount: synthStealFadeRendered,
    synthStealFadeTailMaxTails: n(
      pilotReport?.synthFailoverStealFadeTailMaxTails,
    ),
    synthFreeCount: n(pilotReport?.synthFailoverVoicePoolFreeCount),
    sampleMaxVoices: n(pilotReport?.sampleFailoverVoicePoolMaxVoices),
    sampleQueuedVoices: n(pilotReport?.sampleFailoverLastQueuedVoiceCount),
    sampleAllocatedCount: sampleAllocated,
    sampleReusedCount: sampleReused,
    sampleRecycledCount: n(pilotReport?.sampleFailoverVoicePoolRecycledCount),
    sampleDisplacedCount: sampleDisplaced,
    samplePriorityDisplacedCount: n(
      pilotReport?.sampleFailoverVoicePoolPriorityDisplacedCount,
    ),
    sampleLastDisplacedScore:
      pilotReport?.sampleFailoverVoicePoolLastDisplacedScore ?? null,
    sampleStealFadeTailQueuedCount: n(
      pilotReport?.sampleFailoverStealFadeTailQueuedCount,
    ),
    sampleStealFadeTailDroppedCount: n(
      pilotReport?.sampleFailoverStealFadeTailDroppedCount,
    ),
    sampleStealFadeTailRenderFrameCount: sampleStealFadeRendered,
    sampleStealFadeTailMaxTails: n(
      pilotReport?.sampleFailoverStealFadeTailMaxTails,
    ),
    sampleFreeCount: n(pilotReport?.sampleFailoverVoicePoolFreeCount),
    compactionEnabled: true,
    priorityDisplacementEnabled: true,
    stealFadeTailEnabled: true,
    stealFadeTailIsOnlyForVoiceStealing: true,
    preservesLegacyPrimaryPath: true,
    keepsFailoverOnlyContract: true,
    doesNotEnablePrimaryReplacement: true,
    doesNotChangeSampleLoopParity: true,
    detail:
      "Worklet failover voices are reused from bounded synth/sample pools; when the pool is full, the lowest retention-score voice is displaced and, when still audible, handed to a very short steal-fade tail instead of being hard-killed. Legacy primary routing and Sample one-shot pilot limits stay unchanged.",
  });
}

export function formatWaveStarterWorkletVoicePoolCompactionUiValue(
  report: WaveStarterWorkletVoicePoolCompactionReport | null,
): string {
  if (!report) return "no-report · Pool-Kompaktion nicht beobachtet";
  const synthScore = report.synthLastDisplacedScore === null ? "—" : report.synthLastDisplacedScore.toFixed(2);
  const sampleScore = report.sampleLastDisplacedScore === null ? "—" : report.sampleLastDisplacedScore.toFixed(2);
  return `${report.decision} · Sy ${report.synthQueuedVoices}/${report.synthMaxVoices} A/R/Z/D/P/F ${report.synthAllocatedCount}/${report.synthReusedCount}/${report.synthRecycledCount}/${report.synthDisplacedCount}/${report.synthPriorityDisplacedCount}/${report.synthStealFadeTailRenderFrameCount} s${synthScore} · Sa ${report.sampleQueuedVoices}/${report.sampleMaxVoices} A/R/Z/D/P/F ${report.sampleAllocatedCount}/${report.sampleReusedCount}/${report.sampleRecycledCount}/${report.sampleDisplacedCount}/${report.samplePriorityDisplacedCount}/${report.sampleStealFadeTailRenderFrameCount} s${sampleScore} · Legacy primary`;
}
