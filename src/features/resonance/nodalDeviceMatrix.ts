import type { MyceliumSnapshot } from '../topology/myceliumSnapshot';

export type NodalDeviceId = 'schwarmdeuter' | 'memoryFenster' | 'psychedelicSpiral' | 'clusterGlue' | 'semanticFriction' | 'topologicalResonator';

export type NodalTargetId =
  | 'myzelColorVoice'
  | 'drone'
  | 'particles'
  | 'wellenstarter'
  | 'carrierFigure'
  | 'oneShotRender';

export type NodalDeviceTargetMix = Partial<Record<NodalTargetId, number>>;

export type NodalDeviceMatrixEntry = {
  enabled: boolean;
  amount: number;
  targets: NodalDeviceTargetMix;
};

export type NodalDeviceMatrix = Record<NodalDeviceId, NodalDeviceMatrixEntry>;

export type NodalConstellationFingerprint = {
  clusterMass: number;
  asymmetry: number;
  linearity: number;
  voidPressure: number;
  relationTension: number;
  spectralTilt: number;
  formantBias: number;
  transientPotential: number;
  dronePotential: number;
  dominantTargets: NodalTargetId[];
};

export const NODAL_DEVICE_DEFINITIONS: readonly { id: NodalDeviceId; label: string; shortLabel: string; role: string }[] = [
  { id: 'schwarmdeuter', label: 'Schwarmdeuter', shortLabel: 'Schwarm', role: 'liest Dichte, Kohäsion und Relation als Felddeutung' },
  { id: 'memoryFenster', label: 'Memory-Fenster', shortLabel: 'Memory', role: 'hält Bewegung und Konstellation als räumliches Gedächtnis' },
  { id: 'psychedelicSpiral', label: 'Psychedelic Spiral', shortLabel: 'Spiral', role: 'übersetzt Orbit, Spannung und Kreuzung in Raumbewegung' },
  { id: 'clusterGlue', label: 'Cluster Glue', shortLabel: 'Glue', role: 'macht aus altem Mastering-Glue ein zielbares Cluster-Gerät' },
  { id: 'semanticFriction', label: 'Semantische Reibung', shortLabel: 'Reibung', role: 'liest Stau, Symbiose und Rohkörper als Begriffsfalter-Feldgerät' },
  { id: 'topologicalResonator', label: 'Topologischer Resonator', shortLabel: 'Resonator', role: 'macht Aura-Schnittmengen als eigene Relation-Voices hörbar' },
];

export const NODAL_TARGET_DEFINITIONS: readonly { id: NodalTargetId; label: string; shortLabel: string; active: boolean }[] = [
  { id: 'myzelColorVoice', label: 'Myzel-Farbstimme', shortLabel: 'Myzel', active: true },
  { id: 'drone', label: 'Drone', shortLabel: 'Drone', active: true },
  { id: 'particles', label: 'Partikel', shortLabel: 'Partikel', active: true },
  { id: 'wellenstarter', label: 'Wellenstarter', shortLabel: 'Wellen', active: true },
  { id: 'carrierFigure', label: 'Carrier-Figur', shortLabel: 'Carrier', active: false },
  { id: 'oneShotRender', label: 'One-Shot-Render', shortLabel: 'OneShot', active: false },
];

const clamp = (value: number, min = 0, max = 1) => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
};

export const DEFAULT_NODAL_DEVICE_MATRIX: NodalDeviceMatrix = {
  schwarmdeuter: {
    enabled: true,
    amount: 0.62,
    targets: { myzelColorVoice: 1, drone: 0.42, particles: 0.36, wellenstarter: 0.2, carrierFigure: 0.55, oneShotRender: 0.38 },
  },
  memoryFenster: {
    enabled: true,
    amount: 0.48,
    targets: { myzelColorVoice: 0.72, drone: 0.55, particles: 0.18, wellenstarter: 0.16, carrierFigure: 0.5, oneShotRender: 0.28 },
  },
  psychedelicSpiral: {
    enabled: false,
    amount: 0.42,
    targets: { myzelColorVoice: 0.62, drone: 0.22, particles: 0.3, wellenstarter: 0.54, carrierFigure: 0.46, oneShotRender: 0.2 },
  },
  clusterGlue: {
    enabled: true,
    amount: 0.38,
    targets: { myzelColorVoice: 0.68, drone: 0.46, particles: 0.24, wellenstarter: 0.18, carrierFigure: 0.34, oneShotRender: 0.18 },
  },
  semanticFriction: {
    enabled: true,
    amount: 0.24,
    targets: { myzelColorVoice: 0.72, drone: 0.18, particles: 0.08, wellenstarter: 0.08, carrierFigure: 0.46, oneShotRender: 0.34 },
  },
  topologicalResonator: {
    enabled: true,
    amount: 0.26,
    targets: { myzelColorVoice: 0.74, drone: 0.16, particles: 0.06, wellenstarter: 0.08, carrierFigure: 0.48, oneShotRender: 0.32 },
  },
};

export function normalizeNodalDeviceMatrix(input: Partial<NodalDeviceMatrix> | null | undefined): NodalDeviceMatrix {
  const next = {} as NodalDeviceMatrix;
  NODAL_DEVICE_DEFINITIONS.forEach(({ id }) => {
    const fallback = DEFAULT_NODAL_DEVICE_MATRIX[id];
    const incoming = input?.[id];
    const targets: NodalDeviceTargetMix = {};
    NODAL_TARGET_DEFINITIONS.forEach(({ id: target }) => {
      targets[target] = clamp(incoming?.targets?.[target] ?? fallback.targets[target] ?? 0);
    });
    next[id] = {
      enabled: incoming?.enabled ?? fallback.enabled,
      amount: clamp(incoming?.amount ?? fallback.amount),
      targets,
    };
  });
  return next;
}

export function updateNodalDeviceEntry(
  matrix: NodalDeviceMatrix,
  device: NodalDeviceId,
  patch: Partial<NodalDeviceMatrixEntry>,
): NodalDeviceMatrix {
  return normalizeNodalDeviceMatrix({
    ...matrix,
    [device]: {
      ...matrix[device],
      ...patch,
      targets: patch.targets ? { ...matrix[device].targets, ...patch.targets } : matrix[device].targets,
    },
  });
}

export function setNodalDeviceTarget(
  matrix: NodalDeviceMatrix,
  device: NodalDeviceId,
  target: NodalTargetId,
  value: number,
): NodalDeviceMatrix {
  return updateNodalDeviceEntry(matrix, device, { targets: { [target]: clamp(value) } });
}

export function getNodalDeviceTargetLevel(matrix: NodalDeviceMatrix, device: NodalDeviceId, target: NodalTargetId): number {
  const entry = matrix[device];
  if (!entry?.enabled) return 0;
  return clamp(entry.amount) * clamp(entry.targets[target] ?? 0);
}

export function getNodalTargetAggregate(matrix: NodalDeviceMatrix, target: NodalTargetId): number {
  const normalized = normalizeNodalDeviceMatrix(matrix);
  const sum = NODAL_DEVICE_DEFINITIONS.reduce((acc, { id }) => acc + getNodalDeviceTargetLevel(normalized, id, target), 0);
  return clamp(sum / Math.max(1, NODAL_DEVICE_DEFINITIONS.length * 0.72));
}

export function deriveNodalConstellationFingerprint(snapshot: MyceliumSnapshot, matrix: NodalDeviceMatrix): NodalConstellationFingerprint {
  const clusterMass = clamp(snapshot.myzelClusterMass ?? snapshot.constellationFlux ?? 0);
  const asymmetry = clamp(snapshot.myzelGestaltAsymmetry ?? Math.abs((snapshot.constellationCentroidX ?? 0.5) - 0.5) * 2);
  const linearity = clamp(snapshot.myzelGestaltLinearity ?? 0);
  const voidPressure = clamp(snapshot.myzelVoidPressure ?? 0);
  const relationTension = clamp(snapshot.myzelRelationTension ?? snapshot.constellationTension ?? 0);
  const spectralTilt = clamp(snapshot.myzelSpatialSpectralTilt ?? snapshot.constellationBrightness ?? 0.5);
  const formantBias = clamp(snapshot.myzelSpatialFormant ?? snapshot.myzelLocalFormant ?? 0.5);
  const transientPotential = clamp(relationTension * 0.48 + clusterMass * 0.22 + (snapshot.myzelSpatialWavefolder ?? 0) * 0.18 + (snapshot.myzelSpatialBitcrusher ?? 0) * 0.12);
  const dronePotential = clamp(voidPressure * 0.36 + clusterMass * 0.24 + (snapshot.myzelSpatialSub ?? 0) * 0.2 + (snapshot.myzelPaletteWarmChoir ?? 0) * 0.16);
  const dominantTargets = NODAL_TARGET_DEFINITIONS
    .map((entry) => ({ ...entry, level: getNodalTargetAggregate(matrix, entry.id) }))
    .filter((entry) => entry.level > 0.12)
    .sort((a, b) => b.level - a.level)
    .slice(0, 3)
    .map((entry) => entry.id);

  return {
    clusterMass,
    asymmetry,
    linearity,
    voidPressure,
    relationTension,
    spectralTilt,
    formantBias,
    transientPotential,
    dronePotential,
    dominantTargets,
  };
}
