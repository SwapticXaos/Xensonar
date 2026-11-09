#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const auxArgsPath = 'src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgs.ts';
const normalizerPath = 'src/features/xensonar/layout/appResonanceAuxPanelSourceNormalizer.ts';
const dependencyAuditPath = 'validation/contracts/xensonar/layout/appAuxPanelBoundaryDependencyAudit.ts';
const screenDependencyAuditPath = 'validation/contracts/xensonar/layout/appResonanceScreenRuntimeArgsDependencyAudit.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const auxArgs = exists(auxArgsPath) ? read(auxArgsPath) : '';
const normalizer = exists(normalizerPath) ? read(normalizerPath) : '';
const dependencyAudit = exists(dependencyAuditPath) ? read(dependencyAuditPath) : '';
const screenDependencyAudit = exists(screenDependencyAuditPath) ? read(screenDependencyAuditPath) : '';
const pkg = JSON.parse(read(pkgPath));
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

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
  expectedFilesExist: [appPath, auxArgsPath, normalizerPath, dependencyAuditPath, screenDependencyAuditPath, pkgPath].every(exists),
  packageVersionAtLeast149: /^3\.2\.91\.6\.9\.(?:149|1[5-9]\d|[2-9]\d{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-aux-panel-source-normalizer-extract'] ===
    'node tools/check-app-resonance-aux-panel-source-normalizer-extract.mjs',
  auxArgsImportsNormalizerAndNoLongerImportsBoundaryBuilders:
    auxArgs.includes("from './appResonanceAuxPanelSourceNormalizer'") &&
    auxArgs.includes('normalizeAppResonanceAuxPanelSources(input)') &&
    !auxArgs.includes('buildAppParallelEffectsAuxPanelBoundary(input)') &&
    !auxArgs.includes('buildAppParallelEffectsAuxPanelBoundary,') &&
    !auxArgs.includes('buildAppRecordingTakeAuxPanelBoundary(input.recordingTake)') &&
    !auxArgs.includes('buildAppRecordingTakeAuxPanelBoundary,') &&
    !auxArgs.includes('function normalizeParallelEffectsAuxPanel'),
  auxArgsStillFlattensOnlyNormalizedAuxPanels:
    auxArgs.includes('const normalizedInput = normalizeAppResonanceAuxPanelSources(input);') &&
    auxArgs.includes('...normalizedInput.parallelEffects') &&
    auxArgs.includes('...grooveBass') &&
    auxArgs.includes('...normalizedInput.recordingTake') &&
    auxArgs.includes('...normalizedInput.burstDiagnostics') &&
    auxArgs.includes('const { nParamsUI: _nParamsUI, updateNParams: _updateNParams, ...grooveBass } = normalizedInput.grooveBass;'),
  normalizerOwnsOnlySourceNormalization:
    normalizer.includes('APP_RESONANCE_AUX_PANEL_SOURCE_NORMALIZER_EXTRACT') &&
    normalizer.includes("cleanupKind: 'app-resonance-aux-panel-source-normalizer-extract'") &&
    normalizer.includes('normalizeAppResonanceAuxPanelSources') &&
    normalizer.includes('normalizeParallelEffectsAuxPanelSource') &&
    normalizer.includes('buildAppParallelEffectsAuxPanelBoundary(input)') &&
    normalizer.includes('buildAppRecordingTakeAuxPanelBoundary(') &&
    normalizer.includes('sourceNormalizerOwnsRuntime: false') &&
    normalizer.includes('sourceNormalizerMutatesAudio: false') &&
    normalizer.includes('sourceNormalizerOwnsPackagePersistence: false'),
  appCallsiteRemainsCompactAuxPanelSources:
    app.includes('const resonanceAuxPanelSource = {') &&
    app.includes('auxPanels: resonanceAuxPanelSource') &&
    app.includes('parallelEffects: {') &&
    app.includes('resonanceFxUiState') &&
    app.includes('grooveBass: materialTrackPanelProps') &&
    app.includes('recordingTake: recordingRuntime.recordingTake,') &&
    app.includes('burstDiagnostics: burstDiagnosticsPanelProps') &&
    !app.includes('buildAppParallelEffectsAuxPanelBoundary({') &&
    !app.includes('buildAppRecordingTakeAuxPanelBoundary(recordingRuntime.recordingTake)'),
  dependencyAuditsKnowNormalizer:
    dependencyAudit.includes("| 'sourceNormalizer'") &&
    dependencyAudit.includes("sourceFile: 'src/features/xensonar/layout/appResonanceAuxPanelSourceNormalizer.ts'") &&
    dependencyAudit.includes("dependencyRole: 'static-aux-panel-source-normalizer'") &&
    dependencyAudit.includes("allowedValueImports: [\n      './appResonanceAuxPanelSourceNormalizer'") &&
    screenDependencyAudit.includes("'./appResonanceAuxPanelSourceNormalizer'") &&
    screenDependencyAudit.includes('parallel-effects and recording-take source inputs are normalized through appResonanceAuxPanelSourceNormalizer'),
  normalizerDoesNotOwnRuntimeOrScheduling:
    forbiddenRuntimeTokens.every((needle) => !normalizer.includes(needle)) &&
    forbiddenRuntimeTokens.every((needle) => !auxArgs.includes(needle)),
  noNewAuxBridgeOrIndex:
    !exists('src/features/xensonar/layout/appAuxPanelBoundaryIndex.ts') &&
    !exists('src/features/xensonar/layout/appResonanceAuxPanelBridge.ts') &&
    !exists('src/features/xensonar/layout/appAuxPanelBridge.ts') &&
    !exists('src/features/xensonar/layout/useAppAuxPanelBridge.ts'),
  sanitySuiteIncludesGuard:
    suite.includes('Resonance aux-panel source normalizer extract') &&
    suite.includes('xensonar:check-app-resonance-aux-panel-source-normalizer-extract'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-resonance-aux-panel-source-normalizer-extract'),
  appLineCountStable: appLines <= 5535,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  appLines,
  cleanup: {
    role: 'extract aux-panel source normalization from appResonanceAuxPanelRuntimeArgs',
    auxRuntimeArgsRole: 'normalized aux-panel flattening only',
    sourceNormalizerRole: 'compact/prebuilt aux-panel source normalization only',
    runtimeOwned: false,
    audioMutating: false,
    packagePersistenceOwned: false,
  },
  explicitlyNotMoved: [
    'No App.tsx callsite shape changed',
    'No parallel-effects DSP/device behavior moved',
    'No recording runtime, MediaRecorder lifecycle, WAV/crop export, preview URL, or timeline behavior moved',
    'No Materialspur/GrooveBass scheduling, Burst Diagnostics recovery, Root-Follow, Worklet, Granular, Partikel, Wellenstarter, Drum/Bass, Package, Room III, or visible UI behavior changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
