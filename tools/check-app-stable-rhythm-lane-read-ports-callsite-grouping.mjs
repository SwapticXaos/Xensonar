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
const scriptName = 'xensonar:check-app-stable-rhythm-lane-read-ports-callsite-grouping';

const appIndex = (needle) => app.indexOf(needle);
const boundaryIndex = (needle) => boundary.indexOf(needle);
const readPortsTypeIndex = boundaryIndex('export type AppStableRhythmLaneSchedulerReadPorts = {');
const boundaryArgsIndex = boundaryIndex('export type AppStableRhythmLaneSchedulerStepActionBoundaryArgs = {');
const readPortsLocalIndex = boundaryIndex('const readPorts = args.readPorts;');
const cacheRefsLocalIndex = boundaryIndex('const cacheRefs = args.cacheRefs;');
const readPortsGroupIndex = Math.max(appIndex('const stableRhythmLaneSchedulerReadPorts: AppStableRhythmLaneSchedulerReadPorts = {'), appIndex('const stableRhythmLaneSchedulerBoundaryPorts = buildAppStableRhythmLaneSchedulerBoundaryPortsProbe({'));
const actionPortsGroupIndex = Math.max(appIndex('const stableRhythmLaneSchedulerActionPorts: AppStableRhythmLaneSchedulerActionPorts = {'), appIndex('const stableRhythmLaneSchedulerBoundaryPorts = buildAppStableRhythmLaneSchedulerBoundaryPortsProbe({'));
const scheduleIndex = appIndex('const schedule = () => {');
const boundaryCallIndex = appIndex('executeAppStableRhythmLaneSchedulerStepActionBoundary({');
const readPortsPassIndex = Math.max(appIndex('readPorts: stableRhythmLaneSchedulerReadPorts,'), appIndex('readPorts: stableRhythmLaneSchedulerBoundaryPorts.readPorts,'));
const nextStepWriteIndex = appIndex('nexusRefs.current.nextAbsoluteStep = nextStep;');
const timeoutIndex = appIndex('timerID = window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs);');

const readPortsGroupEndIndex = app.indexOf('};', readPortsGroupIndex);
const readPortsGroupBody = readPortsGroupIndex >= 0 && readPortsGroupEndIndex > readPortsGroupIndex ? app.slice(readPortsGroupIndex, readPortsGroupEndIndex) : '';
const boundaryCallEndIndex = app.indexOf('});', boundaryCallIndex);
const boundaryCallBody = boundaryCallIndex >= 0 && boundaryCallEndIndex > boundaryCallIndex ? app.slice(boundaryCallIndex, boundaryCallEndIndex) : '';

const expectedReadPorts = [
  'readDrumStyle',
  'resolveCurrentBassRootHz',
  'resolveGrooveState',
  'readQuantizeBpm',
  'readMetronomeAudioNowSec',
  'readBassClipById',
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
];

requireCheck('expected files exist', [appPath, boundaryPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package version updated', /^3\.2\.91\.6\.9\.(193|194|19[5-9]|[2-9][0-9]{2,})$/.test(pkg.version), pkg.version);
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-read-ports-callsite-grouping.mjs');
requireCheck('boundary exports read ports type', readPortsTypeIndex >= 0 && expectedReadPorts.every((name) => boundary.includes(`readonly ${name}`)));
requireCheck('boundary args uses read ports group', boundaryArgsIndex > readPortsTypeIndex && boundary.includes('readonly readPorts: AppStableRhythmLaneSchedulerReadPorts;'));
requireCheck('boundary localizes read ports before prestep/cache use', readPortsLocalIndex > boundaryArgsIndex && cacheRefsLocalIndex > readPortsLocalIndex);
requireCheck('boundary uses read ports at actual read sites', [
  'readPorts.readDrumStyle()',
  'readPorts.resolveCurrentBassRootHz()',
  'readPorts.resolveGrooveState(args.stationaryPlan.timeSec)',
  'readPorts.readMetronomeAudioNowSec()',
  'readPorts.readBassClipById',
  'readPorts.readQuantizeBpm()',
].every((needle) => boundary.includes(needle)));
requireCheck('App imports read ports type or boundary ports builder', app.includes('type AppStableRhythmLaneSchedulerReadPorts') || app.includes('buildAppStableRhythmLaneSchedulerBoundaryPortsProbe'));
requireCheck('App creates read ports once before scheduler loop', readPortsGroupIndex >= 0 && readPortsGroupIndex < scheduleIndex && expectedReadPorts.every((name) => (readPortsGroupBody || app.slice(readPortsGroupIndex, scheduleIndex)).includes(name)));
requireCheck('App passes named read ports into boundary', boundaryCallIndex > scheduleIndex && readPortsPassIndex > boundaryCallIndex && readPortsPassIndex < boundaryCallEndIndex);
requireCheck('boundary call no longer allocates read closures per step', !boundaryCallBody.includes('resolveGrooveState: (timeSec) =>') && !boundaryCallBody.includes('readMetronomeAudioNowSec: () =>') && !boundaryCallBody.includes('readQuantizeBpm: () =>'));
requireCheck('action ports can be grouped separately or via boundary ports builder', actionPortsGroupIndex >= readPortsGroupIndex && actionPortsGroupIndex < scheduleIndex);
requireCheck('App still owns outer transport order', scheduleIndex >= 0 && boundaryCallIndex > scheduleIndex && nextStepWriteIndex > boundaryCallIndex && timeoutIndex > nextStepWriteIndex);
requireCheck('boundary still excludes outer runtime ownership', forbiddenBoundaryNeedles.every((needle) => !boundary.includes(needle)), forbiddenBoundaryNeedles.filter((needle) => boundary.includes(needle)).join(', '));
requireCheck('monolith map updated', monolithMap.includes("| 'stable-rhythm-lane-read-ports-callsite-grouped'") && (monolithMap.includes("status: 'stable-rhythm-lane-read-ports-callsite-grouped'") || monolithMap.includes("status: 'stable-rhythm-lane-read-action-ports-grouped'") || monolithMap.includes("status: 'stable-rhythm-lane-boundary-ports-builder-probed'")) && monolithMap.includes('AppStableRhythmLaneSchedulerReadPorts') && (monolithMap.includes('stableRhythmLaneSchedulerReadPorts') || monolithMap.includes('stableRhythmLaneSchedulerBoundaryPorts')));
requireCheck('sanity suite includes guard', suite.includes(`script: '${scriptName}'`) && suite.includes('Stable rhythm lane read ports callsite grouping'));
requireCheck('sanity contract includes guard', suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('Stable rhythm lane read ports callsite grouping check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('Stable rhythm lane read ports callsite grouping OK');
console.log(JSON.stringify({ version: pkg.version, readPortsGroupedBeforeSchedule: true, transportMoved: false, runtimeMoved: false }, null, 2));
