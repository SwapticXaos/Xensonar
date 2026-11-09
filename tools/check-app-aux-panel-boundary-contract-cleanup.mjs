#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const pkgPath = 'package.json';
const auxArgsPath = 'src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgs.ts';
const auxTypesPath = 'src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgsTypes.ts';
const sourceNormalizerPath = 'src/features/xensonar/layout/appResonanceAuxPanelSourceNormalizer.ts';
const shapeAuditPath = 'validation/contracts/xensonar/layout/appAuxPanelBoundaryShapeAudit.ts';
const dependencyAuditPath = 'validation/contracts/xensonar/layout/appAuxPanelBoundaryDependencyAudit.ts';
const parallelEffectsPath = 'src/features/xensonar/layout/buildAppParallelEffectsAuxPanelBoundary.ts';
const recordingTakePath = 'src/features/xensonar/layout/buildAppRecordingTakeAuxPanelBoundary.ts';
const appPath = 'src/App.tsx';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const pkg = JSON.parse(read(pkgPath));
const auxArgs = exists(auxArgsPath) ? read(auxArgsPath) : '';
const auxTypes = exists(auxTypesPath) ? read(auxTypesPath) : '';
const sourceNormalizer = exists(sourceNormalizerPath) ? read(sourceNormalizerPath) : '';
const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const dependencyAudit = exists(dependencyAuditPath) ? read(dependencyAuditPath) : '';
const parallelEffects = exists(parallelEffectsPath) ? read(parallelEffectsPath) : '';
const recordingTake = exists(recordingTakePath) ? read(recordingTakePath) : '';
const app = exists(appPath) ? read(appPath) : '';
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

const auxKeys = ['parallelEffects', 'grooveBass', 'recordingTake', 'burstDiagnostics'];
const inputGroupNames = [
  ...auxKeys,
  'collectiveMemory',
  'sharedFormatters',
  'psychedelicSpiral',
  'enterHoldPsyFx',
  'schwarm',
  'runtimeMonitors',
  'liveMastering',
  'panelArgs',
  'preview',
  'source',
  'session',
  'exportActions',
  'timeline',
  'audioTapMonitor',
  'audioBurstRecorder',
  'audioPairTherapistStatus',
  'rootFollowHealth',
  'workspacePackageActivationReport',
  'audioBurstRuntime',
  'exportContext',
  'rootFollowRecoveryActions',
];
const outputContractNames = [
  'AppResonanceAuxPanelRuntimeArgs',
  'AppParallelEffectsAuxPanelBoundary',
  'AppAuxPanelGrooveBassFlattenedContract',
  'AppRecordingTakeAuxPanelBoundary',
  'AppBurstDiagnosticsPanelBoundary',
];
const forbiddenRuntimeMoves = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
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
  'updateLiveMasteringSystem(',
  'updatePsychedelicSpiralDevice(',
  'createPsychedelicSpiralDevice(',
  'runParticleNexusToneOrchestrator(',
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'localStorage.',
];

const checks = {
  expectedFilesExist: [
    pkgPath,
    auxArgsPath,
    auxTypesPath,
    sourceNormalizerPath,
    shapeAuditPath,
    dependencyAuditPath,
    parallelEffectsPath,
    recordingTakePath,
    appPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast113: /^3\.2\.91\.6\.9\.(11[3-9]|1[2-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-aux-panel-boundary-contract-cleanup'] ===
    'node tools/check-app-aux-panel-boundary-contract-cleanup.mjs',
  auxArgsDeclaresBoundaryKeys:
    auxArgs.includes('APP_AUX_PANEL_BOUNDARY_KEYS') &&
    auxTypes.includes('AppAuxPanelBoundaryKey') &&
    auxKeys.every((key) => auxArgs.includes(`'${key}'`) && auxTypes.includes(`'${key}'`)),
  auxArgsDeclaresTypedInputOutputMaps: [
    'AppAuxPanelBoundaryInputContractMap',
    'AppAuxPanelBoundarySourceContractMap',
    'AppAuxPanelBoundaryOutputContractMap',
    'AppAuxPanelGrooveBassFlattenedContract',
    'BuildAppResonanceAuxPanelRuntimeArgsInput =\n  | AppAuxPanelBoundaryInputContractMap',
    'AppResonanceAuxPanelRuntimeArgs =\n  AppAuxPanelBoundaryOutputContractMap["parallelEffects"]',
    'AppAuxPanelBoundaryOutputContractMap["grooveBass"]',
    'AppAuxPanelBoundaryOutputContractMap["recordingTake"]',
    'AppAuxPanelBoundaryOutputContractMap["burstDiagnostics"]',
  ].every((needle) => auxTypes.includes(needle.replaceAll('\"', "'"))),
  auxArgsDeclaresLiteralInputGroupAndOutputContractNames:
    auxTypes.includes('AppAuxPanelBoundaryInputGroupName') &&
    auxTypes.includes('AppAuxPanelBoundaryOutputContractName') &&
    inputGroupNames.every((name) => auxTypes.includes(`'${name}'`)) &&
    outputContractNames.every((name) => auxTypes.includes(`'${name}'`)),
  auxArgsAddsCompileTimeContractProbe: [
    'APP_AUX_PANEL_BOUNDARY_CONTRACT_CLEANUP_PROBE',
    'readonly keys: typeof APP_AUX_PANEL_BOUNDARY_KEYS;',
    'readonly inputs: AppAuxPanelBoundaryInputContractMap;',
    'readonly outputs: AppAuxPanelBoundaryOutputContractMap;',
  ].every((needle) => auxArgs.includes(needle)),
  auxArgsStillOnlyFlattensFourAuxPanels:
    auxTypes.includes('Pick<\n  AppResonancePanelSuiteArgs,\n  AppAuxPanelBoundaryKey\n>') &&
    ['...normalizedInput.parallelEffects', '...grooveBass', '...normalizedInput.recordingTake', '...normalizedInput.burstDiagnostics'].every((needle) => auxArgs.includes(needle)) &&
    auxArgs.includes('normalizeAppResonanceAuxPanelSources(input)') &&
    sourceNormalizer.includes('normalizeParallelEffectsAuxPanelSource') &&
    sourceNormalizer.includes('buildAppRecordingTakeAuxPanelBoundary('),
  parallelAndRecordingUseCentralInputContractMap:
    parallelEffects.includes('AppAuxPanelBoundaryInputContractMap') &&
    parallelEffects.includes("AppAuxPanelBoundaryInputContractMap['parallelEffects']") &&
    !parallelEffects.includes('BuildAppResonanceAuxPanelRuntimeArgsInput') &&
    recordingTake.includes('AppAuxPanelBoundaryInputContractMap') &&
    recordingTake.includes("AppAuxPanelBoundaryInputContractMap['recordingTake']") &&
    !recordingTake.includes('BuildAppResonanceAuxPanelRuntimeArgsInput'),
  shapeAuditUsesCentralTypedContractNames:
    shapeAudit.includes("from './appResonanceAuxPanelRuntimeArgsTypes'") &&
    shapeAudit.includes('AppAuxPanelBoundaryInputGroupName') &&
    shapeAudit.includes('AppAuxPanelBoundaryOutputContractName') &&
    shapeAudit.includes("export type AppAuxPanelBoundaryShapeAuditKey = 'auxRuntimeArgs' | AppAuxPanelBoundaryKey") &&
    shapeAudit.includes('readonly inputGroups: readonly AppAuxPanelBoundaryInputGroupName[];') &&
    shapeAudit.includes('readonly outputContract: AppAuxPanelBoundaryOutputContractName;'),
  dependencyAuditAllowsOnlyShapeAuditTypeImport:
    dependencyAudit.includes("shapeAudit: {") &&
    dependencyAudit.includes("allowedTypeImports: ['./appResonanceAuxPanelRuntimeArgsTypes']") &&
    dependencyAudit.includes("allowedValueImports: []"),
  appPassesAuxPanelSourcesAtCallsite:
    app.includes('parallelEffects: {') &&
    app.includes('resonanceFxUiState') &&
    app.includes('grooveBass: materialTrackPanelProps') &&
    app.includes('recordingTake: recordingRuntime.recordingTake,') &&
    app.includes('burstDiagnostics: burstDiagnosticsPanelProps') &&
    !app.includes('buildAppParallelEffectsAuxPanelBoundary({') &&
    !app.includes('buildAppRecordingTakeAuxPanelBoundary(recordingRuntime.recordingTake)'),
  noAuxBoundaryIndexOrPassThroughLayerIntroduced:
    !exists('src/features/xensonar/layout/appAuxPanelBoundaryIndex.ts') &&
    !exists('src/features/xensonar/layout/appResonanceAuxPanelBridge.ts') &&
    !exists('src/features/xensonar/layout/appAuxPanelBridge.ts'),
  noRuntimeOrSchedulingMovedIntoContractFiles:
    [auxArgs, auxTypes, sourceNormalizer, shapeAudit, parallelEffects, recordingTake].every((content) =>
      forbiddenRuntimeMoves.every((needle) => !content.includes(needle))
    ),
  sanitySuiteIncludesGuard:
    suite.includes('Aux panel boundary contract cleanup') &&
    suite.includes('xensonar:check-app-aux-panel-boundary-contract-cleanup'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-aux-panel-boundary-contract-cleanup'),
  appLineCountWithinContractCleanupRange: appLines <= 5585,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  appLines,
  contractCleanup: {
    auxKeys,
    inputGroupNames,
    outputContractNames,
    centralContractFile: auxTypesPath,
    noNewBridgeOrIndex: checks.noAuxBoundaryIndexOrPassThroughLayerIntroduced,
  },
  movedScope: [
    'Typed Aux-panel input/output contract maps in appResonanceAuxPanelRuntimeArgs',
    'Central input-group and output-contract name unions for the Aux-panel shape audit',
    'Parallel-effects and recording-take aux-panel boundaries now derive their props from the central Aux-panel input contract map',
  ],
  explicitlyNotMoved: [
    'No new Aux-panel bridge or index layer was introduced',
    'No App.tsx runtime logic, recording runtime, WAV/crop export, parallel-effects DSP, Materialspur/GrooveBass scheduling, Burst Diagnostics runtime, Root-Follow, Worklet, Granular, Partikel, Wellenstarter, Drum/Bass, Package, or Room III behavior changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
