#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeBoundary.ts';
const shapeAuditPath = 'validation/contracts/xensonar/layout/appResonanceScreenRuntimeArgsShapeAudit.ts';
const dependencyAuditPath = 'validation/contracts/xensonar/layout/appResonanceScreenRuntimeArgsDependencyAudit.ts';
const auxArgsPath = 'src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgs.ts';
const screenEntryPath = 'src/features/xensonar/layout/appResonanceScreenRuntimeEntry.ts';
const surfaceCoordinatorPath = 'src/features/xensonar/layout/appSurfaceRuntimeCoordinator.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const dependencyAudit = exists(dependencyAuditPath) ? read(dependencyAuditPath) : '';
const auxArgs = exists(auxArgsPath) ? read(auxArgsPath) : '';
const screenEntry = exists(screenEntryPath) ? read(screenEntryPath) : '';
const surfaceCoordinator = exists(surfaceCoordinatorPath) ? read(surfaceCoordinatorPath) : '';
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const pkg = JSON.parse(read(pkgPath));
const appLines = app.split(/\r?\n/).length;

const expectedKeys = [
  'chrome',
  'auxPanels',
  'resonancePanels',
  'soundPaletteActions',
  'auxFlattening',
  'screenRuntimeEntry',
];

const forbiddenBridgePaths = [
  'src/features/xensonar/layout/appResonanceScreenRuntimeBridge.ts',
  'src/features/xensonar/layout/appResonanceScreenRuntimeBridgeBoundary.ts',
  'src/features/xensonar/layout/appResonanceScreenBridge.ts',
  'src/features/xensonar/layout/appResonanceScreenRuntimeArgsBridge.ts',
  'src/features/xensonar/layout/appResonanceScreenRuntimeArgsIndex.ts',
];

const forbiddenRuntimeMoves = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'safeApplyAttack(',
  'safeApplyExponentialRelease(',
  'requestAnimationFrame(',
  'setInterval(',
  'setTimeout(',
  'new AudioContext(',
  'startRecording(',
  'stopRecording(',
  'downloadRecordingWav(',
  'downloadRecordingCropWav(',
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
  'runParticleNexusToneOrchestrator(',
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'startQuantizedCollisionRuntime(',
  'updatePsychedelicSpiralDevice(',
  'updateLiveMasteringSystem(',
  'localStorage.',
];

const bridgeReadinessFalseFlags = [
  'bridgeOwnsRuntime: false',
  'bridgeMutatesAudio: false',
  'bridgeOwnsRoomLifecycle: false',
  'bridgeOwnsPackagePersistence: false',
  'bridgeOwnsRootFollowRuntime: false',
  'bridgeOwnsRecordingRuntime: false',
  'bridgeOwnsParticleRuntime: false',
];

const checks = {
  expectedFilesExist: [
    appPath,
    boundaryPath,
    shapeAuditPath,
    dependencyAuditPath,
    auxArgsPath,
    screenEntryPath,
    surfaceCoordinatorPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast117: /^3\.2\.91\.6\.9\.(11[7-9]|1[2-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-screen-runtime-bridge-readiness'] ===
    'node tools/check-app-resonance-screen-runtime-bridge-readiness.mjs',
  noAdditionalScreenBridgePassThroughFileCreated: forbiddenBridgePaths.every((rel) => !exists(rel)),
  boundaryDeclaresBridgeReadinessContract:
    boundary.includes('export type AppResonanceScreenRuntimeBridgeReadiness') &&
    boundary.includes('export const APP_RESONANCE_SCREEN_RUNTIME_BRIDGE_READINESS') &&
    boundary.includes('bridgeCandidate: true') &&
    boundary.includes("candidateBoundaryName: 'useAppResonanceScreenRuntimeBoundary'") &&
    boundary.includes("currentBoundaryKind: 'app-resonance-screen-runtime-composition-bridge'") &&
    boundary.includes('avoidsAdditionalPassThroughBridgeFile: true'),
  readinessKeepsAppOwningScreenInputComposition:
    boundary.includes('appOwnsScreenRuntimeInputComposition: true') &&
    boundary.includes('bridgeOwnsAuxPanelFlattening: true') &&
    boundary.includes('bridgeOwnsScreenRuntimeEntryComposition: true'),
  readinessExplicitlyRejectsRuntimeAudioLifecycleAndPersistenceOwnership:
    bridgeReadinessFalseFlags.every((needle) => boundary.includes(needle)),
  readinessReferencesExistingBuildOrderAndContract:
    boundary.includes('buildOrder: typeof APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_BUILD_ORDER') &&
    boundary.includes('contract: typeof APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_CONTRACT') &&
    boundary.includes('buildOrder: APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_BUILD_ORDER') &&
    boundary.includes('contract: APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_CONTRACT'),
  readinessReferencesShapeAndDependencyAudits:
    boundary.includes("dependencyAudit: 'appResonanceScreenRuntimeArgsDependencyAudit'") &&
    boundary.includes("shapeAudit: 'appResonanceScreenRuntimeArgsShapeAudit'"),
  readinessKeepsRenameDecisionOpen:
    boundary.includes("readinessQuestion: 'existing-boundary-can-remain-merge-friendly-before-adding-a-new-screen-runtime-bridge-layer'"),
  buildOrderAndContractCoverSameScreenZones:
    expectedKeys.every((key) => boundary.includes(`'${key}'`) && (boundary.includes(`${key}: {`) || boundary.includes(`boundary: '${key}'`))),
  boundaryStillOnlyComposesAuxFlatteningAndScreenEntry:
    boundary.includes('const appResonanceAuxPanelRuntimeArgs = buildAppResonanceAuxPanelRuntimeArgs(auxPanels);') &&
    boundary.includes('const runtimeBoundary = buildAppResonanceScreenRuntimeEntry({') &&
    boundary.includes('}) satisfies AppResonanceScreenRuntimeBoundary;') &&
    boundary.includes('return runtimeBoundary;') &&
    !boundary.includes('buildAppSurfaceRuntimeProps(') &&
    !boundary.includes('buildAppRoomSceneRuntimeProps('),
  boundaryDoesNotMoveRuntimeOrScheduling: forbiddenRuntimeMoves.every((needle) => !boundary.includes(needle)),
  appCallsiteStillOwnsFourTopLevelScreenZones:
    app.includes('const resonanceAuxPanelSource = {') &&
    app.includes('const resonanceSoundPaletteActionSource = {') &&
    (app.includes('const resonanceScreenRuntimeSource = buildAppResonanceScreenRuntimeSource({') ||
      app.includes('const resonanceScreenRuntime = useAppResonanceScreenRuntimeAssembly({')) &&
    (app.includes('const resonanceScreenRuntime = useAppResonanceScreenRuntimeBoundary(resonanceScreenRuntimeSource);') ||
      app.includes('useAppResonanceScreenRuntimeAssembly({')) &&
    app.includes('chrome: appResonanceChromeRuntimeArgs') &&
    app.includes('auxPanels: resonanceAuxPanelSource') &&
    app.includes('soundPaletteActions: resonanceSoundPaletteActionSource') &&
    app.includes('corePanels: {') &&
    ((app.match(/useAppResonanceScreenRuntimeBoundary\(/g) || []).length === 1 ||
      (app.match(/useAppResonanceScreenRuntimeAssembly\(/g) || []).length === 1),
  shapeAuditAndDependencyAuditRemainPresent:
    shapeAudit.includes('APP_RESONANCE_SCREEN_RUNTIME_ARGS_SHAPE_AUDIT') &&
    dependencyAudit.includes('APP_RESONANCE_SCREEN_RUNTIME_ARGS_DEPENDENCY_AUDIT') &&
    dependencyAudit.includes('does not introduce a screen bridge pass-through layer'),
  auxFlatteningContractStillPresent:
    auxArgs.includes('APP_AUX_PANEL_BOUNDARY_CONTRACT_CLEANUP_PROBE') &&
    auxArgs.includes('AppAuxPanelBoundaryInputContractMap') &&
    auxArgs.includes('AppAuxPanelBoundaryOutputContractMap'),
  screenRuntimeEntryStillOnlyReExportsResonanceEntry:
    screenEntry.includes('buildAppResonanceScreenRuntimeProps as buildAppResonanceScreenRuntimeEntry') &&
    !screenEntry.includes('buildAppRoomSceneRuntimeProps as') &&
    !screenEntry.includes('buildAppSurfaceRuntimeProps as'),
  surfaceCoordinatorStillDelegatedButNotOwned:
    surfaceCoordinator.includes('buildAppResonanceScreenRuntimeProps') &&
    surfaceCoordinator.includes('buildAppRoomSceneRuntimeProps') &&
    dependencyAudit.includes('does not own appSurfaceRuntimeCoordinator as a whole'),
  bridgeReadinessGuardListedInSanitySuiteContract:
    suiteContract.includes('xensonar:check-app-resonance-screen-runtime-bridge-readiness'),
  bridgeReadinessGuardListedInRefactorSuiteRunner:
    suite.includes('Resonance screen runtime bridge readiness') &&
    suite.includes('xensonar:check-app-resonance-screen-runtime-bridge-readiness'),
  appLineCountUnaffectedByBridgeReadiness: appLines <= 5585,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  appLines,
  bridgeReadiness: {
    candidateBoundary: 'useAppResonanceScreenRuntimeBoundary',
    extraBridgeFileCreated: false,
    bridgeCandidate: true,
    appOwnsScreenRuntimeInputComposition: true,
    bridgeOwnsAuxPanelFlattening: true,
    bridgeOwnsScreenRuntimeEntryComposition: true,
    bridgeOwnsRuntime: false,
    bridgeMutatesAudio: false,
    bridgeOwnsRoomLifecycle: false,
    bridgeOwnsPackagePersistence: false,
    nextDecision: 'keep merge-friendly boundary name, rename existing boundary, or only then introduce a real non-pass-through screen-runtime bridge',
  },
  explicitlyNotMoved: [
    'No App.tsx screen-runtime callsite composition was moved',
    'No additional pass-through app_resonance_screen_runtime_bridge file was introduced',
    'No Surface coordinator, Room scene, Root-Follow, Worklet, Package, Recording, Parallel Effects DSP, GrooveBass scheduling, Partikel, Wellenstarter, Drum/Bass, or Room III behavior changed',
    'No runtime, audio mutation, room lifecycle, scheduling policy, package persistence, visible UI, or HTML output changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
