function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export type MaterialElasticGrainLatticeTuning = {
  grainTimeDitherMs?: number;
  grainSourceDitherMs?: number;
};

export function stableElasticPhaseNoise(seed: number) {
  if (!Number.isFinite(seed)) return 0;
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  return (value - Math.floor(value)) * 2 - 1;
}

export function makeMaterialElasticWindowSeed(args: {
  eventStartSec: number;
  sourceStartSec: number;
  playbackRate: number;
  quality: 'base' | 'fragment';
  salt?: number;
}) {
  const qualitySalt = args.quality === 'fragment' ? 19.371 : 7.113;
  return args.eventStartSec * 997.173
    + args.sourceStartSec * 733.971
    + args.playbackRate * 113.147
    + qualitySalt
    + (args.salt ?? 0);
}

export function materialElasticGrainTimeDitherSec(args: {
  seed: number;
  index: number;
  scheduleSpacingSec: number;
  grainDurationSec: number;
  tuning?: MaterialElasticGrainLatticeTuning | null;
}) {
  const requestedSec = clamp((args.tuning?.grainTimeDitherMs ?? 0) / 1000, 0, 0.006);
  if (requestedSec <= 0.00005) return 0;
  const limitSec = Math.min(
    requestedSec,
    Math.max(0, args.scheduleSpacingSec * 0.24),
    Math.max(0, args.grainDurationSec * 0.035),
  );
  if (limitSec <= 0.00005) return 0;
  const n1 = stableElasticPhaseNoise(args.seed + args.index * 1.61803398875 + 0.211);
  const n2 = stableElasticPhaseNoise(args.seed + args.index * 2.41421356237 + 3.719);
  return (n1 * 0.68 + n2 * 0.32) * limitSec;
}

export function materialElasticGrainSourceDitherSec(args: {
  seed: number;
  index: number;
  searchRadiusSec?: number;
  sourceGrainDurationSec: number;
  tuning?: MaterialElasticGrainLatticeTuning | null;
}) {
  const requestedSec = clamp((args.tuning?.grainSourceDitherMs ?? 0) / 1000, 0, 0.012);
  if (requestedSec <= 0.00005) return 0;
  const searchLimitSec = Number.isFinite(args.searchRadiusSec ?? NaN) ? Math.max(0, Number(args.searchRadiusSec)) * 0.72 : requestedSec;
  const limitSec = Math.min(
    requestedSec,
    searchLimitSec,
    Math.max(0, args.sourceGrainDurationSec * 0.08),
  );
  if (limitSec <= 0.00005) return 0;
  const n1 = stableElasticPhaseNoise(args.seed + args.index * 1.32471795724 + 11.17);
  const n2 = stableElasticPhaseNoise(args.seed + args.index * 2.2360679775 + 5.03);
  return (n1 * 0.74 + n2 * 0.26) * limitSec;
}

export function applyMaterialElasticGrainTimeDither(args: {
  baseWhenSec: number;
  eventStartSec: number;
  eventEndSec: number;
  seed: number;
  index: number;
  scheduleSpacingSec: number;
  grainDurationSec: number;
  tuning?: MaterialElasticGrainLatticeTuning | null;
}) {
  const dither = materialElasticGrainTimeDitherSec({
    seed: args.seed,
    index: args.index,
    scheduleSpacingSec: args.scheduleSpacingSec,
    grainDurationSec: args.grainDurationSec,
    tuning: args.tuning,
  });
  if (Math.abs(dither) <= 0.00005) return args.baseWhenSec;
  return clamp(args.baseWhenSec + dither, args.eventStartSec, Math.max(args.eventStartSec, args.eventEndSec - 0.004));
}
