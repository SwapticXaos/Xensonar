"module-source/src/features/l3lab/spectralForge/donorHybrid/donorHybridModel.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hybridLevelAt = hybridLevelAt;
exports.hybridPitchAt = hybridPitchAt;
exports.prepareDonorHybrid = prepareDonorHybrid;
const realSpectrum_1 = require("../audio/realSpectrum");
const donorSourceWindows_1 = require("./donorSourceWindows");
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function measureSpectralLocation(samples, sampleRate, start, end) {
const span = Math.max(1, end - start), frameSize = Math.min(4096, Math.max(512, 2 ** Math.floor(Math.log2(Math.min(span, 4096)))));
const energy = [];
const positions = Math.max(1, Math.min(7, Math.floor(span / Math.max(1, frameSize / 2))));
let total = 0, weightedLog = 0;
for (let frame = 0; frame < positions; frame++) {
const center = start + (frame + .5) / positions * span, from = Math.max(start, Math.min(end - frameSize, Math.round(center - frameSize / 2)));
const window = new Float32Array(frameSize);
for (let i = 0; i < frameSize; i++) {
const x = samples[from + i] ?? 0, hann = .5 - .5 * Math.cos(2 * Math.PI * i / Math.max(1, frameSize - 1));
window[i] = x * hann;
}
const spectrum = (0, realSpectrum_1.fftMagnitudesReal)(window);
for (let bin = 1; bin < spectrum.length; bin++) {
const hz = bin * sampleRate / ((spectrum.length - 1) * 2);
if (hz < 35 || hz > sampleRate * .46)
continue;
const power = spectrum[bin] * spectrum[bin];
if (!(power > 0))
continue;
energy.push(power);
total += power;
weightedLog += power * Math.log(hz);
}
}
if (!(total > 1e-18))
return { centroidHz: 220, bandwidthHz: 220 };
const centroidHz = Math.exp(weightedLog / total);
let variance = 0, cursor = 0;
for (let frame = 0; frame < positions; frame++) {
const center = start + (frame + .5) / positions * span, from = Math.max(start, Math.min(end - frameSize, Math.round(center - frameSize / 2)));
const window = new Float32Array(frameSize);
for (let i = 0; i < frameSize; i++) {
const hann = .5 - .5 * Math.cos(2 * Math.PI * i / Math.max(1, frameSize - 1));
window[i] = (samples[from + i] ?? 0) * hann;
}
const spectrum = (0, realSpectrum_1.fftMagnitudesReal)(window);
for (let bin = 1; bin < spectrum.length; bin++) {
const hz = bin * sampleRate / ((spectrum.length - 1) * 2);
if (hz < 35 || hz > sampleRate * .46)
continue;
const power = energy[cursor++] ?? spectrum[bin] * spectrum[bin];
const delta = Math.log(hz / centroidHz);
variance += power * delta * delta;
}
}
const sigma = Math.sqrt(Math.max(0, variance / total));
const bandwidthHz = centroidHz * Math.max(.08, Math.min(4, Math.exp(sigma) - Math.exp(-sigma)));
return { centroidHz: clamp(centroidHz, 35, sampleRate * .45), bandwidthHz: clamp(bandwidthHz, 20, sampleRate * .45) };
}
function hybridLevelAt(model, sample) {
const p = clamp(sample / model.levelHop, 0, model.levels.length - 1), i = Math.floor(p);
return model.levels[i] + ((model.levels[Math.min(i + 1, model.levels.length - 1)] ?? model.levels[i]) - model.levels[i]) * (p - i);
}
function hybridPitchAt(model, sample) {
const marks = model.marks;
if (marks.length < 4)
return model.referenceHz;
let a = 0, b = marks.length - 1;
while (a + 1 < b) {
const c = (a + b) >>> 1;
if (marks[c] < sample)
a = c;
else
b = c;
}
const lo = Math.max(0, a - 1), hi = Math.min(marks.length - 1, a + 2);
return model.sampleRate * (hi - lo) / Math.max(1, marks[hi] - marks[lo]);
}
async function prepareDonorHybrid(samples, sampleRate, body, modalAmount, modalReferenceHz = 220) {
if (samples.length < 128 || samples.length > sampleRate * 8)
return undefined;
const pcm = new Float32Array(samples.length);
let mean = 0;
for (const x of samples)
mean += Number.isFinite(x) ? x : 0;
mean /= samples.length;
const prefix = new Float64Array(samples.length + 1);
for (let i = 0; i < pcm.length; i++) {
pcm[i] = (Number.isFinite(samples[i]) ? samples[i] : 0) - mean;
prefix[i + 1] = prefix[i] + pcm[i] * pcm[i];
}
const levelHop = Math.max(1, Math.round(sampleRate * .005));
const radius = Math.max(Math.round(sampleRate * .012), Math.round(sampleRate * 2 / Math.max(35, body.referenceHz)));
const levels = new Float32Array(Math.ceil(pcm.length / levelHop) + 1);
let maximum = 0;
for (let i = 0; i < levels.length; i++) {
const a = Math.max(0, i * levelHop - radius), b = Math.min(pcm.length, i * levelHop + radius);
levels[i] = Math.sqrt((prefix[b] - prefix[a]) / Math.max(1, b - a));
maximum = Math.max(maximum, levels[i]);
}
if (maximum < 1e-7)
return undefined;
for (let i = 0; i < levels.length; i++)
levels[i] = Math.max(maximum * .08, levels[i]);
const periodic = body.referenceHz >= 35 && body.voicedFrameRatio >= .45 && body.meanPitchConfidence >= .65 &&
((body.meanHarmonicAlignment ?? 0) >= .65 || modalAmount < .45);
const kind = periodic ? 'periodic' : modalAmount >= .25 ? 'modal' : 'texture';
const model = {
version: 'donor-hybrid-f3.3', samples: pcm, sampleRate, kind,
referenceHz: body.referenceHz >= 35 ? body.referenceHz : 220,
marks: new Float64Array(), levels, levelHop,
bodyStart: 0, bodyEnd: pcm.length - 1,
attackEnd: Math.min(pcm.length - 1, Math.round(body.attackEndSec * sampleRate)),
spectralCentroidHz: body.referenceHz >= 35 ? body.referenceHz : 220, spectralBandwidthHz: Math.max(80, body.referenceHz),
richHarmonics: body.frames.filter(frame => {
const peak = Math.max(...frame.harmonicAmplitudes);
return frame.harmonicAmplitudes.filter(a => a > peak * .035).length >= 6;
}).length > body.frames.length * .4,
};
if (kind === 'modal' && modalReferenceHz >= 18 && modalReferenceHz < sampleRate * .46)
model.referenceHz = modalReferenceHz;
if (periodic) {
const filtered = new Float32Array(pcm.length);
const pole = 1 - Math.exp(-2 * Math.PI * Math.min(1800, model.referenceHz * 1.25) / sampleRate);
let a = 0, b = 0;
for (let i = 0; i < pcm.length; i++) {
a += pole * (pcm[i] - a);
b += pole * (a - b);
filtered[i] = b;
}
const pitchAt = (position) => {
const p = clamp(position / sampleRate / Math.max(1e-6, body.frameHopSec), 0, body.frames.length - 1), i = Math.floor(p);
const a = body.frames[i].f0Hz || model.referenceHz, b = body.frames[Math.min(i + 1, body.frames.length - 1)].f0Hz || a;
return clamp(a * (b / a) ** (p - i), 35, sampleRate * .12);
};
const marks = [];
let dominant = 0;
for (let i = 1; i < filtered.length; i++)
if (Math.abs(filtered[i]) > Math.abs(filtered[dominant]))
dominant = i;
const polarity = filtered[dominant] < 0 ? -1 : 1;
let first = 0;
for (let i = 1; i < Math.min(pcm.length - 1, sampleRate / pitchAt(0) * 1.5); i++)
if (polarity * filtered[i] > polarity * filtered[first])
first = i;
let position = first;
while (position < pcm.length - 2) {
marks.push(position);
const period = sampleRate / pitchAt(position), predicted = position + period;
const from = Math.max(Math.ceil(position + period * .72), Math.floor(predicted - period * .22));
const to = Math.min(pcm.length - 2, Math.ceil(predicted + period * .22));
if (from > to)
break;
let best = from;
for (let i = from + 1; i <= to; i++)
if (polarity * filtered[i] > polarity * filtered[best])
best = i;
const y0 = filtered[Math.max(0, best - 1)], y1 = filtered[best], y2 = filtered[best + 1];
const offset = clamp(.5 * (y0 - y2) / (y0 - 2 * y1 + y2 || 1), -.5, .5);
position = best + offset;
if (marks.length % 1000 === 0)
await new Promise(resolve => setTimeout(resolve, 0));
}
model.marks = Float64Array.from(marks);
if (marks.length < 4)
model.kind = 'texture';
else {
const pitches = marks.slice(1).map((mark, i) => sampleRate / (mark - marks[i])).sort((a, b) => a - b);
model.referenceHz = pitches[Math.floor(pitches.length / 2)];
}
}
const candidates = body.frames.map((frame, i) => ({ frame, i })).filter(({ frame }) => frame.relativeLevel >= .28 && (model.kind !== 'periodic' || frame.f0Hz > 0 && frame.pitchConfidence >= .65));
const afterAttack = candidates.filter(({ frame }) => frame.timeSec >= Math.max(0,body.attackEndSec??0));
const pool = afterAttack.length >= 3 ? afterAttack : candidates;
if (pool.length) {
const lo = pool[Math.floor((pool.length - 1) * .12)].frame.timeSec;
const hi = pool[Math.floor((pool.length - 1) * .82)].frame.timeSec;
model.bodyStart = Math.round(lo * sampleRate);
model.bodyEnd = Math.round(Math.max(hi, lo + Math.min(.12, body.eventDurationSec * .5)) * sampleRate);
}
const margin = Math.min(Math.floor(pcm.length / 8), Math.ceil(sampleRate * .04));
model.bodyStart = clamp(model.bodyStart, margin, Math.max(margin, pcm.length - 2 * margin - 1));
model.bodyEnd = clamp(model.bodyEnd, model.bodyStart + margin, pcm.length - margin - 1);
const spectral = measureSpectralLocation(pcm, sampleRate, model.bodyStart, model.bodyEnd);
model.spectralCentroidHz = spectral.centroidHz;
model.spectralBandwidthHz = spectral.bandwidthHz;
model.sourceIndex = (0, donorSourceWindows_1.buildDonorSourceIndex)(body, sampleRate, pcm.length, model.kind, levels, levelHop, model.bodyStart, model.bodyEnd);
return model;
}
},
