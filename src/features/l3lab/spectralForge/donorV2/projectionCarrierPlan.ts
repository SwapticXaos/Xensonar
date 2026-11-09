import type { CarrierSpectralSkeleton } from '../types/carrierDonorV2Types';

export type ProjectionCarrierPlan = {
  rootReferenceHz: number;
  bands: { centerRatioCurve: number[]; gainCurve: number[] }[];
};

/** Eight reusable voice lanes, not eight events per whole drawing. Read exactly
 * one carrier column: neighbouring columns must never fill a painted pause.
 * Minimum-cost assignment follows predicted log-frequency through glissandi. */
export function buildProjectionCarrierPlan(skeleton: CarrierSpectralSkeleton): ProjectionCarrierPlan {
  const width = Math.max(1, skeleton.width);
  const lanes = Array.from({ length: 8 }, () => ({
    centerRatioCurve: new Array<number>(width).fill(1), gainCurve: new Array<number>(width).fill(0),
    logHz: 0, velocity: 0, last: -1,
  }));
  for (let x = 0; x < width; x++) {
    const candidates = [...(skeleton.anchorsByTime[x] ?? [])]
      .filter(a => Number.isFinite(a.centerHz) && a.centerHz >= 18 && Number.isFinite(a.energy) && a.energy > 0)
      .sort((a, b) => b.energy - a.energy).slice(0, 8);
    const costs = candidates.map(candidate => lanes.map((lane, l) =>
      lane.last < 0 ? 8 + l * 0.001 : Math.abs(Math.log2(candidate.centerHz) -
        (lane.logHz + (x - lane.last <= 2 ? lane.velocity : 0))) + Math.min(1, (x - lane.last - 1) * 0.02)));
    // Eight lanes permit exact matching with only 256 states. Greedy matching
    // can steal a neighbour's best lane and cause avoidable pitch swaps.
    const best = new Float64Array(256).fill(Infinity);
    const parent = new Int16Array(256).fill(-1);
    const chosenLane = new Int8Array(256).fill(-1);
    best[0] = 0;
    let finalMask = 0, finalCost = Infinity;
    for (let mask = 0; mask < 256; mask++) {
      if (!Number.isFinite(best[mask])) continue;
      let count = 0;
      for (let bits = mask; bits; bits &= bits - 1) count++;
      if (count === candidates.length) {
        if (best[mask] < finalCost) { finalMask = mask; finalCost = best[mask]; }
        continue;
      }
      for (let l = 0; l < lanes.length; l++) {
        if (mask & (1 << l)) continue;
        const next = mask | (1 << l), cost = best[mask] + costs[count][l];
        if (cost < best[next]) { best[next] = cost; parent[next] = mask; chosenLane[next] = l; }
      }
    }
    const assignments = new Array<number>(candidates.length);
    for (let c = candidates.length - 1, mask = finalMask; c >= 0; c--) {
      assignments[c] = chosenLane[mask]; mask = parent[mask];
    }
    for (let c = 0; c < candidates.length; c++) {
      const lane = lanes[assignments[c]], candidate = candidates[c], logHz = Math.log2(candidate.centerHz);
      lane.velocity = lane.last >= 0 && lane.last === x - 1 ? logHz - lane.logHz : 0;
      lane.logHz = logHz; lane.last = x;
      lane.centerRatioCurve[x] = candidate.centerHz / 110;
      lane.gainCurve[x] = Math.sqrt(Math.min(1, candidate.energy));
    }
  }
  // One gain for the whole drawing preserves its dynamic contour. Per-column
  // normalization would flatten loud/quiet passages and pump on voice entries.
  let maximumSum = 0;
  for (let x = 0; x < width; x++) maximumSum = Math.max(maximumSum, lanes.reduce((sum, lane) => sum + lane.gainCurve[x], 0));
  const scale = maximumSum > 0.86 ? 0.86 / maximumSum : 1;
  for (const lane of lanes) for (let x = 0; x < width; x++) lane.gainCurve[x] *= scale;
  for (const lane of lanes) {
    // Hold the last pitch over silence, then start the next event at its own pitch.
    let last = lane.centerRatioCurve[lane.gainCurve.findIndex(g => g > 0)] ?? 1;
    for (let x = 0; x < width; x++) {
      if (lane.gainCurve[x] > 0) last = lane.centerRatioCurve[x];
      else lane.centerRatioCurve[x] = last;
    }
  }
  return { rootReferenceHz: 110, bands: lanes.filter(l => l.last >= 0).map(({ centerRatioCurve, gainCurve }) => ({ centerRatioCurve, gainCurve })) };
}
