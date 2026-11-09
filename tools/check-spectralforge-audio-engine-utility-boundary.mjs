#!/usr/bin/env node
import fs from 'node:fs';
import ts from './typescript-runtime.mjs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const audioEnginePath = 'src/features/l3lab/spectralForge/audio/AudioEngine.ts';
const files = {
  engine: audioEnginePath,
  waveforms: 'src/features/l3lab/spectralForge/audio/audioWaveforms.ts',
  wav: 'src/features/l3lab/spectralForge/audio/wavEncoding.ts',
  beatGuide: 'src/features/l3lab/spectralForge/audio/beatGuideScheduler.ts',
  bufferMath: 'src/features/l3lab/spectralForge/audio/audioBufferMath.ts',
  spectralRenderer: 'src/features/l3lab/spectralForge/audio/SpectralBufferRenderer.ts',
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) failures.push(`missing ${file}`);
}

const engine = read(files.engine);
const waveforms = read(files.waveforms);
const wav = read(files.wav);
const beatGuide = read(files.beatGuide);
const bufferMath = read(files.bufferMath);
const spectralRenderer = read(files.spectralRenderer);

function requireText(label, content, needle) {
  if (!content.includes(needle)) failures.push(`${label} missing ${needle}`);
}
function forbidText(label, content, needle) {
  if (content.includes(needle)) failures.push(`${label} still contains ${needle}`);
}

requireText('AudioEngine imports waveform helper', engine, "from './audioWaveforms';");
requireText('AudioEngine imports mixed waveform helper', engine, 'mixedWaveform');
requireText('AudioEngine imports beat-guide scheduler', engine, "import { scheduleBeatGuideClicks } from './beatGuideScheduler';");
requireText('AudioEngine imports WAV encoder', engine, "import { encodeMonoFloat32ToWavBlob } from './wavEncoding';");
requireText('AudioEngine imports buffer math', engine, "from './audioBufferMath';");

forbidText('AudioEngine', engine, 'function sawtoothWave(');
forbidText('AudioEngine', engine, 'function squareWave(');
forbidText('AudioEngine', engine, 'function triangleWave(');
forbidText('AudioEngine', engine, 'function mixedWaveform(');
forbidText('AudioEngine', engine, 'const writeString = (offset: number, str: string)');
forbidText('AudioEngine', engine, 'view.setInt16(44 + i * 2');
forbidText('AudioEngine', engine, 'const events: { whenInCycle: number; isBarStart: boolean }[] = [];');
forbidText('AudioEngine', engine, 'osc.frequency.setValueAtTime(freq, when);');
forbidText('AudioEngine', engine, 'private normalizeBuffer(');
forbidText('AudioEngine', engine, 'private resampleMonoBufferToLength(');
forbidText('AudioEngine', engine, 'private mixMonoBuffersWeighted(');

for (const marker of [
  'export function sawtoothWave',
  'export function squareWave',
  'export function triangleWave',
  'export function mixedWaveform',
  'WaveformMix',
]) requireText('audioWaveforms boundary', waveforms, marker);

for (const marker of [
  'export function encodeMonoFloat32ToWavBlob',
  'writeString(0,',
  'RIFF',
  'WAVE',
  'fmt ',
  'data',
  'view.setInt16(44 + (i * count + channel) * 2',
  'audio/wav',
]) requireText('wavEncoding boundary', wav, marker);

for (const marker of [
  'export function normalizeMonoAudioBufferInPlace',
  'export function resampleMonoAudioBufferToLength',
  'export function mixMonoAudioBuffersWeighted',
  'WeightedMonoAudioBuffer',
]) requireText('audioBufferMath boundary', bufferMath, marker);

// Behavioral probe for the extracted math. It runs the actual TypeScript source
// after transpilation and checks values that characterize the old implementation.
try {
  const js = ts.transpileModule(bufferMath, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', js)(module, module.exports);
  const { normalizeMonoAudioBufferInPlace, resampleMonoAudioBufferToLength, mixMonoAudioBuffersWeighted } = module.exports;
  const makeBuffer = (values, sampleRate = 48000) => {
    const data = Float32Array.from(values);
    return { length: data.length, sampleRate, getChannelData: () => data };
  };
  const ctx = {
    sampleRate: 48000,
    createBuffer: (_channels, length, sampleRate) => makeBuffer(new Array(length).fill(0), sampleRate),
  };
  const norm = makeBuffer([0.25, -0.5, 0.125]);
  normalizeMonoAudioBufferInPlace(norm, 0.9);
  const normData = Array.from(norm.getChannelData(0));
  if (Math.abs(normData[0] - 0.45) > 1e-6 || Math.abs(normData[1] + 0.9) > 1e-6) failures.push('buffer math normalize behavioral probe drift');
  const resampled = resampleMonoAudioBufferToLength(ctx, makeBuffer([0, 1, 0], 44100), 5);
  const resampledData = Array.from(resampled.getChannelData(0));
  const expectedResample = [0, 0.5, 1, 0.5, 0];
  if (resampled.sampleRate !== 44100 || expectedResample.some((v, i) => Math.abs(resampledData[i] - v) > 1e-6)) failures.push('buffer math resample behavioral probe drift');
  const mixed = mixMonoAudioBuffersWeighted(ctx, [
    { buffer: makeBuffer([1, 0, -1]), gain: 0.5 },
    { buffer: makeBuffer([0, 1, 0]), gain: 0.25 },
  ], 0.95);
  const mixedData = Array.from(mixed.getChannelData(0));
  const expectedMix = [0.95, 0.475, -0.95];
  if (expectedMix.some((v, i) => Math.abs(mixedData[i] - v) > 1e-6)) failures.push('buffer math weighted-mix behavioral probe drift');
} catch (error) {
  failures.push(`buffer math behavioral probe failed: ${error?.message || error}`);
}

for (const marker of [
  'export function scheduleBeatGuideClicks',
  'clampBars',
  'clampGuideSegments',
  'sanitizeGuideMarkers',
  'effectiveStartInCycle',
  'guideNodes.push(osc, gain)',
]) requireText('beatGuideScheduler boundary', beatGuide, marker);

for (const retained of [
  'renderCarrierDonorV2CompositeToBuffer',
  'playRootFollowSynthPreview',
  'renderForge3BodyPreviewToBuffer',
  'previewColumn',
  'exportWAV',
  'encodeSamplesToWAV',
]) requireText('AudioEngine retained audio/render marker', engine, retained);

for (const extractedRenderMarker of [
  'renderAdditive',
  'renderGranular',
  'renderGlyph',
  'renderIFFT',
]) requireText('SpectralBufferRenderer extracted render marker', spectralRenderer, extractedRenderMarker);

requireText('AudioEngine delegates spectral rendering', engine, 'this.spectralBufferRenderer.renderToBuffer(');

const engineLines = engine.split(/\r?\n/).length;
if (engineLines > 2385) failures.push(`AudioEngine should stay below 2385 lines after buffer-math extraction; saw ${engineLines}`);

if (failures.length) {
  console.error('[spectralforge-audio-engine-utility-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  engineLines,
  extractedBoundaries: [files.waveforms, files.wav, files.beatGuide, files.bufferMath, files.spectralRenderer],
}, null, 2));
