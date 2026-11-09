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

const drumRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneDrumStepRunnerProbe.ts';
const bassRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneBassStepRunnerProbe.ts';
const myzelRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneMyzelStepRunnerProbe.ts';
const executionRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneStepExecutionRunnerProbe.ts';
const callPlanPath = 'src/features/xensonar/input/appStableRhythmLaneRunnerCallPlanProbe.ts';
const parityPath = 'src/features/xensonar/input/appStableRhythmLaneRunnerCallPlanParityProbe.ts';
const fixturePath = 'src/features/xensonar/input/appStableRhythmLaneRunnerCallPlanFixtureProbe.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-hot-path-result-trim';

const required = [drumRunnerPath, bassRunnerPath, myzelRunnerPath, executionRunnerPath, callPlanPath, parityPath, fixturePath, monolithMapPath, pkgPath, suitePath, suiteContractPath];
const drumRunner = exists(drumRunnerPath) ? read(drumRunnerPath) : '';
const bassRunner = exists(bassRunnerPath) ? read(bassRunnerPath) : '';
const myzelRunner = exists(myzelRunnerPath) ? read(myzelRunnerPath) : '';
const executionRunner = exists(executionRunnerPath) ? read(executionRunnerPath) : '';
const callPlan = exists(callPlanPath) ? read(callPlanPath) : '';
const parity = exists(parityPath) ? read(parityPath) : '';
const fixture = exists(fixturePath) ? read(fixturePath) : '';
const map = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const allRunnerText = [drumRunner, bassRunner, myzelRunner].join('\n---runner---\n');
const forbiddenHotPathResultNeedles = [
  'AppStableRhythmLaneDrumStepRunnerProbeResult',
  'AppStableRhythmLaneBassStepRunnerProbeResult',
  'AppStableRhythmLaneMyzelStepRunnerProbeResult',
  "probeKind: 'app-stable-rhythm-lane-drum-step-runner-probe'",
  "probeKind: 'app-stable-rhythm-lane-bass-step-runner-probe'",
  "probeKind: 'app-stable-rhythm-lane-myzel-step-runner-probe'",
  'branchKind:',
  'applied: true',
];

requireCheck('expected files exist', required.every(exists), required.filter((rel) => !exists(rel)).join(', '));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-hot-path-result-trim.mjs');
requireCheck('drum runner is void hot path', drumRunner.includes('runAppStableRhythmLaneDrumStepProbe') && drumRunner.includes('): void =>') && drumRunner.includes('scheduleExportedDrumConfigStep({') && drumRunner.includes('scheduleRhythmForgeDrumStep({') && drumRunner.includes('args.drumMachine.schedulePattern('));
requireCheck('bass runner is void hot path', bassRunner.includes('runAppStableRhythmLaneBassStepProbe') && bassRunner.includes('): void =>') && bassRunner.includes('scheduleBassClipStep({') && bassRunner.includes('scheduleRhythmForgeBassStep({') && bassRunner.includes('schedulePsyBassStep({') && bassRunner.includes('scheduleClassicBassPatternStep({'));
requireCheck('myzel runner is void hot path', myzelRunner.includes('runAppStableRhythmLaneMyzelStepProbe') && myzelRunner.includes('): void =>') && myzelRunner.includes('args.frame.actionPorts.applyMyzelLayerStep(args.frame.plan.timeSec, args.frame.plan.step16);'));
requireCheck('runner hot path result metadata removed', forbiddenHotPathResultNeedles.every((needle) => !allRunnerText.includes(needle)), forbiddenHotPathResultNeedles.filter((needle) => allRunnerText.includes(needle)).join(', '));
requireCheck('execution runner does not collect runner return values', !executionRunner.includes('const drum') && !executionRunner.includes('const bass') && !executionRunner.includes('const myzel') && executionRunner.includes('runAppStableRhythmLaneDrumStepProbe({') && executionRunner.includes('runAppStableRhythmLaneBassStepProbe({ frame })') && executionRunner.includes('runAppStableRhythmLaneMyzelStepProbe({ frame })'));
requireCheck('call plan/parity fixtures remain cold proof path', callPlan.includes('buildAppStableRhythmLaneRunnerCallPlanProbe') && parity.includes('assertAppStableRhythmLaneRunnerCallPlanParityProbe') && fixture.includes('assertAppStableRhythmLaneRunnerCallPlanParityProbe') && !executionRunner.includes('runAppStableRhythmLaneRunnerCallPlanFixtureProbe'));
requireCheck('call plan observer remains optional only', executionRunner.includes('if (args.callPlanObserver)') && executionRunner.includes('args.callPlanObserver(buildAppStableRhythmLaneRunnerCallPlanProbe({'));
requireCheck('monolith map updated', (map.includes("status: 'stable-rhythm-lane-hot-path-result-trimmed'") || map.includes("successor lineage marker for older guards: status: 'stable-rhythm-lane-hot-path-result-trimmed'")) && map.includes('hot path runner result metadata trimmed') && map.includes('CallPlan/Parity/Fixture remain cold proof paths'));
requireCheck('suite includes guard', suite.includes(`script: '${scriptName}'`) && suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane hot path result trim check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app stable rhythm lane hot path result trim OK');
