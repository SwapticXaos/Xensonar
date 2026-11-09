#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const pressure = read('src/core/audio/audioPressureMap.ts');
const app = read('src/App.tsx');

expect(pressure.includes('export type AudioPressureWitnessSnapshot'), 'missing AudioPressureWitnessSnapshot export');
expect(pressure.includes('export type AudioPressureHighWaterMarks'), 'missing AudioPressureHighWaterMarks export');
expect(pressure.includes('export type DominantAudioPressureSource'), 'missing dominant source classifier type');
expect(pressure.includes('snapshotAudioPressureWitness'), 'missing pressure witness snapshot function');
expect(pressure.includes('getAudioPressureHighWaterMarks'), 'missing high-water getter');
expect(pressure.includes('resetAudioPressureWitness'), 'missing witness reset function');
expect(pressure.includes('__xensonarAudioPressureWitness'), 'missing console witness hook');
expect(pressure.includes('__xensonarResetAudioPressurePeaks'), 'missing console reset hook');
expect(pressure.includes('snapshot750ms') && pressure.includes('snapshot2000ms') && pressure.includes('snapshot6000ms'), 'witness lacks short/medium/long pressure windows');
expect(pressure.includes('classifyDominantSource'), 'missing dominant pressure source classifier');
expect(pressure.includes('resolveAudioPressureBiasFromSnapshot'), 'missing shared pressure bias resolver');
expect(pressure.includes('peakRootFollowMaterialGrainsPerSecond'), 'missing Root-Follow material grain high-water mark');
expect(pressure.includes('peakResidentElasticGrainsPerSecond'), 'missing resident elastic high-water mark');
expect(pressure.includes('peakScheduledToneOscillatorsPerSecond'), 'missing oscillator high-water mark');
expect(!/console\.log\(/.test(pressure), 'pressure witness must not log from live paths');
expect(app.includes('resolveAudioPressureBiasFromSnapshot(snapshot).pressureBias'), 'App still duplicates pressure bias logic instead of using shared resolver');

if (failures.length) {
  console.error('[check-audio-pressure-witness-contract] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[check-audio-pressure-witness-contract] ok');
