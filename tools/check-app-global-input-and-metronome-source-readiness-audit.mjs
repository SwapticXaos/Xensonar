#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const auditPath = 'validation/contracts/xensonar/input/appGlobalInputAndMetronomeSourceReadinessAudit.ts';
const globalBoundaryPath = 'src/features/xensonar/input/useAppGlobalBrowserInputCallsiteBoundary.ts';
const inputShapePath = 'validation/contracts/xensonar/input/appInputMetronomeShapeAudit.ts';
const inputDependencyPath = 'validation/contracts/xensonar/input/appInputMetronomeDependencyAudit.ts';
const metronomeHookPath = 'src/features/xensonar/rooms/useStableRhythmMetronomePulse.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const globalBoundary = exists(globalBoundaryPath) ? read(globalBoundaryPath) : '';
const inputShape = exists(inputShapePath) ? read(inputShapePath) : '';
const inputDependency = exists(inputDependencyPath) ? read(inputDependencyPath) : '';
const metronomeHook = exists(metronomeHookPath) ? read(metronomeHookPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const appLines = app.split(/\r?\n/).length;
const auditLines = audit.split(/\r?\n/).length;
const keys = [
  'activationGateSource',
  'globalBrowserContainmentSource',
  'inputIndicatorAndCaptureGateSource',
  'resonanceKeyboardMusicalCommandSource',
  'resonanceArrowMotionRafSource',
  'stableMetronomeVisualPulseSource',
  'stableRhythmLaneSchedulerSource',
];

function blockFor(text, key) {
  const start = text.indexOf(`  ${key}: {\n    key: '${key}',`);
  if (start < 0) return '';
  const nextStarts = keys
    .filter((other) => other !== key)
    .map((other) => text.indexOf(`  ${other}: {\n    key: '${other}',`, start + 1))
    .filter((idx) => idx > start);
  const end = nextStarts.length ? Math.min(...nextStarts) : text.indexOf('} as const satisfies Record', start);
  return text.slice(start, end > start ? end : undefined);
}

const runtimeForbiddenPaths = [
  'src/features/xensonar/input/useAppGlobalInputAndMetronomeRuntimeBoundary.ts',
  'src/features/xensonar/input/useAppGlobalInputAndMetronomeAssembly.ts',
  'src/features/xensonar/input/appResonanceKeyboardCommandRuntime.ts',
  'src/features/xensonar/rooms/appStableRhythmLaneSchedulerSourceBuilder.ts',
];

const nonOwnershipNeedles = [
  'readinessOnly: true',
  'sourceOwnerStillApp: true',
  'mayExtractBeforeDedicatedBuilder: false',
  "candidateBuilderName: 'buildAppGlobalInputAndMetronomeSource'",
  'ownsRuntime: false',
  'ownsAudio: false',
  'ownsPackagePersistence: false',
  'ownsRoomLifecycle: false',
  'visibleUiChangedByAudit: false',
];

const highRiskBlocks = [
  blockFor(audit, 'resonanceKeyboardMusicalCommandSource'),
  blockFor(audit, 'resonanceArrowMotionRafSource'),
  blockFor(audit, 'stableRhythmLaneSchedulerSource'),
];

const checks = {
  expectedFilesExist: [
    appPath,
    auditPath,
    globalBoundaryPath,
    inputShapePath,
    inputDependencyPath,
    metronomeHookPath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast165: /^3\.2\.91\.6\.9\.(16[5-9]|1[7-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-global-input-and-metronome-source-readiness-audit'] ===
    'node tools/check-app-global-input-and-metronome-source-readiness-audit.mjs',
  auditDeclaresKeysAndSummary:
    audit.includes('APP_GLOBAL_INPUT_AND_METRONOME_SOURCE_READINESS_KEYS') &&
    audit.includes('APP_GLOBAL_INPUT_AND_METRONOME_SOURCE_READINESS_AUDIT') &&
    audit.includes('APP_GLOBAL_INPUT_AND_METRONOME_SOURCE_READINESS_SUMMARY') &&
    audit.includes('APP_GLOBAL_INPUT_AND_METRONOME_SOURCE_READINESS_PROBE') &&
    keys.every((key) => audit.includes(`'${key}'`) && audit.includes(`key: '${key}'`)),
  auditGroupsHaveNonOwnershipFlags: keys.every((key) => {
    const block = blockFor(audit, key);
    return block && nonOwnershipNeedles.every((needle) => block.includes(needle));
  }),
  highRiskGroupsMarkedHighAndAppVisible:
    highRiskBlocks.every((block) => block.includes("risk: 'high'") && block.includes('sourceOwnerStillApp: true')),
  auditNamesCurrentSourceSeams:
    [
      'useAppGlobalBrowserInputCallsiteBoundary',
      'useResonanceInputIndicator',
      'useResonanceKeyCaptureGate',
      'runResonanceKeyboardInputRouter',
      'runResonanceKeyboardKeyUpRouter',
      'useStableRhythmMetronomePulse',
      'resolveStableRhythmLaneTimeWindow',
      'buildStableRhythmLaneStepPlan',
      'executeStableRhythmLaneStepPlan',
      'scheduleStableRhythmMetronomePulse',
      'clearStableRhythmMetronomeTimeouts',
      'commitResonanceCursorY',
      'setRootFollowInputTargetHz',
    ].every((needle) => audit.includes(needle)),
  appStillOwnsInputActivationAndContainment:
    app.includes('const resonanceInputActive = room === "RESONANCE" && nexusActive;') &&
    app.includes('const gameInputActive = room === "GAME";') &&
    app.includes('const resonanceInputIndicator = useResonanceInputIndicator(resonanceInputActive);') &&
    (app.includes('useResonanceKeyCaptureGate({') ||
      app.includes('useResonanceKeyCaptureGate(appGlobalInputLowRiskCallsites.resonanceKeyCaptureGate)') ||
      app.includes('useAppGlobalInputLowRiskKeyCaptureBoundary({')) &&
    (app.includes('useAppGlobalBrowserInputCallsiteBoundary({') ||
      app.includes('useAppGlobalBrowserInputCallsiteBoundary(appGlobalInputLowRiskCallsites.globalBrowserInput)') ||
      app.includes('useAppGlobalInputLowRiskBrowserBoundary(appGlobalInputLowRiskBoundary);')) &&
    (app.includes('appGlobalInputAndMetronomeSource.inputIndicatorAndCaptureGate.resonanceInputActive') ||
      app.includes('appGlobalInputLowRiskCallsites.resonanceKeyCaptureGate') ||
      app.includes('appGlobalInputLowRiskBoundary')) &&
    (app.includes('appGlobalInputAndMetronomeSource.globalBrowserContainment.gameInputActive') ||
      app.includes('appGlobalInputLowRiskCallsites.globalBrowserInput') ||
      app.includes('appGlobalInputLowRiskBoundary')),
  appStillOwnsKeyboardMusicalCommandBody:
    app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) =>') &&
    (app.includes('runResonanceKeyboardInputRouter({') || app.includes('runResonanceKeyboardInputRouter(buildAppResonanceKeyboardCommandKeyDownRouterArgs({')) &&
    (app.includes('runResonanceKeyboardKeyUpRouter({') || app.includes('runResonanceKeyboardKeyUpRouter(buildAppResonanceKeyboardCommandKeyUpRouterArgs({')) &&
    app.includes('runEnterWaveHotkeyGesture(buildNexusRippleGestureRuntime())') &&
    app.includes('setRootFollowInputTargetHz: (targetHz) => {') &&
    app.includes('recordAdaptiveAction: recordAudioPressureAdaptiveAction') &&
    app.includes('commitCursorY: commitResonanceCursorY'),
  arrowMotionRafBoundaryStillPresent:
    ((app.includes('if (!resonanceInputActive) return;\n    let raf = 0;') ||
      app.includes('if (!arrowMotionRafSource.effectGate.resonanceInputActive) return;\n    let raf = 0;')) &&
      app.includes('nexusArrowRef.current.left') &&
      app.includes('nexusArrowRef.current.right') &&
      app.includes('nexusArrowRef.current.up') &&
      app.includes('nexusArrowRef.current.down') &&
      app.includes('requestAnimationFrame(tick)') &&
      (app.includes('commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });') ||
      app.includes('arrowMotionRafSource.actions.commitCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });'))) ||
    app.includes('useAppResonanceArrowMotionRaf({'), 
  appStillOwnsStableRhythmScheduling:
    (app.includes('resolveStableRhythmLaneTimeWindow({') || app.includes('resolveStableRhythmLaneTimeWindow(stableRhythmLaneSchedulerSource.timeWindowArgs)')) &&
    (app.includes('buildStableRhythmLaneStepPlan({') || app.includes('buildStableRhythmLaneStepPlan(buildAppStableRhythmLaneSchedulerStepPlanArgs({')) &&
    (app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, {') || app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, stableRhythmLaneSchedulerActionPort)')) &&
    app.includes('scheduleMetronomePulse: (plan) => {') &&
    app.includes('scheduleDrumStep: (plan) => {') &&
    app.includes('scheduleBassStep: (plan) => {') &&
    app.includes('applyMyzelStep: (plan) => {') &&
    app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;') &&
    app.includes('clearStableRhythmMetronomeTimeouts();'),
  existingBoundariesRemainNarrow:
    globalBoundary.includes('useGlobalScrollCapture();') &&
    globalBoundary.includes('useGlobalArrowCapture({ gameInputActive, resonanceInputActive });') &&
    globalBoundary.includes('useGameInputBridge({ gameInputActive, keyRef });') &&
    globalBoundary.includes('appStillOwnsResonanceHotkeyBody: true') &&
    !globalBoundary.includes('runResonanceKeyboardInputRouter') &&
    !globalBoundary.includes('scheduleStableRhythmMetronomePulse'),
  inputMetronomeAuditsRemainRegistered:
    inputShape.includes('APP_INPUT_METRONOME_CONTRACT') &&
    inputDependency.includes('APP_INPUT_METRONOME_DEPENDENCY_AUDIT') &&
    metronomeHook.includes('useStableRhythmMetronomePulse'),
  noPrematureRuntimeIntroduced: runtimeForbiddenPaths.every((rel) => !exists(rel)),
  monolithMapUpdatedForGlobalInputReadiness:
    monolithMap.includes("globalInputAndMetronome: {") &&
    (monolithMap.includes("status: 'source-readiness-audited'") ||
      monolithMap.includes("status: 'source-builder-probed'") ||
      monolithMap.includes("status: 'low-risk-callsite-normalized'") ||
      monolithMap.includes("status: 'adapter-shape-audited'") ||
      monolithMap.includes("status: 'adapter-callsite-probed'") ||
      monolithMap.includes("status: 'arrow-motion-raf-shape-audited'") ||
      monolithMap.includes("status: 'arrow-motion-raf-callsite-source-probed'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-callsite-source-probed'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-action-port-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-prestep-context-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-prestep-context-arg-builder-probed'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || ((monolithMap.includes("status: 'input-metronome-scaffolding-contracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'global-input-low-risk-hook-extracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'arrow-motion-raf-hook-extracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))))) &&
    (monolithMap.includes("firstSafeMove: 'global-input-and-metronome-source-builder-probe'") ||
      monolithMap.includes("firstSafeMove: 'global-input-low-risk-callsite-normalization'") ||
      monolithMap.includes("firstSafeMove: 'resonance-keyboard-command-adapter-shape-audit'") ||
      monolithMap.includes("firstSafeMove: 'resonance-keyboard-command-adapter-callsite-probe'") ||
      monolithMap.includes("firstSafeMove: 'arrow-motion-raf-shape-audit'") ||
      monolithMap.includes("firstSafeMove: 'arrow-motion-raf-callsite-source-probe'") || monolithMap.includes("firstSafeMove: 'stable-rhythm-lane-scheduler-shape-audit'") || monolithMap.includes("firstSafeMove: 'stable-rhythm-lane-scheduler-callsite-source-probe'") || monolithMap.includes("firstSafeMove: 'stable-rhythm-lane-scheduler-action-port-shape-audit'") || monolithMap.includes("firstSafeMove: 'stable-rhythm-lane-scheduler-prestep-context-shape-audit'") || monolithMap.includes("firstSafeMove: 'stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audit'") || monolithMap.includes("firstSafeMove: 'app-input-metronome-scaffolding-contraction'") || monolithMap.includes("firstSafeMove: 'app-global-input-low-risk-hook-extraction'") || monolithMap.includes("firstSafeMove: 'app-resonance-arrow-motion-raf-hook-extraction'") || monolithMap.includes("firstSafeMove: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit'")) &&
    (monolithMap.includes('global input source builder that absorbs resonance keyboard musical command bodies') ||
      monolithMap.includes('keyboard-command adapter shape audit that absorbs resonance keyboard musical command bodies') ||
      monolithMap.includes('keyboard-command adapter callsite probe only; handler bodies stay inline') ||
      monolithMap.includes('arrow-motion RAF hook extracted; keyboard and stable scheduler remain App-owned') ||
      monolithMap.includes('arrow-motion RAF shape audit only; RAF loop stays inline') ||
      monolithMap.includes('arrow-motion RAF callsite source probe only; RAF loop stays inline') ||
      monolithMap.includes('stable rhythm lane scheduler shape audit only; scheduler loop stays inline') ||
      monolithMap.includes('stable rhythm lane scheduler callsite source probe only; scheduler loop stays inline') || monolithMap.includes('stable rhythm lane scheduler pre-step context arg-builder probe only; scheduler loop and action-port closures stay inline')) &&
    monolithMap.includes('global input source builder that absorbs stable rhythm lane scheduling or drum/bass scheduling callbacks'),
  guardListedInSanitySuite:
    suite.includes('Global input and metronome source readiness audit') &&
    suite.includes('xensonar:check-app-global-input-and-metronome-source-readiness-audit'),
  guardListedInSanitySuiteContract:
    suiteContract.includes('xensonar:check-app-global-input-and-metronome-source-readiness-audit'),
  appLineCountUnaffectedByReadinessAudit: appLines <= 5625,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  patch: '3.2.91.6.9.165_app_global_input_and_metronome_source_readiness_audit',
  appLines,
  auditLines,
  auditedKeys: keys,
  analysis: {
    viableNextMove: 'thin buildAppGlobalInputAndMetronomeSource probe only',
    notYetAllowed: [
      'moving resonance keyboard musical command bodies',
      'moving arrow-motion RAF cursor loop',
      'moving stable rhythm lane scheduler',
      'absorbing drum/bass scheduling into input/metronome source builder',
      'collapsing global input into resonance screen or surface mount assembly',
    ],
  },
  checks,
  failures,
};

if (failures.length) {
  console.error('[check-app-global-input-and-metronome-source-readiness-audit] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-global-input-and-metronome-source-readiness-audit] ok');
console.log(JSON.stringify(report, null, 2));
