#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const sourcePath = 'src/features/xensonar/audio/stableMusicLaneWorkletProcessorSource.ts';
const file = fs.readFileSync(sourcePath, 'utf8');
const match = file.match(/const STABLE_MUSIC_LANE_WORKLET_PROCESSOR_SOURCE = String\.raw`([\s\S]*?)`;\n/);
if (!match) {
  console.error('[stable-music-lane-offline-signal] FAIL: processor source string not found');
  process.exit(1);
}

const processorSource = match[1];
const registered = new Map();
let currentFrame = 0;
const messages = [];

class FakeAudioWorkletProcessor {
  constructor() {
    this.port = {
      onmessage: null,
      postMessage: (message) => messages.push(message),
    };
  }
}

const context = vm.createContext({
  AudioWorkletProcessor: FakeAudioWorkletProcessor,
  registerProcessor: (name, ctor) => registered.set(name, ctor),
  sampleRate: 48000,
  get currentFrame() { return currentFrame; },
  Math,
  Array,
  Number,
  String,
});

try {
  vm.runInContext(processorSource, context, { timeout: 1000 });
} catch (error) {
  console.error('[stable-music-lane-offline-signal] FAIL: processor source did not evaluate');
  console.error(error);
  process.exit(1);
}

const Processor = registered.get('xensonar-stable-music-lane-worklet');
if (!Processor) {
  console.error('[stable-music-lane-offline-signal] FAIL: processor was not registered');
  process.exit(1);
}

const processor = new Processor();
processor.handleMessage({
  type: 'stable-music-lane-start',
  schemaVersion: 1,
  generation: 1,
  mode: 'speaker-probe',
});

let peak = 0;
let rmsSum = 0;
let sampleCount = 0;
for (let q = 0; q < 48; q += 1) {
  const left = new Float32Array(128);
  const right = new Float32Array(128);
  const keepAlive = processor.process([], [[left, right]]);
  if (keepAlive !== true) {
    console.error('[stable-music-lane-offline-signal] FAIL: processor returned false');
    process.exit(1);
  }
  for (let i = 0; i < left.length; i += 1) {
    const abs = Math.abs(left[i]);
    if (abs > peak) peak = abs;
    rmsSum += left[i] * left[i];
    sampleCount += 1;
  }
  currentFrame += 128;
}

const rms = Math.sqrt(rmsSum / Math.max(1, sampleCount));
const ack = messages.find((message) => message.type === 'stable-music-lane-ack' && message.acceptedType === 'stable-music-lane-start');
const proofPeak = Number(processor.speakerProofPeakAbs || 0);
const proofPulse = Number(processor.speakerProofPulseCount || 0);
if (!ack || ack.running !== true) {
  console.error('[stable-music-lane-offline-signal] FAIL: start ack missing or not running');
  process.exit(1);
}
if (!(peak > 0.2 && rms > 0.05 && proofPeak > 0.2 && proofPulse >= 1)) {
  console.error('[stable-music-lane-offline-signal] FAIL: speaker probe did not produce enough non-zero output');
  console.error(JSON.stringify({ peak, rms, proofPeak, proofPulse }, null, 2));
  process.exit(1);
}

console.log('[stable-music-lane-offline-signal] PASS', JSON.stringify({ peak, rms, proofPeak, proofPulse, messages: messages.length }));
