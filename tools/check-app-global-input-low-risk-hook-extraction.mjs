#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const hookPath = 'src/features/xensonar/input/useAppGlobalInputLowRiskBoundary.ts';
const builderPath = 'src/features/xensonar/input/appGlobalInputAndMetronomeSourceBuilder.ts';
const browserBoundaryPath = 'src/features/xensonar/input/useAppGlobalBrowserInputCallsiteBoundary.ts';
const keyCapturePath = 'src/features/xensonar/input/useResonanceKeyCaptureGate.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const hook = exists(hookPath) ? read(hookPath) : '';
const builder = exists(builderPath) ? read(builderPath) : '';
const browserBoundary = exists(browserBoundaryPath) ? read(browserBoundaryPath) : '';
const keyCapture = exists(keyCapturePath) ? read(keyCapturePath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const appLines = app.split(/\r?\n/).length;
const indexOf = (needle) => app.indexOf(needle);
const hookIndex = indexOf('const appGlobalInputLowRiskBoundary = useAppGlobalInputLowRiskKeyCaptureBoundary({');
const arrowSourceIndex = indexOf('const appResonanceArrowMotionRafCallsiteSource = buildAppResonanceArrowMotionRafCompactCallsiteSource({');
const browserBoundaryIndex = indexOf('useAppGlobalInputLowRiskBrowserBoundary(appGlobalInputLowRiskBoundary);');
const arrowRafLoopIndex = indexOf('const arrowMotionRafSource = appResonanceArrowMotionRafCallsiteSource;');
const resonanceKeyDownIndex = indexOf('const handleResonanceKeyDown = (event: KeyboardEvent) =>');
const stableSchedulerIndex = indexOf('const stableRhythmLaneSchedulerSource = buildAppStableRhythmLaneSchedulerCompactCallsiteSource({');

const forbiddenInHook = [
  'runResonanceKeyboardInputRouter',
  'runResonanceKeyboardKeyUpRouter',
  'runEnterWaveHotkeyGesture',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'window.setTimeout',
  'window.clearTimeout',
  'resolveStableRhythmLaneTimeWindow',
  'buildStableRhythmLaneStepPlan',
  'executeStableRhythmLaneStepPlan',
  'nexusRefs.current.nextAbsoluteStep',
  'scheduleExportedDrumConfigStep',
  'scheduleRhythmForgeDrumStep',
  'scheduleClassicBassPatternStep',
  'schedulePsyBassStep',
  'playBassNote',
  'ensureAudioReady',
  'createOscillator',
  'createGain',
  '.connect(',
  '.start(',
  '.current =',
];

const directOldAppCallsRemoved = [
  'useResonanceKeyCaptureGate(appGlobalInputLowRiskCallsites.resonanceKeyCaptureGate);',
  'useAppGlobalBrowserInputCallsiteBoundary(appGlobalInputLowRiskCallsites.globalBrowserInput);',
  'const appGlobalInputLowRiskCallsites = buildAppGlobalInputLowRiskCallsites({',
  'appGlobalInputLowRiskCallsites.stableMetronomeVisualPulse.metronomePulse',
];

const checks = {
  expectedFilesExist: [
    appPath,
    hookPath,
    builderPath,
    browserBoundaryPath,
    keyCapturePath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast179: /^3\.2\.91\.6\.9\.(179|18[0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-global-input-low-risk-hook-extraction'] ===
    'node tools/check-app-global-input-low-risk-hook-extraction.mjs',
  appLineCountStillContracted: appLines <= 5540,
  appImportsOnlyNewLowRiskHook:
    app.includes('useAppGlobalInputLowRiskBrowserBoundary, useAppGlobalInputLowRiskKeyCaptureBoundary') &&
    !app.includes('useAppGlobalBrowserInputCallsiteBoundary } from "./features/xensonar/input/useAppGlobalBrowserInputCallsiteBoundary"') &&
    !app.includes('buildAppGlobalInputLowRiskCallsites } from "./features/xensonar/input/appGlobalInputAndMetronomeSourceBuilder"') &&
    !app.includes('useResonanceKeyCaptureGate } from "./features/xensonar/input/useResonanceKeyCaptureGate"'),
  appUsesSplitLowRiskLegacyCallsites:
    hookIndex >= 0 &&
    (arrowSourceIndex > hookIndex || app.includes('useAppResonanceArrowMotionRaf({')) &&
    browserBoundaryIndex > resonanceKeyDownIndex &&
    (browserBoundaryIndex < arrowRafLoopIndex || app.includes('useAppResonanceArrowMotionRaf({')),
  oldAppLowRiskScaffoldRemoved: directOldAppCallsRemoved.every((needle) => !app.includes(needle)),
  appKeepsMetronomePulsePassthrough:
    app.includes('metronomePulse: appGlobalInputLowRiskBoundary.metronomePulse,'),
  appStillOwnsKeyboardCommands:
    app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) =>') &&
    app.includes('const handleResonanceKeyUp = (event: KeyboardEvent) =>') &&
    app.includes('runResonanceKeyboardInputRouter(buildAppResonanceKeyboardCommandKeyDownRouterArgs({') &&
    app.includes('runResonanceKeyboardKeyUpRouter(buildAppResonanceKeyboardCommandKeyUpRouterArgs({'),
  arrowRafBoundaryStillPresent:
    (app.includes('raf = requestAnimationFrame(tick);') &&
      app.includes('return () => cancelAnimationFrame(raf);') &&
      app.includes('arrowMotionRafSource.actions.commitCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });')) ||
    (app.includes('useAppResonanceArrowMotionRaf({') &&
      exists('src/features/xensonar/input/useAppResonanceArrowMotionRaf.ts')),
  appStillOwnsStableScheduler:
    stableSchedulerIndex >= 0 &&
    app.includes('window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs)') &&
    app.includes('window.clearTimeout(timerID)') &&
    app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;') &&
    (app.includes('scheduleDrumStep: (plan) => {') || app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({')) &&
    (app.includes('scheduleBassStep: (plan) => {') || app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({')) &&
    (app.includes('applyMyzelStep: (plan) => {') || app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({')),
  hookWrapsOnlyLowRiskBoundaries:
    hook.includes('useResonanceKeyCaptureGate(callsites.resonanceKeyCaptureGate);') &&
    hook.includes('useAppGlobalBrowserInputCallsiteBoundary(boundary.globalBrowserInput);') &&
    hook.includes('buildAppGlobalInputLowRiskCallsites(args)') &&
    hook.includes('metronomePulse: callsites.stableMetronomeVisualPulse.metronomePulse') &&
    hook.includes('keyboardMusicalCommandOwned: false') &&
    hook.includes('arrowMotionRafOwned: false') &&
    hook.includes('stableRhythmLaneSchedulerOwned: false'),
  hookContainsNoHighRiskRuntimeTokens: forbiddenInHook.every((needle) => !hook.includes(needle)),
  legacyBoundaryFilesStillNarrow:
    browserBoundary.includes('useGlobalScrollCapture();') &&
    browserBoundary.includes('useGlobalArrowCapture({ gameInputActive, resonanceInputActive });') &&
    browserBoundary.includes('useGameInputBridge({ gameInputActive, keyRef });') &&
    keyCapture.includes('window.addEventListener("keydown", onKeyCapture, true);') &&
    builder.includes('buildAppGlobalInputLowRiskCallsites'),
  monolithMapUpdated:
    ((monolithMap.includes("status: 'global-input-low-risk-hook-extracted'") || monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'"))) || (monolithMap.includes("status: 'arrow-motion-raf-hook-extracted'") || monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'")))) &&
    (monolithMap.includes("splitTarget: 'app-global-input-low-risk-hook-boundary'") || monolithMap.includes("splitTarget: 'app-arrow-motion-raf-hook-boundary'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit'") || (monolithMap.includes("splitTarget: 'bass-clip-root-binding-helper-read-resolve-return-probe'") || monolithMap.includes("splitTarget: 'rhythm-forge-bass-cache-read-generate-return-probe'") || monolithMap.includes("splitTarget: 'psy-bass-cache-read-generate-return-probe'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-step-action-boundary'"))) &&
    monolithMap.includes('low-risk key-capture and browser input hooks are extracted without moving musical keyboard commands') &&
    (monolithMap.includes("firstSafeMove: 'app-global-input-low-risk-hook-extraction'") || monolithMap.includes("firstSafeMove: 'app-resonance-arrow-motion-raf-hook-extraction'") || monolithMap.includes("firstSafeMove: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit'") || (monolithMap.includes("firstSafeMove: 'bass-clip-root-binding-helper-read-resolve-return-probe'") || monolithMap.includes("firstSafeMove: 'rhythm-forge-bass-cache-helper-read-generate-return-probe'") || monolithMap.includes("firstSafeMove: 'psy-bass-cache-helper-read-generate-return-probe'") || monolithMap.includes('outer scheduler transport remains App-owned'))),
  suiteIncludesGuard:
    suite.includes("script: 'xensonar:check-app-global-input-low-risk-hook-extraction'") &&
    suite.includes('Global input low-risk hook extraction') &&
    suiteContract.includes("'xensonar:check-app-global-input-low-risk-hook-extraction'"),
};

const failed = Object.entries(checks).filter(([, value]) => !value);
if (failed.length) {
  console.error('app global input low-risk hook extraction check failed:');
  for (const [name] of failed) console.error(` - ${name}`);
  console.error(JSON.stringify({ appLines, version: pkg.version }, null, 2));
  process.exit(1);
}

console.log('app global input low-risk hook extraction check passed', JSON.stringify({ appLines, version: pkg.version }, null, 2));
