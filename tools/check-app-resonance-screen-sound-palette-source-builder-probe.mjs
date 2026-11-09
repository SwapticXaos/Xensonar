#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const assemblyPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeAssembly.ts';
const builderPath = 'src/features/xensonar/layout/appResonanceScreenSoundPaletteSourceBuilder.ts';
const panelArgsPath = 'src/features/xensonar/layout/appResonanceScreenPanelRuntimeArgs.ts';
const panelArgsTypesPath = 'src/features/xensonar/layout/appResonanceScreenPanelRuntimeArgsTypes.ts';
const shapeAuditPath = 'validation/contracts/xensonar/layout/appResonanceScreenRuntimeArgsShapeAudit.ts';
const dependencyAuditPath = 'validation/contracts/xensonar/layout/appResonanceScreenRuntimeArgsDependencyAudit.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const assembly = exists(assemblyPath) ? read(assemblyPath) : '';
const builder = exists(builderPath) ? read(builderPath) : '';
const panelArgs = exists(panelArgsPath) ? read(panelArgsPath) : '';
const panelArgsTypes = exists(panelArgsTypesPath) ? read(panelArgsTypesPath) : '';
const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const dependencyAudit = exists(dependencyAuditPath) ? read(dependencyAuditPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const appLines = app.split(/\r?\n/).length;
const builderLines = builder.split(/\r?\n/).length;

const appCallStart = app.indexOf('const resonanceScreenRuntime = useAppResonanceScreenRuntimeAssembly({');
const appRoomScenesStart = app.indexOf('\n  const appRoomScenes = useAppRoomSceneRuntimeBoundary({');
const assemblyCallBlock = appCallStart >= 0 && appRoomScenesStart > appCallStart ? app.slice(appCallStart, appRoomScenesStart) : '';
const directSoundPaletteStart = app.indexOf('const resonanceSoundPaletteSource = buildAppResonanceScreenSoundPaletteSource({');
const directSoundPaletteEnd = directSoundPaletteStart >= 0 ? app.indexOf('\n  const resonanceAuxPanelSource = {', directSoundPaletteStart) : -1;
const directSoundPaletteBlock = directSoundPaletteStart >= 0 && directSoundPaletteEnd > directSoundPaletteStart ? app.slice(directSoundPaletteStart, directSoundPaletteEnd) : '';
const soundPaletteBlock = assemblyCallBlock.includes('soundPalette: {') ? assemblyCallBlock : directSoundPaletteBlock;

const groups = {
  presetMenus: ['waveSoundPresets: waveStarterSoundMenuOptions'],
  metaMandala: [
    'mandalaPresetColors',
    'mandalaRandomizingPresetId: metaPresetRouletteState.mandalaRandomizingPresetId',
    'rouletteIsSpinning: metaPresetRouletteState.rouletteIsSpinning',
    'highlightedMandalaPresetId',
    'activeMetaPreset',
    'activeMetaPresetId',
    'sessionMetaOverrides',
    'startMetaPresetRoulette',
    'hexToRgba',
  ],
  waveControls: [
    'waveSoundPreset',
    'waveSoundEnabled',
    'setWaveSoundEnabled',
    'waveSoundVolume',
    'setWaveSoundVolume',
    'setDronePreset',
    'setWaveSoundPreset',
    'previewWavePresetSelection',
  ],
  overtoneControls: [
    'activeOvertoneMixer',
    'setActiveOvertoneMixer',
    'selectedWaveOvertonePreset',
    'applyWaveOvertonePreset',
    'setWaveOvertone',
    'setDroneOvertone',
  ],
};

const blockForGroup = (group) => {
  const start = soundPaletteBlock.indexOf(`${group}: {`);
  if (start < 0) return '';
  const otherStarts = Object.keys(groups)
    .filter((other) => other !== group)
    .map((other) => soundPaletteBlock.indexOf(`${other}: {`, start + 1))
    .filter((idx) => idx > start);
  const end = otherStarts.length ? Math.min(...otherStarts) : soundPaletteBlock.length;
  return soundPaletteBlock.slice(start, end);
};

const forbiddenRuntimeTokens = [
  'createOscillator(', 'createGain(', '.connect(', '.start(', 'safeApplyAttack(',
  'safeApplyExponentialRelease(', 'requestAnimationFrame(', 'setInterval(', 'setTimeout(',
  'new AudioContext(', 'ensureAudioReady(', 'prewarmAudioRuntime(',
  'resetResonanceTransientState(', 'playWaveStartSound(', 'emitWaveStartSound(',
  'runParticleNexusToneOrchestrator(', 'startQuantizedCollisionRuntime(',
  'scheduleBassClipStep(', 'scheduleClassicBassPatternStep(', 'scheduleExportedDrumConfigStep(',
  'randomizeMetaPresetForSession(', 'applyMetaPreset(', 'startMetaPresetRoulette(',
  'previewWavePresetSelection(', 'applyWaveOvertonePreset(', 'setWaveOvertone(',
  'setDroneOvertone(', '.current =', '.current=', 'localStorage.', 'MediaRecorder',
];

const checks = {
  expectedFilesExist: [appPath, assemblyPath, builderPath, panelArgsPath, shapeAuditPath, dependencyAuditPath, pkgPath, suitePath, suiteContractPath].every(exists),
  packageVersionAtLeast152: /^3\.2\.91\.6\.9\.(15[2-9]|1[6-9][0-9]|[2-9][0-9]{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-screen-sound-palette-source-builder-probe'] ===
    'node tools/check-app-resonance-screen-sound-palette-source-builder-probe.mjs',
  builderIsUsedDirectlyOrViaAssembly:
    (app.includes('appResonanceScreenSoundPaletteSourceBuilder') && directSoundPaletteBlock.includes('buildAppResonanceScreenSoundPaletteSource({')) ||
    (assembly.includes('appResonanceScreenSoundPaletteSourceBuilder') && assembly.includes('buildAppResonanceScreenSoundPaletteSource(soundPalette)')),
  appSoundPaletteGroupsAreExplicitAndComplete: Object.entries(groups).every(([group, keys]) => {
    const block = blockForGroup(group);
    return block.includes(`${group}: {`) && keys.every((key) => block.includes(key));
  }),
  appSoundPaletteGroupsRemainInExpectedOrder:
    ['presetMenus', 'metaMandala', 'waveControls', 'overtoneControls'].every((group) => soundPaletteBlock.includes(`${group}: {`)) &&
    soundPaletteBlock.indexOf('presetMenus: {') < soundPaletteBlock.indexOf('metaMandala: {') &&
    soundPaletteBlock.indexOf('metaMandala: {') < soundPaletteBlock.indexOf('waveControls: {') &&
    soundPaletteBlock.indexOf('waveControls: {') < soundPaletteBlock.indexOf('overtoneControls: {'),
  builderDeclaresOnlySourceGroupTypesAndFlattening: [
    'BuildAppResonanceScreenSoundPaletteSourceInput',
    'AppResonanceScreenSoundPalettePresetMenuSourceArgs',
    'AppResonanceScreenSoundPaletteMetaMandalaSourceArgs',
    'AppResonanceScreenSoundPaletteWaveControlSourceArgs',
    'AppResonanceScreenSoundPaletteOvertoneControlSourceArgs',
    'APP_RESONANCE_SCREEN_SOUND_PALETTE_SOURCE_BUILDER_PROBE',
    'export function buildAppResonanceScreenSoundPaletteSource({',
    '...presetMenus,', '...metaMandala,', '...waveControls,', '...overtoneControls,',
    'satisfies AppResonanceScreenDynamicSoundPaletteSourceArgs',
  ].every((needle) => builder.includes(needle)),
  builderImportsOnlyDynamicSoundPaletteSourceType:
    builder.includes("import type { AppResonanceScreenDynamicSoundPaletteSourceArgs } from './appResonanceScreenPanelRuntimeArgsTypes';") &&
    !builder.includes("from '../") &&
    !builder.includes('React'),
  builderDoesNotExecuteRuntimeOrMutateRefs: forbiddenRuntimeTokens.every((needle) => !builder.includes(needle)),
  panelArgsStillExposesFlatSoundPaletteOutputContract:
    panelArgsTypes.includes('export type AppResonanceScreenDynamicSoundPaletteSourceArgs = Pick<') &&
    panelArgsTypes.includes('readonly soundPalette: AppResonanceScreenDynamicSoundPaletteSourceArgs'),
  shapeAuditKnowsSoundPaletteBuilderGroup:
    shapeAudit.includes("'soundPaletteSourceBuilder'") &&
    shapeAudit.includes('sound-palette source builder owns only group flattening'),
  dependencyAuditKnowsSoundPaletteBuilderAndNoOwnership:
    dependencyAudit.includes('soundPaletteSourceBuilder') &&
    dependencyAudit.includes("importKind: 'sound-palette-source-builder-probe'") &&
    dependencyAudit.includes('appResonanceScreenSoundPaletteSourceBuilder.ts') &&
    dependencyAudit.includes('no SoundPalette preview/audio body ownership') &&
    dependencyAudit.includes('no Meta-preset roulette/randomizer body ownership'),
  oldFlatSoundPaletteObjectNoLongerInScreenCall:
    !app.includes('soundPalette: {\n        waveSoundPresets: waveStarterSoundMenuOptions,'),
  sanitySuiteIncludesGuard:
    suite.includes('Resonance screen sound-palette source builder probe') &&
    suite.includes('xensonar:check-app-resonance-screen-sound-palette-source-builder-probe'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-resonance-screen-sound-palette-source-builder-probe'),
  lineCountEnvelope: appLines <= 5535 && builderLines <= 120,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  builderLines,
  acceptedCallsiteShape: assemblyCallBlock ? 'assembly-hook' : 'direct-sound-palette-source',
  soundPaletteGroups: Object.keys(groups),
  movedScope: [
    'buildAppResonanceScreenSoundPaletteSource remains a thin dynamic SoundPalette source-group flattener.',
    'In 6.9.155+ it may be called through useAppResonanceScreenRuntimeAssembly rather than directly in App.tsx.',
    'Preview, roulette, Wellenstarter and overtone action bodies remain outside the builder.',
  ],
  explicitlyNotMoved: [
    'WaveStarter/Wellenstarter audio preview bodies',
    'Meta-preset roulette/randomizer bodies',
    'Drone/wave/overtone action bodies',
    'static SoundPalette catalogs',
    'string-facing SoundPalette action adapters',
    'Stage, ResonanceControl, ParticleSystem, AuxPanel, Package, Room III, AudioWorklet runtime',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
