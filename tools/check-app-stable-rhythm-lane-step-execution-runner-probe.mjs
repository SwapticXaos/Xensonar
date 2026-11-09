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
const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const framePath = 'src/features/xensonar/input/appStableRhythmLaneStepExecutionFrameProbe.ts';
const frameBuilderPath = 'src/features/xensonar/input/appStableRhythmLaneStepExecutionFrameBuilderProbe.ts';
const executionRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneStepExecutionRunnerProbe.ts';
const drumRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneDrumStepRunnerProbe.ts';
const bassRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneBassStepRunnerProbe.ts';
const myzelRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneMyzelStepRunnerProbe.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-step-execution-runner-probe';

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const frame = exists(framePath) ? read(framePath) : '';
const frameBuilder = exists(frameBuilderPath) ? read(frameBuilderPath) : '';
const executionRunner = exists(executionRunnerPath) ? read(executionRunnerPath) : '';
const drumRunner = exists(drumRunnerPath) ? read(drumRunnerPath) : '';
const bassRunner = exists(bassRunnerPath) ? read(bassRunnerPath) : '';
const myzelRunner = exists(myzelRunnerPath) ? read(myzelRunnerPath) : '';
const map = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const boundaryLines = boundary.split(/\r?\n/).length;

const forbiddenExecutionRunnerNeedles = [
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
  'resolveStableRhythmLaneTimeWindow(',
  'buildStableRhythmLaneStepPlan(',
  'nexusRefs.current.nextAbsoluteStep',
  'ensureAudioReady(',
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  '.current =',
  'scheduleBassClipStep(',
  'scheduleRhythmForgeBassStep(',
  'scheduleRhythmForgeDrumStep(',
  'schedulePsyBassStep(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
];

requireCheck('expected files exist', [appPath, boundaryPath, framePath, frameBuilderPath, executionRunnerPath, drumRunnerPath, bassRunnerPath, myzelRunnerPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-step-execution-runner-probe.mjs');
requireCheck('execution runner exports frame executor', executionRunner.includes('executeAppStableRhythmLaneStepExecutionFrameProbe') && executionRunner.includes('AppStableRhythmLaneStepExecutionRunnerProbeArgs'));
requireCheck('execution runner builds the action port', executionRunner.includes('buildAppStableRhythmLaneSchedulerInlineActionPort({') && executionRunner.includes('scheduleMetronomePulse: (plan) =>') && executionRunner.includes('executeStableRhythmLaneStepPlan(frame.plan, stableRhythmLaneSchedulerActionPort)'));
requireCheck('execution runner delegates to all step runners', executionRunner.includes('runAppStableRhythmLaneDrumStepProbe({') && executionRunner.includes('runAppStableRhythmLaneBassStepProbe({ frame })') && executionRunner.includes('runAppStableRhythmLaneMyzelStepProbe({ frame })'));
requireCheck('execution runner keeps metronome read through ports', executionRunner.includes('frame.actionPorts.scheduleStableRhythmMetronomePulse(plan, frame.readPorts.readMetronomeAudioNowSec())'));
requireCheck('execution runner stays out of transport/audio construction', forbiddenExecutionRunnerNeedles.every((needle) => !executionRunner.includes(needle)), forbiddenExecutionRunnerNeedles.filter((needle) => executionRunner.includes(needle)).join(', '));
requireCheck('boundary builds or receives frame then executes frame', (boundary.includes('buildAppStableRhythmLaneStepExecutionFrameProbe({') || boundary.includes('buildAppStableRhythmLaneStepExecutionFrameFromBoundaryProbe({')) && boundary.includes('return executeAppStableRhythmLaneStepExecutionFrameProbe({') && boundary.includes('frame: stableRhythmLaneStepExecutionFrame'));
requireCheck('frame builder can now own frame preparation', frameBuilder.includes('buildAppStableRhythmLaneStepExecutionFrameFromBoundaryProbe') && frameBuilder.includes('buildAppStableRhythmLaneStepExecutionFrameProbe({'));
requireCheck('boundary no longer assembles action port directly', !boundary.includes('buildAppStableRhythmLaneSchedulerInlineActionPort({') && !boundary.includes('executeStableRhythmLaneStepPlan(args.stationaryPlan') && !boundary.includes('scheduleDrumStep: (_plan) =>') && !boundary.includes('scheduleBassStep: (_plan) =>') && !boundary.includes('applyMyzelStep: (_plan) =>'));
requireCheck('runners still own concrete step action bodies', drumRunner.includes('runAppStableRhythmLaneDrumStepProbe') && bassRunner.includes('runAppStableRhythmLaneBassStepProbe') && myzelRunner.includes('runAppStableRhythmLaneMyzelStepProbe'));
requireCheck('frame remains pure frame builder', frame.includes('buildAppStableRhythmLaneStepExecutionFrameProbe') && !frame.includes('executeStableRhythmLaneStepPlan('));
requireCheck('App keeps stable rhythm effect gate and delegates loop body explicitly', (app.includes('const schedule = () => {') && app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;') && app.includes('timerID = window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs);')) || (app.includes('startAppStableRhythmLaneSchedulerLoopProbe({') && app.includes('reactLifecycleStillAppEffectOwned: true') && app.includes('schedulerLoopExtractedFromAppTsx: true')) || (app.includes('useAppStableRhythmLaneSchedulerEffectProbe({') && app.includes('stableRhythmLaneSchedulerEffectExtractedFromAppTsx: true') && app.includes('reactLifecycleNowHookOwned: true')));
requireCheck('boundary stays compact after execution runner', boundaryLines >= 50 && boundaryLines <= 180, `boundary lines ${boundaryLines}`);
requireCheck('monolith map updated', (map.includes("status: 'stable-rhythm-lane-step-execution-runner-probed'") || map.includes("status: 'stable-rhythm-lane-step-execution-frame-builder-probed'") || map.includes("status: 'stable-rhythm-lane-runner-call-plan-contract-registry-probed'") || map.includes("status: 'stable-rhythm-lane-boundary-ports-contract-probed'") || map.includes("status: 'stable-rhythm-lane-scheduler-loop-probed'")) && map.includes('executeAppStableRhythmLaneStepExecutionFrameProbe') && map.includes('Frame') && map.includes('ausführen') && (map.includes('Transport-Verantwortung bleibt App-owned') || map.includes('nextAbsoluteStep-Zeitwahrheit')));
requireCheck('suite includes guard', suite.includes(`script: '${scriptName}'`) && suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane step execution runner probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app stable rhythm lane step execution runner probe OK');
console.log(JSON.stringify({ boundaryLines }, null, 2));
