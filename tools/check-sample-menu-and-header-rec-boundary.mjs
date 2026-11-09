#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function requireIncludes(path, haystack, needle, label = needle) {
  if (!haystack.includes(needle)) {
    throw new Error(`${path}: missing ${label}`);
  }
}

function requireNotIncludes(path, haystack, needle, label = needle) {
  if (haystack.includes(needle)) {
    throw new Error(`${path}: forbidden ${label}`);
  }
}

const menuPath = 'src/features/l3lab/canonicalForge/SampleInspectorMenu.tsx';
const positionPath = 'src/features/l3lab/canonicalForge/sampleInspectorMenuPosition.ts';
const positionHookPath = 'src/features/l3lab/canonicalForge/useSampleInspectorMenuPosition.ts';
const appHeaderPath = 'src/features/xensonar/layout/AppHeader.tsx';
const headerRecordingButtonPath = 'src/features/xensonar/layout/HeaderRecordingButton.tsx';
const appPath = 'src/App.tsx';
const recordingPanelPath = 'src/features/xensonar/rooms/RecordingTakePanel.tsx';
const scrollBridgePath = 'src/features/xensonar/recording/recordingRackScrollBridge.ts';

for (const path of [menuPath, positionPath, positionHookPath, appHeaderPath, headerRecordingButtonPath, appPath, recordingPanelPath, scrollBridgePath]) {
  if (!existsSync(path)) throw new Error(`${path}: missing file`);
}

const menu = read(menuPath);
const position = read(positionPath);
const positionHook = read(positionHookPath);
const appHeader = read(appHeaderPath);
const headerRecordingButton = read(headerRecordingButtonPath);
const app = read(appPath);
const recordingPanel = read(recordingPanelPath);
const scrollBridge = read(scrollBridgePath);

requireIncludes(menuPath, menu, 'useSampleInspectorMenuPosition');
requireNotIncludes(menuPath, menu, 'React.useLayoutEffect');
requireNotIncludes(menuPath, menu, 'computeSampleInspectorMenuPosition');
requireIncludes(positionHookPath, positionHook, 'computeSampleInspectorMenuPosition');
requireIncludes(positionHookPath, positionHook, 'React.useLayoutEffect');
requireIncludes(menuPath, menu, 'Vorhören');
requireIncludes(menuPath, menu, 'onPreviewMelodicSampleReferencePitch(sample.id, sample.baseHz ?? null)');
requireNotIncludes(menuPath, menu, 'fixedLeft');
requireNotIncludes(menuPath, menu, 'fixedTop');
requireIncludes(positionPath, position, 'spaceBelow');
requireIncludes(positionPath, position, 'spaceAbove');
requireIncludes(positionPath, position, 'anchorY - safeHeight');
requireIncludes(positionPath, position, 'clamp(anchorX');

requireIncludes(appHeaderPath, appHeader, 'HeaderRecordingButton');
requireIncludes(appHeaderPath, appHeader, 'onToggleRecordingFromHeader');
requireIncludes(appHeaderPath, appHeader, 'recordingDurationLabel');
requireIncludes(headerRecordingButtonPath, headerRecordingButton, 'Aufnahme stoppen und zur Master Aufnahme springen');
requireIncludes(headerRecordingButtonPath, headerRecordingButton, 'Stop ${recordingDurationLabel}');
requireNotIncludes(appHeaderPath, appHeader, 'Aufnahme stoppen und zur Master Aufnahme springen');

requireIncludes(scrollBridgePath, scrollBridge, 'MASTER_RECORDING_RACK_ATTR');
requireIncludes(scrollBridgePath, scrollBridge, 'scheduleMasterRecordingRackScroll');
requireIncludes(scrollBridgePath, scrollBridge, 'scrollIntoView');
requireIncludes(recordingPanelPath, recordingPanel, 'MASTER_RECORDING_RACK_ATTR');

requireIncludes(appPath, app, 'toggleHeaderRecording');
requireIncludes(appPath, app, 'scheduleMasterRecordingRackScroll');
requireIncludes(appPath, app, 'recordingRuntime.recordingTake.stopRecording()');
requireIncludes(appPath, app, 'recordingRuntime.recordingTake.startRecording()');
requireIncludes(appPath, app, 'onToggleRecordingFromHeader: toggleHeaderRecording');
requireIncludes(appPath, app, 'recordingDurationLabel: recordingRuntime.recordingTake.formatDuration');

for (const [path, content] of [[positionPath, position], [positionHookPath, positionHook], [scrollBridgePath, scrollBridge]]) {
  for (const forbidden of ['AudioContext', 'createCanonicalSourcePreviewController', 'MaterialTransfer', 'loopPreviewEngine']) {
    requireNotIncludes(path, content, forbidden);
  }
}

console.log('sample-menu-and-header-rec-boundary: ok');
