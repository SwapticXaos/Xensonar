import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDonorProjection, renderDonorProjection } from '../../src/features/l3lab/spectralForge/donorV2/donorProjection';
import type { DonatelloFormantRenderPlan } from '../../src/features/l3lab/spectralForge/integral/donatelloFormantTypes';

const sr = 16000;
function donor(harmonics: number[], hz = 250) {
  return Float32Array.from({ length: sr }, (_, i) => harmonics.reduce((v, a, h) => v + a * Math.sin(2 * Math.PI * hz * (h + 1) * i / sr), 0) * 0.3);
}
function plan(hz = 400, gap = false): DonatelloFormantRenderPlan {
  const gain = Array.from({ length: 65 }, (_, i) => gap && i >= 24 && i <= 40 ? 0 : 0.7);
  return { rootReferenceHz: 100, bands: [{ centerRatioCurve: new Array(65).fill(hz / 100), gainCurve: gain }] } as DonatelloFormantRenderPlan;
}
function amplitude(data: Float32Array, hz: number, start = 0.15, end = 0.85) {
  let re = 0, im = 0, n = 0;
  for (let i = Math.floor(start * sr); i < Math.floor(end * sr); i++) {
    re += data[i] * Math.cos(2 * Math.PI * hz * i / sr);
    im += data[i] * Math.sin(2 * Math.PI * hz * i / sr); n++;
  }
  return Math.hypot(re, im) / n;
}

test('actual PCM: sine and odd-harmonic donors keep their different partial envelopes', async () => {
  const pure = await analyzeDonorProjection([donor([1])], sr);
  const odd = await analyzeDonorProjection([donor([1, 0, 0.8, 0, 0.5])], sr);
  assert.ok(pure.partials[0] > 0.99);
  assert.ok(pure.noiseAmount < 0.01);
  assert.ok(odd.partials[2] / odd.partials[0] > 0.7);
  const a = await renderDonorProjection(plan(), pure, sr, 1);
  const b = await renderDonorProjection(plan(), odd, sr, 1);
  assert.ok(amplitude(a, 1200) / amplitude(a, 400) < 0.01);
  assert.ok(amplitude(b, 1200) / amplitude(b, 400) > 0.7);
  assert.ok(amplitude(b, 250) / amplitude(b, 400) < 0.01, 'donor pitch must not survive');
  if (process.env.XENSONAR_AUDIO_FIXTURES_DIRECTORY) {
    const directory = process.env.XENSONAR_AUDIO_FIXTURES_DIRECTORY;
    fs.mkdirSync(directory, { recursive: true });
    for (const [name, samples] of [['01_sinus_donor', a], ['02_odd_donor', b]] as const) {
      const wav = Buffer.alloc(44 + samples.length * 2);
      wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
      wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
      wav.writeUInt32LE(sr, 24); wav.writeUInt32LE(sr * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
      wav.write('data', 36); wav.writeUInt32LE(samples.length * 2, 40);
      samples.forEach((v, i) => wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
      fs.writeFileSync(path.join(directory, name + '.wav'), wav);
    }
  }
  console.log('PCM partial ratios:', { sineH3: amplitude(a, 1200) / amplitude(a, 400), oddH3: amplitude(b, 1200) / amplitude(b, 400) });
});
test('donor pitch transposition leaves normalized material approximately invariant', async () => {
  const a = await analyzeDonorProjection([donor([1, 0.5, 0.3], 250)], sr);
  const b = await analyzeDonorProjection([donor([1, 0.5, 0.3], 500)], sr);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(a.partials[i] - b.partials[i]) < 0.02);
});
test('opposite stereo phase does not destroy donor analysis', async () => {
  const left = donor([1, 0.5]);
  const model = await analyzeDonorProjection([left, left.map(v => -v)], sr);
  assert.ok(model.partials[0] > 0.8);
  assert.ok(model.partials[1] > 0.4);
});
test('noise stays aperiodic; silence is rejected rather than replaced by a preset', async () => {
  let seed = 123;
  const noise = Float32Array.from({ length: sr }, () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 2147483648 - 1; });
  const model = await analyzeDonorProjection([noise], sr);
  assert.ok(model.noiseAmount > 0.9);
  await assert.rejects(analyzeDonorProjection([new Float32Array(sr)], sr), /kein auswertbares/);
});
test('carrier pauses are exact zero, two contours retain two pitches, output is bounded and deterministic', async () => {
  const model = await analyzeDonorProjection([donor([1, 0.5])], sr);
  const carrier = plan(400, true);
  carrier.bands.push(plan(650, true).bands[0]);
  const a = await renderDonorProjection(carrier, model, sr, 1);
  const b = await renderDonorProjection(carrier, model, sr, 1);
  assert.deepEqual(a, b);
  assert.ok(a.every(v => Number.isFinite(v) && Math.abs(v) <= 0.900001));
  assert.ok(a.slice(sr * 0.4, sr * 0.6).every(v => v === 0));
  assert.ok(amplitude(a, 400, 0.1, 0.3) > 0.03);
  assert.ok(amplitude(a, 650, 0.1, 0.3) > 0.03);
});
test('partial limiting avoids folded high harmonics', async () => {
  const model = await analyzeDonorProjection([donor([1, 0.8, 0.8, 0.8])], sr);
  const data = await renderDonorProjection(plan(3000), model, sr, 1);
  assert.ok(amplitude(data, 3000) > 0.03);
  assert.ok(amplitude(data, 7000) < amplitude(data, 3000) * 0.01);
});

import { buildProjectionCarrierPlan } from '../../src/features/l3lab/spectralForge/donorV2/projectionCarrierPlan';
import type { CarrierSpectralSkeleton, CarrierAnchor } from '../../src/features/l3lab/spectralForge/types/carrierDonorV2Types';
function skeleton(columns: number[][]): CarrierSpectralSkeleton {
  return { width: columns.length, height: 256, durationSec: 1, anchorsByTime: columns.map((hzs, x) => hzs.map((hz, j) => ({ id: `${x}:${j}`, timeIndex: x, centerHz: hz, energy: 0.7 } as CarrierAnchor))) };
}
test('actual carrier planning: separated events reuse lanes and a one-column pause stays empty', () => {
  const p = buildProjectionCarrierPlan(skeleton(Array.from({ length: 60 }, (_, i) => i % 3 ? [] : [400 + i])));
  assert.equal(p.bands.length, 1);
  assert.equal(p.bands[0].gainCurve.filter(g => g > 0).length, 20);
  assert.equal(p.bands[0].gainCurve[1], 0);
  assert.ok(p.bands[0].gainCurve[57] > 0);
});
test('actual carrier planning: opposing glissandi retain directions through crossing', () => {
  const p = buildProjectionCarrierPlan(skeleton(Array.from({ length: 65 }, (_, x) => [300 * 2 ** (x / 64), 610 / 2 ** (x / 64)])));
  assert.equal(p.bands.length, 2);
  const a = p.bands[0].centerRatioCurve, b = p.bands[1].centerRatioCurve;
  assert.ok(a.every((v, i) => !i || v >= a[i - 1]));
  assert.ok(b.every((v, i) => !i || v <= b[i - 1]));
});
test('selection analysis excludes audio outside the donor region', async () => {
  const joined = new Float32Array(sr * 2);
  joined.set(donor([1])); joined.set(donor([1, 0, 0.8]), sr);
  const a = await analyzeDonorProjection([joined], sr, 0, sr);
  const b = await analyzeDonorProjection([joined], sr, sr, sr);
  assert.ok(a.partials[2] < 0.01);
  assert.ok(b.partials[2] > 0.5);
});

test('spectral resonance model changes partial gains without creating a separate formant note', async () => {
  const source = await analyzeDonorProjection([donor([1, 0.4, 0.7, 0.2, 0.1])], sr);
  const lowResonance = { ...source, spectralEnvelope: source.spectralEnvelope.map((_, i) => {
    const hz = 40 * Math.pow(source.envelopeMaxHz / 40, (i + 0.5) / 24);
    return 0.1 + Math.exp(-0.5 * ((Math.log(hz / 800)) / 0.25) ** 2);
  }) };
  const highResonance = { ...source, spectralEnvelope: source.spectralEnvelope.map((_, i) => {
    const hz = 40 * Math.pow(source.envelopeMaxHz / 40, (i + 0.5) / 24);
    return 0.1 + Math.exp(-0.5 * ((Math.log(hz / 1600)) / 0.25) ** 2);
  }) };
  const a = await renderDonorProjection(plan(400), lowResonance, sr, 1);
  const b = await renderDonorProjection(plan(400), highResonance, sr, 1);
  const ratioA = amplitude(a, 1600) / amplitude(a, 800), ratioB = amplitude(b, 1600) / amplitude(b, 800);
  assert.ok(ratioB > ratioA * 1.5);
  assert.ok(amplitude(b, 250) < amplitude(b, 400) * 0.01);
});
test('audio-derived residual bands distinguish dark and bright noise', async () => {
  let seed = 93, low = 0;
  const dark = new Float32Array(sr), bright = new Float32Array(sr);
  for (let i = 0; i < sr; i++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const white = (seed >>> 0) / 2147483648 - 1;
    low += 0.06 * (white - low); dark[i] = low; bright[i] = white - low;
  }
  const a = await analyzeDonorProjection([dark], sr), b = await analyzeDonorProjection([bright], sr);
  const outputA = await renderDonorProjection(plan(), a, sr, 1), outputB = await renderDonorProjection(plan(), b, sr, 1);
  const roughness = (data: Float32Array) => {
    let p = 0, d = 0;
    for (let i = 1; i < data.length; i++) { p += data[i] ** 2; d += (data[i] - data[i - 1]) ** 2; }
    return d / p;
  };
  assert.ok(roughness(outputB) > roughness(outputA) * 2);
});
