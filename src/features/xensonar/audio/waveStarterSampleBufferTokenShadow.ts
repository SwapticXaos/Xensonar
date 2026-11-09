import { loadMelodicSampleBuffer } from "../../l3lab/canonicalForge/melodicSampleLibrary";
import { resolveSamplePlaybackProfile } from "../../soundLibrary/samplePlaybackProfile";
import type { WaveStarterSampleVoiceSpec } from "./waveStarterVoiceSpecFailoverContract";
import {
  getWaveStarterWorkletPilotSnapshot,
  postWaveStarterWorkletSampleBufferTokenShadow,
  type WaveStarterWorkletPilotSnapshot,
} from "./waveStarterWorkletPilotBridge";

export type WaveStarterSampleBufferToken = `wave-starter-sample-buffer:${string}`;

export type WaveStarterSampleBufferTokenShadowDescriptor = {
  version: 1;
  shadowKind: "wave-starter-sample-buffer-token-shadow";
  sampleId: string;
  bufferToken: WaveStarterSampleBufferToken;
  generation: number;
  createdAtMs: number;
  audioBufferSampleRate: number;
  contextSampleRate: number;
  channelCount: number;
  copiedChannelCount: number;
  frameCount: number;
  copiedFrameCount: number;
  durationSec: number;
  copiedDurationSec: number;
  baseHz: number | null;
  baseHzSource: "estimated" | "manual" | null;
  tempoPitchLinked: boolean;
  playbackDurationSec: number | null;
  playbackRate: number;
  targetDurationSec: number;
  shouldLoop: boolean;
  transferableChannelDataAvailable: boolean;
  renderPilotOneShotEligible: true;
  renderPilotLoopDisabled: true;
  sampleFailoverEligibleOnlyWhenHydrated: true;
  forbidsGenericSampleSubstitution: true;
};

export type WaveStarterSampleBufferTokenShadowPayload = {
  descriptor: WaveStarterSampleBufferTokenShadowDescriptor;
  channelData: Float32Array[];
  transfer: Transferable[];
};

export type WaveStarterSampleBufferTokenShadowDecision =
  | "no-sample-buffer-token-shadow-observed"
  | "sample-buffer-token-created"
  | "sample-buffer-token-hydration-posted"
  | "sample-buffer-token-worklet-accepted"
  | "sample-buffer-token-worklet-rejected"
  | "sample-failover-blocked-until-buffer-token-hydrated"
  | "sample-buffer-token-shadow-load-failed";

export type WaveStarterSampleBufferTokenShadowReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-sample-buffer-token-shadow";
  generatedAtIso: string;
  decision: WaveStarterSampleBufferTokenShadowDecision;
  lastDescriptor: WaveStarterSampleBufferTokenShadowDescriptor | null;
  lastBlockedSampleSpec: WaveStarterSampleVoiceSpec | null;
  lastError: string | null;
  tokenCreatedCount: number;
  hydrationPostedCount: number;
  hydrationPreparedCount: number;
  hydrationFailedCount: number;
  workletAcceptedCount: number;
  workletRejectedCount: number;
  workletHydratedTokenCount: number;
  lastWorkletToken: string | null;
  lastRejectReason: string | null;
  sampleFailoverStillBlocked: boolean;
  sampleFailoverEligibleOnlyWhenHydrated: true;
  sampleRenderingDisabledUntilPilot: false;
  sampleRendererPilotEnabled: true;
  sampleRendererOneShotOnly: true;
  synthFallbackForbiddenForSamples: true;
  forbidsGenericSampleSubstitution: true;
  detail: string;
};

export const WAVE_STARTER_SAMPLE_BUFFER_TOKEN_SHADOW_GLOBAL =
  "__XENSONAR_WAVE_STARTER_SAMPLE_BUFFER_TOKEN_SHADOW__";

const MAX_SHADOW_CHANNELS = 2;
const MAX_SHADOW_SECONDS = 2.5;

let tokenCreatedCount = 0;
let hydrationPostedCount = 0;
let hydrationPreparedCount = 0;
let hydrationFailedCount = 0;
let lastDescriptor: WaveStarterSampleBufferTokenShadowDescriptor | null = null;
let lastBlockedSampleSpec: WaveStarterSampleVoiceSpec | null = null;
let lastError: string | null = null;
let generation = 0;
let lastReport: WaveStarterSampleBufferTokenShadowReport | null = null;

function nowMs() {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  )
    return performance.now();
  return Date.now();
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function sanitizeSampleId(sampleId: string) {
  return encodeURIComponent(sampleId || "unknown-sample").slice(0, 160);
}

export function resolveWaveStarterSampleBufferToken(
  sampleId: string,
): WaveStarterSampleBufferToken {
  return `wave-starter-sample-buffer:${sanitizeSampleId(sampleId)}`;
}

function copyAudioBufferChannels(args: {
  buffer: AudioBuffer;
  maxChannels: number;
  maxFrames: number;
}): Float32Array[] {
  const copied: Float32Array[] = [];
  const channelCount = Math.min(
    args.maxChannels,
    Math.max(1, args.buffer.numberOfChannels),
  );
  const frameCount = Math.min(args.maxFrames, args.buffer.length);
  for (let channel = 0; channel < channelCount; channel += 1) {
    const source = args.buffer.getChannelData(channel);
    copied.push(source.slice(0, frameCount));
  }
  return copied;
}

export async function buildWaveStarterSampleBufferTokenShadowPayload(args: {
  ctx: BaseAudioContext;
  sampleId: string;
  targetFreqHz: number;
}): Promise<WaveStarterSampleBufferTokenShadowPayload | null> {
  const loaded = await loadMelodicSampleBuffer(args.sampleId, args.ctx);
  if (!loaded?.buffer) return null;
  const playbackProfile = resolveSamplePlaybackProfile({
    loaded,
    targetHz: args.targetFreqHz,
    minRate: 0.25,
    maxRate: 4,
  });
  const buffer = loaded.buffer;
  const maxFrames = Math.max(
    1,
    Math.floor(buffer.sampleRate * MAX_SHADOW_SECONDS),
  );
  const channelData = copyAudioBufferChannels({
    buffer,
    maxChannels: MAX_SHADOW_CHANNELS,
    maxFrames,
  });
  const copiedFrameCount = channelData[0]?.length ?? 0;
  const descriptor: WaveStarterSampleBufferTokenShadowDescriptor = {
    version: 1,
    shadowKind: "wave-starter-sample-buffer-token-shadow",
    sampleId: args.sampleId,
    bufferToken: resolveWaveStarterSampleBufferToken(args.sampleId),
    generation: (generation += 1),
    createdAtMs: nowMs(),
    audioBufferSampleRate: buffer.sampleRate,
    contextSampleRate: args.ctx.sampleRate,
    channelCount: buffer.numberOfChannels,
    copiedChannelCount: channelData.length,
    frameCount: buffer.length,
    copiedFrameCount,
    durationSec: buffer.duration,
    copiedDurationSec: copiedFrameCount / Math.max(1, buffer.sampleRate),
    baseHz: loaded.baseHz ?? null,
    baseHzSource: loaded.baseHzSource ?? null,
    tempoPitchLinked: loaded.tempoPitchLinked,
    playbackDurationSec: loaded.playbackDurationSec ?? null,
    playbackRate: clamp(playbackProfile.playbackRate, 0.25, 4),
    targetDurationSec: clamp(playbackProfile.targetDurationSec, 0.18, 2.0),
    shouldLoop: playbackProfile.shouldLoop,
    transferableChannelDataAvailable: channelData.length > 0 && copiedFrameCount > 0,
    renderPilotOneShotEligible: true,
    renderPilotLoopDisabled: true,
    sampleFailoverEligibleOnlyWhenHydrated: true,
    forbidsGenericSampleSubstitution: true,
  };
  return {
    descriptor,
    channelData,
    transfer: channelData.map((entry) => entry.buffer),
  };
}

function makeReport(args: {
  decision: WaveStarterSampleBufferTokenShadowDecision;
  pilotReport?: WaveStarterWorkletPilotSnapshot | null;
  detail: string;
}): WaveStarterSampleBufferTokenShadowReport {
  const pilot = args.pilotReport ?? getWaveStarterWorkletPilotSnapshot();
  return {
    version: 1,
    reportKind: "xensonar-wave-starter-sample-buffer-token-shadow",
    generatedAtIso: new Date().toISOString(),
    decision: args.decision,
    lastDescriptor,
    lastBlockedSampleSpec,
    lastError,
    tokenCreatedCount,
    hydrationPostedCount,
    hydrationPreparedCount,
    hydrationFailedCount,
    workletAcceptedCount: pilot.sampleBufferTokenShadowAcceptedCount,
    workletRejectedCount: pilot.sampleBufferTokenShadowRejectedCount,
    workletHydratedTokenCount: pilot.sampleBufferTokenHydratedCount,
    lastWorkletToken: pilot.sampleBufferLastToken,
    lastRejectReason: pilot.sampleBufferLastRejectReason,
    sampleFailoverStillBlocked: pilot.sampleFailoverCandidateAcceptedCount <= 0,
    sampleFailoverEligibleOnlyWhenHydrated: true,
    sampleRenderingDisabledUntilPilot: false,
    sampleRendererPilotEnabled: true,
    sampleRendererOneShotOnly: true,
    synthFallbackForbiddenForSamples: true,
    forbidsGenericSampleSubstitution: true,
    detail: args.detail,
  };
}

function publishReport(
  report: WaveStarterSampleBufferTokenShadowReport,
): WaveStarterSampleBufferTokenShadowReport {
  lastReport = report;
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[
      WAVE_STARTER_SAMPLE_BUFFER_TOKEN_SHADOW_GLOBAL
    ] = report;
  }
  return report;
}

export function publishWaveStarterSampleBufferTokenCreated(
  sampleId: string,
): WaveStarterSampleBufferTokenShadowReport {
  tokenCreatedCount += 1;
  lastError = null;
  return publishReport(
    makeReport({
      decision: "sample-buffer-token-created",
      detail: `Sample-Wellenstarter has a deterministic buffer token (${resolveWaveStarterSampleBufferToken(sampleId)}); Worklet one-shot rendering remains gated until a matching sample failover candidate is posted.`,
    }),
  );
}

export function publishWaveStarterSampleFailoverBlockedUntilHydrated(
  spec: WaveStarterSampleVoiceSpec,
  pilotReport?: WaveStarterWorkletPilotSnapshot | null,
): WaveStarterSampleBufferTokenShadowReport {
  lastBlockedSampleSpec = spec;
  lastError = null;
  return publishReport(
    makeReport({
      decision: "sample-failover-blocked-until-buffer-token-hydrated",
      pilotReport,
      detail:
        "Sample-Wellenstarter failover is blocked: a token may exist, but sample rendering is forbidden until the Worklet has accepted a matching buffer shadow.",
    }),
  );
}

export function publishWaveStarterSampleBufferTokenShadowFromWorklet(
  pilotReport?: WaveStarterWorkletPilotSnapshot | null,
): WaveStarterSampleBufferTokenShadowReport {
  const pilot = pilotReport ?? getWaveStarterWorkletPilotSnapshot();
  const rejected = pilot.sampleBufferTokenShadowRejectedCount > 0;
  return publishReport(
    makeReport({
      decision: rejected
        ? "sample-buffer-token-worklet-rejected"
        : pilot.sampleBufferTokenShadowAcceptedCount > 0
          ? "sample-buffer-token-worklet-accepted"
          : "sample-buffer-token-hydration-posted",
      pilotReport: pilot,
      detail:
        "Sample buffer token shadow is visible to the Worklet bridge. This is still a preparation contract; audible sample failover remains disabled.",
    }),
  );
}

export async function primeWaveStarterSampleBufferTokenShadow(args: {
  ctx: BaseAudioContext | null | undefined;
  sampleId: string;
  targetFreqHz: number;
}): Promise<WaveStarterSampleBufferTokenShadowReport> {
  publishWaveStarterSampleBufferTokenCreated(args.sampleId);
  if (!args.ctx) {
    hydrationFailedCount += 1;
    lastError = "missing-audio-context";
    return publishReport(
      makeReport({
        decision: "sample-buffer-token-shadow-load-failed",
        detail:
          "Sample buffer token shadow could not be hydrated because no AudioContext was available.",
      }),
    );
  }
  try {
    const payload = await buildWaveStarterSampleBufferTokenShadowPayload({
      ctx: args.ctx,
      sampleId: args.sampleId,
      targetFreqHz: args.targetFreqHz,
    });
    if (!payload) {
      hydrationFailedCount += 1;
      lastError = "sample-buffer-load-failed";
      return publishReport(
        makeReport({
          decision: "sample-buffer-token-shadow-load-failed",
          detail:
            "Sample buffer token shadow could not load a sample buffer. Legacy sample playback remains the only audible path.",
        }),
      );
    }
    hydrationPreparedCount += 1;
    hydrationPostedCount += 1;
    lastDescriptor = payload.descriptor;
    lastError = null;
    const snapshot = postWaveStarterWorkletSampleBufferTokenShadow(
      args.ctx,
      payload,
    );
    return publishReport(
      makeReport({
        decision: "sample-buffer-token-hydration-posted",
        pilotReport: snapshot,
        detail:
          "Sample buffer token shadow was posted to the Worklet bridge. Rendering is still disabled until an explicit sample failover pilot is introduced.",
      }),
    );
  } catch (error) {
    hydrationFailedCount += 1;
    lastError = error instanceof Error ? error.message : String(error);
    return publishReport(
      makeReport({
        decision: "sample-buffer-token-shadow-load-failed",
        detail:
          "Sample buffer token shadow failed during async hydration. Legacy sample playback remains unchanged.",
      }),
    );
  }
}

export function buildWaveStarterSampleBufferTokenShadowReport(
  pilotReport?: WaveStarterWorkletPilotSnapshot | null,
): WaveStarterSampleBufferTokenShadowReport {
  return publishReport(
    makeReport({
      decision:
        pilotReport?.sampleBufferTokenShadowAcceptedCount &&
        pilotReport.sampleBufferTokenShadowAcceptedCount > 0
          ? "sample-buffer-token-worklet-accepted"
          : lastReport?.decision ?? "no-sample-buffer-token-shadow-observed",
      pilotReport,
      detail:
        lastReport?.detail ??
        "No Sample-Wellenstarter buffer token shadow has been observed yet; sample failover remains blocked.",
    }),
  );
}

export function readWaveStarterSampleBufferTokenShadowReportFromBrowser(): WaveStarterSampleBufferTokenShadowReport | null {
  if (typeof window === "undefined") return null;
  const value = (window as unknown as Record<string, unknown>)[
    WAVE_STARTER_SAMPLE_BUFFER_TOKEN_SHADOW_GLOBAL
  ];
  return value && typeof value === "object"
    ? (value as WaveStarterSampleBufferTokenShadowReport)
    : null;
}

export function formatWaveStarterSampleBufferTokenShadowUiValue(
  report: WaveStarterSampleBufferTokenShadowReport | null,
): string {
  if (!report) return "not-observed · Sample-Failover blockiert bis Buffer/Token-Shadow";
  const descriptor = report.lastDescriptor;
  const token = descriptor?.bufferToken ? descriptor.bufferToken.split(":").slice(-1)[0] : "none";
  const frames = descriptor
    ? `${descriptor.copiedFrameCount}/${descriptor.frameCount}f · ${descriptor.copiedChannelCount}/${descriptor.channelCount}ch`
    : "0/0f · 0/0ch";
  return `${report.decision} · token ${token} · prepared ${report.hydrationPreparedCount} · W ${report.workletAcceptedCount}/${report.workletRejectedCount} · hydrated ${report.workletHydratedTokenCount} · ${frames} · samples kein Synth-Fake`;
}
