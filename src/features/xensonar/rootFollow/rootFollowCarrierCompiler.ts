import type { CanonicalCarrierIntegralFieldClip } from '../../l3lab/canonicalForge/sessionTypes';
import type { RootFollowSynthNoteSnapshot } from './rootFollowTypes';
import { compileRootFollowFieldSampler } from './rootFollowLocalFieldAutomation';
/** Compile a figure to ordinary voice events before the realtime scheduler sees it. */
export function compileRootFollowCarrierField(snapshot: RootFollowSynthNoteSnapshot, field: CanonicalCarrierIntegralFieldClip | null | undefined, baseHz: number): RootFollowSynthNoteSnapshot[] {
    if (!field || snapshot.renderSourceKind !== "synth-live")
        return [snapshot];
    if (!field.voices.length)
        return [];
    // Compile figure voices once, outside live scheduling. Each keeps its own onset and pitch.
    const clipGainAt = compileRootFollowFieldSampler(snapshot.localField, 'dynamic-fade');
    const clipPitchAt = compileRootFollowFieldSampler(snapshot.localField, 'pitch-elastic');
    return field.voices.map(voice => {
        const voiceGainAt = compileRootFollowFieldSampler(voice.localField, 'dynamic-fade');
        const voicePitchAt = compileRootFollowFieldSampler(voice.localField, 'pitch-elastic');
        const gainCurve: number[] = [], pitchCurve: number[] = [];
        for (let i = 0; i < 96; i++) {
            const progress = i / 95, clipProgress = voice.startRatio + progress * voice.durationRatio;
            const clipGain = 1 + 0.95 * clipGainAt(clipProgress);
            const voiceGain = 1 + 0.95 * voiceGainAt(progress);
            gainCurve.push(clipGain * voiceGain);
            pitchCurve.push(12 * (clipPitchAt(clipProgress) + voicePitchAt(progress)));
        }
        return ({
            ...snapshot,
            id: `${snapshot.id}:${voice.id}`,
            startBeat: snapshot.startBeat + Math.max(0, voice.startRatio) * snapshot.durationBeats,
            durationBeats: Math.max(0.0625, voice.durationRatio * snapshot.durationBeats),
            lineHz: (snapshot.lineHz ?? baseHz) * Math.pow(2, voice.relativeSemitones / 12),
            velocity: Math.max(0, Math.min(1, voice.velocity * (voice.trackVolume ?? 0.75))),
            localField: null,
            compiledGainCurve: gainCurve,
            compiledPitchSemitones: pitchCurve,
            panOverride: Number.isFinite(voice.pan) ? voice.pan : null,
            spectralWindowMeta: voice.spectralWindowMeta ?? null,
        });
    });
}
