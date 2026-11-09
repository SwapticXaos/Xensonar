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
const helperPath = 'src/features/xensonar/input/appRhythmForgePatternCacheRequestBuilderProbe.ts';
const cacheHelperPath = 'src/features/xensonar/input/appRhythmForgePatternCacheHelperProbe.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-rhythm-forge-cache-request-builder-probe';

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

const drumRequestIndex = boundary.indexOf('const rhythmForgeDrumCacheRequest = buildAppRhythmForgePatternCacheRequestProbe({');
const drumCandidateIndex = boundary.indexOf('const rhythmForgeDrumCacheCandidate = resolveAppRhythmForgeDrumCacheHelperProbe(rhythmForgeDrumCacheRequest.request);');
const drumWriteIndex = Math.max(
  boundary.indexOf('cacheRefs.rhythmForgeDrumPatternRef.current = rhythmForgeDrumCacheCandidate.nextPattern;'),
  boundary.indexOf("kind: 'rhythmforge-drum'"),
);
const bassRequestIndex = boundary.indexOf('const rhythmForgeBassCacheRequest = buildAppRhythmForgePatternCacheRequestProbe({');
const bassCandidateIndex = boundary.indexOf('const rhythmForgeBassCacheCandidate = resolveAppRhythmForgeBassCacheHelperProbe(rhythmForgeBassCacheRequest.request);');
const bassWriteIndex = Math.max(
  boundary.indexOf('cacheRefs.rhythmForgeBassPatternRef.current = rhythmForgeBassCacheCandidate.nextPattern;'),
  boundary.indexOf("kind: 'rhythmforge-bass'"),
);

requireCheck('expected files exist', [boundaryPath, helperPath, cacheHelperPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package version updated', /^3\.2\.91\.6\.9\.(191|192|19[3-9]|[2-9][0-9]{2,})$/.test(pkg.version));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-rhythm-forge-cache-request-builder-probe.mjs');
requireCheck('request builder imports flavor resolver only outside boundary', helper.includes('getRhythmForgeFlavor') && !boundary.includes('getRhythmForgeFlavor('));
requireCheck('request builder calculates seed salts', helper.includes('const seed = args.seedBase ^ args.seedSalt;') && boundary.includes('seedSalt: 0x1f17,') && boundary.includes('seedSalt: 0x51b3,'));
requireCheck('request builder returns cache helper request', helper.includes('request: {') && helper.includes('kind: args.kind') && helper.includes('flavor,'));
requireCheck('helper stays pure/static enough', forbiddenHelperNeedles.every((needle) => !helper.includes(needle)), forbiddenHelperNeedles.filter((needle) => helper.includes(needle)).join(', '));
requireCheck('boundary uses request builder before drum cache candidate and writes after candidate', drumRequestIndex >= 0 && drumCandidateIndex > drumRequestIndex && drumWriteIndex > drumCandidateIndex);
requireCheck('boundary uses request builder before bass cache candidate and writes after candidate', bassRequestIndex > drumWriteIndex && bassCandidateIndex > bassRequestIndex && bassWriteIndex > bassCandidateIndex);
requireCheck('cache generator remains in shared cache helper only', cacheHelper.includes('generateRhythmForgePattern({') && !helper.includes('generateRhythmForgePattern({'));
requireCheck('scheduling calls remain split', boundary.includes('scheduleRhythmForgeDrumStep({') && boundary.includes('scheduleRhythmForgeBassStep({'));
requireCheck('cache writes remain explicit and not in request builder', (boundary.includes('cacheRefs.rhythmForgeDrumPatternRef.current = rhythmForgeDrumCacheCandidate.nextPattern;') || boundary.includes("kind: 'rhythmforge-drum'")) && (boundary.includes('cacheRefs.rhythmForgeBassPatternRef.current = rhythmForgeBassCacheCandidate.nextPattern;') || boundary.includes("kind: 'rhythmforge-bass'")) && helper.includes('cacheWriteStillBoundaryOwned: true')); 
requireCheck('monolith map updated', monolithMap.includes("| 'rhythm-forge-cache-request-builder-probed'") && (monolithMap.includes("status: 'rhythm-forge-cache-request-builder-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-cache-request-builders-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-pattern-cache-commit-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-bass-clip-root-binding-commit-probed'")) && monolithMap.includes('buildAppRhythmForgePatternCacheRequestProbe'));
requireCheck('sanity suite includes guard', suite.includes(`script: '${scriptName}'`) && suite.includes('RhythmForge cache request builder probe'));
requireCheck('sanity contract includes guard', suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('RhythmForge cache request builder probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('RhythmForge cache request builder probe OK');
console.log(JSON.stringify({ version: pkg.version, requestBuilder: true, cacheWritesMoved: false, schedulingMoved: false }, null, 2));
