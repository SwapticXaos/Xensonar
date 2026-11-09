#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const transportPath = 'src/features/l3lab/spectralForge/components/TransportBar.tsx';
const routesPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts';
const playbackGatePath = 'src/features/l3lab/spectralForge/components/previewSession/spectralForgeTransportPlaybackGate.ts';
const requestKeyPath = 'src/features/l3lab/spectralForge/components/previewSession/spectralForgePreviewRequestKey.ts';
const audioPath = 'src/features/l3lab/spectralForge/audio/AudioEngine.ts';
const transport = readFileSync(transportPath, 'utf8');
const derivation = readFileSync('src/features/l3lab/spectralForge/components/previewSession/spectralForgeTransportPreviewDerivation.ts', 'utf8');
const presentation = readFileSync('src/features/l3lab/spectralForge/components/transportBar/TransportBarPresentation.tsx', 'utf8');
const routes = readFileSync(routesPath, 'utf8');
const playbackGate = readFileSync(playbackGatePath, 'utf8');
const requestKey = readFileSync(requestKeyPath, 'utf8');
const audio = readFileSync(audioPath, 'utf8');

const fail = (message) => {
  console.error(`[xensonar][loop-preview-wiring] ${message}`);
  process.exit(1);
};

for (const needle of [
  'loopPreview: previewLoopEnabled',
  'playSpectralForgeBasisHearingPreview({',
  'audioEngine.play(',
  'previewSessionDriver.markPlayEnded(playSessionRequest)',
  'currentTransportPlaybackRequestRef.current',
]) {
  if (!transport.includes(needle)) fail(`TransportBar missing loop/playback contract marker: ${needle}`);
}

for (const needle of [
  'const previewLoopEnabled = Boolean(input.materialExport.loopPreview);',
  'previewRouteSupportsLoopPlayback(previewRenderRouteKind)',
]) {
  if (!derivation.includes(needle)) fail(`preview derivation missing loop contract marker: ${needle}`);
}

for (const needle of [
  'disabled={props.previewLoopToggleDisabled}',
  'props.updateMaterialExport({ loopPreview: event.currentTarget.checked })',
]) {
  if (!presentation.includes(needle)) fail(`TransportBarPresentation missing loop UI marker: ${needle}`);
}

const loopAssignments = (transport.match(/loopPreview: previewLoopEnabled/g) ?? []).length;
if (loopAssignments < 6) fail(`expected loopPreview to be threaded through multiple transport requests, found ${loopAssignments}`);

const routeLoopUses = (routes.match(/loopPreview: context\.loopPreview/g) ?? []).length;
if (routeLoopUses < 4) fail(`carrier-integral audition routes do not consistently pass context.loopPreview across the four active playback call sites, found ${routeLoopUses}`);

for (const needle of [
  'const previewIsPrepared = isTransportPreviewPrepared',
  'const canStartPlayback = !routeCanShowRenderFeedback || previewIsPrepared',
  'Vorhören wird vorbereitet · Play startet nicht als Renderauslöser',
]) {
  if (!playbackGate.includes(needle)) fail(`playback gate missing non-rendering play contract: ${needle}`);
}

for (const needle of [
  'loopPreview is intentionally omitted here',
  'playback transport flag',
]) {
  if (!requestKey.includes(needle)) fail(`request key must explicitly document playback-only loop state: ${needle}`);
}

for (const needle of [
  'source.loop = loopPreview',
  'loop: loopPreview',
  'if (!loopPreview && pos >= 1)',
]) {
  if (!audio.includes(needle)) fail(`AudioEngine missing loop-preview playback behavior: ${needle}`);
}

console.log('[xensonar] loop-preview wiring + playback truth green');
