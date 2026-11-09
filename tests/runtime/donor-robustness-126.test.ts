import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateDonorFundamental } from '../../src/features/l3lab/spectralForge/donorV2/donorPitch';
import { analyzeDonorProjection, renderDonorProjection } from '../../src/features/l3lab/spectralForge/donorV2/donorProjection';
import { sameDonorSelection } from '../../src/features/l3lab/spectralForge/donorV2/donorReadiness';
import type { AudioSourceAsset } from '../../src/features/l3lab/spectralForge/audio/AudioImporterTypes';
const sr = 48000;
function pcm(weights: number[], f0: number, length = 4096) {
  return Float32Array.from({ length }, (_, i) => weights.reduce((s, w, h) => s + w * Math.sin(2 * Math.PI * f0 * (h + 1) * i / sr), 0) * 0.2);
}
test('periodicity recovers weak and missing fundamentals at real browser sample rate', () => {
  for (const weights of [[0.08, 1, 0.6], [0, 1, 0.6], [1, 0.3, 0.2]]) {
    for (const f0 of [82.4, 220, 440]) {
      const pitch = estimateDonorFundamental(pcm(weights, f0), sr);
      assert.ok(Math.abs(pitch.hz - f0) / f0 < 0.008, `${f0}: ${pitch.hz}`);
    }
  }
});
test('missing fundamental is represented as missing, not injected as a new sine', async () => {
  const model = await analyzeDonorProjection([pcm([0, 1, 0.6], 220)], sr);
  assert.ok(Math.abs(model.referenceHz - 220) < 2);
  assert.ok(model.partials[0] < 0.04);
  assert.ok(model.partials[1] > 0.7);
  assert.ok(model.partials[2] > 0.4);
});
test('ready gate requires the extracted PCM and exact selection, not same filename', () => {
  const left = new Float32Array(500), right = new Float32Array(500);
  const a = { leftSamples: left, rightSamples: right, monoSamples: left, sampleRate: sr, importStartSec: 0, importDurationSec: 1 } as AudioSourceAsset;
  assert.equal(sameDonorSelection(null, a), false);
  assert.equal(sameDonorSelection(a, { ...a }), true);
  assert.equal(sameDonorSelection(a, { ...a, importStartSec: 0.5 }), false);
  assert.equal(sameDonorSelection(a, { ...a, leftSamples: left.slice() }), false);
});
test('cooperative rendering rejects cancelled jobs before returning playable PCM', async () => {
  const model = await analyzeDonorProjection([pcm([1, 0.4], 220)], sr);
  const plan = { rootReferenceHz: 220, bands: [{ centerRatioCurve: [1, 2], gainCurve: [0.7, 0.7] }] };
  let checks = 0;
  await assert.rejects(renderDonorProjection(plan, model, sr, 1, () => ++checks > 3), { name: 'AbortError' });
  assert.ok(checks >= 4);
});
test('attack spectral color reappears at each carrier onset without filling a pause', async () => {
  const model = await analyzeDonorProjection([pcm([1, 0.7], 220)], sr);
  model.attackPartials = new Array(32).fill(0); model.attackPartials[2] = 1;
  const plan = { rootReferenceHz: 440, bands: [{ centerRatioCurve: new Array(101).fill(1), gainCurve: Array.from({length:101}, (_, i) => i >= 40 && i <= 60 ? 0 : 0.7) }] };
  const data = await renderDonorProjection(plan, model, sr, 1);
  assert.ok(data.slice(sr * 0.42, sr * 0.58).every(v => v === 0));
  assert.ok(data.every(Number.isFinite));
  const measure = (start: number, length: number, hz: number) => {
    let a = 0, b = 0;
    for(let i=Math.round(start*sr);i<Math.round((start+length)*sr);i++) {a+=data[i]*Math.cos(2*Math.PI*hz*i/sr);b+=data[i]*Math.sin(2*Math.PI*hz*i/sr);}
    return Math.hypot(a,b);
  };
  assert.ok(measure(0.008,0.015,1320) > measure(0.2,0.015,1320) * 2);
  assert.ok(measure(0.612,0.015,1320) > measure(0.8,0.015,1320) * 2);
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DonorHearingButton } from '../../src/features/l3lab/spectralForge/components/harmonizerPanel/DonorHearingButton';
test('rendered Donor control is locked before extraction and exposes cancel/stop/error states', () => {
  const render = (ready: boolean, phase: 'idle' | 'rendering' | 'playing' | 'error', error?: string) => renderToStaticMarkup(createElement(DonorHearingButton, { ready, phase, error, onPreview() {} }));
  assert.match(render(false, 'idle'), /disabled=""/);
  assert.match(render(false, 'idle'), /Zuerst Timbre extrahieren/);
  assert.doesNotMatch(render(true, 'idle'), /disabled=""/);
  assert.match(render(true, 'rendering'), /Abbrechen/);
  assert.match(render(true, 'playing'), /aria-pressed="true"/);
  assert.match(render(true, 'error', 'Probe fehlgeschlagen'), /role="alert"/);
});

import { buildProjectionCarrierPlan } from '../../src/features/l3lab/spectralForge/donorV2/projectionCarrierPlan';
import type { CarrierSpectralSkeleton } from '../../src/features/l3lab/spectralForge/types/carrierDonorV2Types';
test('global carrier headroom preserves dynamics when voices enter', () => {
  const p = buildProjectionCarrierPlan({ width: 3, anchorsByTime: [
    [{centerHz: 220, energy: 1}],
    [{centerHz: 220, energy: 1}, {centerHz: 440, energy: 1}],
    [{centerHz: 220, energy: 0.25}],
  ] } as CarrierSpectralSkeleton);
  assert.equal(p.bands[0].gainCurve[0], p.bands[0].gainCurve[1]);
  assert.equal(p.bands[0].gainCurve[2] / p.bands[0].gainCurve[0], 0.5);
});
