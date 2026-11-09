import type { RootFollowBankEntryConfig } from './rootFollowTypes';
import type { SamplePlaybackDef } from '../../l3lab/canonicalForge/canonicalPreviewContracts';
import { loadMelodicSampleBuffer } from '../../l3lab/canonicalForge/melodicSampleLibrary';
export type RootFollowSampleLoader = (id: string) => Promise<SamplePlaybackDef | null>;
/** A scene commits atomically. Old async loads cannot replace a newer scene. */
export function createRootFollowSampleRepository(load: RootFollowSampleLoader) {
    let generation = 0;
    let ready = new Map<string, SamplePlaybackDef>();
    return {
        get(id: string) { return ready.get(id) ?? null; },
        invalidate() { generation++; ready.clear(); },
        async prepare(presets: readonly (string | null)[]) {
            const token = ++generation;
            const ids = [...new Set(presets.filter((p): p is string => !!p?.startsWith('sample:')).map(p => p.slice(7).trim()).filter(Boolean))];
            const prepared = new Map<string, SamplePlaybackDef>();
            const missing: string[] = [];
            let cursor = 0;
            await Promise.all(Array.from({ length: Math.min(4, ids.length) }, async () => {
                while (cursor < ids.length && token === generation) {
                    const id = ids[cursor++];
                    try {
                        const sample = await load(id);
                        if (sample)
                            prepared.set(id, sample);
                        else
                            missing.push(id);
                    }
                    catch {
                        missing.push(id);
                    }
                }
            }));
            const committed = token === generation;
            if (committed)
                ready = prepared;
            return { committed, missing, generation: token };
        },
    };
}
const repositories = new WeakMap<object, {
    ctx: BaseAudioContext;
    samples: ReturnType<typeof createRootFollowSampleRepository>;
}>();
function repository(ctx: BaseAudioContext, owner: object = ctx) {
    let existing = repositories.get(owner);
    if (!existing || existing.ctx !== ctx) {
        existing?.samples.invalidate();
        const samples = createRootFollowSampleRepository(async (id) => {
            const loaded = await loadMelodicSampleBuffer(id, ctx);
            return loaded ? { ...loaded, kind: 'sample', sampleId: id } : null;
        });
        existing = { ctx, samples };
        repositories.set(owner, existing);
    }
    return existing.samples;
}
export function getPreparedRootFollowSample(ctx: BaseAudioContext, id: string, owner?: object) {
    return repository(ctx, owner).get(id);
}
export async function prepareRootFollowSamples(ctx: AudioContext, presets: readonly (string | null)[], owner?: object) {
    const result = await repository(ctx, owner).prepare(presets);
    if (result.committed && result.missing.length) {
        console.warn('[root-follow] Samples unavailable; affected notes remain silent:', result.missing);
    }
    return result;
}
export function prepareRootFollowSynthPlayback(ctx: AudioContext, config: RootFollowBankEntryConfig, owner: object) {
    const pattern = config.synthPattern;
    if (!pattern)
        return Promise.resolve({ committed: true, missing: [], generation: 0 });
    const tracks = new Map(pattern.tracks.map(track => [track.id, track]));
    const active = new Set(pattern.activeTrackIds);
    const presets = pattern.notes.filter(note => active.has(note.trackId) && tracks.get(note.trackId)?.enabled !== false)
        .map(note => note.instrumentPresetOverride ?? tracks.get(note.trackId)?.instrumentPreset ?? null);
    return prepareRootFollowSamples(ctx, presets, owner);
}
