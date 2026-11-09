#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/rooms/resonanceWaveLaunchActions.ts';
const keyboardPath = 'src/features/xensonar/input/resonanceKeyboardCommandActions.ts';
const enterGestureBoundaryPath = 'src/features/xensonar/input/enterWaveHotkeyGestureBoundary.ts';
const app = read(appPath);
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const keyboard = exists(keyboardPath) ? read(keyboardPath) : '';
const enterGestureBoundary = exists(enterGestureBoundaryPath) ? read(enterGestureBoundaryPath) : '';
const gestureBoundaryPath = 'src/features/xensonar/rooms/nexusRippleGestureBoundary.ts';
const gestureBoundary = exists(gestureBoundaryPath) ? read(gestureBoundaryPath) : '';
const appLines = app.split(/\r?\n/).length;
const boundaryLines = boundary ? boundary.split(/\r?\n/).length : 0;

const checks = {
  boundaryFileExists: exists(boundaryPath),
  boundaryOwnsRippleAndSectorPushContracts: boundary.includes('pushResonanceRippleLaunch')
    && boundary.includes('pushResonanceSectorPulseLaunch')
    && boundary.includes('refs.ripples.push(ripple)')
    && boundary.includes('refs.sectorPulses.push(pulse)')
    && boundary.includes('refs.sectorPulses.shift()'),
  boundaryOwnsSharedRadiusClamp: boundary.includes('resolveWaveLaunchMaxRadius')
    && boundary.includes('baseWaveMaxRadius * clampValue(waveRadius ?? 1, 0.35, 2.2)'),
  boundaryReturnsLaunchCursorContract: boundary.includes('ResonanceWaveLaunchResult')
    && boundary.includes('cursorY: refs.cursorY')
    && boundary.includes('isSector: true')
    && boundary.includes('isSector: false'),
  appImportsBoundary: (app.includes('resonanceWaveLaunchActions')
    && app.includes('pushResonanceRippleLaunch')
    && app.includes('pushResonanceSectorPulseLaunch'))
    || (app.includes('nexusRippleGestureBoundary')
      && app.includes('runNexusRippleGesture')
      && app.includes('runNexusDirectedPulseGesture')),
  appUsesBoundaryForPanelRippleAndDirectedPulse: (app.includes('const launch = pushResonanceRippleLaunch({')
    && app.includes('const launch = pushResonanceSectorPulseLaunch({')
    && app.includes('playWaveStartSound(freqFromY(launch.cursorY), false);')
    && app.includes('playWaveStartSound(freqFromY(launch.cursorY), true);'))
    || (gestureBoundary.includes('pushResonanceRippleLaunch({')
      && gestureBoundary.includes('pushResonanceSectorPulseLaunch({')
      && gestureBoundary.includes('runtime.playWaveStartSound(runtime.freqFromY(launch.cursorY), launch.isSector)')
      && app.includes('runNexusRippleGesture(buildNexusRippleGestureRuntime(), direction);')
      && app.includes('runNexusDirectedPulseGesture(buildNexusRippleGestureRuntime(), direction);')),
  enterHotkeyGestureUsesBoundary: exists(enterGestureBoundaryPath)
    && enterGestureBoundary.includes('pushResonanceRippleLaunch')
    && enterGestureBoundary.includes('const launch = pushResonanceRippleLaunch({')
    && enterGestureBoundary.includes('runtime.playWaveStartSound(runtime.freqFromY(launch.cursorY), false);')
    && !keyboard.includes('pushResonanceRippleLaunch'),
  appNoLongerOwnsInlineWaveLaunchObjectBodies: !app.includes('refs.ripples.push({ x, y, radius: 0, life: 1, maxRadius')
    && !app.includes('refs.sectorPulses.push({\n      x: refs.cursorX,')
    && !app.includes('const maxRadius = BASE_WAVE_MAX_RADIUS * clamp(p.waveRadius ?? 1, 0.35, 2.2);\n    refs.sectorPulses.push'),
  boundaryDoesNotTouchAudioNodesOrAudioReady: !/AudioContext|OscillatorNode|GainNode|ensureAudioReady|playWaveStartSound|markWaveLaunch|getLiveMasterBus|setTargetAtTime|linearRampToValueAtTime/.test(boundary),
  appStillOwnsActualAudioEmission: app.includes('const emitWaveStartSound = (')
    && app.includes('const playWaveStartSound = (')
    && app.includes('requestWaveStarterLaneAttack'),
  appLineCountDidNotGrowPastKeyboardBoundary: appLines < 6491,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines,
  movedScope: [
    'shared ripple launch object construction',
    'shared directed sector pulse object construction',
    'shared wave-radius clamp semantics',
    'sector-pulse cap semantics',
    'Enter hotkey reuses the same ripple-launch contract through enterWaveHotkeyGestureBoundary',
  ],
  explicitlyNotMoved: [
    'actual Wellenstarter sound emission',
    'audio-ready unlock',
    'lane runtime admission policy',
    'transient/body voice planning',
    'keyboard listener ownership',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
