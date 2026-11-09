/**
 * Pure semantic membrane between the existing Xensonar instrument and the
 * foreign Native kernel. This module is intentionally incapable of producing
 * audio and intentionally has no React/WebAudio dependency.
 *
 * Existing WaveStarterVoiceSpec values are structurally compatible with this
 * source shape. Keeping the membrane's type local prevents UI/runtime modules
 * from becoming dependencies of the implant ABI.
 *
 * OP1 note: the current physical pilot still transports only the older
 * frequency/gain/preset subset. This full bounded spec is the contract for the
 * subsequent parity graft; it is not yet the active wire format.
 */

export type WaveStarterImplantParity =
  | "reference-unknown"
  | "structural-only"
  | "parity-established";

export type WaveStarterImplantSourceBase = {
  voiceId: string;
  kind: "synth" | "sample";
  sourceIntent: "direct" | "deferred" | "microrelease" | "failover";
  playbackFreqHz: number;
  gain: number;
  durationMs: number;
  attackMs: number;
  releaseMs: number;
  exactnessLevel:
    | "unknown"
    | "structural"
    | "parameter-parity"
    | "render-parity"
    | "sample-contract-only";
};

export type WaveStarterImplantSynthSource = WaveStarterImplantSourceBase & {
  kind: "synth";
  presetId: string;
  waveformStrategy: "harmonic-preset-graph";
  gradientAmount: number;
  overtonesEnabled: boolean;
  overtoneWaveform: string;
  overtoneMode: string;
  overtoneGlobalLevel: number;
  overtoneAmounts: Readonly<Record<string, number>>;
  swellBlend: number;
  bodyExciterExpected: boolean;
};

export type WaveStarterImplantSampleSource = WaveStarterImplantSourceBase & {
  kind: "sample";
  sampleId: string;
  bufferToken: string;
  playbackRate: number | null;
  detuneCents: number | null;
  startOffsetSec: number;
  cropStartSec: number;
  cropEndSec: number | null;
  loop: boolean | null;
};

export type WaveStarterImplantSourceSpec =
  | WaveStarterImplantSynthSource
  | WaveStarterImplantSampleSource;

export type ResolvedWaveStarterImplantSpec = {
  version: 1;
  kind: "xensonar-wave-starter-implant-spec";
  voiceId: string;
  sourceKind: "synth" | "sample";
  sourceIntent: WaveStarterImplantSourceBase["sourceIntent"];
  playbackFreqHz: number;
  gain: number;
  durationMs: number;
  attackMs: number;
  releaseMs: number;
  parity: WaveStarterImplantParity;
  synth: null | {
    presetId: string;
    waveformStrategy: "harmonic-preset-graph";
    gradientAmount: number;
    overtonesEnabled: boolean;
    overtoneWaveform: string;
    overtoneMode: string;
    overtoneGlobalLevel: number;
    overtoneAmounts: Readonly<Record<string, number>>;
    swellBlend: number;
    bodyExciterExpected: boolean;
  };
  sample: null | {
    sampleId: string;
    bufferToken: string;
    playbackRate: number | null;
    detuneCents: number | null;
    startOffsetSec: number;
    cropStartSec: number;
    cropEndSec: number | null;
    loop: boolean | null;
  };
};

export function toResolvedWaveStarterImplantSpec(
  spec: WaveStarterImplantSourceSpec,
): ResolvedWaveStarterImplantSpec {
  const base = {
    version: 1 as const,
    kind: "xensonar-wave-starter-implant-spec" as const,
    voiceId: spec.voiceId,
    sourceKind: spec.kind,
    sourceIntent: spec.sourceIntent,
    playbackFreqHz: spec.playbackFreqHz,
    gain: spec.gain,
    durationMs: spec.durationMs,
    attackMs: spec.attackMs,
    releaseMs: spec.releaseMs,
    parity: spec.exactnessLevel === "render-parity"
      ? "parity-established" as const
      : spec.exactnessLevel === "parameter-parity"
        ? "structural-only" as const
        : "reference-unknown" as const,
  };

  if (spec.kind === "sample") {
    return {
      ...base,
      synth: null,
      sample: {
        sampleId: spec.sampleId,
        bufferToken: spec.bufferToken,
        playbackRate: spec.playbackRate,
        detuneCents: spec.detuneCents,
        startOffsetSec: spec.startOffsetSec,
        cropStartSec: spec.cropStartSec,
        cropEndSec: spec.cropEndSec,
        loop: spec.loop,
      },
    };
  }

  return {
    ...base,
    synth: {
      presetId: spec.presetId,
      waveformStrategy: spec.waveformStrategy,
      gradientAmount: spec.gradientAmount,
      overtonesEnabled: spec.overtonesEnabled,
      overtoneWaveform: spec.overtoneWaveform,
      overtoneMode: spec.overtoneMode,
      overtoneGlobalLevel: spec.overtoneGlobalLevel,
      overtoneAmounts: { ...spec.overtoneAmounts },
      swellBlend: spec.swellBlend,
      bodyExciterExpected: spec.bodyExciterExpected,
    },
    sample: null,
  };
}
