#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeBoundary.ts';
const panelArgsPath = 'src/features/xensonar/layout/appResonanceScreenPanelRuntimeArgs.ts';
const dependencyAuditPath = 'validation/contracts/xensonar/layout/appResonanceScreenRuntimeArgsDependencyAudit.ts';
const shapeAuditPath = 'validation/contracts/xensonar/layout/appResonanceScreenRuntimeArgsShapeAudit.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const panelArgs = exists(panelArgsPath) ? read(panelArgsPath) : '';
const dependencyAudit = exists(dependencyAuditPath) ? read(dependencyAuditPath) : '';
const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;
const boundaryLines = boundary.split(/\r?\n/).length;
const panelArgsLines = panelArgs.split(/\r?\n/).length;

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
  'localStorage.',
];

const checks = {
  expectedFilesExist: [
    appPath,
    boundaryPath,
    panelArgsPath,
    dependencyAuditPath,
    shapeAuditPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast147: /^3\.2\.91\.6\.9\.(14[7-9]|1[5-9][0-9]|[2-9][0-9]{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-screen-panel-runtime-args-builder-extract'] ===
    'node tools/check-app-resonance-screen-panel-runtime-args-builder-extract.mjs',
  appCallsiteStillGroupedAndUnchanged:
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
    app.includes('particleSystem: particleSystemRuntimeProps'),
  boundaryDelegatesPanelArgsAssembly:
    boundary.includes("from './appResonanceScreenPanelRuntimeArgs'") &&
    boundary.includes('buildAppResonanceScreenPanelRuntimeArgs') &&
    boundary.includes('const appResonanceAuxPanelRuntimeArgs = buildAppResonanceAuxPanelRuntimeArgs(auxPanels);') &&
    boundary.includes('const resonancePanelRuntimeArgs = buildAppResonanceScreenPanelRuntimeArgs({') &&
    boundary.includes('corePanelSource: resonancePanels,') &&
    boundary.includes('soundPaletteActions,') &&
    boundary.includes('auxPanelArgs: appResonanceAuxPanelRuntimeArgs,'),
  boundaryKeepsOnlyScreenEntryComposition:
    boundary.includes('const runtimeBoundary = buildAppResonanceScreenRuntimeEntry({') &&
    boundary.includes('resonancePanels: resonancePanelRuntimeArgs,') &&
    boundary.includes('return runtimeBoundary;') &&
    !boundary.includes('const corePanelArgs = buildAppResonanceScreenCorePanelArgs(') &&
    !boundary.includes('const soundPaletteCatalogArgs = buildAppResonanceScreenSoundPaletteCatalogArgs()') &&
    !boundary.includes('const soundPaletteActionArgs = buildAppResonanceScreenSoundPaletteActionArgs('),
  panelArgsModuleOwnsBuildersAndManifest: [
    'APP_RESONANCE_SCREEN_PANEL_RUNTIME_ARGS_BUILDER_EXTRACT',
    "cleanupKind: 'app-resonance-screen-panel-runtime-args-builder-extract'",
    'panelArgsModuleOwnsCorePanelFlattening: true',
    'panelArgsModuleOwnsStaticSoundPaletteCatalogs: true',
    'panelArgsModuleOwnsSoundPaletteActionAdapters: true',
    'panelArgsModuleOwnsRuntime: false',
    'buildAppResonanceScreenCorePanelArgs',
    'buildAppResonanceScreenSoundPaletteCatalogArgs',
    'buildAppResonanceScreenSoundPaletteActionArgs',
    'buildAppResonanceScreenPanelRuntimeArgs',
    'AppResonanceScreenPanelRuntimeArgsInput',
  ].every((needle) => panelArgs.includes(needle)),
  panelArgsBuildsMergedRuntimeArgsWithoutRuntimeOwnership: [
    'const corePanelArgs = buildAppResonanceScreenCorePanelArgs(corePanelSource);',
    'const soundPaletteCatalogArgs = buildAppResonanceScreenSoundPaletteCatalogArgs();',
    'const soundPaletteActionArgs = buildAppResonanceScreenSoundPaletteActionArgs(soundPaletteActions);',
    '...corePanelArgs,',
    '...soundPaletteCatalogArgs,',
    '...soundPaletteActionArgs,',
    '...auxPanelArgs,',
    '} satisfies ResonancePanelRuntimeArgs;',
  ].every((needle) => panelArgs.includes(needle)),
  panelArgsHasOnlyExpectedStaticValueImports:
    panelArgs.includes("from '../domain/instrumentData'") &&
    panelArgs.includes("from '../domain/metaPresets'") &&
    panelArgs.includes("from '../rooms/resonanceUiConfig'") &&
    !panelArgs.includes("from '../runtimeEntries'") &&
    !panelArgs.includes("from './appResonanceScreenRuntimeEntry'"),
  dependencyAuditKnowsPanelArgsModule:
    dependencyAudit.includes("'panelRuntimeArgs'") &&
    dependencyAudit.includes("file: 'src/features/xensonar/layout/appResonanceScreenPanelRuntimeArgs.ts'") &&
    dependencyAudit.includes("importKind: 'panel-runtime-args-builder'") &&
    dependencyAudit.includes('no screen runtime entry ownership'),
  shapeAuditPointsPanelCompositionToPanelArgsModule:
    shapeAudit.includes("sourceFile: 'src/features/xensonar/layout/appResonanceScreenPanelRuntimeArgs.ts'") &&
    shapeAudit.includes("outputContract: 'AppResonanceScreenCorePanelArgs'") &&
    shapeAudit.includes("outputContract: 'AppResonanceScreenSoundPaletteActionArgs'"),
  noRuntimeOrSchedulingMoved:
    forbiddenRuntimeMoves.every((needle) => !boundary.includes(needle) && !panelArgs.includes(needle)),
  sanitySuiteIncludesGuard: suite.includes('xensonar:check-app-resonance-screen-panel-runtime-args-builder-extract'),
  sanitySuiteContractIncludesGuard: suiteContract.includes('xensonar:check-app-resonance-screen-panel-runtime-args-builder-extract'),
  lineCountEnvelope:
    appLines <= 5490 &&
    boundaryLines <= 240 &&
    panelArgsLines <= 320,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines,
  panelArgsLines,
  movedScope: [
    'Extracted resonance panel runtime arg assembly from useAppResonanceScreenRuntimeBoundary into appResonanceScreenPanelRuntimeArgs.',
    'The screen boundary now delegates core-panel flattening, static catalog rehydration, and string-facing SoundPalette action adapters to the panel args builder.',
    'The boundary keeps aux-panel flattening plus final screen runtime entry composition and does not own runtime/audio behavior.',
  ],
  explicitlyNotMoved: [
    'App.tsx resonanceScreenRuntime callsite shape and grouped sources',
    'Stage canvas/audio-readiness bodies',
    'ResonanceControl grid/tuning/traffic/tone/myzel actions',
    'ParticleSystem agent actions',
    'SoundPalette preview/audio action bodies',
    'Root-Follow, Materialspur, Wellenstarter, Drum/Bass, Package, Room III, AudioWorklet runtime',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
