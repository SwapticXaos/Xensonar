import type { AppRhythmForgePatternCacheHelperProbeResult, RhythmForgePatternFlavor } from './appRhythmForgePatternCacheHelperProbe';
import { resolveAppRhythmForgePatternCacheHelperProbe } from './appRhythmForgePatternCacheHelperProbe';
import type { GeneratedPattern, GrooveDescriptorVector } from '../../resonance/rhythmforge/types';

export type { RhythmForgePatternFlavor } from './appRhythmForgePatternCacheHelperProbe';

export type AppRhythmForgeDrumCacheHelperProbeArgs = {
  readonly currentPattern: GeneratedPattern | null;
  readonly currentBarIndex: number;
  readonly barIndex: number;
  readonly seed: number;
  readonly rootHz: number;
  readonly baseSwing: number;
  readonly descriptors: GrooveDescriptorVector;
  readonly flavor: RhythmForgePatternFlavor;
};

export type AppRhythmForgeDrumCacheHelperProbeResult = AppRhythmForgePatternCacheHelperProbeResult<'drum'>;

export const resolveAppRhythmForgeDrumCacheHelperProbe = (
  args: AppRhythmForgeDrumCacheHelperProbeArgs,
): AppRhythmForgeDrumCacheHelperProbeResult =>
  resolveAppRhythmForgePatternCacheHelperProbe({
    kind: 'drum',
    ...args,
  });
