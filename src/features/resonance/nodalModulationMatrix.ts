import type { MyceliumSnapshot } from '../topology/myceliumSnapshot';
import type { NodalSemanticProfile } from './semanticInteractionDevice';
import type { TopologicalResonanceTelemetry } from './topologicalResonanceMatrix';

export type NodalModSourceId =
  | 'relationTension'
  | 'voidPressure'
  | 'clusterMass'
  | 'auraOverlap'
  | 'semanticObsession'
  | 'semanticSymbiosis'
  | 'rawReality'
  | 'topologicalSparkle'
  | 'topologicalInterference'
  | 'linearity'
  | 'asymmetry';

export type NodalModTargetId =
  | 'colorVoice.volume'
  | 'colorVoice.drive'
  | 'colorVoice.formantQ'
  | 'colorVoice.overtoneGain'
  | 'semanticFriction.fmDepth'
  | 'semanticFriction.rawNoise'
  | 'topologicalResonator.interference'
  | 'topologicalResonator.feedback'
  | 'airDelay.send'
  | 'clusterGlue.amount'
  | 'memoryFenster.size';

export type NodalModCurve = 'linear' | 'expo' | 'softKnee' | 'inverse' | 'threshold';

export interface NodalModRoute {
  id: string;
  label: string;
  source: NodalModSourceId;
  target: NodalModTargetId;
  amount: number;
  bipolar: boolean;
  curve: NodalModCurve;
  smoothingMs: number;
  minTargetValue: number;
  maxTargetValue: number;
  enabled: boolean;
}

export type NodalModSourceValues = Record<NodalModSourceId, number>;
export type NodalModTargetValues = Record<NodalModTargetId, number>;

const finiteOr = (value: number | null | undefined, fallback = 0): number => (Number.isFinite(value) ? Number(value) : fallback);
const clamp = (value: number | null | undefined, min = 0, max = 1, fallback = min): number => {
  const n = finiteOr(value, fallback);
  return Math.max(min, Math.min(max, n));
};
const clamp01 = (value: number | null | undefined, fallback = 0): number => clamp(value, 0, 1, fallback);

export const NODAL_MOD_TARGET_IDS: readonly NodalModTargetId[] = [
  'colorVoice.volume',
  'colorVoice.drive',
  'colorVoice.formantQ',
  'colorVoice.overtoneGain',
  'semanticFriction.fmDepth',
  'semanticFriction.rawNoise',
  'topologicalResonator.interference',
  'topologicalResonator.feedback',
  'airDelay.send',
  'clusterGlue.amount',
  'memoryFenster.size',
];

export const NODAL_MOD_SOURCE_LABELS: Record<NodalModSourceId, string> = {
  relationTension: 'Relation',
  voidPressure: 'Void',
  clusterMass: 'Cluster',
  auraOverlap: 'Aura-Schnitt',
  semanticObsession: 'Obsession',
  semanticSymbiosis: 'Symbiose',
  rawReality: 'Rohkörper',
  topologicalSparkle: 'Sparkle',
  topologicalInterference: 'Interferenz',
  linearity: 'Linearität',
  asymmetry: 'Asymmetrie',
};

export const NODAL_MOD_TARGET_LABELS: Record<NodalModTargetId, string> = {
  'colorVoice.volume': 'Farbstimme · Pegel',
  'colorVoice.drive': 'Farbstimme · Drive',
  'colorVoice.formantQ': 'Farbstimme · Formant',
  'colorVoice.overtoneGain': 'Farbstimme · Obertöne',
  'semanticFriction.fmDepth': 'Reibung · FM',
  'semanticFriction.rawNoise': 'Reibung · Rohkörper',
  'topologicalResonator.interference': 'Resonator · Schnitt',
  'topologicalResonator.feedback': 'Resonator · Körper',
  'airDelay.send': 'Air · Send',
  'clusterGlue.amount': 'Glue · Cluster',
  'memoryFenster.size': 'Memory · Fenster',
};

export const DEFAULT_NODAL_MOD_ROUTES: readonly NodalModRoute[] = [
  {
    id: 'overlap-to-resonator-interference',
    label: 'Aura-Schnitt → Resonator-Schnitt',
    source: 'auraOverlap',
    target: 'topologicalResonator.interference',
    amount: 0.72,
    bipolar: false,
    curve: 'softKnee',
    smoothingMs: 48,
    minTargetValue: 0,
    maxTargetValue: 0.32,
    enabled: true,
  },
  {
    id: 'relation-to-semantic-fm',
    label: 'Relation → Reibungs-FM',
    source: 'relationTension',
    target: 'semanticFriction.fmDepth',
    amount: 0.58,
    bipolar: false,
    curve: 'expo',
    smoothingMs: 38,
    minTargetValue: 0,
    maxTargetValue: 0.28,
    enabled: true,
  },
  {
    id: 'void-to-air-send',
    label: 'Void → Air-Send',
    source: 'voidPressure',
    target: 'airDelay.send',
    amount: 0.62,
    bipolar: false,
    curve: 'softKnee',
    smoothingMs: 160,
    minTargetValue: 0,
    maxTargetValue: 0.24,
    enabled: true,
  },
  {
    id: 'obsession-to-drive',
    label: 'Obsession → Drive',
    source: 'semanticObsession',
    target: 'colorVoice.drive',
    amount: 0.46,
    bipolar: false,
    curve: 'expo',
    smoothingMs: 58,
    minTargetValue: 0,
    maxTargetValue: 0.22,
    enabled: true,
  },
  {
    id: 'symbiosis-to-formant',
    label: 'Symbiose → Formant',
    source: 'semanticSymbiosis',
    target: 'colorVoice.formantQ',
    amount: 0.44,
    bipolar: false,
    curve: 'softKnee',
    smoothingMs: 86,
    minTargetValue: 0,
    maxTargetValue: 0.18,
    enabled: true,
  },
  {
    id: 'cluster-to-overtone',
    label: 'Cluster → Obertöne',
    source: 'clusterMass',
    target: 'colorVoice.overtoneGain',
    amount: 0.5,
    bipolar: false,
    curve: 'linear',
    smoothingMs: 130,
    minTargetValue: 0,
    maxTargetValue: 0.2,
    enabled: true,
  },
  {
    id: 'sparkle-to-resonator-feedback',
    label: 'Sparkle → Resonanzkörper',
    source: 'topologicalSparkle',
    target: 'topologicalResonator.feedback',
    amount: 0.34,
    bipolar: false,
    curve: 'threshold',
    smoothingMs: 72,
    minTargetValue: 0,
    maxTargetValue: 0.14,
    enabled: true,
  },
  {
    id: 'raw-to-semantic-noise',
    label: 'Rohkörper → Reibungs-Rauschen',
    source: 'rawReality',
    target: 'semanticFriction.rawNoise',
    amount: 0.42,
    bipolar: false,
    curve: 'softKnee',
    smoothingMs: 115,
    minTargetValue: 0,
    maxTargetValue: 0.2,
    enabled: true,
  },
];

export function normalizeNodalModRoutes(routes: readonly Partial<NodalModRoute>[] | null | undefined): NodalModRoute[] {
  const source = routes?.length ? routes : DEFAULT_NODAL_MOD_ROUTES;
  return source.map((route, index) => {
    const fallback = DEFAULT_NODAL_MOD_ROUTES[index] ?? DEFAULT_NODAL_MOD_ROUTES[0];
    const minTargetValue = finiteOr(route.minTargetValue, fallback.minTargetValue);
    const maxTargetValue = Math.max(minTargetValue, finiteOr(route.maxTargetValue, fallback.maxTargetValue));
    return {
      id: route.id ?? fallback.id,
      label: route.label ?? fallback.label,
      source: route.source ?? fallback.source,
      target: route.target ?? fallback.target,
      amount: clamp(route.amount, -1, 1, fallback.amount),
      bipolar: route.bipolar ?? fallback.bipolar,
      curve: route.curve ?? fallback.curve,
      smoothingMs: clamp(route.smoothingMs, 12, 2000, fallback.smoothingMs),
      minTargetValue,
      maxTargetValue,
      enabled: route.enabled ?? fallback.enabled,
    };
  });
}

export function applyNodalModCurve(value: number, curve: NodalModCurve): number {
  const x = clamp01(value);
  if (curve === 'expo') return x * x;
  if (curve === 'softKnee') return x * x * (3 - 2 * x);
  if (curve === 'inverse') return 1 - x;
  if (curve === 'threshold') return x < 0.22 ? 0 : clamp01((x - 0.22) / 0.78);
  return x;
}

export function deriveNodalModSourceValues(
  snapshot: MyceliumSnapshot,
  semanticProfile?: Pick<NodalSemanticProfile, 'envObsession' | 'envRaw' | 'symbiosis'> | null,
  topologicalTelemetry?: Pick<TopologicalResonanceTelemetry, 'relationEnergy' | 'primaryInterference' | 'primarySparkle'> | null,
): NodalModSourceValues {
  const topologicalInterference = clamp01(topologicalTelemetry?.primaryInterference ?? snapshot.myzelPrimaryRelationInterference ?? 0);
  const auraOverlap = clamp01(
    topologicalInterference * 0.62
      + (topologicalTelemetry?.relationEnergy ?? 0) * 0.28
      + (snapshot.myzelTopologicalRelationCount ?? 0) * 0.02,
  );
  return {
    relationTension: clamp01(snapshot.myzelRelationTension ?? snapshot.constellationTension ?? 0),
    voidPressure: clamp01(snapshot.myzelVoidPressure ?? 0),
    clusterMass: clamp01(snapshot.myzelClusterMass ?? snapshot.constellationFlux ?? 0),
    auraOverlap,
    semanticObsession: clamp01(semanticProfile?.envObsession ?? 0),
    semanticSymbiosis: clamp01(semanticProfile?.symbiosis ?? 0),
    rawReality: clamp01(semanticProfile?.envRaw ?? 0),
    topologicalSparkle: clamp01(topologicalTelemetry?.primarySparkle ?? snapshot.myzelPrimaryRelationSparkle ?? 0),
    topologicalInterference,
    linearity: clamp01(snapshot.myzelGestaltLinearity ?? 0),
    asymmetry: clamp01(snapshot.myzelGestaltAsymmetry ?? Math.abs((snapshot.constellationCentroidX ?? 0.5) - 0.5) * 2),
  };
}

export function evaluateNodalModRoute(route: NodalModRoute, sourceValues: NodalModSourceValues): number {
  if (!route.enabled) return 0;
  const rawValue = clamp01(sourceValues[route.source] ?? 0);
  let mappedValue = applyNodalModCurve(rawValue, route.curve);
  if (route.bipolar) mappedValue = mappedValue * 2 - 1;
  const range = route.maxTargetValue - route.minTargetValue;
  const targetValue = route.minTargetValue + mappedValue * range * route.amount;
  return clamp(targetValue, route.minTargetValue, route.maxTargetValue, route.minTargetValue);
}

export function evaluateNodalModulationMatrix(
  sourceValues: NodalModSourceValues,
  routes: readonly Partial<NodalModRoute>[] | null | undefined = DEFAULT_NODAL_MOD_ROUTES,
): NodalModTargetValues {
  const result = Object.fromEntries(NODAL_MOD_TARGET_IDS.map((id) => [id, 0])) as NodalModTargetValues;
  normalizeNodalModRoutes(routes).forEach((route) => {
    result[route.target] = clamp(result[route.target] + evaluateNodalModRoute(route, sourceValues), -1, 1, 0);
  });
  return result;
}
