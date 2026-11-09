#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const panelBoundaryPath = 'src/features/xensonar/layout/useAppResonancePanelPropsBoundary.ts';
const indexPath = 'validation/contracts/xensonar/layout/appResonancePanelBoundaryIndex.ts';

const app = read(appPath);
const panelBoundary = read(panelBoundaryPath);
const index = read(indexPath);
const appLines = app.split(/\r?\n/).length;

const boundaryShape = {
  performanceCrisis: {
    builder: 'buildAppPerformanceCrisisPanelBoundary',
    inputGroups: [
      'uiPolicyState',
      'rootFollowGranulationSource',
      'audioBurstRecorder',
    ],
    outputContract: 'AppPerformanceCrisisPanelBoundaryInput',
    appCallNeedle: 'performanceCrisis: {',
    propBuilderNeedle: 'normalizePerformanceCrisisPanelInput(performanceCrisis)',
  },
  burstDiagnostics: {
    builder: 'buildAppBurstDiagnosticsPanelBoundary',
    inputGroups: [
      'audioTapMonitor',
      'audioBurstRecorder',
      'audioPairTherapistStatus',
      'rootFollowHealth',
      'workspacePackageActivationReport',
      'audioBurstRuntime',
      'exportContext',
      'rootFollowRecoveryActions',
    ],
    outputContract: 'BurstDiagnosticsPanelProps',
    appCallNeedle: 'burstDiagnostics: {',
    propBuilderNeedle: 'normalizeBurstDiagnosticsPanelInput(burstDiagnostics)',
  },
  materialTrack: {
    builder: 'buildAppMaterialTrackPanelBoundary',
    inputGroups: ['panelArgs', 'preview', 'previewSource'],
    outputContract: 'MaterialTrackPanelProps',
    appCallNeedle: 'materialTrack: {',
    propBuilderNeedle: 'buildMaterialTrackPanelProps(normalizeMaterialTrackPanelInput(materialTrack))',
  },
  resonanceControl: {
    builder: 'buildAppResonanceControlPanelBoundary',
    inputGroups: [
      'state',
      'gridAndTuning',
      'trafficRefs',
      'toneActions',
      'myzelInstallation',
    ],
    outputContract: 'ResonanceControlRuntimeProps',
    appCallNeedle: 'resonanceControl: {',
    propBuilderNeedle: 'normalizeResonanceControlPanelInput(resonanceControl)',
  },
  particleSystem: {
    builder: 'buildAppParticleSystemPanelBoundary',
    inputGroups: ['selection', 'presetCatalogSource', 'agentActions'],
    outputContract: 'ParticleSystemRuntimeProps',
    appCallNeedle: 'particleSystem: {',
    propBuilderNeedle: 'normalizeParticleSystemPanelInput(particleSystem)',
  },
};

const boundaryKeys = Object.keys(boundaryShape);
const forbiddenRuntimeMoves = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'safeApplyAttack(',
  'safeApplyExponentialRelease(',
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'playParticleNoiseAccentWithLifecycle(',
  'runParticleNexusToneOrchestrator(',
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
  'startQuantizedCollisionRuntime(',
  'requestAnimationFrame(',
  'setInterval(',
  'setTimeout(',
];

const directAppBoundaryImports = [
  './features/xensonar/diagnostics/buildAppBurstDiagnosticsPanelBoundary',
  './features/xensonar/groove/buildAppMaterialTrackPanelBoundary',
  './features/xensonar/performanceCrisis/buildAppPerformanceCrisisPanelBoundary',
  './features/xensonar/rooms/buildAppParticleSystemPanelBoundary',
  './features/xensonar/rooms/buildAppResonanceControlPanelBoundary',
];

const shapeEntriesContain = (needle) => index.includes(needle);
const allShapeEntriesContain = (field, expected) =>
  boundaryKeys.every((key) => {
    const entry = boundaryShape[key];
    return expected(key, entry).every((needle) => shapeEntriesContain(needle));
  });

const checks = {
  shapeAuditRunsAgainstExpectedFiles: [appPath, panelBoundaryPath, indexPath].every(exists),
  indexDeclaresShapeAuditMap: [
    'AppResonancePanelBoundaryShapeAuditEntry',
    'APP_RESONANCE_PANEL_BOUNDARY_SHAPE_AUDIT',
    'APP_RESONANCE_PANEL_BOUNDARY_NON_GOALS',
    'currentRole',
    'bridgeOwnsPanelPropBuild',
    'explicitlyNotOwned',
  ].every((needle) => index.includes(needle)),
  shapeAuditCoversExactlyTheKnownSubBoundaryKeys:
    boundaryKeys.every((key) => index.includes(`${key}: {`)) &&
    boundaryKeys.every((key) => index.includes(`'${key}'`)) &&
    !index.includes('rootFollowPanel: {') &&
    !index.includes('packageStation: {'),
  shapeAuditNamesEveryBuilder: allShapeEntriesContain('builder', (_key, entry) => [
    `builder: '${entry.builder}'`,
  ]),
  shapeAuditNamesEveryOutputContract: allShapeEntriesContain('outputContract', (_key, entry) => [
    `outputContract: '${entry.outputContract}'`,
  ]),
  shapeAuditNamesEveryInputGroup: boundaryKeys.every((key) =>
    boundaryShape[key].inputGroups.every((group) => index.includes(`'${group}'`)),
  ),
  shapeAuditMarksAllEntriesAsAppPanelInputMontageOnly:
    (index.match(/currentRole: 'app-panel-input-montage'/g) || []).length >= boundaryKeys.length &&
    (index.match(/bridgeOwnsPanelPropBuild: false/g) || []).length >= boundaryKeys.length,
  shapeAuditPreservesNonRuntimeNonAudioManifest:
    (index.match(/runtimeOwned: false/g) || []).length >= boundaryKeys.length &&
    (index.match(/audioMutating: false/g) || []).length >= boundaryKeys.length,
  shapeAuditManifestIsDerivedFromShapeAudit: index.includes(
    'APP_RESONANCE_PANEL_BOUNDARY_MANIFEST =\n  APP_RESONANCE_PANEL_BOUNDARY_SHAPE_AUDIT',
  ),
  appNoLongerImportsSubBoundariesThroughApp:
    !app.includes('./features/xensonar/layout/appResonancePanelBoundaryIndex') &&
    directAppBoundaryImports.every((needle) => !app.includes(needle)),
  appStillKeepsKnownPanelInputsBeforePanelBridge: boundaryKeys.every((key) =>
    app.includes(boundaryShape[key].appCallNeedle),
  ) && !app.includes('materialTrack: buildAppMaterialTrackPanelBoundary({'),
  panelBridgeStillOwnsPanelPropBuilderCalls: boundaryKeys.every((key) =>
    panelBoundary.includes(boundaryShape[key].propBuilderNeedle),
  ),
  panelBoundaryArgsStillMatchKnownKeys: boundaryKeys.every((key) =>
    panelBoundary.includes(`${key}:`),
  ),
  shapeAuditDoesNotMoveRuntimeOrSchedulingIntoIndex: forbiddenRuntimeMoves.every(
    (needle) => !index.includes(needle),
  ),
  panelBridgeDoesNotMoveRuntimeOrScheduling: forbiddenRuntimeMoves.every(
    (needle) => !panelBoundary.includes(needle),
  ),
  appLineCountNotInflatedByShapeAudit: appLines <= 5530,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  auditedSubBoundaries: boundaryKeys,
  mappedInputGroups: Object.fromEntries(
    boundaryKeys.map((key) => [key, boundaryShape[key].inputGroups]),
  ),
  movedScope: [
    'A typed shape-audit map for the existing App resonance panel sub-boundaries',
    'Explicit input-group names for Performance Crisis, Burst Diagnostics, Material Track, Resonance Control, and Particle System handoff',
    'A derived manifest that keeps the layer marked as non-runtime and non-audio-mutating',
  ],
  explicitlyNotMoved: [
    'No new panel sub-boundary was added',
    'No screen, surface, Root-Follow, Materialspur, Partikel, Wellenstarter, Drum/Bass, Paketstation, Worklet, or Room III behavior was changed',
    'No panel prop builder ownership was moved out of useAppResonancePanelPropsBoundary; Material Track, Burst-Diagnostics, Performance-Crisis, Resonance-Control and Particle-System source assembly is normalized there before prop building',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
