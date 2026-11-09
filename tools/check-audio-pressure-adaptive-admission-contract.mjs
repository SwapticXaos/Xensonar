#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const app = read('src/App.tsx');
const transient = read('src/features/resonance/transientRuntime.ts');
const quantized = read('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts');

expect(app.includes('snapshotAudioPressureMap'), 'App does not read the audio pressure snapshot for adaptive admission');
expect(app.includes('getAudioEnginePressureBiasForTransientRuntime'), 'missing shared audio-pressure bias resolver');
expect(app.includes('getExternalPressureBias: getAudioEnginePressureBiasForTransientRuntime'), 'transient runtime is not wired to pressure bias');
expect(app.includes('getAudioPressureBias: getAudioEnginePressureBiasForTransientRuntime'), 'quantized collision runtime is not wired to pressure bias');
expect(!app.includes('osc.connect(filter);\n    osc.connect(filter);'), 'scheduled oscillator path still contains a duplicate oscillator->filter connection');

expect(transient.includes('getExternalPressureBias?: () => number'), 'transient runtime has no optional external pressure bias bridge');
expect(transient.includes('externalPressureBias') && transient.includes('externalPressureBias * 0.9'), 'transient runtime does not include external pressure in admission pressure');
expect(transient.includes('const pressure = Math.max(load, globalPressure, sourceLoad * 0.92, externalPressureBias * 0.9)'), 'transient pressure merge contract changed unexpectedly');

expect(quantized.includes('getAudioPressureBias?: () => number'), 'quantized collision runtime has no pressure bias getter');
expect(quantized.includes('resolveFlushAdmissionContract'), 'missing adaptive flush admission contract');
expect(quantized.includes('resolveLocalFlushPressureBias'), 'missing local due/backlog pressure bias contract');
expect(quantized.includes('maxTotal: pressure >= 0.82 ? 4 : pressure >= 0.58 ? 5 : 6'), 'adaptive total cap contract missing or changed');
expect(quantized.includes('maxResidents: pressure >= 0.72 ? 1 : 2'), 'adaptive resident cap contract missing or changed');
expect(quantized.includes('deferBaseSec: 0.018 + pressure * 0.018'), 'adaptive defer base contract missing or changed');
expect(quantized.includes('deferLaneSec: 0.012 + pressure * 0.014'), 'adaptive defer lane contract missing or changed');
expect(quantized.includes('args.getAudioPressureBias?.() ?? 0'), 'flush path does not sample pressure bias');
expect(quantized.includes('resolveLocalFlushPressureBias(dueItems.length, retainedCount)'), 'flush path does not include local due/backlog pressure');
expect(quantized.includes('residentBlocked = item.targetKind === \'resident\' && admittedResidents >= flushContract.maxResidents'), 'flush path still uses fixed resident admission cap');
expect(quantized.includes('tickBlocked = admittedTotal >= flushContract.maxTotal'), 'flush path still uses fixed total admission cap');

if (failures.length) {
  console.error('[check-audio-pressure-adaptive-admission-contract] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[check-audio-pressure-adaptive-admission-contract] ok');
