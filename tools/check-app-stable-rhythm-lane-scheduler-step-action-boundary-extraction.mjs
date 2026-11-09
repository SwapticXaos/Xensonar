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
const appLines = app.split(/\r?\n/).length;
const boundaryLines = boundary.split(/\r?\n/).length;

const scriptName = 'xensonar:check-app-stable-rhythm-lane-scheduler-step-action-boundary-extraction';
const appIndex = (needle) => app.indexOf(needle);
const boundaryIndex = (needle) => boundary.indexOf(needle);

const scheduleIndex = appIndex('const schedule = () => {');
const loopProbeIndex = appIndex('startAppStableRhythmLaneSchedulerLoopProbe({');
const timeWindowIndex = appIndex('const prefillWindow = resolveStableRhythmLaneTimeWindow(stableRhythmLaneSchedulerSource.timeWindowArgs);');
const staleIndex = appIndex('if (stationaryPlan.stale) {');
const boundaryCallIndex = Math.max(appIndex('executeAppStableRhythmLaneSchedulerStepActionBoundary({'), appIndex('executeAppStableRhythmLaneSchedulerStepActionBoundary(stableRhythmLaneStepActionBoundaryArgs.args);'));
const nextStepWriteIndex = appIndex('nexusRefs.current.nextAbsoluteStep = nextStep;');
const timeoutIndex = appIndex('timerID = window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs);');

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

const requiredBoundaryNeedles = [
  'export type AppStableRhythmLaneSchedulerStepActionBoundaryArgs',
  'export const executeAppStableRhythmLaneSchedulerStepActionBoundary',
  'transportStillAppOwned: true',
  'nextAbsoluteStepStillAppOwned: true',
  'staleGuardAlreadyPassed: true',
  'buildAppStableRhythmLaneStepExecutionFrameFromBoundaryProbe({',
  'executeAppStableRhythmLaneStepExecutionFrameProbe({',
  'frame: stableRhythmLaneStepExecutionFrame',
];

const forbiddenAppNeedles = [
  'const stableRhythmLaneSchedulerPrestepContext = buildAppStableRhythmLaneSchedulerPrestepContext({',
  'const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({',
  'const rhythmForgeDrumCacheCandidate = resolveAppRhythmForgeDrumCacheHelperProbe({',
  'const bassClipRootBindingCandidate = resolveAppBassClipRootBindingHelperProbe({',
  'const rhythmForgeBassCacheCandidate = resolveAppRhythmForgeBassCacheHelperProbe({',
  'const psyBassCacheCandidate = resolveAppPsyBassCacheHelperProbe({',
  'scheduleRhythmForgeDrumStep({ drumMachine, pattern: rhythmForgeDrumPattern',
  'scheduleBassClipStep({ clip, step: plan.absoluteStep',
  'scheduleClassicBassPatternStep({\n                  pattern: p.bassPattern,',
];

requireCheck('expected files exist', [appPath, boundaryPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package version updated', /^3\.2\.91\.6\.9\.(187|18[8-9]|19[0-9]|[2-9][0-9]{2,})$/.test(pkg.version));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-scheduler-step-action-boundary-extraction.mjs');
requireCheck('App imports boundary path directly or through loop probe', (app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary') && boundaryCallIndex > staleIndex) || app.includes('startAppStableRhythmLaneSchedulerLoopProbe({')); 
requireCheck('App line count below chat start', appLines <= 5494, `App.tsx lines ${appLines}`);
requireCheck('App or loop probe keeps explicit outer transport order', (scheduleIndex >= 0 && timeWindowIndex > scheduleIndex && staleIndex > timeWindowIndex && boundaryCallIndex > staleIndex && nextStepWriteIndex > boundaryCallIndex && timeoutIndex > nextStepWriteIndex) || loopProbeIndex >= 0);
requireCheck('timer cleanup remains explicit', (app.includes('window.clearTimeout(timerID);') && app.includes('clearStableRhythmMetronomeTimeouts();')) || (app.includes('startAppStableRhythmLaneSchedulerLoopProbe({') && app.includes('clearStableRhythmMetronomeTimeouts,'))); 
requireCheck('stale execute remains explicit in App or loop probe', (app.includes('if (stationaryPlan.stale) {') && app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, {});')) || app.includes('startAppStableRhythmLaneSchedulerLoopProbe({')); 
requireCheck('App passes explicit transport/lifecycle flags', (app.includes('transportStillAppOwned: true,') && app.includes('nextAbsoluteStepStillAppOwned: true,') && app.includes('staleGuardAlreadyPassed: true,')) || (app.includes('reactLifecycleStillAppEffectOwned: true') && app.includes('nextAbsoluteStepTimeTruthStillAppNexusRef: true'))); 
requireCheck('App passes cache refs explicitly or through boundary ports/args builder', ((app.includes('cacheRefs: {') || app.includes('cacheRefs: stableRhythmLaneSchedulerCacheRefs,') || app.includes('cacheRefs: stableRhythmLaneSchedulerBoundaryPorts.cacheRefs,') || app.includes('boundaryPorts: stableRhythmLaneSchedulerBoundaryPorts,')) && app.includes('rhythmForgeDrumPatternRef,') && app.includes('bassClipPlaybackCacheRef,') && app.includes('psyBassBarIndexRef,')));
requireCheck('App no longer owns non-stale step action inline body', forbiddenAppNeedles.every((needle) => !app.includes(needle)), forbiddenAppNeedles.filter((needle) => app.includes(needle)).join(', '));
requireCheck('boundary contains expected action body', requiredBoundaryNeedles.every((needle) => boundary.includes(needle)), requiredBoundaryNeedles.filter((needle) => !boundary.includes(needle)).join(', '));
requireCheck('boundary does not absorb transport/audio runtime', forbiddenBoundaryNeedles.every((needle) => !boundary.includes(needle)), forbiddenBoundaryNeedles.filter((needle) => boundary.includes(needle)).join(', '));
requireCheck('boundary size indicates bigger block extraction', boundaryLines >= 50 && boundaryLines <= 390, `boundary lines ${boundaryLines}`);
requireCheck('monolith map updated', monolithMap.includes("| 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'") && (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'") || monolithMap.includes("status: 'stable-rhythm-lane-cache-request-builders-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-step-branch-classifiers-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-pattern-cache-commit-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-bass-clip-root-binding-commit-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-boundary-ports-builder-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-step-action-boundary-args-builder-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-step-runners-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-myzel-step-runner-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-quantized-bass-step-values-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-step-execution-frame-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-step-execution-runner-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-step-execution-frame-builder-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-boundary-ports-contract-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-scheduler-loop-probed'")) && monolithMap.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary') && (monolithMap.includes('outer scheduler transport remains App-owned') || monolithMap.includes('Transport-Verantwortung bleibt App-owned') || monolithMap.includes('nextAbsoluteStep-Zeitwahrheit'))); 
requireCheck('sanity suite includes guard', suite.includes(`script: '${scriptName}'`) && suite.includes('Stable rhythm lane scheduler step action boundary extraction'));
requireCheck('sanity contract includes guard', suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('Stable rhythm lane scheduler step action boundary extraction check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  console.error(JSON.stringify({ appLines, boundaryLines, version: pkg.version }, null, 2));
  process.exit(1);
}

console.log('Stable rhythm lane scheduler step action boundary extraction OK');
console.log(JSON.stringify({ appLines, boundaryLines, version: pkg.version }, null, 2));
