import type { LoopEngineTimeGuideMarker } from './loopEngineModel';

export type PatternTimingLike = {
  stepsPerBar: number;
  beatsPerBar?: number | null;
};

export type PatternLengthLike = {
  stepsPerBar: number;
  bars: number;
};

export type PatternSegmentLike = {
  segmentCount?: number | null;
  timeGuideMarkers?: Array<{ kind: 'bar' | 'guide' }>;
  bars?: number | null;
};

export function parsePatternIndexFromId(prefix: string, id?: string) {
  if (!id) return -1;
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escapedPrefix}(\\d+)`).exec(id);
  return match ? Number(match[1]) : -1;
}

export function patternUnitsPerBeat(state: PatternTimingLike) {
  return Math.max(0.25, Math.max(1, state.stepsPerBar) / Math.max(1, state.beatsPerBar || 4));
}

export function totalPatternUnits(state: PatternLengthLike) {
  return Math.max(1, state.stepsPerBar * Math.max(1, state.bars));
}

export function createDefaultPatternTimeGuides(bars: number, beatsPerBar = 4, segmentCount = 4): LoopEngineTimeGuideMarker[] {
  const safeBars = Math.max(1, Math.round(bars));
  const safeBeats = Math.max(1, Math.round(beatsPerBar));
  const safeSegments = Math.max(1, Math.round(segmentCount));
  const markers: LoopEngineTimeGuideMarker[] = [];
  for (let bar = 0; bar <= safeBars; bar += 1) {
    markers.push({ id: `bar-${bar}`, beat: bar * safeBeats, kind: 'bar', repeatPerBar: false, locked: true, muted: false });
  }
  if (safeSegments <= 1) return markers;
  for (let bar = 0; bar < safeBars; bar += 1) {
    for (let index = 1; index < safeSegments; index += 1) {
      const portion = index / safeSegments;
      markers.push({ id: `guide-${bar}-${index - 1}`, beat: (bar + portion) * safeBeats, kind: 'guide', repeatPerBar: true, locked: false, muted: false });
    }
  }
  return markers;
}

export function inferPatternSegmentCount(state: PatternSegmentLike): number {
  if (Number.isFinite(state.segmentCount)) return Math.max(1, Math.min(16, Math.round(state.segmentCount ?? 4)));
  const bars = Math.max(1, Math.round(state.bars ?? 1));
  const guideCount = (state.timeGuideMarkers ?? []).filter((marker) => marker.kind === 'guide').length;
  const perBar = guideCount > 0 ? Math.round(guideCount / bars) : 0;
  return Math.max(1, Math.min(16, perBar + 1 || 4));
}

export function patternUnitToLabel(state: PatternTimingLike, unit: number) {
  const safeUnit = Math.max(0, unit);
  const unitsPerBeat = patternUnitsPerBeat(state);
  const beatFloat = safeUnit / unitsPerBeat;
  const beatsPerBar = Math.max(1, state.beatsPerBar || 4);
  const bar = Math.floor(beatFloat / beatsPerBar) + 1;
  const localBeat = beatFloat - Math.floor(beatFloat / beatsPerBar) * beatsPerBar;
  const beat = Math.floor(localBeat) + 1;
  const sub = Math.round((localBeat - Math.floor(localBeat)) * 100);
  return `${bar}.${String(beat).padStart(2, '0')}${sub > 0 ? `+${sub}` : ''}`;
}
