"module-source/src/features/l3lab/spectralForge/donorV2/carrierContinuity.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.carrierRegionBlend = carrierRegionBlend;
exports.buildContinuousCarrierPlan = buildContinuousCarrierPlan;
exports.continuousControlAt = continuousControlAt;
const projectionCarrierPlan_1 = require("./projectionCarrierPlan");
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function carrierRegionBlend(logSigma) {
const t = clamp((logSigma - .045) / (.13 - .045), 0, 1);
return t * t * (3 - 2 * t);
}
function newTrack(width, id) {
return { logHz: 0, velocity: 0, sigma: 0, last: -1, sharedAge: 0, band: {
trackId: id, centerRatioCurve: new Array(width).fill(1), gainCurve: new Array(width).fill(0),
bandwidthHzCurve: new Array(width).fill(0), ridgenessCurve: new Array(width).fill(0), continuityCurve: new Array(width).fill(0),
transientCurve: new Array(width).fill(0), regimeCurve: new Array(width).fill('tonal'), clusterIdCurve: new Array(width).fill(null),
supportRegionCurve: new Array(width).fill(-1), supportSigmaCurve: new Array(width).fill(0),
regionBlendCurve: new Array(width).fill(0), coalescedCurve: new Array(width).fill(false),
} };
}
function supportsCrossing(field, x, region, tracks, horizon) {
if (tracks.length < 2 || region.logSigma > .16 || tracks.some(t => t.sigma > .06))
return false;
for (let ahead = 1; ahead <= horizon && x + ahead < field.width; ahead++) {
const candidates = field.regions[x + ahead];
if (!candidates.length)
return false;
const used = new Set();
let matched = 0;
for (const track of tracks) {
const predicted = track.logHz + track.velocity * (ahead + 1);
let best = -1, distance = Infinity;
for (let j = 0; j < candidates.length; j++) {
if (used.has(j))
continue;
const r = candidates[j], d = Math.abs(Math.log(r.centerHz) - predicted);
if (r.logSigma < .08 && d < .065 + r.logSigma * 2 && d < distance) {
best = j;
distance = d;
}
}
if (best >= 0) {
used.add(best);
matched++;
}
}
if (matched === tracks.length)
return true;
}
return false;
}
function buildContinuousCarrierPlan(field) {
const tracks = [], width = field.width;
const horizon = Math.max(2, Math.min(128, Math.ceil(.22 / field.durationSec * Math.max(1, width - 1))));
let coalescedColumns = 0, peakTrackedPolyphony = 0, represented = 0;
for (let x = 0; x < width; x++) {
const regions = field.regions[x], claimedTracks = new Set(), claimedRegions = new Set();
const write = (id, index, centerHz, shared) => {
const track = tracks[id], r = regions[index], logHz = Math.log(centerHz), connected = track.last >= 0 && track.last === x - 1;
if (shared === 1) {
if (connected && !track.sharedAge)
track.velocity = .35 * track.velocity + .65 * (logHz - track.logHz);
else if (!connected)
track.velocity = 0;
track.sigma = r.logSigma;
track.sharedAge = 0;
}
else
track.sharedAge++;
const sigma = shared > 1 ? track.sigma : r.logSigma;
track.logHz = logHz;
track.last = x;
const b = track.band;
b.centerRatioCurve[x] = centerHz / 110;
b.gainCurve[x] = Math.sqrt(r.peak);
b.bandwidthHzCurve[x] = shared > 1 ? centerHz * 2 * Math.sinh(Math.max(.005, sigma) * 2) : r.highHz - r.lowHz;
b.supportRegionCurve[x] = index;
b.supportSigmaCurve[x] = sigma;
b.regionBlendCurve[x] = carrierRegionBlend(sigma);
b.coalescedCurve[x] = shared > 1;
b.ridgenessCurve[x] = 1 - b.regionBlendCurve[x];
b.continuityCurve[x] = connected ? 1 : 0;
b.transientCurve[x] = 0;
b.regimeCurve[x] = b.regionBlendCurve[x] < .5 ? 'tonal' : 'cluster';
claimedTracks.add(id);
};
for (let r = 0; r < regions.length; r++) {
const region = regions[r];
const inside = tracks.map((t, id) => ({ t, id })).filter(({ t }) => t.last === x - 1 && t.sharedAge < horizon &&
t.logHz + t.velocity >= Math.log(region.lowHz) && t.logHz + t.velocity <= Math.log(region.highHz));
if (!supportsCrossing(field, x, region, inside.map(v => v.t), horizon))
continue;
for (const { t, id } of inside)
write(id, r, clamp(Math.exp(t.logHz + t.velocity), region.lowHz, region.highHz), inside.length);
claimedRegions.add(r);
coalescedColumns++;
}
const remaining = regions.map((r, index) => ({ r, index })).filter(v => !claimedRegions.has(v.index));
const available = tracks.map((t, id) => ({ t, id })).filter(v => !claimedTracks.has(v.id));
const costs = remaining.map(({ r }, row) => [
...available.map(({ t }, col) => {
if (t.last !== x - 1)
return .19 + col * 1e-7;
const predicted = t.logHz + t.velocity;
return Math.abs(Math.log(r.centerHz) - predicted) + Math.abs(r.logSigma - t.sigma) * .12 + col * 1e-7;
}),
...remaining.map((_, j) => .24 + (j === row ? 0 : .01)),
]);
const assignment = (0, projectionCarrierPlan_1.minimumCostAssignment)(costs, available.length + remaining.length);
for (let row = 0; row < remaining.length; row++) {
const assigned = assignment[row];
let id;
if (assigned < available.length)
id = available[assigned].id;
else {
id = tracks.length;
tracks.push(newTrack(width, id));
}
const item = remaining[row];
write(id, item.index, item.r.centerHz, 1);
}
represented += regions.length;
peakTrackedPolyphony = Math.max(peakTrackedPolyphony, claimedTracks.size);
}
let maximumSum = 0;
for (let x = 0; x < width; x++)
maximumSum = Math.max(maximumSum, tracks.reduce((n, t) => n + t.band.gainCurve[x], 0));
const scale = maximumSum > .86 ? .86 / maximumSum : 1;
for (const track of tracks)
for (let x = 0; x < width; x++)
track.band.gainCurve[x] *= scale;
return { version: 'projection-carrier-plan-f3.5', rootReferenceHz: 110, bands: tracks.map(t => t.band),
sourceAnchorCount: represented, representedAnchorCount: represented, droppedAnchorCount: 0,
peakPolyphony: Math.max(0, ...field.regions.map(r => r.length)), supportField: field,
continuity: { version: 'carrier-continuity-f3.5', coalescedColumns, peakTrackedPolyphony } };
}
function continuousControlAt(plan, voice, fraction) {
const field = plan.supportField, b = plan.bands[voice];
const p = clamp(fraction, 0, 1) * Math.max(0, field.width - 1), cell = Math.round(p);
const index = b?.supportRegionCurve?.[cell] ?? -1, region = field.regions[cell]?.[index];
if (!region || !(b.gainCurve[cell] > 0))
return undefined;
const a = Math.floor(p), next = Math.min(field.width - 1, a + 1), f = p - a;
const connected = b.gainCurve[a] > 0 && b.gainCurve[next] > 0;
const value = (curve, fallback) => !curve ? fallback : connected ? curve[a] * (1 - f) + curve[next] * f : curve[cell];
const centerHz = connected ? Math.exp(Math.log(b.centerRatioCurve[a]) * (1 - f) + Math.log(b.centerRatioCurve[next]) * f) * plan.rootReferenceHz
: b.centerRatioCurve[cell] * plan.rootReferenceHz;
return { region, cell, regionIndex: index, centerHz, logSigma: value(b.supportSigmaCurve, region.logSigma),
blend: value(b.regionBlendCurve, carrierRegionBlend(region.logSigma)), gain: value(b.gainCurve, 0),
coalesced: b.coalescedCurve?.[cell] ?? false };
}
},
