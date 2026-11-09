#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const auxArgsPath = 'src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgs.ts';
const auxTypesPath = 'src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgsTypes.ts';
const normalizerPath = 'src/features/xensonar/layout/appResonanceAuxPanelSourceNormalizer.ts';
const screenBoundaryPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeBoundary.ts';
const parallelBoundaryPath = 'src/features/xensonar/layout/buildAppParallelEffectsAuxPanelBoundary.ts';
const recordingBoundaryPath = 'src/features/xensonar/layout/buildAppRecordingTakeAuxPanelBoundary.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const auxArgs = exists(auxArgsPath) ? read(auxArgsPath) : '';
const auxTypes = exists(auxTypesPath) ? read(auxTypesPath) : '';
const normalizer = exists(normalizerPath) ? read(normalizerPath) : '';
const screenBoundary = exists(screenBoundaryPath) ? read(screenBoundaryPath) : '';
const parallelBoundary = exists(parallelBoundaryPath) ? read(parallelBoundaryPath) : '';
const recordingBoundary = exists(recordingBoundaryPath) ? read(recordingBoundaryPath) : '';
const pkg = JSON.parse(read(pkgPath));
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

const screenCallStart = app.indexOf('const resonanceScreenRuntimeSource = buildAppResonanceScreenRuntimeSource({');
const screenCallEnd = screenCallStart >= 0 ? app.indexOf('const resonanceScreenRuntime = useAppResonanceScreenRuntimeBoundary(resonanceScreenRuntimeSource);', screenCallStart) : -1;
const screenCall = screenCallStart >= 0 && screenCallEnd > screenCallStart ? app.slice(screenCallStart, screenCallEnd) : '';
const auxStart = screenCall.indexOf('auxPanels: {');
const auxEnd = auxStart >= 0 ? screenCall.indexOf('soundPaletteActions:', auxStart) : -1;
const auxBlock = auxStart >= 0 && auxEnd > auxStart ? screenCall.slice(auxStart, auxEnd) : '';
const namedAuxStart = app.indexOf('const resonanceAuxPanelSource = {');
const namedAuxEnd = namedAuxStart >= 0 ? app.indexOf('\n\n  const resonanceSoundPaletteActionSource = {', namedAuxStart) : -1;
const namedAuxBlock = namedAuxStart >= 0 && namedAuxEnd > namedAuxStart ? app.slice(namedAuxStart, namedAuxEnd) : '';
const appAuxBlock = namedAuxBlock || auxBlock;

const forbiddenRuntimeTokens = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.disconnect(',
  '.start(',
  '.stop(',
  'requestAnimationFrame(',
  'setInterval(',
  'setTimeout(',
  'new AudioContext(',
  'MediaRecorder(',
  'startRecordingSession(',
  'stopRecordingSession(',
  'downloadBufferRangeWav(',
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
  'runParticleNexusToneOrchestrator(',
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'localStorage.',
];

const checks = {
  expectedFilesExist: [appPath, auxArgsPath, auxTypesPath, normalizerPath, screenBoundaryPath, parallelBoundaryPath, recordingBoundaryPath, pkgPath].every(exists),
  packageVersionAtLeast148: /^3\.2\.91\.6\.9\.(?:14[8-9]|1[5-9]\d|[2-9]\d{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-screen-aux-panel-source-cleanup'] ===
    'node tools/check-app-resonance-screen-aux-panel-source-cleanup.mjs',
  appPassesAuxPanelSourcesNotBuiltOutputs:
    appAuxBlock.includes('parallelEffects: {') &&
    appAuxBlock.includes('resonanceFxUiState') &&
    appAuxBlock.includes('sharedFormatters: { formatHzCompact }') &&
    appAuxBlock.includes('schwarmMaterialOptions: SCHWARM_MATERIAL_OPTIONS') &&
    appAuxBlock.includes('liveMastering: liveMasteringCallsiteBoundary') &&
    appAuxBlock.includes('grooveBass: materialTrackPanelProps') &&
    appAuxBlock.includes('recordingTake: recordingRuntime.recordingTake') &&
    appAuxBlock.includes('burstDiagnostics: burstDiagnosticsPanelProps'),
  appNoLongerImportsAuxPanelBuilders:
    !app.includes('import { buildAppParallelEffectsAuxPanelBoundary }') &&
    !app.includes('import { buildAppRecordingTakeAuxPanelBoundary }') &&
    !app.includes('buildAppParallelEffectsAuxPanelBoundary({') &&
    !app.includes('buildAppRecordingTakeAuxPanelBoundary(recordingRuntime.recordingTake)'),
  auxRuntimeArgsDeclaresSourceInputContract:
    auxTypes.includes('AppAuxPanelBoundarySourceContractMap') &&
    auxTypes.includes('readonly parallelEffects: AppParallelEffectsAuxPanelBoundaryInput') &&
    auxTypes.includes('readonly recordingTake: AppRecordingTakeAuxPanelBoundaryInput') &&
    auxTypes.includes('BuildAppResonanceAuxPanelRuntimeArgsInput =') &&
    auxTypes.includes('| AppAuxPanelBoundaryInputContractMap') &&
    auxTypes.includes('| AppAuxPanelBoundarySourceContractMap'),
  auxSourceNormalizerOwnsExistingBoundaryBuilderCalls:
    normalizer.includes('buildAppParallelEffectsAuxPanelBoundary(input)') &&
    normalizer.includes('buildAppRecordingTakeAuxPanelBoundary(') &&
    normalizer.includes('normalizeParallelEffectsAuxPanelSource') &&
    normalizer.includes('isParallelEffectsSourceInput'),
  auxRuntimeArgsStillOnlyFlattensAuxPanels:
    ['...normalizedInput.parallelEffects', '...grooveBass', '...normalizedInput.recordingTake', '...normalizedInput.burstDiagnostics'].every((needle) => auxArgs.includes(needle)) &&
    auxArgs.includes('normalizeAppResonanceAuxPanelSources(input)') &&
    auxArgs.includes('const { nParamsUI: _nParamsUI, updateNParams: _updateNParams, ...grooveBass } = normalizedInput.grooveBass;'),
  auxRuntimeArgsDeclaresCleanupManifest:
    auxArgs.includes('APP_RESONANCE_SCREEN_AUX_PANEL_SOURCE_CLEANUP') &&
    auxArgs.includes("cleanupKind: 'app-resonance-screen-aux-panel-source-cleanup'") &&
    auxArgs.includes('appOwnsAuxPanelBoundaryBuilderCalls: false') &&
    auxArgs.includes('auxRuntimeArgsOwnsRuntime: false') &&
    auxArgs.includes('auxRuntimeArgsMutatesAudio: false'),
  screenBoundaryDelegatesAuxFlatteningOnly:
    screenBoundary.includes('const appResonanceAuxPanelRuntimeArgs = buildAppResonanceAuxPanelRuntimeArgs(auxPanels);') &&
    screenBoundary.includes('auxPanelArgs: appResonanceAuxPanelRuntimeArgs') &&
    !screenBoundary.includes('buildAppParallelEffectsAuxPanelBoundary') &&
    !screenBoundary.includes('buildAppRecordingTakeAuxPanelBoundary'),
  existingAuxBoundariesRemainPureInputMontage:
    parallelBoundary.includes('APP_PARALLEL_EFFECTS_AUX_PANEL_BOUNDARY_CONTRACT') &&
    recordingBoundary.includes('APP_RECORDING_TAKE_AUX_PANEL_BOUNDARY_CONTRACT') &&
    parallelBoundary.includes('runtimeOwned: false') &&
    recordingBoundary.includes('runtimeOwned: false') &&
    parallelBoundary.includes('audioMutating: false') &&
    recordingBoundary.includes('audioMutating: false'),
  auxNormalizerLayerDoesNotOwnRuntimeOrScheduling:
    [auxArgs, auxTypes, normalizer].every((content) => forbiddenRuntimeTokens.every((needle) => !content.includes(needle))),
  noNewAuxBridgeOrIndex:
    !exists('src/features/xensonar/layout/appAuxPanelBoundaryIndex.ts') &&
    !exists('src/features/xensonar/layout/appResonanceAuxPanelBridge.ts') &&
    !exists('src/features/xensonar/layout/appAuxPanelBridge.ts') &&
    !exists('src/features/xensonar/layout/useAppAuxPanelBridge.ts'),
  sanitySuiteIncludesGuard:
    suite.includes('Resonance screen aux-panel source cleanup') &&
    suite.includes('xensonar:check-app-resonance-screen-aux-panel-source-cleanup'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-resonance-screen-aux-panel-source-cleanup'),
  appLineCountWithinExpectedRange: appLines <= 5535,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  appLines,
  cleanup: {
    role: 'move aux-panel boundary builder calls out of App.tsx and isolate them in appResonanceAuxPanelSourceNormalizer',
    appCallsiteShape: 'compact-aux-panel-source-inputs',
    auxRuntimeArgsRole: 'normalized-source-flattening-only',
    sourceNormalizerRole: 'aux-panel-source-normalization-only',
    runtimeOwned: false,
    audioMutating: false,
    packagePersistenceOwned: false,
  },
  explicitlyNotMoved: [
    'No parallel-effects DSP/device behavior moved',
    'No recording session runtime, MediaRecorder lifecycle, WAV/crop export, preview URL, or timeline pointer behavior moved',
    'No Materialspur/GrooveBass scheduling, Burst Diagnostics recovery runtime, Root-Follow, Worklet, Granular, Partikel, Wellenstarter, Drum/Bass, Package, Room III, or visible UI behavior changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
