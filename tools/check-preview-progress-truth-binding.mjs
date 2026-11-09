#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const truthPath = 'src/features/l3lab/spectralForge/components/previewSession/spectralForgeTransportPreviewTruth.ts';
const gatePath = 'src/features/l3lab/spectralForge/components/previewSession/spectralForgeTransportReadyGate.ts';
const transportPath = 'src/features/l3lab/spectralForge/components/TransportBar.tsx';
const presentationPath = 'src/features/l3lab/spectralForge/components/transportBar/TransportBarPresentation.tsx';
const truth = readFileSync(truthPath, 'utf8');
const gate = readFileSync(gatePath, 'utf8');
const transport = readFileSync(transportPath, 'utf8');
const presentation = readFileSync(presentationPath, 'utf8');

const fail = (message) => {
  console.error(`[xensonar][preview-progress-truth] ${message}`);
  process.exit(1);
};

for (const needle of [
  'export type SpectralForgeTransportPreviewTruthStatus',
  "| 'preparing'",
  "| 'prepared'",
  "| 'playing'",
  "| 'stale'",
  'resolveSpectralForgeTransportPreviewTruth',
  'const rawActive = input.rendering || input.prewarmRendering',
  'const renderFillActive = rawActive && (input.rendering || (!readyForImmediatePlay && !input.isPlaying))',
  'Math.max(4, Math.min(100, Math.round(rawProgress * 100)))',
]) {
  if (!truth.includes(needle)) fail(`truth resolver missing marker: ${needle}`);
}

for (const needle of [
  'resolveSpectralForgeTransportPreviewTruth(input)',
  'readyForImmediatePlay: truth.readyForImmediatePlay',
  'renderFillActive: truth.renderFillActive',
  'renderFillPercent: truth.renderFillPercent',
]) {
  if (!gate.includes(needle)) fail(`ReadyGate no longer delegates to preview truth resolver: ${needle}`);
}

for (const needle of [
  'const transportReadyGate = resolveSpectralForgeTransportReadyGate({',
  'const basisHearingBridgeFill = resolveBasisHearingBridgeFill({',
  'basisHearingTransportBridge.progress',
  'const renderFillActive = transportReadyGate.renderFillActive || basisHearingBridgeFill.fillActive',
  'rendering: workflowBusy',
  'renderProgress: workflowProgress',
  'playbackRenderProgressRef.current = 1',
  'const playNeedsRenderFeedback = false',
]) {
  if (!transport.includes(needle)) fail(`TransportBar missing progress-truth usage: ${needle}`);
}

for (const needle of [
  'aria-busy={props.renderFillActive || props.donorHearingPhase === "rendering"}',
  'data-xensonar-spectralforge-render-fill-percent={props.renderFillActive ? props.renderFillPercent : undefined}',
]) {
  if (!presentation.includes(needle)) fail(`TransportBarPresentation missing progress-truth presentation: ${needle}`);
}

if (/playNeedsRenderFeedback\s*=\s*true/.test(transport)) {
  fail('Play button render feedback must not be reintroduced as a play-triggered render animation');
}

console.log('[xensonar] preview progress truth binding green');
