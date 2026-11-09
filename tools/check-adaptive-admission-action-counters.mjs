#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const pressure = read('src/core/audio/audioPressureMap.ts');
const transient = read('src/features/resonance/transientRuntime.ts');
const quantized = read('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts');

expect(pressure.includes('export type AudioPressureAdaptiveAction'), 'missing adaptive action type');
expect(pressure.includes('recordAudioPressureAdaptiveAction'), 'missing adaptive action recorder');
expect(pressure.includes('getAudioPressureAdaptiveActionCounters'), 'missing adaptive action counter getter');
expect(pressure.includes('adaptiveActions: AudioPressureAdaptiveActionCounters'), 'witness does not expose adaptive action counters');
expect(pressure.includes("'flush-reduced-to-5'") && pressure.includes("'flush-reduced-to-4'"), 'missing flush reduction action names');
expect(pressure.includes("'resident-reduced-to-1'") && pressure.includes("'overflow-deferred'"), 'missing quantized overflow action names');
expect(pressure.includes("'transient-reduced-event'") && pressure.includes("'transient-dropped-voice'") && pressure.includes("'transient-send-gated'"), 'missing transient action names');

expect(quantized.includes('recordAudioPressureAdaptiveAction'), 'quantized runtime does not record adaptive actions');
expect(quantized.includes("recordAudioPressureAdaptiveAction('flush-reduced-to-4'"), 'flush-to-4 action is not counted');
expect(quantized.includes("recordAudioPressureAdaptiveAction('flush-reduced-to-5'"), 'flush-to-5 action is not counted');
expect(quantized.includes("recordAudioPressureAdaptiveAction('resident-reduced-to-1'"), 'resident cap action is not counted');
expect(quantized.includes("recordAudioPressureAdaptiveAction('overflow-deferred', overflowCandidates.length)"), 'overflow deferral action is not counted');

expect(transient.includes('recordAudioPressureAdaptiveAction'), 'transient runtime does not record adaptive actions');
expect(transient.includes("recordAudioPressureAdaptiveAction('transient-reduced-event'"), 'transient reduced event action is not counted');
expect(transient.includes("recordAudioPressureAdaptiveAction('transient-dropped-voice'"), 'transient dropped voice action is not counted');
expect(transient.includes("recordAudioPressureAdaptiveAction('transient-send-gated'"), 'transient send-gated action is not counted');

if (failures.length) {
  console.error('[check-adaptive-admission-action-counters] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[check-adaptive-admission-action-counters] ok');
