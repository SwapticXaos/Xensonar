"module-source/src/features/l3lab/spectralForge/audio/complexSpectrum.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rootHann = exports.principalPhase = void 0;
exports.complexFFT = complexFFT;
function complexFFT(real, imag, inverse = false) {
const n = real.length;
if (n !== imag.length || n < 2 || (n & (n - 1)))
throw new Error("FFT requires a power of two.");
for (let i = 1, j = 0; i < n; i++) {
let bit = n >> 1;
for (; j & bit; bit >>= 1)
j ^= bit;
j ^= bit;
if (i < j) {
[real[i], real[j]] = [real[j], real[i]];
[imag[i], imag[j]] = [imag[j], imag[i]];
}
}
for (let size = 2; size <= n; size *= 2) {
const angle = (inverse ? 2 : -2) * Math.PI / size, wr = Math.cos(angle), wi = Math.sin(angle);
for (let start = 0; start < n; start += size) {
let r = 1, im = 0;
for (let k = 0; k < size / 2; k++) {
const a = start + k, b = a + size / 2;
const tr = real[b] * r - imag[b] * im, ti = real[b] * im + imag[b] * r;
real[b] = real[a] - tr;
imag[b] = imag[a] - ti;
real[a] += tr;
imag[a] += ti;
const next = r * wr - im * wi;
im = r * wi + im * wr;
r = next;
}
}
}
if (inverse)
for (let i = 0; i < n; i++) {
real[i] /= n;
imag[i] /= n;
}
}
const principalPhase = (p) => p - 2 * Math.PI * Math.round(p / (2 * Math.PI));
exports.principalPhase = principalPhase;
const rootHann = (i, n) => Math.sin(Math.PI * (i + .5) / n);
exports.rootHann = rootHann;
},
