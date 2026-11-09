import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDonorProjection, renderDonorProjection } from '../../src/features/l3lab/spectralForge/donorV2/donorProjection';
const sr = 24000;
const monoPlan = (hz: number, gainCurve = [0.65, 0.65]) => ({ rootReferenceHz: hz, bands: [{ centerRatioCurve: gainCurve.map(() => 1), gainCurve }] });
function signal(frequencies: number[], weights: number[], seconds = 0.65) {
  return Float32Array.from({ length: Math.round(sr * seconds) }, (_, i) => frequencies.reduce((sum, hz, j) => sum + weights[j] * Math.sin(2 * Math.PI * hz * i / sr), 0) * 0.18);
}
function amplitude(data: Float32Array, hz: number, from = 0.18, to = 0.58) {
  let re = 0, im = 0, count = 0;
  for (let i = Math.round(from * sr); i < Math.min(data.length, Math.round(to * sr)); i++) { re += data[i] * Math.cos(2 * Math.PI * hz * i / sr); im += data[i] * Math.sin(2 * Math.PI * hz * i / sr); count++; }
  return 2 * Math.hypot(re, im) / count;
}

test('inharmonic material retains measured modes instead of becoming white noise', async () => {
  const ratios = [1, Math.SQRT2, 2.756, 4.1];
  const model = await analyzeDonorProjection([signal(ratios.map(r => 300 * r), [1, 0.7, 0.5, 0.3])], sr);
  assert.ok((model.modalAmount ?? 0) > 0.8, JSON.stringify({ modal: model.modalAmount, noise: model.noiseAmount, pitch: model.referenceHz }));
  assert.ok(model.noiseAmount < 0.1);
  for (const ratio of ratios) assert.ok(model.modalPartials!.some(m => Math.abs(m.ratio / ratio - 1) < 0.005), `${ratio}`);
  const output = await renderDonorProjection(monoPlan(450), model, sr, 0.65);
  assert.ok(amplitude(output, 450 * Math.SQRT2) > 0.06);
  assert.ok(amplitude(output, 450 * 2.756) > 0.035);
  assert.ok(amplitude(output, 300) < amplitude(output, 450) * 0.02, 'original donor note must not be mixed in');
});

test('one-semitone band limit preserves high useful partials without folded aliases', async () => {
  const model = await analyzeDonorProjection([signal([200, 800, 1400], [1, 0.3, 0.65])], sr);
  const output = await renderDonorProjection(monoPlan(1200), model, sr, 0.65);
  assert.ok(amplitude(output, 8400) > amplitude(output, 1200) * 0.2, 'seventh partial is audible below Nyquist');
  assert.ok(amplitude(output, 7200) < amplitude(output, 1200) * 0.005, 'no spurious sixth harmonic');
});

test('harmonic envelope estimates do not mistake inter-partial gaps for fixed formants', async () => {
  const model = await analyzeDonorProjection([signal([250, 750, 1250], [1, 0.8, 0.5])], sr);
  const output = await renderDonorProjection(monoPlan(400), model, sr, 0.65);
  const ratio = amplitude(output, 1200) / amplitude(output, 400);
  assert.ok(ratio > 0.55 && ratio < 1.1, `input H3/H1 = 0.8; projection = ${ratio}`);
  assert.ok(amplitude(output, 800) < amplitude(output, 400) * 0.01);
});

test('noise donors do not acquire invented sparse modal pitches', async () => {
  let seed = 773;
  const noise = Float32Array.from({ length: sr }, () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 2147483648 - 1; });
  const model = await analyzeDonorProjection([noise], sr);
  assert.ok(model.noiseAmount > 0.97);
  assert.equal(model.modalPartials?.length, 0);
});

test('modal render respects carrier silence, multiple independent notes, finite deterministic output', async () => {
  const model = await analyzeDonorProjection([signal([300, 424.264, 826.8], [1, 0.7, 0.5])], sr);
  const gains = Array.from({ length: 101 }, (_, i) => i >= 35 && i <= 65 ? 0 : 0.32);
  const plan = monoPlan(440, gains);
  plan.bands.push({ centerRatioCurve: gains.map(() => 1.5), gainCurve: gains });
  const a = await renderDonorProjection(plan, model, sr, 0.65);
  const b = await renderDonorProjection(plan, model, sr, 0.65);
  assert.deepEqual(a, b);
  assert.ok(a.slice(Math.round(sr * 0.25), Math.round(sr * 0.4)).every(v => v === 0));
  assert.ok(a.every(v => Number.isFinite(v) && Math.abs(v) <= 0.900001));
  assert.ok(amplitude(a, 440, 0.05, 0.2) > 0.04);
  assert.ok(amplitude(a, 660, 0.05, 0.2) > 0.04);
});

test('analysis excludes long near-silent tails from the representative timbre', async () => {
  const voiced = signal([220, 660], [1, 0.7], 0.3);
  const padded = new Float32Array(sr * 3); padded.set(voiced);
  for (let i = voiced.length; i < padded.length; i++) padded[i] = 1e-7 * Math.sin(i * 1.312);
  const model = await analyzeDonorProjection([padded], sr);
  assert.ok(model.partials[2] > 0.45);
  assert.ok(model.noiseAmount < 0.03);
});

test('64-partial analysis preserves bright low-note material beyond the old 32-partial ceiling', async () => {
  const model = await analyzeDonorProjection([signal([120, 360, 4680], [1, 0.2, 0.6])], sr);
  assert.equal(model.partials.length, 64);
  assert.ok(model.partials[38] > 0.4);
  const out = await renderDonorProjection(monoPlan(140), model, sr, 0.65);
  assert.ok(amplitude(out, 5460) > 0.025);
});


test('glissandi entering the audible range from above Nyquist have complete tables', async () => {
  const model = await analyzeDonorProjection([signal([300], [1])], sr);
  const output = await renderDonorProjection({ rootReferenceHz: 1, bands: [{ centerRatioCurve: [16000, 9000], gainCurve: [0.3, 0.3] }] }, model, sr, 0.1);
  assert.ok(output.every(Number.isFinite));
  assert.ok(output.slice(0, 100).every(v => v === 0));
  assert.ok(output.some(v => Math.abs(v) > 0.01));
});
