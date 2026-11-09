import { carrierIntegralHash31, carrierIntegralRound3 } from './carrierIntegralStableIdentity';
import type {
  CarrierIntegralBodySourceMode,
  CarrierIntegralMachineDefinition,
  CarrierIntegralMachineId,
  CarrierIntegralMachineParams,
  CarrierIntegralPresetDefinition,
  CarrierIntegralRouteSignature,
} from './carrierIntegralContracts';

export const CARRIER_INTEGRAL_REGISTRY_VERSION = 'carrier-integral-antonia-branch-a-single-surface-v1';

export const DEFAULT_CARRIER_INTEGRAL_PARAMS: CarrierIntegralMachineParams = {
  maxVoices: 96,
  maxLines: 96,
  maxWindows: 32,
  minVoiceDurationBeats: 0.18,
  fadeInBeats: 0.035,
  fadeOutBeats: 0.08,
  densityCompression: 0.35,
  energyThreshold: 0.08,
  clusterMergeStrength: 0.42,
  microOffsetStrength: 0.18,
  localFieldDepth: 0.52,
  stretchElasticity: 0.5,
  headroomDb: -7,
  safetyMode: 'ausgewogen',
};

function params(patch: Partial<CarrierIntegralMachineParams>): CarrierIntegralMachineParams {
  return { ...DEFAULT_CARRIER_INTEGRAL_PARAMS, ...patch };
}

export const CARRIER_INTEGRAL_MACHINES: CarrierIntegralMachineDefinition[] = [
  {
    id: 'legacy-supernote-5.69',
    label: '5.69 Legacy · Archiv',
    shortLabel: '5.69 Legacy',
    family: 'legacy-direct-segment-machine',
    sourceBranches: ['5.69'],
    bodySourceModes: ['legacy_direct', 'neutral_pigment'],
    antiBurstStrategy: 'direct-segment-supernote',
    rootFollowRoute: 'synthetic-root-follow-plan',
    materialRoute: 'rendered-material-body',
    targetSupport: {
      'root-follow-preview': true,
      'root-follow-export': true,
      'material-preview': true,
      'materialspur-export': true,
      'melodic-pink-export': true,
      'validation': true,
      'abc-root-comparison': true,
    },
    defaultParams: params({ maxVoices: 220, maxLines: 220, fadeInBeats: 0, fadeOutBeats: 0, densityCompression: 0.08, safetyMode: 'frei' }),
    treatAsDistinctMachine: true,
    summary: '5.69 Legacy: ältere direkte Carrier-zu-Synth-Lesung. Bleibt für Altprojekte auflösbar, ist aber nicht die aktive Antonia-Hörweise.',
    guardrail: 'Nicht als aktive Antonia zurückführen; die aktive Antonia ist die Branch-A Linienkörper-Lesung.',
  },
  {
    id: 'raw-darkpsy-oscillator',
    label: 'Roh-Oszillator',
    shortLabel: 'Darkpsy direkt',
    family: 'raw-oscillator-direct-machine',
    sourceBranches: ['5.69', 'new-integral'],
    bodySourceModes: ['raw_oscillator'],
    antiBurstStrategy: 'raw-oscillator-direct',
    rootFollowRoute: 'raw-loop-track-synth-body',
    materialRoute: 'raw-loop-track-synth-body',
    targetSupport: {
      'loop-track-direct-export': true,
      'root-follow-preview': true,
      'root-follow-export': true,
      'materialspur-export': true,
      'melodic-pink-export': true,
      'validation': true,
    },
    defaultParams: params({ maxVoices: 64, maxLines: 128, fadeInBeats: 0.01, fadeOutBeats: 0.04, densityCompression: 0.18, localFieldDepth: 0.22, stretchElasticity: 0.18, safetyMode: 'frei' }),
    treatAsDistinctMachine: true,
    summary: 'Bewusst rohe Hörweise-senden-Route ohne vorherige Timbre-Extraktion: abstrakter Synth-/Darkpsy-Körper direkt in eine Loop-Spur.',
    guardrail: 'Nicht als Fehlerzustand behandeln, wenn kein Donor extrahiert wurde; raw_oscillator ist eine eigene ästhetische Körperquelle.',
  },
  {
    id: 'harmonic-xplore-direct-carrier',
    label: 'HarmonicXplorE · Direktkörper',
    shortLabel: 'HarmonicXplorE',
    family: 'harmonic-ratio-carrier-machine',
    sourceBranches: ['harmonic-xplore', 'new-integral'],
    bodySourceModes: ['harmonic_xplore'],
    antiBurstStrategy: 'harmonic-xplore-direct-carrier',
    rootFollowRoute: 'harmonic-xplore-direct-carrier',
    materialRoute: 'harmonic-xplore-direct-carrier',
    targetSupport: {
      'root-follow-preview': true,
      'root-follow-export': true,
      'material-preview': true,
      'materialspur-export': true,
      'melodic-pink-export': true,
      'validation': true,
    },
    defaultParams: params({ maxVoices: 18, maxLines: 64, maxWindows: 16, minVoiceDurationBeats: 0.24, fadeInBeats: 0.012, fadeOutBeats: 0.09, densityCompression: 0.22, energyThreshold: 0.04, clusterMergeStrength: 0.18, microOffsetStrength: 0.08, localFieldDepth: 0.28, stretchElasticity: 0.22, headroomDb: -10, safetyMode: 'frei' }),
    treatAsDistinctMachine: true,
    summary: 'HarmonicXplorE Direkt: fremder Verhältnis-/Geometrie-Carrier als eigener Timbre-Renderer. Enthält deterministische Resonator-/Scatter-/Metallisch-Profile ohne neue Maschinen-IDs und darf Legacy-Synth-Gammel überformen, ohne Hauptraum-Hotpath oder Wellenstarter-Zahlen zu berühren.',
    guardrail: 'Suchraum: keine Heiligsprechung bestehender Synth-Labor-Piepskörper. Dieser Modus darf deutlich anders klingen, behauptet aber keine finale Carrier-Lösung.',
  },
  {
    id: 'spektral-synthese-body',
    label: 'SpektralSynthese · Bildkörper',
    shortLabel: 'SpektralSynthese',
    family: 'harmonic-ratio-carrier-machine',
    sourceBranches: ['harmonic-xplore', 'new-integral'],
    bodySourceModes: ['harmonic_xplore', 'spektral_synthese'],
    antiBurstStrategy: 'harmonic-xplore-direct-carrier',
    rootFollowRoute: 'harmonic-xplore-direct-carrier',
    materialRoute: 'harmonic-xplore-direct-carrier',
    targetSupport: {
      'root-follow-preview': true,
      'root-follow-export': true,
      'material-preview': true,
      'materialspur-export': true,
      'melodic-pink-export': true,
      'validation': true,
    },
    defaultParams: params({ maxVoices: 18, maxLines: 64, maxWindows: 16, minVoiceDurationBeats: 0.24, fadeInBeats: 0.012, fadeOutBeats: 0.09, densityCompression: 0.22, energyThreshold: 0.04, clusterMergeStrength: 0.18, microOffsetStrength: 0.08, localFieldDepth: 0.28, stretchElasticity: 0.22, headroomDb: -10, safetyMode: 'frei' }),
    treatAsDistinctMachine: true,
    summary: 'SpektralSynthese liest die Malerei als kompakte Bilddeskriptoren und moduliert damit den HarmonicXplorE-Direktkörper. Ziel: mehr Bild-Unterschied, ohne Pure-Dieter-Pixelrender-Schwere.',
    guardrail: 'Neue Hörweise, nicht stiller Ersatz für HarmonicXplorE oder Pure Dieter. Descriptor-Parameter dürfen Klangvielfalt erzeugen, aber keine Auto-Hörweisenwahl oder Black-Box-ML behaupten.',
  },
  {
    id: 'branch-a-line-traffic',
    label: 'Antonia',
    shortLabel: 'Antonia',
    family: 'line-traffic-machine',
    sourceBranches: ['branch-a-5.80'],
    bodySourceModes: ['neutral_pigment', 'audio_donor'],
    antiBurstStrategy: 'traffic-line-shaping',
    rootFollowRoute: 'synthetic-root-follow-plan',
    materialRoute: 'rendered-material-body',
    targetSupport: {
      'root-follow-preview': true,
      'root-follow-export': true,
      'material-preview': true,
      'materialspur-export': true,
      'melodic-pink-export': true,
      'validation': true,
      'abc-root-comparison': true,
    },
    defaultParams: params({ maxVoices: 96, maxLines: 144, maxWindows: 40, fadeInBeats: 0.025, fadeOutBeats: 0.07, densityCompression: 0.46, microOffsetStrength: 0.34, localFieldDepth: 0.34 }),
    treatAsDistinctMachine: true,
    summary: 'Antonia: Branch-A Linienkörper-/FM-Polytrace-Lesung als einzige aktive Antonia-Hörweise. Ihre Klangfläche darf nicht durch 5.69 Legacy, Bert oder Cecilia ersetzt werden.',
    guardrail: 'Genau eine Antonia aktiv halten: Branch-A ist Antonia; 5.69 Legacy bleibt Archivmaterial und darf nicht als zweite oder eigentliche Antonia zurückkehren.',
  },
  {
    id: 'branch-b573-synth-window',
    label: 'B · B_5.73 Synth-Fenster',
    shortLabel: 'B_5.73 Stretch',
    family: 'synth-window-machine',
    sourceBranches: ['branch-b-5.73', 'branch-c-5.87-reconstruction'],
    bodySourceModes: ['neutral_pigment', 'audio_donor'],
    antiBurstStrategy: 'b573-synth-window-body',
    rootFollowRoute: 'synthetic-root-follow-plan',
    materialRoute: 'rendered-material-body',
    targetSupport: {
      'root-follow-preview': true,
      'root-follow-export': true,
      'material-preview': true,
      'materialspur-export': true,
      'melodic-pink-export': true,
      'validation': true,
      'abc-root-comparison': true,
    },
    defaultParams: params({ maxVoices: 72, maxLines: 96, maxWindows: 28, minVoiceDurationBeats: 0.32, fadeInBeats: 0.055, fadeOutBeats: 0.14, densityCompression: 0.62, clusterMergeStrength: 0.58, localFieldDepth: 0.82, stretchElasticity: 0.78, safetyMode: 'ausgewogen' }),
    treatAsDistinctMachine: true,
    summary: 'Reproduzierbare B_5.73-Root-Follow-Lesung: dichte Carrier-Spalten werden als stretchbare synthetische Fensterstimmen mit localField-Kurven gelesen.',
    guardrail: 'Darf nicht mit dem raueren Materialkörper-Hören oder dem C-Intervallkörper verwechselt werden.',
  },
  {
    id: 'branch-c-interval-body',
    label: 'C · Intervallkörper',
    shortLabel: 'C Körper',
    family: 'interval-body-machine',
    sourceBranches: ['branch-c-5.84', 'branch-c-5.87'],
    bodySourceModes: ['neutral_pigment', 'audio_donor'],
    antiBurstStrategy: 'interval-window-body',
    rootFollowRoute: 'synthetic-root-follow-plan',
    materialRoute: 'rendered-material-body',
    targetSupport: {
      'root-follow-preview': true,
      'root-follow-export': true,
      'material-preview': true,
      'materialspur-export': true,
      'melodic-pink-export': true,
      'validation': true,
      'abc-root-comparison': true,
    },
    defaultParams: params({ maxVoices: 48, maxLines: 72, maxWindows: 24, minVoiceDurationBeats: 0.48, fadeInBeats: 0.075, fadeOutBeats: 0.18, densityCompression: 0.72, clusterMergeStrength: 0.72, localFieldDepth: 0.7, stretchElasticity: 0.66, safetyMode: 'streng' }),
    treatAsDistinctMachine: true,
    summary: 'Intervallfenster-Körper: dichte Zeit-Frequenz-Zonen werden vor der Notenbildung als wenige längere Rollen-/Fensterstimmen gelesen.',
    guardrail: 'C darf B_5.73 nicht absorbieren; gleiche Fensterbegriffe bedeuten nicht gleiche Maschine.',
  }
];

export const CARRIER_INTEGRAL_PRESETS: CarrierIntegralPresetDefinition[] = [
  {
    id: 'raw-darkpsy-direkt',
    machineId: 'raw-darkpsy-oscillator',
    label: 'Darkpsy roh direkt',
    source: 'new-integral',
    params: { maxVoices: 64, maxLines: 128, localFieldDepth: 0.18, densityCompression: 0.16 },
    intendedCarrierUse: 'Hörweise senden ohne Timbre-Extraktion, direkt in Root Follow Loop, Materialspur oder Loop-Spur.',
  },
  {
    id: 'harmonic-xplore-prime-direct',
    machineId: 'harmonic-xplore-direct-carrier',
    label: 'Prim-Skelett Direkt',
    source: 'harmonic-xplore',
    bodySourceMode: 'harmonic_xplore',
    params: { maxVoices: 18, maxLines: 64, safetyMode: 'frei', headroomDb: -10, densityCompression: 0.18 },
    intendedCarrierUse: 'HarmonicXplorE als eigener Verhältnisskörper: nicht nur Preset-Linse, sondern direkt gerenderter Carrier-Klangkörper.',
  },
  {
    id: 'a-linienverkehr-standard',
    machineId: 'branch-a-line-traffic',
    label: 'Antonia Linienkörper Standard',
    source: 'branch-a',
    params: { maxLines: 144, microOffsetStrength: 0.34, densityCompression: 0.46 },
    intendedCarrierUse: 'Aktive Antonia-Lesung mit hörbarer Linienkontur und dichter Startverteilung.'
  },
  {
    id: 'b573-stretch-standard',
    machineId: 'branch-b573-synth-window',
    label: 'B_5.73 Stretch Standard',
    source: 'branch-b-5.73',
    params: { maxWindows: 28, localFieldDepth: 0.82, stretchElasticity: 0.78, densityCompression: 0.62 },
    intendedCarrierUse: 'Die reproduzierte B_5.73-Synthfenster-Umrechnung.',
  },
  {
    id: 'b573-neutral-pigment-stretch',
    machineId: 'branch-b573-synth-window',
    label: 'B_5.73 Neutral-Pigment Stretch',
    bodySourceMode: 'neutral_pigment',
    source: 'branch-b-5.82',
    params: { maxWindows: 28, localFieldDepth: 0.82, stretchElasticity: 0.78, densityCompression: 0.62 },
    intendedCarrierUse: 'B_5.73-Synthfenster mit neutralem Pigment-Stub: kein Audio-Donor wird vorausgesetzt oder behauptet.',
  },
  {
    id: 'c-intervallkoerper-standard',
    machineId: 'branch-c-interval-body',
    label: 'C Intervallkörper Standard',
    source: 'branch-c',
    params: { maxWindows: 24, localFieldDepth: 0.7, stretchElasticity: 0.66, densityCompression: 0.72 },
    intendedCarrierUse: 'Dichte Carrier-Felder als wenige längere Intervallfensterstimmen.',
  }
];

const MACHINE_BY_ID = new Map(CARRIER_INTEGRAL_MACHINES.map((machine) => [machine.id, machine] as const));

export function listCarrierIntegralMachines(): CarrierIntegralMachineDefinition[] {
  return CARRIER_INTEGRAL_MACHINES
    .filter((machine) => machine.id !== 'legacy-supernote-5.69')
    .map((machine) => ({ ...machine, defaultParams: { ...machine.defaultParams }, targetSupport: { ...machine.targetSupport }, bodySourceModes: [...machine.bodySourceModes], sourceBranches: [...machine.sourceBranches] }));
}

export function listCarrierIntegralMachinesIncludingArchive(): CarrierIntegralMachineDefinition[] {
  return CARRIER_INTEGRAL_MACHINES.map((machine) => ({ ...machine, defaultParams: { ...machine.defaultParams }, targetSupport: { ...machine.targetSupport }, bodySourceModes: [...machine.bodySourceModes], sourceBranches: [...machine.sourceBranches] }));
}

export function resolveCarrierIntegralMachine(id: CarrierIntegralMachineId | string | null | undefined): CarrierIntegralMachineDefinition {
  return MACHINE_BY_ID.get(id as CarrierIntegralMachineId) ?? MACHINE_BY_ID.get('branch-c-interval-body')!;
}

export function mergeCarrierIntegralParams(machineId: CarrierIntegralMachineId, patch?: Partial<CarrierIntegralMachineParams> | null): CarrierIntegralMachineParams {
  const machine = resolveCarrierIntegralMachine(machineId);
  return clampCarrierIntegralParams({ ...machine.defaultParams, ...(patch ?? {}) });
}

export function clampCarrierIntegralParams(params: CarrierIntegralMachineParams): CarrierIntegralMachineParams {
  return {
    maxVoices: clampInt(params.maxVoices, 1, 512),
    maxLines: clampInt(params.maxLines, 1, 512),
    maxWindows: clampInt(params.maxWindows, 1, 256),
    minVoiceDurationBeats: clamp(params.minVoiceDurationBeats, 0, 8),
    fadeInBeats: clamp(params.fadeInBeats, 0, 4),
    fadeOutBeats: clamp(params.fadeOutBeats, 0, 4),
    densityCompression: clamp01(params.densityCompression),
    energyThreshold: clamp01(params.energyThreshold),
    clusterMergeStrength: clamp01(params.clusterMergeStrength),
    microOffsetStrength: clamp01(params.microOffsetStrength),
    localFieldDepth: clamp01(params.localFieldDepth),
    stretchElasticity: clamp01(params.stretchElasticity),
    headroomDb: clamp(params.headroomDb, -36, 3),
    safetyMode: params.safetyMode === 'frei' || params.safetyMode === 'streng' ? params.safetyMode : 'ausgewogen',
  };
}

export function buildCarrierIntegralRouteSignature(args: {
  machineId: CarrierIntegralMachineId;
  bodySourceMode?: CarrierIntegralBodySourceMode | null;
  params?: Partial<CarrierIntegralMachineParams> | null;
}): CarrierIntegralRouteSignature {
  const machine = resolveCarrierIntegralMachine(args.machineId);
  const resolvedParams = mergeCarrierIntegralParams(machine.id, args.params);
  const bodySourceMode = args.bodySourceMode && machine.bodySourceModes.includes(args.bodySourceMode)
    ? args.bodySourceMode
    : machine.bodySourceModes[0];
  return {
    machineId: machine.id,
    bodySourceMode,
    antiBurstStrategy: machine.antiBurstStrategy,
    rootFollowRoute: machine.rootFollowRoute,
    materialRoute: machine.materialRoute,
    paramsHash: stableParamsHash(resolvedParams),
  };
}

function stableParamsHash(params: CarrierIntegralMachineParams): string {
  const normalized = [
    params.maxVoices,
    params.maxLines,
    params.maxWindows,
    carrierIntegralRound3(params.minVoiceDurationBeats),
    carrierIntegralRound3(params.fadeInBeats),
    carrierIntegralRound3(params.fadeOutBeats),
    carrierIntegralRound3(params.densityCompression),
    carrierIntegralRound3(params.energyThreshold),
    carrierIntegralRound3(params.clusterMergeStrength),
    carrierIntegralRound3(params.microOffsetStrength),
    carrierIntegralRound3(params.localFieldDepth),
    carrierIntegralRound3(params.stretchElasticity),
    carrierIntegralRound3(params.headroomDb),
    params.safetyMode,
  ].join('|');
  return carrierIntegralHash31(normalized);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function clampInt(value: number, min: number, max: number) {
  return Math.round(clamp(value, min, max));
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}
