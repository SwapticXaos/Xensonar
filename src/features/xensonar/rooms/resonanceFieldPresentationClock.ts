export const RESONANCE_FIELD_PRESENTATION_CLOCK_CONTRACT = {
  nominalFrameMs: 1000 / 60,
  presentationHalfLifeMs: 42,
  maxCatchupFramesPerFrame: 3.4,
  softLagPx: 18,
  hardLagPx: 54,
} as const;

const finiteOr = (value: number | undefined, fallback: number): number => (
  Number.isFinite(value) ? value as number : fallback
);

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export type ResolveFieldWaveTruthRadiusArgs = {
  fallbackRadius: number;
  maxRadius: number;
  launchedAtMs?: number;
  frameNowMs: number;
  baseWaveSpeed: number;
};

export function resolveFieldWaveTruthRadius(args: ResolveFieldWaveTruthRadiusArgs): number {
  const launchedAtMs = args.launchedAtMs;
  if (!Number.isFinite(launchedAtMs ?? NaN)) return args.fallbackRadius;
  const elapsedMs = Math.max(0, args.frameNowMs - (launchedAtMs as number));
  const elapsedNominalFrames = elapsedMs / RESONANCE_FIELD_PRESENTATION_CLOCK_CONTRACT.nominalFrameMs;
  return clamp(elapsedNominalFrames * args.baseWaveSpeed, 0, args.maxRadius + 16);
}

export type StepFieldWaveDisplayRadiusArgs = {
  displayRadius?: number;
  previousTruthRadius: number;
  truthRadius: number;
  rawFrameMs: number;
  maxRadius: number;
  baseWaveSpeed: number;
};

/**
 * Presentation follower for visible ring/sector waves.
 *
 * The simulation/audio truth remains the time-locked `truthRadius`, but the
 * visible ring is allowed to follow it with bounded smoothing. This prevents the
 * old frame-bound tempo sag without replacing it with hard visual teleports after
 * Electron/Vite frame gaps.
 */
export function stepFieldWaveDisplayRadius(args: StepFieldWaveDisplayRadiusArgs): number {
  const contract = RESONANCE_FIELD_PRESENTATION_CLOCK_CONTRACT;
  const rawFrameMs = clamp(finiteOr(args.rawFrameMs, contract.nominalFrameMs), 0, 96);
  const current = clamp(
    finiteOr(args.displayRadius, args.previousTruthRadius),
    0,
    args.maxRadius + 16,
  );
  const truth = clamp(args.truthRadius, 0, args.maxRadius + 16);
  if (truth <= current) return truth;

  const blend = 1 - Math.pow(0.5, rawFrameMs / contract.presentationHalfLifeMs);
  const smoothed = current + (truth - current) * clamp(blend, 0, 1);
  const frameFactor = clamp(rawFrameMs / contract.nominalFrameMs, 1, contract.maxCatchupFramesPerFrame);
  const maxAdvance = Math.max(args.baseWaveSpeed, args.baseWaveSpeed * frameFactor + contract.softLagPx * 0.06);
  let next = Math.min(truth, Math.min(smoothed, current + maxAdvance));

  if (truth - next > contract.hardLagPx) {
    next = truth - contract.hardLagPx;
  }
  return clamp(next, 0, args.maxRadius + 16);
}

export function resolveFieldWaveCatchupGhostRadius(previousDisplayRadius: number | undefined, displayRadius: number): number | null {
  if (!Number.isFinite(previousDisplayRadius ?? NaN)) return null;
  const previous = previousDisplayRadius as number;
  const advance = displayRadius - previous;
  if (advance < 5.5) return null;
  return previous + advance * 0.52;
}
