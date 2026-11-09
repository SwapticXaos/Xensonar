/**
 * Branch B 5.73 synthetic Root-Follow interpreter.
 *
 * This is intentionally separate from the Branch C interval-window body reader.
 * B_5.73 does not audition Root Follow by replaying the rough rendered body; it
 * converts dense Carrier columns into fewer stretchable synth voices carrying
 * localField pitch/dynamic curves.
 */
import type { LocalFieldModuleState } from '../../canonicalForge/localField';
import type { AnchorBindingPreview, CarrierAnchor, CarrierSpectralSkeleton, DonorTimbreAtlas } from '../types/carrierDonorV2Types';
import type { MaterialAllocationPreview, MaterialCell } from '../types/gestaltMaterialField';
import type { AudioMaterialInterpretationProfile } from '../../../xensonar/audioMaterial/audioMaterialInterpretationProfile';
import type { SpectralForgeV2RootFollowLayerId } from './buildV2RootFollowEvent';
export type SpectralForgeV2IntervalWindowRole = 'body-core' | 'spectral-surface' | 'residual-skin' | 'transient-articulation';
export type SpectralForgeV2RootFollowEmissionMode = 'line_segments' | 'interval_window_body' | 'hybrid';
type WeightedLayer = {
layer: SpectralForgeV2RootFollowLayerId;
weight: number;
};
type LayerWeights = Record<SpectralForgeV2RootFollowLayerId, number>;
type AnchorColumnSample = {
anchor: CarrierAnchor;
layer: SpectralForgeV2RootFollowLayerId;
layerWeight: number;
bindingWeight: number;
allocationWeight: number;
};
export type SpectralForgeV2ColumnProfile = {
timeIndex: number;
anchorCount: number;
bindingCount: number;
allocationCount: number;
totalEnergy: number;
meanEnergy: number;
densityScore: number;
yMinBin: number;
yMaxBin: number;
yCentroidBin: number;
ySpreadBins: number;
layerWeights: LayerWeights;
dominantLayer: SpectralForgeV2RootFollowLayerId;
continuity: number;
roughness: number;
transientness: number;
leakRisk: number;
samples: AnchorColumnSample[];
};
export type SpectralForgeV2IntervalWindow = {
id: string;
startTimeIndex: number;
endTimeIndex: number;
startBeat: number;
endBeat: number;
layer: SpectralForgeV2RootFollowLayerId | 'mixed';
anchorCount: number;
bindingCount: number;
allocationCount: number;
yMinBin: number;
yMaxBin: number;
yCentroidBin: number;
ySpreadBins: number;
energyGraph: number[];
densityGraph: number[];
centroidGraph: number[];
spreadGraph: number[];
frequencyStartHz: number;
frequencyEndHz: number;
frequencyCentroidHz: number;
continuity: number;
roughness: number;
transientness: number;
leakRisk: number;
};
export type SpectralForgeV2WindowEmissionVoice = {
id: string;
windowId: string;
role: SpectralForgeV2IntervalWindowRole;
layer: SpectralForgeV2RootFollowLayerId;
startBeat: number;
durationBeats: number;
centerHz: number;
velocity: number;
gate: number;
localField: LocalFieldModuleState | null;
sourceWindow: SpectralForgeV2IntervalWindow;
};
export type SpectralForgeV2IntervalWindowBodyPlan = {
emissionMode: SpectralForgeV2RootFollowEmissionMode;
columnCount: number;
activeColumnCount: number;
denseColumnCount: number;
activeColumnRatio: number;
denseColumnRatio: number;
windowCount: number;
bodyWindowCount: number;
surfaceWindowCount: number;
residualWindowCount: number;
transientWindowCount: number;
anchorCount: number;
collapsedAnchorCount: number;
compressionRatio: number;
windows: SpectralForgeV2IntervalWindow[];
voices: SpectralForgeV2WindowEmissionVoice[];
};
export type SpectralForgeV2ResolveLayerForAnchor = (args: {
anchor: CarrierAnchor;
allocationCells: Array<{ cellId: string; weight: number }> | undefined;
materialCellMap: Map<string, MaterialCell>;
binding: AnchorBindingPreview | undefined;
donorAtlas: DonorTimbreAtlas | null | undefined;
materialInterpretationProfile?: AudioMaterialInterpretationProfile | null;
}) => WeightedLayer;
export type BuildV2IntervalWindowBodyPlanArgs = {
skeleton: CarrierSpectralSkeleton;
bindingByAnchorId: Map<string, AnchorBindingPreview>;
allocationByTime: Map<number, Array<{ cellId: string; weight: number }>>;
materialCellMap: Map<string, MaterialCell>;
materialAllocationPreview?: MaterialAllocationPreview | null;
donorAtlas: DonorTimbreAtlas | null | undefined;
materialInterpretationProfile?: AudioMaterialInterpretationProfile | null;
resolveLayerForAnchor: SpectralForgeV2ResolveLayerForAnchor;
width: number;
height: number;
totalBeats: number;
beatsPerColumn: number;
baseHz: number;
};
function clamp(value: number, min: number, max: number) {
if (!Number.isFinite(value)) return min;
return Math.max(min, Math.min(max, value));
}
function clampSigned(value: number) {
return clamp(value, -1, 1);
}
function emptyLayerWeights(): LayerWeights {
return { ordered: 0, body: 0, residual: 0, transient: 0 };
}
function dominantLayer(weights: LayerWeights): SpectralForgeV2RootFollowLayerId {
let best: SpectralForgeV2RootFollowLayerId = 'body';
let bestWeight = -Infinity;
(Object.keys(weights) as SpectralForgeV2RootFollowLayerId[]).forEach((layer) => {
if (weights[layer] > bestWeight) {
best = layer;
bestWeight = weights[layer];
}
});
return best;
}
function mean(values: ArrayLike<number>) {
if (!values.length) return 0;
let sum = 0;
for (let index = 0; index < values.length; index += 1) sum += values[index] ?? 0;
return sum / values.length;
}
function weightedMean(entries: Array<{ value: number; weight: number }>, fallback = 0) {
let weighted = 0;
let total = 0;
entries.forEach((entry) => {
const w = Math.max(0, Number.isFinite(entry.weight) ? entry.weight : 0);
weighted += entry.value * w;
total += w;
});
return total > 0.000001 ? weighted / total : fallback;
}
function profileDistance(a: SpectralForgeV2ColumnProfile, b: SpectralForgeV2ColumnProfile, height: number) {
const centroidJump = Math.abs(a.yCentroidBin - b.yCentroidBin) / Math.max(1, height);
const spreadJump = Math.abs(a.ySpreadBins - b.ySpreadBins) / Math.max(1, height);
const energyJump = Math.abs(a.meanEnergy - b.meanEnergy);
const layerJump = a.dominantLayer === b.dominantLayer ? 0 : 0.18;
const transientJump = Math.max(a.transientness, b.transientness) > 0.42 && Math.abs(a.transientness - b.transientness) > 0.22 ? 0.18 : 0;
return centroidJump * 1.9 + spreadJump * 1.25 + energyJump * 0.8 + layerJump + transientJump;
}
function resampleGraph(values: number[], count: number, fallback = 0) {
const targetCount = Math.max(4, Math.round(count));
if (!values.length) return new Array<number>(targetCount).fill(fallback);
if (values.length === 1) return new Array<number>(targetCount).fill(clamp(values[0] ?? fallback, -1, 1));
return new Array<number>(targetCount).fill(0).map((_, index) => {
const t = targetCount <= 1 ? 0 : index / Math.max(1, targetCount - 1);
const pos = t * Math.max(0, values.length - 1);
const left = Math.floor(pos);
const right = Math.min(values.length - 1, left + 1);
const mix = pos - left;
const value = (values[left] ?? fallback) * (1 - mix) + (values[right] ?? values[left] ?? fallback) * mix;
return clamp(value, -1, 1);
});
}
function normalizePositiveGraph(values: number[], count: number) {
const max = Math.max(0.0001, ...values.map((value) => Math.max(0, value)));
return resampleGraph(values.map((value) => clamp(value / max, 0, 1)), count, 0);
}
function buildLocalFieldFromWindow(args: {
id: string;
energyGraph: number[];
densityGraph: number[];
centroidGraph: number[];
spreadGraph: number[];
role: SpectralForgeV2IntervalWindowRole;
}): LocalFieldModuleState {
const resolution = 96;
const energy = resampleGraph(args.energyGraph, resolution, 0);
const density = resampleGraph(args.densityGraph, resolution, 0);
const centroid = resampleGraph(args.centroidGraph, resolution, 0);
const spread = resampleGraph(args.spreadGraph, resolution, 0);
const dynamicCurve = new Array<number>(resolution).fill(0).map((_, index) => {
const body = ((energy[index] ?? 0) * 0.62 + (density[index] ?? 0) * 0.28 + (spread[index] ?? 0) * 0.1) * 2 - 1;
const roleBias = args.role === 'residual-skin' ? -0.18 : args.role === 'spectral-surface' ? -0.08 : 0;
return clampSigned(body * 0.38 + roleBias);
});
const pitchCurve = new Array<number>(resolution).fill(0).map((_, index) => {
const centroidMove = clampSigned(centroid[index] ?? 0) * 0.13;
const spreadBreath = clampSigned((spread[index] ?? 0) - 0.5) * 0.025;
return clampSigned(centroidMove + spreadBreath);
});
const slot = (curve: number[]) => ({
edgeHandles: { left: clampSigned(curve[0] ?? 0), right: clampSigned(curve[curve.length - 1] ?? 0) },
deformation: {
resolution,
curve,
interior: [...curve],
xOffsets: new Array<number>(resolution).fill(0),
smoothing: 0.5,
},
});
return {
id: args.id,
geometryKind: 'linear-strip',
interpreterKind: 'dynamic-fade',
enabled: true,
bypassed: false,
referenceLevel: 0,
range: { startRatio: 0, endRatio: 1 },
edgeHandles: { left: clampSigned(dynamicCurve[0] ?? 0), right: clampSigned(dynamicCurve[dynamicCurve.length - 1] ?? 0) },
baseCurve: { kind: 'smooth' },
deformation: {
resolution,
curve: dynamicCurve,
interior: [...dynamicCurve],
xOffsets: new Array<number>(resolution).fill(0),
smoothing: 0.5,
},
targetSlots: {
'dynamic-fade': slot(dynamicCurve),
'pitch-elastic': slot(pitchCurve),
},
};
}
function buildColumnProfiles(args: BuildV2IntervalWindowBodyPlanArgs): SpectralForgeV2ColumnProfile[] {
const profiles: SpectralForgeV2ColumnProfile[] = [];
for (let timeIndex = 0; timeIndex < args.width; timeIndex += 1) {
const samples: AnchorColumnSample[] = [];
const anchors = args.skeleton.anchorsByTime[timeIndex] ?? [];
const allocationCells = args.allocationByTime.get(timeIndex);
for (const anchor of anchors) {
if (anchor.energy <= 0.003 || !Number.isFinite(anchor.centerHz) || anchor.centerHz <= 20) continue;
const binding = args.bindingByAnchorId.get(anchor.id);
const resolved = args.resolveLayerForAnchor({
anchor,
allocationCells,
materialCellMap: args.materialCellMap,
binding,
donorAtlas: args.donorAtlas,
materialInterpretationProfile: args.materialInterpretationProfile,
});
const bindingWeight = binding ? Math.max(0.05, mean(binding.weights ?? [])) : 0;
const allocationWeight = allocationCells?.length ? mean(allocationCells.map((entry) => entry.weight)) : 0;
samples.push({
anchor,
layer: resolved.layer,
layerWeight: resolved.weight,
bindingWeight,
allocationWeight,
});
}
const layerWeights = emptyLayerWeights();
samples.forEach((sample) => {
layerWeights[sample.layer] += Math.max(0.001, sample.anchor.energy * sample.layerWeight);
});
const anchorCount = samples.length;
const bindingCount = samples.filter((sample) => sample.bindingWeight > 0).length;
const allocationCount = allocationCells?.length ?? 0;
const totalEnergy = samples.reduce((sum, sample) => sum + sample.anchor.energy, 0);
const weightedBins = samples.map((sample) => ({ value: sample.anchor.centerBin, weight: Math.max(0.001, sample.anchor.energy * sample.layerWeight) }));
const centroid = weightedMean(weightedBins, args.height * 0.5);
const spread = anchorCount
? Math.sqrt(weightedMean(samples.map((sample) => ({ value: Math.pow(sample.anchor.centerBin - centroid, 2), weight: Math.max(0.001, sample.anchor.energy) })), 0))
: 0;
const continuity = anchorCount ? weightedMean(samples.map((sample) => ({ value: sample.anchor.continuity, weight: sample.anchor.energy })), 0) : 0;
const roughness = anchorCount ? weightedMean(samples.map((sample) => ({ value: 1 - sample.anchor.ridgeness, weight: sample.anchor.energy })), 0) : 0;
const transientness = anchorCount ? weightedMean(samples.map((sample) => ({ value: sample.anchor.regime === 'transient' ? 1 : 0, weight: sample.anchor.energy })), 0) : 0;
const leakRisk = anchorCount ? clamp(0.16 + roughness * 0.34 + transientness * 0.24 - continuity * 0.18, 0, 1) : 0;
const bindingBias = bindingCount > 0 ? 1.08 : 0.82;
const allocationBias = allocationCount > 0 ? 1.08 : 0.94;
const densityScore = anchorCount
? Math.log1p(anchorCount) * Math.max(0.001, totalEnergy / anchorCount) * (0.56 + continuity * 0.44) * bindingBias * allocationBias
: 0;
profiles.push({
timeIndex,
anchorCount,
bindingCount,
allocationCount,
totalEnergy,
meanEnergy: anchorCount ? totalEnergy / anchorCount : 0,
densityScore,
yMinBin: anchorCount ? Math.min(...samples.map((sample) => sample.anchor.centerBin)) : 0,
yMaxBin: anchorCount ? Math.max(...samples.map((sample) => sample.anchor.centerBin)) : 0,
yCentroidBin: centroid,
ySpreadBins: spread,
layerWeights,
dominantLayer: dominantLayer(layerWeights),
continuity,
roughness,
transientness,
leakRisk,
samples,
});
}
return profiles;
}
function denseThreshold(profiles: SpectralForgeV2ColumnProfile[]) {
const positive = profiles.map((profile) => profile.densityScore).filter((score) => score > 0).sort((a, b) => a - b);
if (!positive.length) return 1;
const median = positive[Math.floor(positive.length * 0.5)] ?? positive[0] ?? 0;
const p35 = positive[Math.floor(positive.length * 0.35)] ?? median;
return Math.max(0.018, Math.min(median * 0.72, p35 * 0.95));
}
function splitDenseRuns(args: {
profiles: SpectralForgeV2ColumnProfile[];
threshold: number;
width: number;
height: number;
totalBeats: number;
}) {
const minWindowColumns = Math.max(2, Math.round(args.width / Math.max(24, args.totalBeats * 12)));
const maxGapColumns = Math.max(1, Math.round(args.width / Math.max(64, args.totalBeats * 24)));
const regions: SpectralForgeV2ColumnProfile[][] = [];
let current: SpectralForgeV2ColumnProfile[] = [];
let gap = 0;
const flush = () => {
if (current.length >= minWindowColumns) regions.push(current);
current = [];
gap = 0;
};
args.profiles.forEach((profile) => {
const dense = profile.anchorCount > 0 && profile.densityScore >= args.threshold;
if (dense) {
current.push(profile);
gap = 0;
} else if (current.length && gap < maxGapColumns && profile.anchorCount > 0) {
current.push(profile);
gap += 1;
} else if (current.length) {
flush();
}
});
flush();
const windows: SpectralForgeV2ColumnProfile[][] = [];
for (const region of regions) {
let chunk: SpectralForgeV2ColumnProfile[] = [];
let last: SpectralForgeV2ColumnProfile | null = null;
for (const profile of region) {
const distance = last ? profileDistance(last, profile, args.height) : 0;
const localValley = last
? profile.densityScore < Math.max(0.016, mean(chunk.slice(-4).map((entry) => entry.densityScore)) * 0.42)
: false;
const shouldSplit = chunk.length >= minWindowColumns
&& (distance > 0.28 || localValley || (last?.dominantLayer !== profile.dominantLayer && profile.transientness > 0.35));
if (shouldSplit) {
windows.push(chunk);
chunk = [];
}
chunk.push(profile);
last = profile;
}
if (chunk.length >= minWindowColumns) windows.push(chunk);
}
return windows;
}
function layerFromProfiles(profiles: SpectralForgeV2ColumnProfile[]): SpectralForgeV2IntervalWindow['layer'] {
const totals = emptyLayerWeights();
profiles.forEach((profile) => {
(Object.keys(totals) as SpectralForgeV2RootFollowLayerId[]).forEach((layer) => {
totals[layer] += profile.layerWeights[layer];
});
});
const sorted = (Object.keys(totals) as SpectralForgeV2RootFollowLayerId[]).sort((a, b) => totals[b] - totals[a]);
const first = sorted[0] ?? 'body';
const second = sorted[1] ?? 'ordered';
const total = Math.max(0.001, totals.ordered + totals.body + totals.residual + totals.transient);
if ((totals[first] ?? 0) / total < 0.54 && (totals[second] ?? 0) / total > 0.22) return 'mixed';
return first;
}
function weightedFrequencyFromProfiles(profiles: SpectralForgeV2ColumnProfile[], baseHz: number) {
const entries: Array<{ value: number; weight: number }> = [];
profiles.forEach((profile) => {
profile.samples.forEach((sample) => {
entries.push({ value: clamp(sample.anchor.centerHz, 20, 12000), weight: sample.anchor.energy * sample.layerWeight });
});
});
return clamp(weightedMean(entries, baseHz), 20, 12000);
}
function buildWindowFromProfiles(args: {
profiles: SpectralForgeV2ColumnProfile[];
index: number;
totalBeats: number;
beatsPerColumn: number;
height: number;
baseHz: number;
}): SpectralForgeV2IntervalWindow | null {
const profiles = args.profiles.filter((profile) => profile.anchorCount > 0);
if (!profiles.length) return null;
const start = profiles[0]!;
const end = profiles[profiles.length - 1]!;
const anchorCount = profiles.reduce((sum, profile) => sum + profile.anchorCount, 0);
const bindingCount = profiles.reduce((sum, profile) => sum + profile.bindingCount, 0);
const allocationCount = profiles.reduce((sum, profile) => sum + profile.allocationCount, 0);
const centroidMean = weightedMean(profiles.map((profile) => ({ value: profile.yCentroidBin, weight: Math.max(0.001, profile.totalEnergy) })), args.height * 0.5);
const spreadMean = weightedMean(profiles.map((profile) => ({ value: profile.ySpreadBins, weight: Math.max(0.001, profile.totalEnergy) })), 0);
const graphCount = Math.max(16, Math.min(96, Math.round(profiles.length / 2)));
const energyGraph = normalizePositiveGraph(profiles.map((profile) => profile.totalEnergy), graphCount);
const densityGraph = normalizePositiveGraph(profiles.map((profile) => profile.densityScore), graphCount);
const maxCentroidDeviation = Math.max(4, args.height * 0.16);
const centroidGraph = resampleGraph(profiles.map((profile) => clampSigned((profile.yCentroidBin - centroidMean) / maxCentroidDeviation)), graphCount, 0);
const spreadDenom = Math.max(2, args.height * 0.22);
const spreadGraph = resampleGraph(profiles.map((profile) => clamp(profile.ySpreadBins / spreadDenom, 0, 1)), graphCount, 0);
const firstFreq = weightedFrequencyFromProfiles([start], args.baseHz);
const endFreq = weightedFrequencyFromProfiles([end], args.baseHz);
const centroidFreq = weightedFrequencyFromProfiles(profiles, args.baseHz);
return {
id: `sf-v2-window-${args.index}-${start.timeIndex}-${end.timeIndex}`,
startTimeIndex: start.timeIndex,
endTimeIndex: end.timeIndex,
startBeat: clamp(start.timeIndex * args.beatsPerColumn, 0, args.totalBeats),
endBeat: clamp((end.timeIndex + 1) * args.beatsPerColumn, 0, args.totalBeats),
layer: layerFromProfiles(profiles),
anchorCount,
bindingCount,
allocationCount,
yMinBin: Math.min(...profiles.map((profile) => profile.yMinBin)),
yMaxBin: Math.max(...profiles.map((profile) => profile.yMaxBin)),
yCentroidBin: centroidMean,
ySpreadBins: spreadMean,
energyGraph,
densityGraph,
centroidGraph,
spreadGraph,
frequencyStartHz: firstFreq,
frequencyEndHz: endFreq,
frequencyCentroidHz: centroidFreq,
continuity: clamp(weightedMean(profiles.map((profile) => ({ value: profile.continuity, weight: profile.totalEnergy })), 0), 0, 1),
roughness: clamp(weightedMean(profiles.map((profile) => ({ value: profile.roughness, weight: profile.totalEnergy })), 0), 0, 1),
transientness: clamp(weightedMean(profiles.map((profile) => ({ value: profile.transientness, weight: profile.totalEnergy })), 0), 0, 1),
leakRisk: clamp(weightedMean(profiles.map((profile) => ({ value: profile.leakRisk, weight: profile.totalEnergy })), 0), 0, 1),
};
}
function voiceLayerForWindow(window: SpectralForgeV2IntervalWindow): SpectralForgeV2RootFollowLayerId {
if (window.layer === 'mixed') return window.transientness > 0.44 ? 'transient' : window.roughness > 0.54 ? 'residual' : 'body';
return window.layer;
}
function windowVelocity(window: SpectralForgeV2IntervalWindow, role: SpectralForgeV2IntervalWindowRole) {
const density = mean(window.densityGraph);
const energy = mean(window.energyGraph);
const base = 0.18 + energy * 0.34 + density * 0.18 + window.continuity * 0.12 + Math.min(0.14, Math.log1p(window.anchorCount) * 0.028);
const roleScale = role === 'body-core' ? 1 : role === 'spectral-surface' ? 0.58 : role === 'residual-skin' ? 0.42 : 0.34;
return clamp(base * roleScale, 0.05, role === 'body-core' ? 0.88 : 0.56);
}
function makeVoice(window: SpectralForgeV2IntervalWindow, role: SpectralForgeV2IntervalWindowRole, index: number): SpectralForgeV2WindowEmissionVoice {
const baseLayer = voiceLayerForWindow(window);
const layer: SpectralForgeV2RootFollowLayerId = role === 'spectral-surface'
? (baseLayer === 'transient' ? 'ordered' : baseLayer)
: role === 'residual-skin'
? 'residual'
: role === 'transient-articulation'
? 'transient'
: baseLayer === 'transient'
? 'body'
: baseLayer;
const durationBeats = Math.max(0.0625, window.endBeat - window.startBeat);
const localField = role === 'transient-articulation'
? null
: buildLocalFieldFromWindow({
id: `sf-v2-local-field-${window.id}-${role}`,
energyGraph: window.energyGraph,
densityGraph: window.densityGraph,
centroidGraph: window.centroidGraph,
spreadGraph: window.spreadGraph,
role,
});
return {
id: `sf-v2-window-voice-${window.id}-${role}-${index}`,
windowId: window.id,
role,
layer,
startBeat: window.startBeat,
durationBeats,
centerHz: clamp(window.frequencyCentroidHz, 20, 12000),
velocity: windowVelocity(window, role),
gate: role === 'transient-articulation' ? 0.54 : role === 'residual-skin' ? 0.86 : 1,
localField,
sourceWindow: window,
};
}
function buildVoices(windows: SpectralForgeV2IntervalWindow[]): SpectralForgeV2WindowEmissionVoice[] {
const voices: SpectralForgeV2WindowEmissionVoice[] = [];
windows.forEach((window) => {
const duration = window.endBeat - window.startBeat;
if (duration <= 0.001) return;
if (window.transientness > 0.58 && duration < 0.35) {
voices.push(makeVoice(window, 'transient-articulation', voices.length));
return;
}
voices.push(makeVoice(window, 'body-core', voices.length));
if (window.ySpreadBins >= 9 && window.continuity >= 0.35 && duration >= 0.25) {
voices.push(makeVoice(window, 'spectral-surface', voices.length));
}
if ((window.roughness >= 0.48 || window.layer === 'residual' || window.layer === 'mixed') && duration >= 0.4) {
voices.push(makeVoice(window, 'residual-skin', voices.length));
}
if (window.transientness > 0.36 && voices.filter((voice) => voice.role === 'transient-articulation').length < 12) {
const articulation = makeVoice(window, 'transient-articulation', voices.length);
articulation.durationBeats = clamp(Math.min(0.18, duration * 0.35), 0.0625, duration);
articulation.startBeat = window.startBeat;
voices.push(articulation);
}
});
return voices;
}
export function buildBranchB573SynthWindowBodyPlan(args: BuildV2IntervalWindowBodyPlanArgs): SpectralForgeV2IntervalWindowBodyPlan {
const profiles = buildColumnProfiles(args);
const threshold = denseThreshold(profiles);
const denseRuns = splitDenseRuns({
profiles,
threshold,
width: args.width,
height: args.height,
totalBeats: args.totalBeats,
});
const windows = denseRuns
.map((profilesForWindow, index) => buildWindowFromProfiles({
profiles: profilesForWindow,
index,
totalBeats: args.totalBeats,
beatsPerColumn: args.beatsPerColumn,
height: args.height,
baseHz: args.baseHz,
}))
.filter((window): window is SpectralForgeV2IntervalWindow => Boolean(window));
const voices = buildVoices(windows);
const anchorCount = profiles.reduce((sum, profile) => sum + profile.anchorCount, 0);
const collapsedAnchorCount = windows.reduce((sum, window) => sum + window.anchorCount, 0);
const denseColumnCount = profiles.filter((profile) => profile.anchorCount > 0 && profile.densityScore >= threshold).length;
const activeColumnCount = profiles.filter((profile) => profile.anchorCount > 0).length;
const hasDenseBody = denseColumnCount >= Math.max(3, Math.round(args.width * 0.08)) && collapsedAnchorCount >= Math.max(12, anchorCount * 0.18);
const emissionMode: SpectralForgeV2RootFollowEmissionMode = hasDenseBody && voices.length > 0 ? 'interval_window_body' : 'line_segments';
const roleCounts = voices.reduce((acc, voice) => {
acc[voice.role] = (acc[voice.role] ?? 0) + 1;
return acc;
}, {} as Record<SpectralForgeV2IntervalWindowRole, number>);
return {
emissionMode,
columnCount: args.width,
activeColumnCount,
denseColumnCount,
activeColumnRatio: clamp(activeColumnCount / Math.max(1, args.width), 0, 1),
denseColumnRatio: clamp(denseColumnCount / Math.max(1, args.width), 0, 1),
windowCount: windows.length,
bodyWindowCount: roleCounts['body-core'] ?? 0,
surfaceWindowCount: roleCounts['spectral-surface'] ?? 0,
residualWindowCount: roleCounts['residual-skin'] ?? 0,
transientWindowCount: roleCounts['transient-articulation'] ?? 0,
anchorCount,
collapsedAnchorCount,
compressionRatio: voices.length > 0 ? collapsedAnchorCount / Math.max(1, voices.length) : 0,
windows,
voices,
};
}