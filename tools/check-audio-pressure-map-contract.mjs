#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const pressure = read('src/core/audio/audioPressureMap.ts');
const elastic = read('src/features/l3lab/canonicalForge/canonicalPreviewMaterialElastic.ts');
const materialRenderer = read('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts');
const synthRenderer = read('src/features/xensonar/rootFollow/rootFollowSynthRenderer.ts');
const residentSample = read('src/features/soundLibrary/residentSamplePlayback.ts');
const particleSample = read('src/features/soundLibrary/particleSamplePlayback.ts');
const quantized = read('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts');
const app = read('src/App.tsx');
const forensics = read('src/features/xensonar/audioTraffic/audioTrafficForensics.ts');

expect(pressure.includes('export type AudioPressureSource'), 'missing AudioPressureSource contract');
expect(pressure.includes('snapshotAudioPressureMap'), 'missing pressure snapshot function');
expect(pressure.includes('recordAudioPressureCount'), 'missing low-overhead count recorder');
expect(pressure.includes('BUCKET_COUNT') && pressure.includes('DEFAULT_BUCKET_MS'), 'pressure map is not bucketed');
expect(!/console\.log\(/.test(pressure), 'pressure map must not log from hot paths');

expect(elastic.includes('pressureSource?: AudioPressureSource'), 'material elastic slice has no optional pressure source bridge');
expect(materialRenderer.includes("pressureSource: 'root-follow-material-grain'"), 'Root-Follow material grains are not pressure-instrumented');
expect(synthRenderer.includes("recordAudioPressureCount('root-follow-sample-grain'"), 'Root-Follow sample grains are not pressure-instrumented');
expect(residentSample.includes("recordAudioPressureCount('resident-elastic-grain'"), 'resident elastic grains are not pressure-instrumented');
expect(particleSample.includes("recordAudioPressureCount('particle-sample-tone', 'buffer-source-start'"), 'particle sample buffer starts are not pressure-instrumented');
expect(particleSample.includes("'async-sample-late-start'"), 'particle async sample late-start edge case is not pressure-instrumented');
expect(quantized.includes("'voice-deferred'"), 'quantized collision queue deferrals are not pressure-instrumented');
expect(app.includes('recordAudioPressureCount("scheduled-tone-oscillator", "oscillator-start"'), 'scheduled oscillator starts are not pressure-instrumented');
expect(app.includes('recordAudioPressureCount("room3-body-exciter"'), 'Room III body exciter pressure path is not instrumented');
expect(forensics.includes('audioPressure: AudioPressureSnapshot'), 'traffic forensics snapshot does not expose audioPressure');
expect(forensics.includes('snapshotAudioPressureMap(windowMs)'), 'traffic forensics does not include pressure snapshot');
expect(forensics.includes('activeNodes > 128') && forensics.includes('cleanupCount === 0'), 'duplicate connection heuristic is still a raw activeNodes threshold');

if (failures.length) {
  console.error('[check-audio-pressure-map-contract] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[check-audio-pressure-map-contract] ok');
