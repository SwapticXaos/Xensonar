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

const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const appPath = 'src/App.tsx';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const app = exists(appPath) ? read(appPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-boundary-groove-locals-normalization';

const count = (needle, haystack) => (haystack.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
const localsIndex = boundary.indexOf('const grooveDescriptors = groove.descriptors;');
const baseSwingIndex = boundary.indexOf('const rhythmForgeBaseSwing = 0.04 + drumStyle.swing * 0.1;');
const actionPortIndex = boundary.indexOf('const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({');
const drumHelperIndex = Math.max(
  boundary.indexOf('const rhythmForgeDrumCacheCandidate = resolveAppRhythmForgeDrumCacheHelperProbe({'),
  boundary.indexOf('const rhythmForgeDrumCacheCandidate = resolveAppRhythmForgeDrumCacheHelperProbe(rhythmForgeDrumCacheRequest.request);'),
);
const bassHelperIndex = Math.max(
  boundary.indexOf('const rhythmForgeBassCacheCandidate = resolveAppRhythmForgeBassCacheHelperProbe({'),
  boundary.indexOf('const rhythmForgeBassCacheCandidate = resolveAppRhythmForgeBassCacheHelperProbe(rhythmForgeBassCacheRequest.request);'),
);
const psyHelperIndex = Math.max(
  boundary.indexOf('const psyBassCacheCandidate = resolveAppPsyBassCacheHelperProbe({'),
  boundary.indexOf('const psyBassCacheCandidate = resolveAppPsyBassCacheHelperProbe(psyBassCacheRequest.request);'),
);

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
];

requireCheck('expected files exist', [boundaryPath, appPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package version updated', /^3\.2\.91\.6\.9\.(190|19[1-9]|[2-9][0-9]{2,})$/.test(pkg.version));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-boundary-groove-locals-normalization.mjs');
requireCheck('boundary names groove descriptors and RhythmForge base swing once', localsIndex >= 0 && baseSwingIndex > localsIndex && baseSwingIndex < actionPortIndex);
requireCheck('drum/bass RhythmForge helpers use named base swing', count('baseSwing: rhythmForgeBaseSwing,', boundary) === 2 && !boundary.includes('baseSwing: 0.04 + drumStyle.swing * 0.1,'));
requireCheck('cache helper descriptors use named groove descriptors', count('descriptors: grooveDescriptors,', boundary) >= 3 && !boundary.includes('descriptors: groove.descriptors,'));
requireCheck('PsyBass pressure uses named groove descriptors', (boundary.includes('pressure: grooveDescriptors.pressure,') || boundary.includes('descriptors: grooveDescriptors,')) && !boundary.includes('pressure: groove.descriptors.pressure,'));
requireCheck('local values remain after non-stale prestep context', localsIndex > boundary.indexOf('buildAppStableRhythmLaneSchedulerPrestepContext({') && drumHelperIndex > localsIndex && bassHelperIndex > localsIndex && psyHelperIndex > localsIndex);
requireCheck('scheduling calls remain split', [
  'scheduleRhythmForgeDrumStep({',
  'scheduleRhythmForgeBassStep({',
  'schedulePsyBassStep({',
  'scheduleClassicBassPatternStep({',
].every((needle) => boundary.includes(needle)));
requireCheck('boundary does not absorb outer runtime ownership', forbiddenBoundaryNeedles.every((needle) => !boundary.includes(needle)), forbiddenBoundaryNeedles.filter((needle) => boundary.includes(needle)).join(', '));
requireCheck('App still passes cache refs callsite group', app.includes('const stableRhythmLaneSchedulerCacheRefs: AppStableRhythmLaneSchedulerCacheRefs = {') && app.includes('cacheRefs: stableRhythmLaneSchedulerCacheRefs,'));
requireCheck('monolith map updated', monolithMap.includes("| 'stable-rhythm-lane-boundary-groove-locals-normalized'") && (monolithMap.includes("status: 'stable-rhythm-lane-boundary-groove-locals-normalized'") || monolithMap.includes("status: 'stable-rhythm-lane-cache-request-builders-probed'")) && monolithMap.includes('grooveDescriptors') && monolithMap.includes('rhythmForgeBaseSwing') && monolithMap.includes('outer scheduler transport and nextAbsoluteStep remain App-owned'));
requireCheck('sanity suite includes guard', suite.includes(`script: '${scriptName}'`) && suite.includes('Stable rhythm lane boundary groove locals normalization'));
requireCheck('sanity contract includes guard', suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('Stable rhythm lane boundary groove locals normalization check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('Stable rhythm lane boundary groove locals normalization OK');
console.log(JSON.stringify({ version: pkg.version, grooveDescriptorsLocal: true, rhythmForgeBaseSwingLocal: true, transportMoved: false }, null, 2));
