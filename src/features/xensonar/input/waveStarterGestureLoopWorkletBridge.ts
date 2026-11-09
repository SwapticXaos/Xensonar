import {
  publishWaveStarterAttackIntegrityCongestionDecision,
  resolveWaveStarterAttackIntegrityCongestionDecision,
  type WaveStarterCongestionState,
} from "../audio/waveStarterAttackIntegrityCongestionBrake";
import type { WaveStarterEmitOptions } from "../audio/waveStarterLaneRuntimeBridge";
import {
  readWaveStarterSpecialPathIsolationFromBrowserHotPath,
} from "../performanceCrisis/waveStarterSpecialPathIsolationContract";
import {
  readWaveStarterProcessorRuntimePressureFeedbackReportFromBrowser,
  resolveWaveStarterProcessorPressureBias,
} from "../audio/waveStarterProcessorRuntimePressureFeedback";
import type {
  WaveStarterHoldExtendPolicy,
  WaveStarterHoldGestureLoopPulse,
  WaveStarterHoldLane,
} from "./waveStarterHoldSegmentClock";

export type WaveStarterGestureLoopWorkletBridgeDecision = {
  version: 1;
  reportKind: "xensonar-wave-starter-gesture-loop-worklet-bridge";
  generatedAtIso: string;
  lane: WaveStarterHoldLane;
  keyId: string;
  pulseIndex: number;
  segmentsPerBar: number;
  intervalMs: number;
  targetHz: number | null;
  congestionState: WaveStarterCongestionState;
  congestionBrakeReason: string;
  pressureBias: number;
  activeScheduledToneCount: number;
  workletBridge: boolean;
  workletFirst: boolean;
  legacyFallbackPreserved: boolean;
  specialPathAllowed: boolean;
  isolatedOffReason: string | null;
  forceSustainExtend: boolean;
  extendPolicy: WaveStarterHoldExtendPolicy;
  sourceIntent: "enter-hold-gesture-loop" | "keyboard-hold-gesture-loop";
  microReason: string;
  options: WaveStarterEmitOptions;
};

export type WaveStarterGestureLoopWorkletBridgeReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-gesture-loop-worklet-bridge-report";
  generatedAtIso: string;
  lastDecision: WaveStarterGestureLoopWorkletBridgeDecision | null;
  lastDecisionAgeMs: number | null;
  totalBridgePulseCount: number;
  byLane: Record<WaveStarterHoldLane, number>;
  apostropheSafeExtendCount: number;
  legacyFallbackPreserved: boolean;
  workletFirst: boolean;
  detail: string;
};

export const WAVE_STARTER_GESTURE_LOOP_WORKLET_BRIDGE_GLOBAL =
  "__XENSONAR_WAVE_STARTER_GESTURE_LOOP_WORKLET_BRIDGE__";

const byLane: Record<WaveStarterHoldLane, number> = {
  wellenstart: 0,
  klaviatur: 0,
};
let totalBridgePulseCount = 0;
let apostropheSafeExtendCount = 0;
let lastDecision: WaveStarterGestureLoopWorkletBridgeDecision | null = null;
let lastDecisionAtMs: number | null = null;

function nowMs() {
  return typeof performance !== "undefined" &&
    typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function resolveSourceIntent(
  lane: WaveStarterHoldLane,
): WaveStarterGestureLoopWorkletBridgeDecision["sourceIntent"] {
  return lane === "klaviatur"
    ? "keyboard-hold-gesture-loop"
    : "enter-hold-gesture-loop";
}

export function isWaveStarterGestureLoopWorkletBridgeAllowedFromBrowser(): boolean {
  return readWaveStarterSpecialPathIsolationFromBrowserHotPath()
    .holdGestureLoopWorkletBridge === true;
}

export function resolveWaveStarterGestureLoopWorkletBridgeOptions(args: {
  pulse: WaveStarterHoldGestureLoopPulse;
  pressureBias: number;
  activeScheduledToneCount: number;
  audioReadyForPreview?: boolean;
}): WaveStarterGestureLoopWorkletBridgeDecision {
  const isolation = readWaveStarterSpecialPathIsolationFromBrowserHotPath();
  const forceSustainExtend =
    args.pulse.extendPolicy === "apostrophe-safe-extend" ||
    args.pulse.sustainExtendActive === true;
  const sourceIntent = resolveSourceIntent(args.pulse.lane);
  const specialPathAllowed = isolation.holdGestureLoopWorkletBridge === true;

  if (!specialPathAllowed) {
    const microReason = `hold-gesture-loop-isolated-off:${sourceIntent}`;
    return {
      version: 1,
      reportKind: "xensonar-wave-starter-gesture-loop-worklet-bridge",
      generatedAtIso: new Date().toISOString(),
      lane: args.pulse.lane,
      keyId: args.pulse.keyId,
      pulseIndex: args.pulse.pulseIndex,
      segmentsPerBar: args.pulse.segmentsPerBar,
      intervalMs: args.pulse.intervalMs,
      targetHz: args.pulse.targetHz,
      congestionState: "critical",
      congestionBrakeReason: "hold-gesture-loop-special-path-isolated-off",
      pressureBias: 0,
      activeScheduledToneCount: 0,
      workletBridge: false,
      workletFirst: false,
      legacyFallbackPreserved: false,
      specialPathAllowed: false,
      isolatedOffReason: "hold-gesture-loop-special-path-isolated-off",
      forceSustainExtend,
      extendPolicy: args.pulse.extendPolicy,
      sourceIntent,
      microReason,
      options: {
        waveStarterGestureLoopWorkletBridge: true,
        waveStarterGestureLoopWorkletOnly: true,
        waveStarterSpecialPathDisabled: true,
        microReason,
        forceSustainExtend,
        waveStarterGestureLoopLane: args.pulse.lane,
        waveStarterGestureLoopPulseIndex: args.pulse.pulseIndex,
        waveStarterGestureLoopSegmentsPerBar: args.pulse.segmentsPerBar,
        waveStarterGestureLoopExtendPolicy: args.pulse.extendPolicy,
      },
    };
  }

  const processorPressureReport =
    readWaveStarterProcessorRuntimePressureFeedbackReportFromBrowser();
  const pressureBias = clamp(
    Math.max(
      args.pressureBias,
      resolveWaveStarterProcessorPressureBias(processorPressureReport),
    ),
    0,
    1,
  );
  const activeScheduledToneCount = Math.max(
    0,
    Math.floor(
      Number.isFinite(args.activeScheduledToneCount)
        ? args.activeScheduledToneCount
        : 0,
    ),
  );

  const congestion = resolveWaveStarterAttackIntegrityCongestionDecision({
    pressureBias,
    activeScheduledToneCount,
    isKeyboardGlissando: args.pulse.lane === "klaviatur",
    isRepeat: true,
    audioReadyForPreview: args.audioReadyForPreview !== false,
  });
  publishWaveStarterAttackIntegrityCongestionDecision(congestion);

  if (!forceSustainExtend) {
    const microReason = `hold-gesture-loop-9061-direct-pulse:${sourceIntent}`;
    const options: WaveStarterEmitOptions = {
      legacy9061DirectGate: true,
      microReason,
      forceSustainExtend: false,
      keyboardGestureSource:
        args.pulse.lane === "klaviatur" ? "keyboard-direct" : undefined,
      waveStarterGestureLoopLane: args.pulse.lane,
      waveStarterGestureLoopPulseIndex: args.pulse.pulseIndex,
      waveStarterGestureLoopSegmentsPerBar: args.pulse.segmentsPerBar,
      waveStarterGestureLoopExtendPolicy: args.pulse.extendPolicy,
    };

    return {
      version: 1,
      reportKind: "xensonar-wave-starter-gesture-loop-worklet-bridge",
      generatedAtIso: new Date().toISOString(),
      lane: args.pulse.lane,
      keyId: args.pulse.keyId,
      pulseIndex: args.pulse.pulseIndex,
      segmentsPerBar: args.pulse.segmentsPerBar,
      intervalMs: args.pulse.intervalMs,
      targetHz: args.pulse.targetHz,
      congestionState: congestion.state,
      congestionBrakeReason: congestion.reason,
      pressureBias,
      activeScheduledToneCount,
      workletBridge: false,
      workletFirst: false,
      legacyFallbackPreserved: true,
      specialPathAllowed: true,
      isolatedOffReason: null,
      forceSustainExtend: false,
      extendPolicy: args.pulse.extendPolicy,
      sourceIntent,
      microReason,
      options,
    };
  }

  const microReason = `hold-gesture-loop-worklet-bridge:${sourceIntent}:apostrophe-safe-extend`;

  const options: WaveStarterEmitOptions = {
    microOrchestrated: true,
    microReason,
    microGainScale: congestion.gainScale,
    microVoiceDemandMul: congestion.voiceDemandMul,
    microAttackSoftening: congestion.attackSoftening,
    congestionBrakeState: congestion.state,
    congestionBrakeReason: congestion.reason,
    attackIntegrityPreserved: true,
    forceSustainExtend,
    keyboardGestureSource: "apostrophe-hold",
    waveStarterGestureLoopWorkletBridge: true,
    waveStarterGestureLoopWorkletOnly: !isolation.holdGestureLegacyFallback,
    waveStarterInstrumentEngineSkeleton: true,
    waveStarterInstrumentEngineSource: "hold-gesture-loop",
    waveStarterInstrumentEngineSegmentClock: true,
    waveStarterGestureLoopLane: args.pulse.lane,
    waveStarterGestureLoopPulseIndex: args.pulse.pulseIndex,
    waveStarterGestureLoopSegmentsPerBar: args.pulse.segmentsPerBar,
    waveStarterGestureLoopExtendPolicy: args.pulse.extendPolicy,
  };

  return {
    version: 1,
    reportKind: "xensonar-wave-starter-gesture-loop-worklet-bridge",
    generatedAtIso: new Date().toISOString(),
    lane: args.pulse.lane,
    keyId: args.pulse.keyId,
    pulseIndex: args.pulse.pulseIndex,
    segmentsPerBar: args.pulse.segmentsPerBar,
    intervalMs: args.pulse.intervalMs,
    targetHz: args.pulse.targetHz,
    congestionState: congestion.state,
    congestionBrakeReason: congestion.reason,
    pressureBias,
    activeScheduledToneCount,
    workletBridge: true,
    workletFirst: true,
    legacyFallbackPreserved: isolation.holdGestureLegacyFallback,
    specialPathAllowed: true,
    isolatedOffReason: null,
    forceSustainExtend,
    extendPolicy: args.pulse.extendPolicy,
    sourceIntent,
    microReason,
    options,
  };
}

export function publishWaveStarterGestureLoopWorkletBridgeDecision(
  decision: WaveStarterGestureLoopWorkletBridgeDecision,
): WaveStarterGestureLoopWorkletBridgeReport {
  if (decision.specialPathAllowed) {
    byLane[decision.lane] += 1;
    totalBridgePulseCount += 1;
    if (decision.forceSustainExtend) apostropheSafeExtendCount += 1;
  }
  lastDecision = decision;
  lastDecisionAtMs = nowMs();
  return buildWaveStarterGestureLoopWorkletBridgeReport();
}

export function buildWaveStarterGestureLoopWorkletBridgeReport(): WaveStarterGestureLoopWorkletBridgeReport {
  const ageMs =
    lastDecisionAtMs === null ? null : Math.max(0, nowMs() - lastDecisionAtMs);
  const report: WaveStarterGestureLoopWorkletBridgeReport = {
    version: 1,
    reportKind: "xensonar-wave-starter-gesture-loop-worklet-bridge-report",
    generatedAtIso: new Date().toISOString(),
    lastDecision,
    lastDecisionAgeMs: ageMs,
    totalBridgePulseCount,
    byLane: { ...byLane },
    apostropheSafeExtendCount,
    legacyFallbackPreserved: lastDecision?.legacyFallbackPreserved ?? false,
    workletFirst: lastDecision?.workletFirst ?? false,
    detail:
      "Hold-Gesture-Pulse werden nur bei aktivem Spezialpfad als loopartige Wellenstarter-Spur markiert; ist der Pfad im Krisenmanager aus, bleibt er isoliert und feuert weder Legacy-Fallback noch Worklet-Bridge nach.",
  };
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[
      WAVE_STARTER_GESTURE_LOOP_WORKLET_BRIDGE_GLOBAL
    ] = report;
  }
  return report;
}

export function readWaveStarterGestureLoopWorkletBridgeReportFromBrowser(): WaveStarterGestureLoopWorkletBridgeReport | null {
  if (typeof window === "undefined") return null;
  const value = (window as unknown as Record<string, unknown>)[
    WAVE_STARTER_GESTURE_LOOP_WORKLET_BRIDGE_GLOBAL
  ];
  return value && typeof value === "object"
    ? (value as WaveStarterGestureLoopWorkletBridgeReport)
    : null;
}

export function formatWaveStarterGestureLoopWorkletBridgeUiValue(
  report: WaveStarterGestureLoopWorkletBridgeReport | null,
): string {
  if (!report?.lastDecision)
    return "not-observed · Hold-Gesture-Loop noch nicht zum Worklet-Bridge-Pfad gesendet";
  const d = report.lastDecision;
  if (!d.specialPathAllowed) return `${d.sourceIntent} · isoliert aus · ${d.segmentsPerBar} Seg · kein Legacy-/Worklet-Nachfeuern`;
  return `${d.sourceIntent} · ${d.congestionState}/${d.congestionBrakeReason} · ${d.segmentsPerBar} Seg · W/K ${report.byLane.wellenstart}/${report.byLane.klaviatur} · extend ${report.apostropheSafeExtendCount} · worklet-first · legacy ${d.legacyFallbackPreserved ? "fallback" : "aus"}`;
}
