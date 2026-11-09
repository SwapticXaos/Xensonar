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
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-action-ports-callsite-grouping';

const appIndex = (needle) => app.indexOf(needle);
const boundaryIndex = (needle) => boundary.indexOf(needle);
const actionPortsTypeIndex = boundaryIndex('export type AppStableRhythmLaneSchedulerActionPorts = {');
const boundaryArgsIndex = boundaryIndex('export type AppStableRhythmLaneSchedulerStepActionBoundaryArgs = {');
const actionPortsLocalIndex = boundaryIndex('const actionPorts = args.actionPorts;');
const actionPortBuilderIndex = boundaryIndex('const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({');
const readPortsGroupIndex = Math.max(appIndex('const stableRhythmLaneSchedulerReadPorts: AppStableRhythmLaneSchedulerReadPorts = {'), appIndex('const stableRhythmLaneSchedulerBoundaryPorts = buildAppStableRhythmLaneSchedulerBoundaryPortsProbe({'));
const actionPortsGroupIndex = Math.max(appIndex('const stableRhythmLaneSchedulerActionPorts: AppStableRhythmLaneSchedulerActionPorts = {'), appIndex('const stableRhythmLaneSchedulerBoundaryPorts = buildAppStableRhythmLaneSchedulerBoundaryPortsProbe({'));
const scheduleIndex = appIndex('const schedule = () => {');
const boundaryCallIndex = appIndex('executeAppStableRhythmLaneSchedulerStepActionBoundary({');
const actionPortsPassIndex = Math.max(appIndex('actionPorts: stableRhythmLaneSchedulerActionPorts,'), appIndex('actionPorts: stableRhythmLaneSchedulerBoundaryPorts.actionPorts,'));
const nextStepWriteIndex = appIndex('nexusRefs.current.nextAbsoluteStep = nextStep;');
const timeoutIndex = appIndex('timerID = window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs);');

const actionPortsGroupEndIndex = app.indexOf('};', actionPortsGroupIndex);
const actionPortsGroupBody = actionPortsGroupIndex >= 0 && actionPortsGroupEndIndex > actionPortsGroupIndex ? app.slice(actionPortsGroupIndex, actionPortsGroupEndIndex) : '';
const boundaryCallEndIndex = app.indexOf('});', boundaryCallIndex);
const boundaryCallBody = boundaryCallIndex >= 0 && boundaryCallEndIndex > boundaryCallIndex ? app.slice(boundaryCallIndex, boundaryCallEndIndex) : '';

const expectedActionPorts = [
  'scheduleStableRhythmMetronomePulse',
  'playBassNote',
  'applyMyzelLayerStep',
];

const forbiddenBoundaryNeedles = [
  'window.setTimeout(',
  'window.clearTimeout(',
  'resolveStableRhythmLaneTimeWindow(',
  'buildStableRhythmLaneStepPlan(',
  'recordAudioPressureAdaptiveAction(',
  'nexusRefs.current.nextAbsoluteStep',
  'requestAnimationFrame(',
  'cancelAnimationFrame(',
  'useEffect(',
  'useMemo(',
  'useCallback(',
  'useState(',
  'useRef(',
  'ensureAudioReady(',
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
];

requireCheck('expected files exist', [appPath, boundaryPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package version updated', /^3\.2\.91\.6\.9\.(194|19[5-9]|[2-9][0-9]{2,})$/.test(pkg.version), pkg.version);
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-action-ports-callsite-grouping.mjs');
requireCheck('boundary exports action ports type', actionPortsTypeIndex >= 0 && expectedActionPorts.every((name) => boundary.includes(`readonly ${name}`)) && boundary.includes("StableRhythmMetronomePulseState['scheduleStableRhythmMetronomePulse']"));
requireCheck('boundary args uses action ports group', boundaryArgsIndex > actionPortsTypeIndex && boundary.includes('readonly actionPorts: AppStableRhythmLaneSchedulerActionPorts;'));
requireCheck('boundary localizes action ports before action-port builder', actionPortsLocalIndex > boundaryArgsIndex && actionPortBuilderIndex > actionPortsLocalIndex);
requireCheck('boundary uses action ports at actual action sites', [
  'actionPorts.scheduleStableRhythmMetronomePulse(plan, readPorts.readMetronomeAudioNowSec())',
  'playBassNote: actionPorts.playBassNote',
  'actionPorts.applyMyzelLayerStep(plan.timeSec, plan.step16)',
].every((needle) => boundary.includes(needle)));
requireCheck('App imports action ports type or boundary ports builder', app.includes('type AppStableRhythmLaneSchedulerActionPorts') || app.includes('buildAppStableRhythmLaneSchedulerBoundaryPortsProbe'));
requireCheck('App creates action ports once before scheduler loop', actionPortsGroupIndex >= 0 && actionPortsGroupIndex >= readPortsGroupIndex && actionPortsGroupIndex < scheduleIndex && expectedActionPorts.every((name) => (actionPortsGroupBody || app.slice(actionPortsGroupIndex, scheduleIndex)).includes(name)));
requireCheck('App passes named action ports into boundary', boundaryCallIndex > scheduleIndex && actionPortsPassIndex > boundaryCallIndex && actionPortsPassIndex < boundaryCallEndIndex);
requireCheck('boundary call no longer passes action functions one-by-one', !boundaryCallBody.includes('scheduleStableRhythmMetronomePulse,') && !boundaryCallBody.includes('playBassNote,') && !boundaryCallBody.includes('applyMyzelLayerStep,'));
requireCheck('App still owns outer transport order', scheduleIndex >= 0 && boundaryCallIndex > scheduleIndex && nextStepWriteIndex > boundaryCallIndex && timeoutIndex > nextStepWriteIndex);
requireCheck('boundary still excludes outer runtime/audio construction', forbiddenBoundaryNeedles.every((needle) => !boundary.includes(needle)), forbiddenBoundaryNeedles.filter((needle) => boundary.includes(needle)).join(', '));
requireCheck('drum/bass/psybass scheduling remains separated', [
  'scheduleRhythmForgeDrumStep({',
  'scheduleRhythmForgeBassStep({',
  'schedulePsyBassStep({',
  'scheduleClassicBassPatternStep({',
].every((needle) => boundary.includes(needle)));
requireCheck('monolith map updated', monolithMap.includes("| 'stable-rhythm-lane-action-ports-callsite-grouped'") && (monolithMap.includes("status: 'stable-rhythm-lane-action-ports-callsite-grouped'") || monolithMap.includes("status: 'stable-rhythm-lane-read-action-ports-grouped'") || monolithMap.includes("status: 'stable-rhythm-lane-boundary-ports-builder-probed'")) && monolithMap.includes('AppStableRhythmLaneSchedulerActionPorts') && (monolithMap.includes('stableRhythmLaneSchedulerActionPorts') || monolithMap.includes('stableRhythmLaneSchedulerBoundaryPorts')));
requireCheck('sanity suite includes guard', suite.includes(`script: '${scriptName}'`) && suite.includes('Stable rhythm lane action ports callsite grouping'));
requireCheck('sanity contract includes guard', suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('Stable rhythm lane action ports callsite grouping check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('Stable rhythm lane action ports callsite grouping OK');
console.log(JSON.stringify({ version: pkg.version, actionPortsGroupedBeforeSchedule: true, transportMoved: false, runtimeMoved: false }, null, 2));
