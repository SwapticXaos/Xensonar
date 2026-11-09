#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/input/enterWaveHotkeyGestureBoundary.ts';
const keyboardPath = 'src/features/xensonar/input/resonanceKeyboardCommandActions.ts';
const waveLaunchPath = 'src/features/xensonar/rooms/resonanceWaveLaunchActions.ts';
const rippleGesturePath = 'src/features/xensonar/rooms/nexusRippleGestureBoundary.ts';
const routerPath = 'src/features/xensonar/input/resonanceKeyboardInputRouter.ts';
const keyUpRouterPath = 'src/features/xensonar/input/resonanceKeyboardKeyUpRouter.ts';

const app = read(appPath);
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const keyboard = exists(keyboardPath) ? read(keyboardPath) : '';
const waveLaunch = exists(waveLaunchPath) ? read(waveLaunchPath) : '';
const rippleGesture = exists(rippleGesturePath) ? read(rippleGesturePath) : '';
const router = exists(routerPath) ? read(routerPath) : '';
const keyUpRouter = exists(keyUpRouterPath) ? read(keyUpRouterPath) : '';
const appLines = app.split(/\r?\n/).length;
const boundaryLines = boundary ? boundary.split(/\r?\n/).length : 0;

const checks = {
  boundaryFileExists: exists(boundaryPath),
  appImportsEnterGestureBoundary: app.includes('enterWaveHotkeyGestureBoundary')
    && app.includes('runEnterWaveHotkeyGesture'),
  appEnterHotkeyDelegatesToBoundary: router.includes("if (event.key === 'Enter')")
    && router.includes('holdActions.setEnterHoldActive(true);')
    && router.includes('runWithAudio(runEnterWaveGesture);')
    && app.includes('runEnterWaveGesture: () => runEnterWaveHotkeyGesture(buildNexusRippleGestureRuntime())'),
  appNoLongerAssemblesEnterWaveLaunchInline: !app.includes('launchEnterWaveHotkeyAction({')
    && !app.includes('waveRadius: p.waveRadius')
    && !app.includes('waveDecay: p.waveDecay')
    && !app.includes('playWaveStartSound(freqFromY(launch.cursorY), false);'),
  keyboardCommandBoundaryNoLongerOwnsEnterWaveLaunchGesture: !keyboard.includes('launchEnterWaveHotkeyAction')
    && !keyboard.includes('pushResonanceRippleLaunch')
    && keyboard.includes('handleResonanceMomentaryHoldKeyDown')
    && keyboard.includes('handleResonanceHoldKeyUp')
    && keyboard.includes('runResonanceKeyboardAudioCommand'),
  enterBoundaryOwnsHotkeyGestureCompletion: boundary.includes('runEnterWaveHotkeyGesture')
    && boundary.includes('pushResonanceRippleLaunch({')
    && boundary.includes('runtime.markWaveLaunch();')
    && boundary.includes('runtime.playWaveStartSound(runtime.freqFromY(launch.cursorY), false);')
    && boundary.includes('return launch;'),
  enterBoundaryReusesWaveLaunchContract: boundary.includes('ResonanceWaveLaunchResult')
    && waveLaunch.includes('refs.ripples.push(ripple)')
    && !boundary.includes('refs.ripples.push('),
  panelRippleGestureStillSeparate: rippleGesture.includes('runNexusRippleGesture')
    && rippleGesture.includes('runNexusDirectedPulseGesture')
    && rippleGesture.includes('runtime.playWaveStartSound(runtime.freqFromY(launch.cursorY), launch.isSector)'),
  enterHoldReleaseStillProtected: (app.includes('handleResonanceHoldKeyUp(event, {')
    || app.includes('runResonanceKeyUpHoldBoundary({')
    || (app.includes('runResonanceKeyboardKeyUpRouter({')
      && keyUpRouter.includes('runResonanceKeyUpHoldBoundary({')))
    && app.includes('setEnterHoldActive,')
    && keyboard.includes("if (event.key === 'Enter')")
    && keyboard.includes('actions.setEnterHoldActive?.(false);'),
  boundaryDoesNotTouchAudioNodesOrAudioReady: !/AudioContext|OscillatorNode|GainNode|ensureAudioReady|getLiveMasterBus|requestWaveStarterLaneAttack|emitWaveStarterAttack|setTargetAtTime|linearRampToValueAtTime/.test(boundary),
  appLineCountDidNotGrowPastNexusRippleGestureBoundary: appLines < 5736,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines,
  movedScope: [
    'Enter hotkey ripple gesture completion',
    'Enter hotkey markWaveLaunch + sound cue handoff',
    'Enter hotkey reuse of shared wave launch contract',
  ],
  explicitlyNotMoved: [
    'actual Wellenstarter sound implementation',
    'audio-ready unlock wrapper',
    'keydown/keyup listener ownership',
    'panel ripple and directed pulse gesture semantics',
    'wave launch object mutation contract',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
