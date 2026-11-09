import { snapMaterialElasticSourceStartToMicroCut } from '../../l3lab/canonicalForge/canonicalPreviewMaterialElastic';
import { clamp } from '../rooms/resonanceRuntimeMath';
import type { RootFollowGranularRenderTuning } from './rootFollowGranularSettings';
import { buildRootFollowLocalPitchSemitoneCurve, type RootFollowLocalField, } from './rootFollowLocalFieldAutomation';
export type RootFollowSampleElasticQuality = 'base' | 'fragment';
export type RootFollowSampleElasticMode = 'flowing' | 'grainy';
export const ROOT_FOLLOW_SAMPLE_WINDOW_CURVE = new Float32Array(Array.from({ length: 160 }, (_, index) => {
    const phase = index / 159;
    return phase <= 0 || phase >= 1 ? 0 : Math.max(0, 0.5 - 0.5 * Math.cos(Math.PI * 2 * phase));
}));
export const ROOT_FOLLOW_SAMPLE_ELASTIC_MIN_RATE = 0.16;
export const ROOT_FOLLOW_SAMPLE_ELASTIC_MAX_RATE = 9.5;
export type RootFollowSampleElasticGrainPlan = {
    index: number;
    when: number;
    elasticRate: number;
    srcStart: number;
    actualGrainOut: number;
    bufferDurationArg: number;
};
export type RootFollowSampleElasticSegmentPlan = {
    segmentDuration: number;
    grainDurOut: number;
    grainSpacing: number;
    jitterRatio: number;
    rawGrainCount: number;
    maxGrains: number;
    grainCount: number;
    scheduleSpacing: number;
    sourceStart: number;
    sourceEnd: number;
    usableSlice: number;
    grains: RootFollowSampleElasticGrainPlan[];
};
export function buildRootFollowSampleElasticSettings(args: {
    playbackRate: number;
    nominalDur: number;
    quality: RootFollowSampleElasticQuality;
    mode: RootFollowSampleElasticMode;
    tuning?: RootFollowGranularRenderTuning | null;
}) {
    const safeRate = clamp(args.playbackRate, ROOT_FOLLOW_SAMPLE_ELASTIC_MIN_RATE, ROOT_FOLLOW_SAMPLE_ELASTIC_MAX_RATE);
    const pitchStretch = Math.abs(Math.log2(Math.max(0.0001, safeRate)));
    const isFragment = args.quality === 'fragment' || args.mode === 'grainy';
    const baseWindow = args.mode === 'grainy' ? 0.052 : (isFragment ? 0.078 : 0.104);
    const dynamicShrink = args.mode === 'grainy' ? 0.0105 : (isFragment ? 0.009 : 0.007);
    const dynamicGrow = pitchStretch > 1.25 ? (pitchStretch - 1.25) * (isFragment ? 0.006 : 0.004) : 0;
    const grainWindowScale = clamp(args.tuning?.grainWindowScale ?? 1, 0.48, 1.8);
    const grainSpacingScale = clamp(args.tuning?.grainSpacingScale ?? 1, 0.25, 2.4);
    const jitterScale = clamp(args.tuning?.jitterScale ?? 1, 0, 3.5);
    const grainDurOut = clamp((baseWindow - pitchStretch * dynamicShrink + dynamicGrow + args.nominalDur * (args.mode === 'grainy' ? 0.052 : (isFragment ? 0.092 : 0.104))) * grainWindowScale, (args.mode === 'grainy' ? 0.032 : (isFragment ? 0.05 : 0.07)) * Math.min(1, grainWindowScale), (args.mode === 'grainy' ? 0.118 : (isFragment ? 0.165 : 0.19)) * Math.max(1, grainWindowScale));
    const overlapRatio = args.mode === 'grainy' ? 0.76 : 0.5;
    const requestedSpacing = Math.max(args.mode === 'grainy' ? 0.008 : 0.004, grainDurOut * (1 - overlapRatio) * grainSpacingScale);
    // Integer overlaps keep the summed Hann envelope flat for flowing material.
    const grainSpacing = args.mode === 'grainy' ? requestedSpacing : grainDurOut / Math.max(2, Math.ceil(grainDurOut / requestedSpacing));
    const jitterRatio = (args.mode === 'grainy' ? 0.018 : (isFragment ? 0.008 : 0.003)) * jitterScale;
    return { safeRate, grainDurOut, grainSpacing, jitterRatio };
}
export function buildRootFollowSampleElasticSegmentPlan(args: {
    buffer: AudioBuffer;
    noteStart: number;
    noteDuration: number;
    segmentStart: number;
    segmentEnd: number;
    safeOffsetSec: number;
    sliceDurationSec: number;
    basePlaybackRate: number;
    localField: RootFollowLocalField;
    pitchEnvelope?: RootFollowLocalField;
    pitchCurves?: readonly Float32Array[];
    quality: RootFollowSampleElasticQuality;
    mode: RootFollowSampleElasticMode;
    tuning?: RootFollowGranularRenderTuning | null;
}): RootFollowSampleElasticSegmentPlan | null {
    const { buffer, noteStart, noteDuration, segmentStart, segmentEnd, safeOffsetSec, sliceDurationSec, basePlaybackRate, localField, quality, mode, tuning = null, } = args;
    const segmentDuration = Math.max(0, segmentEnd - segmentStart);
    if (segmentDuration <= 0.0001 || noteDuration <= 0.006 || sliceDurationSec <= 0.006)
        return null;
    const { grainDurOut, grainSpacing, jitterRatio } = buildRootFollowSampleElasticSettings({
        playbackRate: 1, nominalDur: noteDuration, quality, mode, tuning,
    });
    // One note-owned lattice. Scheduler window boundaries never end a sounding grain.
    // The 120ms budget basis is fixed so a delayed control tick cannot change lattice spacing.
    const maxGrains = Math.max(1, Math.round(tuning?.maxGrains ?? 64));
    const scheduleSpacing = Math.max(grainSpacing, 0.12 / maxGrains);
    const firstIndex = Math.max(0, Math.ceil((segmentStart - noteStart - 1e-7) / scheduleSpacing));
    const sourceStart = safeOffsetSec;
    const sourceEnd = Math.min(buffer.duration, safeOffsetSec + sliceDurationSec);
    const usableSlice = sourceEnd - sourceStart;
    const pitchCurves = args.pitchCurves ?? [localField, args.pitchEnvelope].map(field => buildRootFollowLocalPitchSemitoneCurve(field)).filter(c => c !== null);
    const grains: RootFollowSampleElasticGrainPlan[] = [];
    for (let index = firstIndex; grains.length < maxGrains + 1; index++) {
        const when = noteStart + index * scheduleSpacing;
        if (when >= segmentEnd - 1e-7 || when >= noteStart + noteDuration - 0.003)
            break;
        const progress = clamp((when - noteStart) / noteDuration, 0, 1);
        let semitones = 0;
        for (const curve of pitchCurves) {
            const position = progress * (curve.length - 1), left = Math.floor(position);
            semitones += curve[left] + (curve[Math.min(left + 1, curve.length - 1)] - curve[left]) * (position - left);
        }
        const elasticRate = clamp(basePlaybackRate * Math.pow(2, semitones / 12), ROOT_FOLLOW_SAMPLE_ELASTIC_MIN_RATE, ROOT_FOLLOW_SAMPLE_ELASTIC_MAX_RATE);
        const actualGrainOut = Math.min(grainDurOut, noteStart + noteDuration - when);
        const sourceRead = actualGrainOut * elasticRate;
        const maxSrcStart = Math.max(sourceStart, sourceEnd - sourceRead);
        const jitter = mode === 'grainy' ? Math.sin(index * 1.618) * grainDurOut * jitterRatio : 0;
        const requestedSec = clamp(safeOffsetSec + sliceDurationSec * progress + jitter, sourceStart, maxSrcStart);
        const srcStart = tuning?.microCutSafety && mode === 'grainy'
            ? snapMaterialElasticSourceStartToMicroCut({ buffer, requestedSec, minSec: sourceStart, maxSec: maxSrcStart, searchRadiusSec: (tuning.microCutSearchRadiusMs ?? 4) / 1000 })
            : requestedSec;
        grains.push({ index, when, elasticRate, srcStart, actualGrainOut,
            bufferDurationArg: Math.min(sourceEnd - srcStart, sourceRead) });
    }
    return { segmentDuration, grainDurOut, grainSpacing, jitterRatio,
        rawGrainCount: Math.ceil(segmentDuration / scheduleSpacing), maxGrains,
        grainCount: grains.length, scheduleSpacing, sourceStart, sourceEnd, usableSlice, grains };
}
