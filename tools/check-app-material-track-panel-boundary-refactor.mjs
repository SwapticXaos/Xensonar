#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const app = read('src/App.tsx');
const boundaryPath = 'src/features/xensonar/groove/buildAppMaterialTrackPanelBoundary.ts';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const appLines = app.split(/\r?\n/).length;

const forbiddenRuntimeMoves = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'safeApplyAttack(',
  'safeApplyExponentialRelease(',
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
  'schedulePsyBassStep(',
  'scheduleRhythmForgeBassStep(',
  'scheduleRhythmForgeDrumStep(',
  'startQuantizedCollisionRuntime(',
  'updateRoom3NodeDeviceAudioFrame(',
  'advanceMyzelSynthRoom3Runtime(',
  'renderMyzelSynthRoom3RuntimeCanvas(',
];

const checks = {
  boundaryFileExists: exists(boundaryPath),
  appImportsBoundary: app.includes('./features/xensonar/groove/buildAppMaterialTrackPanelBoundary') || app.includes('./features/xensonar/layout/appResonancePanelBoundaryIndex'),
  appUsesBoundaryInsidePanelProps: app.includes('materialTrack: buildAppMaterialTrackPanelBoundary({'),
  appNoLongerBuildsBassPreviewContextInline:
    !app.includes('const bassPreviewGroove = grooveStateFromMycelium(myceliumSnapshotRef.current') &&
    !app.includes('const bassPreviewContext = {') &&
    !app.includes('drumPatterns: DRUM_PATTERNS, drumKits: DRUM_KITS, bassPatterns: BASS_PATTERNS,'),
  appNoLongerImportsStaticGroovePanelCatalogs: ['BASS_PATTERNS', 'DRUM_KITS', 'DRUM_PATTERNS'].every((needle) => !app.includes(needle)),
  appStillKeepsMaterialTrackLiveInputsInApp: [
    'nParamsUI,',
    'updateNParams,',
    'metronomePulse,',
    'enterArenaWorkspace,',
    'exportedDrumConfigs,',
    'selectedExportedDrumConfig,',
    'renameSelectedDrumConfig,',
    'removeSelectedDrumConfig,',
    'materialLoopPanelProps,',
    'myceliumSnapshot: myceliumSnapshotRef.current,',
    'currentTimeSec: audioCtx?.currentTime ?? 0,',
    'nextAbsoluteStep: nexusRefs.current.nextAbsoluteStep ?? 0,',
    'rhythmForgeSeed: rhythmForgeSeedRef.current,',
  ].every((needle) => app.includes(needle)),
  boundaryOwnsStaticCatalogAndPreviewMapping: [
    'export function buildAppMaterialTrackPanelBoundary',
    'export function buildAppBassPreviewContext',
    'grooveStateFromMycelium(myceliumSnapshot, currentTimeSec)',
    'barIndex: Math.max(0, Math.floor(bassPreviewNextStep / 16))',
    'descriptors: { ...bassPreviewGroove.descriptors }',
    'drumPatterns: DRUM_PATTERNS',
    'drumKits: DRUM_KITS',
    'bassPatterns: BASS_PATTERNS',
  ].every((needle) => boundary.includes(needle)),
  boundaryKeepsTypedPanelContract: [
    "import type { MaterialTrackPanelProps }",
    "import type { MyceliumSnapshot }",
    'AppMaterialTrackPanelBoundaryArgs',
    "): MaterialTrackPanelProps",
    "NonNullable<MaterialTrackPanelProps['bassPreviewContext']>",
  ].every((needle) => boundary.includes(needle)),
  boundaryDoesNotMoveAudioOrRafRuntime: forbiddenRuntimeMoves.every((needle) => !boundary.includes(needle)),
  appStillOwnsGrooveSchedulingRuntime: [
    'scheduleBassClipStep({',
    'scheduleClassicBassPatternStep({',
    'schedulePsyBassStep({',
    'scheduleRhythmForgeBassStep({',
    'scheduleRhythmForgeDrumStep({',
  ].every((needle) => app.includes(needle)),
  appStillOwnsPanelBoundaryCall: app.includes('} = useAppResonancePanelPropsBoundary({'),
  appLineCountWithinIndexCleanupRange: appLines <= 5530,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  movedScope: [
    'Materialspur/GrooveBass panel static catalog handoff',
    'Bass preview context assembly from Myzel snapshot/current audio time/next absolute step/rhythm seed',
    'A typed App -> Material Track panel input boundary under the shared resonance panel seam',
  ],
  explicitlyNotMoved: [
    'Materialspur import/export and loop bridge runtime',
    'Drum/Bass scheduling runtime',
    'Bass clip playback cache/bar-root ownership',
    'Root-Follow, Worklet, Partikel, Wellenstarter, Room III audio behavior',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
