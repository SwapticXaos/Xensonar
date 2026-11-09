import type { AppRhythmForgePatternCacheHelperProbeResult, RhythmForgePatternFlavor } from './appRhythmForgePatternCacheHelperProbe';
import { resolveAppRhythmForgePatternCacheHelperProbe } from './appRhythmForgePatternCacheHelperProbe';
import type { GeneratedPattern, GrooveDescriptorVector } from '../../resonance/rhythmforge/types';

export type AppRhythmForgeBassCacheHelperProbeArgs = {
  readonly currentPattern: GeneratedPattern | null;
  readonly currentBarIndex: number;
  readonly barIndex: number;
  readonly seed: number;
  readonly rootHz: number;
  readonly baseSwing: number;
  readonly descriptors: GrooveDescriptorVector;
  readonly flavor: RhythmForgePatternFlavor;
};

export type AppRhythmForgeBassCacheHelperProbeResult = AppRhythmForgePatternCacheHelperProbeResult<'bass'>;

export const resolveAppRhythmForgeBassCacheHelperProbe = (
  args: AppRhythmForgeBassCacheHelperProbeArgs,
): AppRhythmForgeBassCacheHelperProbeResult =>
  resolveAppRhythmForgePatternCacheHelperProbe({
    kind: 'bass',
    ...args,
  });
