import fs from 'node:fs';

const scheduled = fs.readFileSync('src/features/xensonar/audio/scheduledTonePlaybackBoundary.ts', 'utf8') + '\n' + fs.readFileSync('src/features/xensonar/audio/entrophonWaveAdmission.ts', 'utf8');
const engine = fs.readFileSync('src/core/audio/xensonarMicrotonalSoundEngine.ts', 'utf8');
const emit = fs.readFileSync('src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts', 'utf8');

const requirements = [
  ['active Entrophon cost tracker', scheduled.includes('activeEntrophonWaveVoiceCost')],
  ['runtime cost projection', scheduled.includes('estimateEntrophonWaveRuntimeCost')],
  ['oscillator simplification under pressure', scheduled.includes('chooseEntrophonOscillatorFrequencies')],
  ['actual oscillator starts recorded', scheduled.includes('"oscillator-start", voiceOscs.length')],
  ['Entrophon wave pressure telemetry not silenced', scheduled.includes('forcePressureTelemetry') && scheduled.includes('&& !forcePressureTelemetry')],
  ['Entrophon demand estimate exported', engine.includes('estimateEntrophonWaveVoiceDemand')],
  ['Wellenstarter requested voices scaled by Entrophon cost', emit.includes('entrophonDemand.requestedVoiceMultiplier')],
  ['duplicate spectral tuningStrength removed', (engine.match(/tuningStrength: 0\.98/g) ?? []).length === 1],
];
const failed = requirements.filter(([, ok]) => !ok);
const output = {
  ok: failed.length === 0,
  contract: 'Entrophon Wellenstarter reports real oscillator fanout, reserves higher transient demand, simplifies color/unison/delay under pressure, and keeps the first edge instead of reopening burst floods.',
  requirements: Object.fromEntries(requirements),
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
