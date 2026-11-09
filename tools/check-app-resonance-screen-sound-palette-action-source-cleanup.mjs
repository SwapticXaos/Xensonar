#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeBoundary.ts';
const panelArgsPath = 'src/features/xensonar/layout/appResonanceScreenPanelRuntimeArgs.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const panelArgs = exists(panelArgsPath) ? read(panelArgsPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

const screenCallStart = app.indexOf('const resonanceScreenRuntime = useAppResonanceScreenRuntimeBoundary({');
const screenCallEnd = screenCallStart >= 0 ? app.indexOf('\n  const appRoomScenes = useAppRoomSceneRuntimeBoundary({', screenCallStart) : -1;
const screenCall = screenCallStart >= 0 && screenCallEnd > screenCallStart ? app.slice(screenCallStart, screenCallEnd) : '';
const resonancePanelsStart = screenCall.indexOf('resonancePanels: {');
const resonancePanelsBlock = resonancePanelsStart >= 0 ? screenCall.slice(resonancePanelsStart) : '';
const soundPaletteActionsStart = screenCall.indexOf('soundPaletteActions: {');
const soundPaletteActionsEnd = soundPaletteActionsStart >= 0 ? screenCall.indexOf('\n    resonancePanels: {', soundPaletteActionsStart) : -1;
const soundPaletteActionsBlock = soundPaletteActionsStart >= 0 && soundPaletteActionsEnd > soundPaletteActionsStart
  ? screenCall.slice(soundPaletteActionsStart, soundPaletteActionsEnd)
  : '';

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
  expectedFilesExist: [appPath, boundaryPath, panelArgsPath, pkgPath, suitePath, suiteContractPath].every(exists),
  packageVersionAtLeast145: /^3\.2\.91\.6\.9\.(14[5-9]|1[5-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-screen-sound-palette-action-source-cleanup'] ===
    'node tools/check-app-resonance-screen-sound-palette-action-source-cleanup.mjs',
  appStillUsesScreenRuntimeBoundary: screenCall.includes('const resonanceScreenRuntime = useAppResonanceScreenRuntimeBoundary({'),
  appPassesTypedSoundPaletteActionSource: [
    'soundPaletteActions: {',
    'setSelectedWaveOvertonePreset,',
    'randomizeMetaPresetForSession,',
    'applyMetaPreset,',
  ].every((needle) => soundPaletteActionsBlock.includes(needle)),
  appNoLongerBuildsStringActionAdaptersInline: [
    'setSelectedWaveOvertonePreset: (value: string) => setSelectedWaveOvertonePreset(value as WaveOvertoneMixPresetId)',
    'randomizeMetaPresetForSession: (presetId: string) => randomizeMetaPresetForSession(presetId as MetaPresetId)',
    'applyMetaPreset: (presetId: string) => applyMetaPreset(presetId as MetaPresetId)',
  ].every((needle) => !screenCall.includes(needle)),
  appKeepsDynamicSoundPaletteInputsInResonancePanels: [
    'particleSystem: particleSystemRuntimeProps,',
    'soundPalette: buildAppResonanceScreenSoundPaletteSource({',
    'waveSoundPresets: waveStarterSoundMenuOptions,',
    'mandalaPresetColors,',
    'activeMetaPreset,',
    'activeMetaPresetId,',
    'sessionMetaOverrides,',
    'waveSoundPreset,',
    'setWaveSoundPreset,',
    'previewWavePresetSelection,',
    'applyWaveOvertonePreset,',
    'startMetaPresetRoulette,',
  ].every((needle) => resonancePanelsBlock.includes(needle)),
  boundaryOwnsSoundPaletteActionSourceCleanup: [
    'APP_RESONANCE_SCREEN_SOUND_PALETTE_ACTION_SOURCE_CLEANUP',
    'AppResonanceScreenSoundPaletteActionAdapterKey',
    'AppResonanceScreenSoundPaletteActionSource',
    'AppResonanceScreenSoundPaletteActionArgs',
    'buildAppResonanceScreenSoundPaletteActionArgs',
    'appOwnsSoundPaletteActionAdapters: false',
    'panelArgsModuleOwnsSoundPaletteActionAdapters: true',
    'appOwnsTypedSoundPaletteActions: true',
  ].every((needle) => panelArgs.includes(needle)),
  boundaryImportsTypedIdsForAdapters: [
    'type MetaPresetId',
    'type WaveOvertoneMixPresetId',
  ].every((needle) => panelArgs.includes(needle)),
  boundaryOmitsAdaptersFromCorePanelArgs:
    panelArgs.includes('AppResonanceScreenSoundPaletteActionAdapterKey') &&
    panelArgs.includes('| AppResonanceScreenSoundPaletteActionAdapterKey'),
  boundaryBuildsStringPanelAdaptersFromTypedSource: [
    'const soundPaletteActionArgs = buildAppResonanceScreenSoundPaletteActionArgs(soundPaletteActions);',
    '...soundPaletteActionArgs,',
    'source.setSelectedWaveOvertonePreset(value as WaveOvertoneMixPresetId)',
    'source.randomizeMetaPresetForSession(presetId as MetaPresetId)',
    'source.applyMetaPreset(presetId as MetaPresetId)',
  ].every((needle) => panelArgs.includes(needle)),
  boundaryKeepsCatalogCleanup: [
    'APP_RESONANCE_SCREEN_SOUND_PALETTE_CATALOG_SOURCE_CLEANUP',
    'buildAppResonanceScreenSoundPaletteCatalogArgs',
    '...soundPaletteCatalogArgs,',
  ].every((needle) => panelArgs.includes(needle)),
  boundaryDoesNotMoveRuntimeOrScheduling: forbiddenRuntimeMoves.every((needle) => !boundary.includes(needle) && !panelArgs.includes(needle)),
  sanitySuiteIncludesGuard: suite.includes('xensonar:check-app-resonance-screen-sound-palette-action-source-cleanup'),
  sanitySuiteContractIncludesGuard: suiteContract.includes('xensonar:check-app-resonance-screen-sound-palette-action-source-cleanup'),
  appLineCountWithinExpectedEnvelope: appLines <= 5490,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  movedScope: [
    'String-facing SoundPalette action adapters are no longer assembled inline in the App.tsx resonancePanels callsite.',
    'App.tsx now passes typed SoundPalette actions as a dedicated soundPaletteActions source into the screen runtime boundary.',
    'appResonanceScreenPanelRuntimeArgs adapts those typed actions to the string-facing panel/runtime binding contract.',
  ],
  explicitlyNotMoved: [
    'WaveStarter/Particle preview implementations and audio actions',
    'Meta-preset roulette/randomizer runtime bodies',
    'Root-Follow, Materialspur, Wellenstarter, Drum/Bass, AudioWorklet, Paketstation, Room III behavior',
    'Stage/grid/tuning/resonanceControl runtime contracts',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
