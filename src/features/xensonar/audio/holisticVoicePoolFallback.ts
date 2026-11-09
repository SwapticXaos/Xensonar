import {
  createAudioWorkletVoicePoolPreparation,
  describeAudioWorkletVoicePoolPreparation,
  type AudioWorkletVoicePoolPreparation,
  type VoicePoolLaneId,
} from "../../../core/audio/audioWorkletVoicePoolBoundary";
import type { RootFollowVoiceEngineMode } from "../performanceCrisis/performanceCrisisTypes";
import type { ParticleVoicePoolLiveReport } from "./particleVoicePoolLiveReport";
import type { WaveStarterVoicePoolLiveReport } from "./waveStarterVoicePoolLiveReport";

export type HolisticVoicePoolLaneId = VoicePoolLaneId;

export type HolisticVoicePoolLaneReadiness =
  | "worklet-relief-ready"
  | "worklet-proof-pending"
  | "main-thread-pooled-fallback"
  | "bounded-latest-intent-fallback"
  | "admission-fallback"
  | "blocked-before-audio";

export type HolisticVoicePoolLiveReportSource =
  | "live-report"
  | "traffic-proxy"
  | "none";

export type HolisticVoicePoolLaneDecision = {
  laneId: HolisticVoicePoolLaneId;
  label: string;
  preparation: AudioWorkletVoicePoolPreparation;
  readiness: HolisticVoicePoolLaneReadiness;
  activeBackend: AudioWorkletVoicePoolPreparation["backend"];
  fallbackBackend: AudioWorkletVoicePoolPreparation["backend"];
  preservesLegacyReferencePath: boolean;
  observedPressure: number;
  observedRelief: number;
  observedDrop: number;
  observedDeferred: number;
  observedPreservedStrongImpact: number;
  liveReportDecision: string | null;
  liveReportObserved: boolean;
  livePressureSource: HolisticVoicePoolLiveReportSource;
  blockers: string[];
  nextSafeStep: string;
};

export type HolisticVoicePoolFallbackReport = {
  version: 1;
  reportKind: "xensonar-holistic-voice-pool-fallback";
  generatedAtIso: string;
  currentVoiceEngineMode: RootFollowVoiceEngineMode;
  readiness: "blocked" | "fallback-protected" | "candidate-observed";
  defaultCandidateReady: boolean;
  lanes: HolisticVoicePoolLaneDecision[];
  blockers: string[];
  note: string;
};

export const ROOT_FOLLOW_STABLE_LANE_VOICE_POOL_PREPARATION =
  createAudioWorkletVoicePoolPreparation({
    laneId: "root-follow-material",
    backend: "audio-worklet-candidate",
    preservesMainThreadReferencePath: true,
    sampleAccurateSchedulingTarget: true,
    stableLaneClockContract: "shared-audio-time",
    migrationStage: "dual-path-a-b",
    notes: [
      "Root/Material ist der erste aktive Stable-Lane-Kandidat: Worklet darf Legacy nur nach fresh sustained frame proof entlasten.",
      "Legacy-Micro-Slices bleiben Fail-open-Fallback, solange stableLaneReliefReady oder Frame-Delta-Frische fehlen.",
      "Der Modus worklet-stable-lane-pilot ist Branch-Testdefault, aber noch kein globaler Xensonar-Produktdefault.",
    ],
  });

export const WAVE_STARTER_BOUNDED_VOICE_POOL_PREPARATION =
  createAudioWorkletVoicePoolPreparation({
    laneId: "wave-starter",
    backend: "main-thread-pooled",
    preservesMainThreadReferencePath: true,
    sampleAccurateSchedulingTarget: false,
    stableLaneClockContract: "shared-audio-time",
    migrationStage: "main-thread-pool-active",
    notes: [
      "Wellenstarter bleibt zunächst Main-Thread-basiert, aber als bounded latest-intent voice pool: keine Catch-up-Batches, ein kurzer Slot, stale Drop statt rhythmisch falschem Nachreichen.",
      "Der vorhandene waveStarterLaneRuntime/latest-intent-slot ist der hörbare Fallback-Pool, bis ein Worklet-Wellenstarter-Pilot existiert.",
      "Attack-Wert bleibt musikalisch wertvoll: unter Druck bevorzugt mikroverzögern, dann streng stale droppen, nicht stumpf früh amputieren.",
    ],
  });

export const PARTICLE_INTENT_VOICE_POOL_PREPARATION =
  createAudioWorkletVoicePoolPreparation({
    laneId: "particles",
    backend: "main-thread-pooled",
    preservesMainThreadReferencePath: true,
    sampleAccurateSchedulingTarget: false,
    stableLaneClockContract: "shared-audio-time",
    migrationStage: "main-thread-pool-active",
    notes: [
      "Partikel bleiben zunächst Main-Thread-basiert, aber als intent-admission pool: starke Impacts bewahren, schwächere Intents unter Last glätten/ausdünnen.",
      "Der vorhandene particleAdmissionBoundary/Refucktor-Guard ist der Fallback-Pool, bevor ein Partikel-Worklet oder fester Voice-Pool aktiv wird.",
      "Partikel sind gegenüber Root/Material und Wellenstarter früher disponibel; das ist eine Krisenpriorität, keine pauschale Klangabwertung.",
    ],
  });

export const HOLISTIC_XENSONAR_VOICE_POOL_PREPARATIONS = [
  ROOT_FOLLOW_STABLE_LANE_VOICE_POOL_PREPARATION,
  WAVE_STARTER_BOUNDED_VOICE_POOL_PREPARATION,
  PARTICLE_INTENT_VOICE_POOL_PREPARATION,
] as const;

export type HolisticVoicePoolInput = {
  currentVoiceEngineMode: RootFollowVoiceEngineMode;
  audioContextState: string;
  stableLaneReliefGate: string;
  stableLaneFrameDelta: number;
  stableLaneFrameFresh: boolean;
  stableLaneQuanta: number;
  rootMaterialReliefEvents: number;
  waveStarterEvents16: number;
  particleEvents16: number;
  workletProcessorErrorCount: number;
  planTransportForcedPosts: number;
  planTransportDroppedSupersededCount: number;
  waveStarterLiveReport?: WaveStarterVoicePoolLiveReport | null;
  particleVoicePoolLiveReport?: ParticleVoicePoolLiveReport | null;
};

function resolveRootFollowDecision(
  input: HolisticVoicePoolInput,
): HolisticVoicePoolLaneDecision {
  const blockers: string[] = [];
  const audioBlocked = input.audioContextState !== "running";
  if (input.currentVoiceEngineMode !== "worklet-stable-lane-pilot")
    blockers.push("not-worklet-stable-lane-pilot");
  if (audioBlocked) blockers.push(`audio-context-${input.audioContextState}`);
  if (input.workletProcessorErrorCount > 0)
    blockers.push("worklet-processor-errors");
  if (input.stableLaneFrameDelta <= 0 || input.stableLaneQuanta <= 0)
    blockers.push("stable-lane-frame-proof-missing");
  if (!input.stableLaneFrameFresh && input.stableLaneFrameDelta > 0)
    blockers.push("stable-lane-frame-window-stale");
  if (
    input.rootMaterialReliefEvents <= 0 &&
    input.stableLaneReliefGate !== "stable-lane-sustained-relief"
  )
    blockers.push("stable-lane-relief-not-observed");
  const reliefReady = blockers.length === 0;
  const proofPending =
    !audioBlocked &&
    !reliefReady &&
    input.currentVoiceEngineMode === "worklet-stable-lane-pilot";
  return {
    laneId: "root-follow-material",
    label: "Root/Material Stable Lane",
    preparation: ROOT_FOLLOW_STABLE_LANE_VOICE_POOL_PREPARATION,
    readiness: audioBlocked
      ? "blocked-before-audio"
      : reliefReady
        ? "worklet-relief-ready"
        : proofPending
          ? "worklet-proof-pending"
          : "main-thread-pooled-fallback",
    activeBackend: reliefReady
      ? "audio-worklet-candidate"
      : "main-thread-legacy",
    fallbackBackend: "main-thread-legacy",
    preservesLegacyReferencePath: true,
    observedPressure: Math.max(
      0,
      input.stableLaneFrameDelta + input.stableLaneQuanta,
    ),
    observedRelief: input.rootMaterialReliefEvents,
    observedDrop: 0,
    observedDeferred: 0,
    observedPreservedStrongImpact: 0,
    liveReportDecision: input.stableLaneReliefGate,
    liveReportObserved:
      input.stableLaneFrameDelta > 0 || input.rootMaterialReliefEvents > 0,
    livePressureSource:
      input.stableLaneFrameDelta > 0 || input.rootMaterialReliefEvents > 0
        ? "live-report"
        : "none",
    blockers,
    nextSafeStep: reliefReady
      ? "Root/Material darf im Kandidatenmodus weiter gegen Legacy A/B gemessen werden."
      : "Legacy-Fallback aktiv lassen; Stable-Lane-Proof/Relief erst weiter härten, bevor Ownership erhöht wird.",
  };
}

function significantWaveStarterBlockers(
  report: WaveStarterVoicePoolLiveReport | null,
): string[] {
  if (!report) return [];
  return report.blockers.filter(
    (blocker) => blocker !== "no-wave-intents-observed",
  );
}

function resolveWaveStarterDecision(
  input: HolisticVoicePoolInput,
): HolisticVoicePoolLaneDecision {
  const report = input.waveStarterLiveReport ?? null;
  const blockers: string[] = [];
  if (input.audioContextState !== "running")
    blockers.push(`audio-context-${input.audioContextState}`);
  if (input.planTransportForcedPosts > 0)
    blockers.push("root-material-plan-forced-posts-under-wave-pressure");
  if (input.workletProcessorErrorCount > 0)
    blockers.push("worklet-processor-errors");
  if (!report && input.waveStarterEvents16 > 0)
    blockers.push("wave-starter-live-report-missing-under-pressure");
  blockers.push(
    ...significantWaveStarterBlockers(report).map(
      (blocker) => `wave:${blocker}`,
    ),
  );

  const liveObserved = !!report;
  const liveCounters = report?.counters;
  const observedPressure =
    liveCounters?.requestTotal ?? input.waveStarterEvents16;
  const observedRelief = liveCounters
    ? liveCounters.microReleasedTotal +
      liveCounters.staleDroppedTotal +
      liveCounters.emittedFromDeferredTotal +
      liveCounters.retrySlotTotal
    : input.waveStarterEvents16 > 0
      ? Math.max(0, input.planTransportDroppedSupersededCount)
      : 0;
  const observedDrop = liveCounters?.staleDroppedTotal ?? 0;
  const observedDeferred = liveCounters?.deferredTotal ?? 0;
  const nextSafeStep = report
    ? `Wellenstarter-Live-Report ist integriert (${report.decision}); Microrelease/Stale-Drop-Zähler als nächste Druckschwellen nutzen, bevor ein Shadow-Worklet vorbereitet wird.`
    : "Wellenstarter bleibt latest-intent/micro-slot-gepoolt; Live-Report abwarten und nur Traffic-Proxies als groben Fallback verwenden.";

  return {
    laneId: "wave-starter",
    label: "Wellenstarter bounded voice pool",
    preparation: WAVE_STARTER_BOUNDED_VOICE_POOL_PREPARATION,
    readiness:
      input.audioContextState !== "running"
        ? "blocked-before-audio"
        : "bounded-latest-intent-fallback",
    activeBackend: "main-thread-pooled",
    fallbackBackend: "main-thread-legacy",
    preservesLegacyReferencePath: true,
    observedPressure,
    observedRelief,
    observedDrop,
    observedDeferred,
    observedPreservedStrongImpact: 0,
    liveReportDecision: report?.decision ?? null,
    liveReportObserved: liveObserved,
    livePressureSource: liveObserved
      ? "live-report"
      : input.waveStarterEvents16 > 0
        ? "traffic-proxy"
        : "none",
    blockers,
    nextSafeStep,
  };
}

function significantParticleBlockers(
  report: ParticleVoicePoolLiveReport | null,
): string[] {
  if (!report) return [];
  return report.blockers.filter(
    (blocker) => blocker !== "no-particle-intents-observed",
  );
}

function resolveParticleDecision(
  input: HolisticVoicePoolInput,
): HolisticVoicePoolLaneDecision {
  const report = input.particleVoicePoolLiveReport ?? null;
  const blockers: string[] = [];
  if (input.audioContextState !== "running")
    blockers.push(`audio-context-${input.audioContextState}`);
  if (input.particleEvents16 > 0 && input.stableLaneFrameDelta <= 0)
    blockers.push("particle-pressure-without-root-material-frame-proof");
  if (input.workletProcessorErrorCount > 0)
    blockers.push("worklet-processor-errors");
  if (!report && input.particleEvents16 > 0)
    blockers.push("particle-live-report-missing-under-pressure");
  blockers.push(
    ...significantParticleBlockers(report).map(
      (blocker) => `particle:${blocker}`,
    ),
  );

  const liveObserved = !!report;
  const counters = report?.counters;
  const observedPressure = counters?.intentTotal ?? input.particleEvents16;
  const observedDrop = counters?.rejectedTotal ?? 0;
  const observedDeferred = counters
    ? counters.deferredTotal + counters.overflowDeferredTotal
    : 0;
  const observedPreservedStrongImpact = counters?.strongImpactTotal ?? 0;
  const observedRelief = counters
    ? counters.thinnedTotal +
      counters.rejectedTotal +
      counters.deferredTotal +
      counters.overflowDeferredTotal +
      counters.strongImpactTotal
    : input.particleEvents16 > 0
      ? 1
      : 0;
  const nextSafeStep = report
    ? `Partikel-Live-Report ist integriert (${report.decision}); Admission/Thin/Drop und starke Impacts als echte Pool-Signale für die nächste Shadow-Worklet-Planung nutzen.`
    : "Partikel-Pool zuerst als Admission-/Intent-Pool konsolidieren; Traffic-Proxies nur als grobe Fallback-Lesung verwenden.";

  return {
    laneId: "particles",
    label: "Partikel intent/admission voice pool",
    preparation: PARTICLE_INTENT_VOICE_POOL_PREPARATION,
    readiness:
      input.audioContextState !== "running"
        ? "blocked-before-audio"
        : "admission-fallback",
    activeBackend: "main-thread-pooled",
    fallbackBackend: "main-thread-legacy",
    preservesLegacyReferencePath: true,
    observedPressure,
    observedRelief,
    observedDrop,
    observedDeferred,
    observedPreservedStrongImpact,
    liveReportDecision: report?.decision ?? null,
    liveReportObserved: liveObserved,
    livePressureSource: liveObserved
      ? "live-report"
      : input.particleEvents16 > 0
        ? "traffic-proxy"
        : "none",
    blockers,
    nextSafeStep,
  };
}

export function buildHolisticVoicePoolFallbackReport(
  input: HolisticVoicePoolInput,
): HolisticVoicePoolFallbackReport {
  const lanes = [
    resolveRootFollowDecision(input),
    resolveWaveStarterDecision(input),
    resolveParticleDecision(input),
  ];
  const blockers = Array.from(new Set(lanes.flatMap((lane) => lane.blockers)));
  const rootReady = lanes[0]?.readiness === "worklet-relief-ready";
  const fallbackProtected = lanes.every(
    (lane) => lane.preservesLegacyReferencePath,
  );
  const pressureLaneReportsObserved = lanes
    .filter(
      (lane) => lane.laneId === "wave-starter" || lane.laneId === "particles",
    )
    .every(
      (lane) => lane.liveReportObserved || lane.livePressureSource === "none",
    );
  const readiness =
    input.audioContextState !== "running"
      ? "blocked"
      : rootReady && fallbackProtected
        ? "candidate-observed"
        : "fallback-protected";
  return {
    version: 1,
    reportKind: "xensonar-holistic-voice-pool-fallback",
    generatedAtIso: new Date().toISOString(),
    currentVoiceEngineMode: input.currentVoiceEngineMode,
    readiness,
    defaultCandidateReady:
      readiness === "candidate-observed" &&
      blockers.length === 0 &&
      pressureLaneReportsObserved,
    lanes,
    blockers,
    note: "Ganzheitlicher Voice-Pool-/Fallback-Vertrag: Root/Material darf zuerst Worklet-Kandidat sein; Wellenstarter und Partikel werden aus ihren echten Live-Reports gelesen und fallen nur ohne Runtime-Signale auf Traffic-Proxies zurück.",
  };
}

export function formatHolisticVoicePoolFallbackUiValue(
  report: HolisticVoicePoolFallbackReport,
): string {
  const root =
    report.lanes.find((lane) => lane.laneId === "root-follow-material")
      ?.readiness ?? "unknown";
  const wave =
    report.lanes.find((lane) => lane.laneId === "wave-starter")?.readiness ??
    "unknown";
  const waveLane = report.lanes.find((lane) => lane.laneId === "wave-starter");
  const particleLane = report.lanes.find((lane) => lane.laneId === "particles");
  const particles = particleLane?.readiness ?? "unknown";
  const waveSource = waveLane?.livePressureSource ?? "none";
  const particleSource = particleLane?.livePressureSource ?? "none";
  const waveDecision = waveLane?.liveReportDecision
    ? `/${waveLane.liveReportDecision}`
    : "";
  const particleDecision = particleLane?.liveReportDecision
    ? `/${particleLane.liveReportDecision}`
    : "";
  return `${report.readiness} · R ${root} · W ${wave}${waveDecision} [${waveSource}] · P ${particles}${particleDecision} [${particleSource}]`;
}

export function describeHolisticVoicePoolPreparations(): string {
  return HOLISTIC_XENSONAR_VOICE_POOL_PREPARATIONS.map(
    describeAudioWorkletVoicePoolPreparation,
  ).join(" | ");
}
