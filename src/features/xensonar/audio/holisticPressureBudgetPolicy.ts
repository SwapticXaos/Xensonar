import type {
  HolisticVoicePoolFallbackReport,
  HolisticVoicePoolLaneDecision,
} from "./holisticVoicePoolFallback";

export const HOLISTIC_PRESSURE_BUDGET_POLICY_GLOBAL =
  "__XENSONAR_HOLISTIC_PRESSURE_BUDGET_POLICY__";

export type HolisticPressureBudgetStrategyId =
  | "worklet-capacity-first-fluid-default"
  | "worklet-warmup-legacy-protected"
  | "legacy-pressure-thinning-last-resort"
  | "blocked-before-audio";

export type HolisticPressureBudgetStage =
  | "capacity-expansion"
  | "worklet-warmup"
  | "legacy-fallback"
  | "legacy-pressure-thinning"
  | "blocked-before-audio";

export type HolisticPressureBudgetLaneDirective = {
  laneId: HolisticVoicePoolLaneDecision["laneId"];
  directive:
    | "expand-capacity-via-worklet"
    | "protect-reference-path-and-warmup"
    | "bounded-microrelease-no-catchup"
    | "preserve-strong-impact-thin-only-under-legacy-pressure"
    | "wait-for-audio-runtime";
  eventReductionAllowed: boolean;
  eventReductionScope:
    | "none"
    | "legacy-pressure-only"
    | "stale-low-priority-only";
  preferredCapacityBackend: HolisticVoicePoolLaneDecision["activeBackend"];
  fallbackBackend: HolisticVoicePoolLaneDecision["fallbackBackend"];
  rationale: string;
};

export type HolisticPressureBudgetPolicy = {
  version: 1;
  reportKind: "xensonar-holistic-pressure-budget-policy";
  strategyId: HolisticPressureBudgetStrategyId;
  recommendedDefaultStrategyId: "worklet-capacity-first-fluid-default";
  stage: HolisticPressureBudgetStage;
  priorityOrder: readonly [
    "root-material-worklet-capacity",
    "wave-starter-bounded-microrelease",
    "particle-strong-impact-preservation",
    "legacy-thinning-last-resort",
  ];
  customFluid: true;
  foregroundsEventReduction: false;
  primaryGoal: "increase-maximum-event-density-via-worklet";
  legacyFallbackBeforeThinning: true;
  eventThinningLastResortOnly: true;
  defaultCandidateReady: boolean;
  laneDirectives: HolisticPressureBudgetLaneDirective[];
  blockers: string[];
  note: string;
};

function lane(report: HolisticVoicePoolFallbackReport, laneId: HolisticVoicePoolLaneDecision["laneId"]): HolisticVoicePoolLaneDecision | null {
  return report.lanes.find((entry) => entry.laneId === laneId) ?? null;
}

function hasPressure(lane: HolisticVoicePoolLaneDecision | null): boolean {
  if (!lane) return false;
  return (
    lane.observedPressure > 0 ||
    lane.observedDeferred > 0 ||
    lane.observedDrop > 0 ||
    lane.observedPreservedStrongImpact > 0
  );
}

function resolvePolicyStage(report: HolisticVoicePoolFallbackReport): HolisticPressureBudgetStage {
  const root = lane(report, "root-follow-material");
  const wave = lane(report, "wave-starter");
  const particles = lane(report, "particles");
  if (report.readiness === "blocked" || root?.readiness === "blocked-before-audio") {
    return "blocked-before-audio";
  }
  if (root?.readiness === "worklet-relief-ready") return "capacity-expansion";
  if (root?.readiness === "worklet-proof-pending") return "worklet-warmup";
  if ((wave?.observedDrop ?? 0) > 0 || (particles?.observedDrop ?? 0) > 0) {
    return "legacy-pressure-thinning";
  }
  return "legacy-fallback";
}

function resolveStrategyId(stage: HolisticPressureBudgetStage): HolisticPressureBudgetStrategyId {
  switch (stage) {
    case "capacity-expansion":
      return "worklet-capacity-first-fluid-default";
    case "worklet-warmup":
      return "worklet-warmup-legacy-protected";
    case "legacy-pressure-thinning":
      return "legacy-pressure-thinning-last-resort";
    case "blocked-before-audio":
      return "blocked-before-audio";
    case "legacy-fallback":
    default:
      return "worklet-warmup-legacy-protected";
  }
}

function buildRootDirective(
  root: HolisticVoicePoolLaneDecision | null,
  stage: HolisticPressureBudgetStage,
): HolisticPressureBudgetLaneDirective {
  const workletReady = root?.readiness === "worklet-relief-ready";
  const blocked = stage === "blocked-before-audio";
  return {
    laneId: "root-follow-material",
    directive: blocked
      ? "wait-for-audio-runtime"
      : workletReady
        ? "expand-capacity-via-worklet"
        : "protect-reference-path-and-warmup",
    eventReductionAllowed: false,
    eventReductionScope: "none",
    preferredCapacityBackend: workletReady
      ? "audio-worklet-candidate"
      : "main-thread-legacy",
    fallbackBackend: "main-thread-legacy",
    rationale: workletReady
      ? "Root/Material darf Eventdichte zuerst über Stable-Lane-Worklet-Kapazität erhöhen; Legacy bleibt Referenz, aber wird nicht als frühe Ausdünnungsstrategie missbraucht."
      : "Root/Material bleibt Legacy-geschützt, bis Worklet-Frame-Proof und Relief stabil genug sind; Eventreduktion ist hier kein Default-Werkzeug.",
  };
}

function buildWaveDirective(
  wave: HolisticVoicePoolLaneDecision | null,
  stage: HolisticPressureBudgetStage,
): HolisticPressureBudgetLaneDirective {
  const pressureObserved = hasPressure(wave);
  const legacyPressure = stage === "legacy-pressure-thinning";
  return {
    laneId: "wave-starter",
    directive:
      stage === "blocked-before-audio"
        ? "wait-for-audio-runtime"
        : "bounded-microrelease-no-catchup",
    eventReductionAllowed: legacyPressure || Boolean(wave?.observedDrop),
    eventReductionScope:
      legacyPressure || Boolean(wave?.observedDrop)
        ? "stale-low-priority-only"
        : "none",
    preferredCapacityBackend: "main-thread-pooled",
    fallbackBackend: "main-thread-legacy",
    rationale: pressureObserved
      ? "Wellenstarter-Druck wird zuerst als bounded latest-intent/microrelease behandelt: kurze Nachlieferung, kein Catch-up-Batch; Drop nur wenn stale oder legacy-pressure-last-resort."
      : "Wellenstarter bleibt fluide: keine vorsorgliche Eventverringerung, sondern erst Runtime-Druck beobachten und dann mikro-orchestrieren.",
  };
}

function buildParticleDirective(
  particles: HolisticVoicePoolLaneDecision | null,
  stage: HolisticPressureBudgetStage,
): HolisticPressureBudgetLaneDirective {
  const legacyPressure = stage === "legacy-pressure-thinning";
  return {
    laneId: "particles",
    directive:
      stage === "blocked-before-audio"
        ? "wait-for-audio-runtime"
        : "preserve-strong-impact-thin-only-under-legacy-pressure",
    eventReductionAllowed: legacyPressure || Boolean(particles?.observedDrop),
    eventReductionScope:
      legacyPressure || Boolean(particles?.observedDrop)
        ? "legacy-pressure-only"
        : "none",
    preferredCapacityBackend: "main-thread-pooled",
    fallbackBackend: "main-thread-legacy",
    rationale:
      "Partikel sind disponibler als Root/Material, aber nicht primär zu reduzieren: starke Impacts bleiben bevorzugt erhalten; Thin/Drop ist nur Legacy-Druck-Fallback, nicht Leitstrategie.",
  };
}

export function buildHolisticPressureBudgetPolicy(
  report: HolisticVoicePoolFallbackReport,
): HolisticPressureBudgetPolicy {
  const stage = resolvePolicyStage(report);
  const strategyId = resolveStrategyId(stage);
  const root = lane(report, "root-follow-material");
  const wave = lane(report, "wave-starter");
  const particles = lane(report, "particles");
  const blockers = Array.from(
    new Set([
      ...report.blockers,
      ...(stage === "legacy-pressure-thinning"
        ? ["legacy-pressure-thinning-last-resort-active"]
        : []),
      ...(root?.readiness === "worklet-proof-pending"
        ? ["root-material-worklet-proof-pending"]
        : []),
    ]),
  );
  return {
    version: 1,
    reportKind: "xensonar-holistic-pressure-budget-policy",
    strategyId,
    recommendedDefaultStrategyId: "worklet-capacity-first-fluid-default",
    stage,
    priorityOrder: [
      "root-material-worklet-capacity",
      "wave-starter-bounded-microrelease",
      "particle-strong-impact-preservation",
      "legacy-thinning-last-resort",
    ],
    customFluid: true,
    foregroundsEventReduction: false,
    primaryGoal: "increase-maximum-event-density-via-worklet",
    legacyFallbackBeforeThinning: true,
    eventThinningLastResortOnly: true,
    defaultCandidateReady:
      report.defaultCandidateReady && stage === "capacity-expansion" && blockers.length === 0,
    laneDirectives: [
      buildRootDirective(root, stage),
      buildWaveDirective(wave, stage),
      buildParticleDirective(particles, stage),
    ],
    blockers,
    note:
      "Sinnvollster fluider Default: Worklet-Kapazität zuerst erhöhen; Legacy als Fail-open-Referenz; Event-Ausdünnung erst als Legacy-Druck-/Stale-Fallback und nicht als Leitstrategie.",
  };
}

export function formatHolisticPressureBudgetPolicyUiValue(
  policy: HolisticPressureBudgetPolicy,
): string {
  const reduction = policy.eventThinningLastResortOnly
    ? "Dünnen nur last-resort"
    : "Dünnen erlaubt";
  return `${policy.strategyId} · ${policy.stage} · Ziel: Worklet-Eventdichte ↑ · ${reduction}`;
}

export function publishHolisticPressureBudgetPolicy(report: HolisticPressureBudgetPolicy): void {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, unknown>)[
    HOLISTIC_PRESSURE_BUDGET_POLICY_GLOBAL
  ] = report;
}
