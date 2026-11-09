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

const registryPath = 'src/features/xensonar/input/appStableRhythmLaneRunnerCallPlanContractRegistryProbe.ts';
const callPlanPath = 'src/features/xensonar/input/appStableRhythmLaneRunnerCallPlanProbe.ts';
const parityPath = 'src/features/xensonar/input/appStableRhythmLaneRunnerCallPlanParityProbe.ts';
const fixturePath = 'src/features/xensonar/input/appStableRhythmLaneRunnerCallPlanFixtureProbe.ts';
const executionRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneStepExecutionRunnerProbe.ts';
const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-runner-call-plan-contract-registry-probe';

const registry = exists(registryPath) ? read(registryPath) : '';
const callPlan = exists(callPlanPath) ? read(callPlanPath) : '';
const parity = exists(parityPath) ? read(parityPath) : '';
const fixture = exists(fixturePath) ? read(fixturePath) : '';
const executionRunner = exists(executionRunnerPath) ? read(executionRunnerPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const forbiddenRegistryNeedles = [
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

requireCheck('expected files exist', [registryPath, callPlanPath, parityPath, fixturePath, executionRunnerPath, boundaryPath, mapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-runner-call-plan-contract-registry-probe.mjs');
requireCheck('registry exports cases and resolvers', registry.includes('APP_STABLE_RHYTHM_LANE_RUNNER_CALL_PLAN_CONTRACT_CASES') && registry.includes('resolveAppStableRhythmLaneRunnerCallPlanContractProbe') && registry.includes('buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe'));
requireCheck('registry has no dependency on call-plan builder', !registry.includes("from './appStableRhythmLaneRunnerCallPlanProbe'"));
requireCheck('registry owns shared vocabulary types', ['AppStableRhythmLaneRunnerCallPlanSchedulerCall', 'AppStableRhythmLaneRunnerCallPlanCacheContract', 'AppStableRhythmLaneRunnerCallPlanStep'].every((typeName) => registry.includes(`export type ${typeName}`)));
requireCheck('registry stays shadow-only', forbiddenRegistryNeedles.every((needle) => !registry.includes(needle)), forbiddenRegistryNeedles.filter((needle) => registry.includes(needle)).join(', '));
for (const [domain, branch, scheduler, cache, quantize] of requiredContracts) {
  requireCheck(`registry includes ${domain}:${branch}`, registry.includes(`domain: '${domain}'`) && registry.includes(`branchKind: '${branch}'`));
  requireCheck(`registry scheduler ${domain}:${branch}`, registry.includes(`schedulerCall: '${scheduler}'`));
  requireCheck(`registry cache ${domain}:${branch}`, registry.includes(`cacheContract: '${cache}'`));
  if (quantize === 'true') requireCheck(`registry quantize ${domain}:${branch}`, registry.includes(`branchKind: '${branch}'`) && registry.includes('branchLocalQuantizeRead: true'));
}
requireCheck('call plan consumes registry', callPlan.includes('buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe') && !callPlan.includes('switch (drumStepBranch.kind)') && !callPlan.includes('switch (bassStepBranch.kind)'));
requireCheck('parity consumes registry', parity.includes('APP_STABLE_RHYTHM_LANE_RUNNER_CALL_PLAN_CONTRACT_CASES') && parity.includes('buildAppStableRhythmLaneRunnerCallPlanContractKeyProbe'));
requireCheck('fixtures consume registry', fixture.includes('buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe'));
requireCheck('execution runner optional observer only', executionRunner.includes('callPlanObserver?:') && executionRunner.includes('if (args.callPlanObserver)'));
requireCheck('boundary remains frame build then execute', boundary.includes('buildAppStableRhythmLaneStepExecutionFrameFromBoundaryProbe({') && boundary.includes('executeAppStableRhythmLaneStepExecutionFrameProbe({'));
requireCheck('monolith map updated', map.includes('APP_STABLE_RHYTHM_LANE_RUNNER_CALL_PLAN_CONTRACT_CASES') && (map.includes("status: 'stable-rhythm-lane-runner-call-plan-contract-registry-probed'") || map.includes("status: 'stable-rhythm-lane-boundary-ports-contract-probed'") || map.includes("'stable-rhythm-lane-call-plan-registry-vocabulary-probed'")) && map.includes('Call-Plan Contract Registry') && map.includes('Transport-Verantwortung bleibt App-owned'));
requireCheck('suite includes guard', suite.includes(`script: '${scriptName}'`) && suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane runner call plan contract registry probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('app stable rhythm lane runner call plan contract registry probe OK');
console.log(' - call-plan/parity/fixture intent matrix shares one registry');
console.log(' - registry performs no scheduling, audio, cache mutation, quantize read, or timer work');
