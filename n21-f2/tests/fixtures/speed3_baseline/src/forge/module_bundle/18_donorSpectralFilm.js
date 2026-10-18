"module-source/src/features/l3lab/spectralForge/donorHybrid/donorSpectralFilm.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spectralFilmGeometry = spectralFilmGeometry;
exports.spectralFilmSize = spectralFilmSize;
exports.readSpectralFilm = readSpectralFilm;
exports.readSpectralFilmInto = readSpectralFilmInto;
exports.measureFilmEvidence = measureFilmEvidence;
const complexSpectrum_1 = require("../audio/complexSpectrum");
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function spectralFilmGeometry(model, run, sampleRate, size) {
const step = model.sampleRate / sampleRate;
const margin = step > 1.02 ? Math.min(256, Math.ceil(8 / (.96 / step))) : 1;
const lo = Math.ceil(run.sourceStart), hi = Math.min(model.samples.length - 1, Math.floor(run.sourceEnd) - 1);
const half = size / 2 * step;
const safeLo = lo + half + margin, safeHi = hi - half - margin;
if (safeHi < safeLo)
throw new Error("Donor window does not contain the complete spectral projection.");
return { size, step, margin, lo, hi, safeLo, safeHi };
}
function spectralFilmSize(model, runs, sampleRate) {
const step = model.sampleRate / sampleRate, margin = step > 1.02 ? Math.min(256, Math.ceil(8 / (.96 / step))) : 1;
const span = Math.min(...runs.map(r => r.sourceEnd - r.sourceStart));
const capacity = Math.floor((span - margin * 2 - 3) / step);
if (capacity < 32)
throw new Error("Donor window too short for a coherent spectral projection.");
return Math.min(4096, 2 ** Math.floor(Math.log2(capacity)));
}
function filmSample(model, geometry, position) {
if (geometry.step <= 1.02) {
const a = Math.floor(position), f = position - a;
if (a < geometry.lo || a + 1 > geometry.hi)
throw new Error("PCM read outside the donor window.");
return model.samples[a] * (1 - f) + model.samples[a + 1] * f;
}
const cutoff = .96 / geometry.step, radius = geometry.margin, center = Math.floor(position);
let value = 0, weights = 0;
for (let j = center - radius + 1; j <= center + radius; j++) {
const x = (position - j) * cutoff;
if (Math.abs(x) >= 8)
continue;
if (j < geometry.lo || j > geometry.hi)
throw new Error("Filter access outside the donor window.");
const sinc = Math.abs(x) < 1e-12 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
const w = sinc * (.5 + .5 * Math.cos(Math.PI * x / 8)) * cutoff;
value += model.samples[j] * w;
weights += w;
}
return value / Math.max(1e-12, weights);
}
function readSpectralFilm(model, geometry, sourceCenter) {
const re = new Float64Array(geometry.size), im = new Float64Array(geometry.size);
return readSpectralFilmInto(model,geometry,sourceCenter,re,im);
}
function readSpectralFilmInto(model,geometry,sourceCenter,re,im){
const { size, step } = geometry;
if(re.length!==size||im.length!==size)throw new Error("Invalid film working buffers.");
re.fill(0);im.fill(0);
if (sourceCenter < geometry.safeLo || sourceCenter > geometry.safeHi)
throw new Error("Invalid donor-film center.");
for (let j = 0; j < size; j++)
re[(j + size / 2) % size] = filmSample(model, geometry, sourceCenter + (j - size / 2) * step) * (0, complexSpectrum_1.rootHann)(j, size);
(0, complexSpectrum_1.complexFFT)(re, im);
return { re, im };
}
function measureFilmEvidence(model, geometry, sampleRate) {
const size = geometry.size, bins = size / 2 + 1, power = new Float64Array(bins);
const count = geometry.safeHi - geometry.safeLo > model.sampleRate * .002 ? 5 : 1;
for (let f = 0; f < count; f++) {
const center = geometry.safeLo + (geometry.safeHi - geometry.safeLo) * (f + .5) / count;
const { re, im } = readSpectralFilm(model, geometry, center);
for (let k = 1; k < bins - 1; k++)
power[k] += (re[k] ** 2 + im[k] ** 2) / count;
}
let energy = 0, logSum = 0;
for (let k = 1; k < bins - 1; k++) {
const hz = k * sampleRate / size;
if (hz < 35 || hz > sampleRate * .46)
continue;
energy += power[k];
logSum += power[k] * Math.log(hz);
}
if (!(energy > 1e-20))
throw new Error("Accepted donor window contains no spectral energy.");
const centroidHz = Math.exp(logSum / energy);
let variance = 0;
for (let k = 1; k < bins - 1; k++) {
const hz = k * sampleRate / size;
if (hz >= 35 && hz <= sampleRate * .46)
variance += power[k] * Math.log(hz / centroidHz) ** 2;
}
const envelope = new Float64Array(128), maxHz = sampleRate * .46;
for (let b = 0; b < envelope.length; b++) {
const hz = 35 * (maxHz / 35) ** (b / (envelope.length - 1)), radius = Math.max(model.referenceHz * .7, hz * .12);
const lo = Math.max(1, Math.floor((hz - radius) * size / sampleRate)), hi = Math.min(bins - 2, Math.ceil((hz + radius) * size / sampleRate));
for (let k = lo; k <= hi; k++)
envelope[b] = Math.max(envelope[b], Math.sqrt(power[k]));
}
const floor = Math.max(1e-12, Math.max(...envelope) * .006), partialRatios = [];
const maximum = Math.max(...power);
for (let k = 2; k < bins - 2; k++)
if (power[k] > maximum * .001 && power[k] > power[k - 1] && power[k] >= power[k + 1])
partialRatios.push(k * sampleRate / size / model.referenceHz);
return { centroidHz, logSigma: Math.max(.04, Math.sqrt(variance / energy)), partialRatios, analysisFrames: count,
envelope: (hz) => {
const p = clamp(Math.log(Math.max(35, hz) / 35) / Math.log(maxHz / 35) * (envelope.length - 1), 0, envelope.length - 1), a = Math.floor(p), f = p - a;
return Math.exp(Math.log(Math.max(floor, envelope[a])) * (1 - f) + Math.log(Math.max(floor, envelope[Math.min(a + 1, envelope.length - 1)])) * f);
} };
}
},
