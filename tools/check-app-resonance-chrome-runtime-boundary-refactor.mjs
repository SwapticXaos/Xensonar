#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const app = read('src/App.tsx');
const boundaryPath = 'src/features/xensonar/layout/useAppResonanceChromeRuntimeBoundary.ts';
const boundaryTypesPath = 'src/features/xensonar/layout/useAppResonanceChromeRuntimeBoundaryTypes.ts';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const boundaryTypes = exists(boundaryTypesPath) ? read(boundaryTypesPath) : '';
const appLines = app.split(/\r?\n/).length;

const forbiddenRuntimeMoves = [
  'createOscillator(',
  'createGain(',
  'connect(',
  '.start(',
  'safeApplyAttack(',
  'safeApplyExponentialRelease(',
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
  'updateRoom3NodeDeviceAudioFrame(',
  'advanceMyzelSynthRoom3Runtime(',
];

const checks = {
  boundaryFileExists: exists(boundaryPath),
  appUsesChromeRuntimeBoundary: app.includes('useAppResonanceChromeRuntimeBoundary({'),
  appNoLongerImportsDisplayRuntimeEntry: !/buildAppResonanceDisplayRuntimeEntry,/.test(app),
  appNoLongerImportsChromeRuntimeArgsBuilder: !app.includes('./features/xensonar/layout/appResonanceChromeRuntimeArgs'),
  appNoLongerOwnsActiveDrumStatusForHeader: !app.includes('const activeDrumStatusEntry = resolveActiveDrumPlaylistEntry({'),
  appNoLongerOwnsActiveBassStatusForHeader: !app.includes('const activeBassStatusEntry = BASS_PATTERNS.find'),
  boundaryOwnsDisplayAndChromeBridge: [
    'export function useAppResonanceChromeRuntimeBoundary',
    'buildAppResonanceDisplayRuntimeEntry(displayInput)',
    'buildAppResonanceChromeRuntimeArgs({',
    'resolveActiveDrumPlaylistEntry({',
    'resolveDrumPlaylistEntries({ drumPatterns: DRUM_PATTERNS, exportedDrumConfigs: grooveStatus.exportedDrumConfigs })',
    'readBassClipById(grooveStatus.bassClipId)',
  ].every((needle) => boundary.includes(needle)),
  boundarySeparatesComputedChromeStatus: [
    'type ComputedChromeStatusKey =',
    'type ChromeStatusInput = Omit<ChromeInput["status"], ComputedChromeStatusKey>;',
  ].every((needle) => boundaryTypes.includes(needle)) &&
    boundary.includes('drumPatternName: activeDrumStatusEntry?.name ?? null') &&
    boundary.includes('bassPatternName: activeBassClipStatus?.name ?? activeBassStatusEntry?.label ?? null'),
  boundaryDoesNotMoveAudioOrSchedulerRuntime: forbiddenRuntimeMoves.every((needle) => !boundary.includes(needle)),
  appNowHandsChromeToScreenRuntimeBoundary: app.includes('chrome: appResonanceChromeRuntimeArgs,'),
  appNoLongerOwnsScreenRuntimeAssembly: !app.includes('buildAppResonanceScreenRuntimeEntry({'),
  appNoLongerOwnsSurfaceFrameAssembly: !app.includes('buildAppSurfaceFrameRuntimeEntry({'),
  appStillOwnsRoomSceneRuntimeBoundary: app.includes('useAppRoomSceneRuntimeBoundary({'),
  appLineCountUnder6675: appLines < 6675,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  movedScope: [
    'Resonance display model assembly',
    'Chrome/header/status/side-rail argument assembly',
    'Drum/Bass header status resolution',
  ],
  explicitlyNotMoved: [
    'Resonance screen panel assembly',
    'Surface frame assembly',
    'Wellenstarter, Bass/Drum scheduling, Room III audio, Root-Follow, Materialspur',
  ],
  futureSeamsMadeClearer: [
    'The resonance screen boundary receives a prepared chrome runtime contract',
    'Header/status strip no longer force App.tsx to know playlist label resolution',
    'Display labels and chrome labels are now adjacent, making a future shell split less prop-fragmented',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
