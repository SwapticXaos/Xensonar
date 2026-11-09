import type {
  MyzelEffectFamily,
  MyzelNodeEffectModule,
  MyzelNodeSpatialConfig,
  MyzelSpatialEffectMix,
} from './myzelSpatialFieldTypes';

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

export function getPrimaryMyzelEffectFamily(config: MyzelNodeSpatialConfig): MyzelEffectFamily {
  return config.modules[0]?.family ?? 'spectral';
}

export function getDominantMyzelModuleAmount(config: MyzelNodeSpatialConfig, family: MyzelEffectFamily) {
  const matches = config.modules.filter((module) => module.family === family);
  return clamp01(matches.reduce((sum, module) => sum + module.intensity, 0) / Math.max(1, matches.length));
}

export function createEmptyMyzelSpatialEffectMix(): MyzelSpatialEffectMix {
  return {
    wavefolderAmount: 0,
    formantAmount: 0,
    shimmerAmount: 0,
    bitcrusherAmount: 0,
    subAmount: 0,
    resonatorAmount: 0,
    grainBlurAmount: 0,
    driveAmount: 0,
    chorusAmount: 0,
    spectralTilt: 0.5,
    brightness: 0.5,
    roughness: 0,
    body: 0.5,
    vowel: 0.5,
    q: 0.35,
  };
}

export function addMyzelModuleToSpatialEffectMix(mix: MyzelSpatialEffectMix, module: MyzelNodeEffectModule, weight: number) {
  const amount = clamp01(weight * module.intensity);
  switch (module.type) {
    case 'wavefolder':
      mix.wavefolderAmount += amount;
      break;
    case 'formant_filter':
      mix.formantAmount += amount;
      mix.vowel += (module.params.vowel ?? 0.5) * amount;
      mix.q += (module.params.q ?? 0.42) * amount;
      break;
    case 'shimmer_delay':
      mix.shimmerAmount += amount;
      break;
    case 'bitcrusher':
      mix.bitcrusherAmount += amount;
      break;
    case 'sub_harmonic':
      mix.subAmount += amount;
      break;
    case 'resonator':
      mix.resonatorAmount += amount;
      mix.body += (module.params.body ?? 0.5) * amount;
      mix.q += (module.params.q ?? 0.42) * amount;
      break;
    case 'grain_blur':
      mix.grainBlurAmount += amount;
      break;
    case 'drive':
      mix.driveAmount += amount;
      break;
    case 'chorus':
      mix.chorusAmount += amount;
      break;
    case 'comb_filter':
      mix.q += (module.params.q ?? 0.55) * amount;
      break;
    case 'spectral_tilt':
      mix.spectralTilt += ((module.params.tilt ?? 0.5) - 0.5) * amount;
      break;
    default:
      break;
  }
}

export function normalizeMyzelSpatialEffectMix(mix: MyzelSpatialEffectMix, totalWeight: number): MyzelSpatialEffectMix {
  const norm = Math.max(0.0001, totalWeight);
  return {
    wavefolderAmount: clamp01(mix.wavefolderAmount),
    formantAmount: clamp01(mix.formantAmount),
    shimmerAmount: clamp01(mix.shimmerAmount),
    bitcrusherAmount: clamp01(mix.bitcrusherAmount),
    subAmount: clamp01(mix.subAmount),
    resonatorAmount: clamp01(mix.resonatorAmount),
    grainBlurAmount: clamp01(mix.grainBlurAmount),
    driveAmount: clamp01(mix.driveAmount),
    chorusAmount: clamp01(mix.chorusAmount),
    spectralTilt: clamp01(mix.spectralTilt),
    brightness: clamp01(mix.brightness / norm),
    roughness: clamp01(mix.roughness / norm),
    body: clamp01(mix.body / norm),
    vowel: clamp01(mix.vowel / Math.max(0.0001, mix.formantAmount + 1)),
    q: clamp01(mix.q / Math.max(0.0001, mix.formantAmount + mix.resonatorAmount + 1)),
  };
}

export function resolveMyzelRelationCompatibility(a: MyzelEffectFamily, b: MyzelEffectFamily) {
  if (a === b && a === 'distortion') return 1;
  const key = [a, b].sort().join(':');
  switch (key) {
    case 'delay:distortion':
      return 0.92;
    case 'formant:grain':
      return 0.82;
    case 'formant:noise':
      return 0.74;
    case 'resonator:sub':
      return 0.88;
    case 'grain:spectral':
      return 0.68;
    case 'filter:resonator':
      return 0.72;
    case 'distortion:formant':
      return 0.62;
    case 'delay:spectral':
      return 0.58;
    default:
      return a === b ? 0.48 : 0.42;
  }
}
