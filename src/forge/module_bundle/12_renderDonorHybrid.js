"module-source/src/features/l3lab/spectralForge/donorHybrid/renderDonorHybrid.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderDonorHybrid = renderDonorHybrid;
const donorHybridModel_1 = require("./donorHybridModel");
const donorMaterialPlan_1 = require("./donorMaterialPlan");
const granularCadence_1 = require("./granularCadence");
const renderContinuousDonor_1 = require("./renderContinuousDonor");
const clamp = (x, a, b) => Math.max(a, Math.min(b, Number.isFinite(x) ? x : 0));
const interpolate = (curve, p) => {
const x = p * Math.max(0, curve.length - 1), i = Math.floor(x), a = curve[i] ?? 0, b = curve[Math.min(i + 1, curve.length - 1)] ?? a;
return a + (b - a) * (x - i);
};
const optionalInterpolate = (curve, p, fallback) => curve?.length ? interpolate(curve, p) : fallback;
const deterministicBipolar = (index, voice, salt = 0) => .64 * Math.sin((index + 1) * 2.399963229728653 + voice * 1.61803398875 + salt) +
.36 * Math.sin((index + 1) * 1.4142135623730951 + voice * .7548776662 + salt * .37);
function nearestMark(marks, p) {
let a = 0, b = marks.length - 1;
while (a + 1 < b) {
const c = (a + b) >>> 1;
if (marks[c] < p)
a = c;
else
b = c;
}
return Math.abs(marks[a] - p) <= Math.abs(marks[b] - p) ? a : b;
}
function nearestMarkInRange(marks, p, lo, hi) {
if (!(hi >= lo) || !marks.length)
return -1;
let a = 0, b = marks.length;
while (a < b) {
const c = (a + b) >>> 1;
if (marks[c] < lo)
a = c + 1;
else
b = c;
}
const first = a;
a = 0;
b = marks.length;
while (a < b) {
const c = (a + b) >>> 1;
if (marks[c] <= hi)
a = c + 1;
else
b = c;
}
const last = a - 1;
if (first > last)
return -1;
const nearest = nearestMark(marks, p);
return Math.max(first, Math.min(last, nearest));
}
function resamplerSupportMargin(cutoff, maximumRadius = 48) {
return cutoff >= .999 ? 1 : Math.min(maximumRadius, Math.ceil(8 / Math.max(1e-6, cutoff)));
}
function readSample(samples, p, cutoff, maximumRadius = 48) {
if (cutoff >= .999) {
const i = Math.floor(p), f = p - i;
return (samples[i] ?? 0) * (1 - f) + (samples[i + 1] ?? 0) * f;
}
const center = Math.floor(p), radius = Math.min(maximumRadius, Math.ceil(8 / cutoff));
let sum = 0, weight = 0;
for (let i = center - radius + 1; i <= center + radius; i++) {
const x = (p - i) * cutoff;
if (Math.abs(x) >= 8)
continue;
const sinc = Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
const window = .5 + .5 * Math.cos(Math.PI * x / 8), w = sinc * window * cutoff;
sum += (samples[i] ?? 0) * w;
weight += w;
}
return sum / Math.max(1e-9, weight);
}
async function renderDonorHybrid(plan, model, sampleRate, durationSec, options = {}) {
const cfg=options.workbench??__F341Workbench.getConfig();
if(!options.sourceTimeline&&cfg.params.gestaltPilot)return (cfg.params.variantRevision === "original" ? __F356GestaltWorkerOriginal : __F356GestaltWorker).render(plan,model,sampleRate,durationSec,{...options,workbench:cfg});
if(!options.sourceTimeline&&cfg.params.materialPilot)return (cfg.params.variantRevision === "original" ? __F356WorkerOriginal : __F356Worker).render(plan,model,sampleRate,durationSec,{...options,workbench:cfg});

if (!options.sourceTimeline) {
 const cfg=options.workbench??__F341Workbench.getConfig();
 const local=__F341Workbench.localRegions(model,cfg);
 options={...options,workbench:{...cfg,localRegions:local}};
 model=__F341Workbench.materialModel(model,cfg);
}
if (plan.supportField && !options.sourceTimeline)
return (0, renderContinuousDonor_1.renderContinuousDonor)(plan, model, sampleRate, durationSec, options);
return renderPulseHybrid(plan, model, sampleRate, durationSec, options);
}
async function renderPulseHybrid(plan, model, sampleRate, durationSec, options = {}) {
const length = Math.max(1, Math.round(sampleRate * durationSec)), output = new Float32Array(length);
const lookahead = Math.ceil(sampleRate * .09);
const ringSize = 2 ** Math.ceil(Math.log2(lookahead * 4 + 8192)), mask = ringSize - 1;
const voices = plan.bands.map(() => ({ signal: new Float64Array(ringSize), weight: new Float64Array(ringSize), phase: 0, age: -1, gain: 0, mark: 0, nextGrain: 0, grainIndex: 0, lastGrainCenter: -1 }));
const activeRuns = plan.bands.map(band => {
const spans = new Array(band.gainCurve.length);
for (let i = 0; i < spans.length;) {
if (!(band.gainCurve[i] > 0)) {
i++;
continue;
}
const first = i;
while (i < spans.length && band.gainCurve[i] > 0)
i++;
const denominator = Math.max(1, spans.length - 1);
const start = Math.max(0, Math.ceil((first - .5) / denominator * (length - 1)));
const end = i === spans.length ? length : Math.min(length, Math.ceil((i - .5) / denominator * (length - 1)));
for (let cell = first; cell < i; cell++)
spans[cell] = [start, end];
}
return spans;
});
const { material, byCell } = (0, donorMaterialPlan_1.planDonorMaterial)(plan, model, sampleRate, durationSec);
let generated = 0, peak = 0;
const smoothing = 1 - Math.exp(-1 / (sampleRate * .0025));
const resamplerRadius = options.carrierPitchOwned ? 512 : 48;
const sourceRatio = (frequency, localHz, spectral, partials) => options.carrierPitchOwned && model.kind !== 'texture'
? clamp(frequency / localHz, 1 / 128, 1024)
: spectral || partials ? clamp(frequency / localHz, .125, 8) : 1;
const controlAt = (band, sample) => {
const p = clamp(sample / Math.max(1, length - 1), 0, 1), x = p * Math.max(0, band.gainCurve.length - 1), cell = Math.round(x);
if (!(band.gainCurve[cell] > 0))
return { active: false, hz: 0, bandwidthHz: 0, ridgeness: 0, continuity: 0, transient: 0,
regime: 'tonal', clusterId: null, p, x, cell };
const xp = p * Math.max(0, band.centerRatioCurve.length - 1), a = Math.floor(xp), b = Math.min(a + 1, band.centerRatioCurve.length - 1);
const connected = band.gainCurve[a] > 0 && band.gainCurve[b] > 0;
const from = Math.max(1e-9, band.centerRatioCurve[connected ? a : cell]), to = Math.max(1e-9, band.centerRatioCurve[connected ? b : cell]);
const hz = from * (to / from) ** (xp - a) * plan.rootReferenceHz;
const bandwidthHz = Math.max(0, optionalInterpolate(band.bandwidthHzCurve, p, Math.max(20, hz * .04)));
const ridgeness = clamp(optionalInterpolate(band.ridgenessCurve, p, 1), 0, 1);
const continuity = clamp(optionalInterpolate(band.continuityCurve, p, 1), 0, 1);
const transient = clamp(optionalInterpolate(band.transientCurve, p, 0), 0, 1);
const regime = band.regimeCurve?.[cell] ?? 'tonal';
const clusterId = band.clusterIdCurve?.[cell] ?? null;
return { active: Number.isFinite(hz) && hz >= 18 && hz < sampleRate * .46, hz, bandwidthHz, ridgeness, continuity, transient, regime, clusterId, p, x, cell };
};
const grainTargetFrequency = (control, grainIndex, voiceIndex) => {
if (!control.active)
return control.hz;
const halfBandwidth = Math.max(0, control.bandwidthHz * .5);
const lo = Math.max(18, control.hz - halfBandwidth), hi = Math.min(sampleRate * .46, control.hz + halfBandwidth);
if (!(hi > lo * 1.01))
return control.hz;
const halfOctaves = Math.max(0, Math.log2(hi / lo) * .5);
const regimeStrength = control.regime === 'noise' ? 1 : control.regime === 'cluster' ? .8 : control.regime === 'transient' ? .45 : .18;
const offset = deterministicBipolar(grainIndex, voiceIndex, 9.17) * halfOctaves * regimeStrength;
return clamp(control.hz * 2 ** offset, lo, hi);
};
const aperiodicGeometry = (voiceIndex, cell, frequency, regime = 'tonal') => {
const selection = byCell[voiceIndex][cell];
if (!selection)
return null;
const span = Math.max(1, selection.sourceEnd - selection.sourceStart);
const followsPartials = options.registerPolicy === 'partials' || model.kind === 'modal';
const spectralCarrier = model.kind === 'texture' || regime === 'noise' || regime === 'cluster' || regime === 'transient';
const localHz = spectralCarrier ? Math.max(35, model.spectralCentroidHz || model.referenceHz) : model.referenceHz;
const ratio = sourceRatio(frequency, localHz, spectralCarrier, followsPartials);
const step = model.sampleRate / sampleRate * ratio;
const cutoff = step > 1.02 ? .96 / step : 1;
const margin = resamplerSupportMargin(cutoff, resamplerRadius);
const sourceBudget = Math.max(2 * step, span / 4 - margin);
const half = Math.min(sampleRate * .04, Math.max(2, sourceBudget / step));
return { selection, span, localHz, ratio, step, cutoff, margin, half };
};
function addGrain(voiceIndex, center, control, age, blockStart, grainIndex) {
const frequency = grainTargetFrequency(control, grainIndex, voiceIndex);
const voice = voices[voiceIndex], time = center / sampleRate;
const cell = Math.round(clamp(center / Math.max(1, length - 1), 0, 1) * Math.max(0, plan.bands[voiceIndex].gainCurve.length - 1));
const run = activeRuns[voiceIndex][cell];
if (!run)
return;
const selection = byCell[voiceIndex][cell];
if (!selection)
return;
const onset = options.carrierPitchOwned || model.sourceIndex?.attackPolicy === 'body-entry' ? 0 : Math.min(model.attackEnd, model.bodyStart, model.sampleRate * .08);
const travel = age * model.sampleRate;
const sustain = !options.sourceTimeline && travel >= onset;
const span = Math.max(1, selection.sourceEnd - selection.sourceStart);
const phase = ((travel - onset + voiceIndex * .019 * model.sampleRate) % (2 * span) + 2 * span) % (2 * span);
let sourceCenter = options.sourceTimeline ? clamp(time * model.sampleRate, 0, model.samples.length - 1)
: sustain ? selection.sourceStart + (phase <= span ? phase : 2 * span - phase) : travel;
let period = model.sampleRate / model.referenceHz;
let markIndex = -1;
if (model.kind === 'periodic' && model.marks.length >= 4) {
markIndex = nearestMark(model.marks, sourceCenter);
if (sustain) {
const inside = nearestMarkInRange(model.marks, sourceCenter, selection.sourceStart, selection.sourceEnd);
if (inside >= 0)
markIndex = inside;
}
sourceCenter = model.marks[markIndex];
const a = Math.max(0, markIndex - 1), b = Math.min(model.marks.length - 1, markIndex + 1);
period = (model.marks[b] - model.marks[a]) / Math.max(1, b - a);
}
let localHz = model.sampleRate / Math.max(1, period);
const followsPartials = options.registerPolicy === 'partials' || model.kind === 'modal';
const spectralCarrier = model.kind === 'texture' || control.regime === 'noise' || control.regime === 'cluster' || control.regime === 'transient' || control.transient >= .65;
if (spectralCarrier)
localHz = Math.max(35, model.spectralCentroidHz || localHz);
let ratio = sourceRatio(frequency, localHz, spectralCarrier, followsPartials);
let step = model.sampleRate / sampleRate * ratio;
let cutoff = step > 1.02 ? .96 / step : 1;
let half = model.kind === 'periodic'
? (0, granularCadence_1.periodicHalfWindowSamples)(period, step, sampleRate, frequency)
: sampleRate * .04;
if (sustain && model.kind === 'periodic' && model.marks.length >= 4) {
for (let attempt = 0; attempt < 2; attempt++) {
const margin = resamplerSupportMargin(cutoff, resamplerRadius);
const requestedSourceHalf = half * step + margin;
const safe = nearestMarkInRange(model.marks, sourceCenter, selection.sourceStart + requestedSourceHalf, selection.sourceEnd - requestedSourceHalf);
if (safe < 0)
break;
markIndex = safe;
sourceCenter = model.marks[markIndex];
const a = Math.max(0, markIndex - 1), b = Math.min(model.marks.length - 1, markIndex + 1);
period = (model.marks[b] - model.marks[a]) / Math.max(1, b - a);
localHz = model.sampleRate / Math.max(1, period);
ratio = sourceRatio(frequency, localHz, spectralCarrier, followsPartials);
step = model.sampleRate / sampleRate * ratio;
cutoff = step > 1.02 ? .96 / step : 1;
half = (0, granularCadence_1.periodicHalfWindowSamples)(period, step, sampleRate, frequency);
}
const margin = resamplerSupportMargin(cutoff, resamplerRadius);
let availableSourceHalf = Math.min(sourceCenter - selection.sourceStart, selection.sourceEnd - sourceCenter) - margin;
if (availableSourceHalf <= 0) {
const interior = nearestMarkInRange(model.marks, (selection.sourceStart + selection.sourceEnd) * .5, selection.sourceStart + margin, selection.sourceEnd - margin);
if (interior >= 0) {
markIndex = interior;
sourceCenter = model.marks[markIndex];
const a = Math.max(0, markIndex - 1), b = Math.min(model.marks.length - 1, markIndex + 1);
period = (model.marks[b] - model.marks[a]) / Math.max(1, b - a);
localHz = model.sampleRate / Math.max(1, period);
ratio = sourceRatio(frequency, localHz, spectralCarrier, followsPartials);
step = model.sampleRate / sampleRate * ratio;
cutoff = step > 1.02 ? .96 / step : 1;
half = (0, granularCadence_1.periodicHalfWindowSamples)(period, step, sampleRate, frequency);
availableSourceHalf = Math.min(sourceCenter - selection.sourceStart, selection.sourceEnd - sourceCenter) - resamplerSupportMargin(cutoff, resamplerRadius);
}
}
const requestedHalf = half;
const containedHalf = (0, granularCadence_1.containedPeriodicHalfWindowSamples)(requestedHalf, period, step, availableSourceHalf);
if (!(containedHalf > 0))
return;
const coverage = Math.min(1, containedHalf / Math.max(1e-9, requestedHalf));
material.minimumSourceCoverageRatio = Math.min(material.minimumSourceCoverageRatio, coverage);
if (coverage < .999999)
material.sourceContainmentFallbackCount++;
half = containedHalf;
}
else if (sustain && model.kind !== 'periodic') {
const geometry = aperiodicGeometry(voiceIndex, cell, frequency, control.regime);
if (!geometry)
return;
({ step, cutoff, half } = geometry);
const sourceHalf = half * step;
const dither = (0, granularCadence_1.deterministicSourceDither)(geometry.span, sourceHalf, grainIndex, voiceIndex);
const lo = selection.sourceStart + sourceHalf + geometry.margin;
const hi = selection.sourceEnd - sourceHalf - geometry.margin;
if (hi >= lo)
sourceCenter = clamp(sourceCenter + dither, lo, hi);
else
sourceCenter = clamp((selection.sourceStart + selection.sourceEnd) * .5, selection.sourceStart, selection.sourceEnd);
}
const localLevel = Math.max(1e-7, (0, donorHybridModel_1.hybridLevelAt)(model, sourceCenter));
const referenceLevel = model.sourceIndex?.representativeLevel ?? localLevel;
const correction = options.sourceTimeline ? referenceLevel / localLevel : clamp(referenceLevel / localLevel, .65, 1.6);
const gain = correction / Math.max(1e-7, referenceLevel);
material.grainCount++;
if (sustain)
material.sustainGrainCount++;
material.maximumLevelCorrection = Math.max(material.maximumLevelCorrection, correction);
for (let destination = Math.floor(center - half) + 1; destination < center + half; destination++) {
const delta = destination - center;
if (destination < blockStart || destination < run[0] || destination >= run[1])
continue;
const window = .5 + .5 * Math.cos(Math.PI * delta / half);
const value = readSample(model.samples, sourceCenter + delta * step, cutoff, resamplerRadius);
const slot = destination & mask;
voice.signal[slot] += value * window * gain;
voice.weight[slot] += window;
}
}
options.onProgress?.(.02);
for (let block = 0; block < length; block += 4096) {
if (options.isCancelled?.())
throw new DOMException('Donor-Vorschau abgebrochen.', 'AbortError');
const end = Math.min(length, block + 4096), until = Math.min(length, end + lookahead);
for (; generated < until; generated++) {
for (let v = 0; v < voices.length; v++) {
const voice = voices[v], control = controlAt(plan.bands[v], generated);
if (!control.active) {
voice.age = -1;
voice.phase = 0;
voice.nextGrain = generated;
voice.grainIndex = 0;
voice.lastGrainCenter = -1;
continue;
}
const onset = voice.age < 0;
voice.age = onset ? 0 : voice.age + 1;
const nativeReference = options.sourceTimeline && options.referenceTranspose === 1 && model.kind === 'periodic';
let emit = onset, grainCenter = generated;
if (nativeReference) {
emit = false;
while (voice.mark < model.marks.length && model.marks[voice.mark] / model.sampleRate * sampleRate < generated - .5)
voice.mark++;
if (voice.mark < model.marks.length && Math.abs(model.marks[voice.mark] / model.sampleRate * sampleRate - generated) <= .5) {
emit = true;
grainCenter = model.marks[voice.mark] / model.sampleRate * sampleRate;
voice.mark++;
}
}
else if (model.kind === 'periodic' && control.regime === 'tonal' && control.transient < .65) {
const clockHz = control.hz;
voice.phase += clockHz / sampleRate;
if (voice.phase >= 1) {
voice.phase -= 1;
emit = true;
grainCenter -= voice.phase / (clockHz / sampleRate);
}
}
else {
if (onset) {
voice.grainIndex = 0;
const geometry = aperiodicGeometry(v, control.cell, control.hz, control.regime);
const half = geometry?.half ?? sampleRate * .04;
voice.nextGrain = generated + (0, granularCadence_1.aperiodicIntervalSamples)(sampleRate, half, voice.grainIndex, v);
}
else if (generated >= voice.nextGrain) {
emit = true;
grainCenter = voice.nextGrain;
voice.grainIndex++;
const nextControl = controlAt(plan.bands[v], Math.min(length - 1, Math.round(voice.nextGrain)));
const geometry = aperiodicGeometry(v, nextControl.cell, nextControl.hz, nextControl.regime);
const half = geometry?.half ?? sampleRate * .04;
voice.nextGrain += (0, granularCadence_1.aperiodicIntervalSamples)(sampleRate, half, voice.grainIndex, v);
}
else
emit = false;
}
if (emit) {
if (voice.lastGrainCenter >= 0) {
const intervalSec = Math.max(0, grainCenter - voice.lastGrainCenter) / sampleRate;
const count = material.grainIntervalCount;
material.grainIntervalMinSec = count ? Math.min(material.grainIntervalMinSec, intervalSec) : intervalSec;
material.grainIntervalMaxSec = count ? Math.max(material.grainIntervalMaxSec, intervalSec) : intervalSec;
material.grainIntervalMeanSec = (material.grainIntervalMeanSec * count + intervalSec) / (count + 1);
material.grainIntervalCount = count + 1;
}
voice.lastGrainCenter = grainCenter;
addGrain(v, grainCenter, control, (voice.age + grainCenter - generated) / sampleRate, block, voice.grainIndex);
}
}
}
for (let i = block; i < end; i++) {
let sum = 0;
for (let v = 0; v < voices.length; v++) {
const voice = voices[v], band = plan.bands[v], control = controlAt(band, i), slot = i & mask;
const value = voice.signal[slot] / Math.max(1, voice.weight[slot]);
voice.signal[slot] = voice.weight[slot] = 0;
if (!control.active) {
voice.gain = 0;
continue;
}
let gain = clamp(interpolate(band.gainCurve, control.p), 0, 1);
if (options.sourceTimeline)
gain *= (0, donorHybridModel_1.hybridLevelAt)(model, i * model.sampleRate / sampleRate);
voice.gain += (gain - voice.gain) * smoothing;
const edgeWidth = Math.min(.5, .004 * (band.gainCurve.length - 1) / durationSec);
const leftEdge = control.cell === 0 || !(band.gainCurve[control.cell - 1] > 0)
? clamp((control.x - control.cell + .5) / Math.max(1e-6, edgeWidth), 0, 1) : 1;
const rightEdge = control.cell === band.gainCurve.length - 1 || !(band.gainCurve[control.cell + 1] > 0)
? clamp((control.cell + .5 - control.x) / Math.max(1e-6, edgeWidth), 0, 1) : 1;
sum += value * voice.gain * Math.min(leftEdge, rightEdge);
}
const edge = Math.min(1, i / Math.max(1, sampleRate * .004), (length - 1 - i) / Math.max(1, sampleRate * .004));
output[i] = sum * .34 * edge;
peak = Math.max(peak, Math.abs(output[i]));
}
options.onProgress?.(Math.min(.98, end / Math.max(1, length)));
await new Promise(resolve => setTimeout(resolve, 0));
}
if (peak > .9)
for (let i = 0; i < length; i++)
output[i] *= .9 / peak;
Object.defineProperty(output, 'donorMaterialPlan', { value: material });
options.onProgress?.(1);
return output;
}
},
