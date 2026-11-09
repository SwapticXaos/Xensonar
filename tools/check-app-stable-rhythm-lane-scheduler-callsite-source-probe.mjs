#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const probePath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerCallsiteSourceProbe.ts';
const shapeAuditPath = 'validation/contracts/xensonar/input/appStableRhythmLaneSchedulerShapeAudit.ts';
const stepActionBoundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const probe = exists(probePath) ? read(probePath) : '';
const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const stepActionBoundary = exists(stepActionBoundaryPath) ? read(stepActionBoundaryPath) : '';
const schedulerBody = `${app}
${stepActionBoundary}`;
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;
const probeLines = probe.split(/\r?\n/).length;

const probeForbiddenNeedles = [
  'import React',
  'useEffect(',
  'useMemo(',
  'useCallback(',
  'useState(',
  'useRef(',
  'window.addEventListener',
  'window.removeEventListener',
  'window.setTimeout(',
  'window.clearTimeout(',
  'requestAnimationFrame(',
  'cancelAnimationFrame(',
  'setInterval(',
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'ensureAudioReady(',
  'runEnterWaveHotkeyGesture(',
  'runResonanceKeyboardInputRouter(',
  'runResonanceKeyboardKeyUpRouter(',
  'resolveStableRhythmLaneTimeWindow(',
  'buildStableRhythmLaneStepPlan(',
  'executeStableRhythmLaneStepPlan(',
  'scheduleStableRhythmMetronomePulse(',
  'scheduleExportedDrumConfigStep(',
  'scheduleRhythmForgeDrumStep(',
  'scheduleClassicBassPatternStep(',
  'playBassNote(',
  'recordAudioPressureAdaptiveAction(',
  'nexusRefs.current.nextAbsoluteStep =',
  '.current =',
];

const requiredProbeNeedles = [
  "probeKind: \"app-stable-rhythm-lane-scheduler-callsite-source-probe\"",
  'callsiteOwnerStillApp: true',
  'schedulerLoopStillInlineInApp: true',
  'timeoutOwnerStillAppEffect: true',
  'actionPortClosuresStillInlineInApp: true',
  'nextAbsoluteStepOwnerStillApp: true',
  'runtimeOwned: false',
  'audioOwned: false',
  'schedulingOwned: false',
  'effectGate',
  'timeWindowArgs',
  'tickConfig',
  'timerIntervalMs: 25',
  'transportProvenance',
  'actionPortProvenance',
  'AppStableRhythmLaneSchedulerTimeWindowArgs',
  'AppStableRhythmLaneSchedulerStepPlanArgs',
  'AppStableRhythmLaneSchedulerCallsiteSource',
  'buildAppStableRhythmLaneSchedulerCallsiteSource',
  'buildAppStableRhythmLaneSchedulerStepPlanArgs',
  'buildAppStableRhythmLaneSchedulerActionPort',
  'StableRhythmLaneActionPort',
  'AudioTimeContext',
];

const requiredAppNeedles = [
  'import { buildAppStableRhythmLaneSchedulerCompactCallsiteSource, buildAppStableRhythmLaneSchedulerInlineActionPort, buildAppStableRhythmLaneSchedulerStepPlanArgs } from "./features/xensonar/input/appStableRhythmLaneSchedulerCallsiteSourceProbe";',
  'const stableRhythmLaneSchedulerSource = buildAppStableRhythmLaneSchedulerCompactCallsiteSource({',
  'audioCtx,',
  'nexusActive,',
  'bpm: p.quantizeBpm,',
  'nextStep: nexusRefs.current.nextAbsoluteStep,',
  'const prefillWindow = resolveStableRhythmLaneTimeWindow(stableRhythmLaneSchedulerSource.timeWindowArgs);',
  'const stationaryPlan = buildStableRhythmLaneStepPlan(buildAppStableRhythmLaneSchedulerStepPlanArgs({',
  'const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({',
  'scheduleMetronomePulse: (plan) => {',
  'scheduleDrumStep: (plan) => {',
  'scheduleBassStep: (plan) => {',
  'applyMyzelStep: (plan) => {',
  'executeStableRhythmLaneStepPlan(stationaryPlan, stableRhythmLaneSchedulerActionPort);',
  'timerID = window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs);',
];

const appOwnershipNeedles = [
  'const schedule = () => {',
  'executeStableRhythmLaneStepPlan(stationaryPlan, {});',
  'scheduleStableRhythmMetronomePulse(plan, audioCtx.currentTime);',
  'scheduleExportedDrumConfigStep({',
  'scheduleRhythmForgeDrumStep({',
  'drumMachine.schedulePattern(',
  'scheduleBassClipStep({',
  'scheduleRhythmForgeBassStep({',
  'schedulePsyBassStep({',
  'scheduleClassicBassPatternStep({',
  'applyMyzelLayerStep(plan.timeSec, plan.step16);',
  'recordAudioPressureAdaptiveAction(\'stable-rhythm-prefill-capped\', 1);',
  'nexusRefs.current.nextAbsoluteStep = nextStep;',
  'window.clearTimeout(timerID);',
  'clearStableRhythmMetronomeTimeouts();',
];

const forbiddenExtractionFiles = [
  'src/features/xensonar/input/useAppStableRhythmLaneScheduler.ts',
  'src/features/xensonar/input/appStableRhythmLaneSchedulerRuntime.ts',
  'src/features/xensonar/input/appStableRhythmLaneSchedulerBoundary.ts',
  'src/features/xensonar/audio/appStableRhythmLaneSchedulerRuntime.ts',
];

const includesAll = (content, needles) => needles.every((needle) => content.includes(needle));

const checks = {
  expectedFilesExist: [
    appPath,
    probePath,
    shapeAuditPath,
    stepActionBoundaryPath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast173: /^3\.2\.91\.6\.9\.(17[3-9]|1[8-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-stable-rhythm-lane-scheduler-callsite-source-probe'] ===
    'node tools/check-app-stable-rhythm-lane-scheduler-callsite-source-probe.mjs',
  probeDeclaresCallsiteSourceOnly:
    includesAll(probe, requiredProbeNeedles) &&
    probe.includes("import type { AudioTimeContext }") &&
    probe.includes("import type { StableRhythmLaneActionPort }") &&
    !probe.includes('APP_STABLE_RHYTHM_LANE_SCHEDULER_SHAPE_AUDIT'),
  probeIsPureTypeAndBuilderLayer: probeForbiddenNeedles.every((needle) => !probe.includes(needle)),
  appBuildsStableSchedulerCallsiteSource:
    includesAll(app, requiredAppNeedles) ||
    (app.includes('import { buildAppStableRhythmLaneSchedulerCompactCallsiteSource, buildAppStableRhythmLaneSchedulerStepPlanArgs } from "./features/xensonar/input/appStableRhythmLaneSchedulerCallsiteSourceProbe";') &&
      app.includes('import { executeAppStableRhythmLaneSchedulerStepActionBoundary } from "./features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary";') &&
      app.includes('const stableRhythmLaneSchedulerSource = buildAppStableRhythmLaneSchedulerCompactCallsiteSource({') &&
      app.includes('const prefillWindow = resolveStableRhythmLaneTimeWindow(stableRhythmLaneSchedulerSource.timeWindowArgs);') &&
      app.includes('const stationaryPlan = buildStableRhythmLaneStepPlan(buildAppStableRhythmLaneSchedulerStepPlanArgs({') &&
      app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({') &&
      app.includes('timerID = window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs);')),
  appStillOwnsStableSchedulerRuntimePaths:
    includesAll(app, appOwnershipNeedles) ||
    (app.includes('const schedule = () => {') &&
      app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, {});') &&
      app.includes("recordAudioPressureAdaptiveAction('stable-rhythm-prefill-capped', 1);") &&
      app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;') &&
      app.includes('window.clearTimeout(timerID);') &&
      app.includes('clearStableRhythmMetronomeTimeouts();') &&
      app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({') &&
      includesAll(stepActionBoundary, [
        'scheduleStableRhythmMetronomePulse(plan, args.readMetronomeAudioNowSec());',
        'scheduleExportedDrumConfigStep({',
        'scheduleRhythmForgeDrumStep({',
        'args.drumMachine.schedulePattern(',
        'scheduleBassClipStep({',
        'scheduleRhythmForgeBassStep({',
        'schedulePsyBassStep({',
        'scheduleClassicBassPatternStep({',
        'args.applyMyzelLayerStep(plan.timeSec, plan.step16);',
      ])),
  appStillOwnsKeyboardAndArrowSensitivePaths:
    app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) => {') &&
    app.includes('const handleResonanceKeyUp = (event: KeyboardEvent) => {') &&
    app.includes('runResonanceKeyboardInputRouter(') &&
    app.includes('runResonanceKeyboardKeyUpRouter(') &&
    app.includes('raf = requestAnimationFrame(tick);') &&
    app.includes('return () => cancelAnimationFrame(raf);'),
  dependencyArrayStillRawAndExplicit:
    app.includes('audioCtx,\n    nexusActive,\n    myzelEnabled,') &&
    app.includes('scheduleStableRhythmMetronomePulse,\n    clearStableRhythmMetronomeTimeouts,') &&
    !app.includes('}, [stableRhythmLaneSchedulerSource]'),
  shapeAuditStillPresentAndNonRuntime:
    shapeAudit.includes('APP_STABLE_RHYTHM_LANE_SCHEDULER_SHAPE_AUDIT') &&
    shapeAudit.includes('shapeAuditOnly: true') &&
    shapeAudit.includes('schedulerLoopStillInlineInApp: true'),
  noPrematureStableSchedulerRuntimeExtractionFiles: forbiddenExtractionFiles.every((rel) => !exists(rel)),
  monolithMapUpdated:
    (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'") ||
      monolithMap.includes("status: 'psy-bass-cache-helper-probed'") ||
      monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'")) &&
    monolithMap.includes('buildAppStableRhythmLaneSchedulerCompactCallsiteSource') &&
    monolithMap.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary') &&
    monolithMap.includes('outer scheduler transport remains App-owned'),
  suiteAndContractIncludeGuard:
    suite.includes("script: 'xensonar:check-app-stable-rhythm-lane-scheduler-callsite-source-probe'") &&
    suiteContract.includes("'xensonar:check-app-stable-rhythm-lane-scheduler-callsite-source-probe'"),
  sourceSizeRemainsProbeScale: probeLines >= 65 && probeLines <= 170,
  appDidNotGrowFromRuntimeExtraction: appLines <= 5625,
};

const failed = Object.entries(checks).filter(([, ok]) => !ok);

console.log(JSON.stringify({
  check: 'app-stable-rhythm-lane-scheduler-callsite-source-probe',
  version: pkg.version,
  appLines,
  probeLines,
  checks,
}, null, 2));

if (failed.length) {
  console.error('\nFailed checks:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}
