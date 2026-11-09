import type { QuantizeSubdivision } from "./grid";

export type QuantizeSliceLike = {
  quantizeOn: boolean;
  quantizeBpm: number;
  quantizeSubdivision: QuantizeSubdivision;
};

export const formatQuantizeHudLabel = (slice: QuantizeSliceLike): string => {
  if (!slice.quantizeOn) {
    return "Quantisierung: frei";
  }
  const bpm = Math.round(slice.quantizeBpm);
  return `Quantisierung: ${bpm} BPM · 1/${slice.quantizeSubdivision}`;
};

