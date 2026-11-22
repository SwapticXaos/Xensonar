/* TS-MOD-02: Nodal interpreter device matrix & Room III focus/mixer metadata,
   brought back from the minified core (src/runtime/instrument/07_interpreters_and_installation.js)
   into a strict TypeScript module. Built by tools/ts_module.cjs into __XenTs_nodalDeviceMatrix.
   Zone: WARM (Room III Nodal / Mycelium interpreter routing and mixer configuration). No audio thread work. */

export type NodalInterpreterId =
  | 'schwarmdeuter'
  | 'memoryFenster'
  | 'psychedelicSpiral'
  | 'clusterGlue'
  | 'semanticFriction'
  | 'topologicalResonator';

export interface NodalInterpreterMeta {
  readonly id: NodalInterpreterId;
  readonly label: string;
  readonly shortLabel: string;
  readonly role: string;
}

export type NodalSoundTargetId =
  | 'myzelColorVoice'
  | 'drone'
  | 'particles'
  | 'wellenstarter'
  | 'carrierFigure'
  | 'oneShotRender';

export interface NodalSoundTargetMeta {
  readonly id: NodalSoundTargetId;
  readonly label: string;
  readonly shortLabel: string;
  readonly active: boolean;
}

export type NodalDeviceTargets = Record<NodalSoundTargetId, number>;

export interface NodalDeviceConfig {
  enabled: boolean;
  amount: number;
  targets: NodalDeviceTargets;
}

export interface NodalDevicePatch {
  enabled?: boolean;
  amount?: number;
  targets?: Partial<Record<NodalSoundTargetId, number>>;
}

export type NodalDeviceMatrix = Record<NodalInterpreterId, NodalDeviceConfig>;

export type NodalRoom3FocusValue = 'field' | 'sound' | 'routing' | 'export';

export interface NodalRoom3FocusTab {
  readonly value: NodalRoom3FocusValue;
  readonly label: string;
  readonly hint: string;
}

export interface MyzelColorVoiceSlider {
  readonly field: 'volume' | 'carrier' | 'sub' | 'formant' | 'overtone' | 'drive' | 'air';
  readonly label: string;
  readonly max?: number;
}

export const NODAL_INTERPRETERS: readonly NodalInterpreterMeta[] = [
  {
    id: 'schwarmdeuter',
    label: 'Swarm Interpreter',
    shortLabel: 'Swarm',
    role: 'reads density, cohesion and relation as a field interpretation',
  },
  {
    id: 'memoryFenster',
    label: 'Memory Window',
    shortLabel: 'Memory',
    role: 'holds movement and constellation as spatial memory',
  },
  {
    id: 'psychedelicSpiral',
    label: 'Psychedelic Spiral',
    shortLabel: 'Spiral',
    role: 'translates orbit, tension and crossings into spatial movement',
  },
  {
    id: 'clusterGlue',
    label: 'Cluster Glue',
    shortLabel: 'Glue',
    role: 'turns the old mastering glue into a targetable cluster device',
  },
  {
    id: 'semanticFriction',
    label: 'Semantic Friction',
    shortLabel: 'Friction',
    role: 'reads congestion, symbiosis and raw body through a concept-folding field device',
  },
  {
    id: 'topologicalResonator',
    label: 'Topological Resonator',
    shortLabel: 'Resonator',
    role: 'makes aura intersections audible as their own relation voices',
  },
];

export const NODAL_SOUND_TARGETS: readonly NodalSoundTargetMeta[] = [
  { id: 'myzelColorVoice', label: 'Mycelium Color Voice', shortLabel: 'Mycelium', active: true },
  { id: 'drone', label: 'Drone', shortLabel: 'Drone', active: true },
  { id: 'particles', label: 'Particles', shortLabel: 'Particles', active: true },
  { id: 'wellenstarter', label: 'Wave Starter', shortLabel: 'Waves', active: true },
  { id: 'carrierFigure', label: 'Carrier Figure', shortLabel: 'Carrier', active: false },
  { id: 'oneShotRender', label: 'One-Shot-Render', shortLabel: 'OneShot', active: false },
];

export function clampNodalUnit(value: unknown, min = 0, max = 1): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : min;
}

export const DEFAULT_NODAL_DEVICE_MATRIX: NodalDeviceMatrix = {
  schwarmdeuter: {
    enabled: true,
    amount: 0.62,
    targets: {
      myzelColorVoice: 1,
      drone: 0.42,
      particles: 0.36,
      wellenstarter: 0.2,
      carrierFigure: 0.55,
      oneShotRender: 0.38,
    },
  },
  memoryFenster: {
    enabled: true,
    amount: 0.48,
    targets: {
      myzelColorVoice: 0.72,
      drone: 0.55,
      particles: 0.18,
      wellenstarter: 0.16,
      carrierFigure: 0.5,
      oneShotRender: 0.28,
    },
  },
  psychedelicSpiral: {
    enabled: false,
    amount: 0.42,
    targets: {
      myzelColorVoice: 0.62,
      drone: 0.22,
      particles: 0.3,
      wellenstarter: 0.54,
      carrierFigure: 0.46,
      oneShotRender: 0.2,
    },
  },
  clusterGlue: {
    enabled: true,
    amount: 0.38,
    targets: {
      myzelColorVoice: 0.68,
      drone: 0.46,
      particles: 0.24,
      wellenstarter: 0.18,
      carrierFigure: 0.34,
      oneShotRender: 0.18,
    },
  },
  semanticFriction: {
    enabled: true,
    amount: 0.24,
    targets: {
      myzelColorVoice: 0.72,
      drone: 0.18,
      particles: 0.08,
      wellenstarter: 0.08,
      carrierFigure: 0.46,
      oneShotRender: 0.34,
    },
  },
  topologicalResonator: {
    enabled: true,
    amount: 0.26,
    targets: {
      myzelColorVoice: 0.74,
      drone: 0.16,
      particles: 0.06,
      wellenstarter: 0.08,
      carrierFigure: 0.48,
      oneShotRender: 0.32,
    },
  },
};

export function normalizeNodalDeviceMatrix(
  input?: Partial<Record<NodalInterpreterId, NodalDevicePatch>> | null,
): NodalDeviceMatrix {
  const out = {} as NodalDeviceMatrix;
  NODAL_INTERPRETERS.forEach(({ id }) => {
    const def = DEFAULT_NODAL_DEVICE_MATRIX[id];
    const cur = input?.[id];
    const targets = {} as NodalDeviceTargets;
    NODAL_SOUND_TARGETS.forEach(({ id: targetId }) => {
      targets[targetId] = clampNodalUnit(cur?.targets?.[targetId] ?? def.targets[targetId] ?? 0);
    });
    out[id] = {
      enabled: cur?.enabled ?? def.enabled,
      amount: clampNodalUnit(cur?.amount ?? def.amount),
      targets,
    };
  });
  return out;
}

export function patchNodalDevice(
  matrix: NodalDeviceMatrix,
  id: NodalInterpreterId,
  patch: NodalDevicePatch,
): NodalDeviceMatrix {
  const prev = matrix[id];
  return normalizeNodalDeviceMatrix({
    ...matrix,
    [id]: {
      ...prev,
      ...patch,
      targets: patch.targets ? { ...prev.targets, ...patch.targets } : prev.targets,
    },
  });
}

export function setNodalDeviceTarget(
  matrix: NodalDeviceMatrix,
  id: NodalInterpreterId,
  targetId: NodalSoundTargetId,
  value: number,
): NodalDeviceMatrix {
  return patchNodalDevice(matrix, id, { targets: { [targetId]: clampNodalUnit(value) } });
}

export const NODAL_ROOM3_FOCUS_TABS: readonly NodalRoom3FocusTab[] = [
  { value: 'field', label: 'Field', hint: 'Arrangement' },
  { value: 'sound', label: 'Sound', hint: 'Read Heads' },
  { value: 'routing', label: 'Routing', hint: 'Ziele' },
  { value: 'export', label: 'Export', hint: 'Body' },
];

export const DEFAULT_NODAL_ROOM3_FOCUS: NodalRoom3FocusValue = 'field';

export const MYZEL_COLOR_VOICE_SLIDERS: readonly MyzelColorVoiceSlider[] = [
  { field: 'volume', label: 'Volume', max: 1.5 },
  { field: 'carrier', label: 'Carrier' },
  { field: 'sub', label: 'Sub' },
  { field: 'formant', label: 'Formant' },
  { field: 'overtone', label: 'Overtones' },
  { field: 'drive', label: 'Drive' },
  { field: 'air', label: 'Air' },
];
