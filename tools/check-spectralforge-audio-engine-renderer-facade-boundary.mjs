#!/usr/bin/env node
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const enginePath = 'src/features/l3lab/spectralForge/audio/AudioEngine.ts';
const carrierPath = 'src/features/l3lab/spectralForge/audio/CarrierDonorBodyRenderer.ts';
const spectralPath = 'src/features/l3lab/spectralForge/audio/SpectralBufferRenderer.ts';
const forge3Path = 'src/features/l3lab/spectralForge/audio/Forge3BodyRenderer.ts';
const failures = [];
for (const p of [enginePath, carrierPath, spectralPath, forge3Path]) {
  if (!fs.existsSync(p)) failures.push(`missing ${p}`);
}
if (!failures.length) {
  const engine = read(enginePath);
  const carrier = read(carrierPath);
  const spectral = read(spectralPath);
  const forge3 = read(forge3Path);
  const engineLines = engine.split(/\r?\n/).length - 1;
  if (engineLines > 1050) failures.push(`AudioEngine facade too large: ${engineLines} lines`);
  for (const marker of ['CarrierDonorBodyRenderer', 'SpectralBufferRenderer', 'Forge3BodyRenderer']) {
    if (!engine.includes(marker)) failures.push(`AudioEngine missing renderer delegate ${marker}`);
  }
  for (const marker of ['private ctx: AudioContext | null', 'private currentSource:', 'private renderedBuffer:', 'private async playBufferInternal(', 'async playRootFollowSynthPreview(', 'stop(): void']) {
    if (!engine.includes(marker)) failures.push(`AudioEngine lost session ownership marker: ${marker}`);
  }
  for (const marker of ['renderCarrierDonorV2CompositeToBuffer(', 'playCarrierDonorV2Preview(', 'renderForge3BodyPreviewToBuffer(', 'renderForge3BodyDrivenPreviewToBuffer(', 'renderToBuffer(']) {
    if (!engine.includes(marker)) failures.push(`AudioEngine facade lost public surface: ${marker}`);
  }
  for (const [label, source] of [['carrier',carrier],['spectral',spectral],['forge3',forge3]]) {
    for (const forbidden of ['new AudioContext(', 'playBufferInternal(', 'currentSource', 'rootFollowPreviewCleanup']) {
      if (source.includes(forbidden)) failures.push(`${label} renderer illegally owns playback/session marker: ${forbidden}`);
    }
  }
  if (!carrier.includes('renderCarrierDonorV2PreviewToBuffer(') || !carrier.includes('renderDonorProofToBuffer(')) failures.push('carrier renderer missing expected buffer family');
  if (!spectral.includes('renderAdditive(') || !spectral.includes('renderGranular(') || !spectral.includes('renderIFFT(')) failures.push('spectral renderer missing expected synthesis family');
  if (!forge3.includes('renderForge3BodyPreviewToBuffer(') || !forge3.includes('renderForge3BodyDrivenPreviewToBuffer(')) failures.push('Forge3 renderer missing expected body family');
}
if (failures.length) {
  console.error('[spectralforge-audio-engine-renderer-facade-boundary] FAILED');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log('[spectralforge-audio-engine-renderer-facade-boundary] PASS');
