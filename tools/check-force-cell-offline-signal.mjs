#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const sourceFile = fs.readFileSync('src/features/xensonar/audio/forceCellIgniter.ts', 'utf8');
const match = sourceFile.match(/const FORCE_CELL_WORKLET_SOURCE = String\.raw`([\s\S]*?)`;/);
if (!match) {
  console.error('[force-cell-offline-signal] FAIL: FORCE_CELL_WORKLET_SOURCE not found');
  process.exit(1);
}

const workletSource = match[1].replace(/\$\{FORCE_CELL_PROCESSOR_NAME\}/g, 'xensonar-force-cell');
const messages = [];
let ProcessorClass = null;
const context = {
  AudioWorkletProcessor: class {
    constructor() {
      this.port = {
        onmessage: null,
        postMessage: (message) => messages.push(message),
      };
    }
  },
  sampleRate: 48000,
  registerProcessor: (name, cls) => {
    if (name !== 'xensonar-force-cell') throw new Error(`unexpected processor name ${name}`);
    ProcessorClass = cls;
  },
  Math,
};
vm.runInNewContext(workletSource, context);
if (!ProcessorClass) {
  console.error('[force-cell-offline-signal] FAIL: processor was not registered');
  process.exit(1);
}

const processor = new ProcessorClass();
processor.port.onmessage?.({ data: { type: 'force-cell-start' } });
let peak = 0;
let sumSq = 0;
let count = 0;
for (let quantum = 0; quantum < 32; quantum += 1) {
  const left = new Float32Array(128);
  const right = new Float32Array(128);
  const keepAlive = processor.process([], [[left, right]], {});
  if (keepAlive !== true) {
    console.error('[force-cell-offline-signal] FAIL: process returned false');
    process.exit(1);
  }
  for (const channel of [left, right]) {
    for (const sample of channel) {
      const abs = Math.abs(sample);
      if (abs > peak) peak = abs;
      sumSq += sample * sample;
      count += 1;
    }
  }
}
const rms = Math.sqrt(sumSq / Math.max(1, count));
if (!(peak > 0.15 && rms > 0.05)) {
  console.error('[force-cell-offline-signal] FAIL: force cell did not generate enough signal', { peak, rms });
  process.exit(1);
}
processor.port.onmessage?.({ data: { type: 'force-cell-stop' } });
const silence = new Float32Array(128);
processor.process([], [[silence]], {});
const stopPeak = silence.reduce((m, s) => Math.max(m, Math.abs(s)), 0);
if (stopPeak !== 0) {
  console.error('[force-cell-offline-signal] FAIL: force cell did not stop cleanly', { stopPeak });
  process.exit(1);
}
console.log('[force-cell-offline-signal] PASS', JSON.stringify({ peak, rms, stopPeak }));
