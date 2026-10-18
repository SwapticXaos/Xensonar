"module-source/src/features/l3lab/spectralForge/donorV2/donorPitch.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateDonorFundamental = estimateDonorFundamental;
function estimateDonorFundamental(samples, sampleRate) {
const stride = Math.max(1, Math.floor(sampleRate / 12000));
const size = Math.floor(samples.length / stride);
const pcm = new Float64Array(size);
let mean = 0;
for (let i = 0; i < size; i++) {
for (let j = 0; j < stride; j++)
pcm[i] += samples[i * stride + j] / stride;
mean += pcm[i];
}
mean /= Math.max(1, size);
for (let i = 0; i < size; i++)
pcm[i] -= mean;
const rate = sampleRate / stride;
const lo = Math.max(2, Math.floor(rate / 2200));
const hi = Math.min(Math.floor(size / 2), Math.ceil(rate / 45));
const corr = new Float64Array(hi + 2);
for (let lag = lo - 1; lag <= hi + 1; lag++) {
let cross = 0, energy = 0;
for (let i = 0; i < size - lag; i++) {
cross += pcm[i] * pcm[i + lag];
energy += pcm[i] ** 2 + pcm[i + lag] ** 2;
}
corr[lag] = energy > 1e-12 ? 2 * cross / energy : 0;
}
const peaks = [];
for (let i = lo; i <= hi; i++)
if (corr[i] > corr[i - 1] && corr[i] >= corr[i + 1])
peaks.push(i);
const maximum = peaks.reduce((v, i) => Math.max(v, corr[i]), 0);
if (maximum < 0.72)
return { hz: 0, confidence: maximum };
const peak = peaks.find(i => corr[i] >= Math.max(0.72, maximum * 0.96));
const delta = Math.max(-0.5, Math.min(0.5, 0.5 * (corr[peak - 1] - corr[peak + 1]) / (corr[peak - 1] - 2 * corr[peak] + corr[peak + 1] || 1)));
return { hz: rate / (peak + delta), confidence: corr[peak] };
}
},
