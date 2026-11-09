#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => {
  console.error(`[keyboard-root-follow-pressure-traffic-policy] FAIL: ${message}`);
  process.exit(1);
};
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const policyPath = 'src/features/xensonar/input/resonanceKeyboardRootFollowControlPolicy.ts';
const assemblyPath = 'src/features/xensonar/input/resonanceKeyboardPitchCommandAssemblyBoundary.ts';
const contractPath = 'src/features/xensonar/input/wellenstarterBallPositionContract.ts';
const lanePath = 'src/features/xensonar/input/resonanceKeyboardPitchLane.ts';
const appPath = 'src/App.tsx';
const pressurePath = 'src/core/audio/audioPressureMap.ts';

for (const file of [policyPath, assemblyPath, contractPath, lanePath, appPath, pressurePath]) {
  if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);
}

const policy = read(policyPath);
const assembly = read(assemblyPath);
const contract = read(contractPath);
const lane = read(lanePath);
const app = read(appPath);
const pressure = read(pressurePath);

const policyRequired = [
  'live-player-timing',
  'live-watch-full-feel',
  'rate-limited-pressure-lane',
  'freeze-last-valid-pressure-lane',
  'recouple-live-player-timing',
  'preservesLowPressurePlayerTiming: true',
  'trafficPoliceOnlyUnderPressure: true',
  'preventsCatchupBurst: true',
  "args.congestionState === 'clear'",
  "args.congestionState === 'watch'",
  "args.congestionState === 'critical' && isDenseGesture",
];
for (const marker of policyRequired) {
  if (!policy.includes(marker)) fail(`policy missing marker: ${marker}`);
}

const forbiddenPolicy = ['setTimeout(', 'requestAnimationFrame(', 'AudioWorkletNode', 'postMessage('];
for (const marker of forbiddenPolicy) {
  if (policy.includes(marker)) fail(`policy should stay pure and contains: ${marker}`);
}

const assemblyRequired = [
  'resolveKeyboardWellenstarterBallPosition({',
  'syncRootFollowInput: rootFollowLoopActive',
  'previewWave: allowWavePreview',
  'waveStarterOptions: undefined',
];
for (const marker of assemblyRequired) {
  if (!assembly.includes(marker)) fail(`assembly missing marker: ${marker}`);
}
for (const forbidden of [
  'resolveResonanceRootFollowControlDecision({',
  'pitchLaneState.rootFollowControl',
  'rootFollowControlDecision',
  "recordAdaptiveAction('root-follow-input-freeze-last-valid')",
  "recordAdaptiveAction('root-follow-input-rate-limited')",
]) {
  if (assembly.includes(forbidden)) fail(`keyboard assembly must not use root-follow pressure traffic policy directly: ${forbidden}`);
}
if (!contract.includes('keyboardWindowFrequency(') || !contract.includes('targetY: yFromFreq(targetHz)')) {
  fail('WSB position contract must resolve the Keyboard→Ball position directly.');
}
if (!lane.includes('rootFollowControl: createResonanceRootFollowControlState()')) {
  fail('keyboard pitch lane state still keeps the old Root-Follow control state for compatibility/future non-hotpath use');
}
if (!app.includes('syncRootFollowInput?: boolean')) fail('App cursor commit missing syncRootFollowInput option');
if (!app.includes('options.syncRootFollowInput !== false')) fail('App cursor commit does not honor syncRootFollowInput false');
for (const marker of ['root-follow-input-rate-limited', 'root-follow-input-freeze-last-valid']) {
  if (!pressure.includes(marker)) fail(`audio pressure map missing adaptive action: ${marker}`);
}

console.log('[keyboard-root-follow-pressure-traffic-policy] PASS');
