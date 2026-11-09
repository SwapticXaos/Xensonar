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
const builderPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerBoundaryPortsBuilderProbe.ts';
const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-boundary-ports-builder-probe';

const app = exists(appPath) ? read(appPath) : '';
const builder = exists(builderPath) ? read(builderPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const forbiddenBuilderNeedles = [
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
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'executeStableRhythmLaneStepPlan(',
  'executeAppStableRhythmLaneSchedulerStepActionBoundary(',
  'scheduleExportedDrumConfigStep(',
  'scheduleRhythmForgeDrumStep(',
  'scheduleRhythmForgeBassStep(',
  'schedulePsyBassStep(',
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'playBassNote(',
  '.current =',
  'nexusRefs.current.nextAbsoluteStep',
  'resolveStableRhythmLaneTimeWindow(',
  'buildStableRhythmLaneStepPlan(',
];

const builderCallIndex = app.indexOf('const stableRhythmLaneSchedulerBoundaryPorts = buildAppStableRhythmLaneSchedulerBoundaryPortsProbe({');
const scheduleIndex = app.indexOf('const schedule = () => {');
const executeIndex = Math.max(app.indexOf('executeAppStableRhythmLaneSchedulerStepActionBoundary({'), app.indexOf('executeAppStableRhythmLaneSchedulerStepActionBoundary(stableRhythmLaneStepActionBoundaryArgs.args);'));

requireCheck('expected files exist', [appPath, builderPath, boundaryPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package version updated', /^3\.2\.91\.6\.9\.(20[1-9]|21[0-9]|[3-9][0-9]{2,})$/.test(pkg.version));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-boundary-ports-builder-probe.mjs');
requireCheck('builder exports ports contract', builder.includes('AppStableRhythmLaneSchedulerBoundaryPortsBuilderProbeArgs') && builder.includes('AppStableRhythmLaneSchedulerBoundaryPortsBuilderProbeResult') && builder.includes('buildAppStableRhythmLaneSchedulerBoundaryPortsProbe'));
requireCheck('builder imports boundary port types only', builder.includes('AppStableRhythmLaneSchedulerCacheRefs') && builder.includes('AppStableRhythmLaneSchedulerReadPorts') && builder.includes('AppStableRhythmLaneSchedulerActionPorts') && builder.includes("from './appStableRhythmLaneSchedulerBoundaryPortsContractProbe';"));
requireCheck('builder returns grouped cacheRefs/readPorts/actionPorts', builder.includes('cacheRefs: {') && builder.includes('readPorts: {') && builder.includes('actionPorts: {'));
requireCheck('builder includes app-owned flags', builder.includes('boundaryPortsOnly: true') && builder.includes('transportStillAppOwned: true') && builder.includes('schedulerLoopStillAppOwned: true') && builder.includes('stepPlanningStillAppOwned: true'));
requireCheck('builder preserves boundary ownership flags', builder.includes('cacheWritesStillBoundaryOwned: true') && builder.includes('schedulingStillBoundaryOwned: true') && builder.includes('runtimeOwned: false'));
requireCheck('builder stays pure/static enough', forbiddenBuilderNeedles.every((needle) => !builder.includes(needle)), forbiddenBuilderNeedles.filter((needle) => builder.includes(needle)).join(', '));
requireCheck('App imports boundary ports builder', app.includes('buildAppStableRhythmLaneSchedulerBoundaryPortsProbe'));
requireCheck('App builds ports before schedule closure', builderCallIndex >= 0 && scheduleIndex > builderCallIndex);
requireCheck('App passes grouped ports into step action boundary or args builder', executeIndex > scheduleIndex && ((app.includes('readPorts: stableRhythmLaneSchedulerBoundaryPorts.readPorts,') && app.includes('actionPorts: stableRhythmLaneSchedulerBoundaryPorts.actionPorts,') && app.includes('cacheRefs: stableRhythmLaneSchedulerBoundaryPorts.cacheRefs,')) || (app.includes('boundaryPorts: stableRhythmLaneSchedulerBoundaryPorts,') && app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary(stableRhythmLaneStepActionBoundaryArgs.args);'))));
requireCheck('App no longer imports direct boundary port types', !app.includes('type AppStableRhythmLaneSchedulerCacheRefs') && !app.includes('type AppStableRhythmLaneSchedulerReadPorts') && !app.includes('type AppStableRhythmLaneSchedulerActionPorts'));
requireCheck('App no longer declares the three separate port groups', !app.includes('const stableRhythmLaneSchedulerCacheRefs') && !app.includes('const stableRhythmLaneSchedulerReadPorts') && !app.includes('const stableRhythmLaneSchedulerActionPorts'));
requireCheck('transport and scheduler remain App-owned', app.includes('const schedule = () => {') && app.includes('window.setTimeout(schedule') && app.includes('window.clearTimeout(timerID)') && app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;'));
requireCheck('time-window and step-plan remain App-owned', app.includes('resolveStableRhythmLaneTimeWindow(stableRhythmLaneSchedulerSource.timeWindowArgs)') && app.includes('buildStableRhythmLaneStepPlan(buildAppStableRhythmLaneSchedulerStepPlanArgs({'));
requireCheck('boundary remains consumer of split ports', boundary.includes('readonly readPorts: AppStableRhythmLaneSchedulerReadPorts;') && boundary.includes('readonly actionPorts: AppStableRhythmLaneSchedulerActionPorts;') && boundary.includes('readonly cacheRefs: AppStableRhythmLaneSchedulerCacheRefs;'));
requireCheck('monolith map updated', monolithMap.includes("| 'stable-rhythm-lane-boundary-ports-builder-probed'") && (monolithMap.includes("status: 'stable-rhythm-lane-boundary-ports-builder-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-boundary-ports-contract-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-runner-call-plan-contract-registry-probed'")) && monolithMap.includes('buildAppStableRhythmLaneSchedulerBoundaryPortsProbe'));
requireCheck('sanity suite includes guard', suite.includes(`script: '${scriptName}'`) && suite.includes('Stable rhythm lane boundary ports builder probe'));
requireCheck('sanity contract includes guard', suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane boundary ports builder probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app stable rhythm lane boundary ports builder probe OK');
console.log(' - cacheRefs/readPorts/actionPorts assembled through one App-owned builder');
console.log(' - transport, timer loop, and step planning remain App-owned');
