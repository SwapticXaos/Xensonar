#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const boundaryPath = 'src/features/xensonar/layout/buildAppRecordingTakeAuxPanelBoundary.ts';
const boundaryTypesPath = 'src/features/xensonar/layout/buildAppRecordingTakeAuxPanelBoundaryTypes.ts';
const auxArgsPath = 'src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgs.ts';
const auxTypesPath = 'src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgsTypes.ts';
const sourceNormalizerPath = 'src/features/xensonar/layout/appResonanceAuxPanelSourceNormalizer.ts';
const dependencyAuditPath = 'validation/contracts/xensonar/layout/appAuxPanelBoundaryDependencyAudit.ts';
const appPath = 'src/App.tsx';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const boundaryTypes = exists(boundaryTypesPath) ? read(boundaryTypesPath) : '';
const auxArgs = exists(auxArgsPath) ? read(auxArgsPath) : '';
const auxTypes = exists(auxTypesPath) ? read(auxTypesPath) : '';
const sourceNormalizer = exists(sourceNormalizerPath) ? read(sourceNormalizerPath) : '';
const dependencyAudit = exists(dependencyAuditPath) ? read(dependencyAuditPath) : '';
const app = read(appPath);
const pkg = JSON.parse(read(pkgPath));
const suite = read(suitePath);
const suiteContract = read(suiteContractPath);
const appLines = app.split(/\r?\n/).length;

const forbiddenRuntimeTokens = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'new AudioContext(',
  'requestAnimationFrame(',
  'setInterval(',
  'setTimeout(',
  'MediaRecorder(',
  'startRecordingSession(',
  'stopRecordingSession(',
  'exportRecordingBufferRange(',
  'downloadBufferRangeWav(',
  'updateRecordingPreviewUrlState(',
  'handleRecordingTimelinePointerDown(',
  'registerRecordingMarkerHotkeyListener(',
  'localStorage.',
];

const groups = ['source', 'session', 'exportActions', 'timeline'];
const expectedTypes = [
  'AppRecordingTakeSourceBoundary',
  'AppRecordingTakeSessionBoundary',
  'AppRecordingTakeExportBoundary',
  'AppRecordingTakeTimelineBoundary',
  'AppRecordingTakeAuxPanelBoundaryGroupedInput',
  'AppRecordingTakeAuxPanelBoundaryInput',
  'AppRecordingTakeAuxPanelBoundary',
];
const expectedProps = [
  'recordingSourceMode',
  'setRecordingSourceMode',
  'recordingState',
  'stopRecording',
  'startRecording',
  'formatDuration',
  'addRecordingMarker',
  'setRecordingState',
  'recordingMarkers',
  'maxRecordingMs',
  'downloadRecordingWav',
  'downloadRecordingCropWav',
  'recordingCrop',
  'recordingPreviewUrl',
  'recordingPreviewAudioRef',
  'recordingTimelineRef',
  'handleTimelinePointerDown',
  'recordingWaveform',
  'recordingCropDraft',
  'recordingPlayheadMs',
];

const checks = {
  expectedFilesExist: [boundaryPath, boundaryTypesPath, auxArgsPath, auxTypesPath, sourceNormalizerPath, dependencyAuditPath, appPath, pkgPath].every(exists),
  packageVersionAtLeast111: /^3\.2\.91\.6\.9\.(11[1-9]|1[2-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-recording-take-aux-panel-boundary'] ===
    'node tools/check-app-recording-take-aux-panel-boundary.mjs',
  boundaryImportsOnlyAuxArgsType:
    boundary.includes("from './buildAppRecordingTakeAuxPanelBoundaryTypes';") &&
    boundaryTypes.includes("import type { AppAuxPanelBoundaryInputContractMap } from './appResonanceAuxPanelRuntimeArgsTypes';") &&
    !/import\s+(?!type\b)/.test(boundaryTypes),
  boundaryDerivesFromAuxRecordingTakeContract:
    boundaryTypes.includes("type AppRecordingTakeAuxPanelProps = AppAuxPanelBoundaryInputContractMap['recordingTake'];"),
  boundaryDeclaresExpectedTypes: expectedTypes.every((needle) => boundaryTypes.includes(needle)),
  boundaryDeclaresContract:
    boundary.includes('APP_RECORDING_TAKE_AUX_PANEL_BOUNDARY_CONTRACT') &&
    boundary.includes("currentRole: 'app-aux-panel-input-montage'") &&
    boundary.includes('runtimeOwned: false') &&
    boundary.includes('audioMutating: false') &&
    boundary.includes('bridgeOwnsPanelPropBuild: false') &&
    boundary.includes('acceptsRuntimeTakeDirectly: true'),
  boundaryUsesExpectedGroups:
    groups.every((group) => boundary.includes(`'${group}'`) && boundary.includes(`...${group}`)) &&
    boundary.includes('groupRecordingTakeAuxPanelInput') &&
    boundary.includes('isGroupedRecordingTakeInput'),
  boundaryCoversAllRecordingTakeProps: expectedProps.every((prop) => boundaryTypes.includes(`'${prop}'`) || boundary.includes(`${prop}:`)),
  boundaryDoesNotContainRuntimeCalls: forbiddenRuntimeTokens.every((token) => !boundary.includes(token)),
  sourceNormalizerNormalizesRecordingTakeAndAuxRuntimeArgsFlattens:
    auxTypes.includes('AppAuxPanelBoundaryInputContractMap') &&
    auxTypes.includes('AppAuxPanelBoundaryOutputContractMap') &&
    sourceNormalizer.includes('buildAppRecordingTakeAuxPanelBoundary(') &&
    auxArgs.includes('...normalizedInput.recordingTake'),
  appDoesNotImportRecordingBoundary:
    !app.includes('import { buildAppRecordingTakeAuxPanelBoundary }'),
  appPassesRecordingRuntimeTakeSource:
    app.includes('recordingTake: recordingRuntime.recordingTake,'),
  appNoLongerExpandsRecordingTakeInApp:
    !app.includes('recordingTake: buildAppRecordingTakeAuxPanelBoundary({') &&
    groups.every((group) => !app.includes(`${group}: {`)) &&
    expectedProps.every((prop) => !app.includes(`recordingRuntime.recordingTake.${prop}`)),
  dependencyAuditKnowsRecordingBoundary:
    dependencyAudit.includes("| 'recordingTake'") &&
    dependencyAudit.includes("sourceFile: 'src/features/xensonar/layout/buildAppRecordingTakeAuxPanelBoundary.ts'") &&
    dependencyAudit.includes("recordingTake: {") &&
    dependencyAudit.includes("allowedTypeImports: ['./buildAppRecordingTakeAuxPanelBoundaryTypes']"),
  sanitySuiteIncludesGuard:
    suite.includes('Recording take aux panel boundary') &&
    suite.includes('xensonar:check-app-recording-take-aux-panel-boundary'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-recording-take-aux-panel-boundary'),
  appLineCountWithinRecordingBoundaryRange: appLines <= 5585,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  appLines,
  movedScope: [
    'Recording-take aux-panel input montage accepts the runtime take directly from App.tsx',
    'Recording source, session controls, export actions, and timeline/crop-preview fields are grouped inside the boundary instead of App.tsx',
  ],
  explicitlyNotMoved: [
    'No recording runtime/session lifecycle, MediaRecorder, WAV export, crop export, preview URL, marker hotkey, audio, package, or visible UI behavior was moved',
    'No Root-Follow, Worklet, Granular, Materialspur, Paketstation, Partikel, Wellenstarter, Drum/Bass, or Room III behavior changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
