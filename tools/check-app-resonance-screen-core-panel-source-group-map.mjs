#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const assemblyPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeAssembly.ts';
const boundaryPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeBoundary.ts';
const panelArgsPath = 'src/features/xensonar/layout/appResonanceScreenPanelRuntimeArgs.ts';
const stageBuilderPath = 'src/features/xensonar/layout/appResonanceScreenStageSourceBuilder.ts';
const soundPaletteBuilderPath = 'src/features/xensonar/layout/appResonanceScreenSoundPaletteSourceBuilder.ts';
const shapeAuditPath = 'validation/contracts/xensonar/layout/appResonanceScreenRuntimeArgsShapeAudit.ts';
const dependencyAuditPath = 'validation/contracts/xensonar/layout/appResonanceScreenRuntimeArgsDependencyAudit.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const assembly = exists(assemblyPath) ? read(assemblyPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const panelArgs = exists(panelArgsPath) ? read(panelArgsPath) : '';
const stageBuilder = exists(stageBuilderPath) ? read(stageBuilderPath) : '';
const soundPaletteBuilder = exists(soundPaletteBuilderPath) ? read(soundPaletteBuilderPath) : '';
const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const dependencyAudit = exists(dependencyAuditPath) ? read(dependencyAuditPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;
const boundaryLines = boundary.split(/\r?\n/).length;
const panelArgsLines = panelArgs.split(/\r?\n/).length;

const screenCallStart = app.indexOf('const resonanceScreenRuntimeSource = buildAppResonanceScreenRuntimeSource({');
const screenCallEnd = screenCallStart >= 0 ? app.indexOf('\n  const resonanceScreenRuntime = useAppResonanceScreenRuntimeBoundary(resonanceScreenRuntimeSource);', screenCallStart) : -1;
const screenCall = screenCallStart >= 0 && screenCallEnd > screenCallStart ? app.slice(screenCallStart, screenCallEnd) : '';
const resonancePanelsStart = screenCall.indexOf('corePanels: {');
const resonancePanelsBlock = resonancePanelsStart >= 0 ? screenCall.slice(resonancePanelsStart) : '';
const stageStart = resonancePanelsBlock.indexOf('stage: resonanceStageSource');
const resonanceControlStart = resonancePanelsBlock.indexOf('resonanceControl: resonanceControlRuntimeProps');
const particleSystemStart = resonancePanelsBlock.indexOf('particleSystem: particleSystemRuntimeProps');
const soundPaletteStart = resonancePanelsBlock.indexOf('soundPalette: resonanceSoundPaletteSource');
const stageSourceStart = app.indexOf('const resonanceStageSource = buildAppResonanceScreenStageSource({');
const soundPaletteSourceStart = app.indexOf('const resonanceSoundPaletteSource = buildAppResonanceScreenSoundPaletteSource({');
const runtimeSourceStart = app.indexOf('const resonanceScreenRuntimeSource = buildAppResonanceScreenRuntimeSource({');
const stageBlock = stageSourceStart >= 0 && soundPaletteSourceStart > stageSourceStart
  ? app.slice(stageSourceStart, soundPaletteSourceStart)
  : '';
const soundPaletteBlock = soundPaletteSourceStart >= 0 && runtimeSourceStart > soundPaletteSourceStart ? app.slice(soundPaletteSourceStart, runtimeSourceStart) : '';
const assemblyCallStart = app.indexOf('const resonanceScreenRuntime = useAppResonanceScreenRuntimeAssembly({');
const roomScenesStart = app.indexOf('\n  const appRoomScenes = useAppRoomSceneRuntimeBoundary({');
const assemblyCallBlock = assemblyCallStart >= 0 && roomScenesStart > assemblyCallStart ? app.slice(assemblyCallStart, roomScenesStart) : '';
const groupedStageInputBlock = stageBlock || assemblyCallBlock;
const groupedSoundPaletteInputBlock = soundPaletteBlock || assemblyCallBlock;

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

const stageGroupNeedles = [
  'activity: {',
  'nexusActive,',
  'resonanceInputIndicator,',
  'setNexusActive,',
  'canvas: {',
  'nexusCanvasRef,',
  'gameWidth: GAME_WIDTH,',
  'gameHeight: GAME_HEIGHT,',
  'spawnNexusRipple,',
  'audioReadiness: {',
  'ensureAudioReady,',
  'prewarmAudioRuntime,',
  'resetResonanceTransientState,',
  'audioCtx,',
  'gridCursor: {',
  'updateNParams,',
  'nexusParamsRef,',
  'updateFocusCursor,',
  'activeGridDragStepRef,',
  'activeGridDragStartYRef,',
  'activeGridDragBaseOffsetRef,',
  'activeGridDragMovedRef,',
  'getVisibleGridLines,',
  'yFromFreq,',
  'setManualGridStepOffset,',
  'commitResonanceCursorY,',
  'toggleManualGridStepMute,',
  'installationGate: {',
  'installationSharedFieldActive,',
  'installationSharedFieldController,',
  'nexusRefs,',
  'setPlayfieldCursorInside: setRootFollowPlayfieldInsideGate,',
];

const soundPaletteNeedles = [
  'presetMenus: {',
  'waveSoundPresets: waveStarterSoundMenuOptions,',
  'metaMandala: {',
  'mandalaPresetColors,',
  'mandalaRandomizingPresetId: metaPresetRouletteState.mandalaRandomizingPresetId,',
  'rouletteIsSpinning: metaPresetRouletteState.rouletteIsSpinning,',
  'highlightedMandalaPresetId,',
  'activeMetaPreset,',
  'activeMetaPresetId,',
  'sessionMetaOverrides,',
  'waveControls: {',
  'waveSoundPreset,',
  'waveSoundEnabled,',
  'setWaveSoundEnabled,',
  'waveSoundVolume,',
  'setWaveSoundVolume,',
  'overtoneControls: {',
  'activeOvertoneMixer,',
  'setActiveOvertoneMixer,',
  'selectedWaveOvertonePreset,',
  'setDronePreset,',
  'setWaveSoundPreset,',
  'previewWavePresetSelection,',
  'applyWaveOvertonePreset,',
  'setWaveOvertone,',
  'setDroneOvertone,',
  'startMetaPresetRoulette,',
  'hexToRgba,',
];

const checks = {
  expectedFilesExist: [appPath, assemblyPath, boundaryPath, panelArgsPath, stageBuilderPath, soundPaletteBuilderPath, shapeAuditPath, dependencyAuditPath, pkgPath, suitePath, suiteContractPath].every(exists),
  packageVersionIs146OrLater: /^3\.2\.91\.6\.9\.(14[6-9]|1[5-9][0-9]|[2-9][0-9]{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-screen-core-panel-source-group-map'] ===
    'node tools/check-app-resonance-screen-core-panel-source-group-map.mjs',
  appStillUsesScreenRuntimeBoundary: app.includes('const resonanceScreenRuntime = useAppResonanceScreenRuntimeBoundary(resonanceScreenRuntimeSource);') || app.includes('const resonanceScreenRuntime = useAppResonanceScreenRuntimeAssembly({'),
  appResonancePanelsAreGrouped:
    (
      resonancePanelsBlock.includes('stage: resonanceStageSource') &&
      resonancePanelsBlock.includes('resonanceControl: resonanceControlRuntimeProps,') &&
      resonancePanelsBlock.includes('particleSystem: particleSystemRuntimeProps,') &&
      resonancePanelsBlock.includes('soundPalette: resonanceSoundPaletteSource') &&
      stageStart < resonanceControlStart &&
      resonanceControlStart < particleSystemStart &&
      particleSystemStart < soundPaletteStart
    ) || (
      assemblyCallBlock.includes('stage: {') &&
      assemblyCallBlock.includes('soundPalette: {') &&
      assemblyCallBlock.includes('corePanels: {') &&
      assemblyCallBlock.includes('resonanceControl: resonanceControlRuntimeProps') &&
      assemblyCallBlock.includes('particleSystem: particleSystemRuntimeProps')
    ),
  appStageSourceUsesDedicatedBuilderAndExpectedStageGroups:
    (app.includes('buildAppResonanceScreenStageSource') || assembly.includes('buildAppResonanceScreenStageSource(stage)')) &&
    stageGroupNeedles.every((needle) => groupedStageInputBlock.includes(needle)),
  appSoundPaletteSourceContainsExpectedDynamicBindings: soundPaletteNeedles.every((needle) => groupedSoundPaletteInputBlock.includes(needle)),
  appNoLongerSpreadsCorePanelPropsFlatInResonancePanels:
    !resonancePanelsBlock.includes('...resonanceControlRuntimeProps') &&
    !resonancePanelsBlock.includes('...particleSystemRuntimeProps'),
  boundaryDeclaresSourceGroupTypes: [
    'AppResonanceScreenStageSourceKey',
    'AppResonanceScreenDynamicSoundPaletteSourceKey',
    'AppResonanceScreenStageSourceArgs',
    'AppResonanceScreenDynamicSoundPaletteSourceArgs',
    'AppResonanceScreenCorePanelSourceArgs',
    'readonly stage: AppResonanceScreenStageSourceArgs',
    'readonly resonanceControl: ResonanceControlRuntimeProps',
    'readonly particleSystem: ParticleSystemRuntimeProps',
    'readonly soundPalette: AppResonanceScreenDynamicSoundPaletteSourceArgs',
  ].every((needle) => panelArgs.includes(needle)),
  boundaryDeclaresSourceGroupMap: [
    'APP_RESONANCE_SCREEN_CORE_PANEL_SOURCE_GROUP_MAP',
    "cleanupKind: 'app-resonance-screen-core-panel-source-group-map'",
    'appOwnsCorePanelSourceGrouping: true',
    'boundaryOwnsCorePanelFlattening: true',
    "'stage'",
    "'resonanceControl'",
    "'particleSystem'",
    "'soundPalette'",
  ].every((needle) => panelArgs.includes(needle)),
  boundaryBuildsCorePanelArgsFromGroups: [
    'export function buildAppResonanceScreenCorePanelArgs({',
    'stage,',
    'resonanceControl,',
    'particleSystem,',
    'soundPalette,',
    '...stage,',
    '...resonanceControl,',
    '...particleSystem,',
    '...soundPalette,',
    'const corePanelArgs = buildAppResonanceScreenCorePanelArgs(corePanelSource);',
    '...corePanelArgs,',
  ].every((needle) => panelArgs.includes(needle)),
  stageSourceBuilderIsThinAndSeparate:
    stageBuilder.includes('APP_RESONANCE_SCREEN_STAGE_SOURCE_BUILDER_PROBE') &&
    stageBuilder.includes('export function buildAppResonanceScreenStageSource({') &&
    ['...activity,', '...canvas,', '...audioReadiness,', '...gridCursor,', '...installationGate,'].every((needle) => stageBuilder.includes(needle)),
  soundPaletteSourceBuilderIsThinAndSeparate:
    soundPaletteBuilder.includes('APP_RESONANCE_SCREEN_SOUND_PALETTE_SOURCE_BUILDER_PROBE') &&
    soundPaletteBuilder.includes('export function buildAppResonanceScreenSoundPaletteSource({') &&
    ['...presetMenus,', '...metaMandala,', '...waveControls,', '...overtoneControls,'].every((needle) => soundPaletteBuilder.includes(needle)),
  boundaryContractNamesGroupedInput:
    boundary.includes("'AppResonanceScreenCorePanelSourceArgs'") &&
    boundary.includes("inputContract: 'AppResonanceScreenCorePanelSourceArgs'") &&
    boundary.includes("outputContract: 'AppResonanceScreenCorePanelArgs'") &&
    boundary.includes("composer: 'buildAppResonanceScreenCorePanelArgs'"),
  boundaryDoesNotMoveRuntimeOrScheduling: forbiddenRuntimeMoves.every((needle) => !boundary.includes(needle) && !panelArgs.includes(needle) && !stageBuilder.includes(needle) && !soundPaletteBuilder.includes(needle)),
  shapeAuditMapsSourceGroups:
    shapeAudit.includes("'corePanelSourceGroups'") &&
    shapeAudit.includes("'stageSourceBuilder'") &&
    shapeAudit.includes("'soundPaletteSourceBuilder'") &&
    shapeAudit.includes("'resonanceControl'") &&
    shapeAudit.includes("'particleSystem'") &&
    shapeAudit.includes("'AppResonanceScreenCorePanelSourceArgs'") &&
    ['stageActivity', 'stageCanvas', 'stageAudioReadiness', 'stageGridCursor', 'stageInstallationGate'].every((group) => shapeAudit.includes(`'${group}'`)),
  dependencyAuditAllowsTypeOnlyCoreSourceImportsAndStageBuilder:
    dependencyAudit.includes("'../rooms/buildParticleSystemProps'") &&
    dependencyAudit.includes("'../rooms/buildResonanceControlProps'") &&
    dependencyAudit.includes('panelRuntimeArgs') &&
    dependencyAudit.includes('core panel source flattening') &&
    dependencyAudit.includes('stageSourceBuilder') &&
    dependencyAudit.includes('stage-source-builder-probe') &&
    dependencyAudit.includes('soundPaletteSourceBuilder') &&
    dependencyAudit.includes('sound-palette-source-builder-probe'),
  sanitySuiteIncludesGuard: suite.includes('xensonar:check-app-resonance-screen-core-panel-source-group-map'),
  sanitySuiteContractIncludesGuard: suiteContract.includes('xensonar:check-app-resonance-screen-core-panel-source-group-map'),
  lineCountEnvelope: appLines <= 5535 && boundaryLines <= 240 && panelArgsLines <= 320,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines,
  panelArgsLines,
  sourceGroups: ['stage', 'resonanceControl', 'particleSystem', 'soundPalette'],
  movedScope: [
    'The resonancePanels callsite remains mapped into named core-panel source groups.',
    'The stage group now uses buildAppResonanceScreenStageSource as a thin source-group flattener.',
    'The patch maps the seam for a later larger Resonance Screen Runtime Assembly cut without moving runtime ownership.',
  ],
  explicitlyNotMoved: [
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
