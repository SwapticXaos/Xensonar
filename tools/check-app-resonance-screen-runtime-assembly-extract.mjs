#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const assemblyPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeAssembly.ts';
const runtimeSourceBuilderPath = 'src/features/xensonar/layout/appResonanceScreenRuntimeSourceBuilder.ts';
const stageBuilderPath = 'src/features/xensonar/layout/appResonanceScreenStageSourceBuilder.ts';
const soundPaletteBuilderPath = 'src/features/xensonar/layout/appResonanceScreenSoundPaletteSourceBuilder.ts';
const boundaryPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeBoundary.ts';
const auxArgsPath = 'src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgs.ts';
const panelArgsPath = 'src/features/xensonar/layout/appResonanceScreenPanelRuntimeArgs.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const assembly = exists(assemblyPath) ? read(assemblyPath) : '';
const runtimeSourceBuilder = exists(runtimeSourceBuilderPath) ? read(runtimeSourceBuilderPath) : '';
const stageBuilder = exists(stageBuilderPath) ? read(stageBuilderPath) : '';
const soundPaletteBuilder = exists(soundPaletteBuilderPath) ? read(soundPaletteBuilderPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const auxArgs = exists(auxArgsPath) ? read(auxArgsPath) : '';
const panelArgs = exists(panelArgsPath) ? read(panelArgsPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const appLines = app.split(/\r?\n/).length;
const assemblyLines = assembly.split(/\r?\n/).length;

const blockBetween = (source, startNeedle, endNeedle) => {
  const start = source.indexOf(startNeedle);
  if (start < 0) return '';
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  return end > start ? source.slice(start, end) : '';
};

const assemblyCallStart = app.indexOf('const resonanceScreenRuntime = useAppResonanceScreenRuntimeAssembly({');
const roomScenesStart = app.indexOf('\n  const appRoomSceneRuntimeSource = buildAppRoomSceneRuntimeSource({');
const assemblyCallBlock = assemblyCallStart >= 0 && roomScenesStart > assemblyCallStart
  ? app.slice(assemblyCallStart, roomScenesStart)
  : '';
const auxSourceStart = app.indexOf('const resonanceAuxPanelSource = {');
const actionSourceStart = app.indexOf('const resonanceSoundPaletteActionSource = {');

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
  'ensureAudioReady(',
  'prewarmAudioRuntime(',
  'resetResonanceTransientState(',
  'commitResonanceCursorY(',
  'toggleManualGridStepMute(',
  'setManualGridStepOffset(',
  'setPlayfieldCursorInside(',
  'spawnNexusRipple(',
  'previewWavePresetSelection(',
  'startMetaPresetRoulette(',
  'randomizeMetaPresetForSession(',
  'applyMetaPreset(',
  'startQuantizedCollisionRuntime(',
  'runParticleNexusToneOrchestrator(',
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
  'MediaRecorder',
  'localStorage.',
  '.current =',
  '.current=',
];

const checks = {
  expectedFilesExist: [
    appPath,
    assemblyPath,
    runtimeSourceBuilderPath,
    stageBuilderPath,
    soundPaletteBuilderPath,
    boundaryPath,
    auxArgsPath,
    panelArgsPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast155: /^3\.2\.91\.6\.9\.(15[5-9]|1[6-9][0-9]|[2-9][0-9]{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-screen-runtime-assembly-extract'] ===
    'node tools/check-app-resonance-screen-runtime-assembly-extract.mjs',
  appUsesAssemblyHookAndDropsInlineSourceConstants:
    app.includes('useAppResonanceScreenRuntimeAssembly') &&
    assemblyCallBlock.includes('useAppResonanceScreenRuntimeAssembly({') &&
    !app.includes('const resonanceStageSource = buildAppResonanceScreenStageSource({') &&
    !app.includes('const resonanceSoundPaletteSource = buildAppResonanceScreenSoundPaletteSource({') &&
    !app.includes('const resonanceScreenRuntimeSource = buildAppResonanceScreenRuntimeSource({') &&
    !app.includes('useAppResonanceScreenRuntimeBoundary(resonanceScreenRuntimeSource)'),
  appDoesNotImportExtractedScreenRuntimeBuilders:
    !app.includes('appResonanceScreenStageSourceBuilder') &&
    !app.includes('appResonanceScreenSoundPaletteSourceBuilder') &&
    !app.includes('appResonanceScreenRuntimeSourceBuilder') &&
    !app.includes('useAppResonanceScreenRuntimeBoundary'),
  appKeepsSensitiveInputGroupsVisibleAtCallsite:
    assemblyCallBlock.includes('stage: {') &&
    assemblyCallBlock.includes('activity: {') &&
    assemblyCallBlock.includes('canvas: {') &&
    assemblyCallBlock.includes('audioReadiness: {') &&
    assemblyCallBlock.includes('gridCursor: {') &&
    assemblyCallBlock.includes('installationGate: {') &&
    assemblyCallBlock.includes('setPlayfieldCursorInside: setRootFollowPlayfieldInsideGate') &&
    assemblyCallBlock.includes('soundPalette: {') &&
    assemblyCallBlock.includes('presetMenus: {') &&
    assemblyCallBlock.includes('metaMandala: {') &&
    assemblyCallBlock.includes('waveControls: {') &&
    assemblyCallBlock.includes('overtoneControls: {'),
  appKeepsNamedAuxAndSoundPaletteActionSources:
    auxSourceStart >= 0 &&
    actionSourceStart > auxSourceStart &&
    assemblyCallStart > actionSourceStart &&
    assemblyCallBlock.includes('auxPanels: resonanceAuxPanelSource') &&
    assemblyCallBlock.includes('soundPaletteActions: resonanceSoundPaletteActionSource'),
  appCorePanelsRemainExplicit:
    assemblyCallBlock.includes('corePanels: {') &&
    assemblyCallBlock.includes('resonanceControl: resonanceControlRuntimeProps') &&
    assemblyCallBlock.includes('particleSystem: particleSystemRuntimeProps') &&
    !assemblyCallBlock.includes('soundPalette: resonanceSoundPaletteSource') &&
    !assemblyCallBlock.includes('stage: resonanceStageSource'),
  assemblyOwnsOnlyScreenSourceAssemblyOrder:
    assembly.includes('APP_RESONANCE_SCREEN_RUNTIME_ASSEMBLY_EXTRACT') &&
    assembly.includes('assemblyOwnsSourceBuilderCallOrder: true') &&
    assembly.includes('assemblyOwnsRuntime: false') &&
    assembly.includes('assemblyMutatesAudio: false') &&
    assembly.includes('assemblyOwnsRoomLifecycle: false') &&
    assembly.includes('assemblyOwnsPackagePersistence: false') &&
    assembly.includes('assemblyOwnsStageRuntime: false') &&
    assembly.includes('assemblyOwnsSoundPaletteRuntime: false') &&
    assembly.includes('assemblyOwnsAuxPanelFlattening: false') &&
    assembly.includes('assemblyOwnsPanelRuntimeArgsFlattening: false') &&
    assembly.includes('assemblyOwnsScreenRuntimeEntryComposition: false'),
  assemblyCallsDedicatedBuildersInOrder:
    assembly.indexOf('const resonanceStageSource = buildAppResonanceScreenStageSource(stage);') >= 0 &&
    assembly.indexOf('const resonanceSoundPaletteSource = buildAppResonanceScreenSoundPaletteSource(soundPalette);') > assembly.indexOf('const resonanceStageSource = buildAppResonanceScreenStageSource(stage);') &&
    assembly.indexOf('const resonanceScreenRuntimeSource = buildAppResonanceScreenRuntimeSource({') > assembly.indexOf('const resonanceSoundPaletteSource = buildAppResonanceScreenSoundPaletteSource(soundPalette);') &&
    assembly.indexOf('return useAppResonanceScreenRuntimeBoundary(resonanceScreenRuntimeSource);') > assembly.indexOf('const resonanceScreenRuntimeSource = buildAppResonanceScreenRuntimeSource({'),
  assemblyDoesNotExecuteRuntimeOrMutateRefs: forbiddenRuntimeTokens.every((needle) => !assembly.includes(needle)),
  dedicatedLowerBuildersStillOwnTheirContracts:
    stageBuilder.includes('builderOwnsStageSourceFlattening: true') &&
    soundPaletteBuilder.includes('builderOwnsSoundPaletteSourceFlattening: true') &&
    runtimeSourceBuilder.includes('builderOwnsScreenRuntimeSourceTopologyOrdering: true') &&
    auxArgs.includes('normalizeAppResonanceAuxPanelSources(input)') &&
    panelArgs.includes('buildAppResonanceScreenPanelRuntimeArgs') &&
    boundary.includes('buildAppResonanceScreenRuntimeEntry({'),
  noNewGenericRuntimeBridgeCreated:
    !exists('src/features/xensonar/layout/appResonanceScreenRuntimeBridge.ts') &&
    !exists('src/features/xensonar/layout/appResonanceScreenBridge.ts') &&
    !exists('src/features/xensonar/layout/appResonanceScreenRuntimeArgsIndex.ts'),
  sanitySuiteIncludesGuard:
    suite.includes('Resonance screen runtime assembly extract') &&
    suite.includes('xensonar:check-app-resonance-screen-runtime-assembly-extract'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-resonance-screen-runtime-assembly-extract'),
  lineCountEnvelope: appLines <= 5535 && assemblyLines <= 140,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  assemblyLines,
  sourceOrder: [
    'resonanceAuxPanelSource',
    'resonanceSoundPaletteActionSource',
    'useAppResonanceScreenRuntimeAssembly({ stage, soundPalette, corePanels })',
  ],
  movedScope: [
    'Moved Stage/SoundPalette/runtime-source builder calls and final screen-runtime boundary call into useAppResonanceScreenRuntimeAssembly.',
    'Kept sensitive Stage and SoundPalette input groups visible at the App.tsx callsite.',
    'Kept AuxPanel normalization, panel-runtime arg flattening, and screen-runtime entry composition in their existing modules.',
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
