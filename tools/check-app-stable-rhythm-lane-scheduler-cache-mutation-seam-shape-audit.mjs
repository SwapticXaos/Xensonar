#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const auditPath = 'validation/contracts/xensonar/input/appStableRhythmLaneSchedulerCacheMutationSeamShapeAudit.ts';
const priorAuditPath = 'validation/contracts/xensonar/input/appStableRhythmLaneSchedulerActionPortArgNormalizationOrCacheMutationSeamAudit.ts';
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
const priorAudit = exists(priorAuditPath) ? read(priorAuditPath) : '';
const callsiteProbe = exists(callsiteProbePath) ? read(callsiteProbePath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;
const auditLines = audit.split(/\r?\n/).length;
const indexOf = (needle) => schedulerBody.indexOf(needle);
const appOnlyIndexOf = (needle) => app.indexOf(needle);

const schedulerIndex = appOnlyIndexOf('const schedule = () => {');
const staleGuardIndex = indexOf('if (stationaryPlan.stale) {');
const prestepIndex = indexOf('const stableRhythmLaneSchedulerPrestepContext = buildAppStableRhythmLaneSchedulerPrestepContext({');
const actionPortIndex = indexOf('const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({');
const nextStepWriteIndex = appOnlyIndexOf('nexusRefs.current.nextAbsoluteStep = nextStep;');

const requiredAuditNeedles = [
  'AppStableRhythmLaneSchedulerCacheMutationSeamShapeAudit',
  "cleanupKind: 'app-stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit'",
  'auditOnly: true',
  'schedulerLoopStillInlineInApp: true',
  'actionPortClosuresStillInlineInApp: true',
  'cacheWritesStillInlineInApp: true',
  'cacheReadsStillInlineInApp: true',
  'cacheMutationRuntimeIntroduced: false',
  'actionPortArgBuilderIntroduced: false',
  'schedulingOwned: false',
  'runtimeOwned: false',
  'audioOwned: false',
  "family: 'rhythm-forge-drum-pattern-bar-cache'",
  "family: 'bass-clip-playback-root-binding-cache'",
  "family: 'rhythm-forge-bass-pattern-bar-cache'",
  "family: 'psy-bass-pattern-bar-cache'",
  'APP_STABLE_RHYTHM_LANE_SCHEDULER_CACHE_MUTATION_SEAM_FAMILIES',
  'APP_STABLE_RHYTHM_LANE_SCHEDULER_CACHE_MUTATION_SEAM_SHAPE_AUDIT',
  "nextSafeMove: 'stable-rhythm-lane-scheduler-cache-helper-candidate-audit-before-runtime-extract'",
];

const requiredCacheRefNeedles = [
  'rhythmForgeDrumPatternRef.current',
  'rhythmForgeDrumBarIndexRef.current',
  'bassClipPlaybackCacheRef.current',
  'bassClipBarRootRef.current',
  'rhythmForgeBassPatternRef.current',
  'rhythmForgeBassBarIndexRef.current',
  'psyBassPatternRef.current',
  'psyBassBarIndexRef.current',
];

const requiredAppMutationNeedles = [
  'rhythmForgeDrumPatternRef.current = rhythmForgeDrumCacheCandidate.nextPattern;',
  'rhythmForgeDrumBarIndexRef.current = rhythmForgeDrumCacheCandidate.nextBarIndex;',
  'bassClipPlaybackCacheRef.current = bassClipRootBindingCandidate.nextPlaybackCache;',
  'bassClipBarRootRef.current = bassClipRootBindingCandidate.nextBarRoot;',
  'rhythmForgeBassPatternRef.current = rhythmForgeBassCacheCandidate.nextPattern;',
  'rhythmForgeBassBarIndexRef.current = rhythmForgeBassCacheCandidate.nextBarIndex;',
  'psyBassPatternRef.current = psyBassCacheCandidate.nextPattern;',
  'psyBassBarIndexRef.current = psyBassCacheCandidate.nextBarIndex;',
];

const requiredProvenanceNeedles = [
  'barIndex-from-stationaryPlan',
  'root-from-resolveCurrentBassRootHz',
  'groove-descriptors-from-myceliumSnapshot-at-nextNoteTime',
  'drumStyle-from-getDrumStyle',
  'bassClipId-from-nexusParamsRef-current',
  'quantizeBpm-from-nexusParamsRef-current',
  'rhythmForgeSeedRef-current',
];

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
  'schedulePsyBassStep(',
  'scheduleBassClipStep(',
  'playBassNote(',
  'recordAudioPressureAdaptiveAction(',
  'nexusRefs.current.nextAbsoluteStep =',
  '.current =',
];

const forbiddenNewRuntimeFiles = [
  'src/features/xensonar/input/appStableRhythmLaneSchedulerCacheMutationRuntime.ts',
  'src/features/xensonar/input/useAppStableRhythmLaneScheduler.ts',
  'src/features/xensonar/input/appStableRhythmLaneSchedulerRuntime.ts',
];

const checks = {
  expectedFilesExist: [
    appPath,
    boundaryPath,
    auditPath,
    priorAuditPath,
    callsiteProbePath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast181: /^3\.2\.91\.6\.9\.(181|18[2-9]|19[0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit'] ===
    'node tools/check-app-stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit.mjs',
  appStillNearOrBelowChatStartAfterHelperProbes: appLines <= 5498,
  auditContainsExpectedShape: requiredAuditNeedles.every((needle) => audit.includes(needle)),
  auditListsEveryCacheRef: requiredCacheRefNeedles.every((needle) => audit.includes(needle)),
  auditListsProvenance: requiredProvenanceNeedles.every((needle) => audit.includes(needle)),
  auditDoesNotOwnRuntimeAudioOrScheduling: forbiddenAuditNeedles.every((needle) => !audit.includes(needle)),
  noNewRuntimeFiles: forbiddenNewRuntimeFiles.every((rel) => !exists(rel)),
  priorAuditStillPointsHere:
    priorAudit.includes('cacheMutationSeamDominates: true') &&
    priorAudit.includes('stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit-before-action-port-arg-builder'),
  appKeepsSchedulerInline:
    schedulerIndex >= 0 &&
    app.includes('const stableRhythmLaneSchedulerSource = buildAppStableRhythmLaneSchedulerCompactCallsiteSource({') &&
    (app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({') || app.includes('const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({')) &&
    (boundary.includes('executeStableRhythmLaneStepPlan(args.stationaryPlan, stableRhythmLaneSchedulerActionPort)') || app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, stableRhythmLaneSchedulerActionPort);')) &&
    app.includes('timerID = window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs);'),
  staleGuardPrecedesPrestepAndActionPort:
    schedulerIndex >= 0 && staleGuardIndex > schedulerIndex && (app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({') || (prestepIndex > staleGuardIndex && actionPortIndex > prestepIndex)),
  nextAbsoluteStepStillAppOwned:
    nextStepWriteIndex > (app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({') ? appOnlyIndexOf('executeAppStableRhythmLaneSchedulerStepActionBoundary({') : actionPortIndex) &&
    app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;'),
  appKeepsEveryCacheMutationInline: requiredAppMutationNeedles.every((needle) => schedulerBody.includes(needle) || schedulerBody.includes(needle.replace(/^(\w+)/, 'cacheRefs.$1'))),
  callsiteProbeStillOnlyBuildsInlineActionPort:
    callsiteProbe.includes('buildAppStableRhythmLaneSchedulerInlineActionPort') &&
    callsiteProbe.includes('actionPortClosuresStillInlineInApp: true') &&
    !callsiteProbe.includes('appStableRhythmLaneSchedulerCacheMutationRuntime'),
  monolithMapUpdated:
    monolithMap.includes("| 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") &&
    /(status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'|status: 'rhythm-forge-drum-cache-helper-probed'|status: 'bass-clip-root-binding-helper-probed'|status: 'rhythm-forge-bass-cache-helper-probed'|status: 'psy-bass-cache-helper-probed'|status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted')/.test(monolithMap) &&
    monolithMap.includes('APP_STABLE_RHYTHM_LANE_SCHEDULER_CACHE_MUTATION_SEAM_SHAPE_AUDIT') &&
    (monolithMap.includes('cache mutation seam shape audit only; cache writes stay inline') || monolithMap.includes('stable rhythm lane scheduler step-action boundary extracted') || monolithMap.includes('rhythm-forge drum helper now read/generate/return-probed') || monolithMap.includes('rhythm-forge drum and bass-clip root-binding helpers now probed') || monolithMap.includes('rhythm-forge drum, bass-clip root-binding, rhythm-forge bass, and psybass helpers now probed')),
  suiteUpdated:
    suite.includes("script: 'xensonar:check-app-stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit'") &&
    suiteContract.includes("'xensonar:check-app-stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit'"),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok);
if (failed.length) {
  console.error('app stable rhythm lane scheduler cache mutation seam shape audit check failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log('app stable rhythm lane scheduler cache mutation seam shape audit check passed', JSON.stringify({ appLines, auditLines, version: pkg.version }, null, 2));
