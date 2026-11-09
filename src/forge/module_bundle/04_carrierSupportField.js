"module-source/src/features/l3lab/spectralForge/donorV2/carrierSupportField.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportBinHz = void 0;
exports.buildCarrierSupportPlan = buildCarrierSupportPlan;
exports.supportColumn = supportColumn;
exports.supportRegionAt = supportRegionAt;
exports.supportAmplitude = supportAmplitude;
const carrierContinuity_1 = require("./carrierContinuity");
const supportBinHz = (bin, height) => 20 * 1000 ** (1 - bin / height);
exports.supportBinHz = supportBinHz;
const finiteAmplitude = (v) => Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
function buildCarrierSupportPlan(grid, durationSec) {
const { width, height } = grid;
if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 2 || !(durationSec > 0))
throw new Error("Invalid carrier canvas.");
const values = new Float32Array(width * height), regions = [];
for (let x = 0; x < width; x++) {
const column = grid.getColumn(x);
for (let y = 0; y < height; y++)
values[y * width + x] = finiteAmplitude(column[y] ?? 0);
const spans = [];
for (let y = 0; y < height;) {
if (!(values[y * width + x] > 0)) {
y++;
continue;
}
const first = y;
while (y + 1 < height && values[(y + 1) * width + x] > 0)
y++;
spans.push([first, y++]);
}
const separated = [];
for (const [first, last] of spans) {
let from = first;
for (let y = first + 2; y <= last - 2; y++) {
const v = values[y * width + x];
if (v > values[(y - 1) * width + x] || v >= values[(y + 1) * width + x])
continue;
let left = 0, right = 0;
for (let j = from; j < y; j++)
left = Math.max(left, values[j * width + x]);
for (let j = y + 1; j <= last; j++)
right = Math.max(right, values[j * width + x]);
if (v < Math.min(left, right) * .55) {
separated.push([from, y]);
from = y + 1;
}
}
separated.push([from, last]);
}
regions[x] = separated.map(([firstBin, lastBin]) => {
let sum = 0, logSum = 0, peak = 0;
for (let y = firstBin; y <= lastBin; y++) {
const a = values[y * width + x], e = a * a;
sum += e;
logSum += e * Math.log((0, exports.supportBinHz)(y, height));
peak = Math.max(peak, a);
}
const centerHz = Math.exp(logSum / Math.max(1e-30, sum));
let variance = 0;
for (let y = firstBin; y <= lastBin; y++)
variance += values[y * width + x] ** 2 * Math.log((0, exports.supportBinHz)(y, height) / centerHz) ** 2;
const logSigma = Math.sqrt(variance / Math.max(1e-30, sum));
return { firstBin, lastBin, centerHz, lowHz: (0, exports.supportBinHz)(lastBin + .5, height),
highHz: (0, exports.supportBinHz)(firstBin - .5, height), logSigma, peak,
regime: logSigma <= .075 ? 'tonal' : 'cluster' };
});
}
return (0, carrierContinuity_1.buildContinuousCarrierPlan)({ version: 'carrier-support-field-f3.5', width, height, durationSec, values, regions });
}
function supportColumn(field, fraction) {
return Math.max(0, Math.min(field.width - 1, Math.round(fraction * (field.width - 1))));
}
function supportRegionAt(plan, voice, fraction) {
const field = plan.supportField;
if (!field)
return undefined;
const x = supportColumn(field, fraction), index = plan.bands[voice]?.supportRegionCurve?.[x] ?? -1;
return field.regions[x]?.[index];
}
function supportAmplitude(field, x, hz, region) {
if (!(hz > 0))
return 0;
const y = field.height * (1 - Math.log(hz / 20) / Math.log(1000));
const a = Math.floor(y), f = y - a;
const at = (bin) => bin < 0 || bin >= field.height || region && (bin < region.firstBin || bin > region.lastBin) ? 0 : field.values[bin * field.width + x];
return at(a) * (1 - f) + at(a + 1) * f;
}
},
