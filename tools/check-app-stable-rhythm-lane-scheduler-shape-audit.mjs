#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const auditPath = 'validation/contracts/xensonar/input/appStableRhythmLaneSchedulerShapeAudit.ts';
const lanePath = 'src/features/xensonar/audio/stableRhythmLane.ts';
const stepActionBoundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const lane = exists(lanePath) ? read(lanePath) : '';
const stepActionBoundary = exists(stepActionBoundaryPath) ? read(stepActionBoundaryPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;
const auditLines = audit.split(/\r?\n/).length;

const auditForbiddenNeedles = [
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

const requiredAuditNeedles = [
  'APP_STABLE_RHYTHM_LANE_SCHEDULER_SHAPE_AUDIT',
  'AppStableRhythmLaneSchedulerShapeAudit',
  "cleanupKind: 'app-stable-rhythm-lane-scheduler-shape-audit'",
  'shapeAuditOnly: true',
  'schedulerLoopStillInlineInApp: true',
  'frameOwnershipStillAppEffect: true',
  'runtimeOwned: false',
  'audioOwned: false',
  'schedulingOwned: false',
  'transportOwnershipMoved: false',
  "nextSafeMove: 'stable-rhythm-lane-scheduler-callsite-source-probe-after-audit'",
];

const requiredEffectGateKeys = ['audioCtx', 'nexusActive'];
const requiredDependencyKeys = [
  'audioCtx',
  'nexusActive',
  'myzelEnabled',
  'myzelPattern',
  'myzelStep16ths',
  'myzelBallMode',
  'myzelNodeMode',
  'tParams.intensityGlobal',
  'nParamsUI.bassRootMode',
  'nParamsUI.bassRootHz',
  'nParamsUI.drumConfigMode',
  'selectedExportedDrumConfig',
  'myzelInterpreterMix.hybridBlend',
  'myzelInterpreterMix.weaveBlend',
  'myzelInterpreterMix.constellationBlend',
  'myzelInterpreterMix.driveAmount',
  'myzelInterpreterMix.driveResponse',
  'myzelDriveEnabled',
  'scheduleStableRhythmMetronomePulse',
  'clearStableRhythmMetronomeTimeouts',
];
const requiredTimeWindowKeys = [
  'resolveStableRhythmLaneTimeWindow',
  'nexusParamsRef.current.quantizeBpm',
  'nexusRefs.current.nextAbsoluteStep',
  'minAheadSec:0.02',
  'maxStepsPerTick:12',
  'prefillWindow.stepDurationSec',
  'prefillWindow.audioNowSec',
  'prefillWindow.scheduleUntilSec',
];
const requiredLoopOwnershipKeys = [
  'app-useEffect-window-setTimeout-schedule-loop',
  'app-useEffect-window-clearTimeout-cleanup',
  'stable-rhythm-nextAbsoluteStep-writeback',
  'stable-rhythm-prefill-capped-pressure-action',
];
const requiredStepPlanKeys = [
  'buildStableRhythmLaneStepPlan',
  'executeStableRhythmLaneStepPlan-stale-empty-port',
  'executeStableRhythmLaneStepPlan-action-port',
  'stationaryPlan.step16',
  'stationaryPlan.barIndex',
];
const requiredActionPortKeys = ['scheduleMetronomePulse', 'scheduleDrumStep', 'scheduleBassStep', 'applyMyzelStep'];
const requiredDrumKeys = [
  'getDrumStyle',
  'sanitizeDrumLaneKitOverrides',
  'scheduleExportedDrumConfigStep',
  'generateRhythmForgePattern-for-drums',
  'scheduleRhythmForgeDrumStep',
  'drumMachine.schedulePattern',
];
const requiredBassKeys = [
  'resolveCurrentBassRootHz',
  'readBassClipById',
  'scheduleBassClipStep',
  'generateRhythmForgePattern-for-bass',
  'scheduleRhythmForgeBassStep',
  'generatePsyBassPattern',
  'schedulePsyBassStep',
  'scheduleClassicBassPatternStep',
  'playBassNote',
];
const requiredMyzelKeys = [
  'grooveStateFromMycelium',
  'applyMyzelLayerStep',
  'ensureMyzelSynth',
  'deriveMyzelLayerMod',
  'myzel-gate-and-layer-ref-writes',
];
const requiredMutationKeys = [
  'rhythmForgeDrumPatternRef.current',
  'rhythmForgeDrumBarIndexRef.current',
  'bassClipPlaybackCacheRef.current',
  'bassClipBarRootRef.current',
  'rhythmForgeBassPatternRef.current',
  'rhythmForgeBassBarIndexRef.current',
  'psyBassPatternRef.current',
  'psyBassBarIndexRef.current',
  'myzelLayerModRef.current',
  'myzelGateRef.current',
  'nexusRefs.current.nextAbsoluteStep',
];
const requiredDoNotMove = [
  'stable rhythm scheduler window.setTimeout ownership',
  'stable rhythm scheduler window.clearTimeout cleanup ownership',
  'resolveStableRhythmLaneTimeWindow nextStep transport handoff',
  'nexusRefs.current.nextAbsoluteStep writeback',
  'executeStableRhythmLaneStepPlan action port fanout',
  'metronome pulse scheduling callback currentTime bridge',
  'drum exported/rhythm-forge/classic scheduling callbacks',
  'bass clip/rhythm-forge/psy/classic scheduling callbacks',
  'Myzel layer step audio parameter mutation path',
  'AudioPressure stable-rhythm-prefill-capped action recording',
];

const appSchedulerNeedles = [
  'const schedule = () => {',
  'const prefillWindow = resolveStableRhythmLaneTimeWindow({',
  'bpm: p.quantizeBpm,',
  'nextStep: nexusRefs.current.nextAbsoluteStep,',
  'minAheadSec: 0.02,',
  'maxStepsPerTick: 12,',
  'let nextStep = prefillWindow.nextStep;',
  'let plannedStableStepsThisTick = 0;',
  'while (nextStep * stepMs < prefillWindow.scheduleUntilSec && plannedStableStepsThisTick < prefillWindow.maxStepsPerTick) {',
  'const stationaryPlan = buildStableRhythmLaneStepPlan({',
  'executeStableRhythmLaneStepPlan(stationaryPlan, {});',
  'executeStableRhythmLaneStepPlan(stationaryPlan, {',
  'scheduleMetronomePulse: (plan) => {',
  'scheduleStableRhythmMetronomePulse(plan, audioCtx.currentTime);',
  'scheduleDrumStep: (plan) => {',
  'scheduleBassStep: (plan) => {',
  'applyMyzelStep: (plan) => {',
  'recordAudioPressureAdaptiveAction(\'stable-rhythm-prefill-capped\', 1);',
  'nexusRefs.current.nextAbsoluteStep = nextStep;',
  'timerID = window.setTimeout(schedule, 25);',
  'window.clearTimeout(timerID);',
  'clearStableRhythmMetronomeTimeouts();',
];


const appSchedulerCallsiteProbeNeedles = [
  'const schedule = () => {',
  'const stableRhythmLaneSchedulerSource = buildAppStableRhythmLaneSchedulerCompactCallsiteSource({',
  'const prefillWindow = resolveStableRhythmLaneTimeWindow(stableRhythmLaneSchedulerSource.timeWindowArgs);',
  'const stationaryPlan = buildStableRhythmLaneStepPlan(buildAppStableRhythmLaneSchedulerStepPlanArgs({',
  'executeStableRhythmLaneStepPlan(stationaryPlan, {});',
  'const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({',
  'scheduleMetronomePulse: (plan) => {',
  'scheduleStableRhythmMetronomePulse(plan, audioCtx.currentTime);',
  'scheduleDrumStep: (plan) => {',
  'scheduleBassStep: (plan) => {',
  'applyMyzelStep: (plan) => {',
  'executeStableRhythmLaneStepPlan(stationaryPlan, stableRhythmLaneSchedulerActionPort);',
  "recordAudioPressureAdaptiveAction('stable-rhythm-prefill-capped', 1);",
  'nexusRefs.current.nextAbsoluteStep = nextStep;',
  'timerID = window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs);',
  'window.clearTimeout(timerID);',
  'clearStableRhythmMetronomeTimeouts();',
];


const appSchedulerStepActionBoundaryNeedles = [
  'const schedule = () => {',
  'const stableRhythmLaneSchedulerSource = buildAppStableRhythmLaneSchedulerCompactCallsiteSource({',
  'const prefillWindow = resolveStableRhythmLaneTimeWindow(stableRhythmLaneSchedulerSource.timeWindowArgs);',
  'const stationaryPlan = buildStableRhythmLaneStepPlan(buildAppStableRhythmLaneSchedulerStepPlanArgs({',
  'executeStableRhythmLaneStepPlan(stationaryPlan, {});',
  'executeAppStableRhythmLaneSchedulerStepActionBoundary({',
  "recordAudioPressureAdaptiveAction('stable-rhythm-prefill-capped', 1);",
  'nexusRefs.current.nextAbsoluteStep = nextStep;',
  'timerID = window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs);',
  'window.clearTimeout(timerID);',
  'clearStableRhythmMetronomeTimeouts();',
];

const stepActionBoundaryNeedles = [
  'buildAppStableRhythmLaneSchedulerPrestepContext({',
  'buildAppStableRhythmLaneSchedulerInlineActionPort({',
  'executeStableRhythmLaneStepPlan(args.stationaryPlan, stableRhythmLaneSchedulerActionPort);',
  'scheduleStableRhythmMetronomePulse(plan, args.readMetronomeAudioNowSec());',
  'scheduleExportedDrumConfigStep({',
  'scheduleRhythmForgeDrumStep({',
  'args.drumMachine.schedulePattern(',
  'scheduleBassClipStep({',
  'scheduleRhythmForgeBassStep({',
  'schedulePsyBassStep({',
  'scheduleClassicBassPatternStep({',
  'args.applyMyzelLayerStep(plan.timeSec, plan.step16);',
];

const forbiddenExtractionFiles = [
  'src/features/xensonar/input/useAppStableRhythmLaneScheduler.ts',
  'src/features/xensonar/input/appStableRhythmLaneSchedulerRuntime.ts',
  'src/features/xensonar/input/appStableRhythmLaneSchedulerBoundary.ts',
  'src/features/xensonar/input/appStableRhythmLaneSchedulerCallsiteSource.ts',
  'src/features/xensonar/audio/appStableRhythmLaneSchedulerRuntime.ts',
];

const includesAll = (content, needles) => needles.every((needle) => content.includes(needle));

const checks = {
  expectedFilesExist: [
    appPath,
    auditPath,
    lanePath,
    stepActionBoundaryPath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast172: /^3\.2\.91\.6\.9\.(17[2-9]|1[8-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-stable-rhythm-lane-scheduler-shape-audit'] ===
    'node tools/check-app-stable-rhythm-lane-scheduler-shape-audit.mjs',
  laneStillOwnsPlanPrimitives:
    lane.includes('export type StableRhythmLaneStepPlan') &&
    lane.includes('export type StableRhythmLaneActionPort') &&
    lane.includes('export function resolveStableRhythmLaneTimeWindow') &&
    lane.includes('export function buildStableRhythmLaneStepPlan') &&
    lane.includes('export function executeStableRhythmLaneStepPlan'),
  auditDeclaresShapeOnly: requiredAuditNeedles.every((needle) => audit.includes(needle)),
  auditImportsOnlyStableLaneTypes:
    audit.includes("import type {\n  StableRhythmLaneActionPort,\n  StableRhythmLaneStepPlan,\n  StableRhythmLaneTimeWindow,\n} from '../audio/stableRhythmLane';"),
  auditIsPureTypeLayer: auditForbiddenNeedles.every((needle) => !audit.includes(needle)),
  auditListsExpectedShapeKeys:
    includesAll(audit, requiredEffectGateKeys) &&
    includesAll(audit, requiredDependencyKeys) &&
    includesAll(audit, requiredTimeWindowKeys) &&
    includesAll(audit, requiredLoopOwnershipKeys) &&
    includesAll(audit, requiredStepPlanKeys) &&
    includesAll(audit, requiredActionPortKeys) &&
    includesAll(audit, requiredDrumKeys) &&
    includesAll(audit, requiredBassKeys) &&
    includesAll(audit, requiredMyzelKeys) &&
    includesAll(audit, requiredMutationKeys) &&
    includesAll(audit, requiredDoNotMove),
  appStillOwnsSchedulerLoop:
    appSchedulerNeedles.every((needle) => app.includes(needle)) ||
    appSchedulerCallsiteProbeNeedles.every((needle) => app.includes(needle)) ||
    (appSchedulerStepActionBoundaryNeedles.every((needle) => app.includes(needle)) &&
      stepActionBoundaryNeedles.every((needle) => stepActionBoundary.includes(needle))),
  appStillOwnsKeyboardAndArrowSensitivePaths:
    app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) => {') &&
    app.includes('const handleResonanceKeyUp = (event: KeyboardEvent) => {') &&
    app.includes('runResonanceKeyboardInputRouter(') &&
    app.includes('runResonanceKeyboardKeyUpRouter(') &&
    app.includes('raf = requestAnimationFrame(tick);') &&
    app.includes('return () => cancelAnimationFrame(raf);'),
  noPrematureStableSchedulerExtractionFiles: forbiddenExtractionFiles.every((rel) => !exists(rel)),
  monolithMapUpdated:
    monolithMap.includes("| 'stable-rhythm-lane-scheduler-shape-audited'") &&
    (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'") ||
      monolithMap.includes("status: 'psy-bass-cache-helper-probed'") ||
      monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'")) &&
    monolithMap.includes('APP_STABLE_RHYTHM_LANE_SCHEDULER_SHAPE_AUDIT') &&
    monolithMap.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary') &&
    monolithMap.includes('outer scheduler transport remains App-owned') &&
    monolithMap.includes('buildAppStableRhythmLaneSchedulerPrestepContext'),
  suiteAndContractIncludeGuard:
    suite.includes("script: 'xensonar:check-app-stable-rhythm-lane-scheduler-shape-audit'") &&
    suiteContract.includes("'xensonar:check-app-stable-rhythm-lane-scheduler-shape-audit'"),
  auditSizeRemainsAuditScale: auditLines >= 200 && auditLines <= 360,
  appDidNotChangeForSchedulerAudit: appLines <= 5625,
};

const failed = Object.entries(checks).filter(([, ok]) => !ok);

console.log(JSON.stringify({
  check: 'app-stable-rhythm-lane-scheduler-shape-audit',
  version: pkg.version,
  appLines,
  auditLines,
  checks,
}, null, 2));

if (failed.length) {
  console.error('\nFailed checks:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}
