// One payload/fallback contract for all four Material/Gestalt worker owners.
function __createForgePCMWorker(script, label, renderer) {
    // P9/M3: Worker bootstraps are offline-only. Do not serialize their
    // (large) factory sources before any Forge render requests them.
    // Keep the historical .script accessor's exact result for compatibility.
    let cachedSource;
    const source = () => cachedSource ??= typeof script === 'function' ? script() : script;
    function render(plan, model, sampleRate, durationSec, options = {}) {
        const raw = model.sourceGrains ?? model;
        return __F35640OfflineJob.run({
            script: source(),
            options: options,
            label: label,
            payload: {
                plan: {
                    bands: plan.bands,
                    rootReferenceHz: plan.rootReferenceHz
                },
                model: {
                    samples: raw.samples,
                    sampleRate: raw.sampleRate,
                    version: raw.version,
                    atlas: raw.atlas
                },
                sampleRate: sampleRate,
                durationSec: durationSec,
                config: options.workbench
            },
            decode: __F35640OfflineJob.pcm,
            fallback: (reason, guarded) => __F35640OfflineJob.fallback(renderer, plan, model, sampleRate, durationSec, guarded, reason)
        }).promise;
    }
    return Object.freeze({
        render: render,
        get script() { return source(); }
    });
}
