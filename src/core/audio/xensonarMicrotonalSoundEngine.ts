export type XensonarMicrotonalTuningId = '12edo' | '17edo' | '19edo' | '24edo' | '31edo' | '53edo' | 'ji';
export type XensonarMicrotonalSurface = 'wave' | 'particle' | 'spectral';

export type EntrophonFilterType = BiquadFilterType;

export type EntrophonSurfaceSoundConfig = {
  enabled: boolean;
  engineAmount: number;
  rootFreq: number;
  tuningId: XensonarMicrotonalTuningId;
  tuningStrength: number;
  waveform: OscillatorType;
  detune: number;
  unison: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  pitchBend: number;
  pitchBendTime: number;
  filterType: EntrophonFilterType;
  filterFreqBase: number;
  filterResonance: number;
  filterEnvAmount: number;
  filterDecay: number;
  delayAmount: number;
  reverbAmount: number;
  distortion: number;
  colorAmount: number;
  foldAmount: number;
  volume: number;
};

export type EntrophonUnifiedSoundConfig = Record<XensonarMicrotonalSurface, EntrophonSurfaceSoundConfig>;

export type XensonarMicrotonalVoiceConfig = {
  surface: XensonarMicrotonalSurface;
  freq: number;
  rootFreq?: number | null;
  tuningId?: XensonarMicrotonalTuningId;
  waveform?: OscillatorType;
  velocity?: number;
  detuneCents?: number;
  unison?: number;
  filterFreq?: number;
  filterQ?: number;
  tuningStrength?: number;
};

export type XensonarMicrotonalVoiceSpec = {
  tunedFreq: number;
  oscillatorFreqs: number[];
  waveform: OscillatorType;
  gainScale: number;
  volumeScale: number;
  filterType: EntrophonFilterType;
  filterFreq: number;
  filterQ: number;
  filterEnvAmount: number;
  filterDecay: number;
  drive: number;
  colorFreqs: number[];
  colorGains: number[];
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  pitchBend: number;
  pitchBendTime: number;
  delayAmount: number;
  reverbAmount: number;
  distortion: number;
  colorAmount: number;
  foldAmount: number;
  engineAmount: number;
  config: EntrophonSurfaceSoundConfig;
};

const JI_RATIOS = [
  1 / 1,
  16 / 15,
  9 / 8,
  6 / 5,
  5 / 4,
  4 / 3,
  45 / 32,
  3 / 2,
  8 / 5,
  5 / 3,
  9 / 5,
  15 / 8,
] as const;

const EDO_STEPS: Record<XensonarMicrotonalTuningId, number> = {
  '12edo': 12,
  '17edo': 17,
  '19edo': 19,
  '24edo': 24,
  '31edo': 31,
  '53edo': 53,
  ji: 12,
};

export const XENSONAR_MICROTONAL_ENGINE_VERSION = '116-wave-entrophon-live-voice-engine' as const;
export const ENTROPHON_SOUND_CONFIG_STORAGE_KEY = 'xensonar.entrophonUnifiedSoundConfig.v116' as const;

export const ENTROPHON_TUNING_OPTIONS: Array<{ id: XensonarMicrotonalTuningId; label: string }> = [
  { id: '12edo', label: '12-EDO' },
  { id: '17edo', label: '17-EDO' },
  { id: '19edo', label: '19-EDO' },
  { id: '24edo', label: '24-EDO' },
  { id: '31edo', label: '31-EDO' },
  { id: '53edo', label: '53-EDO' },
  { id: 'ji', label: 'JI' },
];

export const ENTROPHON_WAVEFORM_OPTIONS: OscillatorType[] = ['sine', 'triangle', 'sawtooth', 'square'];
export const ENTROPHON_FILTER_OPTIONS: EntrophonFilterType[] = ['lowpass', 'highpass', 'bandpass', 'notch'];

export const ENTROPHON_DEFAULT_SOUND_CONFIG: EntrophonUnifiedSoundConfig = {
  wave: {
    enabled: true,
    engineAmount: 1,
    rootFreq: 55,
    tuningId: '31edo',
    tuningStrength: 0,
    waveform: 'sawtooth',
    detune: 13.5,
    unison: 4,
    attack: 0.003,
    decay: 0.055,
    sustain: 0.32,
    release: 0.16,
    pitchBend: 0.42,
    pitchBendTime: 0.09,
    filterType: 'lowpass',
    filterFreqBase: 2600,
    filterResonance: 4.8,
    filterEnvAmount: 0.62,
    filterDecay: 0.08,
    delayAmount: 0.18,
    reverbAmount: 0.10,
    distortion: 0.52,
    colorAmount: 0.86,
    foldAmount: 0.48,
    volume: 1,
  },
  particle: {
    enabled: true,
    engineAmount: 1,
    rootFreq: 41.2,
    tuningId: '19edo',
    tuningStrength: 0,
    waveform: 'square',
    detune: 19,
    unison: 3,
    attack: 0.0012,
    decay: 0.035,
    sustain: 0.14,
    release: 0.075,
    pitchBend: -0.18,
    pitchBendTime: 0.045,
    filterType: 'bandpass',
    filterFreqBase: 4200,
    filterResonance: 8.8,
    filterEnvAmount: 0.72,
    filterDecay: 0.045,
    delayAmount: 0.08,
    reverbAmount: 0.04,
    distortion: 0.74,
    colorAmount: 0.92,
    foldAmount: 0.68,
    volume: 1.08,
  },
  spectral: {
    enabled: true,
    engineAmount: 1,
    rootFreq: 41.203,
    tuningId: '53edo',
    tuningStrength: 0.98,
    waveform: 'sawtooth',
    detune: 3.5,
    unison: 2,
    attack: 0.01,
    decay: 0.16,
    sustain: 0.42,
    release: 0.55,
    pitchBend: 0.08,
    pitchBendTime: 0.24,
    filterType: 'bandpass',
    filterFreqBase: 3400,
    filterResonance: 2.4,
    filterEnvAmount: 0.46,
    filterDecay: 0.19,
    delayAmount: 0.12,
    reverbAmount: 0.24,
    distortion: 0.38,
    colorAmount: 0.9,
    foldAmount: 0.58,
    volume: 1,
  },
};

let entrophonConfig: EntrophonUnifiedSoundConfig = cloneConfig(ENTROPHON_DEFAULT_SOUND_CONFIG);
const listeners = new Set<() => void>();
let storageLoaded = false;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

function cloneConfig(config: EntrophonUnifiedSoundConfig): EntrophonUnifiedSoundConfig {
  return {
    wave: { ...config.wave },
    particle: { ...config.particle },
    spectral: { ...config.spectral },
  };
}

function normaliseRoot(freq: number | null | undefined): number {
  const root = Number.isFinite(freq ?? NaN) ? Number(freq) : 55;
  return clamp(root, 20, 1200);
}

function resolveStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function loadStoredConfigOnce(): void {
  if (storageLoaded) return;
  storageLoaded = true;
  const storage = resolveStorage();
  if (!storage) return;
  try {
    const raw = storage.getItem(ENTROPHON_SOUND_CONFIG_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<Record<XensonarMicrotonalSurface, Partial<EntrophonSurfaceSoundConfig>>>;
    entrophonConfig = mergeConfig(parsed);
  } catch {
    entrophonConfig = cloneConfig(ENTROPHON_DEFAULT_SOUND_CONFIG);
  }
}

function saveStoredConfig(): void {
  const storage = resolveStorage();
  if (!storage) return;
  try {
    storage.setItem(ENTROPHON_SOUND_CONFIG_STORAGE_KEY, JSON.stringify(entrophonConfig));
  } catch {}
}

function sanitiseSurfaceConfig(surface: XensonarMicrotonalSurface, patch: Partial<EntrophonSurfaceSoundConfig>): EntrophonSurfaceSoundConfig {
  const fallback = ENTROPHON_DEFAULT_SOUND_CONFIG[surface];
  const cfg = { ...fallback, ...patch };
  return {
    enabled: cfg.enabled !== false,
    engineAmount: clamp((Number.isFinite(Number(cfg.engineAmount)) ? Number(cfg.engineAmount) : fallback.engineAmount), 0, 1),
    rootFreq: clamp((Number.isFinite(Number(cfg.rootFreq)) ? Number(cfg.rootFreq) : fallback.rootFreq), 20, 1200),
    tuningId: ENTROPHON_TUNING_OPTIONS.some((option) => option.id === cfg.tuningId) ? cfg.tuningId : fallback.tuningId,
    tuningStrength: clamp((Number.isFinite(Number(cfg.tuningStrength)) ? Number(cfg.tuningStrength) : fallback.tuningStrength), 0, 1),
    waveform: ENTROPHON_WAVEFORM_OPTIONS.includes(cfg.waveform) ? cfg.waveform : fallback.waveform,
    detune: clamp((Number.isFinite(Number(cfg.detune)) ? Number(cfg.detune) : fallback.detune), 0, 80),
    unison: Math.round(clamp((Number.isFinite(Number(cfg.unison)) ? Number(cfg.unison) : fallback.unison), 1, 6)),
    attack: clamp((Number.isFinite(Number(cfg.attack)) ? Number(cfg.attack) : fallback.attack), 0.0005, 0.5),
    decay: clamp((Number.isFinite(Number(cfg.decay)) ? Number(cfg.decay) : fallback.decay), 0.005, 2),
    sustain: clamp((Number.isFinite(Number(cfg.sustain)) ? Number(cfg.sustain) : fallback.sustain), 0, 1),
    release: clamp((Number.isFinite(Number(cfg.release)) ? Number(cfg.release) : fallback.release), 0.005, 4),
    pitchBend: clamp((Number.isFinite(Number(cfg.pitchBend)) ? Number(cfg.pitchBend) : fallback.pitchBend), -24, 24),
    pitchBendTime: clamp((Number.isFinite(Number(cfg.pitchBendTime)) ? Number(cfg.pitchBendTime) : fallback.pitchBendTime), 0.002, 4),
    filterType: ENTROPHON_FILTER_OPTIONS.includes(cfg.filterType) ? cfg.filterType : fallback.filterType,
    filterFreqBase: clamp((Number.isFinite(Number(cfg.filterFreqBase)) ? Number(cfg.filterFreqBase) : fallback.filterFreqBase), 40, 18000),
    filterResonance: clamp((Number.isFinite(Number(cfg.filterResonance)) ? Number(cfg.filterResonance) : fallback.filterResonance), 0.1, 26),
    filterEnvAmount: clamp((Number.isFinite(Number(cfg.filterEnvAmount)) ? Number(cfg.filterEnvAmount) : fallback.filterEnvAmount), 0, 1.5),
    filterDecay: clamp((Number.isFinite(Number(cfg.filterDecay)) ? Number(cfg.filterDecay) : fallback.filterDecay), 0.005, 3),
    delayAmount: clamp((Number.isFinite(Number(cfg.delayAmount)) ? Number(cfg.delayAmount) : fallback.delayAmount), 0, 1),
    reverbAmount: clamp((Number.isFinite(Number(cfg.reverbAmount)) ? Number(cfg.reverbAmount) : fallback.reverbAmount), 0, 1),
    distortion: clamp((Number.isFinite(Number(cfg.distortion)) ? Number(cfg.distortion) : fallback.distortion), 0, 1),
    colorAmount: clamp((Number.isFinite(Number(cfg.colorAmount)) ? Number(cfg.colorAmount) : fallback.colorAmount), 0, 1.5),
    foldAmount: clamp((Number.isFinite(Number(cfg.foldAmount)) ? Number(cfg.foldAmount) : fallback.foldAmount), 0, 1.5),
    volume: clamp((Number.isFinite(Number(cfg.volume)) ? Number(cfg.volume) : fallback.volume), 0, 2),
  };
}

function mergeConfig(partial: Partial<Record<XensonarMicrotonalSurface, Partial<EntrophonSurfaceSoundConfig>>>): EntrophonUnifiedSoundConfig {
  return {
    wave: sanitiseSurfaceConfig('wave', partial.wave ?? {}),
    particle: sanitiseSurfaceConfig('particle', partial.particle ?? {}),
    spectral: sanitiseSurfaceConfig('spectral', partial.spectral ?? {}),
  };
}

function notifyConfigChanged(): void {
  for (const listener of listeners) listener();
}

export function getEntrophonSoundConfig(): EntrophonUnifiedSoundConfig {
  loadStoredConfigOnce();
  return cloneConfig(entrophonConfig);
}

function readEntrophonSurfaceSoundConfig(surface: XensonarMicrotonalSurface): EntrophonSurfaceSoundConfig {
  loadStoredConfigOnce();
  return entrophonConfig[surface];
}

export function getEntrophonSurfaceSoundConfig(surface: XensonarMicrotonalSurface): EntrophonSurfaceSoundConfig {
  return { ...readEntrophonSurfaceSoundConfig(surface) };
}

export function setEntrophonSurfaceSoundConfig(surface: XensonarMicrotonalSurface, patch: Partial<EntrophonSurfaceSoundConfig>): EntrophonUnifiedSoundConfig {
  loadStoredConfigOnce();
  entrophonConfig = {
    ...entrophonConfig,
    [surface]: sanitiseSurfaceConfig(surface, { ...entrophonConfig[surface], ...patch }),
  };
  saveStoredConfig();
  notifyConfigChanged();
  return getEntrophonSoundConfig();
}

export function resetEntrophonSurfaceSoundConfig(surface: XensonarMicrotonalSurface): EntrophonUnifiedSoundConfig {
  loadStoredConfigOnce();
  entrophonConfig = {
    ...entrophonConfig,
    [surface]: { ...ENTROPHON_DEFAULT_SOUND_CONFIG[surface] },
  };
  saveStoredConfig();
  notifyConfigChanged();
  return getEntrophonSoundConfig();
}

export function resetEntrophonSoundConfig(): EntrophonUnifiedSoundConfig {
  entrophonConfig = cloneConfig(ENTROPHON_DEFAULT_SOUND_CONFIG);
  storageLoaded = true;
  saveStoredConfig();
  notifyConfigChanged();
  return getEntrophonSoundConfig();
}

export function subscribeEntrophonSoundConfig(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}


export type EntrophonWaveVoiceDemandEstimate = {
  active: boolean;
  baseOscillators: number;
  colorOscillators: number;
  delayTails: number;
  nodeCost: number;
  requestedVoiceMultiplier: number;
};

const ENTROPHON_WAVE_INACTIVE_DEMAND: EntrophonWaveVoiceDemandEstimate = {
  active: false,
  baseOscillators: 1,
  colorOscillators: 0,
  delayTails: 0,
  nodeCost: 1,
  requestedVoiceMultiplier: 1,
};

export function estimateEntrophonWaveVoiceDemand(): EntrophonWaveVoiceDemandEstimate {
  const cfg = readEntrophonSurfaceSoundConfig('wave');
  const active = cfg.enabled && cfg.engineAmount > 0.0001;
  if (!active) return ENTROPHON_WAVE_INACTIVE_DEMAND;

  const baseOscillators = Math.max(1, Math.min(6, Math.round(cfg.unison)));
  const colorOscillators = cfg.colorAmount * cfg.engineAmount > 0.025 ? 3 : 0;
  const delayTails = cfg.delayAmount > 0.002 ? 1 : 0;
  const nodeCost = baseOscillators + colorOscillators + delayTails * 1.35;
  // This is deliberately softer than raw oscillator count. A classic wave preset
  // already declares harmonic voices; Entrophon must tell the transient runtime
  // that each admitted voice is heavier without making the first attack sluggish.
  const requestedVoiceMultiplier = clamp(
    1 + Math.max(0, baseOscillators - 1) * 0.34 + colorOscillators * 0.42 + delayTails * 0.28,
    1,
    4.25,
  );

  return {
    active: true,
    baseOscillators,
    colorOscillators,
    delayTails,
    nodeCost,
    requestedVoiceMultiplier,
  };
}

export function isEntrophonWaveVoiceActive(): boolean {
  const cfg = readEntrophonSurfaceSoundConfig('wave');
  return cfg.enabled && cfg.engineAmount > 0.0001;
}

function resolveSurfaceTuningStrength(surface: XensonarMicrotonalSurface, requested?: number): number {
  const cfg = getEntrophonSurfaceSoundConfig(surface);
  const base = Number.isFinite(requested ?? NaN) ? Number(requested) : cfg.tuningStrength;
  return clamp(base * cfg.engineAmount, 0, 1);
}

export function resolveXensonarTunedFrequency(args: {
  freq: number;
  rootFreq?: number | null;
  tuningId?: XensonarMicrotonalTuningId;
  surface?: XensonarMicrotonalSurface;
  strength?: number;
}): number {
  const surface = args.surface ?? 'wave';
  const cfg = getEntrophonSurfaceSoundConfig(surface);
  const rawFreq = clamp(Number.isFinite(args.freq) ? args.freq : 220, 10, 24000);
  const rootFreq = normaliseRoot(args.rootFreq ?? cfg.rootFreq);
  const tuningId = args.tuningId ?? cfg.tuningId;
  const strength = resolveSurfaceTuningStrength(surface, args.strength ?? cfg.tuningStrength);
  if (!cfg.enabled || strength <= 0.0001) return rawFreq;

  let targetFreq = rawFreq;
  const octaves = Math.log2(rawFreq / rootFreq);

  if (tuningId === 'ji') {
    const octave = Math.floor(octaves);
    const frac = octaves - octave;
    const pc = Math.round(frac * 12) % 12;
    const ratio = JI_RATIOS[(pc + 12) % 12];
    targetFreq = rootFreq * Math.pow(2, octave) * ratio;
  } else {
    const steps = EDO_STEPS[tuningId] ?? 31;
    const step = Math.round(octaves * steps);
    targetFreq = rootFreq * Math.pow(2, step / steps);
  }

  const centsRaw = Math.log2(rawFreq / rootFreq) * 1200;
  const centsTarget = Math.log2(targetFreq / rootFreq) * 1200;
  const cents = lerp(centsRaw, centsTarget, strength);
  return clamp(rootFreq * Math.pow(2, cents / 1200), 10, 24000);
}

export function resolveXensonarMicrotonalVoice(args: XensonarMicrotonalVoiceConfig): XensonarMicrotonalVoiceSpec {
  const surface = args.surface;
  const cfg = getEntrophonSurfaceSoundConfig(surface);
  const surfaceOwnsTuning = surface === 'spectral' || args.rootFreq !== undefined || args.tuningId !== undefined || args.tuningStrength !== undefined;
  const tunedFreq = resolveXensonarTunedFrequency({
    freq: args.freq,
    rootFreq: surfaceOwnsTuning ? (args.rootFreq ?? cfg.rootFreq) : args.freq,
    tuningId: surfaceOwnsTuning ? (args.tuningId ?? cfg.tuningId) : cfg.tuningId,
    surface,
    strength: surfaceOwnsTuning ? (args.tuningStrength ?? cfg.tuningStrength) : 0,
  });
  const unison = Math.max(1, Math.min(6, Math.round(args.unison ?? cfg.unison)));
  const baseDetune = Number.isFinite(args.detuneCents ?? NaN) ? Number(args.detuneCents) : cfg.detune;
  const oscillatorFreqs: number[] = [];
  for (let i = 0; i < unison; i++) {
    const offset = unison === 1 ? 0 : (i - (unison - 1) / 2) * baseDetune;
    oscillatorFreqs.push(clamp(tunedFreq * Math.pow(2, offset / 1200), 10, 24000));
  }
  const colorAmount = cfg.enabled ? cfg.colorAmount * cfg.engineAmount : 0;
  const surfaceSteps = surface === 'particle' ? 19 : surface === 'spectral' ? 53 : 31;
  const colorFreqs = surface === 'wave'
    ? [tunedFreq * 0.5, tunedFreq * Math.pow(2, 19 / surfaceSteps), tunedFreq * Math.pow(2, 7 / surfaceSteps)]
    : surface === 'particle'
      ? [tunedFreq * Math.pow(2, 6 / surfaceSteps), tunedFreq * Math.pow(2, 11 / surfaceSteps), tunedFreq * 0.5]
      : [tunedFreq * 2, tunedFreq * Math.pow(2, 31 / surfaceSteps), tunedFreq * Math.pow(2, 7 / surfaceSteps)];
  const baseColorGains = surface === 'wave' ? [0.24, 0.2, 0.14] : surface === 'particle' ? [0.36, 0.22, 0.12] : [0.26, 0.18, 0.12];
  const colorGains = baseColorGains.map((gain) => gain * colorAmount);

  const requestedCutoff = Number.isFinite(args.filterFreq ?? NaN) ? Number(args.filterFreq) : undefined;
  const filterFreq = clamp(
    requestedCutoff
      ? lerp(requestedCutoff, cfg.filterFreqBase, 0.72)
      : cfg.filterFreqBase,
    40,
    19000,
  );
  const filterQ = clamp(
    args.filterQ
      ? lerp(args.filterQ, cfg.filterResonance, 0.72)
      : cfg.filterResonance,
    0.1,
    26,
  );
  const gainScale = (surface === 'particle' ? 1.1 : surface === 'spectral' ? 0.94 : 1.16) * cfg.volume * (cfg.enabled ? 1 : 0.82);
  const drive = 0.55 + cfg.distortion * 5.6 + cfg.foldAmount * 2.3;

  return {
    tunedFreq,
    oscillatorFreqs,
    waveform: cfg.waveform,
    gainScale,
    volumeScale: cfg.volume,
    filterType: cfg.filterType,
    filterFreq,
    filterQ,
    filterEnvAmount: cfg.filterEnvAmount,
    filterDecay: cfg.filterDecay,
    drive,
    colorFreqs: colorFreqs.map((freq) => clamp(freq, 10, 24000)),
    colorGains,
    attack: cfg.attack,
    decay: cfg.decay,
    sustain: cfg.sustain,
    release: cfg.release,
    pitchBend: cfg.pitchBend,
    pitchBendTime: cfg.pitchBendTime,
    delayAmount: cfg.delayAmount,
    reverbAmount: cfg.reverbAmount,
    distortion: cfg.distortion,
    colorAmount: cfg.colorAmount,
    foldAmount: cfg.foldAmount,
    engineAmount: cfg.engineAmount,
    config: cfg,
  };
}

export function resolveSpectralForgeMicrotonalFrequency(args: {
  freq: number;
  y: number;
  height: number;
  x?: number;
  width?: number;
  strength?: number;
  rootFreq?: number;
  tuningId?: XensonarMicrotonalTuningId;
}): number {
  const cfg = getEntrophonSurfaceSoundConfig('spectral');
  const yNorm = args.height > 1 ? args.y / (args.height - 1) : 0.5;
  const xNorm = args.width && args.width > 1 && Number.isFinite(args.x ?? NaN) ? Number(args.x) / (args.width - 1) : 0.5;
  const axisRoot = args.rootFreq ?? cfg.rootFreq * Math.pow(2, Math.round((1 - yNorm) * 3) * 0.19 + (xNorm - 0.5) * 0.18 * cfg.engineAmount);
  return resolveXensonarTunedFrequency({
    freq: args.freq,
    rootFreq: axisRoot,
    tuningId: args.tuningId ?? cfg.tuningId,
    surface: 'spectral',
    strength: args.strength ?? cfg.tuningStrength,
  });
}

export function xensonarMicrotonalStableNoise01(...parts: number[]): number {
  let h = 2166136261 >>> 0;
  for (const part of parts) {
    let v = Math.floor((Number.isFinite(part) ? part : 0) * 1000003) >>> 0;
    h ^= v;
    h = Math.imul(h, 16777619) >>> 0;
    h ^= h >>> 13;
  }
  return (h >>> 0) / 4294967295;
}

// Exact-value, bounded memoization: public callers still own their returned buffer.
const engineDriveCurveCache = new Map<number, Float32Array<ArrayBuffer>>();
export function makeXensonarEngineDriveCurve(amount = 1): Float32Array<ArrayBuffer> {
  const normalized = Number.isFinite(amount) ? clamp(amount, 0, 8) : 1;
  const cached = engineDriveCurveCache.get(normalized);
  if (cached) return cached.slice();
  const n = 2048;
  const curve = new Float32Array(n) as Float32Array<ArrayBuffer>;
  const k = normalized * 18 + 1;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * k) * (1 - 0.06 * Math.abs(x));
  }
  if (engineDriveCurveCache.size >= 32) {
    engineDriveCurveCache.delete(engineDriveCurveCache.keys().next().value!);
  }
  engineDriveCurveCache.set(normalized, curve);
  return curve.slice();
}

function wrapPhase01(phase: number): number {
  const tau = Math.PI * 2;
  return ((phase % tau) + tau) % tau / tau;
}

function sawFromPhase(phase: number): number {
  return wrapPhase01(phase) * 2 - 1;
}

function triangleFromPhase(phase: number): number {
  return 1 - Math.abs(sawFromPhase(phase)) * 2;
}

function squareFromPhase(phase: number): number {
  return Math.sin(phase) >= 0 ? 1 : -1;
}

function waveformSample(phase: number, waveform: OscillatorType): number {
  if (waveform === 'sawtooth') return sawFromPhase(phase);
  if (waveform === 'square') return squareFromPhase(phase);
  if (waveform === 'triangle') return triangleFromPhase(phase);
  return Math.sin(phase);
}

export function renderXensonarEngineSample(phase: number, energy = 0.5, surface: XensonarMicrotonalSurface = 'spectral'): number {
  const cfg = getEntrophonSurfaceSoundConfig(surface);
  if (!cfg.enabled || cfg.engineAmount <= 0.0001) {
    return Math.sin(phase);
  }
  const e = clamp(energy, 0, 1);
  const color = cfg.colorAmount * cfg.engineAmount;
  const fold = cfg.foldAmount * cfg.engineAmount;
  const dist = cfg.distortion;
  const base = waveformSample(phase + e * 0.07 * fold, cfg.waveform);
  const sine = Math.sin(phase) * (0.46 + (1 - color) * 0.22);
  const second = Math.sin(phase * (2 + 0.04 * color) + 0.21) * (surface === 'particle' ? 0.34 : 0.24) * color;
  const third = Math.sin(phase * (3.01 + fold * 0.17) + 0.47) * (surface === 'wave' ? 0.24 : 0.17) * color;
  const saw = sawFromPhase(phase + e * (0.12 + fold * 0.16)) * (surface === 'spectral' ? 0.36 : surface === 'particle' ? 0.44 : 0.3) * color;
  const folded = Math.sin(Math.sin(phase * (1.2 + e * 1.9 + fold * 2.6)) * Math.PI) * (surface === 'spectral' ? 0.26 : 0.16) * fold;
  const body = base * 0.42 + sine * 0.36 + second + third + saw + folded;
  return Math.tanh(body * (1 + dist * 5.5 + fold * 0.9)) * cfg.volume;
}

export function buildEntrophonSoundConfigSignature(surface: XensonarMicrotonalSurface = 'spectral'): string {
  const cfg = getEntrophonSurfaceSoundConfig(surface);
  return [
    XENSONAR_MICROTONAL_ENGINE_VERSION,
    surface,
    cfg.enabled ? 1 : 0,
    Math.round(cfg.engineAmount * 1000),
    Math.round(cfg.rootFreq * 10),
    cfg.tuningId,
    Math.round(cfg.tuningStrength * 1000),
    cfg.waveform,
    Math.round(cfg.detune * 10),
    cfg.unison,
    Math.round(cfg.attack * 100000),
    Math.round(cfg.decay * 10000),
    Math.round(cfg.sustain * 1000),
    Math.round(cfg.release * 10000),
    Math.round(cfg.pitchBend * 100),
    Math.round(cfg.pitchBendTime * 10000),
    cfg.filterType,
    Math.round(cfg.filterFreqBase),
    Math.round(cfg.filterResonance * 10),
    Math.round(cfg.filterEnvAmount * 1000),
    Math.round(cfg.filterDecay * 10000),
    Math.round(cfg.delayAmount * 1000),
    Math.round(cfg.reverbAmount * 1000),
    Math.round(cfg.distortion * 1000),
    Math.round(cfg.colorAmount * 1000),
    Math.round(cfg.foldAmount * 1000),
    Math.round(cfg.volume * 1000),
  ].join(':');
}
