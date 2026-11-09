import { analyzeAudioMaterialBufferProfile, buildAudioMaterialInterpretationProfileFromStats, type AudioMaterialInterpretationProfile, type AudioMaterialInterpretationRoute } from '../audioMaterial/audioMaterialInterpretationProfile';
export type RootFollowGranulationMode = 'flowing' | 'grainy';
export type RootFollowGranularPresetName = 'smooth' | RootFollowGranulationMode;
export type RootFollowGranularPresetId = RootFollowGranularPresetName | 'custom';
export type RootFollowGranularQualityMode = 'base' | 'fragment';
export type RootFollowGranularPowerMode = 'safe' | 'balanced' | 'rich' | 'edge' | 'custom';

export type RootFollowGranularSettings = {
  preset: RootFollowGranularPresetId;
  powerMode: RootFollowGranularPowerMode;
  windowMs: number;
  stepMs: number;
  leadMs: number;
  startLeadMs: number;
  qualityMode: RootFollowGranularQualityMode;
  microDensity: number;
  sourceSpread: number;
  jitter: number;
  maxGrainsPerWindow: number;
};

export type RootFollowGranularRenderTuning = {
  grainWindowScale: number;
  grainSpacingScale: number;
  jitterScale: number;
  sourceDurationScale: number;
  maxGrains: number;
  microCutSafety: boolean;
  microCutSearchRadiusMs: number;
  sourceStartGuardMs: number;
  grainTimeDitherMs: number;
  grainSourceDitherMs: number;
};

export type RootFollowGranularFitRoute = AudioMaterialInterpretationRoute;

export type RootFollowGranularBridgeProfile = {
  version: 1;
  route: RootFollowGranularFitRoute;
  fitKind: 'synthetic-smoothness' | 'coherent-body' | 'articulated-fragment' | 'transient-texture';
  smoothness: number;
  articulation: number;
  brightness: number;
  sustain: number;
  carrierRespect: number;
  donorMaterialLoad: number;
  recommendedSettings: RootFollowGranularSettings;
  summary: string;
  materialProfile: AudioMaterialInterpretationProfile;
};

export type RootFollowGranularAudioProfile = {
  durationSec: number;
  rmsMean: number;
  rmsVariance: number;
  transientScore: number;
  brightnessScore: number;
  sustainScore: number;
  fitRoute: RootFollowGranularFitRoute;
  bridgeProfile: RootFollowGranularBridgeProfile;
  recommendedSettings: RootFollowGranularSettings;
  summary: string;
  materialProfile: AudioMaterialInterpretationProfile;
};

export type RootFollowGranularAnalysisInput = {
  blob: Blob;
  durationSec?: number;
  bars?: number;
  name?: string;
  route?: RootFollowGranularFitRoute;
};

export type RootFollowGranularBufferAnalysisInput = Omit<RootFollowGranularAnalysisInput, 'blob'>;

export const ROOT_FOLLOW_GRANULAR_LIMITS = {
  windowMs: { min: 24, max: 120 },
  stepMs: { min: 8, max: 56 },
  leadMs: { min: 24, max: 132 },
  startLeadMs: { min: 8, max: 56 },
  microDensity: { min: 0.55, max: 1.85 },
  sourceSpread: { min: 0.58, max: 1.55 },
  jitter: { min: 0, max: 1.2 },
  maxGrainsPerWindow: { min: 6, max: 48 },
} as const;

export const ROOT_FOLLOW_GRANULAR_CHARACTER_PRESETS: readonly RootFollowGranularPresetName[] = ['smooth', 'flowing', 'grainy'] as const;

export const ROOT_FOLLOW_GRANULAR_POWER_MODES: Record<RootFollowGranularPowerMode, Omit<RootFollowGranularSettings, 'preset' | 'qualityMode'>> = {
  safe: {
    powerMode: 'safe',
    windowMs: 78,
    stepMs: 40,
    leadMs: 58,
    startLeadMs: 18,
    microDensity: 0.72,
    sourceSpread: 0.72,
    jitter: 0.06,
    maxGrainsPerWindow: 10,
  },
  balanced: {
    powerMode: 'balanced',
    windowMs: 68,
    stepMs: 32,
    leadMs: 64,
    startLeadMs: 18,
    microDensity: 0.92,
    sourceSpread: 0.86,
    jitter: 0.14,
    maxGrainsPerWindow: 18,
  },
  rich: {
    powerMode: 'rich',
    windowMs: 58,
    stepMs: 26,
    leadMs: 72,
    startLeadMs: 22,
    microDensity: 1.16,
    sourceSpread: 1.02,
    jitter: 0.24,
    maxGrainsPerWindow: 28,
  },
  edge: {
    powerMode: 'edge',
    windowMs: 50,
    stepMs: 22,
    leadMs: 84,
    startLeadMs: 24,
    microDensity: 1.28,
    sourceSpread: 1.18,
    jitter: 0.48,
    maxGrainsPerWindow: 34,
  },
  custom: {
    powerMode: 'custom',
    windowMs: 68,
    stepMs: 32,
    leadMs: 64,
    startLeadMs: 18,
    microDensity: 0.92,
    sourceSpread: 0.86,
    jitter: 0.14,
    maxGrainsPerWindow: 18,
  },
};

export const ROOT_FOLLOW_GRANULAR_PRESETS: Record<RootFollowGranularPresetName, RootFollowGranularSettings> = {
  smooth: {
    preset: 'smooth',
    powerMode: 'safe',
    windowMs: 92,
    stepMs: 42,
    leadMs: 58,
    startLeadMs: 18,
    qualityMode: 'base',
    microDensity: 0.74,
    sourceSpread: 0.66,
    jitter: 0.004,
    maxGrainsPerWindow: 10,
  },
  flowing: {
    preset: 'flowing',
    powerMode: 'balanced',
    windowMs: 70,
    stepMs: 32,
    leadMs: 64,
    startLeadMs: 18,
    qualityMode: 'base',
    microDensity: 0.92,
    sourceSpread: 0.86,
    jitter: 0.12,
    maxGrainsPerWindow: 18,
  },
  grainy: {
    preset: 'grainy',
    powerMode: 'rich',
    windowMs: 48,
    stepMs: 24,
    leadMs: 68,
    startLeadMs: 22,
    qualityMode: 'fragment',
    microDensity: 1.18,
    sourceSpread: 1.12,
    jitter: 0.48,
    maxGrainsPerWindow: 30,
  },
};

export const ROOT_FOLLOW_GRANULAR_ELECTRON_FRAGMENT_PRESET: RootFollowGranularSettings = {
  preset: 'custom',
  powerMode: 'custom',
  windowMs: 120,
  stepMs: 8,
  leadMs: 131,
  startLeadMs: 8,
  qualityMode: 'fragment',
  microDensity: 1.85,
  sourceSpread: 1.53,
  jitter: 0.61,
  maxGrainsPerWindow: 35,
};

const ROOT_FOLLOW_GRANULAR_STARTUP_PRESET_STORAGE_KEY = 'xensonar.rootFollow.granular.startupPreset.v1';

export function cloneRootFollowElectronFragmentPreset(): RootFollowGranularSettings {
  return { ...ROOT_FOLLOW_GRANULAR_ELECTRON_FRAGMENT_PRESET };
}

export function isXensonarElectronRuntime(): boolean {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return /\bElectron\//.test(userAgent);
}

export function shouldUseRootFollowElectronFragmentStartupPreset(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(ROOT_FOLLOW_GRANULAR_STARTUP_PRESET_STORAGE_KEY);
      if (stored === 'electron-fragment') return true;
      if (stored === 'browser-flowing') return false;
    } catch {}
  }
  return isXensonarElectronRuntime();
}

export function createRootFollowGranularStartupSettings(fallbackMode: RootFollowGranulationMode = 'flowing'): RootFollowGranularSettings {
  if (shouldUseRootFollowElectronFragmentStartupPreset()) return cloneRootFollowElectronFragmentPreset();
  return { ...ROOT_FOLLOW_GRANULAR_PRESETS[fallbackMode] };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, numeric));
}

function clampInteger(value: unknown, min: number, max: number, fallback: number) {
  return Math.round(clampNumber(value, min, max, fallback));
}

function normalizePreset(value: unknown, fallback: RootFollowGranularPresetId): RootFollowGranularPresetId {
  return value === 'smooth' || value === 'flowing' || value === 'grainy' || value === 'custom'
    ? value
    : fallback;
}

function normalizePowerMode(value: unknown, fallback: RootFollowGranularPowerMode): RootFollowGranularPowerMode {
  return value === 'safe' || value === 'balanced' || value === 'rich' || value === 'edge' || value === 'custom'
    ? value
    : fallback;
}

function clampUnit(value: number) {
  return Math.max(0, Math.min(1, value));
}

function getFallbackPreset(fallbackMode: RootFollowGranulationMode): RootFollowGranularSettings {
  return ROOT_FOLLOW_GRANULAR_PRESETS[fallbackMode];
}

export function cloneRootFollowGranularPreset(mode: RootFollowGranularPresetName): RootFollowGranularSettings {
  return { ...ROOT_FOLLOW_GRANULAR_PRESETS[mode] };
}

export function applyRootFollowGranularPowerMode(
  settings: Partial<RootFollowGranularSettings> | null | undefined,
  powerMode: Exclude<RootFollowGranularPowerMode, 'custom'>,
  fallbackMode: RootFollowGranulationMode = 'flowing',
): RootFollowGranularSettings {
  const base = normalizeRootFollowGranularSettings(settings, fallbackMode);
  const power = ROOT_FOLLOW_GRANULAR_POWER_MODES[powerMode];
  return normalizeRootFollowGranularSettings({
    ...base,
    ...power,
    powerMode,
    preset: 'custom',
    qualityMode: base.qualityMode,
  }, fallbackMode);
}

export function normalizeRootFollowGranularSettings(
  value: Partial<RootFollowGranularSettings> | null | undefined,
  fallbackMode: RootFollowGranulationMode = 'flowing',
): RootFollowGranularSettings {
  const fallback = getFallbackPreset(fallbackMode);
  const preset = normalizePreset(value?.preset, fallback.preset);
  const powerMode = normalizePowerMode(value?.powerMode, fallback.powerMode);
  return {
    preset,
    powerMode,
    windowMs: clampNumber(value?.windowMs, ROOT_FOLLOW_GRANULAR_LIMITS.windowMs.min, ROOT_FOLLOW_GRANULAR_LIMITS.windowMs.max, fallback.windowMs),
    stepMs: clampNumber(value?.stepMs, ROOT_FOLLOW_GRANULAR_LIMITS.stepMs.min, ROOT_FOLLOW_GRANULAR_LIMITS.stepMs.max, fallback.stepMs),
    leadMs: clampNumber(value?.leadMs, ROOT_FOLLOW_GRANULAR_LIMITS.leadMs.min, ROOT_FOLLOW_GRANULAR_LIMITS.leadMs.max, fallback.leadMs),
    startLeadMs: clampNumber(value?.startLeadMs, ROOT_FOLLOW_GRANULAR_LIMITS.startLeadMs.min, ROOT_FOLLOW_GRANULAR_LIMITS.startLeadMs.max, fallback.startLeadMs),
    qualityMode: value?.qualityMode === 'fragment' ? 'fragment' : value?.qualityMode === 'base' ? 'base' : fallback.qualityMode,
    microDensity: clampNumber(value?.microDensity, ROOT_FOLLOW_GRANULAR_LIMITS.microDensity.min, ROOT_FOLLOW_GRANULAR_LIMITS.microDensity.max, fallback.microDensity),
    sourceSpread: clampNumber(value?.sourceSpread, ROOT_FOLLOW_GRANULAR_LIMITS.sourceSpread.min, ROOT_FOLLOW_GRANULAR_LIMITS.sourceSpread.max, fallback.sourceSpread),
    jitter: clampNumber(value?.jitter, ROOT_FOLLOW_GRANULAR_LIMITS.jitter.min, ROOT_FOLLOW_GRANULAR_LIMITS.jitter.max, fallback.jitter),
    maxGrainsPerWindow: clampInteger(value?.maxGrainsPerWindow, ROOT_FOLLOW_GRANULAR_LIMITS.maxGrainsPerWindow.min, ROOT_FOLLOW_GRANULAR_LIMITS.maxGrainsPerWindow.max, fallback.maxGrainsPerWindow),
  };
}

export function resolveRootFollowGranularSettings(
  settings: Partial<RootFollowGranularSettings> | null | undefined,
  mode: RootFollowGranulationMode = 'flowing',
): RootFollowGranularSettings {
  return normalizeRootFollowGranularSettings(settings, mode);
}

export function formatRootFollowGranularPresetLabel(settings: RootFollowGranularSettings): string {
  if (settings.preset === 'smooth') return 'Glatt';
  if (settings.preset === 'flowing') return 'Fließend';
  if (settings.preset === 'grainy') return 'Körnig';
  return 'Custom';
}

export function formatRootFollowGranularPowerLabel(powerMode: RootFollowGranularPowerMode): string {
  if (powerMode === 'safe') return 'Direkt';
  if (powerMode === 'balanced') return 'Live';
  if (powerMode === 'rich') return 'Körper';
  if (powerMode === 'edge') return 'Kante';
  return 'Custom';
}

export function estimateRootFollowGranularDensity(settings: RootFollowGranularSettings): number {
  return Math.max(1, settings.windowMs / Math.max(1, settings.stepMs)) * Math.max(0.1, settings.microDensity);
}

export function estimateRootFollowGranularLoad(settings: RootFollowGranularSettings): number {
  const density = estimateRootFollowGranularDensity(settings);
  const qualityFactor = settings.qualityMode === 'fragment' ? 1.35 : 1;
  const spreadFactor = 0.82 + settings.sourceSpread * 0.18;
  const grainFactor = Math.max(0.5, settings.maxGrainsPerWindow / 32);
  return density * qualityFactor * spreadFactor * grainFactor;
}

export function formatRootFollowGranularDensityIndex(settings: RootFollowGranularSettings): string {
  const index = estimateRootFollowGranularLoad(settings);
  const label = index < 1.35 ? 'direkt' : index < 2.4 ? 'live' : index < 3.6 ? 'koerper' : 'kante';
  return `${label} · ${index.toFixed(2)}`;
}

export function blendRootFollowGranularSettings(
  current: RootFollowGranularSettings,
  target: RootFollowGranularSettings,
  amount = 0.62,
): RootFollowGranularSettings {
  const blend = Math.max(0, Math.min(1, amount));
  const mix = (a: number, b: number) => a + (b - a) * blend;
  return normalizeRootFollowGranularSettings({
    preset: 'custom',
    powerMode: 'custom',
    qualityMode: blend >= 0.5 ? target.qualityMode : current.qualityMode,
    windowMs: Math.round(mix(current.windowMs, target.windowMs)),
    stepMs: Math.round(mix(current.stepMs, target.stepMs)),
    leadMs: Math.round(mix(current.leadMs, target.leadMs)),
    startLeadMs: Math.round(mix(current.startLeadMs, target.startLeadMs)),
    microDensity: Number(mix(current.microDensity, target.microDensity).toFixed(2)),
    sourceSpread: Number(mix(current.sourceSpread, target.sourceSpread).toFixed(2)),
    jitter: Number(mix(current.jitter, target.jitter).toFixed(3)),
    maxGrainsPerWindow: Math.round(mix(current.maxGrainsPerWindow, target.maxGrainsPerWindow)),
  }, target.qualityMode === 'fragment' ? 'grainy' : 'flowing');
}

export function formatRootFollowGranularProfileLine(profile: RootFollowGranularAudioProfile | null | undefined): string {
  if (!profile) return '';
  const material = profile.materialProfile;
  const reading = material.carrierReading;
  const routeLabel = profile.fitRoute === 'spectralforge-carrier-donor' ? 'Carrier/Donor' : 'Raw Audio';
  return `${routeLabel}: Glätte ${(material.smoothness * 100).toFixed(0)}% · Artikulation ${(material.articulation * 100).toFixed(0)}% · Trägerbindung ${(reading.carrierRespect * 100).toFixed(0)}% · Donorlast ${(reading.donorMaterialLoad * 100).toFixed(0)}%`;
}

export function buildRootFollowGranularRenderTuning(settings: RootFollowGranularSettings): RootFollowGranularRenderTuning {
  const windowNorm = settings.windowMs / ROOT_FOLLOW_GRANULAR_PRESETS.flowing.windowMs;
  const stepNorm = settings.stepMs / ROOT_FOLLOW_GRANULAR_PRESETS.flowing.stepMs;
  const smoothBias = settings.qualityMode === 'base'
    ? Math.max(0, (settings.windowMs - 64) / 56) + Math.max(0, (0.82 - settings.sourceSpread) * 0.42)
    : 0;
  const requestedMaxGrains = Math.max(1, Math.round(settings.maxGrainsPerWindow));
  const realtimeCeilingPerSecond = settings.preset === 'smooth' || (settings.qualityMode === 'base' && settings.jitter < 0.04)
    ? 320
    : settings.qualityMode === 'fragment'
      ? 480
      : 400;
  const realtimeWindowCap = Math.max(5, Math.round((realtimeCeilingPerSecond * Math.max(8, settings.stepMs)) / 1000));
  return {
    grainWindowScale: Math.max(0.72, Math.min(1.48, 0.9 + (windowNorm - 1) * 0.28 + smoothBias * 0.10)),
    grainSpacingScale: Math.max(0.52, Math.min(2.2, stepNorm / Math.max(0.7, settings.microDensity))),
    jitterScale: Math.max(0, settings.jitter),
    sourceDurationScale: Math.max(0.5, Math.min(1.85, settings.sourceSpread)),
    maxGrains: Math.max(1, Math.min(requestedMaxGrains, realtimeWindowCap)),
    microCutSafety: true,
    microCutSearchRadiusMs: settings.qualityMode === 'fragment'
      ? Math.max(3.0, Math.min(6.5, 6.2 - settings.jitter * 1.2))
      : Math.max(4.5, Math.min(9.5, 6.8 + Math.max(0, settings.windowMs - 64) * 0.026 - settings.jitter * 0.65)),
    sourceStartGuardMs: settings.qualityMode === 'fragment'
      ? Math.max(0.8, Math.min(2.2, 1.7 - settings.jitter * 0.35))
      : Math.max(1.0, Math.min(3.2, 1.9 + Math.max(0, settings.windowMs - 64) * 0.018 - settings.jitter * 0.45)),
    grainTimeDitherMs: settings.qualityMode === 'fragment'
      ? Math.max(0.55, Math.min(1.8, 0.85 + settings.jitter * 0.55))
      : Math.max(0.35, Math.min(1.25, settings.preset === 'smooth' ? 0.62 : 0.48 + settings.jitter * 0.38)),
    grainSourceDitherMs: settings.qualityMode === 'fragment'
      ? Math.max(1.2, Math.min(4.2, 2.0 + settings.jitter * 1.05))
      : Math.max(0.9, Math.min(3.2, settings.preset === 'smooth' ? 1.55 : 1.25 + settings.jitter * 0.72)),
  };
}

function makeAudioContext(): AudioContext {
  const AudioContextCtor = globalThis.AudioContext ?? (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) throw new Error('AudioContext nicht verfügbar');
  return new AudioContextCtor();
}

function buildRootFollowGranularSettingsFromMaterialProfile(materialProfile: AudioMaterialInterpretationProfile): RootFollowGranularSettings {
  const smoothness = materialProfile.smoothness;
  const articulation = materialProfile.articulation;
  const brightness = materialProfile.brightnessScore;
  const sustain = materialProfile.sustainScore;
  const syntheticFit = materialProfile.fitKind === 'synthetic-smoothness';
  const useFragment = materialProfile.fitKind === 'transient-texture' || (materialProfile.fitKind === 'articulated-fragment' && smoothness < 0.72);
  const spectralRoute = materialProfile.route === 'spectralforge-carrier-donor';
  const resolutionBias = Math.max(0, Math.min(1, smoothness * 0.62 + sustain * 0.26 + (spectralRoute ? materialProfile.carrierReading.carrierRespect * 0.12 : 0.06)));
  return normalizeRootFollowGranularSettings({
    preset: 'custom',
    powerMode: syntheticFit || resolutionBias > 0.78 ? 'edge' : smoothness > 0.68 ? 'rich' : articulation > 0.74 ? 'rich' : 'balanced',
    qualityMode: useFragment ? 'fragment' : 'base',
    windowMs: Math.round(syntheticFit
      ? 84 + resolutionBias * 18 - articulation * 5
      : spectralRoute
        ? 58 + smoothness * 34 - articulation * 6
        : 48 + smoothness * 38 - articulation * 8),
    stepMs: Math.round(syntheticFit
      ? 24 - resolutionBias * 4 + articulation * 2
      : spectralRoute
        ? 24 - smoothness * 5 + articulation * 4
        : 26 - smoothness * 7 + articulation * 5),
    leadMs: Math.round(82 + resolutionBias * 36 + articulation * 6),
    startLeadMs: Math.round(24 + resolutionBias * 14 + articulation * 3),
    microDensity: Number((1.08 + resolutionBias * 0.42 + articulation * 0.08).toFixed(2)),
    sourceSpread: Number((syntheticFit
      ? 0.64 + articulation * 0.22 + brightness * 0.08
      : spectralRoute
        ? 0.68 + articulation * 0.38 + brightness * 0.11
        : 0.72 + articulation * 0.54 + brightness * 0.15).toFixed(2)),
    jitter: Number((syntheticFit
      ? 0.006 + articulation * 0.12 + brightness * 0.025
      : spectralRoute
        ? 0.014 + articulation * 0.30 + brightness * 0.045
        : 0.03 + articulation * 0.50 + brightness * 0.075).toFixed(3)),
    maxGrainsPerWindow: Math.round(12 + resolutionBias * 12 + articulation * 4),
  }, useFragment ? 'grainy' : 'flowing');
}

function buildRootFollowGranularBridgeProfile(materialProfile: AudioMaterialInterpretationProfile): RootFollowGranularBridgeProfile {
  const recommendedSettings = buildRootFollowGranularSettingsFromMaterialProfile(materialProfile);
  return {
    version: 1,
    route: materialProfile.route,
    fitKind: materialProfile.fitKind,
    smoothness: materialProfile.smoothness,
    articulation: materialProfile.articulation,
    brightness: materialProfile.brightnessScore,
    sustain: materialProfile.sustainScore,
    carrierRespect: materialProfile.carrierReading.carrierRespect,
    donorMaterialLoad: materialProfile.carrierReading.donorMaterialLoad,
    recommendedSettings,
    summary: materialProfile.summary,
    materialProfile,
  };
}

export function serializeRootFollowGranularAudioProfile(profile: RootFollowGranularAudioProfile | null | undefined): string | undefined {
  if (!profile) return undefined;
  return JSON.stringify({
    durationSec: profile.durationSec,
    rmsMean: profile.rmsMean,
    rmsVariance: profile.rmsVariance,
    transientScore: profile.transientScore,
    brightnessScore: profile.brightnessScore,
    sustainScore: profile.sustainScore,
    fitRoute: profile.fitRoute,
    bridgeProfile: profile.bridgeProfile,
    materialProfile: profile.materialProfile,
    recommendedSettings: profile.recommendedSettings,
    summary: profile.summary,
  });
}

export function parseRootFollowGranularAudioProfile(value: unknown): RootFollowGranularAudioProfile | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const raw = JSON.parse(value) as Partial<RootFollowGranularAudioProfile>;
    const fitRoute: RootFollowGranularFitRoute = raw.fitRoute === 'spectralforge-carrier-donor' ? 'spectralforge-carrier-donor' : 'direct-root-follow-audio';
    const baseMaterial = buildAudioMaterialInterpretationProfileFromStats({
      route: fitRoute,
      sourceRole: fitRoute === 'spectralforge-carrier-donor' ? 'spectralforge-render' : 'root-follow-audio',
      durationSec: Number(raw.durationSec) || 0,
      rmsMean: Number(raw.rmsMean) || 0,
      rmsVariance: Number(raw.rmsVariance) || 0,
      transientScore: clampUnit(Number(raw.transientScore) || 0),
      brightnessScore: clampUnit(Number(raw.brightnessScore) || 0),
      sustainScore: clampUnit(Number(raw.sustainScore) || 0),
    });
    const materialProfile: AudioMaterialInterpretationProfile = raw.materialProfile && typeof raw.materialProfile === 'object'
      ? { ...baseMaterial, ...(raw.materialProfile as Partial<AudioMaterialInterpretationProfile>), version: 1, route: fitRoute }
      : baseMaterial;
    const derivedBridge = buildRootFollowGranularBridgeProfile(materialProfile);
    const recommendedSettings = normalizeRootFollowGranularSettings(raw.recommendedSettings ?? derivedBridge.recommendedSettings, 'flowing');
    const bridgeProfile: RootFollowGranularBridgeProfile = {
      ...derivedBridge,
      ...(raw.bridgeProfile && typeof raw.bridgeProfile === 'object' ? raw.bridgeProfile as Partial<RootFollowGranularBridgeProfile> : null),
      version: 1,
      route: fitRoute,
      recommendedSettings,
      materialProfile,
    };
    return {
      durationSec: Number(raw.durationSec) || materialProfile.durationSec,
      rmsMean: Number(raw.rmsMean) || materialProfile.rmsMean,
      rmsVariance: Number(raw.rmsVariance) || materialProfile.rmsVariance,
      transientScore: clampUnit(Number(raw.transientScore) || materialProfile.transientScore),
      brightnessScore: clampUnit(Number(raw.brightnessScore) || materialProfile.brightnessScore),
      sustainScore: clampUnit(Number(raw.sustainScore) || materialProfile.sustainScore),
      fitRoute,
      bridgeProfile,
      materialProfile,
      recommendedSettings,
      summary: typeof raw.summary === 'string' && raw.summary ? raw.summary : bridgeProfile.summary,
    };
  } catch {
    return null;
  }
}

export function buildRootFollowGranularAudioProfileFromMaterialProfile(
  materialProfile: AudioMaterialInterpretationProfile,
): RootFollowGranularAudioProfile {
  const bridgeProfile = buildRootFollowGranularBridgeProfile(materialProfile);
  return {
    durationSec: materialProfile.durationSec,
    rmsMean: materialProfile.rmsMean,
    rmsVariance: materialProfile.rmsVariance,
    transientScore: materialProfile.transientScore,
    brightnessScore: materialProfile.brightnessScore,
    sustainScore: materialProfile.sustainScore,
    fitRoute: materialProfile.route,
    bridgeProfile,
    materialProfile,
    recommendedSettings: bridgeProfile.recommendedSettings,
    summary: bridgeProfile.summary,
  };
}

export function analyzeRootFollowGranularAudioBufferProfile(
  decoded: AudioBuffer,
  input: RootFollowGranularBufferAnalysisInput = {},
): RootFollowGranularAudioProfile {
  const fitRoute: RootFollowGranularFitRoute = input.route === 'spectralforge-carrier-donor' ? 'spectralforge-carrier-donor' : 'direct-root-follow-audio';
  const materialProfile = analyzeAudioMaterialBufferProfile(decoded, {
    route: fitRoute,
    sourceRole: fitRoute === 'spectralforge-carrier-donor' ? 'spectralforge-render' : 'root-follow-audio',
    durationSec: input.durationSec ?? decoded.duration,
    name: input.name,
  });
  return buildRootFollowGranularAudioProfileFromMaterialProfile(materialProfile);
}

export async function analyzeRootFollowGranularAudioProfile(input: RootFollowGranularAnalysisInput): Promise<RootFollowGranularAudioProfile> {
  const ctx = makeAudioContext();
  try {
    const arrayBuffer = await input.blob.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return analyzeRootFollowGranularAudioBufferProfile(decoded, input);
  } finally {
    void ctx.close().catch(() => undefined);
  }
}
