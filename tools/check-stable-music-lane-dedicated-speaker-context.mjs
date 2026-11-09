import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`[stable-music-lane-dedicated-speaker-context] FAIL: ${message}`);
  process.exit(1);
};

const app = read('src/App.tsx');
const bridge = read('src/features/xensonar/audio/stableMusicLaneWorkletBridge.ts');
const processor = read('src/features/xensonar/audio/stableMusicLaneWorkletProcessorSource.ts');

if (!app.includes('stableMusicLaneSpeakerProbeCtx')) fail('App must keep a dedicated speaker-probe AudioContext state');
if (!app.includes('new AudioContextCtor()')) fail('speaker probe button must create a fresh AudioContext on click');
if (!app.includes('stableMusicLaneSpeakerProbeCtxRef.current = ctx')) fail('dedicated speaker context must be held in a ref for stop/close');
if (!app.includes('audioCtx: stableMusicLaneSpeakerProbeCtx')) fail('stable lane runtime must use the dedicated speaker context, not the global Xensonar context');
if (app.includes('enabled: stableMusicLaneSpeakerProbeActive && !!(audioCtxRef.current ?? audioCtx)')) fail('speaker proof must not depend on the global app audio context');
if (!app.includes('ctx.close()')) fail('dedicated speaker context must be closed on stop');

if (!bridge.includes('createdNode.connect(proofDirectGain)')) fail('AudioWorkletNode must feed the proof gain');
if (!bridge.includes('proofDirectGain.connect(ctx.destination)')) fail('proof gain must connect directly to ctx.destination');
if (!bridge.includes('proofDirectGain.connect(proofAnalyser)')) fail('proof analyser must be a tap after the proof gain');
if (bridge.includes('proofAnalyser.connect(ctx.destination)')) fail('analyser must not be the audible route in 7.2.6; it is a measurement tap');
if (!processor.includes('const proof = Math.sin(this.speakerProofPhase) * 0.68')) fail('speaker probe tone must be strong enough to be clearly audible');

console.log('[stable-music-lane-dedicated-speaker-context] PASS dedicated direct Worklet speaker context is wired');
