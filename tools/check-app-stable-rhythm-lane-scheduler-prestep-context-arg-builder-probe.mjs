#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const builderPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerPrestepContextArgBuilderProbe.ts';
const shapeAuditPath = 'validation/contracts/xensonar/input/appStableRhythmLaneSchedulerPrestepContextShapeAudit.ts';
const actionPortAuditPath = 'validation/contracts/xensonar/input/appStableRhythmLaneSchedulerActionPortShapeAudit.ts';
const callsiteProbePath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerCallsiteSourceProbe.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const schedulerBody = `${app}\n${boundary}`;
const builder = exists(builderPath) ? read(builderPath) : '';
const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const actionPortAudit = exists(actionPortAuditPath) ? read(actionPortAuditPath) : '';
const callsiteProbe = exists(callsiteProbePath) ? read(callsiteProbePath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;
const builderLines = builder.split(/\r?\n/).length;

const forbiddenBuilderNeedles = [
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

const requiredBuilderNeedles = [
  'AppStableRhythmLaneSchedulerPrestepContextArgs',
  'AppStableRhythmLaneSchedulerPrestepContextArgBuilderProbe',
  'buildAppStableRhythmLaneSchedulerPrestepContext',
  "probeKind: 'app-stable-rhythm-lane-scheduler-prestep-context-arg-builder-probe'",
  'schedulerLoopStillInlineInApp: true',
  'prestepContextCallsiteStillInlineInApp: true',
  'staleGuardAlreadyPassed: true',
  'actionPortClosuresStillInlineInApp: true',
  'nextAbsoluteStepOwnerStillApp: true',
  'runtimeOwned: false',
  'audioOwned: false',
  'schedulingOwned: false',
  'stationaryPlanOwnerStillApp',
  'stepAndBarIndexReadAfterStaleGuard',
  'drumStyleReadPerStep',
  'drumLaneKitOverridesSanitizedPerStep',
  'rootResolvedPerStep',
  'grooveResolvedWithNextNoteTime',
];

const requiredContextShapeNeedles = [
  "readonly step: StableRhythmLaneStepPlan['step16'];",
  "readonly barIndex: StableRhythmLaneStepPlan['barIndex'];",
  'readonly drumStyle: DrumStyle;',
  'readonly drumLaneKitOverrides: DrumLaneKitOverrides;',
  'readonly root: number;',
  'readonly groove: GrooveState;',
];

const requiredAppNeedles = [
  'buildAppStableRhythmLaneSchedulerPrestepContext',
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
  'timerID = window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs);',
];

const forbiddenExtractionFiles = [
  'src/features/xensonar/input/useAppStableRhythmLaneScheduler.ts',
  'src/features/xensonar/input/appStableRhythmLaneSchedulerRuntime.ts',
  'src/features/xensonar/input/appStableRhythmLaneSchedulerBoundary.ts',
  'src/features/xensonar/audio/appStableRhythmLaneSchedulerRuntime.ts',
];

const includesAll = (content, needles) => needles.every((needle) => content.includes(needle));
const indexOf = (needle) => schedulerBody.indexOf(needle);
const appOnlyIndexOf = (needle) => app.indexOf(needle);

const staleGuardIndex = indexOf('if (stationaryPlan.stale) {');
const emptyPortIndex = indexOf('executeStableRhythmLaneStepPlan(stationaryPlan, {});');
const builderIndex = indexOf('const stableRhythmLaneSchedulerPrestepContext = buildAppStableRhythmLaneSchedulerPrestepContext({');
const destructureIndex = indexOf('const { step, barIndex, drumStyle, drumLaneKitOverrides, root, groove } = stableRhythmLaneSchedulerPrestepContext.context;');
const actionPortIndex = indexOf('const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({');
const executeIndex = indexOf('executeStableRhythmLaneStepPlan(stationaryPlan, stableRhythmLaneSchedulerActionPort);');
const nextStepWriteIndex = indexOf('nexusRefs.current.nextAbsoluteStep = nextStep;');

const checks = {
  expectedFilesExist: [
    appPath,
    boundaryPath,
    builderPath,
    shapeAuditPath,
    actionPortAuditPath,
    callsiteProbePath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast176: /^3\.2\.91\.6\.9\.(17[6-9]|1[8-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-stable-rhythm-lane-scheduler-prestep-context-arg-builder-probe'] ===
    'node tools/check-app-stable-rhythm-lane-scheduler-prestep-context-arg-builder-probe.mjs',
  builderDeclaresArgProbe: includesAll(builder, requiredBuilderNeedles),
  builderImportsOnlyTypes:
    builder.includes("import type { DrumStyle } from '../../resonance/drumMachine';") &&
    builder.includes("import type { GrooveState } from '../../resonance/rhythmforge/types';") &&
    builder.includes("import type { StableRhythmLaneStepPlan } from '../audio/stableRhythmLane';") &&
    builder.includes("import type { DrumLaneKitOverrides } from '../groove/drumKitRouting';"),
  builderIsPureTypeAndIdentityLayer: forbiddenBuilderNeedles.every((needle) => !builder.includes(needle)),
  builderMirrorsPrestepContextShape: includesAll(builder, requiredContextShapeNeedles),
  appUsesBuilderForPrestepContext: includesAll(app, requiredAppNeedles) || (app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({') && boundary.includes('buildAppStableRhythmLaneSchedulerPrestepContext({') && boundary.includes('step: args.stationaryPlan.step16,') && boundary.includes('barIndex: args.stationaryPlan.barIndex,')),
  staleGuardStillBeforePrestepBuilder:
    (staleGuardIndex >= 0 && emptyPortIndex >= 0 && builderIndex >= 0 && staleGuardIndex < emptyPortIndex && emptyPortIndex < builderIndex) || (appOnlyIndexOf('if (stationaryPlan.stale) {') >= 0 && appOnlyIndexOf('executeAppStableRhythmLaneSchedulerStepActionBoundary({') > appOnlyIndexOf('if (stationaryPlan.stale) {') && boundary.includes('buildAppStableRhythmLaneSchedulerPrestepContext({')), 
  prestepBuilderStillBeforeActionPort:
    (builderIndex >= 0 && destructureIndex >= 0 && actionPortIndex >= 0 && builderIndex < destructureIndex && destructureIndex < actionPortIndex) || (boundary.indexOf('buildAppStableRhythmLaneSchedulerPrestepContext({') >= 0 && boundary.indexOf('buildAppStableRhythmLaneSchedulerInlineActionPort({') > boundary.indexOf('buildAppStableRhythmLaneSchedulerPrestepContext({')), 
  actionPortStillBeforeExecution:
    (actionPortIndex >= 0 && executeIndex >= 0 && actionPortIndex < executeIndex) || (boundary.indexOf('buildAppStableRhythmLaneSchedulerInlineActionPort({') >= 0 && boundary.indexOf('executeStableRhythmLaneStepPlan(args.stationaryPlan, stableRhythmLaneSchedulerActionPort)') > boundary.indexOf('buildAppStableRhythmLaneSchedulerInlineActionPort({')), 
  nextAbsoluteStepWriteStillAppOwned:
    (executeIndex >= 0 && nextStepWriteIndex >= 0 && executeIndex < nextStepWriteIndex) || (appOnlyIndexOf('executeAppStableRhythmLaneSchedulerStepActionBoundary({') >= 0 && appOnlyIndexOf('nexusRefs.current.nextAbsoluteStep = nextStep;') > appOnlyIndexOf('executeAppStableRhythmLaneSchedulerStepActionBoundary({')), 
  schedulerLoopStillAppOwned:
    app.includes('const schedule = () => {') &&
    app.includes('window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs)') &&
    app.includes('window.clearTimeout(timerID)') &&
    app.includes('clearStableRhythmMetronomeTimeouts()'),
  noSchedulerRuntimeExtraction: forbiddenExtractionFiles.every((rel) => !exists(rel)),
  previousShapeAuditStillBlocksRuntimeExtract:
    shapeAudit.includes('do-not-move-prestep-context-before-stale-guard') &&
    shapeAudit.includes('do-not-convert-prestep-context-into-runtime-owner-yet') &&
    shapeAudit.includes('scheduler-runtime-extract-still-blocked'),
  actionPortAuditStillKeepsClosuresInline:
    actionPortAudit.includes('pre-step shared context until root/groove/drumStyle/barIndex provenance is separately audited') &&
    actionPortAudit.includes('stale-step empty-port branch because it protects action-port execution from late schedule catch-up'),
  callsiteProbeStillOnlyBuildsSourceAndActionPort:
    callsiteProbe.includes('buildAppStableRhythmLaneSchedulerCallsiteSource') &&
    callsiteProbe.includes('buildAppStableRhythmLaneSchedulerActionPort') &&
    !callsiteProbe.includes('window.setTimeout(') &&
    !callsiteProbe.includes('executeStableRhythmLaneStepPlan('),
  monolithMapUpdated:
    monolithMap.includes("status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'") &&
    (monolithMap.includes('buildAppStableRhythmLaneSchedulerPrestepContextArgs') || monolithMap.includes('buildAppStableRhythmLaneSchedulerPrestepContext')) &&
    monolithMap.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary') &&
    monolithMap.includes('outer scheduler transport remains App-owned'),
  suiteIncludesGuard:
    suite.includes("script: 'xensonar:check-app-stable-rhythm-lane-scheduler-prestep-context-arg-builder-probe'") &&
    suiteContract.includes("'xensonar:check-app-stable-rhythm-lane-scheduler-prestep-context-arg-builder-probe'"),
  appLineRangePlausibleForProbe: appLines <= 5650,
  builderLineRangePlausible: builderLines >= 55 && builderLines <= 95,
};

const failed = Object.entries(checks).filter(([, value]) => !value);
if (failed.length) {
  console.error('app stable rhythm lane scheduler pre-step context arg-builder probe check failed:');
  for (const [name] of failed) console.error(` - ${name}`);
  console.error(JSON.stringify({ appLines, builderLines, version: pkg.version }, null, 2));
  process.exit(1);
}

console.log('app stable rhythm lane scheduler pre-step context arg-builder probe check passed', JSON.stringify({ appLines, builderLines, version: pkg.version }, null, 2));
