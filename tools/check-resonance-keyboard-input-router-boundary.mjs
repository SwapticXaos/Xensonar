#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const routerPath = 'src/features/xensonar/input/resonanceKeyboardInputRouter.ts';
const keyUpRouterPath = 'src/features/xensonar/input/resonanceKeyboardKeyUpRouter.ts';
const inputEffectBoundaryPath = 'src/features/xensonar/input/useAppResonanceKeyboardInputEffectBoundary.ts';
const app = read(appPath);
const router = exists(routerPath) ? read(routerPath) : '';
const keyUpRouter = exists(keyUpRouterPath) ? read(keyUpRouterPath) : '';
const inputEffectBoundary = exists(inputEffectBoundaryPath) ? read(inputEffectBoundaryPath) : '';
const appLines = app.split(/\r?\n/).length;
const routerLines = router ? router.split(/\r?\n/).length : 0;
const handleBodyMatch = app.match(/const handleResonanceKeyDown = \(event: KeyboardEvent\) => \{[\s\S]*?\n    \};\n\n    const handleResonanceKeyUp/);
const handleBody = handleBodyMatch?.[0] ?? '';
const inputEffectBoundaryExtracted = app.includes('useAppResonanceKeyboardInputEffectBoundary({') && inputEffectBoundary.includes('runResonanceKeyboardInputRouter({') && inputEffectBoundary.includes('runResonanceKeyboardKeyUpRouter({');

const checks = {
  routerFileExists: exists(routerPath),
  appImportsKeyboardInputRouter: inputEffectBoundaryExtracted || (app.includes('resonanceKeyboardInputRouter')
    && app.includes('runResonanceKeyboardInputRouter')),
  appKeyDownDelegatesToRouter: inputEffectBoundaryExtracted || handleBody.includes('runResonanceKeyboardInputRouter({')
    && handleBody.includes('runtime: {')
    && handleBody.includes('actions: {')
    && handleBody.includes('managedLoopMaterial')
    && handleBody.includes('params: nexusParamsRef.current')
    && handleBody.includes('arrowState: nexusArrowRef.current')
    && handleBody.includes('pitchLaneState: resonanceKeyboardPitchLaneRef.current')
    && handleBody.includes('runEnterWaveGesture: () => runEnterWaveHotkeyGesture(buildNexusRippleGestureRuntime())')
    && handleBody.includes('recordAdaptiveAction: recordAudioPressureAdaptiveAction')
    && handleBody.includes('commitCursorY: commitResonanceCursorY'),
  appNoLongerOwnsKeyboardRoutingSequenceInline: !handleBody.includes('shouldIgnoreResonanceKeyboardDown(event')
    && !handleBody.includes('runResonanceArrowKeyDownBoundary({')
    && !handleBody.includes('runResonanceMomentaryHoldKeyDownBoundary(event')
    && !handleBody.includes('runResonanceHotkeyModeToggleBoundary({')
    && !handleBody.includes('runResonanceAuxiliaryHotkeyRoutingBoundary({')
    && !handleBody.includes('runResonanceGridHotkeyRoutingBoundary({')
    && !handleBody.includes('runResonanceParticleSystemHotkeyBoundary({')
    && !handleBody.includes('runResonanceLoopHotkeyModeRoutingBoundary({')
    && !handleBody.includes('runResonanceNonRepeatAuxiliaryHotkeyBoundary({')
    && !handleBody.includes('runResonanceKeyboardPitchCommandAssemblyBoundary({'),
  routerOwnsOrderedKeyboardRoutingSequence: router.includes('shouldIgnoreResonanceKeyboardDown(event, managedLoopMaterial)')
    && router.indexOf('runResonanceArrowKeyDownBoundary({') < router.indexOf('runResonanceMomentaryHoldKeyDownBoundary(event')
    && router.indexOf('runResonanceMomentaryHoldKeyDownBoundary(event') < router.indexOf("event.code === 'Tab'")
    && router.indexOf("event.key === 'Enter'") < router.indexOf('runResonanceHotkeyModeToggleBoundary({')
    && router.indexOf('runResonanceAuxiliaryHotkeyRoutingBoundary({') < router.indexOf('runResonanceGridHotkeyRoutingBoundary({')
    && router.indexOf('runResonanceGridHotkeyRoutingBoundary({') < router.indexOf('if (!event.repeat) {')
    && router.indexOf('runResonanceParticleSystemHotkeyBoundary({') < router.indexOf('runResonanceLoopHotkeyModeRoutingBoundary({')
    && router.indexOf('runResonanceNonRepeatAuxiliaryHotkeyBoundary({') < router.indexOf('runResonanceKeyboardPitchCommandAssemblyBoundary({'),
  routerCentralizesAudioCommandSeam: router.includes('runResonanceKeyboardAudioCommand({')
    && router.includes('ensureAudioReady')
    && router.includes('reportFailure: reportAudioReadyFailure')
    && router.includes('failureContext'),
  routerExposesRuntimeAndActionsContract: router.includes('export type ResonanceKeyboardRouterRuntime')
    && router.includes('export type ResonanceKeyboardRouterActions')
    && router.includes('runtime: ResonanceKeyboardRouterRuntime')
    && router.includes('actions: ResonanceKeyboardRouterActions'),
  routerSeparatesRuntimeSnapshotsFromImperativeActions: router.indexOf('export type ResonanceKeyboardRouterRuntime') < router.indexOf('export type ResonanceKeyboardRouterActions')
    && router.includes(`const {\n    event,`)
    && router.includes('  } = runtime;')
    && router.includes('  } = actions;')
    && !router.includes(`type ResonanceKeyboardInputRouterArgs = {\n  event: KeyboardEvent;`),
  routerKeepsExistingBoundariesAsInstruments: router.includes('runResonanceArrowKeyDownBoundary')
    && router.includes('runResonanceHotkeyModeToggleBoundary')
    && router.includes('runResonanceAuxiliaryHotkeyRoutingBoundary')
    && router.includes('runResonanceGridHotkeyRoutingBoundary')
    && router.includes('runResonanceParticleSystemHotkeyBoundary')
    && router.includes('runResonanceKeyboardPitchCommandAssemblyBoundary'),
  appDelegatesKeyUpToKeyUpRouter: inputEffectBoundaryExtracted || app.includes('const handleResonanceKeyUp = (event: KeyboardEvent) => {')
    && app.includes('runResonanceKeyboardKeyUpRouter({')
    && app.includes('runtime: {')
    && app.includes('actions: {')
    && app.includes('releaseHeldScheduledTones')
    && keyUpRouter.includes('runResonanceKeyUpHoldBoundary({'),
  routerDoesNotTouchAudioNodesOrMathPrimitives: !/AudioContext|OscillatorNode|GainNode|\.connect\(|\.start\(|\.stop\(|stepYToGrid|snapYToGrid|yFromFreq|freqFromY|dispatchParticlePlayback|playNexusAgentTone/.test(router),
  appLineCountDidNotGrow: appLines < 5535,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  routerLines,
  movedScope: [
    'ordered keydown routing composition',
    'shared resonance keyboard audio command seam',
    'runtime/action grouping for router arguments',
    'material/root-follow/grid/particle/auxiliary/pitch route chain assembly',
  ],
  explicitlyNotMoved: [
    'individual hotkey domain decisions',
    'keyboard pitch lane heuristics',
    'low-level arrow keyup/hold release mutation',
    'Wellenstarter audio implementation',
    'grid/raster mathematics',
    'particle audio playback',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
