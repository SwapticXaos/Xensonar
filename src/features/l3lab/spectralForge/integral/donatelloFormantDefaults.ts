export const DONATELLO_FORMANT_PLAN_DEFAULT_RESOLUTION = 64;
export const DONATELLO_FORMANT_PLAN_DEFAULT_MAX_BANDS = 8;
export const DONATELLO_FORMANT_PLAN_DEFAULT_SAFE_GAIN_CEILING = 0.86;

export const DONATELLO_FORMANT_ENGINE_LIMITS = {
  minCurveResolution: 8,
  maxBandCount: 8,
  minSafeGainCeiling: 0.1,
  maxSafeGainCeiling: 1,
} as const;
