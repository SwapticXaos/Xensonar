"module-source/src/features/l3lab/spectralForge/donorV2/projectionCarrierPlan.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minimumCostAssignment = minimumCostAssignment;
exports.buildProjectionCarrierPlan = buildProjectionCarrierPlan;
const clamp01 = (value) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
function minimumCostAssignment(costs, laneCount) {
const rows = costs.length;
if (!rows)
return [];
const u = new Float64Array(rows + 1), v = new Float64Array(laneCount + 1);
const p = new Int32Array(laneCount + 1), way = new Int32Array(laneCount + 1);
for (let i = 1; i <= rows; i++) {
p[0] = i;
let j0 = 0;
const minv = new Float64Array(laneCount + 1);
minv.fill(Infinity);
const used = new Uint8Array(laneCount + 1);
do {
used[j0] = 1;
const i0 = p[j0];
let delta = Infinity, j1 = 0;
for (let j = 1; j <= laneCount; j++) {
if (used[j])
continue;
const cur = costs[i0 - 1][j - 1] - u[i0] - v[j];
if (cur < minv[j]) {
minv[j] = cur;
way[j] = j0;
}
if (minv[j] < delta) {
delta = minv[j];
j1 = j;
}
}
for (let j = 0; j <= laneCount; j++) {
if (used[j]) {
u[p[j]] += delta;
v[j] -= delta;
}
else
minv[j] -= delta;
}
j0 = j1;
} while (p[j0] !== 0);
do {
const j1 = way[j0];
p[j0] = p[j1];
j0 = j1;
} while (j0 !== 0);
}
const assignment = new Array(rows).fill(-1);
for (let j = 1; j <= laneCount; j++)
if (p[j] > 0 && p[j] <= rows)
assignment[p[j] - 1] = j - 1;
return assignment;
}
function transientStrength(anchor) {
if (anchor.regime === 'transient')
return 1;
return clamp01((1 - anchor.continuity) * .55 + (1 - anchor.ridgeness) * .25);
}
function buildProjectionCarrierPlan(skeleton, options = {}) {
const width = Math.max(1, skeleton.width);
const all = skeleton.anchorsByTime.flat().filter(anchor => Number.isFinite(anchor.centerHz) && anchor.centerHz >= 18 && Number.isFinite(anchor.energy) && anchor.energy > 0);
const peakPolyphony = skeleton.anchorsByTime.reduce((maximum, anchors) => Math.max(maximum, anchors.filter(anchor => Number.isFinite(anchor.centerHz) && anchor.centerHz >= 18 && Number.isFinite(anchor.energy) && anchor.energy > 0).length), 0);
const laneCount = Math.max(0, Math.min(Math.max(1, Math.floor(options.maxLanes ?? 24)), peakPolyphony));
if (!laneCount)
return { version: 'projection-carrier-plan-f3.3', rootReferenceHz: 110, bands: [], sourceAnchorCount: 0, peakPolyphony: 0, representedAnchorCount: 0, droppedAnchorCount: 0 };
const lanes = Array.from({ length: laneCount }, () => ({
centerRatioCurve: new Array(width).fill(1),
gainCurve: new Array(width).fill(0),
bandwidthHzCurve: new Array(width).fill(0),
ridgenessCurve: new Array(width).fill(0),
continuityCurve: new Array(width).fill(0),
transientCurve: new Array(width).fill(0),
regimeCurve: new Array(width).fill('tonal'),
clusterIdCurve: new Array(width).fill(null),
logHz: 0, velocity: 0, last: -1, lastRegime: 'tonal', lastCluster: null,
}));
let representedAnchorCount = 0, droppedAnchorCount = 0;
for (let x = 0; x < width; x++) {
const candidates = [...(skeleton.anchorsByTime[x] ?? [])]
.filter(anchor => Number.isFinite(anchor.centerHz) && anchor.centerHz >= 18 && Number.isFinite(anchor.energy) && anchor.energy > 0)
.sort((a, b) => b.energy - a.energy);
const kept = candidates.slice(0, laneCount);
droppedAnchorCount += Math.max(0, candidates.length - kept.length);
if (!kept.length)
continue;
const costs = kept.map(candidate => lanes.map((lane, laneIndex) => {
if (lane.last < 0)
return 3 + laneIndex * 1e-4;
const gap = x - lane.last;
const predicted = lane.logHz + (gap <= 2 ? lane.velocity : 0);
const pitchCost = Math.abs(Math.log2(candidate.centerHz) - predicted);
const gapCost = Math.min(1.25, Math.max(0, gap - 1) * .035);
const regimeCost = lane.lastRegime === candidate.regime ? 0 :
(lane.lastRegime === 'tonal' && candidate.regime === 'cluster' || lane.lastRegime === 'cluster' && candidate.regime === 'tonal') ? .06 : .16;
const clusterCost = candidate.clusterId && lane.lastCluster && candidate.clusterId !== lane.lastCluster ? .05 : 0;
return pitchCost + gapCost + regimeCost + clusterCost + laneIndex * 1e-6;
}));
const assignments = minimumCostAssignment(costs, laneCount);
for (let c = 0; c < kept.length; c++) {
const laneIndex = assignments[c];
if (laneIndex < 0) {
droppedAnchorCount++;
continue;
}
const lane = lanes[laneIndex], candidate = kept[c], logHz = Math.log2(candidate.centerHz);
lane.velocity = lane.last >= 0 && lane.last === x - 1 ? logHz - lane.logHz : 0;
lane.logHz = logHz;
lane.last = x;
lane.lastRegime = candidate.regime;
lane.lastCluster = candidate.clusterId;
lane.centerRatioCurve[x] = candidate.centerHz / 110;
lane.gainCurve[x] = Math.sqrt(Math.min(1, Math.max(0, candidate.energy)));
lane.bandwidthHzCurve[x] = Math.max(0, Number.isFinite(candidate.bandwidthHz) ? candidate.bandwidthHz : 0);
lane.ridgenessCurve[x] = clamp01(candidate.ridgeness);
lane.continuityCurve[x] = clamp01(candidate.continuity);
lane.transientCurve[x] = transientStrength(candidate);
lane.regimeCurve[x] = candidate.regime;
lane.clusterIdCurve[x] = candidate.clusterId;
representedAnchorCount++;
}
}
let maximumSum = 0;
for (let x = 0; x < width; x++)
maximumSum = Math.max(maximumSum, lanes.reduce((sum, lane) => sum + lane.gainCurve[x], 0));
const scale = maximumSum > .86 ? .86 / maximumSum : 1;
for (const lane of lanes)
for (let x = 0; x < width; x++)
lane.gainCurve[x] *= scale;
for (const lane of lanes) {
const first = lane.gainCurve.findIndex(gain => gain > 0);
let center = first >= 0 ? lane.centerRatioCurve[first] : 1;
let bandwidth = first >= 0 ? lane.bandwidthHzCurve[first] : 0;
let regime = first >= 0 ? lane.regimeCurve[first] : 'tonal';
let ridgeness = first >= 0 ? lane.ridgenessCurve[first] : 0;
let continuity = first >= 0 ? lane.continuityCurve[first] : 0;
let transient = first >= 0 ? lane.transientCurve[first] : 0;
let cluster = first >= 0 ? lane.clusterIdCurve[first] : null;
for (let x = 0; x < width; x++) {
if (lane.gainCurve[x] > 0) {
center = lane.centerRatioCurve[x];
bandwidth = lane.bandwidthHzCurve[x];
regime = lane.regimeCurve[x];
ridgeness = lane.ridgenessCurve[x];
continuity = lane.continuityCurve[x];
transient = lane.transientCurve[x];
cluster = lane.clusterIdCurve[x];
}
else {
lane.centerRatioCurve[x] = center;
lane.bandwidthHzCurve[x] = bandwidth;
lane.regimeCurve[x] = regime;
lane.ridgenessCurve[x] = ridgeness;
lane.continuityCurve[x] = continuity;
lane.transientCurve[x] = transient;
lane.clusterIdCurve[x] = cluster;
}
}
}
const bands = lanes.filter(lane => lane.last >= 0).map(({ logHz, velocity, last, lastRegime, lastCluster, ...band }) => band);
return {
version: 'projection-carrier-plan-f3.3', rootReferenceHz: 110, bands,
sourceAnchorCount: all.length, peakPolyphony, representedAnchorCount, droppedAnchorCount,
};
}
},
