#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const globalBuilderPath = 'src/features/xensonar/input/appGlobalInputAndMetronomeSourceBuilder.ts';
const arrowBuilderPath = 'src/features/xensonar/input/appResonanceArrowMotionRafCallsiteSourceProbe.ts';
const schedulerBuilderPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerCallsiteSourceProbe.ts';
const prestepBuilderPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerPrestepContextArgBuilderProbe.ts';
const stepActionBoundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const globalBuilder = exists(globalBuilderPath) ? read(globalBuilderPath) : '';
const arrowBuilder = exists(arrowBuilderPath) ? read(arrowBuilderPath) : '';
const schedulerBuilder = exists(schedulerBuilderPath) ? read(schedulerBuilderPath) : '';
const prestepBuilder = exists(prestepBuilderPath) ? read(prestepBuilderPath) : '';
const stepActionBoundary = exists(stepActionBoundaryPath) ? read(stepActionBoundaryPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const appLines = app.split(/\r?\n/).length;
const count = (needle) => (app.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
const indexOf = (needle) => app.indexOf(needle);

const forbiddenRuntimeInBuilders = [
  'window.addEventListener',
  'window.removeEventListener',
  'requestAnimationFrame(',
  'cancelAnimationFrame(',
  'window.setTimeout(',
  'window.clearTimeout(',
  'resolveStableRhythmLaneTimeWindow(',
  'buildStableRhythmLaneStepPlan(',
  'executeStableRhythmLaneStepPlan(',
  'scheduleExportedDrumConfigStep(',
  'scheduleRhythmForgeDrumStep(',
  'scheduleClassicBassPatternStep(',
  'schedulePsyBassStep(',
  'playBassNote(',
  'ensureAudioReady(',
  '.current =',
];
const combinedBuilders = [globalBuilder, arrowBuilder, schedulerBuilder, prestepBuilder].join('\n');

const oldVerboseNeedlesRemovedFromApp = [
  'const appGlobalInputAndMetronomeSource = buildAppGlobalInputAndMetronomeSource({',
  'const appGlobalInputLowRiskCallsites = normalizeAppGlobalInputLowRiskCallsites(appGlobalInputAndMetronomeSource);',
  'const appResonanceArrowMotionRafCallsiteSource = buildAppResonanceArrowMotionRafCallsiteSource({',
  'const stableRhythmLaneSchedulerSource = buildAppStableRhythmLaneSchedulerCallsiteSource({',
  'const stableRhythmLaneSchedulerPrestepContext = buildAppStableRhythmLaneSchedulerPrestepContextArgs({',
  'const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerActionPort({',
  'sourceOwnerStillApp: true,\n    },\n    globalBrowserContainment',
  'transportProvenance: {',
  'actionPortProvenance: {',
  'stationaryPlanOwnerStillApp: true,',
  'rootResolvedPerStep: true,',
];

const stableSourceIndex = indexOf('const stableRhythmLaneSchedulerSource = buildAppStableRhythmLaneSchedulerCompactCallsiteSource({');
const prefillIndex = indexOf('const prefillWindow = resolveStableRhythmLaneTimeWindow(stableRhythmLaneSchedulerSource.timeWindowArgs);');
const staleIndex = indexOf('if (stationaryPlan.stale) {');
const emptyPortIndex = indexOf('executeStableRhythmLaneStepPlan(stationaryPlan, {});');
const prestepIndex = indexOf('const stableRhythmLaneSchedulerPrestepContext = buildAppStableRhythmLaneSchedulerPrestepContext({');
const actionPortIndex = indexOf('const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({');
const executeIndex = indexOf('executeStableRhythmLaneStepPlan(stationaryPlan, stableRhythmLaneSchedulerActionPort);');
const nextWriteIndex = indexOf('nexusRefs.current.nextAbsoluteStep = nextStep;');

const checks = {
  expectedFilesExist: [
    appPath,
    globalBuilderPath,
    arrowBuilderPath,
    schedulerBuilderPath,
    prestepBuilderPath,
    stepActionBoundaryPath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast178: /^3\.2\.91\.6\.9\.(178|179|18[0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-input-metronome-scaffolding-contraction'] ===
    'node tools/check-app-input-metronome-scaffolding-contraction.mjs',
  appLineCountContractedFrom9177: appLines <= 5550,
  appNoLongerNeedsOriginalDebtAllowance: appLines <= 5550,
  compactGlobalInputCallsite:
    (
      app.includes('const appGlobalInputLowRiskCallsites = buildAppGlobalInputLowRiskCallsites({') &&
      app.includes('useResonanceKeyCaptureGate(appGlobalInputLowRiskCallsites.resonanceKeyCaptureGate);') &&
      app.includes('useAppGlobalBrowserInputCallsiteBoundary(appGlobalInputLowRiskCallsites.globalBrowserInput);')
    ) || (
      app.includes('const appGlobalInputLowRiskBoundary = useAppGlobalInputLowRiskKeyCaptureBoundary({') &&
      app.includes('useAppGlobalInputLowRiskBrowserBoundary(appGlobalInputLowRiskBoundary);') &&
      app.includes('metronomePulse: appGlobalInputLowRiskBoundary.metronomePulse,')
    ),
  compactArrowCallsiteOrHook:
    (app.includes('const appResonanceArrowMotionRafCallsiteSource = buildAppResonanceArrowMotionRafCompactCallsiteSource({') &&
      app.includes('const arrowMotionRafSource = appResonanceArrowMotionRafCallsiteSource;') &&
      app.includes('arrowMotionRafSource.actions.commitCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });')) ||
    (app.includes('useAppResonanceArrowMotionRaf({') &&
      exists('src/features/xensonar/input/useAppResonanceArrowMotionRaf.ts')),
  compactSchedulerSource:
    stableSourceIndex >= 0 && prefillIndex > stableSourceIndex &&
    app.includes('buildAppStableRhythmLaneSchedulerCompactCallsiteSource({') &&
    app.includes('bpm: p.quantizeBpm,') &&
    app.includes('nextStep: nexusRefs.current.nextAbsoluteStep,'),
  compactPrestepAndActionPort:
    (staleIndex >= 0 && emptyPortIndex > staleIndex && prestepIndex > emptyPortIndex &&
      actionPortIndex > prestepIndex && executeIndex > actionPortIndex && nextWriteIndex > executeIndex) ||
    (staleIndex >= 0 && emptyPortIndex > staleIndex &&
      app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({') &&
      nextWriteIndex > indexOf('executeAppStableRhythmLaneSchedulerStepActionBoundary({') &&
      stepActionBoundary.includes('buildAppStableRhythmLaneSchedulerPrestepContext({') &&
      stepActionBoundary.includes('buildAppStableRhythmLaneSchedulerInlineActionPort({') &&
      stepActionBoundary.includes('executeStableRhythmLaneStepPlan(args.stationaryPlan, stableRhythmLaneSchedulerActionPort);')), 
  appRemovedVerboseScaffolding: oldVerboseNeedlesRemovedFromApp.every((needle) => !app.includes(needle)),
  appStillOwnsKeyboardHandlers:
    app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) =>') &&
    app.includes('const handleResonanceKeyUp = (event: KeyboardEvent) =>') &&
    app.includes('runResonanceKeyboardInputRouter(buildAppResonanceKeyboardCommandKeyDownRouterArgs({') &&
    app.includes('runResonanceKeyboardKeyUpRouter(buildAppResonanceKeyboardCommandKeyUpRouterArgs({'),
  arrowRafBoundaryStillPresent:
    (app.includes('raf = requestAnimationFrame(tick);') &&
      app.includes('return () => cancelAnimationFrame(raf);') &&
      app.includes('nexusArrowRef.current.left') &&
      app.includes('nexusArrowRef.current.right')) ||
    (app.includes('useAppResonanceArrowMotionRaf({') &&
      exists('src/features/xensonar/input/useAppResonanceArrowMotionRaf.ts')),
  appStillOwnsSchedulerLoop:
    app.includes('const schedule = () => {') &&
    app.includes('window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs)') &&
    app.includes('window.clearTimeout(timerID)') &&
    app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;') &&
    (app.includes('scheduleDrumStep: (plan) => {') || app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({')) &&
    (app.includes('scheduleBassStep: (plan) => {') || app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({')) &&
    (app.includes('applyMyzelStep: (plan) => {') || app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({')),
  buildersDeclareCompactHelpers:
    globalBuilder.includes('buildAppGlobalInputLowRiskCallsites') &&
    arrowBuilder.includes('buildAppResonanceArrowMotionRafCompactCallsiteSource') &&
    schedulerBuilder.includes('buildAppStableRhythmLaneSchedulerCompactCallsiteSource') &&
    schedulerBuilder.includes('buildAppStableRhythmLaneSchedulerInlineActionPort') &&
    prestepBuilder.includes('buildAppStableRhythmLaneSchedulerPrestepContext'),
  compactHelpersKeepRuntimeOutOfBuilders: forbiddenRuntimeInBuilders.every((needle) => !combinedBuilders.includes(needle)),
  noDuplicateGlobalLowRiskCallsiteBlocks:
    (count('buildAppGlobalInputLowRiskCallsites({') === 1 || count('useAppGlobalInputLowRiskKeyCaptureBoundary({') === 1) &&
    (count('buildAppResonanceArrowMotionRafCompactCallsiteSource({') === 1 || count('useAppResonanceArrowMotionRaf({') === 1) &&
    count('buildAppStableRhythmLaneSchedulerCompactCallsiteSource({') === 1,
  monolithMapUpdated:
    ((monolithMap.includes("status: 'input-metronome-scaffolding-contracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'")))) || (monolithMap.includes("status: 'global-input-low-risk-hook-extracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'")))) || (monolithMap.includes("status: 'arrow-motion-raf-hook-extracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'"))))) &&
    (monolithMap.includes("splitTarget: 'app-input-metronome-scaffolding-contraction-layer'") || monolithMap.includes("splitTarget: 'app-global-input-low-risk-hook-boundary'") || monolithMap.includes("splitTarget: 'app-arrow-motion-raf-hook-boundary'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit'") || (monolithMap.includes("splitTarget: 'bass-clip-root-binding-helper-read-resolve-return-probe'") || monolithMap.includes("splitTarget: 'rhythm-forge-bass-cache-read-generate-return-probe'") || monolithMap.includes("splitTarget: 'psy-bass-cache-read-generate-return-probe'") || monolithMap.includes("splitTarget: 'stable-rhythm-lane-scheduler-step-action-boundary'"))) &&
    (monolithMap.includes('input/metronome scaffolding contraction only; App.tsx line count must shrink without moving ownership') || monolithMap.includes('outer scheduler transport remains App-owned')),
  suiteIncludesGuard:
    suite.includes("script: 'xensonar:check-app-input-metronome-scaffolding-contraction'") &&
    suite.includes('Input/metronome scaffolding contraction') &&
    suiteContract.includes("'xensonar:check-app-input-metronome-scaffolding-contraction'"),
};

const failed = Object.entries(checks).filter(([, value]) => !value);
if (failed.length) {
  console.error('app input/metronome scaffolding contraction check failed:');
  for (const [name] of failed) console.error(` - ${name}`);
  console.error(JSON.stringify({ appLines, version: pkg.version }, null, 2));
  process.exit(1);
}

console.log('app input/metronome scaffolding contraction check passed', JSON.stringify({ appLines, version: pkg.version }, null, 2));
