#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const auditPath = 'validation/contracts/xensonar/layout/appResonanceScreenRuntimeArgsDependencyAudit.ts';
const shapeAuditPath = 'validation/contracts/xensonar/layout/appResonanceScreenRuntimeArgsShapeAudit.ts';
const screenBoundaryPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeBoundary.ts';
const auxArgsPath = 'src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgs.ts';
const stageSourceReadinessAuditPath = 'src/features/xensonar/layout/appResonanceScreenStageSourceReadinessAudit.ts';
const stageSourceBuilderPath = 'src/features/xensonar/layout/appResonanceScreenStageSourceBuilder.ts';
const soundPaletteSourceBuilderPath = 'src/features/xensonar/layout/appResonanceScreenSoundPaletteSourceBuilder.ts';
const runtimeSourceBuilderPath = 'src/features/xensonar/layout/appResonanceScreenRuntimeSourceBuilder.ts';
const screenEntryPath = 'src/features/xensonar/layout/appResonanceScreenRuntimeEntry.ts';
const surfaceCoordinatorPath = 'src/features/xensonar/layout/appSurfaceRuntimeCoordinator.ts';
const appPath = 'src/App.tsx';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const audit = exists(auditPath) ? read(auditPath) : '';
const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const screenBoundary = exists(screenBoundaryPath) ? read(screenBoundaryPath) : '';
const auxArgs = exists(auxArgsPath) ? read(auxArgsPath) : '';
const stageSourceReadinessAudit = exists(stageSourceReadinessAuditPath) ? read(stageSourceReadinessAuditPath) : '';
const stageSourceBuilder = exists(stageSourceBuilderPath) ? read(stageSourceBuilderPath) : '';
const screenEntry = exists(screenEntryPath) ? read(screenEntryPath) : '';
const surfaceCoordinator = exists(surfaceCoordinatorPath) ? read(surfaceCoordinatorPath) : '';
const app = exists(appPath) ? read(appPath) : '';
const pkg = JSON.parse(read(pkgPath));
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

const expectedDependencyAuditKeys = [
  'shapeAudit',
  'screenBoundary',
  'panelRuntimeArgs',
  'stageSourceReadinessAudit',
  'stageSourceBuilder',
  'soundPaletteSourceBuilder',
  'runtimeSourceBuilder',
  'auxRuntimeArgs',
  'screenRuntimeEntry',
];

const panelRuntimeArgsPath = 'src/features/xensonar/layout/appResonanceScreenPanelRuntimeArgs.ts';
const dependencyAuditFiles = {
  shapeAudit: shapeAuditPath,
  screenBoundary: screenBoundaryPath,
  panelRuntimeArgs: panelRuntimeArgsPath,
  stageSourceReadinessAudit: stageSourceReadinessAuditPath,
  stageSourceBuilder: stageSourceBuilderPath,
  soundPaletteSourceBuilder: soundPaletteSourceBuilderPath,
  runtimeSourceBuilder: runtimeSourceBuilderPath,
  auxRuntimeArgs: auxArgsPath,
  screenRuntimeEntry: screenEntryPath,
};

const allowedValueImports = {
  shapeAudit: [],
  screenBoundary: ['../runtimeEntries', './appResonanceAuxPanelRuntimeArgs', './appResonanceScreenPanelRuntimeArgs'],
  panelRuntimeArgs: ['../domain/instrumentData', '../domain/metaPresets', '../rooms/resonanceUiConfig'],
  stageSourceReadinessAudit: [],
  stageSourceBuilder: ['./appResonanceScreenStageSourceReadinessAudit'],
  soundPaletteSourceBuilder: [],
  runtimeSourceBuilder: [],
  auxRuntimeArgs: ['./appResonanceAuxPanelSourceNormalizer'],
  screenRuntimeEntry: [],
};

const allowedTypeImports = {
  shapeAudit: ['./appResonanceAuxPanelRuntimeArgsTypes', './appResonanceScreenStageSourceReadinessAudit', './useAppResonanceScreenRuntimeBoundary'],
  screenBoundary: ['./appResonanceAuxPanelRuntimeArgsTypes', './appResonanceScreenPanelRuntimeArgsTypes'],
  panelRuntimeArgs: ['./appResonanceScreenPanelRuntimeArgsTypes'],
  stageSourceReadinessAudit: ['./appResonanceScreenPanelRuntimeArgsTypes'],
  stageSourceBuilder: ['./appResonanceScreenPanelRuntimeArgsTypes'],
  soundPaletteSourceBuilder: ['./appResonanceScreenPanelRuntimeArgsTypes'],
  runtimeSourceBuilder: ['./appResonanceAuxPanelRuntimeArgsTypes', './appResonanceScreenPanelRuntimeArgsTypes'],
  auxRuntimeArgs: ['./appResonanceAuxPanelRuntimeArgsTypes'],
  screenRuntimeEntry: [],
};

const allowedExportSources = {
  shapeAudit: [],
  screenBoundary: ['./appResonanceScreenPanelRuntimeArgs', './appResonanceScreenStageSourceReadinessAudit'],
  panelRuntimeArgs: [],
  stageSourceReadinessAudit: [],
  stageSourceBuilder: [],
  soundPaletteSourceBuilder: [],
  runtimeSourceBuilder: [],
  auxRuntimeArgs: [],
  screenRuntimeEntry: ['./appSurfaceRuntimeCoordinator'],
};

const forbiddenImportFragments = [
  'App.tsx',
  'AudioEngine',
  'audioEngine',
  'audioWorklet',
  'worklet',
  'scheduler',
  'voicePool',
  'rootFollowRuntime',
  'rootFollowLoopRuntime',
  'packageStation',
  'workspacePackageStore',
  'packagePersistence',
  'Room3Runtime',
  'myzelSynthRuntime',
  'particlePlayback',
  'waveStarterRuntime',
  'recordingRuntime',
  'MediaRecorder',
  'localStorage',
];

const forbiddenRuntimeTokens = [
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

const importRegex = /import\s+[\s\S]*?\sfrom\s+['"]([^'"]+)['"];?/g;
const exportFromRegex = /export\s+(?:\{[\s\S]*?\}|\*)\s+from\s+['"]([^'"]+)['"];?/g;

const extractImports = (content) => {
  const imports = [];
  for (const match of content.matchAll(importRegex)) {
    const statement = match[0].replace(/\s+/g, ' ').trim();
    const source = match[1];
    const isTypeOnly = /^import\s+type\b/.test(statement);
    imports.push({ statement, source, isTypeOnly });
  }
  return imports;
};

const extractExportSources = (content) => {
  const sources = [];
  for (const match of content.matchAll(exportFromRegex)) sources.push(match[1]);
  return sources;
};

const dependencyFindings = Object.fromEntries(
  Object.entries(dependencyAuditFiles).map(([key, rel]) => {
    const content = exists(rel) ? read(rel) : '';
    const imports = extractImports(content);
    const exportSources = extractExportSources(content);
    const valueImports = imports.filter((entry) => !entry.isTypeOnly).map((entry) => entry.source);
    const typeImports = imports.filter((entry) => entry.isTypeOnly).map((entry) => entry.source);
    const unexpectedValueImports = valueImports.filter((source) => !allowedValueImports[key].includes(source));
    const unexpectedTypeImports = typeImports.filter((source) => !allowedTypeImports[key].includes(source));
    const unexpectedExportSources = exportSources.filter((source) => !allowedExportSources[key].includes(source));
    const dependencyText = [...valueImports, ...typeImports, ...exportSources].join('\n');
    const forbiddenImportHits = forbiddenImportFragments.filter((fragment) => dependencyText.includes(fragment));
    const forbiddenRuntimeHits = forbiddenRuntimeTokens.filter((token) => content.includes(token));
    return [key, {
      file: rel,
      exists: exists(rel),
      valueImports,
      typeImports,
      exportSources,
      unexpectedValueImports,
      unexpectedTypeImports,
      unexpectedExportSources,
      forbiddenImportHits,
      forbiddenRuntimeHits,
    }];
  }),
);

const allDependencyFilesClean = Object.values(dependencyFindings).every((finding) =>
  finding.exists &&
  finding.unexpectedValueImports.length === 0 &&
  finding.unexpectedTypeImports.length === 0 &&
  finding.unexpectedExportSources.length === 0 &&
  finding.forbiddenImportHits.length === 0 &&
  finding.forbiddenRuntimeHits.length === 0
);

const checks = {
  expectedFilesExist: [
    auditPath,
    shapeAuditPath,
    screenBoundaryPath,
    panelRuntimeArgsPath,
    stageSourceReadinessAuditPath,
    stageSourceBuilderPath,
    auxArgsPath,
    screenEntryPath,
    surfaceCoordinatorPath,
    appPath,
    pkgPath,
  ].every(exists),
  packageVersionAtLeast115: /^3\.2\.91\.6\.9\.(11[5-9]|1[2-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-screen-runtime-args-dependency-audit'] ===
    'node tools/check-app-resonance-screen-runtime-args-dependency-audit.mjs',
  auditDeclaresExplicitDependencyMap:
    audit.includes('APP_RESONANCE_SCREEN_RUNTIME_ARGS_DEPENDENCY_AUDIT') &&
    audit.includes('APP_RESONANCE_SCREEN_RUNTIME_ARGS_DEPENDENCY_AUDIT_FORBIDDEN_IMPORT_FAMILIES') &&
    expectedDependencyAuditKeys.every((key) => audit.includes(`${key}: {`) || audit.includes(`'${key}'`)),
  auditDeclaresStageSourceReadinessContract:
    audit.includes('stageSourceReadinessAudit') &&
    audit.includes("importKind: 'stage-source-readiness-contract'") &&
    audit.includes('stage source readiness audit only') &&
    audit.includes('stageSourceBuilder') &&
    audit.includes('stage-source-builder-probe'),
  stageSourceReadinessAuditIsStaticOnly:
    stageSourceReadinessAudit.includes('APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_AUDIT') &&
    stageSourceReadinessAudit.includes('APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_AUDIT_MANIFEST') &&
    stageSourceReadinessAudit.includes('dedicatedStageSourceBuilderIntroduced: true') &&
    stageSourceReadinessAudit.includes("nextAllowedStepAfterAudit: 'buildAppResonanceScreenStageSource'") &&
    !stageSourceReadinessAudit.includes('export function buildAppResonanceScreenStageSource') &&
    stageSourceBuilder.includes('export function buildAppResonanceScreenStageSource') &&
    stageSourceBuilder.includes('APP_RESONANCE_SCREEN_STAGE_SOURCE_BUILDER_PROBE'),
  auditDeclaresNonOwnershipFlags: [
    'mayImportReact: false',
    'mayImportApp: false',
    'mayImportAudioRuntime: false',
    'mayImportWorkletRuntime: false',
    'mayImportPackagePersistence: false',
    'mayImportRecordingRuntime: false',
    'runtimeOwned: false',
    'audioMutating: false',
    'roomLifecycleOwned: false',
    'packagePersistenceOwned: false',
  ].every((needle) => audit.includes(needle)),
  dependencyAuditFilesMatchAllowlist: allDependencyFilesClean,
  screenBoundaryStillUsesOnlyRuntimeEntryAndAuxFlattener:
    screenBoundary.includes('buildAppResonanceScreenRuntimeEntry') &&
    screenBoundary.includes('buildAppResonanceAuxPanelRuntimeArgs') &&
    screenBoundary.includes('buildAppResonanceScreenPanelRuntimeArgs') &&
    screenBoundary.includes('const appResonanceAuxPanelRuntimeArgs = buildAppResonanceAuxPanelRuntimeArgs(auxPanels);') &&
    !screenBoundary.includes('buildAppSurfaceRuntimeProps(') &&
    !screenBoundary.includes('buildAppRoomSceneRuntimeProps('),
  screenRuntimeEntryStillOnlyReExportsResonanceScreenRuntimeEntry:
    screenEntry.includes("buildAppResonanceScreenRuntimeProps as buildAppResonanceScreenRuntimeEntry") &&
    !screenEntry.includes('buildAppRoomSceneRuntimeProps as') &&
    !screenEntry.includes('buildAppSurfaceRuntimeProps as'),
  surfaceCoordinatorDelegationRemainsNamedButNotOwnedByAudit:
    surfaceCoordinator.includes('buildAppResonanceScreenRuntimeProps') &&
    surfaceCoordinator.includes('buildAppRoomSceneRuntimeProps') &&
    audit.includes('does not own appSurfaceRuntimeCoordinator as a whole'),
  shapeAuditStillMapsCurrentScreenZones:
    shapeAudit.includes('APP_RESONANCE_SCREEN_RUNTIME_ARGS_SHAPE_AUDIT') &&
    ['chrome', 'auxPanels', 'soundPaletteActions', 'resonancePanels', 'auxFlattening', 'screenRuntimeEntry'].every((key) => shapeAudit.includes(`${key}: {`)),
  noScreenRuntimeArgsPassThroughBridgeOrIndexIntroduced:
    !exists('src/features/xensonar/layout/appResonanceScreenRuntimeArgsIndex.ts') &&
    !exists('src/features/xensonar/layout/appResonanceScreenRuntimeBridge.ts') &&
    !exists('src/features/xensonar/layout/appResonanceScreenBridge.ts') &&
    !exists('src/features/xensonar/layout/appResonanceScreenRuntimeArgsBridge.ts'),
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
    app.includes('parallelEffects: {') &&
    app.includes('resonanceFxUiState') &&
    app.includes('recordingTake: recordingRuntime.recordingTake'),
  dependencyGuardListedInSanitySuiteContract:
    suiteContract.includes('xensonar:check-app-resonance-screen-runtime-args-dependency-audit'),
  dependencyGuardListedInRefactorSuiteRunner:
    suite.includes('Resonance screen runtime args dependency audit') &&
    suite.includes('xensonar:check-app-resonance-screen-runtime-args-dependency-audit'),
  appLineCountUnaffectedByScreenArgsDependencyAudit: appLines <= 5585,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  appLines,
  dependencyAudit: {
    auditedKeys: expectedDependencyAuditKeys,
    guardedFiles: dependencyAuditFiles,
    allDependencyFilesClean,
    dependencyFindings,
    delegatedTarget: 'appSurfaceRuntimeCoordinator is referenced only through appResonanceScreenRuntimeEntry and is not reclassified as a pure screen-args ownership file',
  },
  movedScope: [
    'Added a static dependency audit for the Resonance screen runtime args layer',
    'Added a guard that compares real import/export sources against the allowed screen-args dependency map',
    'Registered the guard in the refactor sanity suite and contract checker',
  ],
  explicitlyNotMoved: [
    'No App.tsx callsite behavior was changed',
    'No additional screen-runtime bridge or index layer was introduced',
    'No Root-Follow, Worklet, Granular, Sample-Elastic, Package, Recording, Parallel Effects DSP, GrooveBass scheduling, Partikel, Wellenstarter, Drum/Bass, or Room III behavior changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
