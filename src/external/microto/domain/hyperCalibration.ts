export const DEFAULT_HYPER_PATTERN = [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
export const DEFAULT_HYPERCALI2_WEIGHTS = Array.from({ length: 64 }, (_, i) =>
  DEFAULT_HYPER_PATTERN[i % DEFAULT_HYPER_PATTERN.length] ? 0.78 : 0.18,
);
export const DEFAULT_HYPERCALI2_PITCH_OFFSETS = Array.from({ length: 16 }, () => 0);

import { clamp } from "../shared/tuning/grid";

export const buildHyperPatternFromTapTimes = (tapTimes: number[]) => {
  if (tapTimes.length < 2) return [...DEFAULT_HYPER_PATTERN];
  const intervals: number[] = [];
  for (let i = 1; i < tapTimes.length; i += 1) {
    const dt = tapTimes[i] - tapTimes[i - 1];
    if (Number.isFinite(dt)) intervals.push(clamp(dt, 40, 2200));
  }
  if (!intervals.length) return [...DEFAULT_HYPER_PATTERN];

  const total = intervals.reduce((sum, dt) => sum + dt, 0);
  if (total <= 0) return [...DEFAULT_HYPER_PATTERN];

  const cumulative: number[] = [0];
  for (const dt of intervals) {
    cumulative.push(cumulative[cumulative.length - 1] + dt);
  }

  const pattern = Array.from({ length: 16 }, () => 0);
  pattern[0] = 1;
  cumulative.forEach((t) => {
    const rel = t / total;
    const idx = clamp(Math.round(rel * 15), 0, 15);
    pattern[idx] = 1;
  });

  const activeCount = pattern.reduce((sum, v) => sum + v, 0);
  if (activeCount < 4) {
    [4, 8, 12].forEach((idx) => {
      pattern[idx] = 1;
    });
  }
  return pattern;
};

export const buildHyperCali2Profile = (
  moves: Array<{ t: number; x: number; y: number }>,
  clicks: Array<{ t: number; x: number; y: number }>,
  captureMs: number,
) => {
  if (moves.length < 3) {
    return {
      weights: [...DEFAULT_HYPERCALI2_WEIGHTS],
      pitchOffsets: [...DEFAULT_HYPERCALI2_PITCH_OFFSETS],
    };
  }

  const speeds: number[] = [];
  const dirChanges: number[] = [];
  const accels: number[] = [];
  let prevSpeed = 0;
  let prevAngle = 0;
  let hasPrevAngle = false;
  let sumDx = 0;
  let sumDy = 0;

  for (let i = 1; i < moves.length; i += 1) {
    const a = moves[i - 1];
    const b = moves[i];
    const dt = Math.max(1, b.t - a.t);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const speed = dist / dt;
    speeds.push(speed);
    accels.push(Math.abs(speed - prevSpeed));
    prevSpeed = speed;
    sumDx += dx;
    sumDy += dy;

    if (dist > 0.001) {
      const angle = Math.atan2(dy, dx);
      if (hasPrevAngle) {
        let d = angle - prevAngle;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        dirChanges.push(Math.abs(d));
      }
      prevAngle = angle;
      hasPrevAngle = true;
    }
  }

  const mean = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
  const std = (arr: number[], m: number) => {
    if (!arr.length) return 0;
    const variance = arr.reduce((s, v) => s + (v - m) * (v - m), 0) / arr.length;
    return Math.sqrt(Math.max(0, variance));
  };

  const speedMean = mean(speeds);
  const speedStd = std(speeds, speedMean);
  const accelMean = mean(accels);
  const dirMean = mean(dirChanges);
  const clickIntervals = clicks
    .slice(1)
    .map((c, i) => c.t - clicks[i].t)
    .filter((v) => Number.isFinite(v) && v > 1);
  const clickMean = mean(clickIntervals);
  const clickStd = std(clickIntervals, clickMean);
  const clickIrregularity = clickMean > 0 ? clickStd / clickMean : 0.35;

  const jitter = clamp(speedMean > 0 ? speedStd / (speedMean + 1e-6) : 0.5, 0.08, 1.8);
  const reactivity = clamp(accelMean / 0.05, 0.05, 2.2);
  const directionChaos = clamp(dirMean / Math.PI, 0.05, 1.2);
  const directionalBias = Math.atan2(sumDy, sumDx) / Math.PI; // -1..1

  const weights = Array.from({ length: 64 }, (_, i) => {
    const p = i / 64;
    const w1 = 0.28 * Math.sin((Math.PI * 2 * p * (2 + jitter * 3.2)) + directionalBias * Math.PI * 0.8);
    const w2 = 0.24 * Math.sin((Math.PI * 2 * p * (4 + directionChaos * 4.6)) + clickIrregularity * Math.PI * 1.7);
    const w3 = 0.16 * Math.cos((Math.PI * 2 * p * (7 + reactivity * 2.4)));
    return clamp(0.42 + w1 + w2 + w3, 0, 1);
  });

  const windowMs = Math.max(1200, captureMs);
  clicks.forEach((click) => {
    const rel = clamp((click.t - (clicks[0]?.t ?? click.t)) / windowMs, 0, 0.9999);
    const center = Math.round(rel * 63);
    for (let off = -2; off <= 2; off += 1) {
      const idx = center + off;
      if (idx < 0 || idx >= 64) continue;
      const boost = off === 0 ? 0.38 : off === -1 || off === 1 ? 0.2 : 0.1;
      weights[idx] = clamp(weights[idx] + boost, 0, 1);
    }
  });

  const pitchOffsets = Array.from({ length: 16 }, (_, i) => {
    const w = weights[(i * 4) % 64];
    const wave = Math.sin(i * (0.83 + directionChaos * 0.4) + directionalBias * 1.4) * 2.2;
    const jitterShift = (w - 0.5) * 6;
    return clamp(Math.round(wave + jitterShift), -5, 5);
  });

  return { weights, pitchOffsets };
};
