import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`[stable-music-lane-automated-graph-probe] FAIL: ${message}`);
  process.exit(1);
};

const contracts = read('src/features/xensonar/audio/stableMusicLaneContracts.ts');
const bridge = read('src/features/xensonar/audio/stableMusicLaneWorkletBridge.ts');
const overlay = read('src/features/xensonar/audio/StableMusicLaneSpeakerProbeOverlay.tsx');

for (const token of [
  'graphProbeStatus',
  'graphProbeRms',
  'graphProbePeakAbs',
  'graphProbeSampleCount',
  'graphProbeReason',
]) {
  if (!contracts.includes(token)) fail(`contracts must expose ${token}`);
}

if (!bridge.includes('ctx.createAnalyser()')) fail('bridge must create an AnalyserNode after the proof gain');
if (!bridge.includes('proofDirectGain.connect(proofAnalyser)')) fail('proof gain must feed the analyser');
if (!bridge.includes('proofDirectGain.connect(ctx.destination)')) fail('proof gain must feed ctx.destination directly');
if (!bridge.includes('proofDirectGain.connect(proofAnalyser)')) fail('proof gain must also feed the analyser as a tap');
if (!bridge.includes('getFloatTimeDomainData')) fail('bridge must measure actual graph-domain output samples');
if (!bridge.includes("graphProbeStatus: passed ? 'passed'")) fail('graph probe must decide pass/fail automatically');
if (!bridge.includes('no-nonzero-worklet-output-detected-after-proof-gain')) fail('graph probe must report a hard fail reason');
if (bridge.includes('proofAnalyser.connect(ctx.destination)')) fail('analyser must not be the audible route; it is a measurement tap in 7.2.6');

if (!overlay.includes('Worklet-Speaker Auto-Test')) fail('overlay must expose the automated test, not vague manual listening');
if (!overlay.includes('GRÜN · Worklet-Signal im Graph gemessen')) fail('overlay must show a green automatic pass lamp');
if (!overlay.includes('ROT · kein Worklet-Ausgang gemessen')) fail('overlay must show a red automatic fail lamp');
if (!overlay.includes('kein Hör-Raten')) fail('overlay must explicitly avoid ear-only/manual guesswork');
if (!overlay.includes('data-xensonar-stable-music-lane-graph-probe-status')) fail('overlay must expose a machine-readable graph-probe status for subroutines');

console.log('[stable-music-lane-automated-graph-probe] PASS automated analyser-based graph probe is wired');
