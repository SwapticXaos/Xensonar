#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const app = read('src/App.tsx');
const commandBoundary = exists('src/features/xensonar/input/resonanceKeyboardCommandActions.ts') ? read('src/features/xensonar/input/resonanceKeyboardCommandActions.ts') : '';
const enterGestureBoundary = exists('src/features/xensonar/input/enterWaveHotkeyGestureBoundary.ts') ? read('src/features/xensonar/input/enterWaveHotkeyGestureBoundary.ts') : '';

const hooks = {
  drumPlaylist: 'src/features/xensonar/drumPattern/useDrumPlaylistRevisionBridge.ts',
  transientTicker: 'src/features/xensonar/diagnostics/useTransientMonitorTicker.ts',
  burstMarker: 'src/features/xensonar/diagnostics/useAudioBurstMarkerHotkey.ts',
  scrollCapture: 'src/features/xensonar/input/useGlobalScrollCapture.ts',
  arrowCapture: 'src/features/xensonar/input/useGlobalArrowCapture.ts',
  gameInput: 'src/features/xensonar/input/useGameInputBridge.ts',
};

const hookText = Object.fromEntries(Object.entries(hooks).map(([name, rel]) => [name, exists(rel) ? read(rel) : '']));

const protectedFiles = [
  'src/features/resonance/refactorTopologyLegacyAudio.ts',
  'src/features/resonance/refactorTopologyNodeAura.ts',
  'src/features/resonance/refactorTopologyLegacyAudioFrame.ts',
  'src/features/resonance/refactorTopologyLegacyAudioGraph.ts',
  'src/features/xensonar/room3/room3NodeDeviceAudioPath.ts',
  'src/features/xensonar/audio/waveStarterMicroOrchestrator.ts',
  'src/features/xensonar/audio/waveStarterLaneRuntime.ts',
  'src/features/xensonar/material/loopLaneUiState.ts',
  'tools/prove-package-complete-musical-payload-roundtrip.mjs',
];

const appLines = app.split(/\r?\n/).length;
const checks = {
  hookFilesExist: Object.values(hooks).every(exists),
  appUsesDrumPlaylistRevisionBridge: app.includes('useAppDrumConfigCallsiteBoundary({') && !app.includes('useDrumPlaylistRevisionBridge();'),
  appUsesTransientMonitorTicker: app.includes('useTransientMonitorTicker({ transientRuntimeRef, setTransientRuntimeMonitor });'),
  appUsesAudioBurstMarkerHotkey: app.includes('useAudioBurstMarkerHotkey({ audioBurstRuntime, room, audioCtx, audioEventIntakeMonitorRef });'),
  appUsesGlobalBrowserInputCallsiteBoundary: app.includes('useAppGlobalBrowserInputCallsiteBoundary({ gameInputActive, resonanceInputActive, keyRef });'),
  appNoLongerDirectlyInvokesGlobalBrowserInputHooks:
    !app.includes('useGlobalScrollCapture();') &&
    !app.includes('useGlobalArrowCapture({ gameInputActive, resonanceInputActive });') &&
    !app.includes('useGameInputBridge({ gameInputActive, keyRef });'),
  drumHookOwnsPlaylistStorageEvents: hookText.drumPlaylist.includes('listenDrumPatternPlaylistUpdated') && hookText.drumPlaylist.includes("window.addEventListener('storage'"),
  transientHookIsDiagnosticsOnly: hookText.transientTicker.includes('getSnapshot()') && !hookText.transientTicker.includes('beginEvent(') && !hookText.transientTicker.includes('admitVoice('),
  burstHookOwnsBackspaceMarker: hookText.burstMarker.includes("event.key !== 'Backspace'") && hookText.burstMarker.includes('recordMarker'),
  scrollHookOwnsWheelCapture: hookText.scrollCapture.includes("window.addEventListener('wheel'") && hookText.scrollCapture.includes('isWheelScrollAllowedTarget'),
  arrowHookOwnsArrowCapture: hookText.arrowCapture.includes('ARROW_KEYS') && hookText.arrowCapture.includes('gameInputActive') && hookText.arrowCapture.includes('resonanceInputActive'),
  gameHookOwnsXenpolarKeyState: hookText.gameInput.includes('applyGameKeyState(event, true') && hookText.gameInput.includes('applyGameKeyState(event, false'),
  appNoLongerOwnsMovedWheelHandler: !app.includes('const handleWheelCapture = (event: WheelEvent) =>'),
  appNoLongerOwnsMovedArrowCaptureHandler: !app.includes('const handleArrowKeyCapture = (event: KeyboardEvent) =>'),
  appNoLongerImportsGameKeyMutation: !app.includes('applyGameKeyState,') && !app.includes('isWheelScrollAllowedTarget,'),
  resonanceHotkeyMusicalBodyStillPresentAcrossBoundary: app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) =>') && (app.includes('runEnterWaveHotkeyGesture(buildNexusRippleGestureRuntime())') || enterGestureBoundary.includes('runtime.playWaveStartSound(runtime.freqFromY(launch.cursorY), false);') || commandBoundary.includes('playWaveStartSound(freqFromY(launch.cursorY), false)')),
  appStillOwnsArrowMotionRaf: app.includes('if (nexusArrowRef.current.left)') && app.includes('commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });'),
  protectedFilesPresent: protectedFiles.every(exists),
  packageRoundtripProofStillEmitsPackageJson: read('tools/prove-package-complete-musical-payload-roundtrip.mjs').includes('--package-out'),
  appLineCountUnder7070: appLines < 7070,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  hookLines: Object.fromEntries(Object.entries(hookText).map(([name, text]) => [name, text.split(/\r?\n/).length])),
  movedScope: [
    'drum playlist revision storage/event listener via drum config callsite boundary',
    'transient monitor diagnostics ticker',
    'audio burst Backspace marker hotkey',
    'global wheel scroll guard',
    'global arrow default-prevention guard',
    'Xenpolar/game key-state bridge',
  ],
  explicitlyNotMoved: [
    'full resonance hotkey listener and downstream musical commands',
    'arrow cursor RAF motion',
    'Wellenstarter sound emission',
    'Root-Follow runtime',
    'Room III / Myzel node-device audio',
    'package musical payload serialization',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
