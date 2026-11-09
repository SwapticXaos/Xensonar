#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/input/resonanceGridHotkeyRoutingBoundary.ts';
const keyboardPath = 'src/features/xensonar/resonanceKeyboard.ts';
const instrumentDataPath = 'src/features/xensonar/domain/instrumentData.ts';
const routerPath = 'src/features/xensonar/input/resonanceKeyboardInputRouter.ts';

const app = read(appPath);
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const keyboard = read(keyboardPath);
const instrumentData = read(instrumentDataPath);
const router = exists(routerPath) ? read(routerPath) : '';
const appLines = app.split(/\r?\n/).length;
const boundaryLines = boundary ? boundary.split(/\r?\n/).length : 0;

const checks = {
  boundaryFileExists: exists(boundaryPath),
  appImportsGridHotkeyBoundary: router.includes('resonanceGridHotkeyRoutingBoundary')
    && router.includes('runResonanceGridHotkeyRoutingBoundary')
    && app.includes('runResonanceKeyboardInputRouter'),
  appDelegatesGridHotkeyRoutingToBoundary: router.includes('runResonanceGridHotkeyRoutingBoundary({')
    && router.includes('params,')
    && router.includes('runWithAudio,')
    && router.includes('changeGridTuning,')
    && router.includes('setGridMode,')
    && router.includes('resetKeyboardWindow,')
    && app.includes('resetKeyboardWindow: () => {')
    && app.includes('keyboardWindowOffsetRef.current = 0;')
    && app.includes('setKeyboardWindowStamp((prev) => prev + 1);'),
  appNoLongerOwnsGridTuningRoutingInline: !app.includes('if (isPrevGridTuningKey(k))')
    && !app.includes('if (isNextGridTuningKey(k))')
    && !app.includes('nextGridTuning(params.gridTuning')
    && !app.includes('changeGridTuning(nextTuning);'),
  appNoLongerOwnsGridModeCycleInline: !app.includes('if (isGridModeCycleEvent(event))')
    && !app.includes('const gridModes = getModesForSystem(params.gridTuning);')
    && !app.includes('const direction = getGridModeCycleDirection(event);')
    && !app.includes('const nextIndex = (currentIndex + direction + gridModes.length) % gridModes.length;'),
  appNoLongerImportsGridHotkeyPrimitivesDirectly: !app.includes('getGridModeCycleDirection,')
    && !app.includes('isGridModeCycleEvent,')
    && !app.includes('isNextGridTuningKey,')
    && !app.includes('isPrevGridTuningKey,')
    && !app.includes('nextGridTuning,'),
  boundaryReusesExistingKeyboardContracts: boundary.includes("from '../resonanceKeyboard'")
    && boundary.includes('isPrevGridTuningKey(event.key)')
    && boundary.includes('isNextGridTuningKey(event.key)')
    && boundary.includes('isGridModeCycleEvent(event)')
    && boundary.includes('getGridModeCycleDirection(event)')
    && keyboard.includes('RESONANCE_TUNING_PREV_KEYS')
    && keyboard.includes('RESONANCE_TUNING_NEXT_KEYS'),
  boundaryOwnsGridTuningRouting: boundary.includes('nextGridTuning(params.gridTuning, -1)')
    && boundary.includes('nextGridTuning(params.gridTuning, 1)')
    && boundary.includes('changeGridTuning(nextGridTuning'),
  boundaryOwnsGridModeCycleRouting: boundary.includes('const gridModes = getModesForSystem(params.gridTuning);')
    && boundary.includes('const currentIndex = gridModes.findIndex((mode) => mode.value === params.gridMode);')
    && boundary.includes('const nextIndex = (currentIndex + direction + gridModes.length) % gridModes.length;')
    && boundary.includes('setGridMode(nextMode);')
    && boundary.includes('resetKeyboardWindow();')
    && instrumentData.includes('export const getModesForSystem'),
  boundaryPreservesAudioReadinessOwnershipAsCallback: boundary.includes('runWithAudio(() => {')
    && !boundary.includes('ensureAudioReady')
    && !boundary.includes('reportXensonarPromiseFailure'),
  gridBoundaryOrderingStillBeforeNonRepeatHotkeys: router.indexOf('runResonanceGridHotkeyRoutingBoundary({') !== -1
    && router.indexOf('if (!event.repeat) {') !== -1
    && router.indexOf('runResonanceGridHotkeyRoutingBoundary({') < router.indexOf('if (!event.repeat) {'),
  gridBoundaryStillAfterKeyboardWindowShift: router.indexOf('runResonanceAuxiliaryHotkeyRoutingBoundary({') !== -1
    && router.indexOf('runResonanceGridHotkeyRoutingBoundary({') !== -1
    && router.indexOf('runResonanceAuxiliaryHotkeyRoutingBoundary({') < router.indexOf('runResonanceGridHotkeyRoutingBoundary({'),
  boundaryDoesNotTouchPitchCursorWaveOrLoopPaths: !/commitResonanceCursorY|stepYToGrid|snapYToGrid|getKeyboardPitchIndexFromEvent|playWaveStartSound|triggerDirectedPulse|runEnterWaveHotkeyGesture|selectMaterialLoopDirect|selectRootFollowLoopDirect|rootFollowInputTargetHzRef|dispatchParticlePlayback/.test(boundary),
  appLineCountDidNotGrowPastHotkeyModeBoundary: appLines < 5723,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines,
  movedScope: [
    'previous/next grid tuning hotkey routing',
    'grid mode cycle hotkey routing',
    'keyboard window reset after grid mode cycle',
  ],
  explicitlyNotMoved: [
    'keyboard pitch lane commands',
    'cursor commit and lock-to-grid arrow stepping',
    'Raster mathematics and mode masks',
    'Wellenstarter Enter and directed pulse gestures',
    'material/root-follow loop hotkey routing',
    'drum playlist and particle-system hotkeys',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
