import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDonorBodyV3 } from '../../src/features/l3lab/spectralForge/donorV3/donorBodyModel';
import { renderDonorBodyV3, renderDonorBodyV3Reference } from '../../src/features/l3lab/spectralForge/donorV3/renderDonorBodyV3';

const sampleRate = 24000;

function syntheticVowel(f0 = 200, seconds = 0.85) {
  const length = Math.round(sampleRate * seconds);
  return Float32Array.from({ length }, (_, i) => {
    const time = i / sampleRate;
    const edge = Math.min(1, time / 0.025, (seconds - time) / 0.025);
    let sample = 0;
    for (let harmonic = 1; harmonic <= 60 && harmonic * f0 < sampleRate * 0.46; harmonic++) {
      const hz = harmonic * f0;
      const envelope = 0.025
        + Math.exp(-0.5 * ((hz - 800) / 240) ** 2)
        + 0.48 * Math.exp(-0.5 * ((hz - 2200) / 400) ** 2);
      sample += envelope / (1 + 0.07 * harmonic) * Math.sin(2 * Math.PI * hz * time + 0.17 * harmonic);
    }
    return sample * 0.11 * edge;
  });
}

function envelopeAt(model: Awaited<ReturnType<typeof analyzeDonorBodyV3>>, hz: number) {
  const frame = model.frames[Math.floor(model.frames.length / 2)];
  const position = Math.log(hz / model.formantMinHz) / Math.log(model.formantMaxHz / model.formantMinHz) * model.formantBandCount - 0.5;
  const p = Math.max(0, Math.min(model.formantBandCount - 1, position));
  const a = Math.floor(p), b = Math.min(model.formantBandCount - 1, a + 1), mix = p - a;
  return (frame.formantEnvelope[a] ?? 0) * (1 - mix) + (frame.formantEnvelope[b] ?? 0) * mix;
}

test('131: donor analysis stores a pitch-decoupled absolute-frequency formant envelope', async () => {
  const source = syntheticVowel();
  const model = await analyzeDonorBodyV3([source], sampleRate, 0, source.length);
  assert.equal(model.formantBandCount, 48);
  assert.ok(model.meanPitchConfidence > 0.9);
  assert.ok(model.voiceIdentityConfidence > 0.8);
  assert.ok(envelopeAt(model, 800) > envelopeAt(model, 1600) * 1.8);

  const octaveUp = await renderDonorBodyV3Reference(model, sampleRate, 2);
  assert.ok(octaveUp.every(Number.isFinite));
  assert.ok(Math.max(...octaveUp.map(Math.abs)) <= 0.901);
});

test('131: polyphonic carrier and continuous glissando remain stable through the same donor body', async () => {
  const source = syntheticVowel(180, 0.72);
  const model = await analyzeDonorBodyV3([source], sampleRate, 0, source.length);
  const cells = 96;
  const curve = (a: number, b: number) => Array.from({ length: cells }, (_, i) => a + (b - a) * i / (cells - 1));
  const gate = (from: number, to: number) => Array.from({ length: cells }, (_, i) => i >= from && i < to ? 1 : 0);
  const output = await renderDonorBodyV3({ rootReferenceHz: 1, bands: [
    { centerRatioCurve: curve(180, 720), gainCurve: gate(0, 96) },
    { centerRatioCurve: curve(270, 540), gainCurve: gate(18, 82) },
    { centerRatioCurve: curve(360, 360), gainCurve: gate(38, 76) },
  ] }, model, sampleRate, 1.15);
  assert.ok(output.every(Number.isFinite));
  assert.ok(Math.max(...output.map(Math.abs)) <= 0.901);
  assert.ok(Math.sqrt(output.reduce((sum, value) => sum + value * value, 0) / output.length) > 0.001);
});
