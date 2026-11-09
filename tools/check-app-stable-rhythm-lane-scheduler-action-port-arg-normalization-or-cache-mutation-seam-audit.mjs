#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const auditPath = 'validation/contracts/xensonar/input/appStableRhythmLaneSchedulerActionPortArgNormalizationOrCacheMutationSeamAudit.ts';
const actionPortAuditPath = 'validation/contracts/xensonar/input/appStableRhythmLaneSchedulerActionPortShapeAudit.ts';
const prestepArgBuilderPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerPrestepContextArgBuilderProbe.ts';
const callsiteProbePath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerCallsiteSourceProbe.ts';
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
const prestepArgBuilder = exists(prestepArgBuilderPath) ? read(prestepArgBuilderPath) : '';
const callsiteProbe = exists(callsiteProbePath) ? read(callsiteProbePath) : '';
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
  'window.setTimeout(',
  'window.clearTimeout(',
  'requestAnimationFrame(',
  'cancelAnimationFrame(',
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
  'AppStableRhythmLaneSchedulerActionPortArgNormalizationOrCacheMutationSeamAudit',
  "cleanupKind: 'app-stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audit'",
  "decision: 'cache-mutation-seam-audit-before-action-port-arg-normalization'",
  'auditOnly: true',
  'actionPortArgNormalizationSafeNow: false',
  'cacheMutationSeamDominates: true',
  'schedulerLoopStillInlineInApp: true',
  'actionPortClosuresStillInlineInApp: true',
  'actionPortArgsMoved: false',
  'cacheMutationOwnershipMoved: false',
  'runtimeOwned: false',
  'audioOwned: false',
  'schedulingOwned: false',
  'metronome-plan-to-current-time-bridge',
  'exported-drum-step-args',
  'rhythm-forge-drum-step-args',
  'classic-drum-step-args',
  'bass-clip-step-args',
  'rhythm-forge-bass-step-args',
  'psy-bass-step-args',
  'classic-bass-step-args',
  'myzel-layer-step-args',
  'rhythmForgeDrumPatternRef.current',
  'rhythmForgeDrumBarIndexRef.current',
  'bassClipPlaybackCacheRef.current',
  'bassClipBarRootRef.current',
  'rhythmForgeBassPatternRef.current',
  'rhythmForgeBassBarIndexRef.current',
  'psyBassPatternRef.current',
  'psyBassBarIndexRef.current',
  'port-args-read-p-and-ref-cache-in-the-same-closure',
  'bass-clip-root-binding-mutates-bar-frozen-root-cache',
  'rhythm-forge-drum-and-bass-pattern-caches-share-bar-index-semantics',
  'psy-bass-cache-generation-depends-on-step-local-groove-descriptors',
  'quantize-bpm-read-remains-app-owned-through-nexusParamsRef',
  'action-port-closures-still-own-device-specific-scheduling-branches',
  'cache-mutation-seam-shape-audit',
  'drum-pattern-cache-seam',
  'bass-clip-cache-seam',
  'bass-generated-pattern-cache-seam',
  'metronome-current-time-bridge-seam',
  'myzel-layer-step-bridge-seam',
  'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit-before-action-port-arg-builder',
];

const requiredAppNeedles = [
  'const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({',
  'scheduleMetronomePulse: (plan) => {',
  'scheduleStableRhythmMetronomePulse(plan, audioCtx.currentTime);',
  'scheduleDrumStep: (plan) => {',
  'scheduleExportedDrumConfigStep({ drumMachine, entry: selectedExportedDrumConfig, stepIndex: plan.absoluteStep, time: plan.timeSec, stepDurationSec: stepMs, drumLevel: p.drumVolume, drumStyle, laneKitOverrides: drumLaneKitOverrides });',
  'rhythmForgeDrumPatternRef.current = rhythmForgeDrumCacheCandidate.nextPattern;',
  'rhythmForgeDrumBarIndexRef.current = rhythmForgeDrumCacheCandidate.nextBarIndex;',
  'drumMachine.schedulePattern(p.drumPattern, step, plan.timeSec, p.drumVolume, p.drumKit ?? "dusty_tape", drumStyle, drumLaneKitOverrides);',
  'scheduleBassStep: (plan) => {',
  'bassClipPlaybackCacheRef.current = bassClipRootBindingCandidate.nextPlaybackCache;',
  'bassClipBarRootRef.current = bassClipRootBindingCandidate.nextBarRoot;',
  'scheduleBassClipStep({ clip, step: plan.absoluteStep, time: plan.timeSec, rootHz: clipRootHz, bassLevel: v, quantizeBpm: nexusParamsRef.current.quantizeBpm, playBassNote });',
  'rhythmForgeBassPatternRef.current = rhythmForgeBassCacheCandidate.nextPattern;',
  'rhythmForgeBassBarIndexRef.current = rhythmForgeBassCacheCandidate.nextBarIndex;',
  'psyBassPatternRef.current = psyBassCacheCandidate.nextPattern;',
  'psyBassBarIndexRef.current = psyBassCacheCandidate.nextBarIndex;',
  'scheduleClassicBassPatternStep({',
  'applyMyzelStep: (plan) => {',
  'applyMyzelLayerStep(plan.timeSec, plan.step16);',
  'executeStableRhythmLaneStepPlan(stationaryPlan, stableRhythmLaneSchedulerActionPort);',
  'nexusRefs.current.nextAbsoluteStep = nextStep;',
];

const forbiddenExtractionFiles = [
  'src/features/xensonar/input/appStableRhythmLaneSchedulerActionPortArgsBuilder.ts',
  'src/features/xensonar/input/appStableRhythmLaneSchedulerActionPortArgBuilderProbe.ts',
  'src/features/xensonar/input/appStableRhythmLaneSchedulerCacheMutationRuntime.ts',
  'src/features/xensonar/input/useAppStableRhythmLaneScheduler.ts',
  'src/features/xensonar/input/appStableRhythmLaneSchedulerRuntime.ts',
  'src/features/xensonar/audio/appStableRhythmLaneSchedulerRuntime.ts',
];

const includesAll = (content, needles) => needles.every((needle) => content.includes(needle));
const indexOf = (needle) => schedulerBody.indexOf(needle);
const appOnlyIndexOf = (needle) => app.indexOf(needle);

const staleGuardIndex = indexOf('if (stationaryPlan.stale) {');
const prestepBuilderIndex = indexOf('const stableRhythmLaneSchedulerPrestepContext = buildAppStableRhythmLaneSchedulerPrestepContext({');
const actionPortIndex = indexOf('const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({');
const executeIndex = indexOf('executeStableRhythmLaneStepPlan(stationaryPlan, stableRhythmLaneSchedulerActionPort);');
const nextStepWriteIndex = indexOf('nexusRefs.current.nextAbsoluteStep = nextStep;');

const checks = {
  expectedFilesExist: [
    appPath,
    boundaryPath,
    auditPath,
    actionPortAuditPath,
    prestepArgBuilderPath,
    callsiteProbePath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast177: /^3\.2\.91\.6\.9\.(17[7-9]|1[8-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audit'] ===
    'node tools/check-app-stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audit.mjs',
  auditDeclaresDecision: includesAll(audit, requiredAuditNeedles),
  auditImportsOnlyTypes:
    audit.includes("import type { StableRhythmLaneActionPort, StableRhythmLaneStepPlan } from '../audio/stableRhythmLane';") &&
    audit.includes("import type { AppStableRhythmLaneSchedulerPrestepContextArgs } from './appStableRhythmLaneSchedulerPrestepContextArgBuilderProbe';"),
  auditIsPureTypeAndConstantLayer: forbiddenAuditNeedles.every((needle) => !audit.includes(needle)),
  appStillKeepsActionPortClosuresInline: includesAll(app, requiredAppNeedles) || (app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({') && boundary.includes('buildAppStableRhythmLaneSchedulerInlineActionPort({') && boundary.includes('scheduleDrumStep: (plan) => {') && boundary.includes('scheduleBassStep: (plan) => {') && boundary.includes('applyMyzelStep: (plan) => {') && boundary.includes('executeStableRhythmLaneStepPlan(args.stationaryPlan, stableRhythmLaneSchedulerActionPort)')), 
  staleGuardStillBeforePrestepBeforeActionPort:
    (staleGuardIndex >= 0 && prestepBuilderIndex >= 0 && actionPortIndex >= 0 && staleGuardIndex < prestepBuilderIndex && prestepBuilderIndex < actionPortIndex) || (appOnlyIndexOf('if (stationaryPlan.stale) {') >= 0 && appOnlyIndexOf('executeAppStableRhythmLaneSchedulerStepActionBoundary({') > appOnlyIndexOf('if (stationaryPlan.stale) {') && boundary.includes('buildAppStableRhythmLaneSchedulerPrestepContext({') && boundary.includes('buildAppStableRhythmLaneSchedulerInlineActionPort({')),
  actionPortStillBeforeExecutionBeforeNextStepWrite:
    (actionPortIndex >= 0 && executeIndex >= 0 && nextStepWriteIndex >= 0 && actionPortIndex < executeIndex && executeIndex < nextStepWriteIndex) || (boundary.includes('buildAppStableRhythmLaneSchedulerInlineActionPort({') && boundary.includes('executeStableRhythmLaneStepPlan(args.stationaryPlan, stableRhythmLaneSchedulerActionPort)') && appOnlyIndexOf('executeAppStableRhythmLaneSchedulerStepActionBoundary({') >= 0 && appOnlyIndexOf('nexusRefs.current.nextAbsoluteStep = nextStep;') > appOnlyIndexOf('executeAppStableRhythmLaneSchedulerStepActionBoundary({')),
  noActionPortArgBuilderIntroduced: forbiddenExtractionFiles.every((rel) => !exists(rel)),
  callsiteProbeStillIdentityOnly:
    callsiteProbe.includes('buildAppStableRhythmLaneSchedulerActionPort') &&
    callsiteProbe.includes('buildAppStableRhythmLaneSchedulerInlineActionPort') &&
    !callsiteProbe.includes('scheduleExportedDrumConfigStep(') &&
    !callsiteProbe.includes('bassClipPlaybackCacheRef'),
  prestepArgBuilderStillPure:
    prestepArgBuilder.includes('buildAppStableRhythmLaneSchedulerPrestepContextArgs') &&
    !prestepArgBuilder.includes('window.setTimeout(') &&
    !prestepArgBuilder.includes('executeStableRhythmLaneStepPlan(') &&
    !prestepArgBuilder.includes('.current ='),
  actionPortShapeAuditStillNamesMutations:
    actionPortAudit.includes('APP_STABLE_RHYTHM_LANE_SCHEDULER_ACTION_PORT_MUTATION_KEYS') &&
    actionPortAudit.includes('bassClipBarRootRef.current') &&
    actionPortAudit.includes('full-runtime-extraction-still-blocked-by-ref-mutation-and-time-truth'),
  monolithMapUpdated:
    monolithMap.includes("| 'stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audited'") &&
    ((/(status: 'stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audited'|status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'|status: 'rhythm-forge-drum-cache-helper-probed'|status: 'bass-clip-root-binding-helper-probed'|status: 'rhythm-forge-bass-cache-helper-probed'|status: 'psy-bass-cache-helper-probed'|status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted')/.test(monolithMap) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || ((monolithMap.includes("status: 'input-metronome-scaffolding-contracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'global-input-low-risk-hook-extracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || monolithMap.includes("status: 'arrow-motion-raf-hook-extracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'"))))) &&
    monolithMap.includes('APP_STABLE_RHYTHM_LANE_SCHEDULER_ACTION_PORT_ARG_NORMALIZATION_OR_CACHE_MUTATION_SEAM_AUDIT') &&
    (monolithMap.includes('not extract stable-lane ownership') || monolithMap.includes('outer scheduler transport remains App-owned')),
  suiteIncludesGuard:
    suite.includes("script: 'xensonar:check-app-stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audit'") &&
    suiteContract.includes("'xensonar:check-app-stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audit'"),
  appLineRangePlausibleForAuditOnly: appLines <= 5650,
  auditLineRangePlausible: auditLines >= 130 && auditLines <= 230,
};

const failed = Object.entries(checks).filter(([, value]) => !value);
if (failed.length) {
  console.error('app stable rhythm lane scheduler action-port arg normalization or cache mutation seam audit check failed:');
  for (const [name] of failed) console.error(` - ${name}`);
  console.error(JSON.stringify({ appLines, auditLines, version: pkg.version }, null, 2));
  process.exit(1);
}

console.log('app stable rhythm lane scheduler action-port arg normalization or cache mutation seam audit check passed', JSON.stringify({ appLines, auditLines, version: pkg.version }, null, 2));
