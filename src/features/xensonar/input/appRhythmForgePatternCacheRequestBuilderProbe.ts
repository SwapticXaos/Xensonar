import type { BassPattern, DrumPattern } from '../domain/instrumentData';
import type { GeneratedPattern, GrooveDescriptorVector } from '../../resonance/rhythmforge/types';
import { getRhythmForgeFlavor } from '../rooms/resonanceRuntimeMath';
import type {
  AppRhythmForgePatternCacheHelperProbeArgs,
  AppRhythmForgePatternCacheKind,
} from './appRhythmForgePatternCacheHelperProbe';

export type AppRhythmForgePatternCacheRequestBuilderProbeArgs<Kind extends AppRhythmForgePatternCacheKind> = {
  readonly kind: Kind;
  readonly currentPattern: GeneratedPattern | null;
  readonly currentBarIndex: number;
  readonly barIndex: number;
  readonly seedBase: number;
  readonly seedSalt: number;
  readonly rootHz: number;
  readonly baseSwing: number;
  readonly descriptors: GrooveDescriptorVector;
  readonly pattern: DrumPattern | BassPattern;
  readonly writerStillBoundaryOwned: true;
  readonly schedulingStillBoundaryOwned: true;
};

export type AppRhythmForgePatternCacheRequestBuilderProbeResult<Kind extends AppRhythmForgePatternCacheKind> = {
  readonly request: AppRhythmForgePatternCacheHelperProbeArgs<Kind>;
  readonly seed: number;
  readonly flavor: AppRhythmForgePatternCacheHelperProbeArgs<Kind>['flavor'];
  readonly cacheWriteStillBoundaryOwned: true;
  readonly schedulingStillBoundaryOwned: true;
  readonly runtimeOwned: false;
};

export const buildAppRhythmForgePatternCacheRequestProbe = <Kind extends AppRhythmForgePatternCacheKind>(
  args: AppRhythmForgePatternCacheRequestBuilderProbeArgs<Kind>,
): AppRhythmForgePatternCacheRequestBuilderProbeResult<Kind> => {
  const seed = args.seedBase ^ args.seedSalt;
  const flavor = getRhythmForgeFlavor(args.pattern);
  return {
    request: {
      kind: args.kind,
      currentPattern: args.currentPattern,
      currentBarIndex: args.currentBarIndex,
      barIndex: args.barIndex,
      seed,
      rootHz: args.rootHz,
      baseSwing: args.baseSwing,
      descriptors: args.descriptors,
      flavor,
    },
    seed,
    flavor,
    cacheWriteStillBoundaryOwned: true,
    schedulingStillBoundaryOwned: true,
    runtimeOwned: false,
  };
};
