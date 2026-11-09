#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const runtimeSourceBuilderPath = 'src/features/xensonar/layout/appResonanceScreenRuntimeSourceBuilder.ts';
const assemblyPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeAssembly.ts';
const stageBuilderPath = 'src/features/xensonar/layout/appResonanceScreenStageSourceBuilder.ts';
const soundPaletteBuilderPath = 'src/features/xensonar/layout/appResonanceScreenSoundPaletteSourceBuilder.ts';
const auxArgsPath = 'src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgs.ts';
const panelArgsPath = 'src/features/xensonar/layout/appResonanceScreenPanelRuntimeArgs.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const runtimeSourceBuilder = exists(runtimeSourceBuilderPath) ? read(runtimeSourceBuilderPath) : '';
const assembly = exists(assemblyPath) ? read(assemblyPath) : '';
const stageBuilder = exists(stageBuilderPath) ? read(stageBuilderPath) : '';
const soundPaletteBuilder = exists(soundPaletteBuilderPath) ? read(soundPaletteBuilderPath) : '';
const auxArgs = exists(auxArgsPath) ? read(auxArgsPath) : '';
const panelArgs = exists(panelArgsPath) ? read(panelArgsPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const appLines = app.split(/\r?\n/).length;
const blockBetween = (source, startNeedle, endNeedle) => {
  const start = source.indexOf(startNeedle);
  if (start < 0) return '';
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  return end > start ? source.slice(start, end) : '';
};
const auxSourceStart = app.indexOf('const resonanceAuxPanelSource = {');
const actionSourceStart = app.indexOf('const resonanceSoundPaletteActionSource = {');
const assemblyCallStart = app.indexOf('const resonanceScreenRuntime = useAppResonanceScreenRuntimeAssembly({');
const directRuntimeSourceStart = app.indexOf('const resonanceScreenRuntimeSource = buildAppResonanceScreenRuntimeSource({');
const roomScenesStart = app.indexOf('\n  const appRoomScenes = useAppRoomSceneRuntimeBoundary({');
const auxSourceBlock = blockBetween(app, 'const resonanceAuxPanelSource = {', '\n\n  const resonanceSoundPaletteActionSource = {');
const actionSourceBlock = blockBetween(app, 'const resonanceSoundPaletteActionSource = {', assemblyCallStart >= 0 ? '\n\n  const resonanceScreenRuntime = useAppResonanceScreenRuntimeAssembly({' : '\n\n  const resonanceScreenRuntimeSource = buildAppResonanceScreenRuntimeSource({');
const assemblyCallBlock = assemblyCallStart >= 0 && roomScenesStart > assemblyCallStart ? app.slice(assemblyCallStart, roomScenesStart) : '';
const runtimeSourceBlock = directRuntimeSourceStart >= 0
  ? blockBetween(app, 'const resonanceScreenRuntimeSource = buildAppResonanceScreenRuntimeSource({', '\n\n  const resonanceScreenRuntime = useAppResonanceScreenRuntimeBoundary(resonanceScreenRuntimeSource);')
  : assembly;

const forbiddenBehaviorTokens = [
  'ensureAudioReady(', 'prewarmAudioRuntime(', 'resetResonanceTransientState(',
  'commitResonanceCursorY(', 'toggleManualGridStepMute(', 'setManualGridStepOffset(',
  'setPlayfieldCursorInside(', 'spawnNexusRipple(', 'previewWavePresetSelection(',
  'startMetaPresetRoulette(', 'randomizeMetaPresetForSession(', 'applyMetaPreset(',
  'requestAnimationFrame(', 'setInterval(', 'setTimeout(', 'new AudioContext(',
  'MediaRecorder', 'localStorage.', '.current =', '.current=',
];

const usingAssembly = assemblyCallStart >= 0;

const checks = {
  expectedFilesExist: [
    appPath, runtimeSourceBuilderPath, assemblyPath, stageBuilderPath, soundPaletteBuilderPath,
    auxArgsPath, panelArgsPath, pkgPath, suitePath, suiteContractPath,
  ].every(exists),
  packageVersionAtLeast154: /^3\.2\.91\.6\.9\.(15[4-9]|1[6-9][0-9]|[2-9][0-9]{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-screen-runtime-source-named-inputs'] ===
    'node tools/check-app-resonance-screen-runtime-source-named-inputs.mjs',
  sourceTreppeOrderIsExplicit:
    auxSourceStart >= 0 && actionSourceStart > auxSourceStart &&
    ((usingAssembly && assemblyCallStart > actionSourceStart) || (!usingAssembly && directRuntimeSourceStart > actionSourceStart)),
  auxPanelSourceLiftedOutOfFinalRuntimeCallsite:
    auxSourceBlock.includes('parallelEffects: {') &&
    auxSourceBlock.includes('resonanceFxUiState') &&
    auxSourceBlock.includes('sharedFormatters: { formatHzCompact }') &&
    auxSourceBlock.includes('schwarmMaterialOptions: SCHWARM_MATERIAL_OPTIONS') &&
    auxSourceBlock.includes('liveMastering: liveMasteringCallsiteBoundary') &&
    auxSourceBlock.includes('grooveBass: materialTrackPanelProps') &&
    auxSourceBlock.includes('recordingTake: recordingRuntime.recordingTake') &&
    auxSourceBlock.includes('burstDiagnostics: burstDiagnosticsPanelProps') &&
    (assemblyCallBlock.includes('auxPanels: resonanceAuxPanelSource') || runtimeSourceBlock.includes('auxPanels: resonanceAuxPanelSource')),
  soundPaletteActionSourceLiftedOutOfFinalRuntimeCallsite:
    actionSourceBlock.includes('setSelectedWaveOvertonePreset,') &&
    actionSourceBlock.includes('randomizeMetaPresetForSession,') &&
    actionSourceBlock.includes('applyMetaPreset,') &&
    (assemblyCallBlock.includes('soundPaletteActions: resonanceSoundPaletteActionSource') || runtimeSourceBlock.includes('soundPaletteActions: resonanceSoundPaletteActionSource')),
  finalRuntimeAssemblyUsesNamedMajorSources:
    usingAssembly
      ? assemblyCallBlock.includes('chrome: appResonanceChromeRuntimeArgs') &&
        assemblyCallBlock.includes('auxPanels: resonanceAuxPanelSource') &&
        assemblyCallBlock.includes('soundPaletteActions: resonanceSoundPaletteActionSource') &&
        assemblyCallBlock.includes('corePanels: {') &&
        assemblyCallBlock.includes('resonanceControl: resonanceControlRuntimeProps') &&
        assemblyCallBlock.includes('particleSystem: particleSystemRuntimeProps')
      : runtimeSourceBlock.includes('chrome: appResonanceChromeRuntimeArgs') &&
        runtimeSourceBlock.includes('auxPanels: resonanceAuxPanelSource') &&
        runtimeSourceBlock.includes('soundPaletteActions: resonanceSoundPaletteActionSource') &&
        runtimeSourceBlock.includes('corePanels: {') &&
        runtimeSourceBlock.includes('stage: resonanceStageSource') &&
        runtimeSourceBlock.includes('resonanceControl: resonanceControlRuntimeProps') &&
        runtimeSourceBlock.includes('particleSystem: particleSystemRuntimeProps') &&
        runtimeSourceBlock.includes('soundPalette: resonanceSoundPaletteSource'),
  dedicatedSourceBuildersStillOwnOnlyFlattening:
    stageBuilder.includes('builderOwnsStageSourceFlattening: true') &&
    soundPaletteBuilder.includes('builderOwnsSoundPaletteSourceFlattening: true') &&
    runtimeSourceBuilder.includes('builderOwnsScreenRuntimeSourceTopologyOrdering: true') &&
    auxArgs.includes('normalizeAppResonanceAuxPanelSources(input)') &&
    panelArgs.includes('buildAppResonanceScreenPanelRuntimeArgs'),
  noBoundaryOrRuntimeOwnershipMovedIntoRuntimeSourceBuilderOrAssembly:
    forbiddenBehaviorTokens.every((needle) => !runtimeSourceBuilder.includes(needle)) &&
    forbiddenBehaviorTokens.every((needle) => !assembly.includes(needle)) &&
    runtimeSourceBuilder.includes('builderOwnsRuntime: false') &&
    runtimeSourceBuilder.includes('builderOwnsStageRuntime: false') &&
    runtimeSourceBuilder.includes('builderOwnsSoundPaletteRuntime: false') &&
    assembly.includes('assemblyOwnsRuntime: false') &&
    assembly.includes('assemblyOwnsStageRuntime: false') &&
    assembly.includes('assemblyOwnsSoundPaletteRuntime: false'),
  appStillDoesNotImportAuxPanelBoundaryBuilders:
    !app.includes('import { buildAppParallelEffectsAuxPanelBoundary }') &&
    !app.includes('import { buildAppRecordingTakeAuxPanelBoundary }') &&
    !app.includes('buildAppParallelEffectsAuxPanelBoundary({') &&
    !app.includes('buildAppRecordingTakeAuxPanelBoundary(recordingRuntime.recordingTake)'),
  noNewGenericRuntimeBridgeOrIndexCreated:
    !exists('src/features/xensonar/layout/appResonanceScreenRuntimeBridge.ts') &&
    !exists('src/features/xensonar/layout/appResonanceScreenBridge.ts') &&
    !exists('src/features/xensonar/layout/appResonanceScreenRuntimeArgsIndex.ts'),
  sanitySuiteIncludesGuard:
    suite.includes('Resonance screen runtime-source named inputs') &&
    suite.includes('xensonar:check-app-resonance-screen-runtime-source-named-inputs'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-resonance-screen-runtime-source-named-inputs'),
  lineCountEnvelope: appLines <= 5535,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  acceptedCallsiteShape: usingAssembly ? 'assembly-hook' : 'direct-runtime-source',
  sourceOrder: usingAssembly
    ? ['resonanceAuxPanelSource', 'resonanceSoundPaletteActionSource', 'useAppResonanceScreenRuntimeAssembly']
    : ['resonanceAuxPanelSource', 'resonanceSoundPaletteActionSource', 'resonanceScreenRuntimeSource'],
  movedScope: [
    'AuxPanels and soundPaletteActions remain named App.tsx source constants.',
    'The final runtime-source callsite may be direct or, in 6.9.155+, delegated to useAppResonanceScreenRuntimeAssembly.',
  ],
  explicitlyNotMoved: [
    'Stage handler/audio-readiness/grid-cursor/root-follow-gate behavior',
    'SoundPalette preview/roulette/wave/overtone action bodies',
    'AuxPanel normalization/flattening',
    'Panel runtime args flattening and static catalog/action adapter rehydration',
    'Screen runtime entry composition',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
