export type MaterialLoopTimeMode = 'normal' | 'double' | 'half';

const XENSONAR_LOOP_REFERENCE_BPM = 120;

export function getMaterialLoopInterpretationFactor(mode: MaterialLoopTimeMode) {
  if (mode === 'double') return 0.5;
  if (mode === 'half') return 2;
  return 1;
}

export function getEffectiveMaterialLoopBars(entry: { bars: number } | null, mode: MaterialLoopTimeMode) {
  const baseBars = Math.max(1, Number(entry?.bars) || 1);
  return Math.max(0.25, baseBars * getMaterialLoopInterpretationFactor(mode));
}

export function getMaterialLoopBarDurationSec(bpm: number) {
  return (60 / Math.max(40, bpm || XENSONAR_LOOP_REFERENCE_BPM)) * 4;
}

export function getEffectiveMaterialLoopCycleDurationSec(
  entry: { bars: number } | null,
  mode: MaterialLoopTimeMode,
  bpm: number,
) {
  return Math.max(0.25, getMaterialLoopBarDurationSec(bpm) * getEffectiveMaterialLoopBars(entry, mode));
}

export function getMaterialLoopReferenceBpm() {
  return XENSONAR_LOOP_REFERENCE_BPM;
}

export function formatMaterialLoopBars(bars: number | null | undefined) {
  const safeBars = Math.max(0, Number(bars) || 0);
  const rounded = Math.round(safeBars * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(2).replace(/\.00$/, '').replace(/0$/, '');
}
