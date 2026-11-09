#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const audioPath = 'src/features/l3lab/spectralForge/audio/AudioEngine.ts';
const cooperationPath = 'src/features/l3lab/spectralForge/audio/audioRenderCooperation.ts';
const modelPath = 'src/features/l3lab/spectralForge/components/harmonizerPanel/directRendererReferenceModel.ts';
const panelPath = 'src/features/l3lab/spectralForge/components/harmonizerPanel/DirectRendererReferencePanel.tsx';
const hostPanelPath = 'src/features/l3lab/spectralForge/components/HarmonizerPanel.tsx';

const audio = readFileSync(audioPath, 'utf8');
const cooperation = readFileSync(cooperationPath, 'utf8');
const model = readFileSync(modelPath, 'utf8');
const panel = readFileSync(panelPath, 'utf8');
const hostPanel = readFileSync(hostPanelPath, 'utf8');

const fail = (message) => {
  console.error(`[xensonar][audio-render-direct-reference-cadence] ${message}`);
  process.exit(1);
};

for (const needle of [
  'Direct-Renderer reference cadence',
  'changing these values trades total render overhead against browser',
  'must not silently change synthesis formulas',
  'random-grain modes',
  'export const AUDIO_RENDER_ADDITIVE_BIN_BATCH_SIZE = 16',
  'export const AUDIO_RENDER_GRANULAR_COLUMN_BATCH_SIZE = 32',
  'export const AUDIO_RENDER_GLYPH_COLUMN_BATCH_SIZE = 24',
  'export const AUDIO_RENDER_IFFT_YIELD_COLUMN_INTERVAL = 64',
  'export const AUDIO_RENDER_NORMALIZATION_BATCH_SIZE = 32768',
  'const schedulerApi = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler',
  'export function createAudioRenderProgressReporter',
  'export function yieldAudioRenderControl',
]) {
  if (!cooperation.includes(needle)) fail(`missing render cooperation marker: ${needle}`);
}

for (const needle of [
  "import {",
  "from './audioRenderCooperation'",
  'const batchSize = AUDIO_RENDER_ADDITIVE_BIN_BATCH_SIZE',
  'const colBatch = AUDIO_RENDER_GRANULAR_COLUMN_BATCH_SIZE',
  'const colBatch = AUDIO_RENDER_GLYPH_COLUMN_BATCH_SIZE',
  'x % AUDIO_RENDER_IFFT_YIELD_COLUMN_INTERVAL === 0',
  'coarse progress/yield points make the end phase observable',
]) {
  if (!audio.includes(needle)) fail(`AudioEngine no longer consumes reference-cadence boundary: ${needle}`);
}

for (const forbidden of [
  'const AUDIO_RENDER_ADDITIVE_BIN_BATCH_SIZE = 8',
  'const AUDIO_RENDER_GRANULAR_COLUMN_BATCH_SIZE = 16',
  'const AUDIO_RENDER_GLYPH_COLUMN_BATCH_SIZE = 12',
  'const AUDIO_RENDER_IFFT_YIELD_COLUMN_INTERVAL = 16',
  'const AUDIO_RENDER_NORMALIZATION_BATCH_SIZE = 4096',
  'function createAudioRenderProgressReporter(',
  'function yieldAudioRenderControl()',
]) {
  if (audio.includes(forbidden)) fail(`AudioEngine still owns old/micro-yield cadence helper: ${forbidden}`);
}

for (const needle of [
  'DIRECT_RENDERER_REFERENCE_NOTE',
  'Direkt-Renderer als schnelle Referenzspur',
  'ohne Hörweisen-Orchestrierung',
  'nicht die gleiche Play-Lesung wie die Hörweisen oben',
  "{ id: 'additive', label: 'Additiv', desc: 'Sinus direkt' }",
  "{ id: 'granular', label: 'Granular', desc: 'Körnung direkt' }",
  'resolveDirectRendererReferenceButtonClass',
]) {
  if (!model.includes(needle)) fail(`Direct Renderer model missing marker: ${needle}`);
}

for (const needle of [
  'export function DirectRendererReferencePanel',
  'data-spectral-forge-legacy-renderer-surface="true"',
  'data-spectral-forge-direct-renderer-reference-surface="true"',
  '⚙️ Direkt-Renderer (Referenz)',
  'DIRECT_RENDERER_REFERENCE_MODES.map',
  'selectDirectRendererMode',
]) {
  if (!panel.includes(needle)) fail(`Direct Renderer panel missing marker: ${needle}`);
}

if (!hostPanel.includes('<DirectRendererReferencePanel')) fail('HarmonizerPanel must delegate the Direct Renderer block to DirectRendererReferencePanel.');
if (hostPanel.includes('legacySynthModes')) fail('HarmonizerPanel should no longer own Direct Renderer mode data.');
if (hostPanel.includes('Direkt-Renderer als schnelle Referenzspur')) fail('HarmonizerPanel should not own the Direct Renderer explanatory copy.');

console.log('[xensonar] audio render direct reference cadence green');
