#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const auditPath = 'validation/contracts/xensonar/input/appResonanceKeyboardCommandAdapterShapeAudit.ts';
const inputRouterPath = 'src/features/xensonar/input/resonanceKeyboardInputRouter.ts';
const keyUpRouterPath = 'src/features/xensonar/input/resonanceKeyboardKeyUpRouter.ts';
const builderPath = 'src/features/xensonar/input/appGlobalInputAndMetronomeSourceBuilder.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const inputRouter = exists(inputRouterPath) ? read(inputRouterPath) : '';
const keyUpRouter = exists(keyUpRouterPath) ? read(keyUpRouterPath) : '';
const builder = exists(builderPath) ? read(builderPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;
const auditLines = audit.split(/\r?\n/).length;

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

const auditForbiddenNeedles = [
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

const forbiddenAdapterFiles = [
  'src/features/xensonar/input/useAppResonanceKeyboardCommandAdapter.ts',
  'src/features/xensonar/input/appResonanceKeyboardCommandAdapter.ts',
  'src/features/xensonar/input/useAppResonanceKeyboardCommandRuntimeBoundary.ts',
  'src/features/xensonar/input/appResonanceKeyboardCommandRuntime.ts',
];

const checks = {
  expectedFilesExist: [
    appPath,
    auditPath,
    inputRouterPath,
    keyUpRouterPath,
    builderPath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast168: /^3\.2\.91\.6\.9\.(16[8-9]|1[7-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-keyboard-command-adapter-shape-audit'] ===
    'node tools/check-app-resonance-keyboard-command-adapter-shape-audit.mjs',
  auditDeclaresTypedShapeOnly:
    audit.includes('APP_RESONANCE_KEYBOARD_COMMAND_ADAPTER_SHAPE_AUDIT') &&
    audit.includes('AppResonanceKeyboardCommandAdapterShapeAudit') &&
    audit.includes('adapterShapeOnly: true') &&
    audit.includes('handlerBodiesStillInlineInApp: true') &&
    audit.includes('eventListenersStillOwnedByAppEffect: true') &&
    audit.includes('runtimeOwned: false') &&
    audit.includes('audioOwned: false') &&
    audit.includes('schedulingOwned: false'),
  auditIsPureTypeAndConstLayer:
    audit.includes("import type {") &&
    audit.includes("from './resonanceKeyboardInputRouter'") &&
    audit.includes("from './resonanceKeyboardKeyUpRouter'") &&
    auditForbiddenNeedles.every((needle) => !audit.includes(needle)),
  auditCoversAllKeyDownRuntimeKeys:
    keyDownRuntimeKeys.every((key) => audit.includes(`'${key}'`)) &&
    keyDownRuntimeKeys.every((key) => inputRouter.includes(`${key}`)) &&
    audit.includes('satisfies readonly KeyDownRuntimeKey[]'),
  auditCoversAllKeyDownActionKeys:
    keyDownActionKeys.every((key) => audit.includes(`'${key}'`)) &&
    keyDownActionKeys.every((key) => inputRouter.includes(`${key}`)) &&
    audit.includes('satisfies readonly KeyDownActionKey[]'),
  auditCoversAllKeyUpKeys:
    keyUpRuntimeKeys.every((key) => audit.includes(`'${key}'`)) &&
    keyUpActionKeys.every((key) => audit.includes(`'${key}'`)) &&
    keyUpRuntimeKeys.every((key) => keyUpRouter.includes(`${key}`)) &&
    keyUpActionKeys.every((key) => keyUpRouter.includes(`${key}`)) &&
    audit.includes('satisfies readonly KeyUpRuntimeKey[]') &&
    audit.includes('satisfies readonly KeyUpActionKey[]'),
  auditMarksInlineClosuresAndRefReads:
    [
      'reportAudioReadyFailure',
      'runEnterWaveGesture',
      'toggleKeyboardMirror',
      'resetKeyboardWindow',
      'nowMs',
      'setRootFollowInputTargetHz',
      'params',
      'arrowState',
      'cursorY',
      'keyboardMirrorActive',
      'keyboardWindowOffset',
      'pitchLaneState',
    ].every((key) => audit.includes(`'${key}'`)),
  auditExplicitlyDoesNotMoveSensitivePaths:
    [
      'window keydown and keyup listener ownership',
      'handleResonanceKeyDown and handleResonanceKeyUp bodies',
      'ensureAudioReady/reportAudioReadyFailure command bridge',
      'runEnterWaveHotkeyGesture buildNexusRippleGestureRuntime closure',
      'keyboardMirrorRef and keyboardWindowOffsetRef mutations',
      'rootFollowInputTargetHzRef write path',
      'commitResonanceCursorY musical cursor contract',
      'arrow-motion requestAnimationFrame cursor loop',
      'stable rhythm lane scheduler and nexusRefs.current.nextAbsoluteStep ownership',
      'keyboard-command-adapter-callsite-probe-after-audit',
    ].every((needle) => audit.includes(needle)),
  appStillOwnsHandlersAndRouterCallBodies:
    app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) =>') &&
    app.includes('const handleResonanceKeyUp = (event: KeyboardEvent) =>') &&
    app.includes('window.addEventListener("keydown", handleResonanceKeyDown);') &&
    app.includes('window.addEventListener("keyup", handleResonanceKeyUp);') &&
    (app.includes('runResonanceKeyboardInputRouter({') || app.includes('runResonanceKeyboardInputRouter(buildAppResonanceKeyboardCommandKeyDownRouterArgs({')) &&
    (app.includes('runResonanceKeyboardKeyUpRouter({') || app.includes('runResonanceKeyboardKeyUpRouter(buildAppResonanceKeyboardCommandKeyUpRouterArgs({')) &&
    app.includes('runEnterWaveGesture: () => runEnterWaveHotkeyGesture(buildNexusRippleGestureRuntime())') &&
    app.includes('toggleKeyboardMirror: () => {') &&
    app.includes('keyboardMirrorRef.current = !keyboardMirrorRef.current;') &&
    app.includes('rootFollowInputTargetHzRef.current = targetHz;') &&
    app.includes('commitCursorY: commitResonanceCursorY'),
  noAdapterRuntimeIntroduced: forbiddenAdapterFiles.every((rel) => !exists(rel)),
  priorGlobalSourceBuilderStillKeepsHighRiskInline:
    builder.includes('resonanceKeyboardMusicalCommand') &&
    builder.includes('handlerBodiesStillInline: true') &&
    builder.includes('ownsRuntime: false') &&
    builder.includes('ownsAudio: false') &&
    builder.includes('ownsScheduling: false'),
  arrowMotionRafAndStableLaneStillProtected:
    ((app.includes('raf = requestAnimationFrame(tick);') &&
      (app.includes('commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });') ||
      app.includes('arrowMotionRafSource.actions.commitCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });'))) ||
      app.includes('useAppResonanceArrowMotionRaf({')) &&
    (app.includes('resolveStableRhythmLaneTimeWindow({') || app.includes('resolveStableRhythmLaneTimeWindow(stableRhythmLaneSchedulerSource.timeWindowArgs)')) &&
    (app.includes('buildStableRhythmLaneStepPlan({') || app.includes('buildStableRhythmLaneStepPlan(buildAppStableRhythmLaneSchedulerStepPlanArgs({')) &&
    (app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, {') || app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, stableRhythmLaneSchedulerActionPort)')) &&
    app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;'),
  monolithMapMarksAdapterShapeAudit:
    monolithMap.includes("globalInputAndMetronome: {") &&
    (monolithMap.includes("status: 'adapter-shape-audited'") ||
      monolithMap.includes("status: 'adapter-callsite-probed'") ||
      monolithMap.includes("status: 'arrow-motion-raf-shape-audited'") ||
      monolithMap.includes("status: 'arrow-motion-raf-callsite-source-probed'") ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-callsite-source-probed'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-action-port-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-prestep-context-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-prestep-context-arg-builder-probed'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || ((monolithMap.includes("status: 'input-metronome-scaffolding-contracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'global-input-low-risk-hook-extracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'arrow-motion-raf-hook-extracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))))) &&
    (monolithMap.includes("splitTarget: 'resonance-keyboard-command-adapter-shape-audit-layer'") ||
      monolithMap.includes("splitTarget: 'resonance-keyboard-command-adapter-callsite-probe-layer'") ||
      monolithMap.includes("splitTarget: 'resonance-arrow-motion-raf-shape-audit-layer'") ||
      monolithMap.includes("splitTarget: 'resonance-arrow-motion-raf-callsite-source-layer'") ||
      monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-shape-audit-layer'") ||
      monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-callsite-source-probe-layer'") ||
      monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-action-port-shape-audit-layer'") ||
      monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-prestep-context-shape-audit-layer'") ||
      monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-prestep-context-arg-builder-probe-layer'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-cache-mutation-seam-audit-layer'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit'") || (monolithMap.includes("splitTarget: 'app-input-metronome-scaffolding-contraction-layer'") || monolithMap.includes("splitTarget: 'app-global-input-low-risk-hook-boundary'") || monolithMap.includes("splitTarget: 'app-arrow-motion-raf-hook-boundary'"))) &&
    monolithMap.includes('APP_RESONANCE_KEYBOARD_COMMAND_ADAPTER_SHAPE_AUDIT') &&
    (monolithMap.includes('buildAppStableRhythmLaneSchedulerPrestepContextArgs') || monolithMap.includes('buildAppStableRhythmLaneSchedulerPrestepContext')),
  guardListedInSanitySuite:
    suite.includes('Resonance keyboard command adapter shape audit') &&
    suite.includes('xensonar:check-app-resonance-keyboard-command-adapter-shape-audit'),
  guardListedInSanitySuiteContract:
    suiteContract.includes('xensonar:check-app-resonance-keyboard-command-adapter-shape-audit'),
  appLineCountUnchangedEnoughForAudit: appLines <= 5625,
  auditLineCountSmallEnoughForShapeLayer: auditLines <= 180,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  patch: '3.2.91.6.9.168_app_resonance_keyboard_command_adapter_shape_audit',
  appLines,
  auditLines,
  keyDownRuntimeKeyCount: keyDownRuntimeKeys.length,
  keyDownActionKeyCount: keyDownActionKeys.length,
  keyUpRuntimeKeyCount: keyUpRuntimeKeys.length,
  keyUpActionKeyCount: keyUpActionKeys.length,
  runtimeMoved: false,
  audioMoved: false,
  schedulingMoved: false,
  handlersMoved: false,
  failures,
  checks,
};

if (failures.length) {
  console.error('[check-app-resonance-keyboard-command-adapter-shape-audit] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('[check-app-resonance-keyboard-command-adapter-shape-audit] ok');
console.log(JSON.stringify(report, null, 2));
