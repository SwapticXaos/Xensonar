#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/layout/useAppResonancePanelPropsBoundary.ts';
const indexPath = 'validation/contracts/xensonar/layout/appResonancePanelBoundaryIndex.ts';
const typesPath = 'src/features/xensonar/layout/useAppResonancePanelPropsBoundaryTypes.ts';
const pkgPath = 'package.json';

const app = read(appPath);
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const index = exists(indexPath) ? read(indexPath) : '';
const types = exists(typesPath) ? read(typesPath) : '';
const pkg = JSON.parse(read(pkgPath));
const appLines = app.split(/\r?\n/).length;

const expectedKeys = [
  'materialTrack',
  'burstDiagnostics',
  'performanceCrisis',
  'resonanceControl',
  'particleSystem',
];

const panelPropKeys = [
  'materialTrackPanelProps',
  'burstDiagnosticsPanelProps',
  'performanceCrisisPanelProps',
  'resonanceControlRuntimeProps',
  'particleSystemRuntimeProps',
];

const panelPropBuilders = [
  'buildMaterialTrackPanelProps',
  'buildBurstDiagnosticsPanelProps',
  'buildPerformanceCrisisPanelProps',
  'buildResonanceControlProps',
  'buildParticleSystemProps',
];

const outputContracts = [
  'MaterialTrackPanelProps',
  'BurstDiagnosticsPanelProps',
  'AppPerformanceCrisisPanelBoundaryInput',
  'ResonanceControlRuntimeProps',
  'ParticleSystemRuntimeProps',
];

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

const checks = {
  expectedFilesExist: [appPath, boundaryPath, typesPath, indexPath, pkgPath].every(exists),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-panel-props-boundary-contract-cleanup'] ===
    'node tools/check-app-resonance-panel-props-boundary-contract-cleanup.mjs',
  boundaryConsumesSubBoundaryOutputContractMapWithPreparedSourceInputs:
    boundary.includes("from './useAppResonancePanelPropsBoundaryTypes'") &&
    types.includes('AppResonancePanelBoundaryOutputContractMap') &&
    types.includes('export type UseAppResonancePanelPropsBoundaryArgs =') &&
    types.includes('AppResonancePanelPropsMaterialTrackInput') &&
    types.includes('AppResonancePanelPropsBurstDiagnosticsInput') &&
    types.includes('AppResonancePanelPropsPerformanceCrisisInput') &&
    types.includes('AppResonancePanelPropsParticleSystemInput') &&
    types.includes('AppResonancePanelPropsResonanceControlInput') &&
    types.includes("'materialTrack' | 'burstDiagnostics' | 'performanceCrisis' | 'resonanceControl' | 'particleSystem'") &&
    types.includes('readonly burstDiagnostics: AppResonancePanelPropsBurstDiagnosticsInput;') &&
    types.includes('readonly performanceCrisis: AppResonancePanelPropsPerformanceCrisisInput;') &&
    types.includes('readonly resonanceControl: AppResonancePanelPropsResonanceControlInput;') &&
    types.includes('readonly particleSystem: AppResonancePanelPropsParticleSystemInput;'),
  boundaryNoLongerUsesStringyPerformanceInputParameter:
    !boundary.includes('Parameters<typeof buildPerformanceCrisisPanelProps>[0]'),
  boundaryDeclaresBuildOrderAgainstKnownSubBoundaryKeys:
    boundary.includes('APP_RESONANCE_PANEL_PROPS_BOUNDARY_BUILD_ORDER') &&
    boundary.includes('satisfies readonly AppResonancePanelBoundaryKey[]') &&
    expectedKeys.every((key) => boundary.includes(`'${key}'`)),
  boundaryDeclaresPanelOutputContractMap:
    types.includes('AppResonancePanelPropsBoundaryOutputContractMap') &&
    panelPropKeys.every((key) => types.includes(`readonly ${key}:`)),
  boundaryAliasesPublicReturnContractToOutputContractMap:
    types.includes('export type AppResonancePanelPropsBoundary =') &&
    types.includes('AppResonancePanelPropsBoundaryOutputContractMap;') &&
    boundary.includes('AppResonancePanelPropsBoundary') &&
    boundary.includes("from './useAppResonancePanelPropsBoundaryTypes'"),
  boundaryDeclaresContractEntries:
    boundary.includes('AppResonancePanelPropsBoundaryContractEntry') &&
    boundary.includes('APP_RESONANCE_PANEL_PROPS_BOUNDARY_CONTRACT') &&
    expectedKeys.every((key) => boundary.includes(`${key}: {`)) &&
    panelPropKeys.every((key) => boundary.includes(`panelPropKey: '${key}'`)) &&
    panelPropBuilders.every((builder) => boundary.includes(`panelPropBuilder: '${builder}'`)) &&
    outputContracts.every((contract) => boundary.includes(`sourceOutputContract: '${contract}'`)),
  boundaryContractExplicitlyNonRuntimeNonAudio:
    (boundary.match(/bridgeOwnsRuntime: false/g) || []).length >= expectedKeys.length + 1 &&
    (boundary.match(/bridgeMutatesAudio: false/g) || []).length >= expectedKeys.length + 1,
  boundaryKeepsPanelPropBuilderOwnershipOnly:
    panelPropBuilders.every((builder) => boundary.includes(`${builder}(`)) &&
    boundary.includes('const panelPropsBoundary = {') &&
    boundary.includes('} satisfies AppResonancePanelPropsBoundary;') &&
    boundary.includes('return panelPropsBoundary;'),
  boundaryDoesNotMoveRuntimeOrScheduling: forbiddenRuntimeMoves.every((needle) => !boundary.includes(needle)),
  appStillOwnsRiskyNonMaterialPanelInputComposition: [
    'burstDiagnostics: {',
    'audioBurstRuntime',
    'rootFollowRecoveryActions:',
    'resonanceControl: {',
    'gridAndTuning:',
    'trafficRefs:',
    'toneActions:',
    'myzelInstallation:',
    'performanceCrisis: {',
    'rootFollowGranulationSource: { nParamsUI, updateNParams }',
    'particleSystem: {',
    'agentActions: { previewParticlePresetSelection: previewParticlePresetSelectionAction, toggleNexusAgent, setNexusAgentVolume }',
  ].every((needle) => app.includes(needle)) &&
    app.includes('materialTrack: {') &&
    app.includes('previewSource: { myceliumSnapshotRef, audioCtx, nexusRefs, rhythmForgeSeedRef }') &&
    !app.includes('materialTrack: buildAppMaterialTrackPanelBoundary({'),
  appStillCallsPropsBoundaryOnce:
    (app.match(/useAppResonancePanelPropsBoundary\(/g) || []).length === 1,
  appDoesNotImportPanelPropBuildersDirectly: [
    './features/xensonar/rooms/buildMaterialTrackPanelProps',
    './features/xensonar/rooms/buildBurstDiagnosticsPanelProps',
    './features/xensonar/performanceCrisis/performanceCrisisPanelProps',
    './features/xensonar/rooms/buildResonanceControlProps',
    './features/xensonar/rooms/buildParticleSystemProps',
  ].every((needle) => !app.includes(needle)),
  indexStillExposesSubBoundaryContractMaps: [
    'AppResonancePanelBoundaryInputContractMap',
    'AppResonancePanelBoundaryOutputContractMap',
    'APP_RESONANCE_PANEL_BOUNDARY_CONTRACT_CLEANUP_PROBE',
  ].every((needle) => index.includes(needle)),
  appLineCountWithinPropsBoundaryCleanupRange: appLines <= 5540,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  appLines,
  tightenedBoundary: {
    argsNowDerivedFrom: 'AppResonancePanelBoundaryOutputContractMap-with-all-panel-source-inputs-normalized',
    outputMap: 'AppResonancePanelPropsBoundaryOutputContractMap',
    contract: 'APP_RESONANCE_PANEL_PROPS_BOUNDARY_CONTRACT',
    order: 'APP_RESONANCE_PANEL_PROPS_BOUNDARY_BUILD_ORDER',
  },
  movedScope: [
    'useAppResonancePanelPropsBoundary now consumes the typed output contract of the App resonance panel sub-boundaries while normalizing compact Material Track, Burst-Diagnostics, Performance-Crisis, Resonance-Control and Particle-System inputs',
    'The panel-props boundary declares its own output contract map and a non-runtime/non-audio builder contract manifest',
    'The performance crisis input is no longer expressed as a loose Parameters<typeof buildPerformanceCrisisPanelProps>[0] in the central props boundary',
  ],
  explicitlyNotMoved: [
    'Material Track, Burst Diagnostics, Performance Crisis, ResonanceControl, and Particle System source normalization are now owned by the existing panel-props boundary; risk groups remain visible at the App callsite',
    'No screen/surface bridge ownership was introduced',
    'No Root-Follow, Worklet, Materialspur, Partikel, Wellenstarter, Drum/Bass, Paketstation, or Room III behavior changed',
    'No runtime, audio mutation, RAF loop, scheduling policy, or visible UI changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
