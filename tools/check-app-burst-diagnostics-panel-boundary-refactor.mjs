#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const app = read('src/App.tsx');
const boundaryPath = 'src/features/xensonar/diagnostics/buildAppBurstDiagnosticsPanelBoundary.ts';
const propsBoundaryPath = 'src/features/xensonar/layout/useAppResonancePanelPropsBoundary.ts';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const propsBoundary = exists(propsBoundaryPath) ? read(propsBoundaryPath) : '';
const appLines = app.split(/\r?\n/).length;

const forbiddenRuntimeMoves = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'startQuantizedCollisionRuntime(',
  'updateRoom3NodeDeviceAudioFrame(',
  'advanceMyzelSynthRoom3Runtime(',
  'renderMyzelSynthRoom3RuntimeCanvas(',
];

const checks = {
  boundaryFileExists: exists(boundaryPath),
  propsBoundaryImportsBoundary: propsBoundary.includes("from '../diagnostics/buildAppBurstDiagnosticsPanelBoundary'"),
  appUsesBoundaryInsidePanelProps:
    app.includes('burstDiagnostics: buildAppBurstDiagnosticsPanelBoundary({') ||
    propsBoundary.includes('buildAppBurstDiagnosticsPanelBoundary(input)'),
  appNoLongerInlinesBurstRecorderActionsInPanelProps:
    !app.includes('onStartAudioBurstRecorder: audioBurstRuntime.start') &&
    !app.includes('onStopAudioBurstRecorder: audioBurstRuntime.stop') &&
    !app.includes('onClearAudioBurstRecorder: audioBurstRuntime.clear') &&
    !app.includes('onExportAudioBurstRecorder: () => audioBurstRuntime.exportLog({'),
  boundaryOwnsBurstRecorderActionMapping: [
    'export function buildAppBurstDiagnosticsPanelBoundary',
    'onStartAudioBurstRecorder: audioBurstRuntime.start',
    'onStopAudioBurstRecorder: audioBurstRuntime.stop',
    'onClearAudioBurstRecorder: audioBurstRuntime.clear',
    'onExportAudioBurstRecorder: () => audioBurstRuntime.exportLog(exportContext)',
    'export type AppRootFollowRecoveryActionsBoundary = Pick<',
    'rootFollowRecoveryActions: AppRootFollowRecoveryActionsBoundary;',
    '...rootFollowRecoveryActions,',
  ].every((needle) => boundary.includes(needle)),
  boundaryKeepsTypedPanelContract: [
    "import type { BurstDiagnosticsPanelProps }",
    'AudioBurstExportContext',
    'AppBurstDiagnosticsPanelBoundaryArgs',
    '): BurstDiagnosticsPanelProps',
  ].every((needle) => boundary.includes(needle)),
  boundaryDoesNotMoveAudioOrRafRuntime: forbiddenRuntimeMoves.every((needle) => !boundary.includes(needle)),
  appOrBoundaryStillOwnsExportContextValues: [
    'exportContextSource: { room, liveMasteringEnabled, gridTempoBpm, quantizeGrid, particleQuantizeReferenceBars, materialLoopActive: nParamsUI.materialLoopActive, waveSoundEnabled }',
    'recovery: { onRunAudioPairTherapistReset: resetAudioPairTherapistRuntime, onClearRootFollowBrowserState: clearRootFollowBrowserState, onReactivateRootFollowFromPackage: reactivateRootFollowFromLoadedPackage }',
  ].every((needle) => app.includes(needle)),
  appLineCountWithinIndexCleanupRange: appLines <= 5530,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  movedScope: [
    'Burst-Diagnose panel recorder action mapping',
    'Burst export context handoff as explicit App boundary input',
    'Audio-Pair-Therapeut and Root-Follow browser/package actions as named panel callbacks',
  ],
  explicitlyNotMoved: [
    'Audio burst recorder runtime implementation',
    'Root-Follow browser state clearing implementation',
    'Package reactivation implementation',
    'Any audio, RAF, Worklet, Room III, Bass/Drum, or Materialspur scheduling behavior',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
