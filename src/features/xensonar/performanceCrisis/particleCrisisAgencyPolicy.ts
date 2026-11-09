import type {
  ParticleAudioIntentRuntimePolicy,
  ParticleMotionRuntimePolicy,
} from "./performanceCrisisRuntimePolicies";
import { resolveCrisisQuantizationStepSec } from "./crisisQuantizationFallbackPolicy";

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

export function resolveParticleCrisisPressure(args: {
  audioPressureBias?: number | null;
  dueCount?: number;
  retainedCount?: number;
  activeWaveCount?: number;
  activeAgentCount?: number;
}) {
  const audioPressure = clampNumber(args.audioPressureBias ?? 0, 0, 1);
  const duePressure = clampNumber(((args.dueCount ?? 0) - 6) / 14, 0, 1);
  const backlogPressure =
    clampNumber(((args.retainedCount ?? 0) - 18) / 42, 0, 1) * 0.75;
  const wavePressure =
    clampNumber(((args.activeWaveCount ?? 0) - 4) / 12, 0, 1) * 0.72;
  const agentPressure =
    clampNumber(((args.activeAgentCount ?? 0) - 18) / 22, 0, 1) * 0.4;
  return Math.max(
    audioPressure,
    duePressure,
    backlogPressure,
    wavePressure,
    agentPressure,
  );
}

export function resolveParticleLoadReductionScale(
  policy: ParticleAudioIntentRuntimePolicy | null | undefined,
  pressureBias: number,
  surface: "audio-intent" | "flush-admission",
) {
  const loadReduction = policy?.loadReduction;
  if (!loadReduction?.enabled || loadReduction.mode === "off") return 1;
  const floor = clampNumber(loadReduction.pressureFloor, 0, 1);
  const full = Math.max(
    floor + 0.01,
    clampNumber(loadReduction.fullEffectPressure, floor + 0.01, 1.2),
  );
  const pressure = clampNumber(pressureBias, 0, 1);
  const raw = clampNumber((pressure - floor) / (full - floor), 0, 1);
  const eased = raw * raw * (3 - 2 * raw);
  const minScale =
    surface === "flush-admission"
      ? clampNumber(loadReduction.minFlushAdmissionScale, 0.25, 1)
      : clampNumber(loadReduction.minAudioIntentScale, 0.25, 1);
  return 1 - (1 - minScale) * eased;
}

function applyParticleLoadReductionBudget(args: {
  budget: number;
  minimum: number;
  policy: ParticleAudioIntentRuntimePolicy | null | undefined;
  pressureBias: number;
  surface: "audio-intent" | "flush-admission";
}) {
  const scale = resolveParticleLoadReductionScale(
    args.policy,
    args.pressureBias,
    args.surface,
  );
  const minimum = Math.max(1, Math.floor(args.minimum));
  return Math.max(minimum, Math.round(args.budget * scale));
}

export function resolveParticleFlushAdmissionContract(
  policy: ParticleAudioIntentRuntimePolicy | null | undefined,
  pressureBias: number,
) {
  const pressure = clampNumber(pressureBias, 0, 1);
  const mode = policy?.crisisMode ?? "quantization-loosening";
  const smoothBeforeThin = policy?.smoothBeforeThin !== false;
  const configuredMax = clampNumber(policy?.denseFrameMaxIntents ?? 8, 2, 18);
  const finalize = <
    T extends {
      mode: string;
      maxTotal: number;
      maxResidents: number;
      deferBaseSec: number;
      deferLaneSec: number;
      subdivision: 1 | 2 | 4;
      freeBeforeDrop: boolean;
    },
  >(
    contract: T,
  ): T => ({
    ...contract,
    maxTotal: applyParticleLoadReductionBudget({
      budget: contract.maxTotal,
      minimum:
        mode === "stability-first"
          ? 2
          : mode === "off"
            ? Math.min(6, contract.maxTotal)
            : 3,
      policy,
      pressureBias: pressure,
      surface: "flush-admission",
    }),
  });
  if (mode === "off") {
    return finalize({
      mode,
      maxTotal: Math.max(7, Math.min(12, configuredMax)),
      maxResidents: pressure >= 0.82 ? 2 : 3,
      deferBaseSec: 0.004,
      deferLaneSec: 0.004,
      subdivision: 1 as 1 | 2 | 4,
      freeBeforeDrop: true,
    });
  }
  if (mode === "quantization-liberation") {
    return finalize({
      mode,
      maxTotal:
        pressure >= 0.88
          ? Math.max(5, Math.min(configuredMax, 7))
          : Math.max(6, Math.min(configuredMax, 9)),
      maxResidents: pressure >= 0.76 ? 1 : 2,
      deferBaseSec: 0.006 + pressure * 0.006,
      deferLaneSec: 0.004 + pressure * 0.004,
      subdivision: 1 as 1 | 2 | 4,
      freeBeforeDrop: true,
    });
  }
  if (mode === "quantization-pyramid") {
    const subdivision =
      pressure >= 0.68
        ? (policy?.pyramidMaxSubdivision ?? 4)
        : pressure >= 0.42
          ? 2
          : 1;
    return finalize({
      mode,
      maxTotal:
        pressure >= 0.9
          ? Math.max(5, Math.min(configuredMax, 7))
          : Math.max(6, Math.min(configuredMax, 9)),
      maxResidents: pressure >= 0.72 ? 1 : 2,
      deferBaseSec: 0.01 + pressure * 0.01,
      deferLaneSec: 0.006 + pressure * 0.008,
      subdivision: (subdivision === 4 ? 4 : subdivision === 2 ? 2 : 1) as
        | 1
        | 2
        | 4,
      freeBeforeDrop: false,
    });
  }
  if (mode === "stability-first") {
    return finalize({
      mode,
      maxTotal: pressure >= 0.82 ? 4 : pressure >= 0.58 ? 5 : 6,
      maxResidents: pressure >= 0.72 ? 1 : 2,
      deferBaseSec: 0.018 + pressure * 0.018,
      deferLaneSec: 0.012 + pressure * 0.014,
      subdivision: 1 as 1 | 2 | 4,
      freeBeforeDrop: false,
    });
  }
  return finalize({
    mode: "quantization-loosening" as const,
    maxTotal:
      pressure >= 0.88
        ? Math.max(5, Math.min(configuredMax, 7))
        : pressure >= 0.58
          ? Math.max(6, Math.min(configuredMax, 8))
          : Math.max(6, Math.min(configuredMax, 10)),
    maxResidents: pressure >= 0.72 ? 1 : 2,
    deferBaseSec: smoothBeforeThin
      ? 0.006 + pressure * ((policy?.maxMicroDelayMs ?? 14) / 1000) * 0.45
      : 0.016 + pressure * 0.014,
    deferLaneSec: smoothBeforeThin
      ? 0.003 + pressure * 0.005
      : 0.01 + pressure * 0.012,
    subdivision: 1 as 1 | 2 | 4,
    freeBeforeDrop: false,
  });
}

export function resolveParticleDeferredDueTime(args: {
  policy?: ParticleAudioIntentRuntimePolicy | null;
  nowSec: number;
  lane: number;
  stepSec: number;
  anchorSec: number;
  pressureBias?: number;
  gridTempoBpm?: number;
  baseDelaySec: number;
  laneDelaySec: number;
  getAnchoredDueTime: (
    nowSec: number,
    stepSec: number,
    anchorSec: number,
  ) => number;
}) {
  const mode = args.policy?.crisisMode ?? "quantization-loosening";
  const laneDelay = args.baseDelaySec + args.lane * args.laneDelaySec;
  if (mode === "off" || mode === "quantization-liberation") {
    const cap = Math.max(
      0.004,
      Math.min((args.policy?.maxMicroDelayMs ?? 18) / 1000, 0.028),
    );
    return args.nowSec + Math.min(cap, laneDelay);
  }
  if (mode === "quantization-pyramid") {
    const subdivision = args.policy?.pyramidMaxSubdivision ?? 2;
    const baseStep = args.policy?.quantization
      ? resolveCrisisQuantizationStepSec({
          bpm: args.gridTempoBpm ?? 108,
          grid: args.policy.quantization.grid,
          customSegmentsPerBar: args.policy.quantization.customSegmentsPerBar,
        })
      : args.stepSec;
    const subStep = baseStep / Math.max(1, subdivision);
    return args.getAnchoredDueTime(
      args.nowSec + laneDelay,
      subStep,
      args.anchorSec,
    );
  }
  if (mode === "quantization-loosening") {
    const cap = Math.max(
      0.004,
      Math.min((args.policy?.maxMicroDelayMs ?? 14) / 1000, 0.024),
    );
    return args.nowSec + Math.min(cap, laneDelay);
  }
  const fallbackStep = args.policy?.quantization
    ? resolveCrisisQuantizationStepSec({
        bpm: args.gridTempoBpm ?? 108,
        grid: args.policy.quantization.grid,
        customSegmentsPerBar: args.policy.quantization.customSegmentsPerBar,
      })
    : args.stepSec;
  return args.getAnchoredDueTime(
    args.nowSec + laneDelay,
    fallbackStep,
    args.anchorSec,
  );
}

export function resolveParticleAmbientMotionTarget(
  policy: ParticleMotionRuntimePolicy | null | undefined,
  pressureBias: number,
) {
  if (!policy?.enabled || policy.mode === "off") return 1;
  const pressure = clampNumber(pressureBias, 0, 1);
  const minScale = clampNumber(policy.minAmbientMotionScale, 0.45, 1);
  return 1 - (1 - minScale) * pressure;
}

export function stepParticleAmbientMotionScale(args: {
  currentScale?: number;
  targetScale: number;
  elapsedMs: number;
  policy: ParticleMotionRuntimePolicy | null | undefined;
}) {
  const current = clampNumber(args.currentScale ?? 1, 0.35, 1.05);
  const target = clampNumber(args.targetScale, 0.35, 1.05);
  const elapsedMs = Math.max(
    0,
    Number.isFinite(args.elapsedMs) ? args.elapsedMs : 16,
  );
  const movingDown = target < current;
  const timeConstant = movingDown
    ? (args.policy?.attackMs ?? 650)
    : (args.policy?.releaseMs ?? 1100);
  const alpha = 1 - Math.exp(-elapsedMs / Math.max(1, timeConstant));
  return current + (target - current) * alpha;
}
