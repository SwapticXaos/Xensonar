import {
  buildEveryNthSegmentPattern,
  clampSegmentPatternLength,
  isSegmentPatternStepActive,
  normalizeSegmentPatternSteps,
} from "../rhythmSegmentPattern";

export type RootFollowImpulseRasterClockMode =
  | "fragment-compress"
  | "mute-pattern";

export type RootFollowImpulseRasterPolicy = {
  /**
   * Legacy migration field: formerly "Jeden n". The public UI no longer exposes
   * the old every-n phrasing; it now describes the same storage slot as the
   * Root-Follow takt ratio until a safe storage migration is worthwhile.
   */
  every: number;
  /**
   * Beat-truth subdivision: the interpreted beat/material cycle is divided into
   * this many slots. UI label: "Basis-Takt (Beat) durch".
   */
  cycleDiv: number;
  /**
   * Root-Follow takt ratio against the beat subdivision. If it differs from
   * cycleDiv, the Root-Follow phrase drifts against the beat bar grid. UI label:
   * "definiert Root-Follow-Takt im Verhältnis".
   */
  counterDiv: number;
  clockMode: RootFollowImpulseRasterClockMode;
  /** Segment pattern inside the Root-Follow takt ratio, not a fixed mute pattern inside the beat grid. */
  pattern: readonly number[];
};

export type RootFollowImpulseRasterSlotDecision = {
  bypass: boolean;
  globalSlot: number;
  /** Segment duration derived from the Beat truth: base material cycle / Basis-Takt-divisor. */
  slotDurationSec: number;
  slotStartSec: number;
  slotEndSec: number;
  /** Full Root-Follow takt window derived from slotDurationSec * Root-Follow-Verhältnis. */
  rootFollowWindowDurationSec: number;
  rootFollowWindowStartSec: number;
  rootFollowWindowEndSec: number;
  audible: boolean;
  patternIndex: number;
  counterIndex: number;
  cycleSlotIndex: number;
};

export type RootFollowImpulseRasterRenderWindow =
  RootFollowImpulseRasterSlotDecision & {
    policy: RootFollowImpulseRasterPolicy;
    cycleDurationSec: number;
    clockMode: RootFollowImpulseRasterClockMode;
  };

export const ROOT_FOLLOW_IMPULSE_RASTER_DEFAULT: RootFollowImpulseRasterPolicy =
  {
    every: 1,
    cycleDiv: 1,
    counterDiv: 1,
    clockMode: "fragment-compress",
    pattern: [1],
  };

const ROOT_FOLLOW_IMPULSE_RASTER_CLOCK_EPSILON_SEC = 1e-6;

export function normalizeRootFollowImpulseRasterValue(
  value: unknown,
  fallback = 1,
) {
  return clampSegmentPatternLength(value, fallback);
}

export function normalizeRootFollowImpulseRasterClockMode(
  value: unknown,
): RootFollowImpulseRasterClockMode {
  return value === "mute-pattern"
    ? "mute-pattern"
    : ROOT_FOLLOW_IMPULSE_RASTER_DEFAULT.clockMode;
}

export function formatRootFollowImpulseRasterClockModeLabel(
  mode: RootFollowImpulseRasterClockMode,
) {
  return mode === "mute-pattern"
    ? "nur Mute-Pattern"
    : "verschachtelt stauchend";
}

export function formatRootFollowImpulseRasterBeatRatioSummary(
  policyLike: Partial<RootFollowImpulseRasterPolicy> | null | undefined,
) {
  const policy = normalizeRootFollowImpulseRasterPolicy(policyLike);
  if (isRootFollowImpulseRasterBypass(policy))
    return "1 = 1: Loop-Taktzahl, Beat und Root-Follow-Takt laufen kongruent";
  const active = policy.pattern.reduce(
    (count, step) => count + (step === 0 ? 0 : 1),
    0,
  );
  const drift =
    policy.cycleDiv === policy.counterDiv ? "kongruent" : "phasenwandernd";
  return `Beat durch ${policy.cycleDiv} · Root-Follow-Verhältnis ${policy.counterDiv} · ${active}/${policy.counterDiv} Segmente aktiv · ${drift}`;
}

export function resolveRootFollowImpulseRasterCounterDiv(
  value: Partial<RootFollowImpulseRasterPolicy> | null | undefined,
  cycleDiv: number,
): number {
  if (
    typeof value?.counterDiv === "number" &&
    Number.isFinite(value.counterDiv)
  ) {
    return normalizeRootFollowImpulseRasterValue(value.counterDiv, cycleDiv);
  }
  if (Array.isArray(value?.pattern) && value.pattern.length > 0) {
    return normalizeRootFollowImpulseRasterValue(
      value.pattern.length,
      cycleDiv,
    );
  }
  if (
    typeof value?.every === "number" &&
    Number.isFinite(value.every) &&
    value.every > 1
  ) {
    return normalizeRootFollowImpulseRasterValue(value.every, 1);
  }
  return ROOT_FOLLOW_IMPULSE_RASTER_DEFAULT.counterDiv;
}

export type RootFollowImpulseRasterPatternNormalizeArgs = {
  /** Desired output pattern length: number of Root-Follow slots in one takt ratio window. */
  counterDiv: unknown;
  /** Fallback every-N stride used only when no stored segment pattern exists yet. */
  everyFallback?: unknown;
};

/**
 * Normalizes a segment pattern to the given `counterDiv` length.
 *
 * `counterDiv` and `everyFallback` are intentionally named separately:
 * `counterDiv` defines the output pattern length, while `everyFallback` is
 * only the stride for the generated default pattern. In the current unified
 * storage model both values often match, but callers should keep the semantic
 * distinction explicit so future divergence cannot silently collapse back into
 * the old positional double-argument form.
 */
export function normalizeRootFollowImpulseRasterPattern(
  pattern: readonly number[] | null | undefined,
  args: RootFollowImpulseRasterPatternNormalizeArgs,
): number[];
/** @deprecated Use the named form: `{ counterDiv, everyFallback }`. */
export function normalizeRootFollowImpulseRasterPattern(
  pattern: readonly number[] | null | undefined,
  counterDiv: unknown,
  everyFallback?: unknown,
): number[];
export function normalizeRootFollowImpulseRasterPattern(
  pattern: readonly number[] | null | undefined,
  counterDivOrArgs: unknown,
  legacyEveryFallback: unknown = 1,
): number[] {
  const isNamedArgs =
    counterDivOrArgs !== null &&
    typeof counterDivOrArgs === "object" &&
    "counterDiv" in counterDivOrArgs;
  const counterDiv = isNamedArgs
    ? (counterDivOrArgs as RootFollowImpulseRasterPatternNormalizeArgs)
        .counterDiv
    : counterDivOrArgs;
  const everyFallback = isNamedArgs
    ? ((counterDivOrArgs as RootFollowImpulseRasterPatternNormalizeArgs)
        .everyFallback ?? ROOT_FOLLOW_IMPULSE_RASTER_DEFAULT.every)
    : legacyEveryFallback;
  const safeCounterDiv = normalizeRootFollowImpulseRasterValue(
    counterDiv,
    ROOT_FOLLOW_IMPULSE_RASTER_DEFAULT.counterDiv,
  );
  if (Array.isArray(pattern))
    return normalizeSegmentPatternSteps(pattern, safeCounterDiv);
  return buildEveryNthSegmentPattern(everyFallback, safeCounterDiv);
}

export function normalizeRootFollowImpulseRasterPolicy(
  value: Partial<RootFollowImpulseRasterPolicy> | null | undefined,
): RootFollowImpulseRasterPolicy {
  const cycleDiv = normalizeRootFollowImpulseRasterValue(
    value?.cycleDiv,
    ROOT_FOLLOW_IMPULSE_RASTER_DEFAULT.cycleDiv,
  );
  const counterDiv = resolveRootFollowImpulseRasterCounterDiv(value, cycleDiv);
  const every = normalizeRootFollowImpulseRasterValue(
    value?.every ?? counterDiv,
    ROOT_FOLLOW_IMPULSE_RASTER_DEFAULT.every,
  );
  return {
    every,
    cycleDiv,
    counterDiv,
    clockMode: normalizeRootFollowImpulseRasterClockMode(value?.clockMode),
    pattern: normalizeRootFollowImpulseRasterPattern(value?.pattern, {
      counterDiv,
      everyFallback: every,
    }),
  };
}

export function isRootFollowImpulseRasterBypass(
  policy: Pick<RootFollowImpulseRasterPolicy, "cycleDiv"> &
    Partial<
      Pick<RootFollowImpulseRasterPolicy, "counterDiv" | "every" | "pattern">
    >,
) {
  const normalized = normalizeRootFollowImpulseRasterPolicy(policy);
  return (
    normalized.cycleDiv <= 1 &&
    normalized.counterDiv <= 1 &&
    normalized.pattern.length === 1 &&
    normalized.pattern[0] !== 0
  );
}

export function isRootFollowImpulseRasterAllMuted(
  policy: Partial<RootFollowImpulseRasterPolicy> | null | undefined,
) {
  const normalized = normalizeRootFollowImpulseRasterPolicy(policy);
  if (isRootFollowImpulseRasterBypass(normalized)) return false;
  return (
    normalized.pattern.length > 0 &&
    normalized.pattern.every((step) => step === 0)
  );
}

export function resolveRootFollowImpulseRasterSlotDurationSec(args: {
  cycleDurationSec: number;
  policy: RootFollowImpulseRasterPolicy;
}) {
  const safeCycle = Math.max(0.001, Number(args.cycleDurationSec) || 0.001);
  const safeDiv = normalizeRootFollowImpulseRasterValue(
    args.policy.cycleDiv,
    1,
  );
  return Math.max(0.001, safeCycle / safeDiv);
}

export function isRootFollowImpulseRasterSlotAudible(args: {
  globalSlot: number;
  policy: RootFollowImpulseRasterPolicy;
}) {
  const policy = normalizeRootFollowImpulseRasterPolicy(args.policy);
  return isSegmentPatternStepActive(
    policy.pattern,
    policy.counterDiv,
    args.globalSlot,
  );
}

export function resolveRootFollowImpulseRasterSlotDecision(args: {
  candidateStartSec: number;
  transportAnchorSec: number;
  cycleDurationSec: number;
  policy: RootFollowImpulseRasterPolicy;
}): RootFollowImpulseRasterSlotDecision {
  const policy = normalizeRootFollowImpulseRasterPolicy(args.policy);
  const bypass = isRootFollowImpulseRasterBypass(policy);
  const slotDurationSec = resolveRootFollowImpulseRasterSlotDurationSec({
    cycleDurationSec: args.cycleDurationSec,
    policy,
  });
  const transportAnchorSec = Number.isFinite(args.transportAnchorSec)
    ? args.transportAnchorSec
    : 0;
  const candidateStartSec = Number.isFinite(args.candidateStartSec)
    ? args.candidateStartSec
    : transportAnchorSec;
  const elapsedSlotCount = Math.max(
    0,
    Math.floor(
      (candidateStartSec -
        transportAnchorSec +
        ROOT_FOLLOW_IMPULSE_RASTER_CLOCK_EPSILON_SEC) /
        slotDurationSec,
    ),
  );
  const globalSlot = elapsedSlotCount + 1;
  const slotStartSec = transportAnchorSec + elapsedSlotCount * slotDurationSec;
  const slotEndSec = slotStartSec + slotDurationSec;
  const cycleSlotIndex = (globalSlot - 1) % Math.max(1, policy.cycleDiv);
  const safeCounterDiv = Math.max(1, policy.counterDiv);
  const counterIndex = (globalSlot - 1) % safeCounterDiv;
  const patternIndex = counterIndex;
  const rootFollowWindowDurationSec = Math.max(
    0.001,
    slotDurationSec * safeCounterDiv,
  );
  const rootFollowWindowStartSec =
    transportAnchorSec +
    Math.floor(elapsedSlotCount / safeCounterDiv) * rootFollowWindowDurationSec;
  const rootFollowWindowEndSec =
    rootFollowWindowStartSec + rootFollowWindowDurationSec;
  return {
    bypass,
    globalSlot,
    patternIndex,
    counterIndex,
    cycleSlotIndex,
    slotDurationSec,
    slotStartSec,
    slotEndSec,
    rootFollowWindowDurationSec,
    rootFollowWindowStartSec,
    rootFollowWindowEndSec,
    audible:
      bypass || isRootFollowImpulseRasterSlotAudible({ globalSlot, policy }),
  };
}

export function previewRootFollowImpulseRasterPattern(args: {
  every?: number;
  cycleDiv: number;
  counterDiv?: number;
  pattern?: readonly number[] | null;
  cycles?: number;
}) {
  const policy = normalizeRootFollowImpulseRasterPolicy({
    every: args.every ?? args.counterDiv ?? 1,
    cycleDiv: args.cycleDiv,
    counterDiv: args.counterDiv ?? args.every,
    pattern: args.pattern ?? undefined,
  });
  const cycles = Math.max(1, Math.min(16, Math.round(args.cycles ?? 3)));
  const slots = policy.cycleDiv * cycles;
  return Array.from({ length: slots }, (_, index) =>
    isRootFollowImpulseRasterSlotAudible({ globalSlot: index + 1, policy })
      ? "X"
      : ".",
  );
}

export function previewRootFollowImpulseRasterCycleGroups(args: {
  every?: number;
  cycleDiv: number;
  counterDiv?: number;
  pattern?: readonly number[] | null;
  cycles?: number;
}): string[] {
  const policy = normalizeRootFollowImpulseRasterPolicy({
    every: args.every ?? args.counterDiv ?? 1,
    cycleDiv: args.cycleDiv,
    counterDiv: args.counterDiv ?? args.every,
    pattern: args.pattern ?? undefined,
  });
  const cycles = Math.max(1, Math.min(16, Math.round(args.cycles ?? 3)));
  return Array.from({ length: cycles }, (_, cycleIndex) => {
    const start = cycleIndex * policy.cycleDiv;
    return Array.from({ length: policy.cycleDiv }, (_, slotOffset) =>
      isRootFollowImpulseRasterSlotAudible({
        globalSlot: start + slotOffset + 1,
        policy,
      })
        ? "X"
        : ".",
    ).join("");
  });
}

export function buildRootFollowImpulseRasterRenderWindow(args: {
  decision: RootFollowImpulseRasterSlotDecision;
  policy: RootFollowImpulseRasterPolicy;
  cycleDurationSec: number;
}): RootFollowImpulseRasterRenderWindow | null {
  const policy = normalizeRootFollowImpulseRasterPolicy(args.policy);
  if (args.decision.bypass || !args.decision.audible) return null;
  return {
    ...args.decision,
    policy,
    clockMode: policy.clockMode,
    cycleDurationSec: Math.max(
      0.001,
      Number(args.cycleDurationSec) || args.decision.slotDurationSec,
    ),
  };
}
