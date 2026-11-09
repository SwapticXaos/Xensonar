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
const frameBuilderPath = 'src/features/xensonar/input/appStableRhythmLaneStepExecutionFrameBuilderProbe.ts';
const framePath = 'src/features/xensonar/input/appStableRhythmLaneStepExecutionFrameProbe.ts';
const executionRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneStepExecutionRunnerProbe.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-step-execution-frame-builder-probe';

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const frameBuilder = exists(frameBuilderPath) ? read(frameBuilderPath) : '';
const frame = exists(framePath) ? read(framePath) : '';
const executionRunner = exists(executionRunnerPath) ? read(executionRunnerPath) : '';
const map = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const boundaryLines = boundary.split(/\r?\n/).length;

const forbiddenFrameBuilderNeedles = [
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
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
  'playBassNote(',
];

requireCheck('expected files exist', [appPath, boundaryPath, frameBuilderPath, framePath, executionRunnerPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-step-execution-frame-builder-probe.mjs');
requireCheck('frame builder exports boundary frame builder', frameBuilder.includes('buildAppStableRhythmLaneStepExecutionFrameFromBoundaryProbe') && frameBuilder.includes('AppStableRhythmLaneStepExecutionFrameBuilderProbeArgs'));
requireCheck('frame builder owns only frame preparation layers', frameBuilder.includes('buildAppStableRhythmLaneSchedulerPrestepContext({') && frameBuilder.includes('buildAppStableRhythmLaneSchedulerStepLocalsProbe(') && frameBuilder.includes('buildAppStableRhythmLaneSchedulerDrumStepVoiceValuesProbe({') && frameBuilder.includes('buildAppStableRhythmLaneSchedulerBassStepVoiceValuesProbe({') && frameBuilder.includes('buildAppStableRhythmLaneStepExecutionFrameProbe({'));
requireCheck('frame builder stays out of transport/audio/actions', forbiddenFrameBuilderNeedles.every((needle) => !frameBuilder.includes(needle)), forbiddenFrameBuilderNeedles.filter((needle) => frameBuilder.includes(needle)).join(', '));
requireCheck('boundary builds frame via frame builder then executes frame', boundary.includes('buildAppStableRhythmLaneStepExecutionFrameFromBoundaryProbe({') && boundary.includes('return executeAppStableRhythmLaneStepExecutionFrameProbe({') && boundary.includes('frame: stableRhythmLaneStepExecutionFrame'));
requireCheck('boundary no longer assembles prestep/locals/voice/frame inline', !boundary.includes('buildAppStableRhythmLaneSchedulerPrestepContext({') && !boundary.includes('buildAppStableRhythmLaneSchedulerStepLocalsProbe(') && !boundary.includes('buildAppStableRhythmLaneSchedulerDrumStepVoiceValuesProbe({') && !boundary.includes('buildAppStableRhythmLaneSchedulerBassStepVoiceValuesProbe({') && !boundary.includes('buildAppStableRhythmLaneStepExecutionFrameProbe({'));
requireCheck('frame and execution runner remain existing layer', frame.includes('buildAppStableRhythmLaneStepExecutionFrameProbe') && executionRunner.includes('executeAppStableRhythmLaneStepExecutionFrameProbe'));
requireCheck('App still owns outer schedule', app.includes('const schedule = () => {') && app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;') && app.includes('timerID = window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs);'));
requireCheck('boundary stays very compact after frame builder', boundaryLines >= 50 && boundaryLines <= 120, `boundary lines ${boundaryLines}`);
requireCheck('monolith map updated', map.includes("status: 'stable-rhythm-lane-step-execution-frame-builder-probed'") || map.includes("status: 'stable-rhythm-lane-runner-call-plan-contract-registry-probed'") && map.includes('buildAppStableRhythmLaneStepExecutionFrameFromBoundaryProbe') && map.includes('Frame vorbereiten') && map.includes('Frame ausführen') && map.includes('Transport-Verantwortung bleibt App-owned'));
requireCheck('suite includes guard', suite.includes(`script: '${scriptName}'`) && suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane step execution frame builder probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app stable rhythm lane step execution frame builder probe OK');
console.log(JSON.stringify({ boundaryLines }, null, 2));
