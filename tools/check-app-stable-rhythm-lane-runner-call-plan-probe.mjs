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
const registryPath = 'src/features/xensonar/input/appStableRhythmLaneRunnerCallPlanContractRegistryProbe.ts';
const callPlanPath = 'src/features/xensonar/input/appStableRhythmLaneRunnerCallPlanProbe.ts';
const executionRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneStepExecutionRunnerProbe.ts';
const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const drumRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneDrumStepRunnerProbe.ts';
const bassRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneBassStepRunnerProbe.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-runner-call-plan-probe';

const app = exists(appPath) ? read(appPath) : '';
const registry = exists(registryPath) ? read(registryPath) : '';
const callPlan = exists(callPlanPath) ? read(callPlanPath) : '';
const executionRunner = exists(executionRunnerPath) ? read(executionRunnerPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const drumRunner = exists(drumRunnerPath) ? read(drumRunnerPath) : '';
const bassRunner = exists(bassRunnerPath) ? read(bassRunnerPath) : '';
const map = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const forbiddenCallPlanNeedles = [
  'import React', 'useEffect(', 'useMemo(', 'useCallback(', 'useState(', 'useRef(',
  'window.setTimeout(', 'window.clearTimeout(', 'requestAnimationFrame(', 'cancelAnimationFrame(',
  'resolveStableRhythmLaneTimeWindow(', 'buildStableRhythmLaneStepPlan(', 'executeStableRhythmLaneStepPlan(',
  'nexusRefs.current.nextAbsoluteStep', 'ensureAudioReady(', 'createOscillator(', 'createGain(', '.connect(', '.start(', '.current =',
  'scheduleBassClipStep(', 'scheduleRhythmForgeBassStep(', 'scheduleRhythmForgeDrumStep(', 'schedulePsyBassStep(',
  'scheduleClassicBassPatternStep(', 'scheduleExportedDrumConfigStep(', 'readQuantizeBpm(', 'playBassNote(',
  'commitAppStableRhythmLanePatternCacheCandidateProbe(', 'commitAppStableRhythmLaneBassClipRootBindingProbe(',
];

const requiredContracts = [
  ['metronome', 'always', 'schedule-metronome-pulse', 'none', 'false'],
  ['drum', 'inactive', 'none', 'none', 'false'],
  ['drum', 'exported', 'schedule-exported-drum-config-step', 'none', 'false'],
  ['drum', 'rhythmforge', 'schedule-rhythmforge-drum-step-if-pattern-available', 'rhythmforge-drum-pattern-cache', 'false'],
  ['drum', 'classic', 'schedule-classic-drum-pattern', 'none', 'false'],
  ['bass', 'inactive', 'none', 'none', 'false'],
  ['bass', 'clip', 'schedule-bass-clip-step-if-clip-resolved', 'bass-clip-root-binding-cache', 'true'],
  ['bass', 'rhythmforge', 'schedule-rhythmforge-bass-step-if-pattern-available', 'rhythmforge-bass-pattern-cache', 'true'],
  ['bass', 'psybass', 'schedule-psy-bass-step-if-pattern-available', 'psybass-pattern-cache', 'true'],
  ['bass', 'classic', 'schedule-classic-bass-pattern', 'none', 'false'],
  ['myzel', 'always', 'apply-myzel-layer-step', 'none', 'false'],
];

requireCheck('expected files exist', [appPath, registryPath, callPlanPath, executionRunnerPath, boundaryPath, drumRunnerPath, bassRunnerPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-runner-call-plan-probe.mjs');
requireCheck('call plan exports probe builder', callPlan.includes('buildAppStableRhythmLaneRunnerCallPlanProbe') && callPlan.includes("probeKind: 'app-stable-rhythm-lane-runner-call-plan-probe'"));
requireCheck('call plan uses branch classifiers only', callPlan.includes('resolveAppStableRhythmLaneSchedulerDrumStepBranchProbe') && callPlan.includes('resolveAppStableRhythmLaneSchedulerBassStepBranchProbe'));
requireCheck('call plan delegates branch intent to registry', callPlan.includes('buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe') && callPlan.includes("'metronome', 'always'") && callPlan.includes("'myzel', 'always'"));
for (const [domain, branch, scheduler, cache, quantize] of requiredContracts) {
  requireCheck(`registry includes ${domain}:${branch}`, registry.includes(`domain: '${domain}'`) && registry.includes(`branchKind: '${branch}'`));
  requireCheck(`registry scheduler ${domain}:${branch}`, registry.includes(`schedulerCall: '${scheduler}'`));
  requireCheck(`registry cache ${domain}:${branch}`, registry.includes(`cacheContract: '${cache}'`));
  if (quantize === 'true') requireCheck(`registry quantize ${domain}:${branch}`, registry.includes(`branchKind: '${branch}'`) && registry.includes('branchLocalQuantizeRead: true'));
}
requireCheck('call plan stays shadow-only', forbiddenCallPlanNeedles.every((needle) => !callPlan.includes(needle)), forbiddenCallPlanNeedles.filter((needle) => callPlan.includes(needle)).join(', '));
requireCheck('execution runner offers optional observer only', executionRunner.includes('callPlanObserver?: (callPlan: AppStableRhythmLaneRunnerCallPlanProbe) => void') && executionRunner.includes('if (args.callPlanObserver)') && executionRunner.includes('buildAppStableRhythmLaneRunnerCallPlanProbe({'));
requireCheck('App does not pass an observer yet', !app.includes('callPlanObserver'));
requireCheck('boundary remains frame build then execute', boundary.includes('buildAppStableRhythmLaneStepExecutionFrameFromBoundaryProbe({') && boundary.includes('executeAppStableRhythmLaneStepExecutionFrameProbe({'));
requireCheck('concrete scheduling remains in real runners', drumRunner.includes('scheduleRhythmForgeDrumStep({') && bassRunner.includes('scheduleRhythmForgeBassStep({') && bassRunner.includes('scheduleBassClipStep({'));
const statusOk = [
  "status: 'stable-rhythm-lane-runner-call-plan-probed'",
  "status: 'stable-rhythm-lane-runner-call-plan-parity-probed'",
  "status: 'stable-rhythm-lane-runner-call-plan-fixture-probed'",
  "status: 'stable-rhythm-lane-runner-call-plan-contract-registry-probed'",
  "status: 'stable-rhythm-lane-boundary-ports-contract-probed'",
].some((needle) => map.includes(needle));
requireCheck('monolith map updated', map.includes('buildAppStableRhythmLaneRunnerCallPlanProbe') && statusOk && map.includes('Call-Plan') && map.includes('Transport-Verantwortung bleibt App-owned'));
requireCheck('suite includes guard', suite.includes(`script: '${scriptName}'`) && suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane runner call plan probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('app stable rhythm lane runner call plan probe OK');
console.log(' - branch/call/cache plan delegates intent to shared registry without scheduling');
console.log(' - no transport, timer, audio, cache mutation, or quantize read moved');
