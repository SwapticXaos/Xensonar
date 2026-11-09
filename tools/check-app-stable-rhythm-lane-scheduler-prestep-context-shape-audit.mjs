#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const auditPath = 'validation/contracts/xensonar/input/appStableRhythmLaneSchedulerPrestepContextShapeAudit.ts';
const actionPortAuditPath = 'validation/contracts/xensonar/input/appStableRhythmLaneSchedulerActionPortShapeAudit.ts';
const callsiteProbePath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerCallsiteSourceProbe.ts';
const shapeAuditPath = 'validation/contracts/xensonar/input/appStableRhythmLaneSchedulerShapeAudit.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const schedulerBody = `${app}\n${boundary}`;
const audit = exists(auditPath) ? read(auditPath) : '';
const actionPortAudit = exists(actionPortAuditPath) ? read(actionPortAuditPath) : '';
const callsiteProbe = exists(callsiteProbePath) ? read(callsiteProbePath) : '';
const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;
const auditLines = audit.split(/\r?\n/).length;

const forbiddenAuditNeedles = [
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
  'APP_STABLE_RHYTHM_LANE_SCHEDULER_PRESTEP_CONTEXT_SHAPE_AUDIT',
  'AppStableRhythmLaneSchedulerPrestepContextShapeAudit',
  'AppStableRhythmLaneSchedulerPrestepContextShape',
  "cleanupKind: 'app-stable-rhythm-lane-scheduler-prestep-context-shape-audit'",
  'prestepContextAuditOnly: true',
  'schedulerLoopStillInlineInApp: true',
  'prestepContextStillInlineInApp: true',
  'actionPortClosuresStillInlineInApp: true',
  'runtimeOwned: false',
  'audioOwned: false',
  'schedulingOwned: false',
  'prestepContextOwnershipMoved: false',
  "nextSafeMove: 'stable-rhythm-lane-scheduler-prestep-context-arg-builder-probe-or-action-port-arg-normalization'",
];

const requiredContextKeys = ['step', 'barIndex', 'drumStyle', 'drumLaneKitOverrides', 'root', 'groove'];
const requiredSourceKeys = [
  'stationaryPlan.step16',
  'stationaryPlan.barIndex',
  'getDrumStyle()',
  'sanitizeDrumLaneKitOverrides(p.drumLaneKits)',
  'resolveCurrentBassRootHz()',
  'grooveStateFromMycelium(myceliumSnapshotRef.current, nextNoteTime)',
];
const requiredConsumerKeys = [
  'scheduleExportedDrumConfigStep.drumStyle',
  'scheduleExportedDrumConfigStep.laneKitOverrides',
  'generateRhythmForgePattern:drums.barIndex/rootHz/baseSwing/descriptors/flavor',
  'scheduleRhythmForgeDrumStep.step/drumStyle/laneKitOverrides',
  'drumMachine.schedulePattern.step/drumStyle/laneKitOverrides',
  'scheduleBassClipStep.rootHz/quantizeBpm/playBassNote',
  'generateRhythmForgePattern:bass.barIndex/rootHz/baseSwing/descriptors/flavor',
  'scheduleRhythmForgeBassStep.step/rootHz/quantizeBpm/playBassNote',
  'generatePsyBassPattern.barIndex/rootHz/swing/bassGrit/pressure/descriptors',
  'schedulePsyBassStep.step/quantizeBpm/playBassNote',
  'scheduleClassicBassPatternStep.step/rootHz/stepMs/playBassNote',
];
const requiredMutationReasons = [
  'barIndex invalidates rhythmForgeDrumPatternRef.current',
  'barIndex invalidates rhythmForgeBassPatternRef.current',
  'barIndex invalidates psyBassPatternRef.current',
  'barIndex plus bassClipId invalidates bassClipBarRootRef.current',
  'root is frozen or live depending on bassClip generator binding',
  'groove descriptors seed generated drum/bass phrase bodies',
];
const requiredDoNotMoveKeys = [
  'do-not-move-prestep-context-before-stale-guard',
  'do-not-separate-step-and-barIndex-from-stationaryPlan',
  'do-not-cache-drumStyle-across-ticks-yet',
  'do-not-cache-drumLaneKitOverrides-across-ticks-yet',
  'do-not-freeze-root-outside-current-bass-binding-semantics',
  'do-not-snapshot-groove-before-nextNoteTime-is-known',
  'do-not-convert-prestep-context-into-runtime-owner-yet',
];
const requiredNextProbeKeys = [
  'prestep-context-arg-builder-after-audit',
  'action-port-arg-normalization-after-prestep-audit',
  'scheduler-runtime-extract-still-blocked',
];
const requiredDoNotMove = [
  'pre-step context because it must be built after stale-step rejection and before action-port execution',
  'step and barIndex because both derive from the same StableRhythmLaneStepPlan and fan out into drum/bass cache invalidation',
  'drumStyle because swing and tone shape both exported and generated drum/bass paths in the same tick',
  'drumLaneKitOverrides because sanitized per-tick lane-kit routing should not be cached without a config-change witness',
  'root because bass clip binding can switch between live-step-root, free, and bar-frozen semantics',
  'groove because its descriptors depend on myceliumSnapshotRef and nextNoteTime, not merely on the current UI state',
];

const appPrestepNeedles = [
  'if (stationaryPlan.stale) {',
  'executeStableRhythmLaneStepPlan(stationaryPlan, {});',
  'const stableRhythmLaneSchedulerPrestepContext = buildAppStableRhythmLaneSchedulerPrestepContext({',
  'step: stationaryPlan.step16,',
  'barIndex: stationaryPlan.barIndex,',
  'drumStyle: getDrumStyle(),',
  'drumLaneKitOverrides: sanitizeDrumLaneKitOverrides(p.drumLaneKits),',
  'root: resolveCurrentBassRootHz(),',
  'groove: grooveStateFromMycelium(myceliumSnapshotRef.current, nextNoteTime),',
  'const { step, barIndex, drumStyle, drumLaneKitOverrides, root, groove } = stableRhythmLaneSchedulerPrestepContext.context;',
  'const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({',
  'executeStableRhythmLaneStepPlan(stationaryPlan, stableRhythmLaneSchedulerActionPort);',
  'nexusRefs.current.nextAbsoluteStep = nextStep;',
];

const forbiddenExtractionFiles = [
  'src/features/xensonar/input/useAppStableRhythmLaneScheduler.ts',
  'src/features/xensonar/input/appStableRhythmLaneSchedulerRuntime.ts',
  'src/features/xensonar/input/appStableRhythmLaneSchedulerBoundary.ts',
  'src/features/xensonar/input/appStableRhythmLaneSchedulerPrestepContext.ts',
  'src/features/xensonar/audio/appStableRhythmLaneSchedulerRuntime.ts',
];

const includesAll = (content, needles) => needles.every((needle) => content.includes(needle));

const checks = {
  expectedFilesExist: [
    appPath,
    boundaryPath,
    auditPath,
    actionPortAuditPath,
    callsiteProbePath,
    shapeAuditPath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast175: /^3\.2\.91\.6\.9\.(17[5-9]|1[8-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-stable-rhythm-lane-scheduler-prestep-context-shape-audit'] ===
    'node tools/check-app-stable-rhythm-lane-scheduler-prestep-context-shape-audit.mjs',
  auditDeclaresPrestepOnly: includesAll(audit, requiredAuditNeedles),
  auditImportsOnlyTypes:
    audit.includes("import type { DrumStyle } from '../../resonance/drumMachine';") &&
    audit.includes("import type { GrooveState } from '../../resonance/rhythmforge/types';") &&
    audit.includes("import type { StableRhythmLaneStepPlan } from '../audio/stableRhythmLane';") &&
    audit.includes("import type { DrumLaneKitOverrides } from '../groove/drumKitRouting';"),
  auditIsPureTypeLayer: forbiddenAuditNeedles.every((needle) => !audit.includes(needle)),
  auditListsExpectedContextKeys:
    includesAll(audit, requiredContextKeys) &&
    includesAll(audit, requiredSourceKeys) &&
    includesAll(audit, requiredConsumerKeys) &&
    includesAll(audit, requiredMutationReasons) &&
    includesAll(audit, requiredDoNotMoveKeys) &&
    includesAll(audit, requiredNextProbeKeys) &&
    includesAll(audit, requiredDoNotMove),
  auditTypesMirrorRuntimeShape:
    audit.includes("readonly step: StableRhythmLaneStepPlan['step16'];") &&
    audit.includes("readonly barIndex: StableRhythmLaneStepPlan['barIndex'];") &&
    audit.includes('readonly drumStyle: DrumStyle;') &&
    audit.includes('readonly drumLaneKitOverrides: DrumLaneKitOverrides;') &&
    audit.includes('readonly root: number;') &&
    audit.includes('readonly groove: GrooveState;'),
  appStillOwnsPrestepContext: includesAll(app, appPrestepNeedles) || (app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({') && boundary.includes('buildAppStableRhythmLaneSchedulerPrestepContext({') && boundary.includes('const { step, barIndex, drumStyle, drumLaneKitOverrides, root, groove } = stableRhythmLaneSchedulerPrestepContext.context;')), 
  staleGuardStillBeforePrestepContext:
    (app.indexOf('if (stationaryPlan.stale) {') >= 0 && app.indexOf('const stableRhythmLaneSchedulerPrestepContext = buildAppStableRhythmLaneSchedulerPrestepContext({') >= 0 && app.indexOf('if (stationaryPlan.stale) {') < app.indexOf('const stableRhythmLaneSchedulerPrestepContext = buildAppStableRhythmLaneSchedulerPrestepContext({')) || (app.indexOf('if (stationaryPlan.stale) {') >= 0 && app.indexOf('executeAppStableRhythmLaneSchedulerStepActionBoundary({') > app.indexOf('if (stationaryPlan.stale) {') && boundary.includes('buildAppStableRhythmLaneSchedulerPrestepContext({')), 
  prestepContextStillBeforeActionPort:
    (app.indexOf('const { step, barIndex, drumStyle, drumLaneKitOverrides, root, groove } = stableRhythmLaneSchedulerPrestepContext.context;') >= 0 && app.indexOf('const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({') >= 0 && app.indexOf('const { step, barIndex, drumStyle, drumLaneKitOverrides, root, groove } = stableRhythmLaneSchedulerPrestepContext.context;') < app.indexOf('const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({')) || (boundary.indexOf('buildAppStableRhythmLaneSchedulerPrestepContext({') >= 0 && boundary.indexOf('buildAppStableRhythmLaneSchedulerInlineActionPort({') > boundary.indexOf('buildAppStableRhythmLaneSchedulerPrestepContext({')), 
  actionPortAuditStillSaysPrestepCandidate:
    actionPortAudit.includes('pre-step-context-is-a-candidate-but-not-yet-extracted') &&
    actionPortAudit.includes('pre-step shared context until root/groove/drumStyle/barIndex provenance is separately audited'),
  callsiteProbeStillSourceOnly:
    callsiteProbe.includes('buildAppStableRhythmLaneSchedulerActionPort') &&
    !callsiteProbe.includes('APP_STABLE_RHYTHM_LANE_SCHEDULER_PRESTEP_CONTEXT_SHAPE_AUDIT'),
  shapeAuditStillBlocksRuntimeExtraction:
    shapeAudit.includes('runtimeOwned: false') &&
    shapeAudit.includes('schedulingOwned: false') &&
    shapeAudit.includes('nextStepWriteBack') || shapeAudit.includes('nexusRefs.current.nextAbsoluteStep'),
  noPrematureStableSchedulerRuntimeExtractionFiles: forbiddenExtractionFiles.every((rel) => !exists(rel)),
  monolithMapUpdated:
    monolithMap.includes("status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'") &&
    monolithMap.includes('APP_STABLE_RHYTHM_LANE_SCHEDULER_PRESTEP_CONTEXT_SHAPE_AUDIT') &&
    monolithMap.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary'),
  suiteAndContractIncludeGuard:
    suite.includes("script: 'xensonar:check-app-stable-rhythm-lane-scheduler-prestep-context-shape-audit'") &&
    suiteContract.includes("'xensonar:check-app-stable-rhythm-lane-scheduler-prestep-context-shape-audit'"),
  sourceSizeRemainsAuditScale: auditLines >= 170 && auditLines <= 260,
  appDidNotChangeForPrestepAudit: appLines <= 5625,
};

const failed = Object.entries(checks).filter(([, ok]) => !ok);

console.log(JSON.stringify({
  check: 'app-stable-rhythm-lane-scheduler-prestep-context-shape-audit',
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
