export type AudioMaterialInterpretationRoute = 'direct-root-follow-audio' | 'spectralforge-carrier-donor';
export type AudioMaterialSourceRole = 'root-follow-audio' | 'spectralforge-donor' | 'spectralforge-render' | 'unknown';

export type AudioMaterialInterpretationFitKind =
  | 'synthetic-smoothness'
  | 'coherent-body'
  | 'articulated-fragment'
  | 'transient-texture';

export type AudioMaterialRoleWeights = {
  ordered: number;
  body: number;
  residual: number;
  transient: number;
};

export type AudioMaterialCarrierReading = {
  carrierRespect: number;
  donorMaterialLoad: number;
  attackBias: number;
  releaseBias: number;
  brightnessBias: number;
  residualDust: number;
  transientPulse: number;
  bodyContinuity: number;
  roleWeights: AudioMaterialRoleWeights;
};

export type AudioMaterialInterpretationProfile = {
  version: 1;
  route: AudioMaterialInterpretationRoute;
  sourceRole: AudioMaterialSourceRole;
  fitKind: AudioMaterialInterpretationFitKind;
  durationSec: number;
  rmsMean: number;
  rmsVariance: number;
  transientScore: number;
  brightnessScore: number;
  sustainScore: number;
  smoothness: number;
  articulation: number;
  carrierReading: AudioMaterialCarrierReading;
  summary: string;
};

export type AudioMaterialBufferAnalysisInput = {
  route?: AudioMaterialInterpretationRoute;
  sourceRole?: AudioMaterialSourceRole;
  durationSec?: number;
  name?: string;
};

export type AudioMaterialSampleAnalysisInput = AudioMaterialBufferAnalysisInput & {
  samples: Float32Array | readonly number[];
  sampleRate: number;
  startSec?: number;
  durationSec?: number;
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function clampUnit(value: number) {
  return clamp(value, 0, 1);
}

function normalizeRoute(value: unknown): AudioMaterialInterpretationRoute {
  return value === 'spectralforge-carrier-donor' ? 'spectralforge-carrier-donor' : 'direct-root-follow-audio';
}

function normalizeRole(value: unknown): AudioMaterialSourceRole {
  return value === 'root-follow-audio' || value === 'spectralforge-donor' || value === 'spectralforge-render' || value === 'unknown'
    ? value
    : 'unknown';
}

function normalizeWeights(weights: AudioMaterialRoleWeights): AudioMaterialRoleWeights {
  const ordered = Math.max(0, weights.ordered);
  const body = Math.max(0, weights.body);
  const residual = Math.max(0, weights.residual);
  const transient = Math.max(0, weights.transient);
  const sum = Math.max(0.0001, ordered + body + residual + transient);
  return {
    ordered: ordered / sum,
    body: body / sum,
    residual: residual / sum,
    transient: transient / sum,
  };
}

export function buildAudioMaterialInterpretationProfileFromStats(args: {
  route?: AudioMaterialInterpretationRoute;
  sourceRole?: AudioMaterialSourceRole;
  durationSec: number;
  rmsMean: number;
  rmsVariance: number;
  transientScore: number;
  brightnessScore: number;
  sustainScore: number;
}): AudioMaterialInterpretationProfile {
  const route = normalizeRoute(args.route);
  const sourceRole = normalizeRole(args.sourceRole);
  const transientScore = clampUnit(args.transientScore);
  const brightnessScore = clampUnit(args.brightnessScore);
  const sustainScore = clampUnit(args.sustainScore);
  const directSmoothBias = clampUnit(1 - transientScore * 0.62 - brightnessScore * 0.22 + sustainScore * 0.18);
  const directArticulation = clampUnit(transientScore * 0.72 + brightnessScore * 0.28);
  const carrierRespect = route === 'spectralforge-carrier-donor'
    ? clampUnit(0.72 + directSmoothBias * 0.22 - directArticulation * 0.08)
    : clampUnit(0.48 + directSmoothBias * 0.32);
  const donorMaterialLoad = route === 'spectralforge-carrier-donor'
    ? clampUnit(0.38 + brightnessScore * 0.22 + transientScore * 0.18 + (1 - sustainScore) * 0.08)
    : clampUnit(0.58 + directArticulation * 0.28);
  const smoothness = route === 'spectralforge-carrier-donor'
    ? clampUnit(directSmoothBias * 0.78 + carrierRespect * 0.22)
    : directSmoothBias;
  const articulation = route === 'spectralforge-carrier-donor'
    ? clampUnit(directArticulation * 0.72 + donorMaterialLoad * 0.18)
    : directArticulation;
  const useFragment = articulation > 0.68 && smoothness < 0.74;
  const fitKind: AudioMaterialInterpretationFitKind = route === 'spectralforge-carrier-donor'
    ? smoothness > 0.72
      ? 'synthetic-smoothness'
      : useFragment
        ? 'articulated-fragment'
        : 'coherent-body'
    : useFragment
      ? transientScore > 0.72 ? 'transient-texture' : 'articulated-fragment'
      : smoothness > 0.78 ? 'synthetic-smoothness' : 'coherent-body';

  const roleWeights = normalizeWeights({
    ordered: 0.22 + smoothness * 0.48 + sustainScore * 0.18,
    body: 0.34 + sustainScore * 0.42 + carrierRespect * 0.16,
    residual: 0.16 + brightnessScore * 0.38 + (1 - sustainScore) * 0.16,
    transient: 0.12 + transientScore * 0.58 + articulation * 0.22,
  });

  const carrierReading: AudioMaterialCarrierReading = {
    carrierRespect,
    donorMaterialLoad,
    attackBias: clampUnit(0.18 + transientScore * 0.68 + brightnessScore * 0.12),
    releaseBias: clampUnit(0.2 + sustainScore * 0.58 + smoothness * 0.22),
    brightnessBias: brightnessScore,
    residualDust: clampUnit(brightnessScore * 0.55 + (1 - sustainScore) * 0.26 + donorMaterialLoad * 0.12),
    transientPulse: clampUnit(transientScore * 0.74 + articulation * 0.2),
    bodyContinuity: clampUnit(sustainScore * 0.52 + smoothness * 0.36 + carrierRespect * 0.12),
    roleWeights,
  };

  const routeLabel = route === 'spectralforge-carrier-donor' ? 'SpectralForge Carrier/Donor' : 'Raw Audio Root Follow';
  const roleLabel = sourceRole === 'spectralforge-donor'
    ? 'Donor-Import'
    : sourceRole === 'spectralforge-render'
      ? 'gerenderter Carrier-Körper'
      : sourceRole === 'root-follow-audio'
        ? 'Root-Follow-Audio'
        : 'Audio-Material';
  const fitLabel = fitKind === 'synthetic-smoothness'
    ? 'glatte Körper-Lesart'
    : fitKind === 'coherent-body'
      ? 'kohärente Körper-Lesart'
      : fitKind === 'transient-texture'
        ? 'Transienten-Textur-Lesart'
        : 'artikulierte Fragment-Lesart';

  return {
    version: 1,
    route,
    sourceRole,
    fitKind,
    durationSec: Math.max(0, args.durationSec),
    rmsMean: Math.max(0, args.rmsMean),
    rmsVariance: Math.max(0, args.rmsVariance),
    transientScore,
    brightnessScore,
    sustainScore,
    smoothness,
    articulation,
    carrierReading,
    summary: `${routeLabel} · ${roleLabel}: ${fitLabel} · Transienten ${(transientScore * 100).toFixed(0)}% · Helligkeit ${(brightnessScore * 100).toFixed(0)}% · Sustain ${(sustainScore * 100).toFixed(0)}%`,
  };
}

function analyzeSampleRange(samples: Float32Array | readonly number[], sampleRate: number, input: AudioMaterialBufferAnalysisInput & { startSec?: number; durationSec?: number } = {}) {
  const safeSampleRate = Math.max(1, Number.isFinite(sampleRate) ? sampleRate : 44100);
  const startIndex = Math.max(0, Math.floor(Math.max(0, input.startSec ?? 0) * safeSampleRate));
  const requestedEnd = input.durationSec && input.durationSec > 0
    ? startIndex + Math.floor(input.durationSec * safeSampleRate)
    : samples.length;
  const endIndex = Math.max(startIndex + 1, Math.min(samples.length, requestedEnd));
  const length = Math.max(1, endIndex - startIndex);
  const frameSize = Math.max(512, Math.min(2048, Math.floor(safeSampleRate * 0.046)));
  const hop = Math.max(256, Math.floor(frameSize / 2));
  const maxFrames = 1400;
  const frameLimit = Math.min(maxFrames, Math.max(1, Math.floor((length - frameSize) / hop)));
  let previousRms = 0;
  let rmsSum = 0;
  let rmsSqSum = 0;
  let riseSum = 0;
  let riseCount = 0;
  let zcrSum = 0;
  let activeFrames = 0;

  for (let frame = 0; frame < frameLimit; frame += 1) {
    const offset = startIndex + frame * hop;
    let energy = 0;
    let crossings = 0;
    let lastSample = 0;
    for (let i = 0; i < frameSize && offset + i < endIndex; i += 1) {
      const sample = Number(samples[offset + i] ?? 0);
      energy += sample * sample;
      if (i > 0 && Math.sign(sample) !== Math.sign(lastSample) && Math.abs(sample - lastSample) > 0.0005) crossings += 1;
      lastSample = sample;
    }
    const rms = Math.sqrt(energy / frameSize);
    rmsSum += rms;
    rmsSqSum += rms * rms;
    if (rms > 0.004) activeFrames += 1;
    const rise = Math.max(0, rms - previousRms);
    if (rise > 0.002) {
      riseSum += rise;
      riseCount += 1;
    }
    zcrSum += crossings / frameSize;
    previousRms = rms;
  }

  const frames = Math.max(1, frameLimit);
  const rmsMean = rmsSum / frames;
  const rmsVariance = Math.max(0, rmsSqSum / frames - rmsMean * rmsMean);
  const activeRatio = activeFrames / frames;
  const transientScore = clampUnit((riseSum / Math.max(1, riseCount)) / Math.max(0.006, rmsMean) * 0.72 + Math.sqrt(rmsVariance) / Math.max(0.006, rmsMean) * 0.18);
  const brightnessScore = clampUnit((zcrSum / frames) * 22);
  const sustainScore = clampUnit(activeRatio * 0.82 + (1 - transientScore) * 0.18);
  const durationSec = Math.max(0, length / safeSampleRate);
  return buildAudioMaterialInterpretationProfileFromStats({
    route: input.route,
    sourceRole: input.sourceRole,
    durationSec,
    rmsMean,
    rmsVariance,
    transientScore,
    brightnessScore,
    sustainScore,
  });
}

export function analyzeAudioMaterialSamplesProfile(input: AudioMaterialSampleAnalysisInput): AudioMaterialInterpretationProfile {
  return analyzeSampleRange(input.samples, input.sampleRate, input);
}

export function analyzeAudioMaterialBufferProfile(
  decoded: AudioBuffer,
  input: AudioMaterialBufferAnalysisInput = {},
): AudioMaterialInterpretationProfile {
  const channelCount = Math.max(1, Math.min(decoded.numberOfChannels, 2));
  const mono = new Float32Array(decoded.length);
  for (let ch = 0; ch < channelCount; ch += 1) {
    const data = decoded.getChannelData(ch);
    for (let i = 0; i < decoded.length; i += 1) mono[i] += (data[i] ?? 0) / channelCount;
  }
  return analyzeSampleRange(mono, decoded.sampleRate, {
    ...input,
    durationSec: input.durationSec ?? decoded.duration,
  });
}

export function serializeAudioMaterialInterpretationProfile(profile: AudioMaterialInterpretationProfile | null | undefined): string | undefined {
  if (!profile) return undefined;
  return JSON.stringify(profile);
}

export function parseAudioMaterialInterpretationProfile(value: unknown): AudioMaterialInterpretationProfile | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const raw = JSON.parse(value) as Partial<AudioMaterialInterpretationProfile>;
    const base = buildAudioMaterialInterpretationProfileFromStats({
      route: normalizeRoute(raw.route),
      sourceRole: normalizeRole(raw.sourceRole),
      durationSec: Number(raw.durationSec) || 0,
      rmsMean: Number(raw.rmsMean) || 0,
      rmsVariance: Number(raw.rmsVariance) || 0,
      transientScore: clampUnit(Number(raw.transientScore) || 0),
      brightnessScore: clampUnit(Number(raw.brightnessScore) || 0),
      sustainScore: clampUnit(Number(raw.sustainScore) || 0),
    });
    return {
      ...base,
      fitKind: raw.fitKind === 'synthetic-smoothness' || raw.fitKind === 'coherent-body' || raw.fitKind === 'articulated-fragment' || raw.fitKind === 'transient-texture'
        ? raw.fitKind
        : base.fitKind,
      smoothness: Number.isFinite(raw.smoothness) ? clampUnit(Number(raw.smoothness)) : base.smoothness,
      articulation: Number.isFinite(raw.articulation) ? clampUnit(Number(raw.articulation)) : base.articulation,
      carrierReading: raw.carrierReading && typeof raw.carrierReading === 'object'
        ? raw.carrierReading as AudioMaterialCarrierReading
        : base.carrierReading,
      summary: typeof raw.summary === 'string' && raw.summary ? raw.summary : base.summary,
    };
  } catch {
    return null;
  }
}
