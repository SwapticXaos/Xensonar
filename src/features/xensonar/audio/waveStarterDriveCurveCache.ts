import { makeDriveCurve } from '../rooms/resonanceRuntimeMath';

/**
 * Small exact-value cache for the two waveshaper curves shared by all partials
 * of a WaveStarter attack. The cache is deliberately tiny and bounded: its job
 * is to remove repeated 1024-sample tanh curve construction from the gesture
 * hot path, not to retain an unbounded history of cursor positions.
 *
 * Reusing the Float32Array is semantically safe because Xensonar never mutates
 * a generated drive curve after construction.
 */
const MAX_WAVE_STARTER_DRIVE_CURVES = 8;

type CachedDriveCurve = {
  amount: number;
  curve: Float32Array;
};

const driveCurveCache: CachedDriveCurve[] = [];

export function getWaveStarterDriveCurve(amount: number): Float32Array {
  const existing = driveCurveCache.find((entry) => Object.is(entry.amount, amount));
  if (existing) return existing.curve;

  const curve = makeDriveCurve(amount);
  if (driveCurveCache.length >= MAX_WAVE_STARTER_DRIVE_CURVES) {
    driveCurveCache.shift();
  }
  driveCurveCache.push({ amount, curve });
  return curve;
}
