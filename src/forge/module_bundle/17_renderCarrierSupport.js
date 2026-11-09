"module-source/src/features/l3lab/spectralForge/donorHybrid/renderCarrierSupport.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localPermission = localPermission;
exports.renderSupportRegions = renderSupportRegions;
exports.guardTonalSupport = guardTonalSupport;
exports.mergeSupportMaterial = mergeSupportMaterial;
const complexSpectrum_1 = require("../audio/complexSpectrum");
const carrierSupportField_1 = require("../donorV2/carrierSupportField");
const donorHybridModel_1 = require("./donorHybridModel");
const donorMaterialPlan_1 = require("./donorMaterialPlan");
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fractionAt = (sample, length) => clamp(sample / Math.max(1, length - 1), 0, 1);
function check(options) {
if (options.isCancelled?.())
throw new DOMException('Donor-Vorschau abgebrochen.', 'AbortError');
}
function gainAt(plan, voice, sample, length, broad, texture) {
const p = fractionAt(sample, length), r = (0, carrierSupportField_1.supportRegionAt)(plan, voice, p);
if (!r || (texture || r.regime !== 'tonal') !== broad)
return 0;
const field = plan.supportField, x = (0, carrierSupportField_1.supportColumn)(field, p), gain = plan.bands[voice].gainCurve[x] ?? 0;
const edgeCells = Math.min(.49, .002 * (field.width - 1) / field.durationSec), cell = p * (field.width - 1);
const same = (j) => {
const region = field.regions[j]?.[plan.bands[voice].supportRegionCurve?.[j] ?? -1];
return region && (texture || region.regime !== 'tonal') === broad;
};
const left = x === 0 || !same(x - 1) ? clamp((cell - x + .5) / Math.max(1e-9, edgeCells), 0, 1) : 1;
const right = x === field.width - 1 || !same(x + 1) ? clamp((x + .5 - cell) / Math.max(1e-9, edgeCells), 0, 1) : 1;
return gain * Math.min(left, right);
}
function localPermission(plan, x, r, hz, binHz) {
const field = plan.supportField;
const value = (0, carrierSupportField_1.supportAmplitude)(field, x, hz, r) / Math.max(1e-20, r.peak);
if (value > 0)
return Math.sqrt(value);
const edge = hz < r.lowHz ? r.lowHz : hz > r.highHz ? r.highHz : hz;
const distance = Math.abs(hz - edge);
if (distance > binHz * 2)
return 0;
const edgeBin = hz < r.centerHz ? r.lastBin : r.firstBin;
const edgeAmplitude = field.values[edgeBin * field.width + x] / Math.max(1e-20, r.peak);
return Math.sqrt(edgeAmplitude) * Math.exp(-.5 * (distance / Math.max(1e-6, binHz * .65)) ** 2);
}
function frameControl(plan, voice, center, hop, length, broad, texture) {
for (const offset of [0, -.25, .25, -.5, .5]) {
const at = clamp(center + offset * hop, 0, length - 1), p = fractionAt(at, length);
const r = (0, carrierSupportField_1.supportRegionAt)(plan, voice, p);
if (r && (texture || r.regime !== 'tonal') === broad)
return { r, p, x: (0, carrierSupportField_1.supportColumn)(plan.supportField, p), at };
}
return null;
}
async function renderSupportRegions(plan, model, sampleRate, durationSec, options = {}) {
const field = plan.supportField;
const length = Math.max(1, Math.round(sampleRate * durationSec)), output = new Float32Array(length);
const texture = model.kind === 'texture';
const { material, byCell } = (0, donorMaterialPlan_1.planDonorMaterial)(plan, model, sampleRate, durationSec);
material.version = 'donor-material-plan-f3.4';
let frames = 0, mappedBins = 0;
for (let voice = 0; voice < plan.bands.length; voice++) {
check(options);
const windows = byCell[voice].filter((r) => !!r);
if (!windows.length)
continue;
const minimumSpan = Math.min(...windows.map(r => r.sourceEnd - r.sourceStart));
const desired = texture && field.regions.some((_, x) => (0, carrierSupportField_1.supportRegionAt)(plan, voice, x / Math.max(1, field.width - 1))?.regime === 'tonal') ? 4096 : 2048;
const capacity = Math.floor((minimumSpan - 2) * sampleRate / model.sampleRate);
if (capacity < 32)
throw new Error("Donor window too short for a coherent spectral projection.");
const size = Math.min(desired, 2 ** Math.floor(Math.log2(capacity))), hop = size / 4, bins = size / 2 + 1, binHz = sampleRate / size;
const signal = new Float64Array(length), weight = new Float64Array(length);
const previous = new Float64Array(bins), synthesisPhase = new Float64Array(bins);
let lastSourceCenter = NaN, lastWindow = -1, lastOutputCenter = -1;
const sourceReference = Math.max(35, model.spectralCentroidHz);
const sourceSigma = Math.max(.04, Math.asinh(model.spectralBandwidthHz / (2 * sourceReference)));
for (let center = 0; center < length + size / 2; center += hop) {
check(options);
const control = frameControl(plan, voice, center, hop, length, true, texture);
if (!control)
continue;
const run = byCell[voice][control.x];
if (!run)
continue;
const step = model.sampleRate / sampleRate, half = size / 2 * step;
const lo = Math.ceil(run.sourceStart), hi = Math.floor(run.sourceEnd) - 1;
const safeLo = lo + half, safeHi = hi - half - step, travelSpan = Math.max(0, safeHi - safeLo);
const age = Math.max(0, control.at - run.startSample) * step;
const phase = travelSpan > 0 ? age % (2 * travelSpan) : 0;
const sourceCenter = safeLo + (phase <= travelSpan ? phase : 2 * travelSpan - phase);
const re = new Float64Array(size), im = new Float64Array(size);
for (let j = 0; j < size; j++) {
const position = clamp(sourceCenter + (j - size / 2) * step, lo, hi);
const a = Math.floor(position), b = Math.min(hi, a + 1), f = position - a;
re[(j + size / 2) % size] = (model.samples[a] * (1 - f) + model.samples[b] * f) * (0, complexSpectrum_1.rootHann)(j, size);
}
(0, complexSpectrum_1.complexFFT)(re, im);
const magnitude = new Float64Array(bins), phaseNow = new Float64Array(bins), peaks = [];
let inputEnergy = 0;
for (let k = 1; k < bins - 1; k++) {
magnitude[k] = Math.hypot(re[k], im[k]);
phaseNow[k] = Math.atan2(im[k], re[k]);
inputEnergy += magnitude[k] ** 2;
}
for (let k = 2; k < bins - 2; k++)
if (magnitude[k] > magnitude[k - 1] && magnitude[k] >= magnitude[k + 1])
peaks.push(k);
if (!peaks.length || !(inputEnergy > 1e-20)) {
previous.set(phaseNow);
continue;
}
const delta = (sourceCenter - lastSourceCenter) / step;
const continuous = run.windowId === lastWindow && Math.abs(delta) > .5 && Math.abs(delta) < size / 2 && center - lastOutputCenter === hop;
const stretch = clamp(Math.max(control.r.logSigma, binHz / Math.max(35, control.r.centerHz) * .35) / sourceSigma, .01, 8);
const mapHz = (hz) => control.r.centerHz * Math.exp(Math.log(Math.max(1, hz) / sourceReference) * stretch);
const outRe = new Float64Array(size), outIm = new Float64Array(size), nextPhase = new Float64Array(bins);
const peakPhase = new Map(), peakTarget = new Map();
for (const peak of peaks) {
const estimated = continuous ? peak * binHz + (0, complexSpectrum_1.principalPhase)(phaseNow[peak] - previous[peak] - 2 * Math.PI * peak * delta / size) * sampleRate / (2 * Math.PI * delta) : peak * binHz;
const targetHz = mapHz(clamp(estimated, (peak - .5) * binHz, (peak + .5) * binHz));
peakTarget.set(peak, targetHz / binHz);
peakPhase.set(peak, Number.isFinite(lastSourceCenter) && center - lastOutputCenter === hop
? (0, complexSpectrum_1.principalPhase)(synthesisPhase[peak] + 2 * Math.PI * targetHz * hop / sampleRate) : phaseNow[peak]);
}
for (let k = 1, p = 0; k < bins - 1; k++) {
while (p + 1 < peaks.length && Math.abs(peaks[p + 1] - k) < Math.abs(peaks[p] - k))
p++;
const peak = peaks[p], targetPeak = peakTarget.get(peak);
const derivative = stretch * targetPeak / peak;
const destination = targetPeak + (k - peak) * derivative, hz = destination * binHz;
const permission = localPermission(plan, control.x, control.r, hz, binHz);
const amplitude = magnitude[k] * permission;
const angle = (0, complexSpectrum_1.principalPhase)(peakPhase.get(peak) + (0, complexSpectrum_1.principalPhase)(phaseNow[k] - phaseNow[peak]));
nextPhase[k] = angle;
if (!(amplitude > 0) || destination < 1 || destination >= size / 2 - 1)
continue;
const a = Math.floor(destination), f = destination - a;
for (const [bin, w] of [[a, 1 - f], [a + 1, f]]) {
outRe[bin] += amplitude * w * Math.cos(angle);
outIm[bin] += amplitude * w * Math.sin(angle);
}
mappedBins++;
}
let outputEnergy = 0;
for (let k = 1; k < bins - 1; k++)
outputEnergy += outRe[k] ** 2 + outIm[k] ** 2;
const localLevel = Math.max(1e-7, (0, donorHybridModel_1.hybridLevelAt)(model, sourceCenter));
const referenceLevel = Math.max(1e-7, model.sourceIndex?.representativeLevel ?? localLevel);
const levelCorrection = clamp(referenceLevel / localLevel, .65, 1.6);
const correction = clamp(Math.sqrt(inputEnergy / Math.max(1e-20, outputEnergy)), .25, 4) * levelCorrection / referenceLevel;
material.maximumLevelCorrection = Math.max(material.maximumLevelCorrection, levelCorrection);
for (let k = 1; k < bins - 1; k++) {
outRe[k] *= correction;
outIm[k] *= correction;
outRe[size - k] = outRe[k];
outIm[size - k] = -outIm[k];
}
(0, complexSpectrum_1.complexFFT)(outRe, outIm, true);
for (let j = 0; j < size; j++) {
const at = center + j - size / 2;
if (at < 0 || at >= length)
continue;
const w = (0, complexSpectrum_1.rootHann)(j, size);
signal[at] += outRe[(j + size / 2) % size] * w;
weight[at] += w * w;
}
previous.set(phaseNow);
synthesisPhase.set(nextPhase);
lastSourceCenter = sourceCenter;
lastWindow = run.windowId;
lastOutputCenter = center;
frames++;
if (frames % 24 === 0) {
options.onProgress?.((voice + Math.min(1, center / length)) / Math.max(1, plan.bands.length));
await new Promise(resolve => setTimeout(resolve, 0));
}
}
for (let i = 0; i < length; i++)
output[i] += signal[i] / Math.max(1e-12, weight[i]) * gainAt(plan, voice, i, length, true, texture) * .34;
}
material.supportProjection = { version: 'carrier-support-projection-f3.4', source: 'accepted-pcm-complex-spectrum',
paintedCells: field.values.reduce((n, v) => n + (v > 0 ? 1 : 0), 0), spectralFrames: frames, mappedBins };
return { output, material };
}
async function guardTonalSupport(input, plan, sampleRate, options = {}, model, preserveResonance = false) {
const field = plan.supportField, length = input.length, output = new Float32Array(length), weight = new Float64Array(length);
const size = 4096, hop = size / 4, binHz = sampleRate / size;
const modalRatios = [];
let envelopeAt;
if (model?.kind === 'periodic' && preserveResonance) {
const selected = model.sourceIndex?.windows[0];
const lo = Math.ceil(selected?.startSample ?? model.bodyStart), hi = Math.floor(selected?.endSample ?? model.bodyEnd);
const n = 2 ** Math.floor(Math.log2(Math.max(32, Math.min(8192, hi - lo))));
const sourceRe = new Float64Array(n), sourceIm = new Float64Array(n);
for (let j = 0; j < n; j++)
sourceRe[j] = (lo + j < hi ? model.samples[lo + j] : 0) * (0, complexSpectrum_1.rootHann)(j, n);
(0, complexSpectrum_1.complexFFT)(sourceRe, sourceIm);
const values = new Float64Array(96);
for (let band = 0; band < values.length; band++) {
const hz = 35 * (model.sampleRate * .46 / 35) ** (band / (values.length - 1));
const radius = Math.max(model.referenceHz * .7, hz * .12), first = Math.max(1, Math.floor((hz - radius) * n / model.sampleRate));
const last = Math.min(n / 2 - 1, Math.ceil((hz + radius) * n / model.sampleRate));
for (let k = first; k <= last; k++)
values[band] = Math.max(values[band], Math.hypot(sourceRe[k], sourceIm[k]));
}
const floor = Math.max(1e-12, Math.max(...values) * .006);
envelopeAt = (hz) => {
const p = clamp(Math.log(Math.max(35, hz) / 35) / Math.log(model.sampleRate * .46 / 35) * (values.length - 1), 0, values.length - 1);
const a = Math.floor(p), f = p - a;
return Math.exp(Math.log(Math.max(floor, values[a])) * (1 - f) + Math.log(Math.max(floor, values[Math.min(values.length - 1, a + 1)])) * f);
};
}
if (model?.kind === 'modal') {
const window = model.sourceIndex?.windows[0], lo = Math.ceil(window?.startSample ?? model.bodyStart), hi = Math.floor(window?.endSample ?? model.bodyEnd);
const n = 2 ** Math.floor(Math.log2(Math.max(32, Math.min(8192, hi - lo))));
const re = new Float64Array(n), im = new Float64Array(n);
for (let j = 0; j < n; j++)
re[j] = (lo + j < hi ? model.samples[lo + j] : 0) * (0, complexSpectrum_1.rootHann)(j, n);
(0, complexSpectrum_1.complexFFT)(re, im);
const powers = Array.from({ length: n / 2 }, (_, k) => Math.hypot(re[k], im[k]));
const max = Math.max(...powers);
for (let k = 2; k < n / 2 - 1; k++)
if (powers[k] > max * .015 && powers[k] > powers[k - 1] && powers[k] >= powers[k + 1])
modalRatios.push(k * model.sampleRate / n / model.referenceHz);
}
for (let center = 0, frame = 0; center < length + size / 2; center += hop, frame++) {
check(options);
const re = new Float64Array(size), im = new Float64Array(size);
for (let j = 0; j < size; j++)
re[j] = (input[center + j - size / 2] ?? 0) * (0, complexSpectrum_1.rootHann)(j, size);
(0, complexSpectrum_1.complexFFT)(re, im);
const controls = plan.bands.map((_, voice) => frameControl(plan, voice, center, hop, length, false, false)).filter(c => !!c);
let before = 0, after = 0;
for (let k = 1; k < size / 2; k++) {
const hz = k * binHz;
let permission = 0;
for (const control of controls) {
const harmonic = Math.max(1, Math.round(hz / control.r.centerHz));
if (modalRatios.length) {
for (const ratio of modalRatios)
permission = Math.max(permission, localPermission(plan, control.x, control.r, hz / ratio, binHz / ratio));
}
else {
const painted = localPermission(plan, control.x, control.r, hz / harmonic, binHz / harmonic);
const compensation = envelopeAt && model ? clamp(envelopeAt(hz) / envelopeAt(hz * model.referenceHz / control.r.centerHz), .18, 4) : 1;
permission = Math.max(permission, painted * compensation);
}
}
before += re[k] ** 2 + im[k] ** 2;
re[k] *= permission;
im[k] *= permission;
re[size - k] *= permission;
im[size - k] *= permission;
after += re[k] ** 2 + im[k] ** 2;
}
if (envelopeAt && after > 1e-20) {
const correction = clamp(Math.sqrt(before / after), .5, 2.5);
for (let k = 1; k < size; k++) {
re[k] *= correction;
im[k] *= correction;
}
}
re[0] = im[0] = re[size / 2] = im[size / 2] = 0;
(0, complexSpectrum_1.complexFFT)(re, im, true);
for (let j = 0; j < size; j++) {
const at = center + j - size / 2;
if (at < 0 || at >= length)
continue;
const w = (0, complexSpectrum_1.rootHann)(j, size);
output[at] += re[j] * w;
weight[at] += w * w;
}
if (frame % 24 === 0) {
options.onProgress?.(Math.min(1, center / length));
await new Promise(resolve => setTimeout(resolve, 0));
}
}
for (let i = 0; i < length; i++) {
const p = fractionAt(i, length), x = (0, carrierSupportField_1.supportColumn)(field, p);
const active = plan.bands.some((band, voice) => (band.gainCurve[x] > 0) && (0, carrierSupportField_1.supportRegionAt)(plan, voice, p)?.regime === 'tonal');
output[i] = active ? output[i] / Math.max(1e-12, weight[i]) : 0;
}
return output;
}
function mergeSupportMaterial(tonal, broad) {
if (!tonal)
return broad;
return { ...tonal, version: broad.version, runs: broad.runs, maximumLevelCorrection: Math.max(tonal.maximumLevelCorrection, broad.maximumLevelCorrection), supportProjection: broad.supportProjection };
}
},
