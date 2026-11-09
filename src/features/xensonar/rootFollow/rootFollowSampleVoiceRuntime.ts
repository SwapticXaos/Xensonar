import type { SamplePlaybackDef } from '../../l3lab/canonicalForge/canonicalPreviewContracts';
import { resolveSamplePlaybackProfile } from '../../soundLibrary/samplePlaybackProfile';
import { recordAudioPressureCount } from '../../../core/audio/audioPressureMap';
import { clamp } from '../rooms/resonanceRuntimeMath';
import type { RootFollowSynthNoteClass } from './rootFollowTypes';
import type { RootFollowGranularRenderTuning } from './rootFollowGranularSettings';
import { compileRootFollowGainSampler, buildRootFollowLocalPitchSemitoneCurve, type RootFollowLocalField } from './rootFollowLocalFieldAutomation';
import { buildRootFollowSampleElasticSegmentPlan, ROOT_FOLLOW_SAMPLE_WINDOW_CURVE } from './rootFollowSampleElasticPlan';
import type { RootFollowAudioNodeRegistrar } from './rootFollowAudioNodeRegistry';
type SampleSession = {
    output: StereoPannerNode;
    end: number;
    tuning: RootFollowGranularRenderTuning | null;
    quality: 'base' | 'fragment';
    mode: 'flowing' | 'grainy';
    pitchCurves: Float32Array[];
    gainAt: (progress: number) => number;
};
const sampleSessions = new WeakMap<GainNode, Map<string, SampleSession>>();
export type RootFollowSampleDirectBodyArgs = {
    noteId?: string;
    ctx: AudioContext;
    destination: GainNode;
    registerNode: RootFollowAudioNodeRegistrar;
    resolved: SamplePlaybackDef;
    peak?: number;
    fadeInSec?: number;
    fadeOutSec?: number;
    materialPitchMode?: string | null;
    noteStart: number;
    noteDuration: number;
    baseFrequency: number;
    targetFrequency: number;
    trackPan: number;
    noteClass: RootFollowSynthNoteClass;
    materialAnchorHz?: number | null;
    sampleOffsetSec?: number | null;
    samplePlaybackDurationSec?: number | null;
    localField?: RootFollowLocalField;
    renderStart?: number | null;
    renderEnd?: number | null;
    granulationMode: 'flowing' | 'grainy';
    granularQualityMode: 'base' | 'fragment';
    granularTuning?: RootFollowGranularRenderTuning | null;
};
function scheduleRootFollowSampleElasticSegment(args: {
    ctx: AudioContext;
    destination: GainNode;
    registerNode: RootFollowAudioNodeRegistrar;
    buffer: AudioBuffer;
    noteId?: string;
    peak: number;
    fadeInSec: number;
    fadeOutSec: number;
    volumeEnvelope: RootFollowLocalField;
    pitchEnvelope: RootFollowLocalField;
    noteStart: number;
    noteDuration: number;
    segmentStart: number;
    segmentEnd: number;
    safeOffsetSec: number;
    sliceDurationSec: number;
    basePlaybackRate: number;
    localField: RootFollowLocalField;
    trackPan: number;
    quality: 'base' | 'fragment';
    mode: 'flowing' | 'grainy';
    tuning?: RootFollowGranularRenderTuning | null;
}) {
    const { ctx, destination, registerNode, buffer, noteStart, noteDuration, segmentStart, segmentEnd, safeOffsetSec, sliceDurationSec, basePlaybackRate, localField, trackPan, quality, mode, tuning = null, } = args;
    let sessions = sampleSessions.get(destination);
    if (!sessions) {
        sessions = new Map();
        sampleSessions.set(destination, sessions);
    }
    for (const [key, session] of sessions)
        if (session.end < ctx.currentTime)
            sessions.delete(key);
    const key = `${args.noteId ?? 'sample'}@${noteStart}`;
    let session = sessions.get(key);
    const plan = buildRootFollowSampleElasticSegmentPlan({
        buffer,
        noteStart,
        noteDuration,
        segmentStart,
        segmentEnd,
        safeOffsetSec,
        sliceDurationSec,
        basePlaybackRate,
        localField,
        pitchEnvelope: args.pitchEnvelope,
        pitchCurves: session?.pitchCurves,
        quality: session?.quality ?? quality,
        mode: session?.mode ?? mode,
        tuning: session?.tuning ?? tuning,
    });
    if (!plan)
        return;
    if (!session) {
        const output = ctx.createStereoPanner();
        output.pan.setValueAtTime(clamp(trackPan, -1, 1), segmentStart);
        output.connect(destination);
        session = {
            output, end: noteStart + noteDuration + 0.05, tuning, quality, mode,
            pitchCurves: [localField, args.pitchEnvelope].map(field => buildRootFollowLocalPitchSemitoneCurve(field)).filter(c => c !== null),
            gainAt: compileRootFollowGainSampler([args.volumeEnvelope, localField]),
        };
        sessions.set(key, session);
        registerNode({ node: output, cleanupDelayMs: Math.max(300, (session.end - ctx.currentTime + 0.1) * 1000) });
    }
    const sampleGain = session.gainAt;
    let actualStartedGrains = 0;
    for (const grain of plan.grains) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.setValueAtTime(grain.elasticRate, grain.when);
        const grainGain = ctx.createGain();
        grainGain.gain.setValueCurveAtTime(Float32Array.from(ROOT_FOLLOW_SAMPLE_WINDOW_CURVE, (value, index) => {
            const time = grain.when - noteStart + index / (ROOT_FOLLOW_SAMPLE_WINDOW_CURVE.length - 1) * grain.actualGrainOut;
            const fade = Math.min(1, time / Math.max(0.003, args.fadeInSec), (noteDuration - time) / Math.max(0.006, args.fadeOutSec));
            return value * Math.min(1, 2 * plan.scheduleSpacing / plan.grainDurOut) * args.peak * Math.max(0, fade) * sampleGain(time / noteDuration);
        }), grain.when, grain.actualGrainOut);
        source.connect(grainGain);
        grainGain.connect(session.output);
        source.start(grain.when, grain.srcStart, grain.bufferDurationArg);
        source.stop(grain.when + grain.actualGrainOut + 0.002);
        registerNode({ node: source });
        registerNode({ node: grainGain, cleanupDelayMs: Math.max(300, (grain.when + grain.actualGrainOut - ctx.currentTime + 0.1) * 1000) });
        actualStartedGrains += 1;
    }
    if (actualStartedGrains > 0) {
        recordAudioPressureCount('root-follow-sample-grain', 'buffer-source-start', actualStartedGrains);
        recordAudioPressureCount('root-follow-sample-grain', 'gain-node-create', actualStartedGrains);
    }
}
export function scheduleRootFollowSampleDirectBody(args: RootFollowSampleDirectBodyArgs) {
    const { ctx, destination, registerNode, resolved, noteStart, noteDuration, baseFrequency, targetFrequency, trackPan, noteClass, materialAnchorHz = null, sampleOffsetSec = null, samplePlaybackDurationSec = null, localField = null, renderStart = null, renderEnd = null, granulationMode, granularQualityMode, granularTuning = null, } = args;
    const segmentStart = Math.max(noteStart, Number.isFinite(renderStart ?? NaN) ? Number(renderStart) : noteStart);
    const segmentEnd = Math.min(noteStart + noteDuration, Number.isFinite(renderEnd ?? NaN)
        ? Number(renderEnd)
        : noteStart + noteDuration);
    if (segmentEnd <= segmentStart + 0.004)
        return;
    const sourceBaseHz = Math.max(1, materialAnchorHz ?? resolved.baseHz ?? baseFrequency);
    const requestedOffsetSec = Number.isFinite(sampleOffsetSec ?? NaN)
        ? Math.max(0, Number(sampleOffsetSec))
        : 0;
    const safeOffsetSec = clamp(requestedOffsetSec, 0, Math.max(0, resolved.buffer.duration - 0.012));
    const bufferRemainingSec = Math.max(0.006, resolved.buffer.duration - safeOffsetSec);
    const requestedSliceDurationSec = Number.isFinite(samplePlaybackDurationSec ?? NaN)
        ? Math.max(0.006, Number(samplePlaybackDurationSec))
        : null;
    const naturalSliceDurationSec = Math.max(0.006, Math.min(bufferRemainingSec, requestedSliceDurationSec ??
        resolved.playbackDurationSec ??
        bufferRemainingSec));
    const playbackProfile = resolveSamplePlaybackProfile({
        loaded: resolved,
        targetHz: targetFrequency,
        minRate: 0.125,
        maxRate: 8,
        fallbackHz: sourceBaseHz,
        requestedDurationSec: noteDuration,
    });
    const basePlaybackRate = clamp(targetFrequency / sourceBaseHz, 0.125, 8) ||
        playbackProfile.playbackRate;
    const quality = noteClass === 'material-fragment' ? 'fragment' : granularQualityMode;
    scheduleRootFollowSampleElasticSegment({
        ctx,
        destination,
        registerNode,
        buffer: resolved.buffer,
        noteId: args.noteId,
        noteStart,
        noteDuration,
        segmentStart,
        segmentEnd,
        safeOffsetSec,
        sliceDurationSec: naturalSliceDurationSec,
        basePlaybackRate: args.materialPitchMode === 'source-fixed' ? 1 : basePlaybackRate,
        peak: Math.max(0, args.peak ?? 1),
        fadeInSec: args.fadeInSec ?? 0,
        fadeOutSec: args.fadeOutSec ?? 0,
        volumeEnvelope: resolved.volumeEnvelope,
        pitchEnvelope: resolved.pitchEnvelope,
        localField,
        trackPan,
        quality,
        mode: granulationMode,
        tuning: granularTuning,
    });
}
