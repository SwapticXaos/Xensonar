"module-source/src/features/l3lab/spectralForge/donorHybrid/donorSourceWindows.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDonorSourceIndex = buildDonorSourceIndex;
const median = (values) => {
const a = values.filter(Number.isFinite).sort((x, y) => x - y);
return a.length ? a[Math.floor(a.length / 2)] : 0;
};
const robustTolerance = (values, center, floor) => Math.max(floor, 4.5 * median(values.map(x => Math.abs(x - center))));
function envelopeDistance(a, b) {
const x = a.formantEnvelope, y = b.formantEnvelope;
let dot = 0, xx = 0, yy = 0;
for (let i = 0; i < Math.min(x.length, y.length); i += 3) {
dot += x[i] * y[i];
xx += x[i] ** 2;
yy += y[i] ** 2;
}
return xx > 1e-10 && yy > 1e-10 ? 1 - dot / Math.sqrt(xx * yy) : 0;
}
function buildDonorSourceIndex(body, sampleRate, sampleCount, kind, levels, levelHop, fallbackStart, fallbackEnd) {
const hop = Math.max(.001, body.frameHopSec);
const after = Math.min(Math.max(0,body.eventDurationSec-hop),Math.max(0,body.attackEndSec??0));
const pool = body.frames.map((frame, i) => ({ frame, i })).filter(({ frame }) => frame.timeSec >= after && frame.timeSec <= body.eventDurationSec - hop &&
frame.relativeLevel >= .08 && (kind !== 'periodic' || frame.f0Hz > 0 && frame.pitchConfidence >= .45));
const air = median(pool.map(x => x.frame.aperiodicity));
const airTolerance = robustTolerance(pool.map(x => x.frame.aperiodicity), air, .035);
const onsetFrames = body.frames.filter(f => f.timeSec <= Math.max(hop, Math.min(.08, body.attackEndSec)));
const attackCompatible = (body.onsetEvidence?body.onsetEvidence.kind==='transient':body.attackEndSec>0) && (kind !== 'periodic' || onsetFrames.length > 0 &&
median(onsetFrames.map(f => f.pitchConfidence)) >= .6 &&
median(onsetFrames.map(f => f.aperiodicity)) <= air + Math.max(.06, airTolerance));
let representative = pool[0];
let best = Infinity;
for (const candidate of pool.filter((_, i) => i % Math.max(1, Math.ceil(pool.length / 48)) === 0)) {
let cost = 0;
for (const other of pool)
cost += Math.min(1, envelopeDistance(candidate.frame, other.frame)) +
Math.min(1, Math.abs(candidate.frame.aperiodicity - other.frame.aperiodicity));
if (cost < best) {
best = cost;
representative = candidate;
}
}
const distances = pool.map(x => representative ? envelopeDistance(x.frame, representative.frame) : 0);
const center = median(distances), shapeTolerance = center + robustTolerance(distances, center, .18);
const accepted = pool.filter((x, i) => Math.abs(x.frame.aperiodicity - air) <= airTolerance && distances[i] <= shapeTolerance);
const ids = new Set(accepted.map(x => x.i));
const rejected = pool.filter(x => !ids.has(x.i)).map(x => x.i);
const levelAt = (sample) => levels[Math.max(0, Math.min(levels.length - 1, Math.round(sample / levelHop)))] || 1e-7;
const windows = [];
for (let k = 0; k < accepted.length;) {
const first = k;
while (k + 1 < accepted.length && accepted[k + 1].i === accepted[k].i + 1)
k++;
const last = k++;
const frames = accepted.slice(first, last + 1);
const guard = kind === 'periodic' ? Math.max(hop, 1.5 / Math.max(35, body.referenceHz)) : Math.max(hop, .04);
const start = Math.max(0, Math.ceil((frames[0].frame.timeSec + guard) * sampleRate));
const end = Math.min(sampleCount - 1, Math.floor((frames[frames.length - 1].frame.timeSec - guard) * sampleRate));
const minimum = sampleRate * (kind === 'periodic' ? Math.max(.025, 3 / Math.max(35, body.referenceHz)) : .03);
if (end - start < minimum)
continue;
windows.push({ id: windows.length, startSample: start, endSample: end, role: 'sustain',
firstFrame: frames[0].i, lastFrame: frames[frames.length - 1].i,
stateDistance: median(frames.map(x => envelopeDistance(x.frame, representative.frame))) +
Math.abs(median(frames.map(x => x.frame.aperiodicity)) - air),
aperiodicity: median(frames.map(x => x.frame.aperiodicity)),
level: median(frames.map(x => levelAt(x.frame.timeSec * sampleRate))), });
}
windows.sort((a, b) => b.endSample - b.startSample - (a.endSample - a.startSample));
const chosen = windows.slice(0, 12).sort((a, b) => a.startSample - b.startSample);
chosen.forEach((w, i) => { w.id = i; });
const fallback = chosen.length === 0;
if (fallback)
chosen.push({ id: 0, startSample: fallbackStart, endSample: fallbackEnd, role: 'sustain',
firstFrame: 0, lastFrame: Math.max(0, body.frames.length - 1), stateDistance: 0, aperiodicity: air,
level: levelAt((fallbackStart + fallbackEnd) * .5) });
return { version: 'source-windows-f3.1', windows: chosen,
representativeLevel: Math.max(1e-7, median(chosen.map(w => w.level))),
referenceAperiodicity: air, acceptedFrames: accepted.map(x => x.i), rejectedFrames: rejected,
thresholds:{air,airTolerance,shapeTolerance,bodyStartSec:after,bodyEndSec:body.eventDurationSec-hop,minimumLevel:.08,minimumPitchConfidence:.45},
frameDecisions:body.frames.map((frame,i)=>{const reasons=[];if(frame.timeSec<after)reasons.push('attack');if(frame.timeSec>body.eventDurationSec-hop)reasons.push('tail');if(frame.relativeLevel<.08)reasons.push('quiet');if(kind==='periodic'&&(!(frame.f0Hz>0)||frame.pitchConfidence<.45))reasons.push('pitch');const pi=pool.findIndex(x=>x.i===i);if(pi>=0){if(Math.abs(frame.aperiodicity-air)>airTolerance)reasons.push('air');if(distances[pi]>shapeTolerance)reasons.push('shape');if(!reasons.length)reasons.push('accepted');}return {frame:i,reasons,stateDistance:pi>=0?distances[pi]:null};}),
fallback, selection: 'donor-relative', attackPolicy: attackCompatible ? 'source-attack' : 'body-entry' };
}
},
