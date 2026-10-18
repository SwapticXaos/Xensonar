"module-source/src/features/l3lab/spectralForge/audio/realSpectrum.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fftMagnitudesReal = fftMagnitudesReal;
function nextPowerOfTwo(value) { let n = 1; while (n < value)
n <<= 1; return n; }
function fftMagnitudesReal(input) {
const n = nextPowerOfTwo(input.length);
const real = new Float32Array(n);
const imag = new Float32Array(n);
real.set(input);
let j = 0;
for (let i = 0; i < n; i++) {
if (i < j) {
const tr = real[i];
real[i] = real[j];
real[j] = tr;
const ti = imag[i];
imag[i] = imag[j];
imag[j] = ti;
}
let bit = n >> 1;
while (bit > 0 && j >= bit) {
j -= bit;
bit >>= 1;
}
j += bit;
}
for (let len = 2; len <= n; len <<= 1) {
const angle = (-2 * Math.PI) / len;
const wLenCos = Math.cos(angle);
const wLenSin = Math.sin(angle);
for (let i = 0; i < n; i += len) {
let wCos = 1;
let wSin = 0;
for (let k = 0; k < len / 2; k++) {
const even = i + k;
const odd = even + len / 2;
const oddReal = real[odd] * wCos - imag[odd] * wSin;
const oddImag = real[odd] * wSin + imag[odd] * wCos;
const evenReal = real[even];
const evenImag = imag[even];
real[even] = evenReal + oddReal;
imag[even] = evenImag + oddImag;
real[odd] = evenReal - oddReal;
imag[odd] = evenImag - oddImag;
const nextCos = wCos * wLenCos - wSin * wLenSin;
const nextSin = wCos * wLenSin + wSin * wLenCos;
wCos = nextCos;
wSin = nextSin;
}
}
}
const mags = new Float32Array(n / 2 + 1);
for (let i = 0; i < mags.length; i++) {
mags[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / n;
}
return mags;
}
},
