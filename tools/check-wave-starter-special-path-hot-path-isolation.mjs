import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const failures = [];

const app = read('src/App.tsx');
const bridge = read('src/features/xensonar/input/waveStarterGestureLoopWorkletBridge.ts');
const runtime = read('src/features/xensonar/audio/waveStarterLaneRuntime.ts');
const contract = read('src/features/xensonar/performanceCrisis/waveStarterSpecialPathIsolationContract.ts');

const appAllowed = app.indexOf('const holdSpecialPathAllowed =');
const appCollect = app.indexOf('const pulses = holdSpecialPathAllowed');
const appPressure = app.indexOf('snapshotAudioPressureMap(750)', appCollect);
const appBridgeResolve = app.indexOf('resolveWaveStarterGestureLoopWorkletBridgeOptions', appCollect);
if (appAllowed < 0) failures.push('App.tsx missing holdSpecialPathAllowed early gate');
if (appCollect < appAllowed) failures.push('App.tsx does not guard hold pulse collection with holdSpecialPathAllowed');
if (appPressure < appCollect || appBridgeResolve < appCollect) failures.push('App.tsx missing pressure/bridge code in hold loop');
if (!app.includes('const pulses = holdSpecialPathAllowed\n        ? collectDueWaveStarterHoldGestureLoopPulses')) failures.push('Hold pulses are not skipped before collection when special path is off');
if (!app.includes('if (holdSpecialPathAllowed && fallbackMaxPulses < 6)')) failures.push('throttle adaptive action still runs when hold special path is off');

const bridgeIsolation = bridge.indexOf('const isolation = readWaveStarterSpecialPathIsolationFromBrowserHotPath();');
const bridgeFunctionStart = bridge.indexOf('export function resolveWaveStarterGestureLoopWorkletBridgeOptions');
const bridgePressure = bridge.indexOf('readWaveStarterProcessorRuntimePressureFeedbackReportFromBrowser', bridgeFunctionStart);
const bridgeDisabled = bridge.indexOf('if (!specialPathAllowed)');
if (!bridge.includes('isWaveStarterGestureLoopWorkletBridgeAllowedFromBrowser')) failures.push('missing exported early hold bridge allowance helper');
if (bridgeIsolation < 0 || bridgeDisabled < bridgeIsolation) failures.push('bridge decision does not check isolation before disabled branch');
if (bridgePressure < bridgeDisabled) failures.push('bridge reads pressure before disabled special path branch');

if (!contract.includes('readWaveStarterSpecialPathIsolationForHotPath')) failures.push('missing no-copy policy reader for lane runtime');
if (!contract.includes('readWaveStarterSpecialPathIsolationFromBrowserHotPath')) failures.push('missing no-copy browser reader for hold hot loop');
if (runtime.includes('resolveWaveStarterSpecialPathIsolation(deps.getPolicy())')) failures.push('lane runtime allocates resolved isolation object per request');
if (!runtime.includes('readWaveStarterSpecialPathIsolationForHotPath(deps.getPolicy())')) failures.push('lane runtime not using hot-path isolation reader');

if (failures.length) {
  console.error('[check-wave-starter-special-path-hot-path-isolation] FAIL');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log('[check-wave-starter-special-path-hot-path-isolation] OK: disabled special paths are skipped before Hold pressure snapshots/bridge decisions/play calls, and runtime isolation reads do not allocate resolved policy objects per request.');
