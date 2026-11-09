import type { SemanticNode } from '../xensonar/domain/runtimeTypes';
import type {
  MyzelEffectFamily,
  MyzelEffectModuleType,
  MyzelNodeAuraBuildContext,
  MyzelNodeAuraPresetDefinition,
  MyzelNodeAuraSource,
  MyzelNodeEffectId,
  MyzelNodeEffectModule,
  MyzelNodePresetId,
  MyzelNodeSpatialConfig,
  MyzelNodeTimbreProfile,
} from './myzelSpatialFieldTypes';

type NodeLike = SemanticNode & {
  x: number;
  y: number;
  freq: number;
  energy: number;
  label: string;
  myzelEffectPresetId?: string;
  myzelEffectModuleType?: string;
  myzelEffectStrength?: number;
  myzelAuraRadius?: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

function makeModule(
  type: MyzelEffectModuleType,
  family: MyzelEffectFamily,
  intensity: number,
  radius: number,
  falloff: number,
  params: MyzelNodeEffectModule['params'] = {},
): MyzelNodeEffectModule {
  return { type, family, intensity: clamp01(intensity), radius: clamp(radius, 36, 260), falloff: clamp(falloff, 0.7, 3.4), params };
}


export interface MyzelNodeEffectKernelDefinition {
  id: MyzelNodeEffectId;
  label: string;
  family: MyzelEffectFamily;
  defaultRadius: number;
  module: (context: MyzelNodeAuraBuildContext) => MyzelNodeEffectModule;
}

const MYZEL_NODE_EFFECT_KERNEL_DEFINITIONS: Record<MyzelNodeEffectId, MyzelNodeEffectKernelDefinition> = {
  drive: { id: 'drive', label: 'Drive', family: 'distortion', defaultRadius: 156, module: () => makeModule('drive', 'distortion', 0.82, 156, 1.65, { drive: 0.72, mix: 0.66 }) },
  wavefolder: { id: 'wavefolder', label: 'Fold', family: 'distortion', defaultRadius: 148, module: ({ timbre }) => makeModule('wavefolder', 'distortion', 0.72, 148, 1.88, { drive: 0.52 + timbre.roughness * 0.22, color: timbre.partialBias }) },
  formant_filter: { id: 'formant_filter', label: 'Formant', family: 'formant', defaultRadius: 166, module: ({ timbre }) => makeModule('formant_filter', 'formant', 0.86, 166, 1.52, { vowel: timbre.formant, q: 0.48 + timbre.resonanceMass * 0.18 }) },
  shimmer_delay: { id: 'shimmer_delay', label: 'Shimmer', family: 'delay', defaultRadius: 184, module: ({ timbre }) => makeModule('shimmer_delay', 'delay', 0.76, 184, 1.28, { time: 0.44 + timbre.brightness * 0.18, feedback: 0.28 + timbre.breath * 0.2, mix: 0.24 + timbre.brightness * 0.12 }) },
  bitcrusher: { id: 'bitcrusher', label: 'Crush', family: 'noise', defaultRadius: 124, module: ({ timbre }) => makeModule('bitcrusher', 'noise', 0.68, 124, 2.2, { mix: 0.22 + timbre.roughness * 0.28 }) },
  sub_harmonic: { id: 'sub_harmonic', label: 'Sub', family: 'sub', defaultRadius: 190, module: ({ timbre }) => makeModule('sub_harmonic', 'sub', 0.9, 190, 1.36, { depth: 0.48 + timbre.body * 0.42 }) },
  comb_filter: { id: 'comb_filter', label: 'Comb', family: 'filter', defaultRadius: 140, module: ({ timbre }) => makeModule('comb_filter', 'filter', 0.7, 140, 1.76, { q: 0.5 + timbre.metallicity * 0.28 }) },
  spectral_tilt: { id: 'spectral_tilt', label: 'Tilt', family: 'spectral', defaultRadius: 160, module: ({ timbre }) => makeModule('spectral_tilt', 'spectral', 0.72, 160, 1.58, { tilt: timbre.brightness }) },
  grain_blur: { id: 'grain_blur', label: 'Korn', family: 'grain', defaultRadius: 146, module: ({ timbre }) => makeModule('grain_blur', 'grain', 0.72, 146, 1.9, { grainSize: 0.34 + timbre.roughness * 0.28, mix: 0.3 + timbre.breath * 0.18 }) },
  chorus: { id: 'chorus', label: 'Chorus', family: 'modulation', defaultRadius: 150, module: ({ timbre }) => makeModule('chorus', 'modulation', 0.58, 150, 1.85, { mix: 0.18 + timbre.breath * 0.18 }) },
  resonator: { id: 'resonator', label: 'Resonator', family: 'resonator', defaultRadius: 166, module: ({ timbre }) => makeModule('resonator', 'resonator', 0.76, 166, 1.62, { body: timbre.body, q: 0.36 + timbre.resonanceMass * 0.2 }) },
};

const MYZEL_NODE_EFFECT_IDS = new Set<MyzelNodeEffectId>(Object.keys(MYZEL_NODE_EFFECT_KERNEL_DEFINITIONS) as MyzelNodeEffectId[]);

const MYZEL_NODE_EFFECT_DEFAULT_RING: MyzelNodeEffectId[] = [
  'resonator',
  'formant_filter',
  'spectral_tilt',
  'wavefolder',
  'sub_harmonic',
  'shimmer_delay',
  'comb_filter',
  'grain_blur',
  'drive',
  'chorus',
  'bitcrusher',
];

// Kept for the older overlap-contract name, but it now points to effect kernels, not territories/preset regions.
const MYZEL_JI_EFFECT_PRESET_RING = MYZEL_NODE_EFFECT_DEFAULT_RING;

function parseNodeEffectId(value: string | undefined): MyzelNodeEffectId | null {
  if (!value) return null;
  return MYZEL_NODE_EFFECT_IDS.has(value as MyzelNodeEffectId) ? value as MyzelNodeEffectId : null;
}

function getMyzelNodeEffectKernelDefinition(effectId: MyzelNodeEffectId): MyzelNodeEffectKernelDefinition {
  return MYZEL_NODE_EFFECT_KERNEL_DEFINITIONS[effectId] ?? MYZEL_NODE_EFFECT_KERNEL_DEFINITIONS.resonator;
}

function effectIdToCompatPresetId(effectId: MyzelNodeEffectId): MyzelNodePresetId {
  switch (effectId) {
    case 'drive':
    case 'wavefolder':
    case 'bitcrusher':
      return 'dreckecke';
    case 'formant_filter':
      return 'vokal';
    case 'shimmer_delay':
    case 'chorus':
      return 'shimmerhof';
    case 'sub_harmonic':
      return 'subwurzel';
    case 'comb_filter':
      return 'metall';
    case 'grain_blur':
      return 'koernung';
    case 'spectral_tilt':
      return 'glas';
    case 'resonator':
    default:
      return 'koerper';
  }
}

function compatPresetToEffectId(presetId: MyzelNodePresetId): MyzelNodeEffectId {
  switch (presetId) {
    case 'dreckecke':
      return 'drive';
    case 'vokalecke':
    case 'vokal':
      return 'formant_filter';
    case 'shimmerhof':
    case 'luft':
      return 'shimmer_delay';
    case 'metallcluster':
    case 'metall':
      return 'comb_filter';
    case 'subwurzel':
      return 'sub_harmonic';
    case 'koernung':
      return 'grain_blur';
    case 'glas':
      return 'spectral_tilt';
    case 'custom':
      return 'resonator';
    case 'koerper':
    default:
      return 'resonator';
  }
}

function buildMyzelEffectKernelModules(effectId: MyzelNodeEffectId, context: MyzelNodeAuraBuildContext): MyzelNodeEffectModule[] {
  const definition = getMyzelNodeEffectKernelDefinition(effectId);
  return [definition.module(context)];
}


const MYZEL_NODE_AURA_PRESET_DEFINITIONS: Record<MyzelNodePresetId, MyzelNodeAuraPresetDefinition> = {
  dreckecke: {
    id: 'dreckecke',
    label: 'Drive/Fold',
    defaultRadius: 158,
    modules: ({ timbre }) => [
      makeModule('drive', 'distortion', 0.9, 156, 1.7, { drive: 0.82, mix: 0.74 }),
      makeModule('wavefolder', 'distortion', 0.72, 132, 2.0, { drive: 0.62, color: 0.28 }),
      makeModule('bitcrusher', 'noise', 0.46, 108, 2.3, { mix: 0.34 + timbre.roughness * 0.08 }),
    ],
  },
  vokalecke: {
    id: 'vokalecke',
    label: 'Formant',
    defaultRadius: 164,
    modules: ({ timbre }) => [
      makeModule('formant_filter', 'formant', 0.9, 164, 1.55, { vowel: timbre.formant, q: 0.58 }),
      makeModule('grain_blur', 'grain', 0.34, 118, 2.1, { grainSize: 0.38, mix: 0.32 }),
    ],
  },
  shimmerhof: {
    id: 'shimmerhof',
    label: 'Shimmer',
    defaultRadius: 184,
    modules: ({ timbre }) => [
      makeModule('shimmer_delay', 'delay', 0.82, 182, 1.35, { time: 0.56, feedback: 0.42, mix: 0.36 }),
      makeModule('spectral_tilt', 'spectral', 0.52, 148, 1.8, { tilt: timbre.brightness }),
      makeModule('chorus', 'modulation', 0.34, 136, 2.0, { mix: 0.28 }),
    ],
  },
  metallcluster: {
    id: 'metallcluster',
    label: 'Metall',
    defaultRadius: 144,
    modules: () => [
      makeModule('comb_filter', 'filter', 0.72, 142, 1.75, { q: 0.74 }),
      makeModule('resonator', 'resonator', 0.58, 132, 1.9, { body: 0.35, q: 0.68 }),
      makeModule('wavefolder', 'distortion', 0.38, 112, 2.25, { drive: 0.42, color: 0.76 }),
    ],
  },
  subwurzel: {
    id: 'subwurzel',
    label: 'Sub',
    defaultRadius: 188,
    modules: ({ timbre }) => [
      makeModule('sub_harmonic', 'sub', 0.92, 188, 1.4, { depth: timbre.body }),
      makeModule('resonator', 'resonator', 0.52, 152, 1.8, { body: timbre.body, q: 0.48 }),
    ],
  },
  glas: {
    id: 'glas',
    label: 'Glas',
    defaultRadius: 154,
    modules: ({ timbre }) => [
      makeModule('spectral_tilt', 'spectral', 0.74, 152, 1.7, { tilt: timbre.brightness }),
      makeModule('chorus', 'modulation', 0.46, 126, 2.0, { mix: 0.22 }),
    ],
  },
  metall: {
    id: 'metall',
    label: 'Metall',
    defaultRadius: 134,
    modules: () => [
      makeModule('comb_filter', 'filter', 0.62, 132, 1.85, { q: 0.68 }),
      makeModule('resonator', 'resonator', 0.42, 118, 2.1, { body: 0.42, q: 0.58 }),
    ],
  },
  luft: {
    id: 'luft',
    label: 'Luft',
    defaultRadius: 166,
    modules: ({ timbre }) => [
      makeModule('spectral_tilt', 'spectral', 0.48, 166, 1.45, { tilt: timbre.brightness }),
      makeModule('shimmer_delay', 'delay', 0.36, 148, 1.8, { feedback: 0.24, mix: 0.18 }),
    ],
  },
  koernung: {
    id: 'koernung',
    label: 'Korn',
    defaultRadius: 142,
    modules: () => [
      makeModule('grain_blur', 'grain', 0.74, 142, 1.85, { grainSize: 0.46, mix: 0.42 }),
      makeModule('bitcrusher', 'noise', 0.24, 104, 2.4, { mix: 0.18 }),
    ],
  },
  vokal: {
    id: 'vokal',
    label: 'Vokal',
    defaultRadius: 158,
    modules: ({ timbre }) => [
      makeModule('formant_filter', 'formant', 0.78, 158, 1.65, { vowel: timbre.formant, q: 0.52 }),
      makeModule('formant_filter', 'formant', 0.42, 122, 2.05, { vowel: clamp01(1 - timbre.formant * 0.6), q: 0.42 }),
    ],
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    defaultRadius: 142,
    modules: ({ timbre }) => [
      makeModule('formant_filter', 'formant', 0.5, 142, 1.8, { vowel: timbre.formant, q: 0.46 }),
      makeModule('resonator', 'resonator', 0.44, 138, 1.9, { body: timbre.body, q: 0.48 }),
    ],
  },
  koerper: {
    id: 'koerper',
    label: 'Körper',
    defaultRadius: 158,
    modules: ({ timbre }) => [
      makeModule('resonator', 'resonator', 0.64, 158, 1.55, { body: timbre.body, q: 0.44 }),
      makeModule('spectral_tilt', 'spectral', 0.32, 118, 2.0, { tilt: timbre.brightness }),
    ],
  },
};

const MYZEL_PRESET_IDS = new Set<MyzelNodePresetId>(Object.keys(MYZEL_NODE_AURA_PRESET_DEFINITIONS) as MyzelNodePresetId[]);

function parseNodeEffectPresetId(value: string | undefined): MyzelNodePresetId | null {
  if (!value) return null;
  return MYZEL_PRESET_IDS.has(value as MyzelNodePresetId) ? value as MyzelNodePresetId : null;
}

function jiEffectRingIndex(node: NodeLike, fallbackIndex: number) {
  if (typeof node.residentStepIndex === 'number') return Math.abs(Math.round(node.residentStepIndex));
  if (typeof node.ratio === 'number' && Number.isFinite(node.ratio)) return Math.abs(Math.round(node.ratio * 12));
  return fallbackIndex;
}

export function getMyzelNodeAuraPresetDefinition(presetId: MyzelNodePresetId): MyzelNodeAuraPresetDefinition {
  return MYZEL_NODE_AURA_PRESET_DEFINITIONS[presetId] ?? MYZEL_NODE_AURA_PRESET_DEFINITIONS.koerper;
}

export function buildMyzelNodeAuraModules(presetId: MyzelNodePresetId, context: MyzelNodeAuraBuildContext): MyzelNodeEffectModule[] {
  return getMyzelNodeAuraPresetDefinition(presetId).modules(context);
}

function resolveMyzelNodeSpatialConfig(args: {
  presetId: MyzelNodePresetId;
  timbre: MyzelNodeTimbreProfile;
  normalizedX: number;
  normalizedY: number;
  energy: number;
  freq: number;
  source?: MyzelNodeAuraSource;
  effectId?: MyzelNodeEffectId;
}): MyzelNodeSpatialConfig {
  const definition = getMyzelNodeAuraPresetDefinition(args.presetId);
  const context = {
    normalizedX: args.normalizedX,
    normalizedY: args.normalizedY,
    energy: args.energy,
    freq: args.freq,
    timbre: args.timbre,
  };
  const effectId = args.effectId ?? compatPresetToEffectId(definition.id);
  const modules = buildMyzelEffectKernelModules(effectId, context);
  const radiusFromModules = modules.length ? average(modules.map((module) => module.radius * (0.82 + module.intensity * 0.18))) : definition.defaultRadius;
  const config: MyzelNodeSpatialConfig = {
    presetId: definition.id,
    presetLabel: definition.label,
    effectId,
    effectLabel: getMyzelNodeEffectKernelDefinition(effectId).label,
    auraRadius: clamp(radiusFromModules, 42, 240),
    source: args.source ?? (definition.id === 'custom' ? 'custom_placeholder' : 'node_effect_default'),
    timbre: args.timbre,
    modules,
  };
  return config;
}

export function inferMyzelNodeEffect(node: NodeLike, index: number, _width: number, _height: number): MyzelNodeEffectId {
  const explicitEffect = parseNodeEffectId(node.myzelEffectModuleType);
  if (explicitEffect) return explicitEffect;
  const legacyPreset = parseNodeEffectPresetId(node.myzelEffectPresetId);
  if (legacyPreset) return compatPresetToEffectId(legacyPreset);
  if (node.isCustomResident) return 'resonator';

  const ringIndex = jiEffectRingIndex(node, index);
  return MYZEL_JI_EFFECT_PRESET_RING[ringIndex % MYZEL_JI_EFFECT_PRESET_RING.length] ?? 'resonator';
}

export function inferMyzelNodePreset(node: NodeLike, index: number, width: number, height: number): MyzelNodePresetId {
  return effectIdToCompatPresetId(inferMyzelNodeEffect(node, index, width, height));
}

export function buildMyzelNodeSpatialConfig(node: NodeLike, index: number, width: number, height: number): MyzelNodeSpatialConfig {
  const nx = clamp01(node.x / Math.max(1, width));
  const ny = clamp01(node.y / Math.max(1, height));
  const energy = clamp01(node.energy);
  const explicitEffectId = parseNodeEffectId(node.myzelEffectModuleType);
  const explicitPresetId = parseNodeEffectPresetId(node.myzelEffectPresetId);
  const effectId = inferMyzelNodeEffect(node, index, width, height);
  const presetId = effectIdToCompatPresetId(effectId);
  const brightness = clamp01((1 - ny) * 0.58 + nx * 0.16 + energy * 0.26);
  const body = clamp01(ny * 0.6 + (1 - brightness) * 0.22 + energy * 0.18);
  const roughness = clamp01(Math.abs(nx - 0.5) * 0.52 + energy * 0.34 + (presetId === 'dreckecke' || presetId === 'metallcluster' ? 0.18 : 0));
  const metallicity = clamp01((presetId === 'metall' || presetId === 'metallcluster' ? 0.6 : 0.08) + brightness * 0.22 + roughness * 0.18);
  const breath = clamp01((presetId === 'luft' || presetId === 'shimmerhof' ? 0.55 : 0.08) + (1 - energy) * 0.2 + brightness * 0.16);
  const formant = clamp01(nx * 0.72 + (presetId === 'vokal' || presetId === 'vokalecke' ? 0.22 : 0));
  const timbre: MyzelNodeTimbreProfile = {
    brightness,
    roughness,
    metallicity,
    breath,
    body,
    formant,
    partialBias: clamp01(brightness * 0.36 + metallicity * 0.34 + energy * 0.3),
    resonanceMass: clamp01(body * 0.62 + energy * 0.2 + (presetId === 'subwurzel' ? 0.18 : 0)),
  };

  const resolved = resolveMyzelNodeSpatialConfig({
    presetId,
    timbre,
    normalizedX: nx,
    normalizedY: ny,
    energy,
    freq: node.freq || 220,
    source: explicitEffectId || explicitPresetId ? 'explicit_node_effect' : (node.isCustomResident ? 'custom_placeholder' : 'node_effect_default'),
    effectId,
  });
  const radiusScale = typeof node.myzelAuraRadius === 'number' ? clamp(node.myzelAuraRadius, 42, 260) : resolved.auraRadius;
  const strength = clamp(typeof node.myzelEffectStrength === 'number' ? node.myzelEffectStrength : 1, 0.08, 1.65);
  return {
    ...resolved,
    auraRadius: radiusScale,
    modules: resolved.modules.map((module) => ({
      ...module,
      intensity: clamp01(module.intensity * strength),
      radius: clamp(module.radius * (0.88 + strength * 0.12), 36, 260),
    })),
  };
}

export function getMyzelPresetWitnessHue(presetId: MyzelNodePresetId) {
  switch (presetId) {
    case 'dreckecke':
      return 14;
    case 'vokalecke':
    case 'vokal':
      return 318;
    case 'shimmerhof':
    case 'glas':
    case 'luft':
      return 196;
    case 'metall':
    case 'metallcluster':
      return 48;
    case 'subwurzel':
      return 265;
    case 'koernung':
      return 115;
    case 'koerper':
    case 'custom':
    default:
      return 285;
  }
}
