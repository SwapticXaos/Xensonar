#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const keyUpRouterPath = 'src/features/xensonar/input/resonanceKeyboardKeyUpRouter.ts';
const arrowHoldPath = 'src/features/xensonar/input/resonanceArrowHoldKeyBoundary.ts';
const inputEffectBoundaryPath = 'src/features/xensonar/input/useAppResonanceKeyboardInputEffectBoundary.ts';
const app = read(appPath);
const keyUpRouter = exists(keyUpRouterPath) ? read(keyUpRouterPath) : '';
const arrowHold = exists(arrowHoldPath) ? read(arrowHoldPath) : '';
const inputEffectBoundary = exists(inputEffectBoundaryPath) ? read(inputEffectBoundaryPath) : '';
const appLines = app.split(/\r?\n/).length;
const keyUpRouterLines = keyUpRouter ? keyUpRouter.split(/\r?\n/).length : 0;
const keyUpBodyMatch = app.match(/const handleResonanceKeyUp = \(event: KeyboardEvent\) => \{[\s\S]*?\n    \};\n\n    window\.addEventListener/);
const keyUpBody = keyUpBodyMatch?.[0] ?? '';
const inputEffectBoundaryExtracted = app.includes('useAppResonanceKeyboardInputEffectBoundary({') && inputEffectBoundary.includes('runResonanceKeyboardKeyUpRouter({');

const checks = {
  keyUpRouterFileExists: exists(keyUpRouterPath),
  appImportsKeyUpRouter: inputEffectBoundaryExtracted || (app.includes('resonanceKeyboardKeyUpRouter')
    && app.includes('runResonanceKeyboardKeyUpRouter')),
  appKeyUpDelegatesToKeyUpRouter: inputEffectBoundaryExtracted || keyUpBody.includes('runResonanceKeyboardKeyUpRouter({')
    && keyUpBody.includes('runtime: {')
    && keyUpBody.includes('actions: {')
    && keyUpBody.includes('arrowState: nexusArrowRef.current')
    && keyUpBody.includes('releaseHeldScheduledTones'),
  appNoLongerCallsArrowHoldKeyUpBoundaryDirectly: !keyUpBody.includes('runResonanceKeyUpHoldBoundary({'),
  keyUpRouterExposesRuntimeAndActionsContract: keyUpRouter.includes('export type ResonanceKeyboardKeyUpRouterRuntime')
    && keyUpRouter.includes('export type ResonanceKeyboardKeyUpRouterActions')
    && keyUpRouter.includes('runtime: ResonanceKeyboardKeyUpRouterRuntime')
    && keyUpRouter.includes('actions: ResonanceKeyboardKeyUpRouterActions'),
  keyUpRouterDelegatesToArrowHoldBoundary: keyUpRouter.includes("import { runResonanceKeyUpHoldBoundary } from './resonanceArrowHoldKeyBoundary'")
    && keyUpRouter.includes('runResonanceKeyUpHoldBoundary({')
    && keyUpRouter.includes('arrowState,')
    && keyUpRouter.includes('holdActions,'),
  keyUpRouterKeepsReleaseResultExplicit: keyUpRouter.includes("route: 'arrow-hold-release'")
    && keyUpRouter.includes("route: 'ignored'"),
  arrowHoldBoundaryStillOwnsLowLevelReleaseMutation: arrowHold.includes('runResonanceKeyUpHoldBoundary')
    && arrowHold.includes('shouldIgnoreResonanceKeyboardTarget(event)')
    && arrowHold.includes('setResonanceArrowKeyState(arrowState, event.key, false)')
    && arrowHold.includes('handleResonanceHoldKeyUp(event, holdActions)'),
  keyUpRouterDoesNotTouchAudioOrTimingMath: !/AudioContext|OscillatorNode|GainNode|\.connect\(|\.start\(|\.stop\(|requestAnimationFrame|stepYToGrid|snapYToGrid|yFromFreq|freqFromY|playWaveStartSound|dispatchParticlePlayback/.test(keyUpRouter),
  appLineCountWithinExpectedRange: appLines < 5540,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  keyUpRouterLines,
  movedScope: [
    'keyup router composition seam',
    'runtime/actions contract for arrow plus hold release routing',
    'App.tsx keyup adapter delegation',
  ],
  explicitlyNotMoved: [
    'low-level arrow key state mutation',
    'hold-release key semantics',
    'arrow RAF motion loop',
    'audio implementation',
    'pitch-lane command assembly',
    'enter-wave gesture',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
