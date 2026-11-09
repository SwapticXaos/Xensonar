import type {
  CarrierIntegralMachineId,
  CarrierIntegralRouteSignature,
} from './carrierIntegralContracts';

export type CarrierIntegralRuntimeRootFollowRouteStatus =
  | 'wired'
  | 'contract-only'
  | 'material-route-only';

export type CarrierIntegralRuntimeRootFollowRoute = {
  machineId: CarrierIntegralMachineId;
  status: CarrierIntegralRuntimeRootFollowRouteStatus;
  compositionPresetId: string;
  emissionMode: string;
  label: string;
  summary: string;
  guardrail: string;
  mayUseDirectSupernoteBuilder: boolean;
  shouldBuildSyntheticRootFollow: boolean;
};

const ROUTES: Partial<Record<CarrierIntegralMachineId, CarrierIntegralRuntimeRootFollowRoute>> = {
  'raw-darkpsy-oscillator': {
    machineId: 'raw-darkpsy-oscillator',
    status: 'wired',
    compositionPresetId: 'spectralforge-v2-raw-darkpsy-oscillator',
    emissionMode: 'raw_darkpsy_oscillator_direct',
    label: 'Roh-Oszillator',
    summary: 'Hörweise-senden ohne Timbre-Extraktion bleibt als roher synthetischer Direktkörper aktiv.',
    guardrail: 'Raw-Darkpsy ist kein fehlender Donor und kein neutraler Pigment-Stub, sondern eine eigene rohe Synth-Lesart.',
    mayUseDirectSupernoteBuilder: true,
    shouldBuildSyntheticRootFollow: true,
  },
  'harmonic-xplore-direct-carrier': {
    machineId: 'harmonic-xplore-direct-carrier',
    status: 'wired',
    compositionPresetId: 'spectralforge-v2-harmonic-xplore-direct-carrier',
    emissionMode: 'harmonic_xplore_direct_ratio_carrier',
    label: 'HarmonicXplorE',
    summary: 'HarmonicXplorE Direkt ist als eigener Verhältnis-Carrier-Renderer aktiv: fremde Ratio-Geometrie darf den bisherigen Synth-Labor-Klang deutlich überformen.',
    guardrail: 'Kein Hauptraum-Hotpath, keine Burst-Zahlen, keine finale Carrier-Wahrheit; es ist ein Suchkörper für Timbre-Erzeugung.',
    mayUseDirectSupernoteBuilder: false,
    shouldBuildSyntheticRootFollow: true,
  },
  'spektral-synthese-body': {
    machineId: 'spektral-synthese-body',
    status: 'wired',
    compositionPresetId: 'spectralforge-v2-spektral-synthese-body',
    emissionMode: 'spektral_synthese_descriptor_hx_body',
    label: 'SpektralSynthese',
    summary: 'SpektralSynthese ist als descriptor-informierte HarmonicXplorE-Lesart aktiv: Bildmetriken modulieren Reihe, Flavor, Streuung und Akzente.',
    guardrail: 'Kein Pure-Dieter-Ersatz und keine Root-Follow-Paritätsbehauptung; zunächst Hörweisen-/Preview-Körper.',
    mayUseDirectSupernoteBuilder: false,
    shouldBuildSyntheticRootFollow: false,
  },
  'legacy-supernote-5.69': {
    machineId: 'legacy-supernote-5.69',
    status: 'wired',
    compositionPresetId: 'spectralforge-v2-legacy-supernote-5-69',
    emissionMode: 'legacy_5_69_direct_supernote',
    label: '5.69 Legacy',
    summary: 'Die 5.69 Direktlesung bleibt als Legacy-/Kompatibilitätsroute auflösbar, ist aber nicht die aktive Antonia.',
    guardrail: 'Nicht als aktive Antonia oder zweite Antonia in die Hörfläche zurückführen.',
    mayUseDirectSupernoteBuilder: true,
    shouldBuildSyntheticRootFollow: true,
  },
  'branch-a-line-traffic': {
    machineId: 'branch-a-line-traffic',
    status: 'wired',
    compositionPresetId: 'spectralforge-v2-branch-a-line-traffic',
    emissionMode: 'branch_a_line_traffic',
    label: 'Antonia',
    summary: 'Antonia ist die Branch-A Linienkörper-Lesung als einzige aktive Antonia-Hörweise.',
    guardrail: 'Nicht als 5.69-Direktlesung, Bert, Cecilia oder Materialkörper ausgeben; diese Klangfläche darf durch Refactor nicht umetikettiert werden.',
    mayUseDirectSupernoteBuilder: false,
    shouldBuildSyntheticRootFollow: true,
  },
  'branch-b573-synth-window': {
    machineId: 'branch-b573-synth-window',
    status: 'wired',
    compositionPresetId: 'spectralforge-v2-b573-synth-window-body',
    emissionMode: 'branch_b_5_73_synth_window_body',
    label: 'Bert',
    summary: 'Bert ist als stretchbare Synth-Prisma-Hörweise aktiv: dichte Carrier-Spalten werden in synthetische Stimmen mit LocalField-Kurven übersetzt.',
    guardrail: 'B_5.73 darf nicht wieder als Körper-hören, C-Intervallkörper oder Legacy-Supernote ausgegeben werden.',
    mayUseDirectSupernoteBuilder: false,
    shouldBuildSyntheticRootFollow: true,
  },
  'branch-c-interval-body': {
    machineId: 'branch-c-interval-body',
    status: 'wired',
    compositionPresetId: 'spectralforge-v2-interval-window-body',
    emissionMode: 'branch_c_interval_window_body',
    label: 'Cecilia',
    summary: 'Cecilia liest dichte Zeit-Frequenz-Zonen als synthetische Vocal-/Polytrace-Stimmen mit LocalField.',
    guardrail: 'C darf nicht durch B_5.73 oder Legacy-Supernote ersetzt werden; dieser Pfad nutzt Intervallfenster-Meta und keine direkte Segmentnoten-Fallback-Lesung.',
    mayUseDirectSupernoteBuilder: false,
    shouldBuildSyntheticRootFollow: true,
  }
};

export function resolveCarrierIntegralRuntimeRootFollowRoute(
  signature?: CarrierIntegralRouteSignature | null,
): CarrierIntegralRuntimeRootFollowRoute {
  return ROUTES[signature?.machineId ?? 'branch-a-line-traffic'] ?? ROUTES['branch-a-line-traffic']!;
}

export function listCarrierIntegralRuntimeRootFollowRoutes(): CarrierIntegralRuntimeRootFollowRoute[] {
  return Object.values(ROUTES).map((route) => ({ ...route }));
}
