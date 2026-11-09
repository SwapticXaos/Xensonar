import fs from 'node:fs';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const overlay = fs.readFileSync('src/features/xensonar/audio/StableMusicLaneSpeakerProbeOverlay.tsx', 'utf8');
const bridge = fs.readFileSync('src/features/xensonar/audio/stableMusicLaneWorkletBridge.ts', 'utf8');

const fail = (message) => {
  console.error(`[stable-music-lane-speaker-probe-ui] FAIL: ${message}`);
  process.exit(1);
};

if (!app.includes('stableMusicLaneSpeakerProbeActive')) fail('App.tsx must own explicit speaker-probe active state');
if (!app.includes('startStableMusicLaneSpeakerProbe')) fail('App.tsx must expose an explicit start handler');
if (!app.includes('stopStableMusicLaneSpeakerProbe')) fail('App.tsx must expose an explicit stop handler');
if (!app.includes('<StableMusicLaneSpeakerProbeOverlay')) fail('App.tsx must render the explicit speaker-probe overlay');
if (!app.includes('enabled: stableMusicLaneSpeakerProbeActive && !!stableMusicLaneSpeakerProbeCtx')) fail('Stable Music Lane must be gated by the explicit UI toggle and the dedicated probe AudioContext');
if ((!overlay.includes('Sinus testen') || !overlay.includes('Sinus stoppen')) && (!overlay.includes('Auto-Test starten') || !overlay.includes('Auto-Test stoppen'))) fail('Overlay must provide visible start/stop labels');
if (!overlay.includes('Worklet') || !overlay.includes('destination')) fail('Overlay must describe the expected Worklet-to-destination signal chain');
if (!bridge.includes('createdNode.connect(proofDirectGain)') || !bridge.includes('proofDirectGain.connect(ctx.destination)') || !bridge.includes('proofDirectGain.connect(proofAnalyser)')) fail('Speaker probe must connect AudioWorkletNode to ctx.destination directly and tap the analyser for measurement');
if (bridge.includes('proofAnalyser.connect(ctx.destination)')) fail('analyser must not be the audible route in the dedicated speaker probe');

console.log('[stable-music-lane-speaker-probe-ui] PASS');
