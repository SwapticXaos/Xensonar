#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const probePath = 'validation/contracts/xensonar/input/appResonanceKeyboardCommandAdapterCallsiteProbe.ts';
const shapeAuditPath = 'validation/contracts/xensonar/input/appResonanceKeyboardCommandAdapterShapeAudit.ts';
const inputRouterPath = 'src/features/xensonar/input/resonanceKeyboardInputRouter.ts';
const keyUpRouterPath = 'src/features/xensonar/input/resonanceKeyboardKeyUpRouter.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const keyboardInputEffectBoundaryPath = 'src/features/xensonar/input/useAppResonanceKeyboardInputEffectBoundary.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const probe = exists(probePath) ? read(probePath) : '';
const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const inputRouter = exists(inputRouterPath) ? read(inputRouterPath) : '';
const keyUpRouter = exists(keyUpRouterPath) ? read(keyUpRouterPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const keyboardInputEffectBoundary = exists(keyboardInputEffectBoundaryPath) ? read(keyboardInputEffectBoundaryPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;
const keyboardInputEffectBoundaryExtracted =
  app.includes('useAppResonanceKeyboardInputEffectBoundary({') &&
  keyboardInputEffectBoundary.includes('window.addEventListener("keydown", handleResonanceKeyDown)') &&
  keyboardInputEffectBoundary.includes('runResonanceKeyboardInputRouter({') &&
  keyboardInputEffectBoundary.includes('runResonanceKeyboardKeyUpRouter({') &&
  monolithMap.includes("status: 'resonance-keyboard-input-effect-boundary-extracted'");
const probeLines = probe.split(/\r?\n/).length;

const forbiddenProbeNeedles = [
  'import React',
  'useEffect',
  'useMemo',
  'useCallback',
  'useState',
  'useRef',
  'window.addEventListener',
  'window.removeEventListener',
  'requestAnimationFrame(',
  'cancelAnimationFrame(',
  'setTimeout(',
  'setInterval(',
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'ensureAudioReady(',
  'runEnterWaveHotkeyGesture(',
  'buildNexusRippleGestureRuntime(',
  'runResonanceKeyboardInputRouter(',
  'runResonanceKeyboardKeyUpRouter(',
  'commitResonanceCursorY(',
  'executeStableRhythmLaneStepPlan(',
  'nexusRefs.current.nextAbsoluteStep =',
  '.current =',
];

const keyDownRuntimeKeys = [
  'event',
  'managedLoopMaterial',
  'params',
  'arrowState',
  'cursorY',
  'keyboardMirrorActive',
  'keyboardWindowOffset',
  'pitchLaneState',
  'exportedDrumConfigs',
  'recentLoopHotkeyEntries',
  'recentRootFollowHotkeyEntries',
];
const keyDownActionKeys = [
  'holdActions',
  'ensureAudioReady',
  'reportAudioReadyFailure',
  'ensureKeyboardPitchAudioReadyOnce',
  'cycleQuantizeGrid',
  'runEnterWaveGesture',
  'updateNParams',
  'toggleKeyboardMirror',
  'triggerDirectedPulse',
  'previewKeyboardWindowShift',
  'changeGridTuning',
  'setGridMode',
  'resetKeyboardWindow',
  'setChurchMode',
  'cycleParticleSystem',
  'selectMaterialLoopDirect',
  'selectRootFollowLoopDirect',
  'toggleMaterialLoopDirect',
  'toggleRootFollowLoopDirect',
  'browseMaterialLoopWithUmlaut',
  'browseRootFollowLoopWithUmlaut',
  'toggleNexusAgent',
  'nowMs',
  'setRootFollowInputTargetHz',
  'recordAdaptiveAction',
  'commitCursorY',
];
const keyUpRuntimeKeys = ['event', 'arrowState'];
const keyUpActionKeys = ['holdActions'];

const checks = {
  expectedFilesExist: [
    appPath,
    probePath,
    shapeAuditPath,
    inputRouterPath,
    keyUpRouterPath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast169: /^3\.2\.91\.6\.9\.(16[9]|1[7-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-keyboard-command-adapter-callsite-probe'] ===
    'node tools/check-app-resonance-keyboard-command-adapter-callsite-probe.mjs',
  probeExportsOnlyRouterArgBuilders:
    probe.includes('buildAppResonanceKeyboardCommandKeyDownRouterArgs') &&
    probe.includes('buildAppResonanceKeyboardCommandKeyUpRouterArgs') &&
    probe.includes('AppResonanceKeyboardCommandKeyDownCallsiteProbeInput') &&
    probe.includes('AppResonanceKeyboardCommandKeyUpCallsiteProbeInput') &&
    probe.includes('adapterCallsiteOnly: true') &&
    probe.includes('handlerBodiesStillInlineInApp: true') &&
    probe.includes('eventListenersStillOwnedByAppEffect: true') &&
    probe.includes('runtimeOwned: false') &&
    probe.includes('audioOwned: false') &&
    probe.includes('schedulingOwned: false'),
  probeStaysPureAndDoesNotOwnRuntime: forbiddenProbeNeedles.every((needle) => !probe.includes(needle)),
  probeReferencesShapeAudit:
    probe.includes('APP_RESONANCE_KEYBOARD_COMMAND_ADAPTER_SHAPE_AUDIT') &&
    shapeAudit.includes('APP_RESONANCE_KEYBOARD_COMMAND_ADAPTER_SHAPE_AUDIT'),
  appImportsAndUsesProbe:
    keyboardInputEffectBoundaryExtracted || app.includes('buildAppResonanceKeyboardCommandKeyDownRouterArgs') &&
    app.includes('buildAppResonanceKeyboardCommandKeyUpRouterArgs') &&
    app.includes('runResonanceKeyboardInputRouter(buildAppResonanceKeyboardCommandKeyDownRouterArgs({') &&
    app.includes('runResonanceKeyboardKeyUpRouter(buildAppResonanceKeyboardCommandKeyUpRouterArgs({') &&
    app.includes('callsiteOwnerStillApp: true') &&
    app.includes('handlerBodyStillInlineInApp: true'),
  appStillOwnsHandlersListenersAndInlineBodies:
    keyboardInputEffectBoundaryExtracted || app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) =>') &&
    app.includes('const handleResonanceKeyUp = (event: KeyboardEvent) =>') &&
    app.includes('window.addEventListener("keydown", handleResonanceKeyDown);') &&
    app.includes('window.addEventListener("keyup", handleResonanceKeyUp);') &&
    app.includes('window.removeEventListener("keydown", handleResonanceKeyDown);') &&
    app.includes('window.removeEventListener("keyup", handleResonanceKeyUp);') &&
    app.includes('runtime: {') &&
    app.includes('actions: {') &&
    app.includes('runEnterWaveGesture: () => runEnterWaveHotkeyGesture(buildNexusRippleGestureRuntime())') &&
    app.includes('toggleKeyboardMirror: () => {') &&
    app.includes('keyboardMirrorRef.current = !keyboardMirrorRef.current;') &&
    app.includes('rootFollowInputTargetHzRef.current = targetHz;') &&
    app.includes('commitCursorY: commitResonanceCursorY'),
  appStillCoversAllRouterKeys:
    keyboardInputEffectBoundaryExtracted || keyDownRuntimeKeys.every((key) => app.includes(`${key}`) && inputRouter.includes(`${key}`)) &&
    keyDownActionKeys.every((key) => app.includes(`${key}`) && inputRouter.includes(`${key}`)) &&
    keyUpRuntimeKeys.every((key) => app.includes(`${key}`) && keyUpRouter.includes(`${key}`)) &&
    keyUpActionKeys.every((key) => app.includes(`${key}`) && keyUpRouter.includes(`${key}`)),
  arrowMotionRafAndStableLaneStillProtected:
    keyboardInputEffectBoundaryExtracted || ((app.includes('raf = requestAnimationFrame(tick);') &&
      (app.includes('commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });') ||
      app.includes('arrowMotionRafSource.actions.commitCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });'))) ||
      app.includes('useAppResonanceArrowMotionRaf({')) &&
    (app.includes('resolveStableRhythmLaneTimeWindow({') || app.includes('resolveStableRhythmLaneTimeWindow(stableRhythmLaneSchedulerSource.timeWindowArgs)')) &&
    (app.includes('buildStableRhythmLaneStepPlan({') || app.includes('buildStableRhythmLaneStepPlan(buildAppStableRhythmLaneSchedulerStepPlanArgs({')) &&
    (app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, {') || app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, stableRhythmLaneSchedulerActionPort)')) &&
    app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;'),
  monolithMapMarksCallsiteProbe:
    keyboardInputEffectBoundaryExtracted || monolithMap.includes("globalInputAndMetronome: {") &&
    (monolithMap.includes("status: 'adapter-callsite-probed'") ||
      monolithMap.includes("status: 'arrow-motion-raf-shape-audited'") ||
      monolithMap.includes("status: 'arrow-motion-raf-callsite-source-probed'") ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-callsite-source-probed'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-action-port-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-prestep-context-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-prestep-context-arg-builder-probed'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || ((monolithMap.includes("status: 'input-metronome-scaffolding-contracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'global-input-low-risk-hook-extracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'arrow-motion-raf-hook-extracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))))) &&
    (monolithMap.includes("splitTarget: 'resonance-keyboard-command-adapter-callsite-probe-layer'") ||
      monolithMap.includes("splitTarget: 'resonance-arrow-motion-raf-shape-audit-layer'") ||
      monolithMap.includes("splitTarget: 'resonance-arrow-motion-raf-callsite-source-layer'") ||
      monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-shape-audit-layer'") ||
      monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-callsite-source-probe-layer'") ||
      monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-action-port-shape-audit-layer'") ||
      monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-prestep-context-shape-audit-layer'") ||
      monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-prestep-context-arg-builder-probe-layer'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-cache-mutation-seam-audit-layer'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit'") || (monolithMap.includes("splitTarget: 'app-input-metronome-scaffolding-contraction-layer'") || monolithMap.includes("splitTarget: 'app-global-input-low-risk-hook-boundary'") || monolithMap.includes("splitTarget: 'app-arrow-motion-raf-hook-boundary'"))) &&
    monolithMap.includes('APP_RESONANCE_KEYBOARD_COMMAND_ADAPTER_CALLSITE_PROBE') &&
    (monolithMap.includes('buildAppStableRhythmLaneSchedulerPrestepContextArgs') || monolithMap.includes('buildAppStableRhythmLaneSchedulerPrestepContext')),
  guardListedInSanitySuite:
    suite.includes('Resonance keyboard command adapter callsite probe') &&
    suite.includes('xensonar:check-app-resonance-keyboard-command-adapter-callsite-probe'),
  guardListedInSanitySuiteContract:
    suiteContract.includes('xensonar:check-app-resonance-keyboard-command-adapter-callsite-probe'),
  appLineCountStillBounded: appLines <= 5625,
  probeLineCountStillSmall: probeLines <= 140,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  patch: '3.2.91.6.9.169_app_resonance_keyboard_command_adapter_callsite_probe',
  appLines,
  probeLines,
  runtimeMoved: false,
  audioMoved: false,
  schedulingMoved: false,
  handlerBodiesMoved: keyboardInputEffectBoundaryExtracted,
  failures,
};

if (failures.length) {
  console.error('[app-resonance-keyboard-command-adapter-callsite-probe] FAILED');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(report, null, 2));
