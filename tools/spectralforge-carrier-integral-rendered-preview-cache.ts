import {
  buildCarrierIntegralRenderedPreviewCacheKey,
  buildCarrierIntegralSnapshotSpectralSignature,
  clearCarrierIntegralRenderedPreviewCache,
  getCarrierIntegralRenderedPreviewCacheSize,
} from '../src/features/l3lab/spectralForge/integral/carrierIntegralRenderedPreviewCache';
import type { ForgeProjectSnapshot } from '../src/features/l3lab/spectralForge/state/store';

const spectralSnapshot = new Float32Array(16);
for (let index = 0; index < spectralSnapshot.length; index += 1) spectralSnapshot[index] = index / 16;

const snapshot: ForgeProjectSnapshot = {
  name: 'rendered-preview-cache-tool',
  spectralSnapshot,
  synthMode: 'additive',
  waveformMix: { sine: 1, saw: 0, square: 0, triangle: 0 },
  materialExport: {
    bars: 4,
    bpm: 120,
    loopPreview: false,
    gain: 1,
    normalize: false,
    pitchSemitones: 0,
  },
} as ForgeProjectSnapshot;

const signature = buildCarrierIntegralSnapshotSpectralSignature(snapshot);
const keyA = buildCarrierIntegralRenderedPreviewCacheKey({
  machineId: 'branch-c-interval-body',
  snapshot,
  durationSec: 4,
  previewBpm: 120,
  previewPitchSemitones: 0,
  synthLab: { presetId: 'test-preset', paramsPatch: { a: 1 } },
  paramsHash: 'params-a',
});
const keyB = buildCarrierIntegralRenderedPreviewCacheKey({
  machineId: 'branch-c-interval-body',
  snapshot,
  durationSec: 4,
  previewBpm: 120,
  previewPitchSemitones: 1,
  synthLab: { presetId: 'test-preset', paramsPatch: { a: 1 } },
  paramsHash: 'params-a',
});

if (!signature.includes(':')) throw new Error(`Unexpected signature: ${signature}`);
if (keyA === keyB) throw new Error('Preview cache key must distinguish pitch semitone changes.');
if (!keyA.includes('branch-c-interval-body')) throw new Error(`Preview cache key must include machine identity: ${keyA}`);

clearCarrierIntegralRenderedPreviewCache();
if (getCarrierIntegralRenderedPreviewCacheSize() !== 0) throw new Error('Rendered preview cache did not clear.');

console.log(JSON.stringify({
  ok: true,
  signature,
  keyA,
  keyB,
}, null, 2));
