#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/input/resonanceKeyboardCommandActions.ts';
const enterGestureBoundaryPath = 'src/features/xensonar/input/enterWaveHotkeyGestureBoundary.ts';
const pitchCommandBoundaryPath = 'src/features/xensonar/input/resonanceKeyboardPitchCommandAssemblyBoundary.ts';
const arrowHoldBoundaryPath = 'src/features/xensonar/input/resonanceArrowHoldKeyBoundary.ts';
const waveLaunchBoundaryPath = 'src/features/xensonar/rooms/resonanceWaveLaunchActions.ts';
const routerPath = 'src/features/xensonar/input/resonanceKeyboardInputRouter.ts';
const keyUpRouterPath = 'src/features/xensonar/input/resonanceKeyboardKeyUpRouter.ts';
const app = read(appPath);
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const enterGestureBoundary = exists(enterGestureBoundaryPath) ? read(enterGestureBoundaryPath) : '';
const pitchCommandBoundary = exists(pitchCommandBoundaryPath) ? read(pitchCommandBoundaryPath) : '';
const arrowHoldBoundary = exists(arrowHoldBoundaryPath) ? read(arrowHoldBoundaryPath) : '';
const waveLaunchBoundary = exists(waveLaunchBoundaryPath) ? read(waveLaunchBoundaryPath) : '';
const router = exists(routerPath) ? read(routerPath) : '';
const keyUpRouter = exists(keyUpRouterPath) ? read(keyUpRouterPath) : '';
const appLines = app.split(/\r?\n/).length;
const boundaryLines = boundary ? boundary.split(/\r?\n/).length : 0;

const checks = {
  boundaryFileExists: exists(boundaryPath),
  arrowHoldBoundaryFileExists: exists(arrowHoldBoundaryPath) && arrowHoldBoundary.includes('runResonanceArrowKeyDownBoundary'),
  appImportsKeyboardBoundary: router.includes('resonanceKeyboardCommandActions')
    && router.includes('runResonanceKeyboardAudioCommand')
    && router.includes('shouldIgnoreResonanceKeyboardDown')
    && router.includes('runResonanceArrowKeyDownBoundary')
    && app.includes('runResonanceKeyboardInputRouter'),
  boundaryOwnsTargetGuards: boundary.includes('shouldIgnoreResonanceKeyboardTarget')
    && boundary.includes('shouldIgnoreResonanceKeyboardDown')
    && boundary.includes('isEditableTarget')
    && boundary.includes('isForgeHotkeyTarget')
    && boundary.includes('isMaterialLoopManagerTarget'),
  boundaryOwnsArrowAndHoldCommands: boundary.includes('setResonanceArrowKeyState')
    && boundary.includes('handleResonanceMomentaryHoldKeyDown')
    && boundary.includes('handleResonanceHoldKeyUp'),
  boundaryOwnsAudioReadyCommandWrapper: boundary.includes('runResonanceKeyboardAudioCommand')
    && boundary.includes('ensureAudioReady')
    && boundary.includes('reportFailure')
    && boundary.includes("event.preventDefault();"),
  enterWaveHotkeyGestureBoundaryOwnsLaunchCompletion: exists(enterGestureBoundaryPath)
    && enterGestureBoundary.includes('runEnterWaveHotkeyGesture')
    && enterGestureBoundary.includes('pushResonanceRippleLaunch')
    && waveLaunchBoundary.includes('refs.ripples.push(ripple)')
    && enterGestureBoundary.includes('runtime.markWaveLaunch();')
    && enterGestureBoundary.includes('runtime.playWaveStartSound(runtime.freqFromY(launch.cursorY), false);'),
  appNoLongerOwnsInlineKeyboardTargetGate: !app.includes('if (isEditableTarget(event.target) || isForgeHotkeyTarget(event.target) || isMaterialLoopManagerTarget(event.target)) return;'),
  appNoLongerOwnsArrowKeyMutationBody: !app.includes('if (key === "ArrowLeft") nexusArrowRef.current.left = isPressed')
    && !app.includes('if (key === "ArrowRight") nexusArrowRef.current.right = isPressed'),
  appNoLongerOwnsEnterRipplePushBody: !app.includes('refs.ripples.push({ x: refs.cursorX, y: refs.cursorY, radius: 0, life: 1, maxRadius')
    && !boundary.includes('refs.ripples.push({')
    && !enterGestureBoundary.includes('refs.ripples.push({')
    && app.includes('runEnterWaveHotkeyGesture(buildNexusRippleGestureRuntime())'),
  appUsesUnifiedAudioReadyCommandForHotkeyCommands: router.includes('runResonanceKeyboardAudioCommand({')
    && app.includes("reportXensonarPromiseFailure('audio', 'resonance-hotkey-audio-ready'"),
  appStillOwnsMainHotkeyHandlerButAsAssembler: app.includes('const handleResonanceKeyDown = (event: KeyboardEvent)')
    && app.includes('runResonanceKeyboardInputRouter({')
    && router.includes('runResonanceAuxiliaryHotkeyRoutingBoundary({')
    && router.includes('runResonanceKeyboardPitchCommandAssemblyBoundary({')
    && (app.includes('runResonanceKeyUpHoldBoundary({')
      || (app.includes('runResonanceKeyboardKeyUpRouter({')
        && keyUpRouter.includes('runResonanceKeyUpHoldBoundary({')))
    && pitchCommandBoundary.includes('resolveResonanceKeyboardPitchCommand({'),
  boundaryDoesNotTouchAudioNodes: !/AudioContext|OscillatorNode|GainNode|\.connect\(|\.start\(|\.stop\(|setTargetAtTime|linearRampToValueAtTime|safeApplyAttack|safeApplyExponentialRelease/.test(boundary),
  appLineCountDidNotGrowPastNexusMask: appLines < 6504,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines,
  movedScope: [
    'keyboard target ignore gate',
    'arrow key state mutation seam',
    'sustain/swell/octave/enter hold key command seam',
    'arrow/hold orchestration moved onward to resonanceArrowHoldKeyBoundary',
    'hotkey audio-ready wrapper',
    'Enter ripple launch micro-action moved onward to enterWaveHotkeyGestureBoundary',
  ],
  explicitlyNotMoved: [
    'full keydown/keyup listener ownership',
    'low-level arrow/hold primitives remain in resonanceKeyboardCommandActions',
    'directed pulse command semantics',
    'grid/raster cycling semantics',
    'material/root-follow loop hotkeys',
    'keyboard pitch lane heuristics and cursor commit implementation',
    'Wellenstarter sound implementation',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
