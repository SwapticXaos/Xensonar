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
const helperPath = 'src/features/xensonar/input/appPsyBassCacheRequestBuilderProbe.ts';
const cacheHelperPath = 'src/features/xensonar/input/appPsyBassCacheHelperProbe.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-psy-bass-cache-request-builder-probe';

const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const helper = exists(helperPath) ? read(helperPath) : '';
const cacheHelper = exists(cacheHelperPath) ? read(cacheHelperPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

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
  'executeStableRhythmLaneStepPlan(',
  'scheduleRhythmForgeDrumStep(',
  'scheduleRhythmForgeBassStep(',
  'schedulePsyBassStep(',
  'scheduleBassClipStep(',
  'playBassNote(',
  'nexusRefs.current.nextAbsoluteStep',
  '.current =',
];

const requestIndex = boundary.indexOf('const psyBassCacheRequest = buildAppPsyBassCacheRequestProbe({');
const candidateIndex = boundary.indexOf('const psyBassCacheCandidate = resolveAppPsyBassCacheHelperProbe(psyBassCacheRequest.request);');
const writeIndex = Math.max(
  boundary.indexOf('cacheRefs.psyBassPatternRef.current = psyBassCacheCandidate.nextPattern;'),
  boundary.indexOf("kind: 'psybass'"),
);

requireCheck('expected files exist', [boundaryPath, helperPath, cacheHelperPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package version updated', /^3\.2\.91\.6\.9\.(192|19[3-9]|[2-9][0-9]{2,})$/.test(pkg.version));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-psy-bass-cache-request-builder-probe.mjs');
requireCheck('request builder imports style resolver only outside boundary', helper.includes('getPsyBassStyle') && !boundary.includes('getPsyBassStyle('));
requireCheck('request builder calculates seed and pressure', helper.includes('const seed = args.seedBase ^ args.seedSalt;') && helper.includes('const pressure = args.descriptors.pressure;') && boundary.includes('seedSalt: 0x9d31,'));
requireCheck('request builder returns cache helper request', helper.includes('request: {') && helper.includes('style: getPsyBassStyle(args.pattern),') && helper.includes('pressure,'));
requireCheck('helper stays pure/static enough', forbiddenHelperNeedles.every((needle) => !helper.includes(needle)), forbiddenHelperNeedles.filter((needle) => helper.includes(needle)).join(', '));
requireCheck('boundary uses request builder before PsyBass cache candidate and writes after candidate', requestIndex >= 0 && candidateIndex > requestIndex && writeIndex > candidateIndex);
requireCheck('boundary no longer constructs PsyBass style/seed/pressure inline', !boundary.includes('style: getPsyBassStyle(p.bassPattern),') && !boundary.includes('seed: cacheRefs.rhythmForgeSeedRef.current ^ 0x9d31,') && !boundary.includes('pressure: grooveDescriptors.pressure,'));
requireCheck('cache generation remains in PsyBass cache helper only', cacheHelper.includes('generatePsyBassPattern(') && !helper.includes('generatePsyBassPattern('));
requireCheck('scheduling calls remain split', boundary.includes('schedulePsyBassStep({') && boundary.includes('scheduleClassicBassPatternStep({') && boundary.includes('scheduleRhythmForgeBassStep({'));
requireCheck('cache writes remain explicit and not in request builder', (boundary.includes('cacheRefs.psyBassPatternRef.current = psyBassCacheCandidate.nextPattern;') || boundary.includes("kind: 'psybass'")) && helper.includes('cacheWriteStillBoundaryOwned: true')); 
requireCheck('monolith map updated', monolithMap.includes("| 'psy-bass-cache-request-builder-probed'") && (monolithMap.includes("status: 'stable-rhythm-lane-cache-request-builders-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-pattern-cache-commit-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-bass-clip-root-binding-commit-probed'")) && monolithMap.includes('buildAppPsyBassCacheRequestProbe'));
requireCheck('sanity suite includes guard', suite.includes(`script: '${scriptName}'`) && suite.includes('PsyBass cache request builder probe'));
requireCheck('sanity contract includes guard', suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('PsyBass cache request builder probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('PsyBass cache request builder probe OK');
console.log(JSON.stringify({ version: pkg.version, requestBuilder: true, cacheWritesMoved: false, schedulingMoved: false }, null, 2));
