/**
 * Reconstruct an attack's intended AudioContext time from the request clock.
 * The lane records requestedAtMs on performance.now()/Date.now(); while the
 * AudioContext is running both clocks advance through a main-thread stall.
 * Keeping that age prevents a delayed callback from laundering old work into
 * ctx.currentTime + epsilon on resume.
 */
export function readWaveStarterRequestClockMs(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

export function resolveWaveStarterIntendedStartTimeSec(args: {
  audioNowSec: number;
  requestNowMs: number;
  requestedAtMs?: number;
  delaySec?: number;
  audioClockRunning?: boolean;
}): number {
  const delaySec = Number.isFinite(args.delaySec) ? Number(args.delaySec) : 0;
  if (
    args.audioClockRunning === false ||
    args.requestedAtMs === undefined ||
    !Number.isFinite(args.requestedAtMs) ||
    !Number.isFinite(args.requestNowMs)
  ) {
    return args.audioNowSec + delaySec;
  }
  const ageSec = Math.max(0, (args.requestNowMs - args.requestedAtMs) / 1000);
  return args.audioNowSec - ageSec + delaySec;
}
