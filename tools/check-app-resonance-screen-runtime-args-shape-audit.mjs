#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const auditPath = 'validation/contracts/xensonar/layout/appResonanceScreenRuntimeArgsShapeAudit.ts';
const screenBoundaryPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeBoundary.ts';
const auxArgsPath = 'src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgs.ts';
const auxShapePath = 'validation/contracts/xensonar/layout/appAuxPanelBoundaryShapeAudit.ts';
const screenEntryPath = 'src/features/xensonar/layout/appResonanceScreenRuntimeEntry.ts';
const surfaceCoordinatorPath = 'src/features/xensonar/layout/appSurfaceRuntimeCoordinator.ts';
const appPath = 'src/App.tsx';
const assemblyPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeAssembly.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const audit = exists(auditPath) ? read(auditPath) : '';
const screenBoundary = exists(screenBoundaryPath) ? read(screenBoundaryPath) : '';
const auxArgs = exists(auxArgsPath) ? read(auxArgsPath) : '';
const auxShape = exists(auxShapePath) ? read(auxShapePath) : '';
const screenEntry = exists(screenEntryPath) ? read(screenEntryPath) : '';
const surfaceCoordinator = exists(surfaceCoordinatorPath) ? read(surfaceCoordinatorPath) : '';
const app = exists(appPath) ? read(appPath) : '';
const assembly = exists(assemblyPath) ? read(assemblyPath) : '';
const pkg = JSON.parse(read(pkgPath));
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

const shapeKeys = ['chrome', 'auxPanels', 'resonancePanels', 'soundPaletteActions', 'auxFlattening', 'screenRuntimeEntry'];
const auxKeys = ['parallelEffects', 'grooveBass', 'recordingTake', 'burstDiagnostics'];
const nonOwnershipNeedles = [
  'runtimeOwned: false',
  'audioMutating: false',
  'roomLifecycleOwned: false',
  'packagePersistenceOwned: false',
  'bridgeOwnsPanelPropBuild: false',
];
const requiredInputGroups = {
  chrome: ['chromeRuntimeBindings'],
  auxPanels: auxKeys,
  resonancePanels: ['corePanelSourceGroups', 'stage', 'resonanceControl', 'particleSystem', 'soundPalette', 'resonancePanelRuntimeBindings'],
  soundPaletteActions: ['soundPaletteActions', 'soundPalette'],
  auxFlattening: auxKeys,
  screenRuntimeEntry: ['chromeRuntimeBindings', 'resonancePanelRuntimeBindings', 'resonanceScreenProps'],
};
const requiredOutputContracts = {
  chrome: 'UseAppResonanceScreenRuntimeBoundaryArgs.chrome',
  auxPanels: 'UseAppResonanceScreenRuntimeBoundaryArgs.auxPanels',
  resonancePanels: 'AppResonanceScreenCorePanelArgs',
  soundPaletteActions: 'AppResonanceScreenSoundPaletteActionArgs',
  auxFlattening: 'AppResonanceAuxPanelRuntimeArgs',
  screenRuntimeEntry: 'AppResonanceScreenRuntimeBoundary',
};
const forbiddenRuntimeTokens = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'requestAnimationFrame(',
  'setInterval(',
  'setTimeout(',
  'MediaRecorder',
  'downloadRecordingWav',
  'downloadRecordingCropWav',
  'scheduleBassClipStep',
  'scheduleClassicBassPatternStep',
  'runParticleNexusToneOrchestrator',
  'playWaveStartSound',
  'startQuantizedCollisionRuntime',
];

const blockFor = (key) => {
  const start = audit.indexOf(`${key}: {`);
  if (start < 0) return '';
  const nextStarts = shapeKeys
    .map((other) => audit.indexOf(`${other}: {`, start + 1))
    .filter((idx) => idx > start);
  const end = nextStarts.length ? Math.min(...nextStarts) : audit.indexOf('} as const satisfies', start);
  return audit.slice(start, end);
};

const hasAllGroups = (block, groups) => groups.every((group) => block.includes(`'${group}'`) || block.includes(`"${group}"`));

const screenCall = (() => {
  const directStart = app.indexOf('const resonanceScreenRuntimeSource = buildAppResonanceScreenRuntimeSource({');
  const directEnd = app.indexOf('\n  const resonanceScreenRuntime = useAppResonanceScreenRuntimeBoundary(resonanceScreenRuntimeSource);', directStart);
  if (directStart >= 0 && directEnd > directStart) return app.slice(directStart, directEnd);
  const assemblyStart = app.indexOf('const resonanceScreenRuntime = useAppResonanceScreenRuntimeAssembly({');
  const assemblyEnd = app.indexOf('\n  const appRoomScenes = useAppRoomSceneRuntimeBoundary({', assemblyStart);
  return assemblyStart >= 0 && assemblyEnd > assemblyStart ? app.slice(assemblyStart, assemblyEnd) : '';
})();
const auxBlock = (() => {
  const start = screenCall.indexOf('auxPanels: {');
  const end = screenCall.indexOf('soundPaletteActions: {', start);
  return start >= 0 && end > start ? screenCall.slice(start, end) : '';
})();
const namedAuxBlock = (() => {
  const start = app.indexOf('const resonanceAuxPanelSource = {');
  const end = app.indexOf('\n\n  const resonanceSoundPaletteActionSource = {', start);
  return start >= 0 && end > start ? app.slice(start, end) : '';
})();
const soundPaletteActionsBlock = (() => {
  const start = screenCall.indexOf('soundPaletteActions: {');
  const end = screenCall.indexOf('corePanels: {', start);
  return start >= 0 && end > start ? screenCall.slice(start, end) : '';
})();
const namedSoundPaletteActionsBlock = (() => {
  const start = app.indexOf('const resonanceSoundPaletteActionSource = {');
  if (start < 0) return '';
  const directEnd = app.indexOf('\n\n  const resonanceScreenRuntimeSource = buildAppResonanceScreenRuntimeSource({', start);
  const assemblyEnd = app.indexOf('\n\n  const resonanceScreenRuntime = useAppResonanceScreenRuntimeAssembly({', start);
  const end = directEnd > start ? directEnd : assemblyEnd;
  return end > start ? app.slice(start, end) : '';
})();
const resonancePanelsBlock = (() => {
  const start = screenCall.indexOf('corePanels: {');
  return start >= 0 ? screenCall.slice(start) : '';
})();
const stageSourceBlock = (() => {
  const start = app.indexOf('const resonanceStageSource = buildAppResonanceScreenStageSource({');
  const end = app.indexOf('\n  const resonanceSoundPaletteSource = buildAppResonanceScreenSoundPaletteSource({', start);
  if (start >= 0 && end > start) return app.slice(start, end);
  return screenCall;
})();

const checks = {
  expectedFilesExist: [
    auditPath,
    screenBoundaryPath,
    auxArgsPath,
    auxShapePath,
    screenEntryPath,
    surfaceCoordinatorPath,
    appPath,
    assemblyPath,
    pkgPath,
  ].every(exists),
  packageVersionAtLeast114: /^3\.2\.91\.6\.9\.(11[4-9]|1[2-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-screen-runtime-args-shape-audit'] ===
    'node tools/check-app-resonance-screen-runtime-args-shape-audit.mjs',
  auditDeclaresExpectedContracts: [
    'APP_RESONANCE_SCREEN_RUNTIME_ARGS_SHAPE_KEYS',
    'APP_RESONANCE_SCREEN_RUNTIME_ARGS_SHAPE_AUDIT',
    'APP_RESONANCE_SCREEN_RUNTIME_ARGS_SHAPE_AUDIT_PROBE',
    'AppResonanceScreenRuntimeArgsInputContractMap',
    'AppResonanceScreenRuntimeArgsOutputContractMap',
    'AppResonanceScreenRuntimeArgsShapeAuditEntry',
  ].every((needle) => audit.includes(needle)),
  auditImportsOnlyTypesFromLocalContracts:
    audit.includes("from './appResonanceAuxPanelRuntimeArgsTypes'") &&
    audit.includes("from './appResonanceScreenStageSourceReadinessAudit'") &&
    audit.includes("from './useAppResonanceScreenRuntimeBoundary'") &&
    !audit.includes("import {") &&
    !audit.includes("from '../") &&
    !audit.includes('React'),
  auditCoversExpectedShapeKeys:
    shapeKeys.every((key) => audit.includes(`${key}: {`)) &&
    !audit.includes('packageStation: {') &&
    !audit.includes('rootFollowRuntime: {'),
  auditGroupsMatchRuntimeCallShape: shapeKeys.every((key) => hasAllGroups(blockFor(key), requiredInputGroups[key])),
  auditOutputContractsMatchRuntimeShape: shapeKeys.every((key) => blockFor(key).includes(`outputContract: '${requiredOutputContracts[key]}'`)),
  auditDeclaresNonOwnershipForEveryEntry: shapeKeys.every((key) => {
    const block = blockFor(key);
    return nonOwnershipNeedles.every((needle) => block.includes(needle));
  }),
  screenBoundaryStillComposesChromeAuxActionsAndResonancePanels:
    (screenBoundary.includes('chrome: ResonanceScreenRuntimeArgs["chrome"]') || screenBoundary.includes("chrome: ResonanceScreenRuntimeArgs['chrome']")) &&
    screenBoundary.includes('resonancePanels: AppResonanceScreenCorePanelSourceArgs') &&
    screenBoundary.includes('auxPanels: BuildAppResonanceAuxPanelRuntimeArgsInput') &&
    screenBoundary.includes('soundPaletteActions: AppResonanceScreenSoundPaletteActionSource') &&
    screenBoundary.includes('const appResonanceAuxPanelRuntimeArgs = buildAppResonanceAuxPanelRuntimeArgs(auxPanels);') &&
    screenBoundary.includes('buildAppResonanceScreenPanelRuntimeArgs') &&
    screenBoundary.includes('corePanelSource: resonancePanels,') &&
    screenBoundary.includes('auxPanelArgs: appResonanceAuxPanelRuntimeArgs,'),
  auxLayerStillHasOwnShapeAudit:
    auxArgs.includes('APP_AUX_PANEL_BOUNDARY_KEYS') &&
    auxArgs.includes('APP_AUX_PANEL_BOUNDARY_CONTRACT_CLEANUP_PROBE') &&
    auxShape.includes('APP_AUX_PANEL_BOUNDARY_SHAPE_AUDIT') &&
    auxKeys.every((key) => auxShape.includes(`${key}: {`) || auxShape.includes(`'${key}'`)),
  screenRuntimeEntryStillDelegatesToSurfaceCoordinator:
    screenEntry.includes("buildAppResonanceScreenRuntimeProps as buildAppResonanceScreenRuntimeEntry") &&
    surfaceCoordinator.includes('buildAppResonanceScreenRuntimeProps') &&
    surfaceCoordinator.includes('chrome: buildAppChromeRuntimeBindings(args.chrome)') &&
    surfaceCoordinator.includes('resonancePanels: buildResonancePanelRuntimeBindings(args.resonancePanels)'),
  appCallStillShowsFourTopLevelZonesInOrder:
    screenCall.includes('chrome: appResonanceChromeRuntimeArgs') &&
    screenCall.includes('auxPanels: resonanceAuxPanelSource') &&
    screenCall.includes('soundPaletteActions: resonanceSoundPaletteActionSource') &&
    screenCall.includes('corePanels: {') &&
    screenCall.indexOf('chrome: appResonanceChromeRuntimeArgs') < screenCall.indexOf('auxPanels: resonanceAuxPanelSource') &&
    screenCall.indexOf('auxPanels: resonanceAuxPanelSource') < screenCall.indexOf('soundPaletteActions: resonanceSoundPaletteActionSource') &&
    screenCall.indexOf('soundPaletteActions: resonanceSoundPaletteActionSource') < screenCall.indexOf('corePanels: {'),
  appSoundPaletteActionsStillUseTypedAppSources:
    namedSoundPaletteActionsBlock.includes('setSelectedWaveOvertonePreset,') &&
    namedSoundPaletteActionsBlock.includes('randomizeMetaPresetForSession,') &&
    namedSoundPaletteActionsBlock.includes('applyMetaPreset,') &&
    screenCall.includes('soundPaletteActions: resonanceSoundPaletteActionSource'),
  appAuxPanelsUseCompactSourceInputs:
    namedAuxBlock.includes('parallelEffects: {') &&
    namedAuxBlock.includes('resonanceFxUiState') &&
    namedAuxBlock.includes('sharedFormatters: { formatHzCompact }') &&
    namedAuxBlock.includes('schwarmMaterialOptions: SCHWARM_MATERIAL_OPTIONS') &&
    namedAuxBlock.includes('liveMastering: liveMasteringCallsiteBoundary') &&
    namedAuxBlock.includes('grooveBass: materialTrackPanelProps') &&
    namedAuxBlock.includes('recordingTake: recordingRuntime.recordingTake') &&
    namedAuxBlock.includes('burstDiagnostics: burstDiagnosticsPanelProps') &&
    screenCall.includes('auxPanels: resonanceAuxPanelSource') &&
    !app.includes('buildAppParallelEffectsAuxPanelBoundary({') &&
    !app.includes('buildAppRecordingTakeAuxPanelBoundary(recordingRuntime.recordingTake)'),
  appResonancePanelsStillReceiveCoreBoundaryOutputs:
    resonancePanelsBlock.includes('resonanceControl: resonanceControlRuntimeProps') &&
    resonancePanelsBlock.includes('particleSystem: particleSystemRuntimeProps') &&
    ((resonancePanelsBlock.includes('stage: resonanceStageSource') && resonancePanelsBlock.includes('soundPalette: resonanceSoundPaletteSource')) ||
      (screenCall.includes('stage: {') && screenCall.includes('soundPalette: {') && assembly.includes('buildAppResonanceScreenStageSource(stage)') && assembly.includes('buildAppResonanceScreenSoundPaletteSource(soundPalette)'))) &&
    stageSourceBlock.includes('ensureAudioReady') &&
    stageSourceBlock.includes('prewarmAudioRuntime') &&
    stageSourceBlock.includes('audioCtx') &&
    stageSourceBlock.includes('setPlayfieldCursorInside: setRootFollowPlayfieldInsideGate'),
  noScreenBridgeOrRuntimeArgsIndexIntroduced:
    !exists('src/features/xensonar/layout/appResonanceScreenRuntimeArgsIndex.ts') &&
    !exists('src/features/xensonar/layout/appResonanceScreenRuntimeBridge.ts') &&
    !exists('src/features/xensonar/layout/appResonanceScreenBridge.ts'),
  auditDoesNotMoveRuntimeOrScheduling: forbiddenRuntimeTokens.every((needle) => !audit.includes(needle)),
  screenBoundaryDoesNotMoveRuntimeOrScheduling: forbiddenRuntimeTokens.every((needle) => !screenBoundary.includes(needle)),
  sanitySuiteIncludesGuard:
    suite.includes('Resonance screen runtime args shape audit') &&
    suite.includes('xensonar:check-app-resonance-screen-runtime-args-shape-audit'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-resonance-screen-runtime-args-shape-audit'),
  appLineCountUnaffectedByScreenArgsAudit: appLines <= 5585,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  appLines,
  shapeAudit: {
    auditedKeys: shapeKeys,
    topLevelScreenCallZones: ['chrome', 'auxPanels', 'soundPaletteActions', 'corePanels'],
    auxPanelKeys: auxKeys,
    role: 'static shape map for the useAppResonanceScreenRuntimeBoundary argument layer, the aux-panel flattening seam, and the screen runtime entry composition',
  },
  movedScope: [
    'Added a static Resonance screen runtime args shape audit map',
    'Classified chrome, auxPanels, soundPaletteActions, resonancePanels, auxFlattening, and screenRuntimeEntry without moving ownership',
    'Added guard coverage so the screen-runtime argument layer cannot drift into runtime/audio/package/room-lifecycle ownership',
  ],
  explicitlyNotMoved: [
    'No App.tsx callsite behavior was changed',
    'No screen-runtime bridge/index layer was introduced',
    'No Root-Follow, Worklet, Granular, Sample-Elastic, Package, Recording, Parallel Effects DSP, GrooveBass scheduling, Partikel, Wellenstarter, Drum/Bass, or Room III behavior changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
