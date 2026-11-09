import { DURATION } from '../spectralConstants';
import { frequencyToY, yToFrequency } from '../audio/SpectralData';

export const FORGE_TIME_DURATION_SEC = DURATION;

export function carrierTimeIndexToSeconds(timeIndex: number, width: number, durationSec: number = FORGE_TIME_DURATION_SEC): number {
  if (width <= 1) return 0;
  return (timeIndex / Math.max(1, width - 1)) * durationSec;
}

export function carrierSecondsToTimeIndex(seconds: number, width: number, durationSec: number = FORGE_TIME_DURATION_SEC): number {
  if (durationSec <= 0 || width <= 1) return 0;
  const normalized = Math.max(0, Math.min(1, seconds / durationSec));
  return normalized * Math.max(1, width - 1);
}

export function carrierBinToHz(bin: number, height: number): number {
  return yToFrequency(bin, height);
}

export function carrierHzToBin(hz: number, height: number): number {
  return frequencyToY(hz, height);
}
