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
const executionRunnerPath = 'src/features/xensonar/input/appStableRhythmLaneStepExecutionRunnerProbe.ts';
const runnerPath = 'src/features/xensonar/input/appStableRhythmLaneBassStepRunnerProbe.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-bass-step-runner-probe';

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const executionRunner = exists(executionRunnerPath) ? read(executionRunnerPath) : '';
const runner = exists(runnerPath) ? read(runnerPath) : '';
const map = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const forbiddenRunnerNeedles = [
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
];

requireCheck('expected files exist', [appPath, boundaryPath, executionRunnerPath, runnerPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-bass-step-runner-probe.mjs');
requireCheck('runner owns bass branch body only', runner.includes('runAppStableRhythmLaneBassStepProbe') && runner.includes('resolveAppStableRhythmLaneSchedulerBassStepBranchProbe') && runner.includes('scheduleBassClipStep({') && runner.includes('scheduleRhythmForgeBassStep({') && runner.includes('schedulePsyBassStep({') && runner.includes('scheduleClassicBassPatternStep({'));
requireCheck('runner keeps clip and pattern commit paths explicit', runner.includes('commitAppStableRhythmLaneBassClipRootBindingProbe({') && runner.includes('commitAppStableRhythmLanePatternCacheCandidateProbe({') && runner.includes("kind: 'rhythmforge-bass'") && runner.includes("kind: 'psybass'"));
requireCheck('runner has exhaustive branch check', runner.includes('const exhaustive: never = bassStepBranch;'));
requireCheck('runner keeps playBassNote as action port', (runner.includes('playBassNote: args.actionPorts.playBassNote') || runner.includes('playBassNote: frame.actionPorts.playBassNote')) && !runner.includes('function playBassNote') && !runner.includes('const playBassNote'));
requireCheck('runner trims hot path result metadata', runner.includes('): void =>') && !runner.includes("probeKind: 'app-stable-rhythm-lane-bass-step-runner-probe'") && !runner.includes('AppStableRhythmLaneBassStepRunnerProbeResult'));
requireCheck('runner stays out of runtime/audio construction', forbiddenRunnerNeedles.every((needle) => !runner.includes(needle)), forbiddenRunnerNeedles.filter((needle) => runner.includes(needle)).join(', '));
requireCheck('boundary or execution runner calls bass runner', (boundary.includes("import { runAppStableRhythmLaneBassStepProbe }") && boundary.includes('runAppStableRhythmLaneBassStepProbe({')) || (executionRunner.includes("import { runAppStableRhythmLaneBassStepProbe }") && executionRunner.includes('runAppStableRhythmLaneBassStepProbe({')));
requireCheck('boundary no longer owns bass branch body', !boundary.includes('scheduleBassClipStep({') && !boundary.includes('scheduleRhythmForgeBassStep({') && !boundary.includes('schedulePsyBassStep({') && !boundary.includes('scheduleClassicBassPatternStep({'));
requireCheck('App keeps stable rhythm effect gate or scheduler loop delegate', (app.includes('const schedule = () => {') && app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;') && app.includes('timerID = window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs);')) || (app.includes('startAppStableRhythmLaneSchedulerLoopProbe({') && app.includes('reactLifecycleStillAppEffectOwned: true') && app.includes('schedulerLoopExtractedFromAppTsx: true')));
requireCheck('monolith map updated', (map.includes("status: 'stable-rhythm-lane-step-runners-probed'") || (map.includes("status: 'stable-rhythm-lane-myzel-step-runner-probed'") || map.includes("status: 'stable-rhythm-lane-quantized-bass-step-values-probed'") || map.includes("status: 'stable-rhythm-lane-step-execution-frame-probed'") || map.includes("status: 'stable-rhythm-lane-step-execution-runner-probed'")) || map.includes("status: 'stable-rhythm-lane-quantized-bass-step-values-probed'") || map.includes("status: 'stable-rhythm-lane-step-execution-frame-probed'") || map.includes("status: 'stable-rhythm-lane-step-execution-runner-probed'")) && map.includes('runAppStableRhythmLaneBassStepProbe') && (map.includes('outer scheduler transport remains App-owned') || map.includes('Transport-Verantwortung bleibt App-owned')));
requireCheck('suite includes guard', suite.includes(`script: '${scriptName}'`) && suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane bass step runner probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app stable rhythm lane bass step runner probe OK');
