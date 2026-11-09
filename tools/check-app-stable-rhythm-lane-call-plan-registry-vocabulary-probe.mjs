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

const registryPath = 'src/features/xensonar/input/appStableRhythmLaneRunnerCallPlanContractRegistryProbe.ts';
const callPlanPath = 'src/features/xensonar/input/appStableRhythmLaneRunnerCallPlanProbe.ts';
const parityPath = 'src/features/xensonar/input/appStableRhythmLaneRunnerCallPlanParityProbe.ts';
const fixturePath = 'src/features/xensonar/input/appStableRhythmLaneRunnerCallPlanFixtureProbe.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const contractRegistryGuardPath = 'tools/check-app-stable-rhythm-lane-runner-call-plan-contract-registry-probe.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-call-plan-registry-vocabulary-probe';

const registry = exists(registryPath) ? read(registryPath) : '';
const callPlan = exists(callPlanPath) ? read(callPlanPath) : '';
const parity = exists(parityPath) ? read(parityPath) : '';
const fixture = exists(fixturePath) ? read(fixturePath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const contractRegistryGuard = exists(contractRegistryGuardPath) ? read(contractRegistryGuardPath) : '';

const requiredRegistryTypes = [
  'AppStableRhythmLaneRunnerCallPlanContractDomain',
  'AppStableRhythmLaneRunnerCallPlanSchedulerCall',
  'AppStableRhythmLaneRunnerCallPlanCacheContract',
  'AppStableRhythmLaneRunnerCallPlanStep',
  'AppStableRhythmLaneRunnerCallPlanContractCase',
];
const forbiddenRegistryNeedles = [
  "from './appStableRhythmLaneRunnerCallPlanProbe'",
  'import React', 'useEffect(', 'useMemo(', 'useCallback(', 'useState(', 'useRef(',
  'window.setTimeout(', 'window.clearTimeout(', 'requestAnimationFrame(', 'cancelAnimationFrame(',
  'resolveStableRhythmLaneTimeWindow(', 'buildStableRhythmLaneStepPlan(', 'executeStableRhythmLaneStepPlan(',
  'nexusRefs.current.nextAbsoluteStep', 'ensureAudioReady(', 'createOscillator(', 'createGain(', '.connect(', '.start(', '.current =',
  'scheduleBassClipStep(', 'scheduleRhythmForgeBassStep(', 'scheduleRhythmForgeDrumStep(', 'schedulePsyBassStep(',
  'scheduleClassicBassPatternStep(', 'scheduleExportedDrumConfigStep(', 'readQuantizeBpm(', 'playBassNote(',
];

requireCheck('expected files exist', [registryPath, callPlanPath, parityPath, fixturePath, mapPath, pkgPath, suitePath, suiteContractPath, contractRegistryGuardPath].every(exists));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-call-plan-registry-vocabulary-probe.mjs');
for (const typeName of requiredRegistryTypes) {
  requireCheck(`registry exports ${typeName}`, registry.includes(`export type ${typeName}`));
}
requireCheck('registry has no dependency on call-plan builder', !registry.includes("from './appStableRhythmLaneRunnerCallPlanProbe'"));
requireCheck('registry stays non-runtime shadow vocabulary', forbiddenRegistryNeedles.every((needle) => !registry.includes(needle)), forbiddenRegistryNeedles.filter((needle) => registry.includes(needle)).join(', '));
requireCheck('call-plan no longer owns scheduler/cache/step vocabulary', !callPlan.includes('export type AppStableRhythmLaneRunnerCallPlanSchedulerCall =') && !callPlan.includes('export type AppStableRhythmLaneRunnerCallPlanCacheContract =') && !callPlan.includes('export type AppStableRhythmLaneRunnerCallPlanStep ='));
requireCheck('call-plan imports step vocabulary from registry', callPlan.includes("import type { AppStableRhythmLaneRunnerCallPlanStep } from './appStableRhythmLaneRunnerCallPlanContractRegistryProbe'"));
requireCheck('call-plan re-exports registry vocabulary for compatibility', callPlan.includes("export type {\n  AppStableRhythmLaneRunnerCallPlanCacheContract") && callPlan.includes("} from './appStableRhythmLaneRunnerCallPlanContractRegistryProbe'"));
requireCheck('parity imports step from registry, not call-plan', parity.includes('type AppStableRhythmLaneRunnerCallPlanStep') && parity.includes("from './appStableRhythmLaneRunnerCallPlanContractRegistryProbe'") && !parity.includes('AppStableRhythmLaneRunnerCallPlanStep,\n} from \'./appStableRhythmLaneRunnerCallPlanProbe\''));
requireCheck('fixture keeps plan type only and uses registry builder', fixture.includes("import type { AppStableRhythmLaneRunnerCallPlanProbe } from './appStableRhythmLaneRunnerCallPlanProbe'") && fixture.includes('buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe'));
requireCheck('older registry guard checks detached vocabulary', contractRegistryGuard.includes('registry has no dependency on call-plan builder') || !registry.includes("from './appStableRhythmLaneRunnerCallPlanProbe'"));
requireCheck('monolith map records vocabulary status', map.includes("| 'stable-rhythm-lane-call-plan-registry-vocabulary-probed'") && (map.includes('Registry is now the shared vocabulary and matrix source') || map.includes('Call-Plan Registry now also owns the shared vocabulary types')) && (map.includes('Transport-Verantwortung bleibt App-owned') || map.includes("successor lineage marker for older guards: status: 'stable-rhythm-lane-scheduler-loop-probed'"))); 
requireCheck('suite includes guard', suite.includes(`script: '${scriptName}'`) && suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane call-plan registry vocabulary probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('app stable rhythm lane call-plan registry vocabulary probe OK');
console.log(' - registry is the shared vocabulary and matrix source');
console.log(' - call-plan/parity/fixture no longer make the plan builder own shared branch vocabulary');
