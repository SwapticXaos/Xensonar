#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/layout/buildAppParallelEffectsAuxPanelBoundary.ts';
const boundaryTypesPath = 'src/features/xensonar/layout/buildAppParallelEffectsAuxPanelBoundaryTypes.ts';
const auxArgsPath = 'src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgs.ts';
const sourceNormalizerPath = 'src/features/xensonar/layout/appResonanceAuxPanelSourceNormalizer.ts';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const pkgPath = 'package.json';

const app = read(appPath);
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const boundaryTypes = exists(boundaryTypesPath) ? read(boundaryTypesPath) : '';
const auxArgs = exists(auxArgsPath) ? read(auxArgsPath) : '';
const sourceNormalizer = exists(sourceNormalizerPath) ? read(sourceNormalizerPath) : '';
const suite = read(suitePath);
const suiteContract = read(suiteContractPath);
const pkg = JSON.parse(read(pkgPath));
const appLines = app.split(/\r?\n/).length;

const requiredBoundaryGroups = [
  'collectiveMemory',
  'sharedFormatters',
  'psychedelicSpiral',
  'enterHoldPsyFx',
  'schwarm',
  'runtimeMonitors',
  'liveMastering',
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
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
  'updateLiveMasteringSystem(',
  'updatePsychedelicSpiralDevice(',
  'createPsychedelicSpiralDevice(',
  'updateSchwarmSource(',
];

const checks = {
  packageVersionAtLeast109: /^3\.2\.91\.6\.9\.(10[9]|1[1-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-parallel-effects-aux-panel-boundary'] ===
    'node tools/check-app-parallel-effects-aux-panel-boundary.mjs',
  boundaryFileExists: exists(boundaryPath),
  sourceNormalizerImportsBoundary:
    sourceNormalizer.includes('buildAppParallelEffectsAuxPanelBoundary') &&
    sourceNormalizer.includes('./buildAppParallelEffectsAuxPanelBoundary'),
  appUsesCompactParallelEffectsSource:
    app.includes('parallelEffects: {') &&
    app.includes('resonanceFxUiState') &&
    app.includes('sharedFormatters: { formatHzCompact }') &&
    app.includes('schwarmMaterialOptions: SCHWARM_MATERIAL_OPTIONS') &&
    app.includes('liveMastering: liveMasteringCallsiteBoundary') &&
    !app.includes('buildAppParallelEffectsAuxPanelBoundary({'),
  appNoLongerOwnsFlatParallelEffectsObject:
    !app.includes('parallelEffects: {\n        collectiveMemoryEnabled,') &&
    !app.includes('parallelEffects: {\r\n        collectiveMemoryEnabled,'),
  appKeepsAuxPanelRuntimeBoundaryCall:
    app.includes('const resonanceScreenRuntime = useAppResonanceScreenRuntimeBoundary({') &&
    app.includes('auxPanels: {') &&
    app.includes('grooveBass: materialTrackPanelProps') &&
    app.includes('recordingTake: recordingRuntime.recordingTake') &&
    app.includes('burstDiagnostics: burstDiagnosticsPanelProps'),
  boundaryUsesAuxPanelInputTypeOnly:
    boundary.includes("from './buildAppParallelEffectsAuxPanelBoundaryTypes';") &&
    boundaryTypes.includes("import type { AppAuxPanelBoundaryInputContractMap } from './appResonanceAuxPanelRuntimeArgsTypes';") &&
    boundaryTypes.includes("type AppParallelEffectsAuxPanelProps = AppAuxPanelBoundaryInputContractMap['parallelEffects'];") &&
    !boundaryTypes.includes('BuildAppResonanceAuxPanelRuntimeArgsInput') &&
    !boundaryTypes.includes("import { AppAuxPanelBoundaryInputContractMap"),
  boundaryDeclaresContractAndGroups:
    boundary.includes('APP_PARALLEL_EFFECTS_AUX_PANEL_BOUNDARY_CONTRACT') &&
    boundary.includes("currentRole: 'app-aux-panel-input-montage'") &&
    boundary.includes('runtimeOwned: false') &&
    boundary.includes('audioMutating: false') &&
    requiredBoundaryGroups.every((group) => boundary.includes(group)),
  boundaryExportsTypedGroups: [
    'AppParallelEffectsCollectiveMemoryBoundary',
    'AppParallelEffectsSharedFormatterBoundary',
    'AppParallelEffectsPsychedelicSpiralBoundary',
    'AppParallelEffectsEnterHoldPsyFxBoundary',
    'AppParallelEffectsSchwarmBoundary',
    'AppParallelEffectsRuntimeMonitorBoundary',
    'AppParallelEffectsLiveMasteringBoundary',
    'AppParallelEffectsAuxPanelBoundaryInput',
  ].every((needle) => boundaryTypes.includes(needle)),
  boundaryIsPureInputMontage:
    forbiddenRuntimeTokens.every((needle) => !boundary.includes(needle)) &&
    boundary.includes('return {') &&
    requiredBoundaryGroups.every((group) => boundary.includes(`...${group}`)),
  appStillKeepsActualEffectRuntimeSources:
    [
      'collectiveMemoryMonitor',
      'psychedelicSpiralMonitor',
      'enterHoldPsyFxUi',
      'schwarmMonitor',
      'liveMasterMonitor',
      'updateSchwarmSource',
    ].every((needle) => app.includes(needle)),
  sourceNormalizerOwnsSourceNormalizationAndAuxArgsOnlyFlattens:
    sourceNormalizer.includes('normalizeParallelEffectsAuxPanelSource') &&
    sourceNormalizer.includes('buildAppParallelEffectsAuxPanelBoundary(input)') &&
    sourceNormalizer.includes('buildAppRecordingTakeAuxPanelBoundary(') &&
    auxArgs.includes('...normalizedInput.parallelEffects') &&
    auxArgs.includes('...normalizedInput.recordingTake') &&
    auxArgs.includes('...grooveBass') &&
    auxArgs.includes('...normalizedInput.burstDiagnostics'),
  sanitySuiteIncludesGuard:
    suite.includes('Parallel effects aux panel boundary') &&
    suite.includes('xensonar:check-app-parallel-effects-aux-panel-boundary'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-parallel-effects-aux-panel-boundary'),
  appLineCountWithinExpectedRange: appLines <= 5585,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  appLines,
  movedScope: [
    'Parallel-effects aux-panel input montage was grouped outside App.tsx',
    'Collective Memory, Psychedelic Spiral, Enter-Hold PsyFX, Schwarm, runtime monitors, and live mastering are now named input groups',
  ],
  explicitlyNotMoved: [
    'No collective memory, psychedelic spiral, enter-hold PsyFX, schwarm, live mastering, audio, scheduling, recording, package, or visible UI behavior was moved',
    'No resonance panel boundary bridge layer was changed',
    'No Root-Follow, Worklet, Granular, Materialspur, Paketstation, Partikel, Wellenstarter, Drum/Bass, or Room III behavior changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
