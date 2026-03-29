export type AudioTimeContext = Pick<BaseAudioContext, 'currentTime'> | null | undefined;

export interface TransportClockSpec {
  startTimeSec: number;
  startOffsetSec: number;
  durationSec: number;
  playbackRate?: number;
  loop?: boolean;
}

export function getVisualNowSec(): number {
  return performance.now() / 1000;
}

export function getAudioNowSec(ctx?: AudioTimeContext): number {
  return ctx?.currentTime ?? getVisualNowSec();
}

export function quantizeUpToStep(nowSec: number, stepSec: number, leadSec: number = 0): number {
  const safeStep = Math.max(0.0001, stepSec);
  return Math.ceil((nowSec + Math.max(0, leadSec)) / safeStep) * safeStep;
}

export function getTransportElapsedSec(spec: TransportClockSpec, nowSec: number): number {
  const rate = Math.max(0.0001, spec.playbackRate ?? 1);
  return ((nowSec - spec.startTimeSec) * rate) + spec.startOffsetSec;
}

export function getTransportPosition(spec: TransportClockSpec, nowSec: number): number {
  const duration = Math.max(0.0001, spec.durationSec);
  const elapsed = getTransportElapsedSec(spec, nowSec);
  if (spec.loop) {
    const wrapped = ((elapsed % duration) + duration) % duration;
    return wrapped / duration;
  }
  return Math.max(0, Math.min(1, elapsed / duration));
}
