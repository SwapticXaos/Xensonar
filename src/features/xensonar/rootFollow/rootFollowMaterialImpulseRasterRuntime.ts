import type { RootFollowImpulseRasterRenderWindow } from "./rootFollowImpulseRasterPolicy";

export const ROOT_FOLLOW_MATERIAL_IMPULSE_RASTER_RUNTIME_CONTRACT = {
  scope: "all-root-follow-material-bodies",
  ownsMacroTimeInterpretation: true,
  importsCarrierOrMachineInternals: false,
  materialBodyAgnostic: true,
  protectedAgainstDoubleFolding: true,
  semantics: [
    "normal-material-cycle",
    "fragment-compressed-into-active-segment",
    "whole-root-follow-window-muted-by-segments",
  ],
} as const;

export type RootFollowMaterialImpulseRasterRuntime = {
  impulseRasterWindow: RootFollowImpulseRasterRenderWindow | null;
  desiredLoopDur: number;
  materialTransportAnchor: number;
  materialRenderHorizonEnd: number;
  impulseRasterSpeedFactor: number;
  clockInterpretation: "normal-material-cycle" | "fragment-compressed-into-active-segment" | "whole-root-follow-window-muted-by-segments";
};

const MIN_LOOP_DUR_SEC = 0.025;

function safeDuration(value: number, fallback: number) {
  return Math.max(MIN_LOOP_DUR_SEC, Number.isFinite(value) ? value : fallback);
}

function safeAbsoluteTime(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * General Root-Follow material-time resolver. This is intentionally not
 * HarmonicXplorE-specific: every rendered Root-Follow material body reaches the
 * same macro-time gate here. Material renderers may supply a body; this resolver
 * alone decides whether the current Root-Follow window is normal, compressed into
 * an active segment, or running whole while the segment pattern masks it.
 */
export function resolveRootFollowMaterialImpulseRasterRuntime(args: {
  baseDesiredLoopDur: number;
  transportAnchor: number;
  impulseRasterWindow?: RootFollowImpulseRasterRenderWindow | null;
}): RootFollowMaterialImpulseRasterRuntime {
  const baseDesiredLoopDur = safeDuration(args.baseDesiredLoopDur, 0.25);
  const transportAnchor = Number.isFinite(args.transportAnchor) ? args.transportAnchor : 0;
  const impulseRasterWindow =
    args.impulseRasterWindow && !args.impulseRasterWindow.bypass
      ? args.impulseRasterWindow
      : null;

  if (!impulseRasterWindow) {
    return {
      impulseRasterWindow: null,
      desiredLoopDur: baseDesiredLoopDur,
      materialTransportAnchor: transportAnchor,
      materialRenderHorizonEnd: Number.POSITIVE_INFINITY,
      impulseRasterSpeedFactor: 1,
      clockInterpretation: "normal-material-cycle",
    };
  }

  if (impulseRasterWindow.clockMode === "mute-pattern") {
    const desiredLoopDur = safeDuration(
      impulseRasterWindow.rootFollowWindowDurationSec,
      baseDesiredLoopDur,
    );
    return {
      impulseRasterWindow,
      desiredLoopDur,
      materialTransportAnchor: Number.isFinite(impulseRasterWindow.rootFollowWindowStartSec)
        ? impulseRasterWindow.rootFollowWindowStartSec
        : transportAnchor,
      materialRenderHorizonEnd: safeAbsoluteTime(
        impulseRasterWindow.slotEndSec,
        transportAnchor + desiredLoopDur,
      ),
      impulseRasterSpeedFactor: baseDesiredLoopDur / Math.max(0.001, desiredLoopDur),
      clockInterpretation: "whole-root-follow-window-muted-by-segments",
    };
  }

  const desiredLoopDur = safeDuration(
    Math.min(baseDesiredLoopDur, impulseRasterWindow.slotDurationSec),
    baseDesiredLoopDur,
  );
  return {
    impulseRasterWindow,
    desiredLoopDur,
    materialTransportAnchor: Number.isFinite(impulseRasterWindow.slotStartSec)
      ? impulseRasterWindow.slotStartSec
      : transportAnchor,
    materialRenderHorizonEnd: safeAbsoluteTime(
      impulseRasterWindow.slotEndSec,
      transportAnchor + desiredLoopDur,
    ),
    impulseRasterSpeedFactor: baseDesiredLoopDur / Math.max(0.001, desiredLoopDur),
    clockInterpretation: "fragment-compressed-into-active-segment",
  };
}
