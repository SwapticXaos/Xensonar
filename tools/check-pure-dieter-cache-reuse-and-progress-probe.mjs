#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const cachePath = 'src/features/l3lab/spectralForge/integral/carrierIntegralRenderedPreviewCache.ts';
const routesPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts';
const audioPath = 'src/features/l3lab/spectralForge/audio/AudioEngine.ts';
const cooperationPath = 'src/features/l3lab/spectralForge/audio/audioRenderCooperation.ts';

const cache = readFileSync(cachePath, 'utf8');
const routes = readFileSync(routesPath, 'utf8');
const audio = readFileSync(audioPath, 'utf8');
const cooperation = readFileSync(cooperationPath, 'utf8');

const fail = (message) => {
  console.error(`[xensonar][pure-dieter-cache-progress-probe] ${message}`);
  process.exit(1);
};

for (const needle of [
  'export type CarrierIntegralRenderedPreviewCacheProbeRecord',
  'renderedPreviewBufferProbeRecords',
  'getOrCreateCarrierIntegralRenderedPreviewProbeRecord',
  'probe.cacheHits += 1',
  'probe.inflightHits += 1',
  'probe.rendersStarted += 1',
  'probe.rendersCompleted += 1',
  'probe.renderErrors += 1',
  'getCarrierIntegralRenderedPreviewBufferProbeRecord',
  'getCarrierIntegralRenderedPreviewBufferProbeRecords',
  'clearCarrierIntegralRenderedPreviewCacheProbeRecords',
]) {
  if (!cache.includes(needle)) fail(`cache probe contract missing marker: ${needle}`);
}

for (const needle of [
  'paramsHash: "pure-dieter-raw-render"',
  'Pitch/loop are',
  'deliberately do not enter this buffer key',
  'audioEngine.renderToBuffer(',
  'request.onRenderProgress',
  'lifecycleMode: rawPreview.cacheHit',
  'pure-dieter-cached-rendered-preview',
  'loopPreview: context.loopPreview',
  'cacheHit: rawPreview.cacheHit',
]) {
  if (!routes.includes(needle)) fail(`Pure-Dieter route missing cache/progress marker: ${needle}`);
}

for (const needle of [
  'type AudioRenderProgressReporter',
  'createAudioRenderProgressReporter',
  'mapPhase: (start: number, end: number)',
  'export function yieldAudioRenderControl',
]) {
  if (!cooperation.includes(needle)) fail(`render cooperation boundary missing progress-granularity marker: ${needle}`);
}

for (const needle of [
  "from './audioRenderCooperation'",
  'const synthesisProgress = progress.mapPhase(0.02, 0.9)',
  'progress.emit(0.9, { force: true })',
  'const normalizationBatchSize = AUDIO_RENDER_NORMALIZATION_BATCH_SIZE',
  'progress.emit(0.945',
  'progress.emit(1, { force: true })',
  'yieldAudioRenderControl()',
]) {
  if (!audio.includes(needle)) fail(`AudioEngine missing progress-granularity marker: ${needle}`);
}

if (/renderToBuffer\([\s\S]*onProgress\)[\s\S]*\/\/ Normalize[\s\S]*for \(let i = 0; i < totalSamples; i\+\+\)[\s\S]*if \(maxAmp > 0\)[\s\S]*for \(let i = 0; i < totalSamples; i\+\+\)[\s\S]*this\.renderedBuffer/.test(audio) && !audio.includes('progress.emit(0.945')) {
  fail('normalization end phase appears progressless');
}

console.log('[xensonar] pure-dieter cache reuse + progress probe green');
