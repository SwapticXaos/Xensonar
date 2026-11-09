import assert from 'node:assert/strict';
import {load} from './c11-test-harness.mjs';
const clock = await load('src/features/xensonar/input/waveStarterHoldSegmentClock.ts');
const {createWaveStarterLaneRuntime} = await load('src/features/xensonar/audio/waveStarterLaneRuntime.ts');
let now = 1000, frame = 48000;
const emitted = [];
const policy = {specialPathIsolation: {
  holdGestureLoopWorkletBridge: true, holdGestureLegacyFallback: true,
  staleFailoverCandidates: true, liveReports: false, workletShadowMirroring: false,
}};
const runtime = createWaveStarterLaneRuntime({
  nowMs: () => now, getAudioContext: () => ({state: 'running', sampleRate: 48000, currentTime: frame / 48000}),
  getPolicy: () => policy, getPressureBias: () => 1, getActiveScheduledToneCount: () => 1000,
  recordAdaptiveAction() {}, emitAttack: (hz, _sector, options) => emitted.push({hz, options}),
  setTimeoutFn() {throw new Error('Hold admission must not retain musical timer work');}, clearTimeoutFn() {},
});
const state = clock.createWaveStarterHoldGestureLoopLaneState();
const holdArgs = {state, lane: 'klaviatur', keyId: 'KeyA', bpm: 120, segmentsPerBar: 24};
const begin = clock.resolveWaveStarterHoldGestureLoopFrame({...holdArgs, isRepeat: false, nowMs: now, targetHz: 220});
assert(begin.allowImmediateAudio);
const options = {waveStarterGestureLoopWorkletBridge: true, waveStarterGestureLoopWorkletOnly: false,
  forceSustainExtend: true, waveStarterGestureLoopExtendPolicy: 'apostrophe-safe-extend',
  waveStarterGestureLoopLane: 'klaviatur', waveStarterPresetOverride: 'glass_ping'};
runtime.request(220, false, {...options, requestedAtMs: now});
assert.equal(emitted.length, 1);
assert.equal(emitted[0].options.waveStarterGestureLoopWorkletOnly, false, 'explicit allowed Hold fallback remains available');
assert.equal(emitted[0].options.forceSustainExtend, true);
assert.equal(emitted[0].options.waveStarterPresetOverride, 'glass_ping');
for (let i = 0; i < 10000; i++) runtime.request(440, false, {...options, requestedAtMs: now});
assert.equal(emitted.length, 8);
// Continuous intent updates stay in their own owner, even when attacks are full.
const repeat = clock.resolveWaveStarterHoldGestureLoopFrame({...holdArgs, isRepeat: true, nowMs: now,
  targetHz: 330, sustainExtendActive: true});
assert.equal(repeat.allowImmediateAudio, false);
assert.equal(state.gestures.klaviatur.KeyA.targetHz, 330);
assert.equal(state.gestures.klaviatur.KeyA.sustainExtendLatched, true);
// A delayed state tick emits only the current pulse, never missed attack history.
now += 1000; frame += 48000;
const collect = () => clock.collectDueWaveStarterHoldGestureLoopPulses({state, nowMs: now, bpm: 120,
  segmentsByLane: {wellenstart: 24, klaviatur: 24}, sustainExtendActive: false});
const pulses = collect();
assert.equal(pulses.length, 1); assert.equal(pulses[0].targetHz, 330);
assert.equal(pulses[0].extendPolicy, 'apostrophe-safe-extend');
assert(state.skippedCatchupCount > 0); assert.equal(collect().length, 0);
runtime.flushDeferred(); assert.equal(emitted.length, 8);
runtime.request(330, false, {...options, requestedAtMs: now});
assert.equal(emitted.length, 9, 'fresh continuation survives after overload');
// Stale fallback candidates cannot revive the rejected attack, even if enabled.
for (const kind of ['synthWorkletFailoverCandidate', 'sampleWorkletFailoverCandidate']) {
  runtime.request(880, false, {[kind]: true, requestedAtMs: now - 500});
  runtime.request(880, false, {[kind]: true, fromDeferredSlot: true, requestedAtMs: now});
}
assert.equal(emitted.length, 9);
policy.specialPathIsolation.holdGestureLegacyFallback = false;
runtime.request(330, false, {...options, requestedAtMs: now});
assert.equal(emitted.at(-1).options.waveStarterGestureLoopWorkletOnly, true);
policy.specialPathIsolation.holdGestureLoopWorkletBridge = false;
runtime.request(330, false, {...options, requestedAtMs: now});
assert.equal(emitted.length, 10, 'disabled route fails closed');
// Release is not an attack and must work even with full/disabled admission.
clock.releaseWaveStarterHoldGestureLoop({state, lane: 'klaviatur', keyId: 'KeyA'});
assert.equal(clock.hasActiveWaveStarterHoldGestureLoop({state}), false);
now += 1000; frame += 48000; assert.equal(collect().length, 0);
runtime.flushDeferred(); assert.equal(emitted.length, 10);
runtime.dispose(); runtime.request(440); assert.equal(emitted.length, 10);
console.log(JSON.stringify({pass: true, proof: 'actual Hold state owner and special attack lane',
  continuousRetarget: true, sustainLatch: true, currentPulseOnly: true,
  releaseAfterOverload: true, fallbackPolicyPreserved: true, staleFallbackReplay: false}, null, 2));
