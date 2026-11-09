import type {
  HolisticPressureBudgetLaneDirective,
  HolisticPressureBudgetPolicy,
  HolisticPressureBudgetStage,
} from "./holisticPressureBudgetPolicy";
import type {
  HolisticVoicePoolFallbackReport,
  HolisticVoicePoolLaneDecision,
  HolisticVoicePoolLaneId,
} from "./holisticVoicePoolFallback";

export const HOLISTIC_CAPACITY_FIRST_ADMISSION_GUARD_GLOBAL =
  "__XENSONAR_HOLISTIC_CAPACITY_FIRST_ADMISSION_GUARD__";

export type HolisticCapacityFirstAdmissionGuardStatus =
  | "capacity-expansion-authorized"
  | "worklet-warmup-guarded"
  | "fallback-protected"
  | "last-resort-thinning-authorized"
  | "blocked-before-audio";

export type HolisticCapacityFirstAdmissionMode =
  | "worklet-capacity-expansion"
  | "legacy-reference-warmup"
  | "bounded-microrelease-density-preserving"
  | "bounded-microrelease-stale-only-last-resort"
  | "impact-preserving-density"
  | "impact-preserving-weak-intent-last-resort"
  | "audio-runtime-blocked";

export type HolisticCapacityFirstReductionGate =
  | "closed-capacity-first"
  | "closed-worklet-warmup"
  | "last-resort-open-stale-low-priority-only"
  | "last-resort-open-legacy-pressure-only"
  | "blocked-before-audio";

export type HolisticCapacityFirstLaneGuard = {
  laneId: HolisticVoicePoolLaneId;
  admissionMode: HolisticCapacityFirstAdmissionMode;
  reductionGate: HolisticCapacityFirstReductionGate;
  capacityFirst: boolean;
  protectsMusicalDensity: boolean;
  eventReductionAllowedNow: boolean;
  eventReductionScope: HolisticPressureBudgetLaneDirective["eventReductionScope"];
  preferredCapacityBackend: HolisticVoicePoolLaneDecision["activeBackend"];
  fallbackBackend: HolisticVoicePoolLaneDecision["fallbackBackend"];
  observedPressure: number;
  observedDrop: number;
  observedDeferred: number;
  observedPreservedStrongImpact: number;
  rationale: string;
};

export type HolisticCapacityFirstAdmissionGuard = {
  version: 1;
  reportKind: "xensonar-holistic-capacity-first-admission-guard";
  guardId: "capacity-first-density-preservation-thinning-last-resort";
  status: HolisticCapacityFirstAdmissionGuardStatus;
  policyStage: HolisticPressureBudgetStage;
  recommendedDefaultStrategyId: "worklet-capacity-first-fluid-default";
  primaryGoal: "increase-maximum-musical-event-density-via-worklet-lanes";
  foregroundsEventReduction: false;
  allowsProactiveEventReduction: false;
  thinningAllowedOnlyAfterLegacyPressure: true;
  legacyFallbackBeforeThinning: true;
  rootMaterialReductionAllowed: false;
  densityPreservationBias: "preserve-events-unless-stale-weak-or-legacy-pressure";
  laneGuards: HolisticCapacityFirstLaneGuard[];
  lastResortReductionLaneCount: number;
  guardSatisfied: boolean;
  violations: string[];
  blockers: string[];
  note: string;
};

function lane(
  report: HolisticVoicePoolFallbackReport,
  laneId: HolisticVoicePoolLaneId,
): HolisticVoicePoolLaneDecision | null {
  return report.lanes.find((entry) => entry.laneId === laneId) ?? null;
}

function directive(
  policy: HolisticPressureBudgetPolicy,
  laneId: HolisticVoicePoolLaneId,
): HolisticPressureBudgetLaneDirective | null {
  return policy.laneDirectives.find((entry) => entry.laneId === laneId) ?? null;
}

function resolveStatus(
  policy: HolisticPressureBudgetPolicy,
): HolisticCapacityFirstAdmissionGuardStatus {
  switch (policy.stage) {
    case "capacity-expansion":
      return "capacity-expansion-authorized";
    case "worklet-warmup":
      return "worklet-warmup-guarded";
    case "legacy-pressure-thinning":
      return "last-resort-thinning-authorized";
    case "blocked-before-audio":
      return "blocked-before-audio";
    case "legacy-fallback":
    default:
      return "fallback-protected";
  }
}

function buildRootGuard(
  report: HolisticVoicePoolFallbackReport,
  policy: HolisticPressureBudgetPolicy,
): HolisticCapacityFirstLaneGuard {
  const root = lane(report, "root-follow-material");
  const rootDirective = directive(policy, "root-follow-material");
  const blocked = policy.stage === "blocked-before-audio";
  const capacityExpansion = policy.stage === "capacity-expansion";
  return {
    laneId: "root-follow-material",
    admissionMode: blocked
      ? "audio-runtime-blocked"
      : capacityExpansion
        ? "worklet-capacity-expansion"
        : "legacy-reference-warmup",
    reductionGate: blocked ? "blocked-before-audio" : "closed-capacity-first",
    capacityFirst: true,
    protectsMusicalDensity: true,
    eventReductionAllowedNow: false,
    eventReductionScope: "none",
    preferredCapacityBackend:
      rootDirective?.preferredCapacityBackend ??
      root?.activeBackend ??
      "main-thread-legacy",
    fallbackBackend:
      rootDirective?.fallbackBackend ??
      root?.fallbackBackend ??
      "main-thread-legacy",
    observedPressure: root?.observedPressure ?? 0,
    observedDrop: 0,
    observedDeferred: root?.observedDeferred ?? 0,
    observedPreservedStrongImpact: root?.observedPreservedStrongImpact ?? 0,
    rationale: capacityExpansion
      ? "Root/Material darf Dichte zuerst über Stable-Lane-Worklet-Kapazität ausbauen; Reduktion ist für diese tragende Lane geschlossen."
      : "Root/Material bleibt als Legacy-Referenz geschützt, bis Worklet-Proof/Relief trägt; keine vorsorgliche Ausdünnung.",
  };
}

function buildWaveGuard(
  report: HolisticVoicePoolFallbackReport,
  policy: HolisticPressureBudgetPolicy,
): HolisticCapacityFirstLaneGuard {
  const wave = lane(report, "wave-starter");
  const waveDirective = directive(policy, "wave-starter");
  const blocked = policy.stage === "blocked-before-audio";
  const lastResort =
    policy.stage === "legacy-pressure-thinning" &&
    waveDirective?.eventReductionAllowed === true &&
    waveDirective.eventReductionScope === "stale-low-priority-only";
  return {
    laneId: "wave-starter",
    admissionMode: blocked
      ? "audio-runtime-blocked"
      : lastResort
        ? "bounded-microrelease-stale-only-last-resort"
        : "bounded-microrelease-density-preserving",
    reductionGate: blocked
      ? "blocked-before-audio"
      : lastResort
        ? "last-resort-open-stale-low-priority-only"
        : policy.stage === "worklet-warmup"
          ? "closed-worklet-warmup"
          : "closed-capacity-first",
    capacityFirst: !lastResort,
    protectsMusicalDensity: true,
    eventReductionAllowedNow: lastResort,
    eventReductionScope: lastResort ? "stale-low-priority-only" : "none",
    preferredCapacityBackend:
      waveDirective?.preferredCapacityBackend ??
      wave?.activeBackend ??
      "main-thread-pooled",
    fallbackBackend:
      waveDirective?.fallbackBackend ??
      wave?.fallbackBackend ??
      "main-thread-legacy",
    observedPressure: wave?.observedPressure ?? 0,
    observedDrop: wave?.observedDrop ?? 0,
    observedDeferred: wave?.observedDeferred ?? 0,
    observedPreservedStrongImpact: wave?.observedPreservedStrongImpact ?? 0,
    rationale: lastResort
      ? "Wellenstarter darf nur stale/late/low-priority Intents opfern; microrelease und latest-intent bleiben vor Drop priorisiert."
      : "Wellenstarter erhält Dichte über bounded microrelease/latest-intent und wird nicht vorsorglich reduziert.",
  };
}

function buildParticleGuard(
  report: HolisticVoicePoolFallbackReport,
  policy: HolisticPressureBudgetPolicy,
): HolisticCapacityFirstLaneGuard {
  const particles = lane(report, "particles");
  const particleDirective = directive(policy, "particles");
  const blocked = policy.stage === "blocked-before-audio";
  const lastResort =
    policy.stage === "legacy-pressure-thinning" &&
    particleDirective?.eventReductionAllowed === true &&
    particleDirective.eventReductionScope === "legacy-pressure-only";
  return {
    laneId: "particles",
    admissionMode: blocked
      ? "audio-runtime-blocked"
      : lastResort
        ? "impact-preserving-weak-intent-last-resort"
        : "impact-preserving-density",
    reductionGate: blocked
      ? "blocked-before-audio"
      : lastResort
        ? "last-resort-open-legacy-pressure-only"
        : policy.stage === "worklet-warmup"
          ? "closed-worklet-warmup"
          : "closed-capacity-first",
    capacityFirst: !lastResort,
    protectsMusicalDensity: true,
    eventReductionAllowedNow: lastResort,
    eventReductionScope: lastResort ? "legacy-pressure-only" : "none",
    preferredCapacityBackend:
      particleDirective?.preferredCapacityBackend ??
      particles?.activeBackend ??
      "main-thread-pooled",
    fallbackBackend:
      particleDirective?.fallbackBackend ??
      particles?.fallbackBackend ??
      "main-thread-legacy",
    observedPressure: particles?.observedPressure ?? 0,
    observedDrop: particles?.observedDrop ?? 0,
    observedDeferred: particles?.observedDeferred ?? 0,
    observedPreservedStrongImpact:
      particles?.observedPreservedStrongImpact ?? 0,
    rationale: lastResort
      ? "Partikel-Admission darf unter Legacy-Druck weak/stale Intents ausdünnen, aber starke Impacts bleiben bevorzugt geschützt."
      : "Partikel bleiben dichteerhaltend: Admission/Impact-Erhalt vor Reduktion; Thin/Drop ist kein Vordergrundmodus.",
  };
}

function collectViolations(
  policy: HolisticPressureBudgetPolicy,
  laneGuards: HolisticCapacityFirstLaneGuard[],
): string[] {
  const violations: string[] = [];
  if (policy.foregroundsEventReduction) {
    violations.push("event-reduction-foregrounded");
  }
  if (policy.primaryGoal !== "increase-maximum-event-density-via-worklet") {
    violations.push("primary-goal-not-worklet-event-density");
  }
  if (!policy.legacyFallbackBeforeThinning) {
    violations.push("legacy-fallback-not-before-thinning");
  }
  if (!policy.eventThinningLastResortOnly) {
    violations.push("thinning-not-last-resort");
  }
  const rootGuard = laneGuards.find((entry) => entry.laneId === "root-follow-material");
  if (rootGuard?.eventReductionAllowedNow) {
    violations.push("root-material-reduction-open");
  }
  const illegalEarlyReduction = laneGuards.filter(
    (entry) =>
      entry.eventReductionAllowedNow &&
      policy.stage !== "legacy-pressure-thinning",
  );
  if (illegalEarlyReduction.length > 0) {
    violations.push("event-reduction-open-before-legacy-pressure");
  }
  return violations;
}

export function buildHolisticCapacityFirstAdmissionGuard(args: {
  policy: HolisticPressureBudgetPolicy;
  report: HolisticVoicePoolFallbackReport;
}): HolisticCapacityFirstAdmissionGuard {
  const laneGuards = [
    buildRootGuard(args.report, args.policy),
    buildWaveGuard(args.report, args.policy),
    buildParticleGuard(args.report, args.policy),
  ];
  const violations = collectViolations(args.policy, laneGuards);
  const lastResortReductionLaneCount = laneGuards.filter(
    (entry) => entry.eventReductionAllowedNow,
  ).length;
  const blockers = Array.from(
    new Set([
      ...args.policy.blockers,
      ...violations,
      ...(lastResortReductionLaneCount > 0
        ? ["last-resort-reduction-gate-open"]
        : []),
    ]),
  );
  return {
    version: 1,
    reportKind: "xensonar-holistic-capacity-first-admission-guard",
    guardId: "capacity-first-density-preservation-thinning-last-resort",
    status: resolveStatus(args.policy),
    policyStage: args.policy.stage,
    recommendedDefaultStrategyId: "worklet-capacity-first-fluid-default",
    primaryGoal: "increase-maximum-musical-event-density-via-worklet-lanes",
    foregroundsEventReduction: false,
    allowsProactiveEventReduction: false,
    thinningAllowedOnlyAfterLegacyPressure: true,
    legacyFallbackBeforeThinning: true,
    rootMaterialReductionAllowed: false,
    densityPreservationBias:
      "preserve-events-unless-stale-weak-or-legacy-pressure",
    laneGuards,
    lastResortReductionLaneCount,
    guardSatisfied: violations.length === 0,
    violations,
    blockers,
    note:
      "Capacity-first guard: Worklet-/Engine-Kapazität bleibt Vordergrundziel; Legacy ist Fail-open; Ausdünnung ist nur ein last-resort Gate für stale/weak/legacy-pressure Ereignisse.",
  };
}

export function formatHolisticCapacityFirstAdmissionGuardUiValue(
  guard: HolisticCapacityFirstAdmissionGuard,
): string {
  const root = guard.laneGuards.find((entry) => entry.laneId === "root-follow-material");
  const wave = guard.laneGuards.find((entry) => entry.laneId === "wave-starter");
  const particles = guard.laneGuards.find((entry) => entry.laneId === "particles");
  const gate = guard.lastResortReductionLaneCount > 0
    ? `last-resort offen ${guard.lastResortReductionLaneCount}`
    : "Reduktion geschlossen";
  return `${guard.status} · Root ${root?.admissionMode ?? "unknown"} · W ${wave?.admissionMode ?? "unknown"} · P ${particles?.admissionMode ?? "unknown"} · ${gate}`;
}

export function publishHolisticCapacityFirstAdmissionGuard(
  guard: HolisticCapacityFirstAdmissionGuard,
): void {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, unknown>)[
    HOLISTIC_CAPACITY_FIRST_ADMISSION_GUARD_GLOBAL
  ] = guard;
}
