import type { BassPattern } from '../domain/instrumentData';
import type { PsyBassPattern } from '../../resonance/psybass/types';
import type { GrooveDescriptorVector } from '../../resonance/rhythmforge/types';
import { getPsyBassStyle } from '../rooms/resonanceRuntimeMath';
import type { AppPsyBassCacheHelperProbeArgs } from './appPsyBassCacheHelperProbe';

export type AppPsyBassCacheRequestBuilderProbeArgs = {
  readonly currentPattern: PsyBassPattern | null;
  readonly currentBarIndex: number;
  readonly barIndex: number;
  readonly pattern: BassPattern;
  readonly seedBase: number;
  readonly seedSalt: number;
  readonly rootHz: number;
  readonly swing: number;
  readonly bassGrit: number;
  readonly descriptors: GrooveDescriptorVector;
  readonly writerStillBoundaryOwned: true;
  readonly schedulingStillBoundaryOwned: true;
};

export type AppPsyBassCacheRequestBuilderProbeResult = {
  readonly request: AppPsyBassCacheHelperProbeArgs;
  readonly seed: number;
  readonly pressure: number;
  readonly cacheWriteStillBoundaryOwned: true;
  readonly schedulingStillBoundaryOwned: true;
  readonly runtimeOwned: false;
};

export const buildAppPsyBassCacheRequestProbe = (
  args: AppPsyBassCacheRequestBuilderProbeArgs,
): AppPsyBassCacheRequestBuilderProbeResult => {
  const seed = args.seedBase ^ args.seedSalt;
  const pressure = args.descriptors.pressure;
  return {
    request: {
      currentPattern: args.currentPattern,
      currentBarIndex: args.currentBarIndex,
      barIndex: args.barIndex,
      style: getPsyBassStyle(args.pattern),
      seed,
      rootHz: args.rootHz,
      swing: args.swing,
      bassGrit: args.bassGrit,
      pressure,
      descriptors: args.descriptors,
    },
    seed,
    pressure,
    cacheWriteStillBoundaryOwned: true,
    schedulingStillBoundaryOwned: true,
    runtimeOwned: false,
  };
};
