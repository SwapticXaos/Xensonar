"module-source/src/features/l3lab/spectralForge/donorHybrid/granularCadence.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aperiodicIntervalSamples = aperiodicIntervalSamples;
exports.periodicHalfWindowSamples = periodicHalfWindowSamples;
exports.containedPeriodicHalfWindowSamples = containedPeriodicHalfWindowSamples;
exports.deterministicSourceDither = deterministicSourceDither;
function signedQuasi(index, voice) {
const i = Math.max(0, Math.floor(index)) + 1;
return .64 * Math.sin(i * 2.399963229728653 + voice * 1.61803398875) +
.36 * Math.sin(i * 1.4142135623730951 + voice * .7548776662);
}
function aperiodicIntervalSamples(_sampleRate, grainHalfSamples, grainIndex, voice) {
const half = Math.max(1, grainHalfSamples);
const nominal = half * .5;
const jitter = signedQuasi(grainIndex, voice) * .28;
return Math.max(1, nominal * (1 + jitter));
}
function periodicHalfWindowSamples(sourcePeriodSamples, sourceStepPerOutputSample, outputSampleRate, targetHz) {
const period = Math.max(1, sourcePeriodSamples), step = Math.max(1e-6, sourceStepPerOutputSample);
const targetSpacing = outputSampleRate / Math.max(18, targetHz);
const minimumSourceSpan = targetSpacing * 2.05 * step;
const periods = Math.max(3, Math.min(8, Math.ceil(minimumSourceSpan / period - 1e-12)));
return periods * period / (2 * step);
}
function containedPeriodicHalfWindowSamples(requestedHalfOutputSamples, sourcePeriodSamples, sourceStepPerOutputSample, availableSourceHalfSamples) {
const period = Math.max(1, sourcePeriodSamples), step = Math.max(1e-6, sourceStepPerOutputSample);
const requestedPeriods = Math.max(1, Math.round(2 * requestedHalfOutputSamples * step / period));
const availablePeriods = Math.max(0, Math.floor(2 * Math.max(0, availableSourceHalfSamples) / period + 1e-9));
if (availablePeriods < 1)
return 0;
const periods = Math.min(requestedPeriods, availablePeriods);
return periods * period / (2 * step);
}
function deterministicSourceDither(spanSamples, sourceHalfSamples, grainIndex, voice) {
const amplitude = Math.min(Math.max(0, sourceHalfSamples) * .18, Math.max(0, spanSamples) * .06);
return signedQuasi(grainIndex + 17, voice + 3) * amplitude;
}
},
