import { generateRhythmForgePattern } from '../../resonance/rhythmforge/patterns';
import type { GeneratedPattern, GrooveDescriptorVector } from '../../resonance/rhythmforge/types';

export type RhythmForgePatternFlavor = 'rooted' | 'braided' | 'fractured';
export type AppRhythmForgePatternCacheKind = 'drum' | 'bass';

export type AppRhythmForgePatternCacheHelperProbeArgs<Kind extends AppRhythmForgePatternCacheKind = AppRhythmForgePatternCacheKind> = {
  readonly kind: Kind;
  readonly currentPattern: GeneratedPattern | null;
  readonly currentBarIndex: number;
  readonly barIndex: number;
  readonly seed: number;
  readonly rootHz: number;
  readonly baseSwing: number;
  readonly descriptors: GrooveDescriptorVector;
  readonly flavor: RhythmForgePatternFlavor;
};

export type AppRhythmForgePatternCacheHelperProbeResult<Kind extends AppRhythmForgePatternCacheKind = AppRhythmForgePatternCacheKind> = {
  readonly kind: Kind;
  readonly pattern: GeneratedPattern | null;
  readonly nextPattern: GeneratedPattern | null;
  readonly nextBarIndex: number;
  readonly generated: boolean;
  readonly cacheWriteRequired: boolean;
  readonly writerStillAppOwned: true;
  readonly schedulingStillAppOwned: true;
  readonly runtimeOwned: false;
};

export const resolveAppRhythmForgePatternCacheHelperProbe = <Kind extends AppRhythmForgePatternCacheKind>(
  args: AppRhythmForgePatternCacheHelperProbeArgs<Kind>,
): AppRhythmForgePatternCacheHelperProbeResult<Kind> => {
  const shouldGenerate = args.currentBarIndex !== args.barIndex || !args.currentPattern;
  const nextPattern = shouldGenerate
    ? generateRhythmForgePattern({
        barIndex: args.barIndex,
        seed: args.seed,
        rootHz: args.rootHz,
        baseSwing: args.baseSwing,
        descriptors: args.descriptors,
        flavor: args.flavor,
      })
    : args.currentPattern;

  return {
    kind: args.kind,
    pattern: nextPattern,
    nextPattern,
    nextBarIndex: args.barIndex,
    generated: shouldGenerate,
    cacheWriteRequired: shouldGenerate,
    writerStillAppOwned: true,
    schedulingStillAppOwned: true,
    runtimeOwned: false,
  };
};
