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
const drumRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneDrumStepRunnerProbe.ts';
const bassRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneBassStepRunnerProbe.ts';
const myzelRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneMyzelStepRunnerProbe.ts';
const executionRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneStepExecutionRunnerProbe.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-step-execution-frame-probe';

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const frame = exists(framePath) ? read(framePath) : '';
const frameBuilder = exists(frameBuilderPath) ? read(frameBuilderPath) : '';
const drumRunner = exists(drumRunnerPath) ? read(drumRunnerPath) : '';
const bassRunner = exists(bassRunnerPath) ? read(bassRunnerPath) : '';
const myzelRunner = exists(myzelRunnerPath) ? read(myzelRunnerPath) : '';
const executionRunner = exists(executionRunnerPath) ? read(executionRunnerPath) : '';
const map = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const forbiddenFrameNeedles = [
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
  'executeStableRhythmLaneStepPlan(',
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
];

requireCheck('expected files exist', [appPath, boundaryPath, framePath, frameBuilderPath, drumRunnerPath, bassRunnerPath, myzelRunnerPath, executionRunnerPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-step-execution-frame-probe.mjs');
requireCheck('frame builder exists', frame.includes('buildAppStableRhythmLaneStepExecutionFrameProbe') && frame.includes("probeKind: 'app-stable-rhythm-lane-step-execution-frame-probe'"));
requireCheck('frame carries the shared step body', ['plan', 'params', 'cacheRefs', 'readPorts', 'actionPorts', 'stepLocals', 'drumStepVoiceValues', 'bassStepVoiceValues'].every((needle) => frame.includes(`readonly ${needle}:`)));
requireCheck('frame states scheduling but not runtime responsibility', frame.includes('schedulingStillBoundaryOwned: true') && frame.includes('runtimeOwned: false') && frame.includes('transportStillAppOwned: true') && frame.includes('nextAbsoluteStepStillAppOwned: true'));
requireCheck('frame stays out of runtime/audio construction', forbiddenFrameNeedles.every((needle) => !frame.includes(needle)), forbiddenFrameNeedles.filter((needle) => frame.includes(needle)).join(', '));
requireCheck('boundary or frame builder builds one execution frame', (boundary.includes("import { buildAppStableRhythmLaneStepExecutionFrameProbe }") && boundary.includes('const stableRhythmLaneStepExecutionFrame = buildAppStableRhythmLaneStepExecutionFrameProbe({')) || (boundary.includes('buildAppStableRhythmLaneStepExecutionFrameFromBoundaryProbe({') && frameBuilder.includes('buildAppStableRhythmLaneStepExecutionFrameProbe({')));
requireCheck('boundary or execution runner passes frame to all step runners', (boundary.includes('frame: stableRhythmLaneStepExecutionFrame') && (boundary.match(/frame: stableRhythmLaneStepExecutionFrame/g) || []).length >= 3) || (boundary.includes('executeAppStableRhythmLaneStepExecutionFrameProbe({') && executionRunner.includes('runAppStableRhythmLaneDrumStepProbe({') && executionRunner.includes('runAppStableRhythmLaneBassStepProbe({ frame })') && executionRunner.includes('runAppStableRhythmLaneMyzelStepProbe({ frame })')));
requireCheck('runners read from frame', drumRunner.includes('const frame = args.frame;') && bassRunner.includes('const frame = args.frame;') && myzelRunner.includes('args.frame.actionPorts.applyMyzelLayerStep'));
requireCheck('runner calls no longer pass separate value bundles', !boundary.includes('drumStepVoiceValues: stableRhythmLaneSchedulerDrumStepVoiceValues,\n        schedulingStillBoundaryOwned') && !boundary.includes('bassStepVoiceValues: stableRhythmLaneSchedulerBassStepVoiceValues,\n        schedulingStillBoundaryOwned') && !boundary.includes('stepLocals: stableRhythmLaneSchedulerStepLocals.locals,\n        drumStepVoiceValues'));
requireCheck('App still owns outer schedule only', app.includes('const schedule = () => {') && app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;') && app.includes('timerID = window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs);'));
requireCheck('monolith map updated', (map.includes("status: 'stable-rhythm-lane-step-execution-frame-probed'") || map.includes("status: 'stable-rhythm-lane-step-execution-runner-probed'") || map.includes("status: 'stable-rhythm-lane-step-execution-frame-builder-probed'")) && map.includes('buildAppStableRhythmLaneStepExecutionFrameProbe') && map.includes('Transport-Verantwortung bleibt App-owned'));
requireCheck('suite includes guard', suite.includes(`script: '${scriptName}'`) && suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane step execution frame probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app stable rhythm lane step execution frame probe OK');
