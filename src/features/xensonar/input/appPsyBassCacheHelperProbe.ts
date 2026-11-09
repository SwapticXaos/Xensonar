import { generatePsyBassPattern } from '../../resonance/psybass/patterns';
import type { GrooveDescriptorVector, PsyBassPattern, PsyBassStyle } from '../../resonance/psybass/types';
import { buildPsyBassPatternRequest } from '../groove/groovePlaybackHelpers';

export type AppPsyBassCacheHelperProbeArgs = {
  readonly currentPattern: PsyBassPattern | null;
  readonly currentBarIndex: number;
  readonly barIndex: number;
  readonly seed: number;
  readonly rootHz: number;
  readonly style: PsyBassStyle;
  readonly swing: number;
  readonly bassGrit: number;
  readonly pressure: number;
  readonly descriptors: GrooveDescriptorVector;
};

export type AppPsyBassCacheHelperProbeResult = {
  readonly pattern: PsyBassPattern | null;
  readonly nextPattern: PsyBassPattern | null;
  readonly nextBarIndex: number;
  readonly generated: boolean;
  readonly cacheWriteRequired: boolean;
  readonly writerStillAppOwned: true;
  readonly schedulingStillAppOwned: true;
  readonly runtimeOwned: false;
};

export const resolveAppPsyBassCacheHelperProbe = (
  args: AppPsyBassCacheHelperProbeArgs,
): AppPsyBassCacheHelperProbeResult => {
  const shouldGenerate = args.currentBarIndex !== args.barIndex || !args.currentPattern;
  const nextPattern = shouldGenerate
    ? generatePsyBassPattern(buildPsyBassPatternRequest({
        style: args.style,
        barIndex: args.barIndex,
        seed: args.seed,
        rootHz: args.rootHz,
        swing: args.swing,
        bassGrit: args.bassGrit,
        pressure: args.pressure,
        descriptors: args.descriptors,
      }))
    : args.currentPattern;

  return {
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
