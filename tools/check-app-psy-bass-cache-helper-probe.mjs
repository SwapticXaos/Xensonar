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
const helperPath = 'src/features/xensonar/input/appPsyBassCacheHelperProbe.ts';
const rhythmForgeBassHelperPath = 'src/features/xensonar/input/appRhythmForgeBassCacheHelperProbe.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const schedulerBody = `${app}\n${boundary}`;
const helper = exists(helperPath) ? read(helperPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const scriptName = 'xensonar:check-app-psy-bass-cache-helper-probe';

const appIndex = (needle) => schedulerBody.indexOf(needle);
const rhythmForgeBassHelperIndex = Math.max(
  appIndex('const rhythmForgeBassCacheCandidate = resolveAppRhythmForgeBassCacheHelperProbe({'),
  appIndex('const rhythmForgeBassCacheCandidate = resolveAppRhythmForgeBassCacheHelperProbe(rhythmForgeBassCacheRequest.request);'),
);
const helperCallIndex = Math.max(
  appIndex('const psyBassCacheCandidate = resolveAppPsyBassCacheHelperProbe({'),
  appIndex('const psyBassCacheCandidate = resolveAppPsyBassCacheHelperProbe(psyBassCacheRequest.request);'),
);
const helperWriteIndex = Math.max(appIndex('psyBassPatternRef.current = psyBassCacheCandidate.nextPattern;'), appIndex('cacheRefs.psyBassPatternRef.current = psyBassCacheCandidate.nextPattern;'));
const helperBarWriteIndex = Math.max(appIndex('psyBassBarIndexRef.current = psyBassCacheCandidate.nextBarIndex;'), appIndex('cacheRefs.psyBassBarIndexRef.current = psyBassCacheCandidate.nextBarIndex;'));
const scheduleIndex = appIndex('schedulePsyBassStep({');

const forbiddenHelperNeedles = [
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
  'ensureAudioReady(',
  'executeStableRhythmLaneStepPlan(',
  'schedulePsyBassStep(',
  'scheduleRhythmForgeBassStep(',
  'scheduleBassClipStep(',
  'playBassNote(',
  'nexusRefs.current.nextAbsoluteStep',
  '.current =',
];

requireCheck('expected files exist', [appPath, helperPath, rhythmForgeBassHelperPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-psy-bass-cache-helper-probe.mjs');
requireCheck('App imports helper', schedulerBody.includes('resolveAppPsyBassCacheHelperProbe'));
requireCheck('helper generates but does not write', helper.includes('generatePsyBassPattern(buildPsyBassPatternRequest({') && helper.includes('cacheWriteRequired') && helper.includes('writerStillAppOwned: true'));
requireCheck('helper preserves style/root/groove inputs', ['style: args.style', 'rootHz: args.rootHz', 'pressure: args.pressure', 'descriptors: args.descriptors'].every((needle) => helper.includes(needle)));
requireCheck('helper stays pure/static enough', forbiddenHelperNeedles.every((needle) => !helper.includes(needle)), forbiddenHelperNeedles.filter((needle) => helper.includes(needle)).join(', '));
requireCheck('helper order remains rhythmforge-bass then psybass', rhythmForgeBassHelperIndex >= 0 && helperCallIndex > rhythmForgeBassHelperIndex);
requireCheck('App writes helper result inline', helperCallIndex >= 0 && helperWriteIndex > helperCallIndex && helperBarWriteIndex > helperWriteIndex);
requireCheck('App schedules from helper candidate pattern', scheduleIndex > helperBarWriteIndex && schedulerBody.includes('const psyBassPattern = psyBassCacheCandidate.pattern;'));
requireCheck('App no longer directly generates psybass cache inline', !schedulerBody.includes('psyBassPatternRef.current = generatePsyBassPattern(buildPsyBassPatternRequest({'));
requireCheck('psybass generation imports removed from App', !app.includes('import { generatePsyBassPattern }') && !app.includes('buildPsyBassPatternRequest,'));
requireCheck('monolith map updated', monolithMap.includes("| 'psy-bass-cache-helper-probed'") && (monolithMap.includes("status: 'psy-bass-cache-helper-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'") || monolithMap.includes("status: 'stable-rhythm-lane-cache-request-builders-probed'")) && monolithMap.includes('resolveAppPsyBassCacheHelperProbe'));
requireCheck('suite includes new script', suite.includes(`script: '${scriptName}'`) && suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app psybass cache helper probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app psybass cache helper probe OK');
console.log(' - helper reads/generates/returns');
console.log(' - psybass cache Ref writes remain App-owned');
console.log(' - stable scheduler runtime remains inline');
