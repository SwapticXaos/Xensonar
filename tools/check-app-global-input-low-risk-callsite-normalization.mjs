#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const builderPath = 'src/features/xensonar/input/appGlobalInputAndMetronomeSourceBuilder.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const previousGuardPath = 'tools/check-app-global-input-and-metronome-source-builder-probe.mjs';

const app = exists(appPath) ? read(appPath) : '';
const builder = exists(builderPath) ? read(builderPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const previousGuard = exists(previousGuardPath) ? read(previousGuardPath) : '';

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

const checks = {
  expectedFilesExist: [
    appPath,
    builderPath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
    previousGuardPath,
  ].every(exists),
  packageVersionAtLeast167: /^3\.2\.91\.6\.9\.(16[7-9]|1[7-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-global-input-low-risk-callsite-normalization'] ===
    'node tools/check-app-global-input-low-risk-callsite-normalization.mjs',
  builderDeclaresLowRiskNormalizer:
    builder.includes('APP_GLOBAL_INPUT_LOW_RISK_CALLSITE_NORMALIZATION_PROBE') &&
    builder.includes('normalizeAppGlobalInputLowRiskCallsites') &&
    builder.includes('AppGlobalInputLowRiskCallsiteNormalization') &&
    builder.includes('normalizesOnlyLowRiskCallsites: true') &&
    builder.includes('highRiskBodiesStillInlineInApp: true'),
  builderMapsOnlyLowRiskCallsites:
    builder.includes('resonanceKeyCaptureGate: {') &&
    builder.includes('source.inputIndicatorAndCaptureGate.resonanceInputActive') &&
    builder.includes('source.inputIndicatorAndCaptureGate.nexusParamsRef') &&
    builder.includes('globalBrowserInput: {') &&
    builder.includes('source.globalBrowserContainment.gameInputActive') &&
    builder.includes('source.globalBrowserContainment.resonanceInputActive') &&
    builder.includes('source.globalBrowserContainment.keyRef') &&
    builder.includes('stableMetronomeVisualPulse: source.stableMetronomeVisualPulse'),
  builderStillSourceOnly:
    builder.includes('ownsRuntime: false') &&
    builder.includes('ownsAudio: false') &&
    builder.includes('ownsScheduling: false') &&
    builderForbiddenNeedles.every((needle) => !builder.includes(needle)),
  appImportsAndUsesNormalizer:
    (
      app.includes('buildAppGlobalInputLowRiskCallsites') &&
      app.includes('const appGlobalInputLowRiskCallsites = buildAppGlobalInputLowRiskCallsites({') &&
      app.includes('useResonanceKeyCaptureGate(appGlobalInputLowRiskCallsites.resonanceKeyCaptureGate);') &&
      app.includes('useAppGlobalBrowserInputCallsiteBoundary(appGlobalInputLowRiskCallsites.globalBrowserInput);') &&
      app.includes('metronomePulse: appGlobalInputLowRiskCallsites.stableMetronomeVisualPulse.metronomePulse')
    ) || (
      app.includes('useAppGlobalInputLowRiskKeyCaptureBoundary({') &&
      app.includes('useAppGlobalInputLowRiskBrowserBoundary(appGlobalInputLowRiskBoundary);') &&
      app.includes('metronomePulse: appGlobalInputLowRiskBoundary.metronomePulse')
    ),
  appNoLongerExpandsLowRiskHookArgsInline:
    !app.includes('useResonanceKeyCaptureGate({\n    resonanceInputActive: appGlobalInputAndMetronomeSource.inputIndicatorAndCaptureGate.resonanceInputActive') &&
    !app.includes('useAppGlobalBrowserInputCallsiteBoundary({\n    gameInputActive: appGlobalInputAndMetronomeSource.globalBrowserContainment.gameInputActive'),
  appStillOwnsKeyboardMusicalCommandBodies:
    app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) =>') &&
    app.includes('const handleResonanceKeyUp = (event: KeyboardEvent) =>') &&
    (app.includes('runResonanceKeyboardInputRouter({') || app.includes('runResonanceKeyboardInputRouter(buildAppResonanceKeyboardCommandKeyDownRouterArgs({')) &&
    (app.includes('runResonanceKeyboardKeyUpRouter({') || app.includes('runResonanceKeyboardKeyUpRouter(buildAppResonanceKeyboardCommandKeyUpRouterArgs({')) &&
    app.includes('runEnterWaveHotkeyGesture(buildNexusRippleGestureRuntime())'),
  arrowMotionRafBoundaryStillPresent:
    (app.includes('nexusArrowRef.current.left') &&
      app.includes('nexusArrowRef.current.right') &&
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
  monolithMapMarksLowRiskNormalization:
    monolithMap.includes("globalInputAndMetronome: {") &&
    (monolithMap.includes("status: 'low-risk-callsite-normalized'") ||
      monolithMap.includes("status: 'adapter-shape-audited'") ||
      monolithMap.includes("status: 'adapter-callsite-probed'") ||
      monolithMap.includes("status: 'arrow-motion-raf-shape-audited'") ||
      monolithMap.includes("status: 'arrow-motion-raf-callsite-source-probed'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-callsite-source-probed'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-action-port-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-prestep-context-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-prestep-context-arg-builder-probed'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || ((monolithMap.includes("status: 'input-metronome-scaffolding-contracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'global-input-low-risk-hook-extracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'arrow-motion-raf-hook-extracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))))) &&
    (monolithMap.includes("splitTarget: 'global-input-and-metronome-low-risk-callsite-normalization-layer'") ||
      monolithMap.includes("splitTarget: 'resonance-keyboard-command-adapter-shape-audit-layer'") ||
      monolithMap.includes("splitTarget: 'resonance-keyboard-command-adapter-callsite-probe-layer'") ||
      monolithMap.includes("splitTarget: 'resonance-arrow-motion-raf-shape-audit-layer'") ||
      monolithMap.includes("splitTarget: 'resonance-arrow-motion-raf-callsite-source-layer'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-shape-audit-layer'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-callsite-source-probe-layer'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-action-port-shape-audit-layer'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-prestep-context-shape-audit-layer'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-prestep-context-arg-builder-probe-layer'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-cache-mutation-seam-audit-layer'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit'") || (monolithMap.includes("splitTarget: 'app-input-metronome-scaffolding-contraction-layer'") || monolithMap.includes("splitTarget: 'app-global-input-low-risk-hook-boundary'") || monolithMap.includes("splitTarget: 'app-arrow-motion-raf-hook-boundary'"))) &&
    (monolithMap.includes('not extract handler bodies or stable-lane scheduling') || monolithMap.includes('handler-body, or stable-lane scheduling extraction') || monolithMap.includes('handler-body, action-port closure, or stable-lane scheduling extraction') || monolithMap.includes('handler-body, action-port closure, pre-step context ownership, or stable-lane scheduling extraction') || monolithMap.includes('not extract stable-lane ownership')),
  guardListedInSanitySuite:
    suite.includes('Global input low-risk callsite normalization') &&
    suite.includes('xensonar:check-app-global-input-low-risk-callsite-normalization'),
  guardListedInSanitySuiteContract:
    suiteContract.includes('xensonar:check-app-global-input-low-risk-callsite-normalization'),
  previousBuilderGuardAcceptsNormalizedFollowup:
    previousGuard.includes('appGlobalInputLowRiskCallsites.resonanceKeyCaptureGate') &&
    (previousGuard.includes("status: 'low-risk-callsite-normalized'") ||
      previousGuard.includes("status: 'adapter-shape-audited'") ||
      previousGuard.includes("status: 'adapter-callsite-probed'") ||
      previousGuard.includes("status: 'arrow-motion-raf-shape-audited'") ||
      previousGuard.includes("status: 'stable-rhythm-lane-scheduler-shape-audited'") ||
      previousGuard.includes("status: 'stable-rhythm-lane-scheduler-callsite-source-probed'") ||
      (previousGuard.includes("status: 'stable-rhythm-lane-scheduler-prestep-context-arg-builder-probed'") || previousGuard.includes("status: 'stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audited'") || (previousGuard.includes("status: 'input-metronome-scaffolding-contracted'") || previousGuard.includes("status: 'global-input-low-risk-hook-extracted'")))) &&
    (previousGuard.includes('global-input-and-metronome-low-risk-callsite-normalization-layer') ||
      previousGuard.includes('resonance-keyboard-command-adapter-shape-audit-layer') ||
      previousGuard.includes('stable-rhythm-lane-scheduler-shape-audit-layer') ||
      previousGuard.includes('stable-rhythm-lane-scheduler-callsite-source-probe-layer') ||
      previousGuard.includes('stable-rhythm-lane-scheduler-prestep-context-arg-builder-probe-layer') || previousGuard.includes('stable-rhythm-lane-scheduler-cache-mutation-seam-audit-layer') ||
      previousGuard.includes('resonance-keyboard-command-adapter-callsite-probe-layer') ||
      previousGuard.includes('resonance-arrow-motion-raf-shape-audit-layer')),
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  patch: '3.2.91.6.9.167_app_global_input_low_risk_callsite_normalization',
  appLines: app.split(/\r?\n/).length,
  builderLines: builder.split(/\r?\n/).length,
  runtimeMoved: false,
  audioMoved: false,
  schedulingMoved: false,
  normalizedOnlyLowRiskCallsites: true,
  failures,
  checks,
};

if (failures.length) {
  console.error('[check-app-global-input-low-risk-callsite-normalization] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('[check-app-global-input-low-risk-callsite-normalization] ok');
console.log(JSON.stringify(report, null, 2));
