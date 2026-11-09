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
const fixturePath = 'src/features/xensonar/input/appStableRhythmLaneRunnerCallPlanFixtureProbe.ts';
const parityPath = 'src/features/xensonar/input/appStableRhythmLaneRunnerCallPlanParityProbe.ts';
const callPlanPath = 'src/features/xensonar/input/appStableRhythmLaneRunnerCallPlanProbe.ts';
const executionRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneStepExecutionRunnerProbe.ts';
const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const parityGuardPath = 'tools/check-app-stable-rhythm-lane-runner-call-plan-parity-probe.mjs';
const callPlanGuardPath = 'tools/check-app-stable-rhythm-lane-runner-call-plan-probe.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-runner-call-plan-fixture-probe';

const registry = exists(registryPath) ? read(registryPath) : '';
const fixture = exists(fixturePath) ? read(fixturePath) : '';
const parity = exists(parityPath) ? read(parityPath) : '';
const callPlan = exists(callPlanPath) ? read(callPlanPath) : '';
const executionRunner = exists(executionRunnerPath) ? read(executionRunnerPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const parityGuard = exists(parityGuardPath) ? read(parityGuardPath) : '';
const callPlanGuard = exists(callPlanGuardPath) ? read(callPlanGuardPath) : '';

const forbiddenFixtureNeedles = [
  'import React', 'useEffect(', 'useMemo(', 'useCallback(', 'useState(', 'useRef(',
  'window.setTimeout(', 'window.clearTimeout(', 'requestAnimationFrame(', 'cancelAnimationFrame(',
  'resolveStableRhythmLaneTimeWindow(', 'buildStableRhythmLaneStepPlan(', 'executeStableRhythmLaneStepPlan(',
  'nexusRefs.current.nextAbsoluteStep', 'ensureAudioReady(', 'createOscillator(', 'createGain(', '.connect(', '.start(', '.current =',
  'scheduleBassClipStep(', 'scheduleRhythmForgeBassStep(', 'scheduleRhythmForgeDrumStep(', 'schedulePsyBassStep(',
  'scheduleClassicBassPatternStep(', 'scheduleExportedDrumConfigStep(', 'readQuantizeBpm(', 'playBassNote(',
  'commitAppStableRhythmLanePatternCacheCandidateProbe(', 'commitAppStableRhythmLaneBassClipRootBindingProbe(',
];
const requiredFixtureNames = ['drum-inactive-bass-inactive','drum-exported-bass-clip','drum-rhythmforge-bass-rhythmforge','drum-classic-bass-psybass','drum-rhythmforge-bass-classic'];
const requiredBranches = ['metronome:always','drum:inactive','drum:exported','drum:rhythmforge','drum:classic','bass:inactive','bass:clip','bass:rhythmforge','bass:psybass','bass:classic','myzel:always'];

requireCheck('expected files exist', [registryPath, fixturePath, parityPath, callPlanPath, executionRunnerPath, boundaryPath, mapPath, pkgPath, suitePath, suiteContractPath, parityGuardPath, callPlanGuardPath].every(exists));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-runner-call-plan-fixture-probe.mjs');
requireCheck('fixture exports fixture list and runner', fixture.includes('APP_STABLE_RHYTHM_LANE_RUNNER_CALL_PLAN_FIXTURE_PROBES') && fixture.includes('runAppStableRhythmLaneRunnerCallPlanFixtureProbe'));
requireCheck('fixture builds steps through shared registry', fixture.includes('buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe'));
requireCheck('fixture actually invokes parity assertion', fixture.includes('assertAppStableRhythmLaneRunnerCallPlanParityProbe(fixture.callPlan)'));
requireCheck('fixture stays shadow-only', forbiddenFixtureNeedles.every((needle) => !fixture.includes(needle)), forbiddenFixtureNeedles.filter((needle) => fixture.includes(needle)).join(', '));
for (const name of requiredFixtureNames) requireCheck(`fixture includes ${name}`, fixture.includes(`'${name}'`));
for (const branch of requiredBranches) {
  const [domain, kind] = branch.split(':');
  requireCheck(`registry covers ${branch}`, registry.includes(`domain: '${domain}'`) && registry.includes(`branchKind: '${kind}'`));
}
requireCheck('registry covers quantize semantics', registry.includes("branchKind: 'clip'") && registry.includes('branchLocalQuantizeRead: true') && registry.includes("branchKind: 'classic'") && registry.includes('branchLocalQuantizeRead: false'));
requireCheck('parity assertion still shadow-only', parity.includes('assertAppStableRhythmLaneRunnerCallPlanParityProbe') && parity.includes('noCacheMutation: true') && parity.includes('noQuantizeRead: true') && parity.includes('noAudioAction: true'));
requireCheck('call plan builder still observes but does not schedule', callPlan.includes('buildAppStableRhythmLaneRunnerCallPlanProbe') && callPlan.includes('planBuiltWithoutScheduling: true') && callPlan.includes('noCacheMutation: true'));
requireCheck('execution runner still has optional observer only', executionRunner.includes('callPlanObserver?: (callPlan: AppStableRhythmLaneRunnerCallPlanProbe) => void') && executionRunner.includes('if (args.callPlanObserver)'));
requireCheck('boundary remains frame build then execute', boundary.includes('buildAppStableRhythmLaneStepExecutionFrameFromBoundaryProbe({') && boundary.includes('executeAppStableRhythmLaneStepExecutionFrameProbe({'));
const statusOk = [
  "status: 'stable-rhythm-lane-runner-call-plan-fixture-probed'",
  "status: 'stable-rhythm-lane-runner-call-plan-contract-registry-probed'",
  "status: 'stable-rhythm-lane-boundary-ports-contract-probed'",
].some((needle) => map.includes(needle));
requireCheck('monolith map updated', map.includes('runAppStableRhythmLaneRunnerCallPlanFixtureProbe') && statusOk && map.includes('Fixture-Probe') && map.includes('Transport-Verantwortung bleibt App-owned'));
requireCheck('older parity guard accepts successor', parityGuard.includes("stable-rhythm-lane-runner-call-plan-contract-registry-probed") && parityGuard.includes('statusOk'));
requireCheck('older call-plan guard accepts successor', callPlanGuard.includes("stable-rhythm-lane-runner-call-plan-contract-registry-probed") && callPlanGuard.includes('statusOk'));
requireCheck('suite includes guard', suite.includes(`script: '${scriptName}'`) && suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane runner call plan fixture probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('app stable rhythm lane runner call plan fixture probe OK');
console.log(' - fixture call plans execute the parity assertion surface');
console.log(' - fixtures consume the shared call-plan contract registry');
console.log(' - fixture layer performs no scheduling, audio, cache mutation, quantize read, or timer work');
