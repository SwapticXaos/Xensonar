"module-source/src/features/l3lab/spectralForge/donorHybrid/donorOutputMantle.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.measureDonorOutputMantle = measureDonorOutputMantle;
const realSpectrum_1 = require("../audio/realSpectrum");
async function measureDonorOutputMantle(samples, sampleRate, cancelled) {
const width = Math.max(32, Math.min(384, Math.ceil(samples.length / sampleRate * 40)));
const height = 192, fftSize = 4096, values = new Float32Array(width * height);
const window = Float32Array.from({ length: fftSize }, (_, i) => .5 - .5 * Math.cos(2 * Math.PI * i / (fftSize - 1)));
const input = new Float32Array(fftSize);
let maximum = 0;
for (let x = 0; x < width; x++) {
if (cancelled())
return null;
const center = Math.round((x + .5) / width * samples.length);
for (let i = 0; i < fftSize; i++)
input[i] = (samples[center + i - fftSize / 2] ?? 0) * window[i];
const spectrum = (0, realSpectrum_1.fftMagnitudesReal)(input);
for (let y = 0; y < height; y++) {
const high = 20 * 1000 ** (1 - y / height), low = 20 * 1000 ** (1 - (y + 1) / height);
const from = Math.max(1, Math.floor(low / sampleRate * fftSize));
const to = Math.min(spectrum.length - 1, Math.max(from, Math.ceil(high / sampleRate * fftSize)));
let power = 0;
for (let b = from; b <= to; b++)
power = Math.max(power, spectrum[b]);
values[y * width + x] = power;
maximum = Math.max(maximum, power);
}
if (x % 24 === 23)
await new Promise(resolve => setTimeout(resolve, 0));
}
return { width, height, values, maximum };
}
},
