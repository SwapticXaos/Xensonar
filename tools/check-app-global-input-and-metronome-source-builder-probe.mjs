#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const builderPath = 'src/features/xensonar/input/appGlobalInputAndMetronomeSourceBuilder.ts';
const readinessPath = 'validation/contracts/xensonar/input/appGlobalInputAndMetronomeSourceReadinessAudit.ts';
const globalBoundaryPath = 'src/features/xensonar/input/useAppGlobalBrowserInputCallsiteBoundary.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const builder = exists(builderPath) ? read(builderPath) : '';
const hook = exists('src/features/xensonar/input/useAppGlobalInputLowRiskBoundary.ts') ? read('src/features/xensonar/input/useAppGlobalInputLowRiskBoundary.ts') : '';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const globalBoundary = exists(globalBoundaryPath) ? read(globalBoundaryPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;
const builderLines = builder.split(/\r?\n/).length;

const lowRiskAppSourceKeys = [
  'activationGate',
  'globalBrowserContainment',
  'inputIndicatorAndCaptureGate',
  'stableMetronomeVisualPulse',
];
const highRiskInlineSourceKeys = [
  'resonanceKeyboardMusicalCommand',
  'resonanceArrowMotionRaf',
  'stableRhythmLaneScheduler',
];
const sourceKeys = [...lowRiskAppSourceKeys, ...highRiskInlineSourceKeys];

const builderForbiddenNeedles = [
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
  'executeStableRhythmLaneStepPlan(',
  'scheduleExportedDrumConfigStep(',
  'scheduleRhythmForgeDrumStep(',
  'scheduleClassicBassPatternStep(',
  'schedulePsyBassStep(',
  'playBassNote(',
  'runResonanceKeyboardInputRouter(',
  'runResonanceKeyboardKeyUpRouter(',
  'commitResonanceCursorY(',
  '.current =',
];

const runtimeBridgeForbiddenPaths = [
  'src/features/xensonar/input/useAppGlobalInputAndMetronomeRuntimeBoundary.ts',
  'src/features/xensonar/input/useAppGlobalInputAndMetronomeAssembly.ts',
  'src/features/xensonar/input/appResonanceKeyboardCommandRuntime.ts',
  'src/features/xensonar/rooms/appStableRhythmLaneSchedulerSourceBuilder.ts',
];

const checks = {
  expectedFilesExist: [
    appPath,
    builderPath,
    readinessPath,
    globalBoundaryPath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast166: /^3\.2\.91\.6\.9\.(16[6-9]|1[7-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-global-input-and-metronome-source-builder-probe'] ===
    'node tools/check-app-global-input-and-metronome-source-builder-probe.mjs',
  builderDeclaresProbeAndBuildFunction:
    builder.includes('APP_GLOBAL_INPUT_AND_METRONOME_SOURCE_BUILDER_PROBE') &&
    builder.includes('buildAppGlobalInputAndMetronomeSource') &&
    builder.includes('BuildAppGlobalInputAndMetronomeSourceInput') &&
    sourceKeys.every((key) => builder.includes(key)),
  builderIsSourceOnly:
    builder.includes('ownsRuntime: false') &&
    builder.includes('ownsAudio: false') &&
    builder.includes('ownsScheduling: false') &&
    builder.includes('onlyGroupsPreparedSources: true') &&
    builderForbiddenNeedles.every((needle) => !builder.includes(needle)),
  builderExplicitlyKeepsHighRiskBodiesInline:
    builder.includes('resonance keydown and keyup handler bodies') &&
    builder.includes('arrow-motion requestAnimationFrame cursor loop') &&
    builder.includes('stable rhythm lane scheduler loop') &&
    builder.includes('nexusRefs.current.nextAbsoluteStep ownership'),
  appImportsAndUsesBuilder:
    (
      app.includes('buildAppGlobalInputLowRiskCallsites') &&
      app.includes('./features/xensonar/input/appGlobalInputAndMetronomeSourceBuilder') &&
      app.includes('const appGlobalInputLowRiskCallsites = buildAppGlobalInputLowRiskCallsites({')
    ) || (
      app.includes('useAppGlobalInputLowRiskKeyCaptureBoundary') &&
      hook.includes('buildAppGlobalInputLowRiskCallsites(args)')
    ) &&
    highRiskInlineSourceKeys.every((key) => builder.includes(key)),
  appUsesSourceForLowRiskCallsites:
    (
      (app.includes('appGlobalInputAndMetronomeSource.inputIndicatorAndCaptureGate.resonanceInputActive') ||
        app.includes('appGlobalInputLowRiskCallsites.resonanceKeyCaptureGate')) &&
      (app.includes('appGlobalInputAndMetronomeSource.inputIndicatorAndCaptureGate.nexusParamsRef') ||
        app.includes('useResonanceKeyCaptureGate(appGlobalInputLowRiskCallsites.resonanceKeyCaptureGate)')) &&
      (app.includes('appGlobalInputAndMetronomeSource.globalBrowserContainment.gameInputActive') ||
        app.includes('appGlobalInputLowRiskCallsites.globalBrowserInput')) &&
      (app.includes('appGlobalInputAndMetronomeSource.globalBrowserContainment.resonanceInputActive') ||
        app.includes('appGlobalInputLowRiskCallsites.globalBrowserInput')) &&
      (app.includes('appGlobalInputAndMetronomeSource.globalBrowserContainment.keyRef') ||
        app.includes('useAppGlobalBrowserInputCallsiteBoundary(appGlobalInputLowRiskCallsites.globalBrowserInput)'))
    ) || (
      app.includes('useAppGlobalInputLowRiskKeyCaptureBoundary({') &&
      app.includes('useAppGlobalInputLowRiskBrowserBoundary(appGlobalInputLowRiskBoundary);') &&
      hook.includes('useResonanceKeyCaptureGate(callsites.resonanceKeyCaptureGate);') &&
      hook.includes('useAppGlobalBrowserInputCallsiteBoundary(boundary.globalBrowserInput);')
    ),
  appStillOwnsKeyboardMusicalCommandBodies:
    app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) =>') &&
    app.includes('const handleResonanceKeyUp = (event: KeyboardEvent) =>') &&
    (app.includes('runResonanceKeyboardInputRouter({') || app.includes('runResonanceKeyboardInputRouter(buildAppResonanceKeyboardCommandKeyDownRouterArgs({')) &&
    (app.includes('runResonanceKeyboardKeyUpRouter({') || app.includes('runResonanceKeyboardKeyUpRouter(buildAppResonanceKeyboardCommandKeyUpRouterArgs({')) &&
    app.includes('runEnterWaveHotkeyGesture(buildNexusRippleGestureRuntime())') &&
    app.includes('commitCursorY: commitResonanceCursorY') &&
    app.includes('recordAdaptiveAction: recordAudioPressureAdaptiveAction'),
  arrowMotionRafBoundaryStillPresent:
    (app.includes('nexusArrowRef.current.left') &&
      app.includes('nexusArrowRef.current.right') &&
      app.includes('nexusArrowRef.current.up') &&
      app.includes('nexusArrowRef.current.down') &&
      app.includes('raf = requestAnimationFrame(tick);') &&
      (app.includes('commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });') ||
      app.includes('arrowMotionRafSource.actions.commitCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });'))) ||
    app.includes('useAppResonanceArrowMotionRaf({'), 
  appStillOwnsStableRhythmLaneScheduling:
    (app.includes('resolveStableRhythmLaneTimeWindow({') || app.includes('resolveStableRhythmLaneTimeWindow(stableRhythmLaneSchedulerSource.timeWindowArgs)')) &&
    (app.includes('buildStableRhythmLaneStepPlan({') || app.includes('buildStableRhythmLaneStepPlan(buildAppStableRhythmLaneSchedulerStepPlanArgs({')) &&
    (app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, {') || app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, stableRhythmLaneSchedulerActionPort)')) &&
    app.includes('scheduleDrumStep: (plan) => {') &&
    app.includes('scheduleBassStep: (plan) => {') &&
    app.includes('applyMyzelStep: (plan) => {') &&
    app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;'),
  noRuntimeBridgeIntroduced: runtimeBridgeForbiddenPaths.every((rel) => !exists(rel)),
  globalBoundaryRemainsContainmentOnly:
    globalBoundary.includes('useGlobalScrollCapture();') &&
    globalBoundary.includes('useGlobalArrowCapture({ gameInputActive, resonanceInputActive });') &&
    globalBoundary.includes('useGameInputBridge({ gameInputActive, keyRef });') &&
    !globalBoundary.includes('runResonanceKeyboardInputRouter') &&
    !globalBoundary.includes('scheduleStableRhythmMetronomePulse'),
  readinessAuditStillWarnsAgainstPrematureExtraction:
    readiness.includes('resonanceKeyboardMusicalCommandSource') &&
    readiness.includes('resonanceArrowMotionRafSource') &&
    readiness.includes('stableRhythmLaneSchedulerSource') &&
    readiness.includes('sourceOwnerStillApp: true') &&
    readiness.includes('not safe to extract') &&
    readiness.includes('keepsStableRhythmSchedulingInApp: true'),
  monolithMapMarksBuilderProbe:
    monolithMap.includes("globalInputAndMetronome: {") &&
    (monolithMap.includes("status: 'source-builder-probed'") ||
      monolithMap.includes("status: 'low-risk-callsite-normalized'") ||
      monolithMap.includes("status: 'adapter-shape-audited'") ||
      monolithMap.includes("status: 'adapter-callsite-probed'") ||
      monolithMap.includes("status: 'arrow-motion-raf-shape-audited'") ||
      monolithMap.includes("status: 'arrow-motion-raf-callsite-source-probed'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-callsite-source-probed'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-action-port-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-prestep-context-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-prestep-context-arg-builder-probed'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || ((monolithMap.includes("status: 'input-metronome-scaffolding-contracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'global-input-low-risk-hook-extracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'arrow-motion-raf-hook-extracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))))) &&
    (monolithMap.includes("splitTarget: 'global-input-and-metronome-source-builder-layer'") ||
      monolithMap.includes("splitTarget: 'global-input-and-metronome-low-risk-callsite-normalization-layer'") ||
      monolithMap.includes("splitTarget: 'resonance-keyboard-command-adapter-shape-audit-layer'") ||
      monolithMap.includes("splitTarget: 'resonance-keyboard-command-adapter-callsite-probe-layer'") ||
      monolithMap.includes("splitTarget: 'resonance-arrow-motion-raf-shape-audit-layer'") ||
      monolithMap.includes("splitTarget: 'resonance-arrow-motion-raf-callsite-source-layer'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-shape-audit-layer'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-callsite-source-probe-layer'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-action-port-shape-audit-layer'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-prestep-context-shape-audit-layer'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-prestep-context-arg-builder-probe-layer'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-cache-mutation-seam-audit-layer'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit'") || (monolithMap.includes("splitTarget: 'app-input-metronome-scaffolding-contraction-layer'") || monolithMap.includes("splitTarget: 'app-global-input-low-risk-hook-boundary'") || monolithMap.includes("splitTarget: 'app-arrow-motion-raf-hook-boundary'"))) &&
    (monolithMap.includes('not keyboard-command or stable-lane scheduling extraction') ||
      monolithMap.includes('not extract handler bodies or stable-lane scheduling') ||
      monolithMap.includes('handler-body, or stable-lane scheduling extraction') ||
      monolithMap.includes('handler-body, action-port closure, or stable-lane scheduling extraction') || monolithMap.includes('handler-body, action-port closure, pre-step context ownership, or stable-lane scheduling extraction') || monolithMap.includes('not extract stable-lane ownership')),
  guardListedInSanitySuite:
    suite.includes('Global input and metronome source builder probe') &&
    suite.includes('xensonar:check-app-global-input-and-metronome-source-builder-probe'),
  guardListedInSanitySuiteContract:
    suiteContract.includes('xensonar:check-app-global-input-and-metronome-source-builder-probe'),
  appLineCountStayedNearSourceProbeRange: appLines <= 5625,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  patch: '3.2.91.6.9.166_app_global_input_and_metronome_source_builder_probe',
  appLines,
  builderLines,
  sourceKeys,
  sourceOnly: true,
  runtimeMoved: false,
  audioMoved: false,
  schedulingMoved: false,
  failures,
  checks,
};

if (failures.length) {
  console.error('[check-app-global-input-and-metronome-source-builder-probe] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('[check-app-global-input-and-metronome-source-builder-probe] ok');
console.log(JSON.stringify(report, null, 2));
