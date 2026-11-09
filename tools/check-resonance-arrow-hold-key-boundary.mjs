#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/input/resonanceArrowHoldKeyBoundary.ts';
const commandPath = 'src/features/xensonar/input/resonanceKeyboardCommandActions.ts';
const routerPath = 'src/features/xensonar/input/resonanceKeyboardInputRouter.ts';
const keyUpRouterPath = 'src/features/xensonar/input/resonanceKeyboardKeyUpRouter.ts';
const app = read(appPath);
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const commandBoundary = exists(commandPath) ? read(commandPath) : '';
const router = exists(routerPath) ? read(routerPath) : '';
const keyUpRouter = exists(keyUpRouterPath) ? read(keyUpRouterPath) : '';
const appLines = app.split(/\r?\n/).length;
const boundaryLines = boundary ? boundary.split(/\r?\n/).length : 0;

const checks = {
  boundaryFileExists: exists(boundaryPath),
  appRoutesThroughKeyboardRouters: app.includes('resonanceKeyboardInputRouter')
    && app.includes('resonanceKeyboardKeyUpRouter')
    && router.includes('resonanceArrowHoldKeyBoundary')
    && router.includes('runResonanceArrowKeyDownBoundary')
    && router.includes('runResonanceMomentaryHoldKeyDownBoundary')
    && keyUpRouter.includes('resonanceArrowHoldKeyBoundary')
    && keyUpRouter.includes('runResonanceKeyUpHoldBoundary'),
  boundaryOwnsArrowKeyDownRouting: boundary.includes('runResonanceArrowKeyDownBoundary')
    && boundary.includes("event.key === 'ArrowLeft'")
    && boundary.includes("event.key === 'ArrowRight'")
    && boundary.includes("event.key !== 'ArrowUp' && event.key !== 'ArrowDown'")
    && boundary.includes('setResonanceArrowKeyState(arrowState, event.key, true)'),
  boundaryOwnsLockToGridArrowStep: boundary.includes('params.lockCursorToGrid')
    && boundary.includes('stepYToGrid(')
    && boundary.includes('params.manualGridMutedSteps')
    && boundary.includes('commitCursorY(nextY)'),
  boundaryOwnsMomentaryHoldSeam: boundary.includes('runResonanceMomentaryHoldKeyDownBoundary')
    && boundary.includes('handleResonanceMomentaryHoldKeyDown(event, holdActions)'),
  boundaryOwnsKeyUpHoldSeam: boundary.includes('runResonanceKeyUpHoldBoundary')
    && boundary.includes('shouldIgnoreResonanceKeyboardTarget(event)')
    && boundary.includes('setResonanceArrowKeyState(arrowState, event.key, false)')
    && boundary.includes('handleResonanceHoldKeyUp(event, holdActions)'),
  appNoLongerImportsArrowMutationOrTargetGuardDirectly: !app.includes('setResonanceArrowKeyState')
    && !app.includes('shouldIgnoreResonanceKeyboardTarget')
    && !app.includes('handleResonanceMomentaryHoldKeyDown')
    && !app.includes('handleResonanceHoldKeyUp'),
  appNoLongerOwnsInlineArrowKeyDownBody: !app.includes('if (k === "ArrowLeft" || k === "ArrowRight")')
    && !app.includes('if (k === "ArrowUp" || k === "ArrowDown")')
    && !app.includes('const nextY = stepYToGrid('),
  appNoLongerImportsStepYToGrid: !/\bstepYToGrid,/.test(app),
  appKeyDownUsesBoundaryBeforeHoldAndHotkeys: router.includes('if (runResonanceArrowKeyDownBoundary({')
    && router.includes('runResonanceMomentaryHoldKeyDownBoundary(event, holdActions)')
    && router.indexOf('runResonanceArrowKeyDownBoundary({') < router.indexOf('runResonanceMomentaryHoldKeyDownBoundary(event,'),
  appKeyUpDelegatesToKeyUpRouter: app.includes('const handleResonanceKeyUp = (event: KeyboardEvent) => {')
    && app.includes('runResonanceKeyboardKeyUpRouter({')
    && app.includes('arrowState: nexusArrowRef.current')
    && app.includes('releaseHeldScheduledTones')
    && keyUpRouter.includes('runResonanceKeyUpHoldBoundary({'),
  commandActionsRemainLowLevelOwner: commandBoundary.includes('setResonanceArrowKeyState')
    && commandBoundary.includes('handleResonanceMomentaryHoldKeyDown')
    && commandBoundary.includes('handleResonanceHoldKeyUp')
    && commandBoundary.includes('shouldIgnoreResonanceKeyboardTarget'),
  boundaryDoesNotTouchAudioNodes: !/AudioContext|OscillatorNode|GainNode|\.connect\(|\.start\(|\.stop\(|setTargetAtTime|linearRampToValueAtTime|safeApplyAttack|safeApplyExponentialRelease/.test(boundary),
  appLineCountDidNotGrowPastPreviousKnown: appLines < 5638,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines,
  movedScope: [
    'ArrowLeft/ArrowRight press-state routing',
    'ArrowUp/ArrowDown lock-to-grid stepping request',
    'momentary sustain/swell/octave hold keydown seam',
    'keyup arrow release plus hold-release seam',
  ],
  explicitlyNotMoved: [
    'keyboard pitch lane command resolution',
    'cursor commit implementation',
    'resonance arrow RAF movement loop',
    'Wellenstarter sound implementation',
    'hotkey mode/material/root-follow routing',
    'grid tuning/grid mode routing',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
