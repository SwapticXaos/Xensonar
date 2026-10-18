"module-source/src/features/l3lab/spectralForge/donorHybrid/renderContinuousDonor.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.continuousFrequencyMap = continuousFrequencyMap;
exports.coherentBinDestination = coherentBinDestination;
exports.renderContinuousDonor = renderContinuousDonor;
const complexSpectrum_1 = require("../audio/complexSpectrum");
const carrierContinuity_1 = require("../donorV2/carrierContinuity");
const donorHybridModel_1 = require("./donorHybridModel");
const donorMaterialPlan_1 = require("./donorMaterialPlan");
const renderCarrierSupport_1 = require("./renderCarrierSupport");
const donorSpectralFilm_1 = require("./donorSpectralFilm");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function check(options) { if (options.isCancelled?.())
throw new DOMException('Donor-Vorschau abgebrochen.', 'AbortError'); }
const fraction = (sample, length) => clamp(sample / Math.max(1, length - 1), 0, 1);
function continuousFrequencyMap(sourceHz, targetHz, localF0, sourceCentroid, sourceSigma, targetSigma, blend, binHz) {
const stretch = clamp(Math.max(targetSigma, binHz / Math.max(35, targetHz) * .35) / Math.max(.04, sourceSigma), .01, 8);
const pitchLog = Math.log(Math.max(1, sourceHz) / Math.max(18, localF0));
const regionLog = Math.log(Math.max(1, sourceHz) / Math.max(35, sourceCentroid)) * stretch;
return targetHz * Math.exp(pitchLog * (1 - blend) + regionLog * blend);
}
// F3.55.4: keep spectral-lobe neighbors at their natural proportional spacing.
// Zero is strictly legacy identity-phase-locking, an intentionally distinct sound.
// When the same peak moves by ratio r, its spectral neighborhood can now move by r
// rather than retaining its old absolute width. Only the experimental preset uses it.
function coherentBinDestination(peakTargetBin, bin, peakBin, ratio, amount) {
 if (!(amount > 0)) return peakTargetBin + (bin - peakBin);
 const widthScale=1+Math.max(0,Math.min(1,amount))*(Math.max(1e-6,ratio)-1);
 return peakTargetBin+(bin-peakBin)*widthScale;
}
function frameControl(plan, voice, center, hop, length) {
for (const offset of [0, -.25, .25, -.5, .5]) {
const at = clamp(center + offset * hop, 0, length - 1), control = (0, carrierContinuity_1.continuousControlAt)(plan, voice, fraction(at, length));
if (control)
return { ...control, at };
}
const width = plan.supportField.width, scale = Math.max(1, width - 1) / Math.max(1, length - 1);
const first = Math.max(0, Math.ceil((center - hop / 2) * scale));
const last = Math.min(width - 1, Math.floor((center + hop / 2) * scale));
let nearest;
for (let x = first; x <= last; x++)
if (plan.bands[voice].gainCurve[x] > 0 &&
(nearest === undefined || Math.abs(x / scale - center) < Math.abs(nearest / scale - center)))
nearest = x;
if (nearest !== undefined) {
const at = nearest / scale, control = (0, carrierContinuity_1.continuousControlAt)(plan, voice, fraction(at, length));
if (control)
return { ...control, at };
}
return undefined;
}
function sampleGain(plan, voice, sample, length) {
const field = plan.supportField, p = fraction(sample, length), control = (0, carrierContinuity_1.continuousControlAt)(plan, voice, p);
if (!control)
return 0;
const x = control.cell, coordinate = p * Math.max(0, field.width - 1);
const edge = Math.min(.49, .002 * Math.max(0, field.width - 1) / field.durationSec), b = plan.bands[voice];
const left = x === 0 || !(b.gainCurve[x - 1] > 0) ? clamp((coordinate - x + .5) / Math.max(1e-9, edge), 0, 1) : 1;
const right = x === field.width - 1 || !(b.gainCurve[x + 1] > 0) ? clamp((x + .5 - coordinate) / Math.max(1e-9, edge), 0, 1) : 1;
return control.gain * Math.min(left, right);
}
async function renderContinuousDonor(plan, model, sampleRate, durationSec, options = {}) {
const wb=options.workbench??__F341Workbench.getConfig(), params=wb.params;
const sourceKeep = clamp(Number(params.sourceSpectrum)||0, 0, 1);
const intrinsicMotion = params.signaturePilot === true ? clamp(Number(params.sourceMotion)||0, 0, 1) : 0;
const spectralCohesion = params.signaturePilot === true ? clamp(Number(params.spectralCohesion)||0, 0, 1) : 0;
const length = Math.max(1, Math.round(sampleRate * durationSec)), output = new Float32Array(length), field = plan.supportField;
const { material, byCell } = (0, donorMaterialPlan_1.planDonorMaterial)(plan, model, sampleRate, durationSec);
material.version = 'donor-material-plan-f3.41';
material.workbench=JSON.parse(JSON.stringify(wb));
let frames = 0, mappedBins = 0, phaseStarts = 0, mappingTransitions = 0, maximumBlendStep = 0, analysisFrames = 0;
for (let voice = 0; voice < plan.bands.length; voice++) {
check(options);
const runs = material.runs.filter(r => r.voice === voice);
if (!runs.length)
continue;
const size=__F347FilmSize(model,runs,sampleRate,params), hop = Math.min(size / 4, 2 ** Math.floor(Math.log2(sampleRate * .02))), bins = size / 2 + 1, binHz = sampleRate / size;
const signal = new Float64Array(length), weight = new Float64Array(length), previousSourcePhase = new Float64Array(bins), synthesisPhase = new Float64Array(bins), lastTargetHz = new Float64Array(bins);
const filmScratchRe=new Float64Array(size),filmScratchIm=new Float64Array(size), magnitude = new Float64Array(bins), phaseNow = new Float64Array(bins), outRe = new Float64Array(size), outIm = new Float64Array(size), nextPhase = new Float64Array(bins), nextTarget = new Float64Array(bins);
const evidenceByWindow = new Map();
for (const run of runs)
if (!evidenceByWindow.has(run.windowId)) {
const evidence = (0, donorSpectralFilm_1.measureFilmEvidence)(model, (0, donorSpectralFilm_1.spectralFilmGeometry)(model, run, sampleRate, size), sampleRate);
evidenceByWindow.set(run.windowId, evidence);
analysisFrames += evidence.analysisFrames;
}
let lastSourceCenter = NaN, lastOutputCenter = -1, lastRunStart = -1, lastWindow = -1, lastBlend = NaN, smoothCorrection = NaN;
for (let center = 0; center < length + size / 2; center += hop) {
check(options);
const control = frameControl(plan, voice, center, hop, length);
if (!control)
continue;
const run = byCell[voice][control.cell];
if (!run)
continue;
const geometry = (0, donorSpectralFilm_1.spectralFilmGeometry)(model, run, sampleRate, size), evidence = evidenceByWindow.get(run.windowId);
const age = Math.max(0, control.at - run.startSample) * geometry.step;
const sourceCenter = __F341Workbench.readPosition(geometry.safeLo,geometry.safeHi,age,params);
if(!run.workbenchRead){run.workbenchRead={...geometry,firstCarrierSample:center,firstSourceCenter:sourceCenter,lastCarrierSample:center,lastSourceCenter:sourceCenter};}
else{run.workbenchRead.lastCarrierSample=center;run.workbenchRead.lastSourceCenter=sourceCenter;}
const { re, im } = (0, donorSpectralFilm_1.readSpectralFilmInto)(model, geometry, sourceCenter, filmScratchRe,filmScratchIm);
const peaks = [];
let inputEnergy = 0, maximum = 0;
for (let k = 1; k < bins - 1; k++) {
magnitude[k] = Math.hypot(re[k], im[k]);
phaseNow[k] = Math.atan2(im[k], re[k]);
inputEnergy += magnitude[k] ** 2;
maximum = Math.max(maximum, magnitude[k]);
}
for (let k = 2; k < bins - 2; k++)
if (magnitude[k] > maximum * .002 && magnitude[k] > magnitude[k - 1] && magnitude[k] >= magnitude[k + 1])
peaks.push(k);
if (!peaks.length || !(inputEnergy > 1e-20))
continue;
const inSameRun = center - lastOutputCenter === hop && lastRunStart === run.startSample && lastWindow === run.windowId;
const delta = (sourceCenter - lastSourceCenter) / geometry.step;
const sourceContinuous = inSameRun && Math.abs(delta) > .5 && Math.abs(delta) < size / 2;
const blend = params.mapping??(model.kind === 'texture' ? 1 : control.blend);
if (!inSameRun)
phaseStarts++;
else if (Math.abs(blend - lastBlend) > 1e-8) {
mappingTransitions++;
maximumBlendStep = Math.max(maximumBlendStep, Math.abs(blend - lastBlend));
}
const localF0 = model.kind === 'periodic' ? (0, donorHybridModel_1.hybridPitchAt)(model, sourceCenter) : model.referenceHz;
// F3.55.3: Decouple expressive donor pitch motion from the Carrier's pitch trajectory.
// At 0 use the *original* local-F0 cancellation, byte-for-byte.
// At 1 use the stable source reference for the mapping denominator: vibrato,
// detuning and local donor movements are not intentionally divided away.
// Pitchmarks are still available for spectral weighting and window analysis.
// This does NOT bypass spectral phase synthesis or promise artefact-free stretching.
const mappingF0 = intrinsicMotion > 0 && model.kind === 'periodic' && localF0 > 0 && model.referenceHz > 0
  ? localF0 * Math.pow(model.referenceHz / localF0, intrinsicMotion) : localF0;
const map = (hz) => continuousFrequencyMap(hz, control.centerHz, mappingF0, evidence.centroidHz, evidence.logSigma, control.logSigma*params.spread, blend, binHz);
outRe.fill(0);outIm.fill(0);nextPhase.fill(0);nextTarget.fill(0);
const destinations = [], phases = [], sources = [];
for (const peak of peaks) {
const left = Math.log(Math.max(1e-20, magnitude[peak - 1])), middle = Math.log(Math.max(1e-20, magnitude[peak])), right = Math.log(Math.max(1e-20, magnitude[peak + 1]));
const offset = clamp(.5 * (left - right) / (left - 2 * middle + right || 1), -.5, .5);
const estimated = sourceContinuous ? peak * binHz + (0, complexSpectrum_1.principalPhase)(phaseNow[peak] - previousSourcePhase[peak] - 2 * Math.PI * peak * delta / size) * sampleRate / (2 * Math.PI * delta) : (peak + offset) * binHz;
const sourceHz = clamp(estimated, (peak - .5) * binHz, (peak + .5) * binHz), targetHz = map(sourceHz);
sources.push(sourceHz);
destinations.push(targetHz / binHz);
const previousHz = lastTargetHz[peak] || targetHz;
phases.push(inSameRun ? (0, complexSpectrum_1.principalPhase)(synthesisPhase[peak] + Math.PI * (previousHz + targetHz) * hop / sampleRate) : phaseNow[peak]);
}
for (let k = 1, p = 0; k < bins - 1; k++) {
while (p + 1 < peaks.length && Math.abs(peaks[p + 1] - k) < Math.abs(peaks[p] - k))
p++;
const peak = peaks[p];
const destination = spectralCohesion > 0
  ? coherentBinDestination(destinations[p], k, peak, destinations[p]*binHz/Math.max(1,sources[p]), spectralCohesion)
  : destinations[p] + (k - peak);
const hz = destination * binHz;
const angle = (0, complexSpectrum_1.principalPhase)(phases[p] + (0, complexSpectrum_1.principalPhase)(phaseNow[k] - phaseNow[peak]));
nextPhase[k] = angle;
nextTarget[k] = Math.max(1, hz);
if (destination < 1 || destination >= bins - 2)
continue;
let partialSource = Math.max(1, Math.round(sources[p] / localF0)) * localF0;
if (model.kind === 'modal' && evidence.partialRatios.length) {
const ratio = evidence.partialRatios.reduce((best, value) => Math.abs(value * localF0 - sources[p]) < Math.abs(best * localF0 - sources[p]) ? value : best);
partialSource = ratio * localF0;
}
const relativePartial = map(partialSource) / control.centerHz;
const regionPermission = (0, renderCarrierSupport_1.localPermission)(plan, control.cell, control.region, hz, binHz);
const partialPermission = (0, renderCarrierSupport_1.localPermission)(plan, control.cell, control.region, hz / relativePartial, binHz / relativePartial);
// F3.55.2: Optional source-spectrum retention. Zero is strictly legacy.
// This changes spectral *permission*, not the Carrier F0/time/voice schedule.
// An absent value from older recipes means zero; preserve original PCM-bin energy
// before the existing bounded full-frame energy compensation is computed.
const legacyPermission = regionPermission * blend + partialPermission * (1 - blend);
const permission = sourceKeep === 0 ? legacyPermission :
  legacyPermission + (1 - legacyPermission) * sourceKeep;
const resonance = model.kind === 'periodic'
? __F341Workbench.spectrumEnvelope(evidence,hz,k*binHz,blend,options,wb) : 1;
const materialWeight=__F341Workbench.spectralWeight(k*binHz,localF0,binHz,model.kind,evidence,model,sourceCenter,wb);
const amplitude = magnitude[k] * permission * resonance * materialWeight;
if (!(amplitude > 0))
continue;
const a = Math.floor(destination), f = destination - a;
const cs=Math.cos(angle),sn=Math.sin(angle);
outRe[a] += amplitude * (1-f)*cs;outIm[a] += amplitude * (1-f)*sn;
outRe[a+1] += amplitude * f*cs;outIm[a+1] += amplitude * f*sn;
mappedBins++;
}
let outputEnergy = 0;
for (let k = 1; k < bins - 1; k++)
outputEnergy += outRe[k] ** 2 + outIm[k] ** 2;
const localLevel = Math.max(1e-7, (0, donorHybridModel_1.hybridLevelAt)(model, sourceCenter)), referenceLevel = Math.max(1e-7, model.sourceIndex?.representativeLevel ?? localLevel);
const levelCorrection = params.dynamics===1?clamp(referenceLevel/localLevel,.65,1.6):Math.exp(params.dynamics*Math.log(clamp(referenceLevel/localLevel,.65,1.6)));
const requested = clamp(Math.sqrt(inputEnergy / Math.max(1e-20, outputEnergy)), .25, 4) * levelCorrection / referenceLevel;
const smoothing = 1 - Math.exp(-hop / (sampleRate * .012));
smoothCorrection = inSameRun && Number.isFinite(smoothCorrection) ? Math.exp(Math.log(smoothCorrection) * (1 - smoothing) + Math.log(requested) * smoothing) : requested;
material.maximumLevelCorrection = Math.max(material.maximumLevelCorrection, levelCorrection);
for (let k = 1; k < bins - 1; k++) {
outRe[k] *= smoothCorrection;
outIm[k] *= smoothCorrection;
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
previousSourcePhase.set(phaseNow);
synthesisPhase.set(nextPhase);
lastTargetHz.set(nextTarget);
lastSourceCenter = sourceCenter;
lastOutputCenter = center;
lastRunStart = run.startSample;
lastWindow = run.windowId;
lastBlend = blend;
frames++;
if (frames % 24 === 0) {
options.onProgress?.((voice + Math.min(1, center / length)) / Math.max(1, plan.bands.length));
await new Promise(resolve => setTimeout(resolve, 0));
}
}
for (let i = 0; i < length; i++)
output[i] += signal[i] / Math.max(1e-12, weight[i]) * sampleGain(plan, voice, i, length) * .34;
}
let peak = 0;
for (let i = 0; i < length; i++)
peak = Math.max(peak, Math.abs(output[i]));
if (peak > .9)
for (let i = 0; i < length; i++)
output[i] *= .9 / peak;
material.supportProjection = { version: 'carrier-support-projection-f3.5', source: 'accepted-pcm-complex-spectrum',
paintedCells: field.values.reduce((n, v) => n + (v > 0 ? 1 : 0), 0), spectralFrames: frames, mappedBins,
phaseStarts, mappingTransitions, maximumBlendStep, analysisFrames, coalescedColumns: plan.continuity?.coalescedColumns ?? 0 };
Object.defineProperty(output, 'donorMaterialPlan', { value: material });
options.onProgress?.(1);
return output;
}
},
