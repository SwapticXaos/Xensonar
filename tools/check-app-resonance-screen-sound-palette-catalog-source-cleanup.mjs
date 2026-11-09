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
const instrumentDataImportBlock = (app.match(/import \{[\s\S]*?\} from "\.\/features\/xensonar\/domain\/instrumentData";/) || [''])[0];
const resonanceUiConfigImportBlock = (app.match(/import \{[\s\S]*?\} from "\.\/features\/xensonar\/rooms\/resonanceUiConfig";/) || [''])[0];

const staticCatalogCallsiteNeedles = [
  'dronePresets: DRONE_PRESETS',
  'waveTimbreGradientPresets: WAVE_TIMBRE_GRADIENT_PRESETS',
  'waveVolumeGradientPresets: WAVE_VOLUME_GRADIENT_PRESETS',
  'waveOvertoneModes: WAVE_OVERTONE_MODES',
  'waveOvertoneArpRates: WAVE_OVERTONE_ARP_RATES',
  'waveOvertoneArpPatterns: WAVE_OVERTONE_ARP_PATTERNS',
  'droneJiOvertones: DRONE_JI_OVERTONES',
  'waveOvertoneMixPresets: WAVE_OVERTONE_MIX_PRESETS',
  'waveDecayPresets: WAVE_DECAY_PRESETS',
  'metaPresets: META_PRESETS',
  'mandalaDotPositions: MANDALA_DOT_POSITIONS',
];

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
  packageVersionIs144OrLater: /^3\.2\.91\.6\.9\.(14[4-9]|1[5-9][0-9])$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-screen-sound-palette-catalog-source-cleanup'] ===
    'node tools/check-app-resonance-screen-sound-palette-catalog-source-cleanup.mjs',
  appStillUsesScreenRuntimeBoundary: screenCall.includes('const resonanceScreenRuntime = useAppResonanceScreenRuntimeBoundary({'),
  appKeepsDynamicSoundPaletteInputsExplicit: [
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
  ].every((needle) => screenCall.includes(needle)) &&
    (
      screenCall.includes('randomizeMetaPresetForSession: (presetId: string) => randomizeMetaPresetForSession(presetId as MetaPresetId),') ||
      screenCall.includes('soundPaletteActions: {')
    ) &&
    (
      screenCall.includes('applyMetaPreset: (presetId: string) => applyMetaPreset(presetId as MetaPresetId),') ||
      screenCall.includes('soundPaletteActions: {')
    ),
  appNoLongerPassesStaticSoundPaletteCatalogs: staticCatalogCallsiteNeedles.every((needle) => !screenCall.includes(needle)),
  appNoLongerImportsPureScreenCatalogConstants:
    !instrumentDataImportBlock.includes('DRONE_PRESETS,') &&
    !instrumentDataImportBlock.includes('WAVE_DECAY_PRESETS,') &&
    !instrumentDataImportBlock.includes('WAVE_TIMBRE_GRADIENT_PRESETS,') &&
    !instrumentDataImportBlock.includes('WAVE_VOLUME_GRADIENT_PRESETS,') &&
    !resonanceUiConfigImportBlock.includes('MANDALA_DOT_POSITIONS,') &&
    !resonanceUiConfigImportBlock.includes('WAVE_OVERTONE_ARP_PATTERNS,') &&
    !resonanceUiConfigImportBlock.includes('WAVE_OVERTONE_ARP_RATES,') &&
    !resonanceUiConfigImportBlock.includes('WAVE_OVERTONE_MODES,'),
  appKeepsSharedCatalogConstantsUsedOutsideScreenCall:
    instrumentDataImportBlock.includes('DRONE_JI_OVERTONES,') &&
    resonanceUiConfigImportBlock.includes('WAVE_OVERTONE_MIX_PRESETS,'),
  boundaryOwnsSoundPaletteCatalogSourceCleanup: [
    'APP_RESONANCE_SCREEN_SOUND_PALETTE_CATALOG_SOURCE_CLEANUP',
    'AppResonanceScreenSoundPaletteCatalogKey',
    'AppResonanceScreenSoundPaletteCatalogArgs',
    'buildAppResonanceScreenSoundPaletteCatalogArgs',
    'appOwnsStaticSoundPaletteCatalogs: false',
    'panelArgsModuleOwnsStaticSoundPaletteCatalogs: true',
    'appOwnsDynamicSoundPaletteState: true',
  ].every((needle) => panelArgs.includes(needle)),
  boundaryImportsCanonicalCatalogs: [
    'DRONE_PRESETS',
    'WAVE_TIMBRE_GRADIENT_PRESETS',
    'WAVE_VOLUME_GRADIENT_PRESETS',
    'WAVE_OVERTONE_MODES',
    'WAVE_OVERTONE_ARP_RATES',
    'WAVE_OVERTONE_ARP_PATTERNS',
    'DRONE_JI_OVERTONES',
    'WAVE_OVERTONE_MIX_PRESETS',
    'WAVE_DECAY_PRESETS',
    'META_PRESETS',
    'MANDALA_DOT_POSITIONS',
  ].every((needle) => panelArgs.includes(needle)),
  boundaryRemovesStaticCatalogKeysFromAppCorePanelArgs:
    panelArgs.includes('keyof AppResonanceAuxPanelRuntimeArgs') &&
    panelArgs.includes('AppResonanceScreenSoundPaletteCatalogKey') &&
    panelArgs.includes('export type AppResonanceScreenCorePanelArgs = Omit<'),
  boundaryRehydratesCatalogsBeforeScreenRuntimeEntry: [
    'const soundPaletteCatalogArgs =',
    'buildAppResonanceScreenSoundPaletteCatalogArgs();',
    'return {',
    '...corePanelArgs,',
    '...soundPaletteCatalogArgs,',
    '...auxPanelArgs,',
    '} satisfies ResonancePanelRuntimeArgs;',
    'buildAppResonanceScreenPanelRuntimeArgs',
  ].every((needle) => panelArgs.includes(needle)),
  boundaryDoesNotMoveRuntimeOrScheduling: forbiddenRuntimeMoves.every((needle) => !boundary.includes(needle) && !panelArgs.includes(needle)),
  sanitySuiteIncludesGuard: suite.includes('xensonar:check-app-resonance-screen-sound-palette-catalog-source-cleanup'),
  sanitySuiteContractIncludesGuard: suiteContract.includes('xensonar:check-app-resonance-screen-sound-palette-catalog-source-cleanup'),
  appLineCountWithinPostCatalogCleanupEnvelope: appLines <= 5490,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  movedScope: [
    'Static SoundPalette/Mandala catalog constants are no longer passed through the App.tsx resonancePanels callsite.',
    'appResonanceScreenPanelRuntimeArgs now rehydrates canonical static catalog args before building the screen runtime args.',
    'App.tsx still supplies dynamic SoundPalette state, dynamic preset menus, and explicit action adapters.',
  ],
  explicitlyNotMoved: [
    'WaveStarter and Particle audio preview/action callbacks',
    'Meta preset randomizer actions and roulette state',
    'Root-Follow, Materialspur, Wellenstarter, Drum/Bass, AudioWorklet, Paketstation, Room III behavior',
    'ResonanceControl stage/grid/tuning runtime contracts',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
