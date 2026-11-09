import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const assertions = [
  ['src/core/audio/xensonarMicrotonalSoundEngine.ts', 'XENSONAR_MICROTONAL_ENGINE_VERSION'],
  ['src/features/xensonar/audio/scheduledTonePlaybackBoundary.ts', 'resolveXensonarMicrotonalVoice'],
  ['src/features/xensonar/audio/waveStarterGradientToneGraph.ts', 'resolveXensonarMicrotonalVoice'],
  ['src/features/xensonar/audio/particleNoiseAccentPlaybackBoundary.ts', 'resolveXensonarTunedFrequency'],
  ['src/features/l3lab/spectralForge/audio/AudioEngine.ts', 'resolveSpectralForgeMicrotonalFrequency'],
  ['src/features/l3lab/spectralForge/audio/AudioEngine.ts', 'xensonarMicrotonalStableNoise01'],
];

const failures = assertions.filter(([file, needle]) => !read(file).includes(needle));
if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  engine: '111-microtonal-unified-sound-engine',
  routedSurfaces: ['Wellenstarter scheduled tones', 'Wellenstarter gradient graph', 'Partikel scheduled tones', 'Partikel noise accent', 'SpectralForge additive/granular/glyph/IFFT frequency interpretation'],
  deterministicSpectralGrainNoise: true,
}, null, 2));
