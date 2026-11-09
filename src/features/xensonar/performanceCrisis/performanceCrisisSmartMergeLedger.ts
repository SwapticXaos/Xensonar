export type SmartMerge879SliceKind =
  | 'workflow-fix'
  | 'performance-preset'
  | 'runtime-extraction'
  | 'instrument-body'
  | 'diagnostics-source'
  | 'build-hygiene';

export type SmartMerge879Slice = {
  id: string;
  label: string;
  kind: SmartMerge879SliceKind;
  mergeForm: string;
  appTsxRule: 'extract' | 'reference-only' | 'no-app-special-case';
  required: boolean;
};

export const SMART_MERGE_879_SLICES: readonly SmartMerge879Slice[] = [
  {
    id: 'package-station-import-export',
    label: 'Paketstation / Import-Export Robustheit',
    kind: 'workflow-fix',
    mergeForm: 'package archive builder, import planner, two-phase download, string-length guards',
    appTsxRule: 'extract',
    required: true,
  },
  {
    id: 'material-fragmentation-so-schneiden',
    label: 'Materialspur / So schneiden? Fragmentierungsworkflow',
    kind: 'workflow-fix',
    mergeForm: 'fragmentable body resolver, draft edit, commit-to-persistent-material contract',
    appTsxRule: 'extract',
    required: true,
  },
  {
    id: 'carrier-integral-material-routes',
    label: 'Carrier Integral / Audio-Paint / Raw-Audio Materialrouten',
    kind: 'instrument-body',
    mergeForm: 'SpectralForge route registry and handoff adapters',
    appTsxRule: 'no-app-special-case',
    required: true,
  },
  {
    id: 'donatello-dieter-render-bodies',
    label: 'Donatello / Dieter Renderkörper',
    kind: 'instrument-body',
    mergeForm: 'SpectralForge render-body registry with preview cache and neutral-pigment hydration',
    appTsxRule: 'extract',
    required: true,
  },
  {
    id: 'myzel-synth-room3',
    label: 'Myzel Synth / Raum III Geräte',
    kind: 'instrument-body',
    mergeForm: 'MyzelSynth runtime, device registry, audio graph, feature-gated activation',
    appTsxRule: 'extract',
    required: true,
  },
  {
    id: 'audio-lanes-pressure-time-contracts',
    label: 'Audio Lanes / Shared Time / Stable Protection',
    kind: 'performance-preset',
    mergeForm: 'Performance & Krisenmanagement policies and stable-lane adapters',
    appTsxRule: 'extract',
    required: true,
  },
  {
    id: 'particle-wave-runtime-binding',
    label: 'Partikel / Wellenstarter Runtime- und Intent-Politik',
    kind: 'runtime-extraction',
    mergeForm: 'particle simulation lane, audio-intent shaper, wave-starter admission policy',
    appTsxRule: 'extract',
    required: true,
  },
  {
    id: 'burst-diagnosis-browser-app-therapist',
    label: 'Burst Diagnose / Browser↔App PaarTherapeut',
    kind: 'diagnostics-source',
    mergeForm: 'single existing diagnostic window; performance manager references policies only',
    appTsxRule: 'reference-only',
    required: true,
  },
  {
    id: 'build-harness-source-hygiene',
    label: 'Build Harness / Core-Full Profile / Source Hygiene',
    kind: 'build-hygiene',
    mergeForm: 'tooling checks and artifact hygiene, not runtime UI code',
    appTsxRule: 'reference-only',
    required: true,
  },
] as const;

export function listRequiredSmartMerge879Slices(): readonly SmartMerge879Slice[] {
  return SMART_MERGE_879_SLICES.filter((slice) => slice.required);
}
