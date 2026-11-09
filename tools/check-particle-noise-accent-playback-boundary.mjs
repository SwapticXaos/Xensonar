#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('src/App.tsx');
const boundaryPath = 'src/features/xensonar/audio/particleNoiseAccentPlaybackBoundary.ts';
const boundary = fs.existsSync(path.join(root, boundaryPath)) ? read(boundaryPath) : '';

const failures = [];
const mustContain = [
  [boundary, 'export function playParticleNoiseAccentWithLifecycle', 'particle noise accent playback boundary export missing'],
  [boundary, 'ParticleNoiseAccentPlaybackRuntime', 'boundary must expose explicit runtime contract'],
  [boundary, 'runtime.noiseBuffer', 'boundary must receive noise buffer through runtime contract'],
  [boundary, 'runtime.getMainOutput(runtime.ctx)', 'boundary must use explicit main-output adapter'],
  [boundary, 'createSoftClipCurve(0.85 + intensity * 1.6)', 'boundary must own noise accent shaper curve'],
  [boundary, 'runtime.recordAudioPressureCount("noise-accent-buffer", "buffer-source-start", 1)', 'boundary must own noise accent pressure witness'],
  [app, 'playParticleNoiseAccentWithLifecycle({', 'App.tsx must delegate particle noise accent playback into boundary'],
  [app, 'noiseBuffer: nexusRefs.current.noiseBuffer', 'App.tsx must pass noise buffer explicitly'],
  [app, 'getMainOutput: ensureFinalMixBus', 'App.tsx must pass final mix bus adapter explicitly'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const forbiddenInApp = [
  'const source = ctx.createBufferSource();\n    const highpass = ctx.createBiquadFilter();\n    const bandpass = ctx.createBiquadFilter();\n    const shaper = ctx.createWaveShaper();',
  'highpass.frequency.setValueAtTime(clamp(baseFreq * (2.8 + intensity * 2.1), 1100, 6200), startAt)',
  'shaper.curve = createSoftClipCurve(0.85 + intensity * 1.6)',
  'recordAudioPressureCount("noise-accent-buffer", "buffer-source-start", 1)',
  'source.stop(endAt + 0.02)',
];
for (const needle of forbiddenInApp) {
  if (app.includes(needle)) failures.push(`App.tsx still owns particle-noise accent playback detail: ${needle}`);
}

const forbiddenInBoundary = [
  'useRef(',
  'useState(',
  'useEffect(',
  'audioCtxRef',
  'nexusRefs',
  'ensureFinalMixBus(',
];
for (const needle of forbiddenInBoundary) {
  if (boundary.includes(needle)) failures.push(`particle-noise boundary depends on App-local runtime detail: ${needle}`);
}

if (failures.length) {
  console.error('[particle-noise-accent-playback-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[particle-noise-accent-playback-boundary] OK');
