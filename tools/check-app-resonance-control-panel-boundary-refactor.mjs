#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const app = read('src/App.tsx');
const boundaryPath = 'src/features/xensonar/rooms/buildAppResonanceControlPanelBoundary.ts';
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
  'startWaveOvertoneArpRuntime(',
  'updateRoom3NodeDeviceAudioFrame(',
  'advanceMyzelSynthRoom3Runtime(',
  'renderMyzelSynthRoom3RuntimeCanvas(',
  'requestAnimationFrame(',
  'setInterval(',
  'setTimeout(',
];

const checks = {
  boundaryFileExists: exists(boundaryPath),
  appImportsBoundary: app.includes('./features/xensonar/rooms/buildAppResonanceControlPanelBoundary') || app.includes('./features/xensonar/layout/appResonancePanelBoundaryIndex'),
  appUsesBoundaryInsidePanelProps: app.includes('resonanceControl: buildAppResonanceControlPanelBoundary({'),
  appNoLongerInlinesFlatResonanceControlObject:
    !app.includes('resonanceControl: {\n      nParamsUI, droneVolume, transientDriveUi, quantizeGrid, gridTempoBpm, quantizeStepMs,') &&
    !app.includes('myzelEnabled, myzelStep16ths, updateNParams, setChurchMode, changeGridTuning, setGridMode,') &&
    !app.includes('getTuningSteps, commitResonanceCursorY, nexusRefs, quantizeAnchorRef, waveCollisionQueueRef,'),
  appKeepsLiveValuesAsExplicitBoundaryInputs: [
    'state: { nParamsUI, droneVolume, transientDriveUi, quantizeGrid, gridTempoBpm, quantizeStepMs, myzelEnabled, myzelStep16ths, installationFieldConfig },',
    'gridAndTuning: { updateNParams, setChurchMode, changeGridTuning, setGridMode, getTuningSteps, commitResonanceCursorY, setQuantizeGrid, setGridTempoBpm: setGridTempoBpmWithTrafficReset },',
    'trafficRefs: { nexusRefs, quantizeAnchorRef, waveCollisionQueueRef, particleQuantizeSeenRef, particleQuantizeTimerRef },',
    'toneActions: { setDroneVolume, applyRealtimeDroneOvertones, updateTransientDriveSource },',
    'myzelInstallation: { toggleMyzelEnabled, setMyzelStep16ths, toggleInstallResidents, setInstallResidentVolumeLevel, setInstallResidentSystemValue, setInstallResidentModeValue, openInstallationTopologyRoom },',
  ].every((needle) => app.includes(needle)),
  boundaryOwnsSemanticGroupingOnly: [
    'export type AppResonanceControlStateBoundary',
    'export type AppResonanceControlGridBoundary',
    'export type AppResonanceControlTrafficRefsBoundary',
    'export type AppResonanceControlToneActionsBoundary',
    'export type AppResonanceControlMyzelInstallationBoundary',
    'export function buildAppResonanceControlPanelBoundary',
    '): ResonanceControlRuntimeProps',
    '...state',
    '...gridAndTuning',
    '...trafficRefs',
    '...toneActions',
    '...myzelInstallation',
  ].every((needle) => boundary.includes(needle)),
  boundaryKeepsTypedRuntimePropsContract: [
    "import type { ResonanceControlRuntimeProps } from './buildResonanceControlProps'",
    'Pick<',
    "| 'nParamsUI'",
    "| 'commitResonanceCursorY'",
    "| 'nexusRefs'",
    "| 'particleQuantizeTimerRef'",
    "| 'applyRealtimeDroneOvertones'",
    "| 'openInstallationTopologyRoom'",
  ].every((needle) => boundary.includes(needle)),
  boundaryDoesNotMoveAudioOrRafRuntime: forbiddenRuntimeMoves.every((needle) => !boundary.includes(needle)),
  appStillOwnsQuantizeAndCursorRuntimeSites: [
    'resolveTrafficQuantizeSchedule({',
    'commitResonanceCursorY,',
    'setGridTempoBpmWithTrafficReset',
    'quantizeAnchorRef.current',
    'useQuantizedTrafficBoundary({',
    'particleQuantizeTimerRef,',
    'writeResonanceCursorY(nexusRefs,',
  ].every((needle) => app.includes(needle)),
  appStillOwnsAudioAndRoom3RuntimeSites: [
    'startQuantizedCollisionRuntime({',
    'startWaveOvertoneArpRuntime({',
    'updateRoom3NodeDeviceAudioFrame({',
    'advanceMyzelSynthRoom3Runtime({',
    'renderMyzelSynthRoom3RuntimeCanvas(',
  ].every((needle) => app.includes(needle)),
  appStillOwnsPanelBoundaryCall: app.includes('} = useAppResonancePanelPropsBoundary({'),
  appLineCountWithinIndexCleanupRange: appLines <= 5530,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  movedScope: [
    'Resonance-Control panel input grouping into state/grid+tempo/traffic refs/tone actions/Myzel-installation seams',
    'A typed App -> Resonance-Control panel boundary under the shared resonance panel props seam',
    'Semantic grouping of quantize-adjacent values without moving quantize scheduling ownership',
  ],
  explicitlyNotMoved: [
    'Quantize scheduling and traffic queue runtime',
    'Cursor commit/read/write runtime',
    'Grid tuning mutation behavior',
    'Drone/transient audio implementation',
    'Myzel installation runtime and Room III node-device audio behavior',
    'Root-Follow, Materialspur, Partikel, Wellenstarter, Drum/Bass scheduling, Worklet paths',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
