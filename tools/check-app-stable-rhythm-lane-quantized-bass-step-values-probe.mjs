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
const runnerPath = 'src/features/xensonar/input/appStableRhythmLaneBassStepRunnerProbe.ts';
const valuesPath = 'src/features/xensonar/input/appStableRhythmLaneQuantizedBassStepValuesProbe.ts';
const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-quantized-bass-step-values-probe';

const app = exists(appPath) ? read(appPath) : '';
const runner = exists(runnerPath) ? read(runnerPath) : '';
const values = exists(valuesPath) ? read(valuesPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const map = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const forbiddenValuesNeedles = [
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
  'playBassNote(',
];

requireCheck('expected files exist', [appPath, runnerPath, valuesPath, boundaryPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-quantized-bass-step-values-probe.mjs');
requireCheck('values builder exists and reads quantize locally', values.includes('buildAppStableRhythmLaneQuantizedBassStepValuesProbe') && values.includes('quantizeBpm: args.readQuantizeBpm()') && values.includes('playBassNoteStillActionPortOwned: true'));
requireCheck('values builder stays out of runtime/audio construction', forbiddenValuesNeedles.every((needle) => !values.includes(needle)), forbiddenValuesNeedles.filter((needle) => values.includes(needle)).join(', '));
requireCheck('bass runner uses builder in three quantized branches', (runner.match(/buildAppStableRhythmLaneQuantizedBassStepValuesProbe\(/g) || []).length === 3);
requireCheck('bass runner no longer invokes readQuantizeBpm directly in schedule calls', !runner.includes('quantizeBpm: args.readPorts.readQuantizeBpm()'));
requireCheck('classic bass branch remains unquantized-read', runner.includes('scheduleClassicBassPatternStep({') && !runner.slice(runner.indexOf("case 'classic'"), runner.indexOf('default:', runner.indexOf("case 'classic'"))).includes('buildAppStableRhythmLaneQuantizedBassStepValuesProbe('));
requireCheck('playBassNote stays as action port', (runner.includes('playBassNote: args.actionPorts.playBassNote') || runner.includes('playBassNote: frame.actionPorts.playBassNote')) && values.includes('playBassNoteStillActionPortOwned: true') && !values.includes('playBassNote('));
requireCheck('boundary remains runner-level orchestrator', boundary.includes('runAppStableRhythmLaneBassStepProbe({') && !boundary.includes('buildAppStableRhythmLaneQuantizedBassStepValuesProbe('));
requireCheck('App still owns outer schedule only', app.includes('const schedule = () => {') && app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;') && app.includes('timerID = window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs);'));
requireCheck('monolith map updated', (map.includes("status: 'stable-rhythm-lane-quantized-bass-step-values-probed'") || map.includes("status: 'stable-rhythm-lane-step-execution-frame-probed'")) && map.includes('buildAppStableRhythmLaneQuantizedBassStepValuesProbe') && (map.includes('outer scheduler transport remains App-owned') || map.includes('Transport-Verantwortung bleibt App-owned')));
requireCheck('suite includes guard', suite.includes(`script: '${scriptName}'`) && suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane quantized bass step values probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app stable rhythm lane quantized bass step values probe OK');
