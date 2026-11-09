import type { StationaryRhythmWorkletSnapshot } from './stationaryRhythmWorkletLaneContracts';

export type StationaryRhythmWorkletProbeOverlayProps = {
  snapshot: StationaryRhythmWorkletSnapshot;
  onToggleProbe: () => void;
};

/**
 * Historical stationary-rhythm audition overlay.
 *
 * The visible stationary-rhythm probe control was useful while validating the
 * first Worklet lane, but it is not part of the current audio-branch merge
 * surface. Keeping this component as a cold null boundary lets the App.tsx
 * call-site survive cross-branch merges without exposing a hot-path probe UI
 * or providing a button that can accidentally start audible diagnostic work.
 */
export function StationaryRhythmWorkletProbeOverlay(_: StationaryRhythmWorkletProbeOverlayProps) {
  return null;
}
