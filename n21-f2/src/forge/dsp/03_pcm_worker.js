// One payload/fallback contract for all four Material/Gestalt worker owners.
function __createForgePCMWorker(script, label, renderer) {
    function render(plan, model, sampleRate, durationSec, options = {}) {
        const raw = model.sourceGrains ?? model;
        return __F35640OfflineJob.run({
            script: script,
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
        script: script
    });
}
