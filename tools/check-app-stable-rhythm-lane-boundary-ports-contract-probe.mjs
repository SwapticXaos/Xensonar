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

const contractPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerBoundaryPortsContractProbe.ts';
const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const portsBuilderPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerBoundaryPortsBuilderProbe.ts';
const argsBuilderPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundaryArgsBuilderProbe.ts';
const framePath = 'src/features/xensonar/input/appStableRhythmLaneStepExecutionFrameProbe.ts';
const frameBuilderPath = 'src/features/xensonar/input/appStableRhythmLaneStepExecutionFrameBuilderProbe.ts';
const appPath = 'src/App.tsx';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-boundary-ports-contract-probe';

const contract = exists(contractPath) ? read(contractPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const portsBuilder = exists(portsBuilderPath) ? read(portsBuilderPath) : '';
const argsBuilder = exists(argsBuilderPath) ? read(argsBuilderPath) : '';
const frame = exists(framePath) ? read(framePath) : '';
const frameBuilder = exists(frameBuilderPath) ? read(frameBuilderPath) : '';
const app = exists(appPath) ? read(appPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const forbiddenContractNeedles = [
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
  'buildAppStableRhythmLaneStepExecutionFrameFromBoundaryProbe(',
  'executeAppStableRhythmLaneStepExecutionFrameProbe(',
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

const requiredContractExports = [
  'export type AppStableRhythmLanePlayBassNote',
  'export type AppStableRhythmLaneSchedulerCacheRefs',
  'export type AppStableRhythmLaneSchedulerReadPorts',
  'export type AppStableRhythmLaneSchedulerActionPorts',
  'export type AppStableRhythmLaneSchedulerBoundaryPorts',
];

const consumers = [portsBuilder, argsBuilder, frame, frameBuilder, boundary];

requireCheck('expected files exist', [contractPath, boundaryPath, portsBuilderPath, argsBuilderPath, framePath, frameBuilderPath, appPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package version updated', /^3\.2\.91\.6\.9\.(214|21[5-9]|2[2-9][0-9]|[3-9][0-9]{2,})$/.test(pkg.version), pkg.version);
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-boundary-ports-contract-probe.mjs');
requireCheck('contract exports all port types', requiredContractExports.every((needle) => contract.includes(needle)), requiredContractExports.filter((needle) => !contract.includes(needle)).join(', '));
requireCheck('contract imports source domain types only', contract.includes("import type { DrumStyle }") && contract.includes("import type { GrooveState }") && contract.includes("import type { BassClip }") && contract.includes("import type { GroovePlaybackRuntimeRefs }") && contract.includes("import type { StableRhythmMetronomePulseState }"));
requireCheck('contract stays type-only and non-runtime', forbiddenContractNeedles.every((needle) => !contract.includes(needle)), forbiddenContractNeedles.filter((needle) => contract.includes(needle)).join(', '));
requireCheck('boundary imports port contract', boundary.includes("from './appStableRhythmLaneSchedulerBoundaryPortsContractProbe';"));
requireCheck('boundary no longer defines port types', !boundary.includes('export type AppStableRhythmLaneSchedulerCacheRefs =') && !boundary.includes('export type AppStableRhythmLaneSchedulerReadPorts =') && !boundary.includes('export type AppStableRhythmLaneSchedulerActionPorts =') && !boundary.includes('type PlayBassNote ='));
requireCheck('ports builder imports contract, not boundary', portsBuilder.includes("from './appStableRhythmLaneSchedulerBoundaryPortsContractProbe';") && !portsBuilder.includes("from './appStableRhythmLaneSchedulerStepActionBoundary';"));
requireCheck('frame imports contract, not boundary', frame.includes("from './appStableRhythmLaneSchedulerBoundaryPortsContractProbe';") && !frame.includes("from './appStableRhythmLaneSchedulerStepActionBoundary';"));
requireCheck('frame builder imports contract, not boundary', frameBuilder.includes("from './appStableRhythmLaneSchedulerBoundaryPortsContractProbe';") && !frameBuilder.includes("from './appStableRhythmLaneSchedulerStepActionBoundary';"));
requireCheck('args builder uses boundary ports contract', argsBuilder.includes('AppStableRhythmLaneSchedulerBoundaryPorts') && argsBuilder.includes("from './appStableRhythmLaneSchedulerBoundaryPortsContractProbe';"));
requireCheck('only args builder imports boundary args type from boundary', consumers.filter((content) => content.includes("from './appStableRhythmLaneSchedulerStepActionBoundary';")).length === 1 && argsBuilder.includes("from './appStableRhythmLaneSchedulerStepActionBoundary';"));
const effectArgsContract = exists('src/features/xensonar/input/appStableRhythmLaneEffectArgsContractProbe.ts') ? read('src/features/xensonar/input/appStableRhythmLaneEffectArgsContractProbe.ts') : '';
requireCheck('App still builds boundary ports without importing contract directly', (app.includes('buildAppStableRhythmLaneSchedulerBoundaryPortsProbe') || (app.includes('buildAppStableRhythmLaneEffectArgsContractProbe({') && effectArgsContract.includes('buildAppStableRhythmLaneSchedulerBoundaryPortsProbe({'))) && !app.includes('AppStableRhythmLaneSchedulerCacheRefs'));
requireCheck('transport lineage remains explicit', (app.includes('const schedule = () => {') && app.includes('window.setTimeout(schedule') && app.includes('window.clearTimeout(timerID)') && app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;')) || ((app.includes('startAppStableRhythmLaneSchedulerLoopProbe({') && app.includes('reactLifecycleStillAppEffectOwned: true') && app.includes('nextAbsoluteStepTimeTruthStillAppNexusRef: true')) || (app.includes('buildAppStableRhythmLaneEffectArgsContractProbe({') && effectArgsContract.includes('nextAbsoluteStepTimeTruthStillAppNexusRef: true'))));
requireCheck('monolith map updated', monolithMap.includes("| 'stable-rhythm-lane-boundary-ports-contract-probed'") && (monolithMap.includes("status: 'stable-rhythm-lane-boundary-ports-contract-probed'") || monolithMap.includes("successor lineage marker for older guards: status: 'stable-rhythm-lane-boundary-ports-contract-probed'")) && monolithMap.includes('appStableRhythmLaneSchedulerBoundaryPortsContractProbe')); 
requireCheck('sanity suite includes guard', suite.includes(`script: '${scriptName}'`) && suite.includes('Stable rhythm lane boundary ports contract probe'));
requireCheck('sanity contract includes guard', suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane boundary ports contract probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app stable rhythm lane boundary ports contract probe OK');
console.log(' - cache/read/action port contracts no longer live in the StepActionBoundary executor');
console.log(' - boundary remains executor; transport, timer, and step planning remain App-owned');
