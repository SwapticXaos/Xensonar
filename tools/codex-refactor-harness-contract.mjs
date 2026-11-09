import { XENSONAR_ARCHITECTURE_LINE } from './xensonar-project-line.mjs';

export const codexRefactorHarnessVersion = XENSONAR_ARCHITECTURE_LINE;
export const agentsInstructionsPath = 'AGENTS.md';

export const focusProfiles = {
  'core-refactor': {
    label: 'Core-Refactor / HTML-Verschlankung',
    intent: 'Core-Test-Build klein halten, Full-/Archiv-Funktionen profilgesteuert erhalten und keine Forensik-Runtime in den Core zurückziehen.',
    primaryFiles: [
      'vite.config.ts',
      'src/features/xensonar/diagnostics/burstDiagnosticsRuntime.core.ts',
      'src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.core.ts',
      'tools/audit-build-body-profiles.mjs',
      'tools/check-vite-harness-path.mjs',
    ],
    gates: [
      'npm run xensonar:check-build-body-profiles',
      'npm run xensonar:check-portable-vite-html-contract',
      'npm run xensonar:check-parallel-refactor-sanity-contract',
    ],
  },
  'spectralforge-routing': {
    label: 'SpectralForge Routing Truth',
    intent: 'Carrier Integral, Hörweisen, Raw/Pink/Melodic/Root-Follow Übergaben über gemeinsame Verträge führen, ohne hörbares Material still zu ersetzen.',
    primaryFiles: [
      'src/features/l3lab/spectralForge/integral/carrierIntegralRootFollowArtifactRoutes.ts',
      'src/features/l3lab/spectralForge/components/CarrierIntegralPanel.tsx',
      'src/features/l3lab/spectralForge/integral/carrierIntegralSendTargets.ts',
      'tools/run-carrier-melodic-import-sanity.mjs',
    ],
    gates: [
      'npm run xensonar:sanity:carrier-melodic-import',
      'npm run xensonar:check-spectralforge-carrier-core-six-surface-7743',
    ],
  },
  'wavestarter-pressure': {
    label: 'Wellenstarter Mikro-Orchestration',
    intent: 'Audio-Druck nicht durch grobes Wegwerfen kaschieren, sondern frühe Gates, bounded deferral und lane-spezifische Priorität sauber halten.',
    primaryFiles: [
      'src/features/xensonar/audio/waveStarterMicroOrchestrator.ts',
      'src/features/xensonar/audio/waveStarterLaneRuntime.ts',
      'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts',
      'tools/run-wavestarter-boundary-sanity.mjs',
    ],
    gates: [
      'npm run xensonar:check-wave-starter-runtime-boundary',
    ],
  },
  'package-station': {
    label: 'Paketstation / vollständiger musikalischer Payload',
    intent: 'Import/Export-Verträge so sichern, dass Drum Patterns, SpectralForge-Projekte, Bass Patterns, Raster-Presets und Materialspur-Inhalte nicht auseinanderfallen.',
    primaryFiles: [
      'src/core/systemMemory/xensonarPackageStationBridge.ts',
      'src/features/xensonar/layout/PackageStationControl.tsx',
      'src/features/l3lab/canonicalForge/useCanonicalForgePackageStationBridge.ts',
      'tools/check-package-station-bridge-contract.mjs',
      'tools/check-package-complete-musical-payload-contract.mjs',
    ],
    gates: [
      'npm run xensonar:check-package-station-bridge-contract',
      'npm run xensonar:check-package-complete-musical-payload-contract',
    ],
  },
  'room3-myzel': {
    label: 'Raum III / Myzel Topologie',
    intent: 'Nodal-Fläche als echte relationale Steuerfläche weiter entwirren, nicht nur visuelle Knoten plus dekorative Slider verschieben.',
    primaryFiles: [
      'src/features/xensonar/room3',
      'src/features/xensonar/myzelSynth',
      'tools/check-myzel-room3-boundary-manifest.mjs',
    ],
    gates: [
      'npm run xensonar:check-myzel-topological-relations-boundary',
      'npm run xensonar:check-myzel-spatial-field-types-boundary',
      'npm run xensonar:check-myzel-node-spatial-config-boundary',
      'npm run xensonar:check-myzel-aura-overlap-geometry-boundary',
    ],
  },
};

export const forbiddenRuntimeClaims = [
  'Do not claim Klangidentität if renderer, scheduler, randomness, or buffer assembly changed without a specific proof.',
  'Do not move forensic or stress harness runtime back into the core-test profile to satisfy a superficial import.',
  'Do not replace audible Carrier/Hörweise material with a fallback body while keeping the same UI label.',
  'Do not add explanatory developer prose to live UI as compensation for missing behaviour.',
  'Do not normalize similar audio paths merely because their shapes look similar; first decide whether the difference is musical mutation or technical duplication.',
  'Do not treat marker-string audits as behavioural proof when the requested behaviour is clickable, audible, persistent, or exported.',
];

export const requiredHarnessScripts = [
  'xensonar:codex:refactor-harness',
  'xensonar:codex:refactor-harness:gates',
  'xensonar:codex:refactor-radar',
  'xensonar:codex:refactor-radar:gates',
  'xensonar:check-codex-refactor-harness-contract',
  'xensonar:check-codex-refactor-radar-suite',
  'xensonar:codex:refactor-candidates',
  'xensonar:codex:refactor-candidates:gates',
  'xensonar:check-codex-refactor-candidate-planner',
  'xensonar:codex:refactor-impact',
  'xensonar:codex:refactor-impact:gates',
  'xensonar:check-codex-refactor-impact-ledger',
  'xensonar:codex:source-metrics',
  'xensonar:check-codex-source-metrics-contract',
  'xensonar:codex:refactor-delta',
  'xensonar:codex:refactor-delta:gates',
  'xensonar:check-codex-refactor-delta-guard',
  'xensonar:codex:runtime-touch-guard',
  'xensonar:codex:runtime-touch-guard:allow',
  'xensonar:check-codex-runtime-touch-guard',
  'xensonar:codex:patch-scope-guard',
  'xensonar:codex:patch-scope-guard:tooling',
  'xensonar:codex:patch-scope-guard:allow',
  'xensonar:check-codex-patch-scope-guard',
  'xensonar:sanity:spectralforge-ui-boundary',
  'xensonar:check-digital-commons-provenance-ledger',
  'xensonar:codex:check-registry-curation',
  'xensonar:check-check-registry-curation',
  'xensonar:codex:refresh-current-line-baselines',
  'xensonar:check-codex-current-line-baseline-refresh',
  'xensonar:check-developer-handoff-7784',
  'xensonar:codex:refactor-direction-review',
  'xensonar:check-codex-refactor-direction-review',
];

export const expectedAgentInstructionMarkers = [
  'Xensonar Agent Instructions',
  'Codex-style code agents',
  'Falsifikationsfrage',
  'musical or gestural variance',
  'Build-profile contract',
  'SpectralForge / material routing contract',
  'Wellenstarter / performance contract',
  'Default gates for refactor harness work',
];

export const expectedHarnessDocMarkers = [
  '7.7.58',
  '7.7.59',
  '7.7.60',
  '7.7.61',
  '7.7.62',
  '7.7.63',
  '7.7.64',
  '7.7.65',
  '7.7.66',
  '7.7.67',
  '7.7.68',
  '7.7.69',
  '7.7.70',
  'AGENTS.md',
  'keine Klangrenderer',
  'keine UI-Erklärungstapete',
  'Falsifikationsfrage',
  'Markerchecks',
  'Core-Test-Build',
  'Full-/Archiv-Build',
  'musikalische Varianz',
  'Refactor Radar',
  'Candidate Planner',
  'nicht am Nutzer testen',
  'konkrete Refactor-Kandidaten',
  'Impact Ledger',
  'Vorher/Nachher-Signale',
  'Source Metrics',
  'gemeinsame Messbasis',
  'Delta Guard',
  'Größen-/Datei-Drift',
  'Runtime Touch Guard',
  'sensitive Runtime-Berührung',
  'Patch Scope Guard',
  'Scope-Grenzen',
  'TransportBar Boundary Refactor',
  'transportBarUiModel',
  'Digital Commons Provenance Ledger',
  'THIRD_PARTY_NOTICES.md',
  'PROVENANCE_LEDGER.md',
  'Check Registry Curation',
  'marker-static',
  'source-shape',
  'behavioural-audio-export',
  '7.7.71',
  '7.7.72',
  '7.7.73',
  '7.7.74',
  '7.7.75',
  '7.7.76',
  '7.7.77',
  '7.7.78',
  '7.7.79',
  '7.7.80',
  '7.7.81',
  '7.7.82',
  '7.7.83',
  '7.7.90',
  'current-line baseline refresh',
  'neuer Nullpunkt',
  'lokale Patch-Lesbarkeit',
  'Refactor Direction Review',
  'mechanische Boundary',
  'Check-/Report-Sediment',
];

export function focusProfileNames() {
  return Object.keys(focusProfiles);
}

export function isKnownFocusProfile(name) {
  return Object.prototype.hasOwnProperty.call(focusProfiles, name);
}

export function reportPathsForFocus(focus) {
  return {
    json: focus === 'core-refactor'
      ? 'reports/codex-refactor-harness.json'
      : `reports/codex-refactor-harness.${focus}.json`,
    markdown: focus === 'core-refactor'
      ? 'reports/codex-refactor-harness.md'
      : `reports/codex-refactor-harness.${focus}.md`,
  };
}

export const radarIndexPaths = {
  json: 'reports/codex-refactor-radar.json',
  markdown: 'reports/codex-refactor-radar.md',
};


export const candidatePlannerPaths = {
  json: 'reports/codex-refactor-candidates.json',
  markdown: 'reports/codex-refactor-candidates.md',
};

export const impactLedgerPaths = {
  json: 'reports/codex-refactor-impact-ledger.json',
  markdown: 'reports/codex-refactor-impact-ledger.md',
};

export const sourceMetricsPaths = {
  json: 'reports/codex-source-metrics-snapshot.json',
  markdown: 'reports/codex-source-metrics-snapshot.md',
};

export const sourceMetricsBaselinePaths = {
  json: 'reports/codex-source-metrics-baseline.3.2.91-7.7.90.json',
};

export const deltaGuardPaths = {
  json: 'reports/codex-refactor-delta-guard.json',
  markdown: 'reports/codex-refactor-delta-guard.md',
};

export const runtimeSensitiveBaselinePaths = {
  json: 'reports/codex-runtime-sensitive-baseline.3.2.91-7.7.90.json',
};

export const runtimeTouchGuardPaths = {
  json: 'reports/codex-runtime-touch-guard.json',
  markdown: 'reports/codex-runtime-touch-guard.md',
};


export const patchScopeGuardPaths = {
  json: 'reports/codex-patch-scope-guard.json',
  markdown: 'reports/codex-patch-scope-guard.md',
};


export const digitalCommonsProvenancePaths = {
  json: 'reports/digital-commons-provenance-ledger.json',
  markdown: 'reports/digital-commons-provenance-ledger.md',
};


export const checkRegistryCurationPaths = {
  json: 'reports/check-registry-curation.json',
  markdown: 'reports/check-registry-curation.md',
};



export const currentLineBaselineRefreshPaths = {
  json: 'reports/codex-current-line-baseline-refresh.json',
  markdown: 'reports/codex-current-line-baseline-refresh.md',
};
