import type { CrisisCatchUpStrategy } from "../performanceCrisis/performanceCrisisTypes";
import type { RootFollowRuntimePolicy } from "../performanceCrisis/performanceCrisisRuntimePolicies";
import {
  normalizeRootFollowGranularSettings,
  type RootFollowGranularSettings,
} from "./rootFollowGranularSettings";
import { firstRootFollowSliceOnGridAtOrAfter } from "./rootFollowMicroCutSafety";

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

const smoothstep = (edge0: number, edge1: number, value: number) => {
  if (edge0 === edge1) return value >= edge1 ? 1 : 0;
  const x = clampNumber((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
};

export type RootFollowCrisisRenderEnvelope = {
  pressure: number;
  densityScale: number;
  densityReduction: number;
  lateGrainStrategy: CrisisCatchUpStrategy;
  staleWindowMs: number;
  preventCatchUpStorm: boolean;
  sourcePresetId: RootFollowRuntimePolicy["sourcePresetId"];
};

export type RootFollowLateWindowDecision = {
  nextSliceStart: number;
  action:
    | "on-time"
    | "short-catch-up"
    | "smear-late-window"
    | "jump-current"
    | "stale-drop-resync"
    | "freeze-resync";
  lateByMs: number;
  stale: boolean;
};

export function buildRootFollowCrisisRenderEnvelope(args: {
  policy: RootFollowRuntimePolicy | null | undefined;
  pressureBias: number;
}): RootFollowCrisisRenderEnvelope {
  const pressure = clampNumber(args.pressureBias, 0, 1);
  const policy = args.policy;
  const densityReduction = clampNumber(
    policy?.densityReductionUnderLoad ?? 0,
    0,
    0.85,
  );
  const densityPressure = smoothstep(0.54, 0.98, pressure);
  const densityScale = clampNumber(
    1 - densityReduction * densityPressure,
    0.34,
    1,
  );
  return {
    pressure,
    densityScale,
    densityReduction,
    lateGrainStrategy: policy?.lateGrainStrategy ?? "short-catch-up",
    staleWindowMs: clampNumber(policy?.staleWindowMs ?? 38, 8, 160),
    preventCatchUpStorm: policy?.preventCatchUpStorm ?? true,
    sourcePresetId: policy?.sourcePresetId ?? "balanced",
  };
}

export function applyRootFollowCrisisDensityToGranularSettings(args: {
  settings: RootFollowGranularSettings;
  envelope: RootFollowCrisisRenderEnvelope;
}): RootFollowGranularSettings {
  const { settings, envelope } = args;
  if (envelope.densityReduction <= 0.001 || envelope.densityScale >= 0.997)
    return settings;
  const densityScale = envelope.densityScale;
  return normalizeRootFollowGranularSettings(
    {
      ...settings,
      preset: "custom",
      powerMode: "custom",
      // Real density binding: fewer admitted grains/slices first, not a full render-mode switch.
      microDensity: Number((settings.microDensity * densityScale).toFixed(3)),
      maxGrainsPerWindow: Math.max(
        4,
        Math.round(settings.maxGrainsPerWindow * densityScale),
      ),
      stepMs: Math.round(settings.stepMs / Math.max(0.52, densityScale)),
    },
    settings.qualityMode === "fragment" ? "grainy" : "flowing",
  );
}

export function resolveRootFollowLateWindowStart(args: {
  nextSliceStart: number;
  currentTime: number;
  transportAnchor: number;
  stepSec: number;
  minimumLeadInSec: number;
  envelope: RootFollowCrisisRenderEnvelope;
}): RootFollowLateWindowDecision {
  const safeStart = args.currentTime + Math.max(0.004, args.minimumLeadInSec);
  const lateBySec = Math.max(0, safeStart - args.nextSliceStart);
  const lateByMs = Math.round(lateBySec * 10000) / 10;
  if (lateBySec <= 0.0005) {
    return {
      nextSliceStart: args.nextSliceStart,
      action: "on-time",
      lateByMs: 0,
      stale: false,
    };
  }

  const stale = lateByMs > args.envelope.staleWindowMs;
  if (stale || args.envelope.lateGrainStrategy === "drop") {
    return {
      nextSliceStart: firstRootFollowSliceOnGridAtOrAfter({
        transportAnchor: args.transportAnchor,
        stepSec: args.stepSec,
        earliestStart: safeStart,
      }),
      action: "stale-drop-resync",
      lateByMs,
      stale: true,
    };
  }

  if (args.envelope.lateGrainStrategy === "freeze") {
    return {
      nextSliceStart: firstRootFollowSliceOnGridAtOrAfter({
        transportAnchor: args.transportAnchor,
        stepSec: args.stepSec,
        earliestStart: safeStart,
      }),
      action: "freeze-resync",
      lateByMs,
      stale: false,
    };
  }

  if (args.envelope.lateGrainStrategy === "jump") {
    return {
      nextSliceStart: firstRootFollowSliceOnGridAtOrAfter({
        transportAnchor: args.transportAnchor,
        stepSec: args.stepSec,
        earliestStart: safeStart,
      }),
      action: "jump-current",
      lateByMs,
      stale: false,
    };
  }

  if (args.envelope.lateGrainStrategy === "smear") {
    return {
      nextSliceStart: Math.max(
        args.currentTime + 0.006,
        args.nextSliceStart + lateBySec * 0.5,
      ),
      action: "smear-late-window",
      lateByMs,
      stale: false,
    };
  }

  if (
    args.envelope.preventCatchUpStorm &&
    lateByMs > args.envelope.staleWindowMs * 0.5
  ) {
    return {
      nextSliceStart: firstRootFollowSliceOnGridAtOrAfter({
        transportAnchor: args.transportAnchor,
        stepSec: args.stepSec,
        earliestStart: safeStart,
      }),
      action: "stale-drop-resync",
      lateByMs,
      stale: true,
    };
  }

  return {
    nextSliceStart: Math.max(args.currentTime + 0.006, args.nextSliceStart),
    action: "short-catch-up",
    lateByMs,
    stale: false,
  };
}

export function limitRootFollowDirectEventsUnderCrisis<T>(args: {
  events: readonly T[];
  envelope: RootFollowCrisisRenderEnvelope;
  getEventTime: (event: T) => number;
  currentTime: number;
  getEventClass?: (event: T) => string;
}): T[] {
  const events = [...args.events];
  if (events.length <= 1) return events;
  const staleCutoff = args.currentTime - args.envelope.staleWindowMs / 1000;
  const freshEvents = events.filter((event) => {
    const eventTime = args.getEventTime(event);
    return !Number.isFinite(eventTime) || eventTime >= staleCutoff;
  });
  const source = freshEvents.length > 0 ? freshEvents : events.slice(-1);
  if (args.envelope.densityScale >= 0.997) return source;
  const maxEvents = Math.max(
    1,
    Math.ceil(source.length * args.envelope.densityScale),
  );
  if (!args.getEventClass) return source.slice(0, maxEvents);
  const groups = new Map<string, T[]>();
  for (const event of source) {
    const key = args.getEventClass(event);
    const group = groups.get(key) ?? [];
    group.push(event); groups.set(key, group);
  }
  const selected = new Set<T>();
  const budget = Math.max(maxEvents, groups.size);
  for (let index = 0; selected.size < budget; index++) {
    let found = false;
    for (const group of groups.values()) {
      if (group[index] && selected.size < budget) { selected.add(group[index]); found = true; }
    }
    if (!found) break;
  }
  return source.filter(event => selected.has(event));
}
