"module-source/src/features/l3lab/spectralForge/donorHybrid/donorMaterialPlan.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planDonorMaterial = planDonorMaterial;
function planDonorMaterial(plan, model, sampleRate, durationSec) {
const length = Math.max(1, Math.round(sampleRate * durationSec));
const windows = model.sourceIndex?.windows ?? [{ id: 0, startSample: model.bodyStart, endSample: model.bodyEnd, stateDistance: 0 }];
const runs = [];
for (let voice = 0; voice < plan.bands.length; voice++) {
const band = plan.bands[voice], local = [];
for (let i = 0; i < band.gainCurve.length;) {
if (!(band.gainCurve[i] > 0)) {
i++;
continue;
}
const first = i;
while (i < band.gainCurve.length && band.gainCurve[i] > 0)
i++;
const d = Math.max(1, band.gainCurve.length - 1);
local.push({ voice, firstCell: first, lastCell: i - 1,
startSample: Math.max(0, Math.ceil((first - .5) / d * (length - 1))),
endSample: i === band.gainCurve.length ? length : Math.min(length, Math.ceil((i - .5) / d * (length - 1))),
windowId: 0, sourceStart: 0, sourceEnd: 0, stateDistance: 0 });
}
const scores = [], parents = [];
for (let r = 0; r < local.length; r++) {
scores[r] = [];
parents[r] = [];
for (let w = 0; w < windows.length; w++) {
const current = windows[w], span = (current.endSample - current.startSample) / model.sampleRate;
const hold = (local[r].endSample - local[r].startSample) / sampleRate;
const target = 3 * current.stateDistance + .09 * Math.max(0, Math.log2(Math.max(.01, hold) / Math.max(.01, span)));
let best = target, parent = -1;
if (r) {
best = Infinity;
for (let p = 0; p < windows.length; p++) {
const previous = windows[p];
const transition = .08 * Math.abs(current.stateDistance - previous.stateDistance) +
.025 * Math.min(1, Math.abs(current.startSample - previous.endSample) / Math.max(1, model.samples.length));
const debt = p === w && windows.length > 1 ? .035 : 0;
const cost = scores[r - 1][p] + target + transition + debt;
if (cost < best) {
best = cost;
parent = p;
}
}
}
scores[r][w] = best;
parents[r][w] = parent;
}
}
let selected = local.length ? scores[local.length - 1].reduce((best, value, i, a) => value < a[best] ? i : best, 0) : 0;
for (let r = local.length - 1; r >= 0; r--) {
const window = windows[selected];
Object.assign(local[r], { windowId: window.id, sourceStart: window.startSample, sourceEnd: window.endSample, stateDistance: window.stateDistance });
selected = parents[r][selected];
}
runs.push(...local);
}
const material = { version: 'donor-material-plan-f3.3', sourceVersion: model.version,
sampleRate, durationSec, runs, grainCount: 0, sustainGrainCount: 0,
grainIntervalCount: 0, grainIntervalMinSec: 0, grainIntervalMaxSec: 0, grainIntervalMeanSec: 0,
maximumLevelCorrection: 0, sourceFallback: model.sourceIndex?.fallback ?? true, sourceContainmentFallbackCount: 0, minimumSourceCoverageRatio: 1 };
const byCell = plan.bands.map(band => new Array(band.gainCurve.length));
for (const run of runs)
for (let x = run.firstCell; x <= run.lastCell; x++)
byCell[run.voice][x] = run;
return { material, byCell };
}
},
