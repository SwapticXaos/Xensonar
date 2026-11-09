#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const auditPath = 'validation/contracts/xensonar/input/appStableRhythmLaneSchedulerActionPortShapeAudit.ts';
const callsiteProbePath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerCallsiteSourceProbe.ts';
const shapeAuditPath = 'validation/contracts/xensonar/input/appStableRhythmLaneSchedulerShapeAudit.ts';
const lanePath = 'src/features/xensonar/audio/stableRhythmLane.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const schedulerBody = `${app}\n${boundary}`;
const audit = exists(auditPath) ? read(auditPath) : '';
const callsiteProbe = exists(callsiteProbePath) ? read(callsiteProbePath) : '';
const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const lane = exists(lanePath) ? read(lanePath) : '';
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
  'APP_STABLE_RHYTHM_LANE_SCHEDULER_ACTION_PORT_SHAPE_AUDIT',
  'AppStableRhythmLaneSchedulerActionPortShapeAudit',
  "cleanupKind: 'app-stable-rhythm-lane-scheduler-action-port-shape-audit'",
  'actionPortAuditOnly: true',
  'schedulerLoopStillInlineInApp: true',
  'actionPortClosuresStillInlineInApp: true',
  'runtimeOwned: false',
  'audioOwned: false',
  'schedulingOwned: false',
  'actionPortOwnershipMoved: false',
  "nextSafeMove: 'stable-rhythm-lane-scheduler-prestep-context-shape-audit-or-action-port-arg-normalization'",
];

const requiredContractKeys = ['scheduleMetronomePulse', 'scheduleDrumStep', 'scheduleBassStep', 'applyMyzelStep'];
const requiredSharedReadKeys = [
  'stationaryPlan.step16',
  'stationaryPlan.barIndex',
  'getDrumStyle',
  'sanitizeDrumLaneKitOverrides',
  'resolveCurrentBassRootHz',
  'grooveStateFromMycelium',
];
const requiredMetronomeKeys = ['scheduleStableRhythmMetronomePulse', 'audioCtx.currentTime'];
const requiredDrumKeys = [
  'p.drumActive',
  'p.drumConfigMode:exported',
  'selectedExportedDrumConfig',
  'scheduleExportedDrumConfigStep',
  'isRhythmForgePattern:p.drumPattern',
  'rhythmForgeDrumPatternRef.current',
  'rhythmForgeDrumBarIndexRef.current',
  'generateRhythmForgePattern:drums',
  'scheduleRhythmForgeDrumStep',
  'drumMachine.schedulePattern',
];
const requiredBassKeys = [
  'p.bassActive',
  'p.bassPatternMode:clip',
  'p.bassClipId',
  'bassClipPlaybackCacheRef.current',
  'readBassClipById',
  'bassClipBarRootRef.current',
  'scheduleBassClipStep',
  'isRhythmForgePattern:p.bassPattern',
  'rhythmForgeBassPatternRef.current',
  'rhythmForgeBassBarIndexRef.current',
  'generateRhythmForgePattern:bass',
  'scheduleRhythmForgeBassStep',
  'isPsyBassPattern:p.bassPattern',
  'psyBassPatternRef.current',
  'psyBassBarIndexRef.current',
  'generatePsyBassPattern',
  'schedulePsyBassStep',
  'scheduleClassicBassPatternStep',
  'playBassNote',
];
const requiredMyzelKeys = ['applyMyzelLayerStep'];
const requiredMutationKeys = [
  'rhythmForgeDrumPatternRef.current',
  'rhythmForgeDrumBarIndexRef.current',
  'bassClipPlaybackCacheRef.current',
  'bassClipBarRootRef.current',
  'rhythmForgeBassPatternRef.current',
  'rhythmForgeBassBarIndexRef.current',
  'psyBassPatternRef.current',
  'psyBassBarIndexRef.current',
];
const requiredAdditionalChecks = [
  'stale-step-empty-port-remains-before-action-port',
  'pre-step-context-is-a-candidate-but-not-yet-extracted',
  'full-runtime-extraction-still-blocked-by-ref-mutation-and-time-truth',
];
const requiredDoNotMove = [
  'scheduleMetronomePulse callback because it bridges plan time to audioCtx.currentTime semantics',
  'scheduleDrumStep body because exported/rhythm-forge/classic drum paths share bar cache mutations',
  'scheduleBassStep body because clip/rhythm-forge/psy/classic bass paths share root and cache mutations',
  'applyMyzelStep body because Myzel layer timing still depends on the App-owned scheduler loop',
  'pre-step shared context until root/groove/drumStyle/barIndex provenance is separately audited',
  'stale-step empty-port branch because it protects action-port execution from late schedule catch-up',
];

const appActionPortNeedles = [
  'const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({',
  'scheduleMetronomePulse: (plan) => {',
  'scheduleStableRhythmMetronomePulse(plan, audioCtx.currentTime);',
  'scheduleDrumStep: (plan) => {',
  'if (!p.drumActive) return;',
  'scheduleExportedDrumConfigStep({',
  'scheduleRhythmForgeDrumStep({',
  'drumMachine.schedulePattern(',
  'scheduleBassStep: (plan) => {',
  'if (!p.bassActive) return;',
  'scheduleBassClipStep({',
  'scheduleRhythmForgeBassStep({',
  'schedulePsyBassStep({',
  'scheduleClassicBassPatternStep({',
  'playBassNote',
  'applyMyzelStep: (plan) => {',
  'applyMyzelLayerStep(plan.timeSec, plan.step16);',
  'executeStableRhythmLaneStepPlan(stationaryPlan, stableRhythmLaneSchedulerActionPort);',
];

const threePointNeedles = [
  'executeStableRhythmLaneStepPlan(stationaryPlan, {});',
  'const stableRhythmLaneSchedulerPrestepContext = buildAppStableRhythmLaneSchedulerPrestepContext({',
  'step: stationaryPlan.step16,',
  'barIndex: stationaryPlan.barIndex,',
  'drumStyle: getDrumStyle(),',
  'root: resolveCurrentBassRootHz(),',
  'groove: grooveStateFromMycelium(myceliumSnapshotRef.current, nextNoteTime),',
  'const { step, barIndex, drumStyle, drumLaneKitOverrides, root, groove } = stableRhythmLaneSchedulerPrestepContext.context;',
  'nexusRefs.current.nextAbsoluteStep = nextStep;',
];

const forbiddenExtractionFiles = [
  'src/features/xensonar/input/useAppStableRhythmLaneScheduler.ts',
  'src/features/xensonar/input/appStableRhythmLaneSchedulerRuntime.ts',
  'src/features/xensonar/input/appStableRhythmLaneSchedulerBoundary.ts',
  'src/features/xensonar/input/appStableRhythmLaneSchedulerActionPort.ts',
  'src/features/xensonar/audio/appStableRhythmLaneSchedulerRuntime.ts',
];

const includesAll = (content, needles) => needles.every((needle) => content.includes(needle));

const checks = {
  expectedFilesExist: [
    appPath,
    boundaryPath,
    auditPath,
    callsiteProbePath,
    shapeAuditPath,
    lanePath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast174: /^3\.2\.91\.6\.9\.(17[4-9]|1[8-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-stable-rhythm-lane-scheduler-action-port-shape-audit'] ===
    'node tools/check-app-stable-rhythm-lane-scheduler-action-port-shape-audit.mjs',
  laneActionPortStillFourOptionalActions:
    lane.includes('export type StableRhythmLaneActionPort') &&
    includesAll(lane, requiredContractKeys) &&
    lane.includes('port.scheduleMetronomePulse') &&
    lane.includes('port.scheduleDrumStep') &&
    lane.includes('port.scheduleBassStep') &&
    lane.includes('port.applyMyzelStep'),
  auditDeclaresActionPortOnly: includesAll(audit, requiredAuditNeedles),
  auditImportsOnlyStableLaneTypes:
    audit.includes("import type {\n  StableRhythmLaneActionPort,\n  StableRhythmLaneStepPlan,\n} from '../audio/stableRhythmLane';"),
  auditIsPureTypeLayer: auditForbiddenNeedles.every((needle) => !audit.includes(needle)),
  auditListsExpectedActionPortKeys:
    includesAll(audit, requiredContractKeys) &&
    includesAll(audit, requiredSharedReadKeys) &&
    includesAll(audit, requiredMetronomeKeys) &&
    includesAll(audit, requiredDrumKeys) &&
    includesAll(audit, requiredBassKeys) &&
    includesAll(audit, requiredMyzelKeys) &&
    includesAll(audit, requiredMutationKeys),
  auditCapturesThreeAdditionalChecks:
    includesAll(audit, requiredAdditionalChecks) &&
    includesAll(audit, requiredDoNotMove),
  callsiteProbeStillSourceOnly:
    callsiteProbe.includes('buildAppStableRhythmLaneSchedulerActionPort') &&
    callsiteProbe.includes('actionPortOwnerStillApp: true') &&
    callsiteProbe.includes('schedulerLoopStillInlineInApp: true') &&
    !callsiteProbe.includes('APP_STABLE_RHYTHM_LANE_SCHEDULER_ACTION_PORT_SHAPE_AUDIT'),
  appStillOwnsActionPortClosures: includesAll(app, appActionPortNeedles) || (app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({') && boundary.includes('buildAppStableRhythmLaneSchedulerInlineActionPort({') && includesAll(boundary, ['scheduleMetronomePulse: (plan) => {', 'scheduleDrumStep: (plan) => {', 'scheduleBassStep: (plan) => {', 'applyMyzelStep: (plan) => {', 'executeStableRhythmLaneStepPlan(args.stationaryPlan, stableRhythmLaneSchedulerActionPort)'])),
  appStillOwnsThreeInspectedPoints: includesAll(app, threePointNeedles) || (app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, {});') && app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({') && app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;') && boundary.includes('buildAppStableRhythmLaneSchedulerPrestepContext({')), 
  appStillOwnsStableSchedulerLoop:
    app.includes('const schedule = () => {') &&
    app.includes('timerID = window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs);') &&
    app.includes('window.clearTimeout(timerID);') &&
    app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;'),
  noPrematureStableSchedulerRuntimeExtractionFiles: forbiddenExtractionFiles.every((rel) => !exists(rel)),
  monolithMapUpdated:
    monolithMap.includes("status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'") &&
    monolithMap.includes('APP_STABLE_RHYTHM_LANE_SCHEDULER_ACTION_PORT_SHAPE_AUDIT') &&
    monolithMap.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary'),
  suiteAndContractIncludeGuard:
    suite.includes("script: 'xensonar:check-app-stable-rhythm-lane-scheduler-action-port-shape-audit'") &&
    suiteContract.includes("'xensonar:check-app-stable-rhythm-lane-scheduler-action-port-shape-audit'"),
  sourceSizeRemainsAuditScale: auditLines >= 165 && auditLines <= 260,
  appDidNotChangeForActionPortAudit: appLines <= 5625,
};

const failed = Object.entries(checks).filter(([, ok]) => !ok);

console.log(JSON.stringify({
  check: 'app-stable-rhythm-lane-scheduler-action-port-shape-audit',
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
