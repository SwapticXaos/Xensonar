import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { analyzeDonorBodyV3 } from '../../src/features/l3lab/spectralForge/donorV3/donorBodyModel';
import { renderDonorBodyV3Reference } from '../../src/features/l3lab/spectralForge/donorV3/renderDonorBodyV3';
import { evaluateDonorReconstruction } from '../../src/features/l3lab/spectralForge/donorV3/donorReconstructionMetrics';
import { DonorProofStrip } from '../../src/features/l3lab/spectralForge/components/harmonizerPanel/DonorProofStrip';
import { analyzeDonorProjection, donorProjectionUsesBodyV3 } from '../../src/features/l3lab/spectralForge/donorV2/donorProjection';

const sampleRate = 24000;
function vibrato(cents: number, seconds = 0.8) {
  let phase = 0;
  return Float32Array.from({ length: Math.round(sampleRate * seconds) }, (_, i) => {
    const hz = 220 * 2 ** (cents * Math.sin(2 * Math.PI * 5 * i / sampleRate) / 1200);
    phase += 2 * Math.PI * hz / sampleRate;
    const progress = i / (sampleRate * seconds);
    const third = 0.2 + 0.6 * progress;
    return 0.16 * (Math.sin(phase) + 0.45 * Math.sin(2 * phase + 0.3) + third * Math.sin(3 * phase - 0.5));
  });
}
function amplitude(data: Float32Array, hz: number) {
  let re = 0, im = 0;
  for (let i = 0; i < data.length; i++) { re += data[i] * Math.cos(2 * Math.PI * hz * i / sampleRate); im += data[i] * Math.sin(2 * Math.PI * hz * i / sampleRate); }
  return 2 * Math.hypot(re, im) / data.length;
}

test('rauschfreies Vibrato wird nicht mehr als dauerhafter Noise-Körper erfunden', async () => {
  const model = await analyzeDonorBodyV3([vibrato(100)], sampleRate, 0, Math.round(sampleRate * 0.8));
  const mean = model.frames.reduce((sum, frame) => sum + frame.aperiodicity, 0) / model.frames.length;
  assert.ok(model.voicedFrameRatio > 0.7, JSON.stringify({ voiced: model.voicedFrameRatio, mean }));
  assert.ok(mean < 0.045, `aperiodicity ${mean}`);
});

test('Vibrato wählt den zeitaufgelösten Körper statt des alten Modal-/Noise-Fallbacks', async () => {
  const model = await analyzeDonorProjection([vibrato(100)], sampleRate);
  assert.equal(donorProjectionUsesBodyV3(model), true);
});

test('inharmonische Resonatoren bleiben im gemessenen Modalpfad', async () => {
  const signal = Float32Array.from({ length: Math.round(sampleRate * 0.7) }, (_, i) =>
    0.15 * (Math.sin(2 * Math.PI * 300 * i / sampleRate) + 0.7 * Math.sin(2 * Math.PI * 424.264 * i / sampleRate) + 0.5 * Math.sin(2 * Math.PI * 826.8 * i / sampleRate)));
  const model = await analyzeDonorProjection([signal], sampleRate);
  assert.ok((model.modalAmount ?? 0) > 0.5);
  assert.equal(donorProjectionUsesBodyV3(model), false);
});

test('zeitabhängige Partialfarbe bleibt zwischen frühem und spätem Donor-Zustand verschieden', async () => {
  const model = await analyzeDonorBodyV3([vibrato(8)], sampleRate, 0, Math.round(sampleRate * 0.8));
  const early = model.frames[Math.floor(model.frames.length * 0.2)].harmonicAmplitudes[2];
  const late = model.frames[Math.floor(model.frames.length * 0.8)].harmonicAmplitudes[2];
  assert.ok(late > early * 1.6, `${early} -> ${late}`);
});

test('Modellrekonstruktion und Transposition nutzen denselben dynamischen Körper', async () => {
  const original = vibrato(8);
  const model = await analyzeDonorBodyV3([original], sampleRate, 0, original.length);
  const reconstruction = await renderDonorBodyV3Reference(model, sampleRate);
  const transposed = await renderDonorBodyV3Reference(model, sampleRate, 2);
  const metrics = evaluateDonorReconstruction(original.subarray(0, reconstruction.length), reconstruction);
  assert.ok(metrics.spectralSimilarity > 0.7, JSON.stringify(metrics));
  assert.ok(amplitude(transposed, 440) > amplitude(transposed, 220) * 5, 'Donor-Grundton darf nicht als zweite Stimme übrig bleiben');
});

test('mehrere getrennte Ereignisse werden nicht zu einem einzigen Timbre gemittelt', async () => {
  const body = vibrato(0, 0.3), joined = new Float32Array(sampleRate);
  joined.set(body, 0); joined.set(body.map(value => value * 0.6), Math.round(sampleRate * 0.6));
  const model = await analyzeDonorBodyV3([joined], sampleRate, 0, joined.length);
  assert.equal(model.detectedEventCount, 2);
  assert.ok(model.eventDurationSec < 0.5);
});

test('Vergleichsstrecke zeigt vier klar getrennte Hörpunkte und Modelltreue', () => {
  const html = renderToStaticMarkup(createElement(DonorProofStrip, { ready: true, active: 'reconstruction', similarity: 0.82, eventCount: 2, onSelect() {} }));
  for (const label of ['Original', 'Modell', '+7', 'Figur']) assert.match(html, new RegExp(label.replace('+', '\\+')));
  assert.match(html, /82%/); assert.match(html, /Stärkster von 2 Klangkörpern/);
});
