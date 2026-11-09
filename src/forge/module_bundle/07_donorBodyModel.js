"module-source/src/features/l3lab/spectralForge/donorV3/donorBodyModel.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.donorProjectionFingerprint = donorProjectionFingerprint;
exports.analyzeDonorBodyV3 = analyzeDonorBodyV3;
const realSpectrum_1 = require("../audio/realSpectrum");
const donorPitch_1 = require("../donorV2/donorPitch");
const donorSpectralEvidence_1 = require("./donorSpectralEvidence");
const PARTIAL_COUNT = 128;
const NOISE_BANDS = 8;
const FORMANT_BANDS = 96;
const FORMANT_MIN_HZ = 70;
const finite = (value) => Number.isFinite(value) ? value : 0;
const clamp = (value, low, high) => Math.max(low, Math.min(high, finite(value)));
const yieldTask = () => new Promise(resolve => setTimeout(resolve, 0));
function donorProjectionFingerprint(model) {
const sample = (values) => (values ?? []).map(value => finite(value).toFixed(6)).join(',');
return `${sample(model.partials)}|${sample(model.attackPartials)}|${sample(model.spectralEnvelope)}|${finite(model.noiseAmount).toFixed(6)}|${finite(model.modalAmount ?? 0).toFixed(6)}`;
}
function selectEvent(samples, sampleRate, start, length) {
const block = Math.max(32, Math.round(sampleRate * 0.01));
const blocks = Math.max(1, Math.ceil(length / block));
const rms = new Float64Array(blocks);
let maximum = 0;
for (let b = 0; b < blocks; b++) {
let power = 0, count = 0;
const from = start + b * block, to = Math.min(start + length, from + block);
for (let i = from; i < to; i++) {
const value = finite(samples[i]);
power += value * value;
count++;
}
rms[b] = Math.sqrt(power / Math.max(1, count));
maximum = Math.max(maximum, rms[b]);
}
if (maximum < 1e-7)
throw new Error("The donor selection contains no usable audio signal.");
const active = Array.from(rms, value => value >= maximum * 0.035);
for (let b = 1; b < blocks - 1; b++) {
if (active[b])
continue;
let left = b - 1, right = b + 1;
while (left >= 0 && !active[left] && b - left <= 4)
left--;
while (right < blocks && !active[right] && right - b <= 4)
right++;
if (left >= 0 && right < blocks && active[left] && active[right] && right - left <= 5)
active[b] = true;
}
const events = [];
for (let b = 0; b < blocks;) {
if (!active[b]) {
b++;
continue;
}
const first = b;
let energy = 0;
while (b < blocks && active[b]) {
energy += rms[b] * rms[b] * Math.min(block, length - b * block);
b++;
}
events.push({ start: first * block, end: Math.min(length, b * block), energy });
}
const chosen = events.reduce((best, event) => !best || event.energy > best.energy ? event : best, null);
if (!chosen)
throw new Error("The donor selection contains no continuous sound body.");
return { start: start + chosen.start, length: chosen.end - chosen.start, count: events.length };
}
function buildPitchDecoupledFormantEnvelope(harmonicAmplitudes, f0Hz, maxHz) {
const output = new Array(FORMANT_BANDS).fill(0);
if (!(f0Hz > 0) || !(maxHz > FORMANT_MIN_HZ))
return output;
const floor = Math.max(1e-9, Math.max(...harmonicAmplitudes) * 0.012);
const envelopeAt = (hz) => {
const position = clamp(hz / f0Hz - 1, 0, harmonicAmplitudes.length - 1);
const index = Math.floor(position), mix = position - index;
const a = Math.max(floor, harmonicAmplitudes[index] ?? 0);
const b = Math.max(floor, harmonicAmplitudes[Math.min(harmonicAmplitudes.length - 1, index + 1)] ?? 0);
return Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * mix);
};
let maximum = 0;
for (let band = 0; band < FORMANT_BANDS; band++) {
const centerHz = FORMANT_MIN_HZ * (maxHz / FORMANT_MIN_HZ) ** ((band + 0.5) / FORMANT_BANDS);
const value = envelopeAt(centerHz) * 0.6 + envelopeAt(centerHz - f0Hz * 0.2) * 0.2 + envelopeAt(centerHz + f0Hz * 0.2) * 0.2;
output[band] = value;
maximum = Math.max(maximum, value);
}
if (maximum > 1e-9) {
for (let i = 0; i < output.length; i++)
output[i] = Math.max(maximum * 0.012, output[i]) / maximum;
}
return output;
}
function spectralFlatness(spectrum) {
let sum = 0, log = 0, count = 0;
for (let i = 1; i < spectrum.length; i++) {
const power = spectrum[i] * spectrum[i];
sum += power;
log += Math.log(power + 1e-20);
count++;
}
return count && sum > 1e-20 ? Math.exp(log / count) / (sum / count) : 1;
}
async function analyzeDonorBodyV3(channels, sampleRate, start, length) {
let sourceChannelIndex = 0, sourceEnergy = -1;
for (let channelIndex = 0; channelIndex < Math.min(2, channels.length); channelIndex++) {
let energy = 0;
const channel = channels[channelIndex];
for (let i = start; i < Math.min(channel.length, start + length); i++)
energy += finite(channel[i]) ** 2;
if (energy > sourceEnergy) {
sourceEnergy = energy;
sourceChannelIndex = channelIndex;
}
}
const source = channels[sourceChannelIndex];
if (!source || sampleRate < 8000 || length < 128)
throw new Error("Donor selection is too short.");
const selected = selectEvent(source, sampleRate, start, length);
let selectedPower = 0;
for (let i = selected.start; i < selected.start + selected.length; i++)
selectedPower += finite(source[i]) ** 2;
const sourceRms = Math.sqrt(selectedPower / Math.max(1, selected.length));
const pitchWindowSize = Math.min(selected.length, Math.max(256, Math.round(sampleRate * 0.05)));
const desiredHop = Math.max(1, Math.round(sampleRate * 0.0125));
const frameCount = Math.max(1, Math.min(160, Math.ceil(selected.length / desiredHop) + 1));
const hop = frameCount > 1 ? (selected.length - 1) / (frameCount - 1) : 0;
const frames = [];
const formantMaxHz = Math.max(FORMANT_MIN_HZ * 2, Math.min(10000, sampleRate * 0.45));
let maximumLevel = 0, unexplained = 0, totalPower = 0, alignedPower = 0;
const pulsePower = new Float64Array(16), pulseCount = new Float64Array(16);
for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
const center = selected.start + Math.round(frameIndex * hop);
const pitchOffset = clamp(center - Math.floor(pitchWindowSize / 2), selected.start, selected.start + selected.length - pitchWindowSize);
const pitchWindow = source.subarray(pitchOffset, pitchOffset + pitchWindowSize);
let coarsePitch = (0, donorPitch_1.estimateDonorFundamental)(pitchWindow, sampleRate);
if (!(coarsePitch.hz > 0)) {
const filtered = new Float32Array(pitchWindow.length);
const pole = 1 - Math.exp(-2 * Math.PI * 1500 / sampleRate);
let a = 0, b = 0;
for (let i = 0; i < filtered.length; i++) {
a += pole * (pitchWindow[i] - a);
b += pole * (a - b);
filtered[i] = b;
}
coarsePitch = (0, donorPitch_1.estimateDonorFundamental)(filtered, sampleRate);
}
const windowSize = Math.min(selected.length, Math.max(128, Math.round(sampleRate *
(coarsePitch.hz > 0 ? clamp(5 / coarsePitch.hz, 0.018, 0.09) : 0.035))));
const offset = clamp(center - Math.floor(windowSize / 2), selected.start, selected.start + selected.length - windowSize);
const window = new Float32Array(windowSize);
const windowValues = new Float64Array(windowSize);
let windowSum = 0;
for (let i = 0; i < windowSize; i++) {
windowValues[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / Math.max(1, windowSize - 1));
windowSum += windowValues[i];
}
let mean = 0;
for (let i = 0; i < windowSize; i++)
mean += finite(source[offset + i]);
mean /= windowSize;
let power = 0;
for (let i = 0; i < windowSize; i++) {
const value = finite(source[offset + i]) - mean;
window[i] = value;
power += value * value;
}
const level = Math.sqrt(power / windowSize);
maximumLevel = Math.max(maximumLevel, level);
totalPower += power;
const refinedPitch = (0, donorPitch_1.estimateDonorFundamental)(window, sampleRate);
const pitch = refinedPitch.hz > 0 ? refinedPitch : coarsePitch;
const windowed = Float32Array.from(window, (value, i) => value * windowValues[i]);
const spectralPeaks = (0, donorSpectralEvidence_1.measureDonorSpectralPeaks)(windowed, sampleRate);
const f0 = (0, donorSpectralEvidence_1.refineDonorFundamental)(pitch.hz > 0 ? pitch.hz : 0, spectralPeaks, sampleRate / windowSize);
const amplitudes = new Array(PARTIAL_COUNT).fill(0);
const phases = new Array(PARTIAL_COUNT).fill(0);
const residual = window.slice();
let explainedPower = 0, fundamentalPhase = 0;
if (f0 > 0) {
for (let harmonic = 1; harmonic <= PARTIAL_COUNT && harmonic * f0 < sampleRate * 0.47; harmonic++) {
let sine = 0, cosine = 0;
const omega = 2 * Math.PI * f0 * harmonic / sampleRate;
const stepCosine = Math.cos(omega), stepSine = Math.sin(omega);
let oscillatorCosine = 1, oscillatorSine = 0;
for (let i = 0; i < windowSize; i++) {
const weighted = window[i] * windowValues[i];
sine += weighted * oscillatorSine;
cosine += weighted * oscillatorCosine;
const nextCosine = oscillatorCosine * stepCosine - oscillatorSine * stepSine;
oscillatorSine = oscillatorSine * stepCosine + oscillatorCosine * stepSine;
oscillatorCosine = nextCosine;
}
const amplitude = 2 * Math.hypot(sine, cosine) / Math.max(1e-12, windowSum);
const phase = Math.atan2(cosine, sine);
if (harmonic === 1)
fundamentalPhase = phase;
amplitudes[harmonic - 1] = amplitude;
phases[harmonic - 1] = phase - harmonic * fundamentalPhase;
explainedPower += 0.5 * amplitude * amplitude * windowSize;
let c = Math.cos(phase), s = Math.sin(phase);
for (let i = 0; i < windowSize; i++) {
residual[i] -= amplitude * s;
const nextC = c * stepCosine - s * stepSine;
s = s * stepCosine + c * stepSine;
c = nextC;
}
}
}
const spectrum = (0, realSpectrum_1.fftMagnitudesReal)(windowed);
const residualSpectrum = (0, realSpectrum_1.fftMagnitudesReal)(Float32Array.from(residual, (value, i) => value * windowValues[i]));
const binHz = sampleRate / ((spectrum.length - 1) * 2);
let harmonicPower = 0, agreeingPower = 0;
const amplitudeFloor = Math.max(...amplitudes) * 0.08;
for (let h = 1; h <= amplitudes.length; h++) {
const amplitude = amplitudes[h - 1];
if (!(amplitude > amplitudeFloor))
continue;
harmonicPower += amplitude * amplitude;
const expectedHz = h * f0;
const bin = Math.round(expectedHz / binHz);
const search = Math.max(2, Math.ceil(sampleRate / windowSize / binHz));
let peakBin = Math.max(1, bin - search);
for (let k = peakBin + 1; k <= Math.min(spectrum.length - 2, bin + search); k++) {
if (spectrum[k] > spectrum[peakBin])
peakBin = k;
}
if (peakBin < 1 || peakBin >= spectrum.length - 1)
continue;
const a = Math.log(spectrum[peakBin - 1] + 1e-20), b = Math.log(spectrum[peakBin] + 1e-20), c = Math.log(spectrum[peakBin + 1] + 1e-20);
const delta = clamp(0.5 * (a - c) / (a - 2 * b + c || 1), -0.5, 0.5);
if (Math.abs((peakBin + delta) * binHz - expectedHz) < Math.max(f0 * 0.025, sampleRate / windowSize * 0.15))
agreeingPower += amplitude * amplitude;
}
alignedPower += power * (harmonicPower > 1e-12 ? agreeingPower / harmonicPower : 0);
const flatness = spectralFlatness(spectrum);
const residualRatio = clamp(1 - explainedPower / Math.max(1e-12, power), 0, 1);
const aperiodicity = f0 > 0
? Math.min(residualRatio, clamp((1 - pitch.confidence) * 0.7 + Math.sqrt(flatness) * 0.7, 0, 1))
: 1;
unexplained += residualRatio * power;
const noiseBands = new Array(NOISE_BANDS).fill(0);
for (let bin = 1; bin < residualSpectrum.length; bin++) {
const hz = bin * sampleRate / ((residualSpectrum.length - 1) * 2);
const band = Math.max(0, Math.min(NOISE_BANDS - 1, Math.floor(Math.log(Math.max(40, hz) / 40) / Math.log(sampleRate / 80) * NOISE_BANDS)));
noiseBands[band] += residualSpectrum[bin] * residualSpectrum[bin];
}
if (f0 > 0 && pitch.confidence >= .8 && aperiodicity > .015)
for (let i = 0; i < windowSize; i++) {
const phase = ((f0 * i / sampleRate + fundamentalPhase / (2 * Math.PI)) % 1 + 1) % 1;
const bin = Math.min(15, Math.floor(phase * 16));
const weight = windowValues[i];
pulsePower[bin] += residual[i] ** 2 * weight;
pulseCount[bin] += weight;
}
const harmonicNorm = Math.sqrt(amplitudes.reduce((sum, value) => sum + value * value, 0)) || 1;
const normalizedHarmonics = amplitudes.map(value => value / harmonicNorm);
const noiseNorm = Math.sqrt(noiseBands.reduce((sum, value) => sum + value, 0)) || 1;
frames.push({
timeSec: (center - selected.start) / sampleRate,
f0Hz: f0,
pitchConfidence: pitch.confidence,
relativeLevel: level,
harmonicAmplitudes: normalizedHarmonics,
harmonicPhases: phases,
aperiodicity,
noiseBands: noiseBands.map(value => Math.sqrt(value) / noiseNorm),
formantEnvelope: buildPitchDecoupledFormantEnvelope(normalizedHarmonics, f0, formantMaxHz),
residualSpectrum: (0, donorSpectralEvidence_1.donorResidualSpectrum)(residualSpectrum, sampleRate),
spectralPeaks,
});
if (frameIndex % 4 === 3)
await yieldTask();
}
for (const frame of frames)
frame.relativeLevel /= Math.max(1e-9, maximumLevel);
const voiced = frames.filter(frame => frame.f0Hz > 0 && frame.pitchConfidence >= 0.72);
const referenceHz = voiced.length
? Math.exp(voiced.reduce((sum, frame) => sum + Math.log(frame.f0Hz), 0) / voiced.length)
: 0;
const meanPitchConfidence = voiced.length
? voiced.reduce((sum, frame) => sum + frame.pitchConfidence, 0) / voiced.length
: 0;
const unexplainedEnergyRatio = unexplained / Math.max(1e-12, totalPower);
const harmonicity = clamp(1 - unexplainedEnergyRatio, 0, 1);
const voiceIdentityConfidence = clamp((voiced.length / Math.max(1, frames.length)) * 0.5 + meanPitchConfidence * 0.35 + harmonicity * 0.15, 0, 1);
const onsetEvidence = __F347OnsetEvidence(source,sampleRate,selected.start,selected.length);
const attackEndSec = onsetEvidence.kind==='transient'?onsetEvidence.endSec:0;
const attackEndIndex = Math.min(frames.length - 1, Math.max(0,Math.ceil(attackEndSec / Math.max(1e-4, hop / sampleRate))));
const stableCandidates = frames.map((frame, index) => ({ frame, index })).filter(({ frame, index }) => index >= attackEndIndex && frame.f0Hz > 0 && frame.relativeLevel >= 0.55);
const sustainStartIndex = stableCandidates[0]?.index ?? attackEndIndex;
const sustainEndIndex = stableCandidates[stableCandidates.length - 1]?.index ?? frames.length - 1;
const pulse = Array.from(pulsePower, (v, i) => Math.sqrt(v / Math.max(1e-12, pulseCount[i])));
const pulseRms = Math.sqrt(pulse.reduce((s, v) => s + v * v, 0) / pulse.length) || 1;
const residualPulse = pulse.map(v => clamp(v / pulseRms, .45, 1.8));
const normalizedPulseRms = Math.sqrt(residualPulse.reduce((s, v) => s + v * v, 0) / residualPulse.length) || 1;
for (let i = 0; i < residualPulse.length; i++)
residualPulse[i] /= normalizedPulseRms;
return {
version: 'donor-body-v3', eventStartSec: (selected.start - start) / sampleRate,
eventDurationSec: selected.length / sampleRate, frameHopSec: hop / sampleRate,
referenceHz, attackEndSec, onsetEvidence,
sustainStartSec: frames[sustainStartIndex]?.timeSec ?? 0,
sustainEndSec: frames[sustainEndIndex]?.timeSec ?? selected.length / sampleRate,
voicedFrameRatio: voiced.length / frames.length, detectedEventCount: selected.count, sourceChannelIndex, sourceRms,
unexplainedEnergyRatio, formantMinHz: FORMANT_MIN_HZ, formantMaxHz, formantBandCount: FORMANT_BANDS,
meanPitchConfidence, voiceIdentityConfidence, meanHarmonicAlignment: alignedPower / Math.max(1e-12, totalPower), frames,
analysisRevision: 'donor-f347-observed-entry', partialCapacity: PARTIAL_COUNT, residualPulse, registerPolicy: 'resonance',
};
}
},
