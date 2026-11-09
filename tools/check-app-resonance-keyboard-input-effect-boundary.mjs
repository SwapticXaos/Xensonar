#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const failures = [];
const requireText = (label, haystack, needle) => {
  if (!haystack.includes(needle)) failures.push(`${label} missing ${needle}`);
};
const forbidText = (label, haystack, needle) => {
  if (haystack.includes(needle)) failures.push(`${label} must not contain ${needle}`);
};

const appPath = 'src/App.tsx';
const hookPath = 'src/features/xensonar/input/useAppResonanceKeyboardInputEffectBoundary.ts';
const inputRouterPath = 'src/features/xensonar/input/resonanceKeyboardInputRouter.ts';
const keyUpRouterPath = 'src/features/xensonar/input/resonanceKeyboardKeyUpRouter.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-resonance-keyboard-input-effect-boundary';

for (const rel of [appPath, hookPath, inputRouterPath, keyUpRouterPath, mapPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const hook = exists(hookPath) ? read(hookPath) : '';
const inputRouter = exists(inputRouterPath) ? read(inputRouterPath) : '';
const keyUpRouter = exists(keyUpRouterPath) ? read(keyUpRouterPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

requireText('App.tsx', app, 'useAppResonanceKeyboardInputEffectBoundary({');
requireText('App.tsx', app, 'actions: {');
requireText('App.tsx', app, 'runEnterWaveGesture: () => runEnterWaveHotkeyGesture(buildNexusRippleGestureRuntime())');
requireText('App.tsx', app, 'recordAdaptiveAction: recordAudioPressureAdaptiveAction');
requireText('App.tsx', app, 'commitCursorY: commitResonanceCursorY');
for (const forbidden of [
  'const handleResonanceKeyDown = (event: KeyboardEvent) =>',
  'const handleResonanceKeyUp = (event: KeyboardEvent) =>',
  'window.addEventListener("keydown", handleResonanceKeyDown);',
  'window.addEventListener("keyup", handleResonanceKeyUp);',
  'runResonanceKeyboardInputRouter(',
  'runResonanceKeyboardKeyUpRouter(',
  'handlerBodyStillInlineInApp: true',
  'callsiteOwnerStillApp: true',
]) {
  forbidText('App.tsx keyboard listener body', app, forbidden);
}

requireText('keyboard input effect boundary', hook, 'export function useAppResonanceKeyboardInputEffectBoundary');
requireText('keyboard input effect boundary', hook, 'useEffect(() => {');
for (const required of [
  'window.addEventListener("keydown", handleResonanceKeyDown)',
  'window.addEventListener("keyup", handleResonanceKeyUp)',
  'window.removeEventListener("keydown", handleResonanceKeyDown)',
  'window.removeEventListener("keyup", handleResonanceKeyUp)',
  'runResonanceKeyboardInputRouter({',
  'runResonanceKeyboardKeyUpRouter({',
  'managedLoopMaterial: args.managedLoopMaterial',
  'params: args.paramsRef.current',
  'arrowState: args.arrowStateRef.current',
  'cursorY: args.nexusRefs.current.cursorY',
  'pitchLaneState: args.pitchLaneStateRef.current',
  'recordAdaptiveAction: args.actions.recordAdaptiveAction',
  'commitCursorY: args.actions.commitCursorY',
]) {
  requireText('keyboard input effect boundary', hook, required);
}
for (const forbidden of [
  'new window.AudioContext',
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'requestWaveStarterLaneAttack',
  'emitWaveStarterAttack',
  'playWaveStartSound',
  'playBassNote',
  'executeStableRhythmLaneStepPlan',
  'startAppStableRhythmLaneSchedulerLoopProbe',
  'startRootFollow',
  'materialLoopPlayback',
  'setTimeout(',
  'setInterval(',
]) {
  forbidText('keyboard boundary should not absorb audio/scheduler hot paths', hook, forbidden);
}
requireText('input router still owns keyboard signal routing', inputRouter, 'runResonanceKeyboardAudioCommand({');
requireText('input router still owns pitch assembly', inputRouter, 'runResonanceKeyboardPitchCommandAssemblyBoundary({');
requireText('keyup router still owns hold release', keyUpRouter, 'runResonanceKeyUpHoldBoundary({');
requireText('Monolith map status union', map, "'resonance-keyboard-input-effect-boundary-extracted'");
requireText('Monolith map globalInputAndMetronome', map, "status: 'resonance-keyboard-input-effect-boundary-extracted'");
if (!map.includes("firstSafeMove: 'resonance-keyboard-input-effect-boundary-extracted'") && !map.includes("firstSafeMove: 'drone-graph-routing-boundary-extracted'")) failures.push("Monolith map next cuts missing keyboard input firstSafeMove or successor firstSafeMove");

if (pkg.scripts?.[scriptName] !== 'node tools/check-app-resonance-keyboard-input-effect-boundary.mjs') {
  failures.push(`package script missing ${scriptName}`);
}
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);

const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  hookLines: hook.split(/\r?\n/).length,
  contract: {
    keyboardListenerLifecycleExtracted: true,
    existingRoutersStillOwnCommandInterpretation: true,
    noNewQueueCallPlanOrRegistryIntroduced: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-resonance-keyboard-input-effect-boundary] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-resonance-keyboard-input-effect-boundary] ok');
console.log(JSON.stringify(report, null, 2));
