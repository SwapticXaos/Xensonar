#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const failures = [];
const requireCheck = (name, condition, detail = '') => {
  if (!condition) failures.push(detail ? `${name}: ${detail}` : name);
};

const appPath = 'src/App.tsx';
const auditPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerCacheHelperCandidateAudits.ts';
const seamAuditPath = 'validation/contracts/xensonar/input/appStableRhythmLaneSchedulerCacheMutationSeamShapeAudit.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const schedulerBody = `${app}\n${boundary}`;
const audit = exists(auditPath) ? read(auditPath) : '';
const seamAudit = exists(seamAuditPath) ? read(seamAuditPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const auditIndex = (needle) => audit.indexOf(needle);
const appIndex = (needle) => schedulerBody.indexOf(needle);
const suiteIndex = (needle) => suite.indexOf(needle);

const rhythmCandidateIndex = auditIndex("candidate: 'rhythm-forge-drum-cache-helper-candidate'");
const bassCandidateIndex = auditIndex("candidate: 'bass-clip-root-binding-cache-helper-candidate'");
const staleIndex = appIndex('if (stationaryPlan.stale) {');
const prestepIndex = appIndex('const stableRhythmLaneSchedulerPrestepContext = buildAppStableRhythmLaneSchedulerPrestepContext({');
const actionPortIndex = appIndex('const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({');
const drumHelperIndex = appIndex('const rhythmForgeDrumCacheCandidate = resolveAppRhythmForgeDrumCacheHelperProbe({');
const drumWriteIndex = Math.max(appIndex('rhythmForgeDrumPatternRef.current = rhythmForgeDrumCacheCandidate.nextPattern;'), appIndex('cacheRefs.rhythmForgeDrumPatternRef.current = rhythmForgeDrumCacheCandidate.nextPattern;'));
const bassClipHelperIndex = appIndex('const bassClipRootBindingCandidate = resolveAppBassClipRootBindingHelperProbe({');
const bassClipReadWriteIndex = Math.max(appIndex('bassClipPlaybackCacheRef.current = bassClipRootBindingCandidate.nextPlaybackCache;'), appIndex('cacheRefs.bassClipPlaybackCacheRef.current = bassClipRootBindingCandidate.nextPlaybackCache;'));
const bassRootWriteIndex = Math.max(appIndex('bassClipBarRootRef.current = bassClipRootBindingCandidate.nextBarRoot;'), appIndex('cacheRefs.bassClipBarRootRef.current = bassClipRootBindingCandidate.nextBarRoot;'));

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
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'schedulePsyBassStep(',
  'playBassNote(',
  'recordAudioPressureAdaptiveAction(',
  'nexusRefs.current.nextAbsoluteStep =',
  '.current =',
];

const scriptName = 'xensonar:check-app-stable-rhythm-lane-scheduler-cache-helper-candidate-audits';

requireCheck('expected files exist', [appPath, auditPath, seamAuditPath, monolithMapPath, pkgPath, suitePath, suiteContractPath, boundaryPath].every(exists));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-scheduler-cache-helper-candidate-audits.mjs');
requireCheck('audit declares combined cleanup kind', audit.includes("cleanupKind: 'app-stable-rhythm-lane-scheduler-cache-helper-candidate-audits'"));
requireCheck('audit is ordered', audit.includes('ordered: true') && audit.includes("firstCandidate: 'rhythm-forge-drum-cache-helper-candidate'") && audit.includes("secondCandidate: 'bass-clip-root-binding-cache-helper-candidate'"));
requireCheck('rhythm candidate precedes bass candidate', rhythmCandidateIndex >= 0 && bassCandidateIndex > rhythmCandidateIndex);
requireCheck('rhythm candidate keeps writer in App', audit.includes("helperCandidateName: 'resolveRhythmForgeDrumCacheCandidate'") && audit.includes('drum-cache-not-shared-with-bass-cache') && audit.includes('role-specific-seed-xor-kept'));
requireCheck('bass candidate keeps root-binding provenance', audit.includes("helperCandidateName: 'resolveBassClipPlaybackRootBindingCandidate'") && audit.includes('bar-frozen-root-binding-preserves-clip-id-and-bar-index') && audit.includes('free-binding-prefers-clip-generator-root-hz') && audit.includes('live-step-root-binding-keeps-current-root'));
requireCheck('audit forbids runtime/writer extract now', audit.includes('safeToExtractWriterNow: false') && audit.includes('safeToExtractRuntimeNow: false') && audit.includes('cacheWritesStillInlineInApp: true') && audit.includes('actionPortClosuresStillInlineInApp: true'));
requireCheck('prior seam audit still points to helper candidates', seamAudit.includes('drum-pattern-cache-helper-candidate') && seamAudit.includes('bass-clip-cache-helper-candidate'));
requireCheck('App still owns stale guard before action port', staleIndex >= 0 && prestepIndex > staleIndex && actionPortIndex > prestepIndex);
requireCheck('App still owns rhythm forge drum writer', drumHelperIndex > actionPortIndex && drumWriteIndex > drumHelperIndex && (schedulerBody.includes('rhythmForgeDrumBarIndexRef.current = rhythmForgeDrumCacheCandidate.nextBarIndex;') || schedulerBody.includes('cacheRefs.rhythmForgeDrumBarIndexRef.current = rhythmForgeDrumCacheCandidate.nextBarIndex;')) && schedulerBody.includes('scheduleRhythmForgeDrumStep({')); 
requireCheck('App still owns bass clip playback/root writers', bassClipHelperIndex > actionPortIndex && bassClipReadWriteIndex > bassClipHelperIndex && bassRootWriteIndex > bassClipReadWriteIndex && schedulerBody.includes('scheduleBassClipStep({')); 
requireCheck('audit stays static', forbiddenAuditNeedles.every((needle) => !audit.includes(needle)), forbiddenAuditNeedles.filter((needle) => audit.includes(needle)).join(', '));
requireCheck('monolith map mentions helper candidate audits', monolithMap.includes('APP_STABLE_RHYTHM_LANE_SCHEDULER_CACHE_HELPER_CANDIDATE_AUDITS') && monolithMap.includes('rhythm-forge drum cache helper candidate first') && monolithMap.includes('bass-clip root-binding cache helper candidate second'));
const suiteScriptNeedle = `script: '${scriptName}'`;
requireCheck('suite includes new script', suite.includes(suiteScriptNeedle));
requireCheck('suite orders helper candidates after cache mutation seam', suiteIndex("script: 'xensonar:check-app-stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit'") >= 0 && suiteIndex(suiteScriptNeedle) > suiteIndex("script: 'xensonar:check-app-stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audit'"));
requireCheck('suite contract includes new script', suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('Stable rhythm lane scheduler cache helper candidate audit check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('Stable rhythm lane scheduler cache helper candidate audits OK');
console.log(` - first: rhythm-forge drum cache helper candidate`);
console.log(` - second: bass-clip root-binding cache helper candidate`);
console.log(' - writer/runtime extraction remains blocked');
