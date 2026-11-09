import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderDonorBodyV3 } from '../../src/features/l3lab/spectralForge/donorV3/renderDonorBodyV3';
import { renderDonorBodyV3 as render131 } from './fixtures/renderDonorBodyV3.131';
import type { DonorBodyV3Model } from '../../src/features/l3lab/spectralForge/donorV3/donorBodyModel';

// Changing donor frames, formants, phases and breath noise expose stale tables.
const model: DonorBodyV3Model = {
  version: 'donor-body-v3', eventStartSec: 0, eventDurationSec: 0.6,
  frameHopSec: 0.02, referenceHz: 200, attackEndSec: 0.12,
  sustainStartSec: 0.12, sustainEndSec: 0.5, voicedFrameRatio: 1,
  detectedEventCount: 1, sourceChannelIndex: 0, sourceRms: 0.15,
  unexplainedEnergyRatio: 0.1, formantMinHz: 70, formantMaxHz: 10000,
  formantBandCount: 48, meanPitchConfidence: 0.97, voiceIdentityConfidence: 0.9,
  frames: Array.from({ length: 30 }, (_, f) => ({
    timeSec: f * 0.02, f0Hz: 200 + 5 * Math.sin(f), pitchConfidence: 0.97,
    relativeLevel: 0.6 + 0.3 * Math.sin(f / 10), aperiodicity: 0.12,
    harmonicAmplitudes: Array.from({ length: 64 }, (_, h) => (1 + 0.25 * Math.sin(f + h)) / (h + 1)),
    harmonicPhases: Array.from({ length: 64 }, (_, h) => 0.17 * h + 0.013 * f),
    noiseBands: [0.02, 0.03, 0.05, 0.1, 0.12, 0.09, 0.05, 0.02],
    formantEnvelope: Array.from({ length: 48 }, (_, n) => 0.1 + Math.exp(-(((n - 22 - f / 10) / 6) ** 2))),
  })),
};

const scenarios = [
  { name: 'sustained chord and donor sustain wrap', hz: [220, 275, 330, 440], glide: false, gaps: false, timeline: false },
  { name: 'polyphonic glissandi across semitone and partial-cap boundaries', hz: [130, 220, 440], glide: true, gaps: false, timeline: false },
  { name: 'silence and staggered retriggers', hz: [190, 285, 380], glide: true, gaps: true, timeline: false },
  { name: 'reference timeline and per-frame levels', hz: [201], glide: true, gaps: false, timeline: true },
];

// Observe the actual shared-table Map without changing renderer arithmetic.
async function measure(render: typeof renderDonorBodyV3, plan: any, sampleRate: number, sourceTimeline: boolean) {
  const get = Map.prototype.get;
  let lookups = 0;
  Map.prototype.get = function(key: any) {
    if (typeof key === 'string' && /^\d+:\d+:-?\d+$/.test(key)) lookups++;
    return get.call(this, key);
  };
  const start = performance.now();
  try {
    const output = await render(plan, model, sampleRate, 0.8, { sourceTimeline });
    return { output, lookups, ms: performance.now() - start };
  } finally { Map.prototype.get = get; }
}

test('132: numerical identity with 131 and fewer table lookups', async () => {
  for (const sampleRate of [24000, 48000]) for (const scenario of scenarios) {
    const plan = { rootReferenceHz: 1, bands: scenario.hz.map((hz, voice) => ({
      centerRatioCurve: Array.from({ length: 64 }, (_, c) => hz * (scenario.glide ? 2 ** (3 * c / 63) : 1)),
      gainCurve: Array.from({ length: 64 }, (_, c) => scenario.gaps && (c + voice * 6) % 24 < 8 ? 0 : 0.7),
    })) };
    const before = await measure(render131, plan, sampleRate, scenario.timeline);
    const after = await measure(renderDonorBodyV3, plan, sampleRate, scenario.timeline);
    assert.deepEqual(after.output, before.output, `${scenario.name} at ${sampleRate} Hz`);
    assert.ok(after.output.every(Number.isFinite));
    assert.ok(after.lookups < before.lookups * 0.03, `${after.lookups}/${before.lookups}`);
    console.log(JSON.stringify({ scenario: scenario.name, sampleRate, samples: after.output.length, exact: true, beforeLookups: before.lookups, afterLookups: after.lookups }));
  }
});

test('132: overlapping jobs retain isolated table references and cancellation', async () => {
  const plan = { rootReferenceHz: 1, bands: [{ centerRatioCurve: [220, 440], gainCurve: [1, 1] }] };
  const other = { ...model, frames: model.frames.map(frame => ({ ...frame, harmonicPhases: frame.harmonicPhases.map(p => p + 0.6) })) };
  const [a, b, expectedA, expectedB] = await Promise.all([
    renderDonorBodyV3(plan, model, 24000, 0.35), renderDonorBodyV3(plan, other, 24000, 0.35),
    render131(plan, model, 24000, 0.35), render131(plan, other, 24000, 0.35),
  ]);
  assert.deepEqual(a, expectedA); assert.deepEqual(b, expectedB); assert.notDeepEqual(a, b);
  let checks = 0;
  await assert.rejects(renderDonorBodyV3(plan, model, 24000, 0.8, { isCancelled: () => ++checks > 1 }), { name: 'AbortError' });
  assert.equal(checks, 2);
});

function shippedRenderer(version: number): typeof renderDonorBodyV3 {
  const html = readFileSync(path.resolve(`Xensonar_${version}.html`), 'utf8');
  const start = html.indexOf('const zd=512,');
  const end = html.indexOf('function gMe(', start);
  assert.ok(start > 0 && end > start);
  return new Function(html.slice(start, end) + '; return lH;')();
}

test('132: shipped HTML preserves shipped 131 audio, including cap changes and retriggers', async () => {
  const before = shippedRenderer(131), after = shippedRenderer(132);
  for (const scenario of scenarios) {
    const plan = { rootReferenceHz: 1, bands: scenario.hz.map((hz, voice) => ({
      centerRatioCurve: Array.from({ length: 64 }, (_, c) => hz * (scenario.glide ? 2 ** (3 * c / 63) : 1)),
      gainCurve: Array.from({ length: 64 }, (_, c) => scenario.gaps && (c + voice * 6) % 24 < 8 ? 0 : 0.7),
    })) };
    const original = await measure(before, plan, 48000, scenario.timeline);
    const patched = await measure(after, plan, 48000, scenario.timeline);
    assert.deepEqual(patched.output, original.output, scenario.name);
    assert.ok(patched.lookups < original.lookups * 0.03);
  }
});
