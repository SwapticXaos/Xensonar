"module-source/src/features/l3lab/spectralForge/donorV3/donorSpectralEvidence.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.measureDonorSpectralPeaks = measureDonorSpectralPeaks;
exports.refineDonorFundamental = refineDonorFundamental;
exports.donorResidualSpectrum = donorResidualSpectrum;
const realSpectrum_1 = require("../audio/realSpectrum");
function measureDonorSpectralPeaks(windowed, sampleRate) {
let size = 1;
while (size < windowed.length)
size *= 2;
size = Math.min(65536, size * 4);
const padded = new Float32Array(size);
padded.set(windowed);
const spectrum = (0, realSpectrum_1.fftMagnitudesReal)(padded);
const binHz = sampleRate / size;
const peaks = [];
let maximum = 0;
for (let k = 2; k < spectrum.length - 2; k++) {
if (spectrum[k] <= spectrum[k - 1] || spectrum[k] < spectrum[k + 1])
continue;
const a = Math.log(spectrum[k - 1] + 1e-20), b = Math.log(spectrum[k] + 1e-20), c = Math.log(spectrum[k + 1] + 1e-20);
const delta = Math.max(-.5, Math.min(.5, .5 * (a - c) / (a - 2 * b + c || 1)));
const hz = (k + delta) * binHz;
if (hz < 35 || hz > Math.min(16000, sampleRate * .46))
continue;
maximum = Math.max(maximum, spectrum[k]);
peaks.push({ hz, amplitude: spectrum[k] });
}
const separated = [];
const separationHz = sampleRate / windowed.length * .8;
for (const peak of peaks.filter(p => p.amplitude >= maximum * .035).sort((a, b) => b.amplitude - a.amplitude)) {
if (separated.some(p => Math.abs(p.hz - peak.hz) < separationHz))
continue;
separated.push(peak);
if (separated.length >= 40)
break;
}
const scale = separated[0]?.amplitude || 1;
return separated.map(p => ({ hz: p.hz, amplitude: p.amplitude / scale }));
}
function refineDonorFundamental(coarseHz, peaks, resolutionHz) {
if (!(coarseHz > 0) || !peaks.length)
return coarseHz;
const candidates = [coarseHz];
for (const peak of peaks) {
const low = Math.max(1, Math.ceil(peak.hz / (coarseHz * 1.03)));
const high = Math.min(128, Math.floor(peak.hz / (coarseHz * .97)));
for (let h = low; h <= high; h++)
candidates.push(peak.hz / h);
}
const score = (f0) => {
let sum = 0, weight = 0;
for (const peak of peaks) {
const h = Math.round(peak.hz / f0);
if (h < 1 || h > 128)
continue;
const tolerance = Math.max(1.2, resolutionHz * .08, peak.hz * .001);
const error = (peak.hz - h * f0) / tolerance;
const w = Math.sqrt(peak.amplitude);
sum += w * Math.exp(-.5 * error * error);
weight += w;
}
return sum / Math.max(1e-12, weight);
};
let best = coarseHz, bestScore = score(best);
for (const candidate of candidates) {
const fit = score(candidate);
if (fit > bestScore) {
best = candidate;
bestScore = fit;
}
}
return best;
}
function donorResidualSpectrum(spectrum, sampleRate, count = 96) {
const power = new Float64Array(count), bins = new Float64Array(count);
const maxHz = sampleRate * .48, binHz = sampleRate / ((spectrum.length - 1) * 2);
for (let k = 1; k < spectrum.length; k++) {
const hz = k * binHz;
if (hz > maxHz)
break;
const p = Math.max(0, Math.min(count - 1, Math.log(Math.max(40, hz) / 40) / Math.log(maxHz / 40) * count - .5));
const a = Math.floor(p), mix = p - a, b = Math.min(count - 1, a + 1);
power[a] += spectrum[k] ** 2 * (1 - mix);
bins[a] += 1 - mix;
power[b] += spectrum[k] ** 2 * mix;
bins[b] += mix;
}
const values = Array.from(power, (v, i) => Math.sqrt(v / Math.max(1e-12, bins[i])));
for (let i = 0; i < count; i++)
if (bins[i] < 1e-6) {
let a = i - 1, b = i + 1;
while (a >= 0 && bins[a] < 1e-6)
a--;
while (b < count && bins[b] < 1e-6)
b++;
values[i] = a < 0 ? values[b] ?? 0 : b >= count ? values[a] : values[a] + (values[b] - values[a]) * (i - a) / (b - a);
}
const maximum = Math.max(...values) || 1;
return values.map(v => v / maximum);
}
},
