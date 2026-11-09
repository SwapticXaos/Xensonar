import fs from 'node:fs';

const src = fs.readFileSync('src/features/xensonar/audio/scheduledTonePlaybackBoundary.ts', 'utf8') + '\n' + fs.readFileSync('src/features/xensonar/audio/entrophonWaveAdmission.ts', 'utf8');
const requirements = {
  recentChordWindow: src.includes('ENTROPHON_WAVE_CHORD_WINDOW_MS'),
  recentCostPressure: src.includes('ENTROPHON_WAVE_RECENT_COST_DENOMINATOR'),
  chordRejectGate: src.includes('shouldRejectEntrophonWaveForChordBurst'),
  pressureGainScale: src.includes('resolveEntrophonWavePressureGainScale'),
  startRemembered: src.includes('rememberEntrophonWaveStart({'),
  aggressiveCollapse: src.includes('pressure >= 0.5') && src.includes('? 1') && src.includes('colorLimit = pressure >= 0.22 ? 0'),
  noDoubleOscillatorStart: !src.includes('voiceOsc.start(safeStart);\n    voiceOsc.start(safeStart);'),
};
const ok = Object.values(requirements).every(Boolean);
console.log(JSON.stringify({
  ok,
  contract: 'Entrophon keyboard chords must not fan out into full unison/color/delay bursts; simultaneous hits collapse auxiliary oscillators, damp aggregate gain, reject delayed low-prominence tails, and never start an oscillator twice.',
  requirements,
}, null, 2));
if (!ok) process.exit(1);
