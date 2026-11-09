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
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const dependencyAudit = exists(dependencyAuditPath) ? read(dependencyAuditPath) : '';
const auxArgs = exists(auxArgsPath) ? read(auxArgsPath) : '';
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

const contractNames = [
  'UseAppResonanceScreenRuntimeBoundaryArgs.chrome',
  'UseAppResonanceScreenRuntimeBoundaryArgs.auxPanels',
  'AppResonanceScreenCorePanelArgs',
  'AppResonanceScreenSoundPaletteActionSource',
  'AppResonanceScreenSoundPaletteActionArgs',
  'AppResonanceAuxPanelRuntimeArgs',
  'AppResonanceScreenRuntimeBoundary',
];

const composers = [
  'passthrough-chrome-runtime-bindings',
  'pass-input-to-buildAppResonanceAuxPanelRuntimeArgs',
  'merge-with-flattened-aux-panels',
  'buildAppResonanceScreenSoundPaletteActionArgs',
  'buildAppResonanceAuxPanelRuntimeArgs',
  'buildAppResonanceScreenRuntimeEntry',
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

const checks = {
  expectedFilesExist: [
    appPath,
    boundaryPath,
    shapeAuditPath,
    dependencyAuditPath,
    auxArgsPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast116: /^3\.2\.91\.6\.9\.(11[6-9]|1[2-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-screen-runtime-boundary-contract-cleanup'] ===
    'node tools/check-app-resonance-screen-runtime-boundary-contract-cleanup.mjs',
  boundaryDeclaresBuildOrder:
    boundary.includes('APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_BUILD_ORDER') &&
    expectedKeys.every((key) => boundary.includes(`'${key}'`)),
  boundaryDeclaresInputContractMap:
    boundary.includes('AppResonanceScreenRuntimeBoundaryInputContractMap') &&
    (boundary.includes('readonly chrome: ResonanceScreenRuntimeArgs["chrome"]') || boundary.includes("readonly chrome: ResonanceScreenRuntimeArgs['chrome']")) &&
    boundary.includes('readonly auxPanels: BuildAppResonanceAuxPanelRuntimeArgsInput') &&
    boundary.includes('readonly resonancePanels: AppResonanceScreenCorePanelSourceArgs') &&
    boundary.includes('export type UseAppResonanceScreenRuntimeBoundaryArgs =') &&
    boundary.includes('AppResonanceScreenRuntimeBoundaryInputContractMap;'),
  boundaryDeclaresOutputContractMap:
    boundary.includes('AppResonanceScreenRuntimeBoundaryOutputContractMap') &&
    boundary.includes('readonly auxFlattening: AppResonanceAuxPanelRuntimeArgs') &&
    boundary.includes('readonly screenRuntimeEntry: AppResonanceScreenRuntimeBoundary'),
  boundaryDeclaresContractNames:
    boundary.includes('AppResonanceScreenRuntimeBoundaryInputContractName') &&
    boundary.includes('AppResonanceScreenRuntimeBoundaryOutputContractName') &&
    contractNames.every((name) => boundary.includes(`'${name}'`)),
  boundaryDeclaresContractEntries:
    boundary.includes('AppResonanceScreenRuntimeBoundaryContractEntry') &&
    boundary.includes('APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_CONTRACT') &&
    expectedKeys.every((key) => boundary.includes(`${key}: {`) || boundary.includes(`boundary: '${key}'`)) &&
    composers.filter((composer) => composer !== 'merge-with-flattened-aux-panels').every((composer) => boundary.includes(`composer: '${composer}'`)) &&
    boundary.includes("composer: 'buildAppResonanceScreenCorePanelArgs'"),
  boundaryContractExplicitlyNonRuntimeNonAudio:
    (boundary.match(/boundaryOwnsRuntime: false/g) || []).length >= expectedKeys.length + 1 &&
    (boundary.match(/boundaryMutatesAudio: false/g) || []).length >= expectedKeys.length + 1 &&
    (boundary.match(/boundaryOwnsRoomLifecycle: false/g) || []).length >= expectedKeys.length + 1 &&
    (boundary.match(/boundaryOwnsPackagePersistence: false/g) || []).length >= expectedKeys.length + 1,
  boundaryDeclaresContractProbe:
    boundary.includes('APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_CONTRACT_CLEANUP_PROBE') &&
    boundary.includes('readonly buildOrder: typeof APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_BUILD_ORDER') &&
    boundary.includes('readonly inputs: AppResonanceScreenRuntimeBoundaryInputContractMap') &&
    boundary.includes('readonly outputs: AppResonanceScreenRuntimeBoundaryOutputContractMap') &&
    boundary.includes('readonly contract: typeof APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_CONTRACT'),
  boundaryStillOnlyComposesAuxAndScreenEntry:
    boundary.includes('const appResonanceAuxPanelRuntimeArgs = buildAppResonanceAuxPanelRuntimeArgs(auxPanels);') &&
    boundary.includes('const resonancePanelRuntimeArgs = buildAppResonanceScreenPanelRuntimeArgs({') &&
    boundary.includes('corePanelSource: resonancePanels,') &&
    boundary.includes('const runtimeBoundary = buildAppResonanceScreenRuntimeEntry({') &&
    boundary.includes('}) satisfies AppResonanceScreenRuntimeBoundary;') &&
    boundary.includes('return runtimeBoundary;') &&
    !boundary.includes('buildAppSurfaceRuntimeProps(') &&
    !boundary.includes('buildAppRoomSceneRuntimeProps('),
  boundaryDoesNotMoveRuntimeOrScheduling: forbiddenRuntimeMoves.every((needle) => !boundary.includes(needle)),
  shapeAuditNowConsumesBoundaryContractMaps:
    shapeAudit.includes('AppResonanceScreenRuntimeBoundaryInputContractMap') &&
    shapeAudit.includes('AppResonanceScreenRuntimeBoundaryOutputContractMap') &&
    shapeAudit.includes('export type AppResonanceScreenRuntimeArgsInputContractMap =') &&
    shapeAudit.includes('AppResonanceScreenRuntimeBoundaryInputContractMap;') &&
    shapeAudit.includes('AppResonanceScreenRuntimeBoundaryOutputContractMap;'),
  dependencyAuditStillKeepsScreenBoundaryImportAllowlistNarrow:
    dependencyAudit.includes("allowedValueImports: [") &&
    dependencyAudit.includes("'../runtimeEntries'") &&
    dependencyAudit.includes("'./appResonanceAuxPanelRuntimeArgs'") &&
    dependencyAudit.includes("'./appResonanceScreenPanelRuntimeArgs'") &&
    dependencyAudit.includes("'./appSurfaceRuntimeCoordinator'") &&
    dependencyAudit.includes("'../domain/instrumentData'") &&
    dependencyAudit.includes("'../domain/metaPresets'") &&
    dependencyAudit.includes("'../rooms/resonanceUiConfig'") &&
    dependencyAudit.includes('screen boundary composes chrome, auxPanels, and delegates panel runtime arg composition to appResonanceScreenPanelRuntimeArgs'),
  auxContractCleanupStillPresent:
    auxArgs.includes('APP_AUX_PANEL_BOUNDARY_CONTRACT_CLEANUP_PROBE') &&
    auxArgs.includes('AppAuxPanelBoundaryInputContractMap') &&
    auxArgs.includes('AppAuxPanelBoundaryOutputContractMap'),
  appCallsiteShowsFourTopLevelZones:
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
    ((app.includes('stage: resonanceStageSource') && app.includes('soundPalette: resonanceSoundPaletteSource')) ||
      (app.includes('stage: {') && app.includes('soundPalette: {'))) &&
    app.includes('resonanceControl: resonanceControlRuntimeProps') &&
    app.includes('particleSystem: particleSystemRuntimeProps') &&
    app.includes('parallelEffects: {') &&
    app.includes('resonanceFxUiState') &&
    app.includes('recordingTake: recordingRuntime.recordingTake'),
  noScreenRuntimeBridgeOrIndexIntroduced:
    !exists('src/features/xensonar/layout/appResonanceScreenRuntimeArgsIndex.ts') &&
    !exists('src/features/xensonar/layout/appResonanceScreenRuntimeBridge.ts') &&
    !exists('src/features/xensonar/layout/appResonanceScreenBridge.ts') &&
    !exists('src/features/xensonar/layout/appResonanceScreenRuntimeArgsBridge.ts'),
  guardListedInSanitySuiteContract:
    suiteContract.includes('xensonar:check-app-resonance-screen-runtime-boundary-contract-cleanup'),
  guardListedInRefactorSuiteRunner:
    suite.includes('Resonance screen runtime boundary contract cleanup') &&
    suite.includes('xensonar:check-app-resonance-screen-runtime-boundary-contract-cleanup'),
  appLineCountUnaffectedByScreenRuntimeContractCleanup: appLines <= 5585,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  appLines,
  tightenedBoundary: {
    boundary: 'useAppResonanceScreenRuntimeBoundary',
    buildOrder: 'APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_BUILD_ORDER',
    inputMap: 'AppResonanceScreenRuntimeBoundaryInputContractMap',
    outputMap: 'AppResonanceScreenRuntimeBoundaryOutputContractMap',
    contract: 'APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_CONTRACT',
    probe: 'APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_CONTRACT_CLEANUP_PROBE',
  },
  movedScope: [
    'Added explicit input/output contract maps to the Resonance screen runtime boundary',
    'Added a non-runtime/non-audio contract manifest for chrome, auxPanels, resonancePanels, auxFlattening, and screenRuntimeEntry',
    'Connected the shape audit contract maps to the boundary-level contract maps instead of duplicating them locally',
  ],
  explicitlyNotMoved: [
    'No App.tsx callsite behavior changed',
    'No additional screen-runtime bridge or index layer was introduced',
    'No Surface coordinator, Room scene, Root-Follow, Worklet, Package, Recording, Parallel Effects DSP, GrooveBass scheduling, Partikel, Wellenstarter, Drum/Bass, or Room III behavior changed',
    'No runtime, audio mutation, RAF loop, scheduling policy, package persistence, or visible UI changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
