#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const indexPath = 'validation/contracts/xensonar/layout/appResonancePanelBoundaryIndex.ts';
const typesPath = 'src/features/xensonar/layout/appResonancePanelBoundaryTypes.ts';
const burstPath = 'src/features/xensonar/diagnostics/buildAppBurstDiagnosticsPanelBoundary.ts';
const shapeGuardPath = 'tools/check-app-resonance-panel-boundary-shape-audit.mjs';

const app = read(appPath);
const index = exists(indexPath) ? read(indexPath) : '';
const types = exists(typesPath) ? read(typesPath) : '';
const burst = exists(burstPath) ? read(burstPath) : '';
const shapeGuard = exists(shapeGuardPath) ? read(shapeGuardPath) : '';
const appLines = app.split(/\r?\n/).length;

const expectedKeys = [
  'performanceCrisis',
  'burstDiagnostics',
  'materialTrack',
  'resonanceControl',
  'particleSystem',
];

const outputContracts = [
  'AppPerformanceCrisisPanelBoundaryInput',
  'BurstDiagnosticsPanelProps',
  'MaterialTrackPanelProps',
  'ResonanceControlRuntimeProps',
  'ParticleSystemRuntimeProps',
];

const inputGroupNames = [
  'uiPolicyState',
  'rootFollowGranulationSource',
  'audioBurstRecorder',
  'audioTapMonitor',
  'audioPairTherapistStatus',
  'rootFollowHealth',
  'workspacePackageActivationReport',
  'audioBurstRuntime',
  'exportContext',
  'rootFollowRecoveryActions',
  'panelArgs',
  'preview',
  'state',
  'gridAndTuning',
  'trafficRefs',
  'toneActions',
  'myzelInstallation',
  'selection',
  'presetCatalogSource',
  'agentActions',
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
  expectedFilesExist: [appPath, indexPath, typesPath, burstPath, shapeGuardPath].every(exists),
  indexDeclaresTypedInputContractMap: [
    'AppResonancePanelBoundaryInputContractMap',
    'AppBurstDiagnosticsPanelBoundaryArgs',
    'AppMaterialTrackPanelBoundaryArgs',
    'AppPerformanceCrisisPanelBoundaryArgs',
    'AppParticleSystemPanelBoundaryArgs',
    'AppResonanceControlPanelBoundaryArgs',
  ].every((needle) => (index + types).includes(needle)),
  indexDeclaresTypedOutputContractMap: [
    'AppResonancePanelBoundaryOutputContractMap',
    'AppPerformanceCrisisPanelBoundaryInput',
    'BurstDiagnosticsPanelProps',
    'MaterialTrackPanelProps',
    'ResonanceControlRuntimeProps',
    'ParticleSystemRuntimeProps',
  ].every((needle) => (index + types).includes(needle)),
  indexDeclaresLiteralInputAndOutputNames:
    (index + types).includes('AppResonancePanelBoundaryInputGroupName') &&
    (index + types).includes('AppResonancePanelBoundaryOutputContractName') &&
    inputGroupNames.every((needle) => (index + types).includes(`'${needle}'`)) &&
    outputContracts.every((needle) => (index + types).includes(`'${needle}'`)),
  typeContractOwnsTypedShapeAuditFields:
    types.includes('readonly inputGroups: readonly AppResonancePanelBoundaryInputGroupName[];') &&
    types.includes('readonly outputContract: AppResonancePanelBoundaryOutputContractName;') &&
    !index.includes('export type AppResonancePanelBoundaryShapeAuditEntry ='),
  indexReplacesStringyPerformanceOutputContract:
    index.includes("outputContract: 'AppPerformanceCrisisPanelBoundaryInput'") &&
    !index.includes("Parameters<typeof buildPerformanceCrisisPanelProps>[0]"),
  indexAddsCompileTimeContractProbe: [
    'APP_RESONANCE_PANEL_BOUNDARY_CONTRACT_CLEANUP_PROBE',
    'readonly inputs: AppResonancePanelBoundaryInputContractMap;',
    'readonly outputs: AppResonancePanelBoundaryOutputContractMap;',
  ].every((needle) => index.includes(needle)),
  manifestStillCoversExpectedKeys: expectedKeys.every((key) => index.includes(`${key}: {`)),
  manifestStillNonRuntimeNonAudio:
    (index.match(/runtimeOwned: false/g) || []).length >= expectedKeys.length &&
    (index.match(/audioMutating: false/g) || []).length >= expectedKeys.length,
  burstBoundaryGroupsRecoveryActionsAsTypedBoundary: [
    'export type AppRootFollowRecoveryActionsBoundary = Pick<',
    "| 'onRunAudioPairTherapistReset'",
    "| 'onClearRootFollowBrowserState'",
    "| 'onReactivateRootFollowFromPackage'",
    'rootFollowRecoveryActions: AppRootFollowRecoveryActionsBoundary;',
    '...rootFollowRecoveryActions,',
  ].every((needle) => burst.includes(needle)),
  burstBoundaryNoLongerAcceptsLooseRecoveryCallbacks:
    !burst.includes('resetAudioPairTherapistRuntime: () => void;') &&
    !burst.includes('clearRootFollowBrowserState: () => void;') &&
    !burst.includes('reactivateRootFollowFromLoadedPackage: () => void;'),
  appPassesRecoveryActionsAsOneGroup: [
    'rootFollowRecoveryActions: {',
    'onRunAudioPairTherapistReset: resetAudioPairTherapistRuntime,',
    'onClearRootFollowBrowserState: clearRootFollowBrowserState,',
    'onReactivateRootFollowFromPackage: reactivateRootFollowFromLoadedPackage,',
  ].every((needle) => app.includes(needle)),
  shapeGuardTracksTypedPerformanceOutputContract:
    shapeGuard.includes("outputContract: 'AppPerformanceCrisisPanelBoundaryInput'") &&
    !shapeGuard.includes("outputContract: 'Parameters<typeof buildPerformanceCrisisPanelProps>[0]'"),
  indexDoesNotMoveRuntimeOrScheduling: forbiddenRuntimeMoves.every((needle) => !index.includes(needle)),
  burstBoundaryDoesNotMoveRuntimeOrScheduling: forbiddenRuntimeMoves.every((needle) => !burst.includes(needle)),
  appStillOwnsPanelInputComposition: [
    'materialTrack: {',
    'previewSource: { myceliumSnapshotRef, audioCtx, nexusRefs, rhythmForgeSeedRef }',
    'burstDiagnostics: {',
    'audioBurstRuntime',
    'rootFollowRecoveryActions:',
    'performanceCrisis: {',
    'rootFollowGranulationSource: { nParamsUI, updateNParams }',
    'resonanceControl: {',
    'gridAndTuning:',
    'trafficRefs:',
    'toneActions:',
    'myzelInstallation:',
    'particleSystem: {',
    'agentActions: { previewParticlePresetSelection: previewParticlePresetSelectionAction, toggleNexusAgent, setNexusAgentVolume }',
  ].every((needle) => app.includes(needle)),
  appLineCountWithinCleanupRange: appLines <= 5540,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  appLines,
  cleanedContracts: {
    outputContracts,
    inputGroupNames,
    recoveryActionsGrouped: true,
  },
  movedScope: [
    'Typed input/output contract maps for the existing App resonance panel sub-boundaries',
    'A compile-time probe tying the Shape-Audit map to exported builder input/output contracts',
    'A real typed rootFollowRecoveryActions boundary for Burst-Diagnose recovery callbacks',
  ],
  explicitlyNotMoved: [
    'No panel prop builder ownership moved out of useAppResonancePanelPropsBoundary',
    'No Root-Follow, Worklet, Materialspur, Partikel, Wellenstarter, Drum/Bass, Paketstation, or Room III behavior changed',
    'No runtime, audio mutation, RAF loop, scheduling policy, or visible UI changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
