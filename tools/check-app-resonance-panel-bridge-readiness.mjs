#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/layout/useAppResonancePanelPropsBoundary.ts';
const indexPath = 'validation/contracts/xensonar/layout/appResonancePanelBoundaryIndex.ts';
const forbiddenBridgePaths = [
  'src/features/xensonar/layout/appResonancePanelBridgeBoundary.ts',
  'src/features/xensonar/layout/useAppResonancePanelBridge.ts',
  'src/features/xensonar/layout/appResonancePanelBridge.ts',
];
const pkgPath = 'package.json';

const app = read(appPath);
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const index = exists(indexPath) ? read(indexPath) : '';
const pkg = JSON.parse(read(pkgPath));
const appLines = app.split(/\r?\n/).length;

const expectedKeys = [
  'materialTrack',
  'burstDiagnostics',
  'performanceCrisis',
  'resonanceControl',
  'particleSystem',
];

const panelInputCompositionNeedles = [
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
];

const panelPropBuilders = [
  'buildMaterialTrackPanelProps',
  'buildBurstDiagnosticsPanelProps',
  'buildPerformanceCrisisPanelProps',
  'buildResonanceControlProps',
  'buildParticleSystemProps',
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
  'localStorage.',
  'workspacePackage',
];

const bridgeReadinessFalseFlags = [
  'bridgeOwnsRuntime: false',
  'bridgeMutatesAudio: false',
  'bridgeOwnsSchedulingPolicy: false',
  'bridgeOwnsPackagePersistence: false',
  'bridgeOwnsRootFollowRuntime: false',
  'bridgeOwnsParticleRuntime: false',
];

const checks = {
  expectedFilesExist: [appPath, boundaryPath, indexPath, pkgPath].every(exists),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-panel-bridge-readiness'] ===
    'node tools/check-app-resonance-panel-bridge-readiness.mjs',
  noAdditionalBridgePassThroughFileCreated: forbiddenBridgePaths.every((rel) => !exists(rel)),
  boundaryDeclaresBridgeReadinessContract:
    boundary.includes('export type AppResonancePanelBridgeReadiness') &&
    boundary.includes('export const APP_RESONANCE_PANEL_BRIDGE_READINESS') &&
    boundary.includes('bridgeCandidate: true') &&
    boundary.includes("candidateBoundaryName: 'useAppResonancePanelPropsBoundary'") &&
    boundary.includes("currentBoundaryKind: 'app-resonance-panel-props-composition-bridge'") &&
    boundary.includes('avoidsAdditionalPassThroughBridgeFile: true'),
  readinessKeepsAppOwningInputComposition:
    boundary.includes('appOwnsPanelInputComposition: true') &&
    boundary.includes('bridgeOwnsPanelPropBuild: true'),
  readinessExplicitlyRejectsRuntimeAndAudioOwnership:
    bridgeReadinessFalseFlags.every((needle) => boundary.includes(needle)),
  readinessReferencesExistingBuildOrderAndContract:
    boundary.includes('buildOrder: typeof APP_RESONANCE_PANEL_PROPS_BOUNDARY_BUILD_ORDER') &&
    boundary.includes('contract: typeof APP_RESONANCE_PANEL_PROPS_BOUNDARY_CONTRACT') &&
    boundary.includes('buildOrder: APP_RESONANCE_PANEL_PROPS_BOUNDARY_BUILD_ORDER') &&
    boundary.includes('contract: APP_RESONANCE_PANEL_PROPS_BOUNDARY_CONTRACT'),
  readinessKeepsRenameDecisionOpen:
    boundary.includes("readinessQuestion: 'existing-boundary-can-be-renamed-or-left-merge-friendly-before-adding-a-new-bridge-layer'"),
  buildOrderAndContractCoverSameSubBoundaries:
    expectedKeys.every((key) => boundary.includes(`'${key}'`) && boundary.includes(`${key}: {`)),
  propsBoundaryStillOwnsOnlyPanelPropBuilders:
    panelPropBuilders.every((builder) => boundary.includes(`${builder}(`)) &&
    boundary.includes('const panelPropsBoundary = {') &&
    boundary.includes('return panelPropsBoundary;'),
  propsBoundaryDoesNotMoveRuntimeOrScheduling: forbiddenRuntimeMoves.every((needle) => !boundary.includes(needle)),
  appStillOwnsPanelInputComposition:
    panelInputCompositionNeedles.every((needle) => app.includes(needle)) &&
    (app.match(/useAppResonancePanelPropsBoundary\(/g) || []).length === 1,
  indexStillOwnsSubBoundaryShapeAndOutputMaps:
    index.includes('APP_RESONANCE_PANEL_BOUNDARY_SHAPE_AUDIT') &&
    index.includes('AppResonancePanelBoundaryOutputContractMap') &&
    index.includes('APP_RESONANCE_PANEL_BOUNDARY_CONTRACT_CLEANUP_PROBE'),
  bridgeReadinessGuardListedInSanitySuiteContract:
    read('tools/check-xensonar-refactor-sanity-suite-contract.mjs').includes('xensonar:check-app-resonance-panel-bridge-readiness'),
  bridgeReadinessGuardListedInRefactorSuiteRunner:
    read('tools/run-xensonar-refactor-sanity-suite.mjs').includes('Resonance panel bridge readiness') &&
    read('tools/run-xensonar-refactor-sanity-suite.mjs').includes('xensonar:check-app-resonance-panel-bridge-readiness'),
  appLineCountWithinBridgeReadinessRange: appLines <= 5540,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  appLines,
  bridgeReadiness: {
    candidateBoundary: 'useAppResonancePanelPropsBoundary',
    extraBridgeFileCreated: false,
    bridgeCandidate: true,
    appOwnsPanelInputComposition: true,
    bridgeOwnsPanelPropBuild: true,
    bridgeOwnsRuntime: false,
    bridgeMutatesAudio: false,
    nextDecision: 'rename existing boundary, keep merge-friendly name, or only then introduce a real non-pass-through bridge',
  },
  explicitlyNotMoved: [
    'App.tsx still owns panel input source composition; Burst-Diagnostics/MaterialTrack/PerformanceCrisis/ResonanceControl/ParticleSystem panel mapping is normalized by the existing props boundary',
    'No additional pass-through app_resonance_panel_bridge_boundary file was introduced',
    'No Root-Follow, Worklet, Granular, Materialspur, Paketstation, Partikel, Wellenstarter, Drum/Bass, or Room III behavior changed',
    'No runtime, audio mutation, scheduling policy, persistence policy, visible UI, or HTML output changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
