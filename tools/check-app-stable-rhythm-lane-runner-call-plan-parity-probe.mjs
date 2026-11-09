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
const parityPath = 'src/features/xensonar/input/appStableRhythmLaneRunnerCallPlanParityProbe.ts';
const callPlanPath = 'src/features/xensonar/input/appStableRhythmLaneRunnerCallPlanProbe.ts';
const executionRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneStepExecutionRunnerProbe.ts';
const drumRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneDrumStepRunnerProbe.ts';
const bassRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneBassStepRunnerProbe.ts';
const myzelRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneMyzelStepRunnerProbe.ts';
const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-runner-call-plan-parity-probe';

const registry = exists(registryPath) ? read(registryPath) : '';
const parity = exists(parityPath) ? read(parityPath) : '';
const callPlan = exists(callPlanPath) ? read(callPlanPath) : '';
const executionRunner = exists(executionRunnerPath) ? read(executionRunnerPath) : '';
const drumRunner = exists(drumRunnerPath) ? read(drumRunnerPath) : '';
const bassRunner = exists(bassRunnerPath) ? read(bassRunnerPath) : '';
const myzelRunner = exists(myzelRunnerPath) ? read(myzelRunnerPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const map = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const forbiddenParityNeedles = [
  'import React', 'useEffect(', 'useMemo(', 'useCallback(', 'useState(', 'useRef(',
  'window.setTimeout(', 'window.clearTimeout(', 'requestAnimationFrame(', 'cancelAnimationFrame(',
  'resolveStableRhythmLaneTimeWindow(', 'buildStableRhythmLaneStepPlan(', 'executeStableRhythmLaneStepPlan(',
  'nexusRefs.current.nextAbsoluteStep', 'ensureAudioReady(', 'createOscillator(', 'createGain(', '.connect(', '.start(', '.current =',
  'scheduleBassClipStep(', 'scheduleRhythmForgeBassStep(', 'scheduleRhythmForgeDrumStep(', 'schedulePsyBassStep(',
  'scheduleClassicBassPatternStep(', 'scheduleExportedDrumConfigStep(', 'readQuantizeBpm(', 'playBassNote(',
  'commitAppStableRhythmLanePatternCacheCandidateProbe(', 'commitAppStableRhythmLaneBassClipRootBindingProbe(',
];
const requiredBranches = ['metronome:always','drum:inactive','drum:exported','drum:rhythmforge','drum:classic','bass:inactive','bass:clip','bass:rhythmforge','bass:psybass','bass:classic','myzel:always'];

requireCheck('expected files exist', [registryPath, parityPath, callPlanPath, executionRunnerPath, drumRunnerPath, bassRunnerPath, myzelRunnerPath, boundaryPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-runner-call-plan-parity-probe.mjs');
requireCheck('parity delegates expected cases to registry', parity.includes('APP_STABLE_RHYTHM_LANE_RUNNER_CALL_PLAN_CONTRACT_CASES') && parity.includes('buildAppStableRhythmLaneRunnerCallPlanContractKeyProbe'));
requireCheck('parity exports assertion', parity.includes('assertAppStableRhythmLaneRunnerCallPlanParityProbe') && parity.includes("probeKind: 'app-stable-rhythm-lane-runner-call-plan-parity-probe'"));
for (const branch of requiredBranches) {
  const [domain, kind] = branch.split(':');
  requireCheck(`registry covers ${branch}`, registry.includes(`domain: '${domain}'`) && registry.includes(`branchKind: '${kind}'`));
}
requireCheck('parity stays shadow-only', forbiddenParityNeedles.every((needle) => !parity.includes(needle)), forbiddenParityNeedles.filter((needle) => parity.includes(needle)).join(', '));
requireCheck('call plan builder exists', callPlan.includes('buildAppStableRhythmLaneRunnerCallPlanProbe') && callPlan.includes('buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe'));
requireCheck('execution runner optional observer only', executionRunner.includes('callPlanObserver?:') && executionRunner.includes('if (args.callPlanObserver)'));
requireCheck('real drum runner still executes all non-inactive branches', drumRunner.includes('case \'exported\'') && drumRunner.includes('scheduleExportedDrumConfigStep({') && drumRunner.includes('case \'rhythmforge\'') && drumRunner.includes('scheduleRhythmForgeDrumStep({') && drumRunner.includes('case \'classic\'') && drumRunner.includes('schedulePattern('));
requireCheck('real bass runner still executes all non-inactive branches', bassRunner.includes('case \'clip\'') && bassRunner.includes('scheduleBassClipStep({') && bassRunner.includes('case \'rhythmforge\'') && bassRunner.includes('scheduleRhythmForgeBassStep({') && bassRunner.includes('case \'psybass\'') && bassRunner.includes('schedulePsyBassStep({') && bassRunner.includes('case \'classic\'') && bassRunner.includes('scheduleClassicBassPatternStep({'));
requireCheck('real myzel runner remains dispatch-only', myzelRunner.includes('applyMyzelLayerStep(args.frame.plan.timeSec, args.frame.plan.step16)') && !myzelRunner.includes('window.setTimeout('));
requireCheck('boundary remains frame build then execute', boundary.includes('buildAppStableRhythmLaneStepExecutionFrameFromBoundaryProbe({') && boundary.includes('executeAppStableRhythmLaneStepExecutionFrameProbe({'));
requireCheck('classic bass remains unquantized while quantized branches read locally', !/case 'classic':[\s\S]*?readQuantizeBpm/.test(bassRunner) && bassRunner.includes('buildAppStableRhythmLaneQuantizedBassStepValuesProbe({'));
const statusOk = [
  "status: 'stable-rhythm-lane-runner-call-plan-parity-probed'",
  "status: 'stable-rhythm-lane-runner-call-plan-fixture-probed'",
  "status: 'stable-rhythm-lane-runner-call-plan-contract-registry-probed'",
  "status: 'stable-rhythm-lane-boundary-ports-contract-probed'",
].some((needle) => map.includes(needle));
requireCheck('monolith map updated', map.includes('assertAppStableRhythmLaneRunnerCallPlanParityProbe') && statusOk && map.includes('Shadow-Parity') && map.includes('Transport-Verantwortung bleibt App-owned'));
requireCheck('suite includes guard', suite.includes(`script: '${scriptName}'`) && suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane runner call plan parity probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('app stable rhythm lane runner call plan parity probe OK');
console.log(' - parity cases consume shared contract registry');
console.log(' - real runner switch branches still contain the concrete scheduling calls');
console.log(' - parity layer performs no scheduling, audio, cache mutation, quantize read, or timer work');
