function __createF341Recipe(catalog, normalizeSustainWindows) {
    const {defaults: defaults, limits: limits, presets: presets} = catalog;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, Number.isFinite(Number(v)) ? Number(v) : a));
    function make(input = {}) {
        const p = {
            ...defaults,
            ...input.params
        }, revised = {
            "signature-pilot": "signature",
            film: "film",
            air: "air",
            freeze: "freeze",
            wander: "wander"
        }[input.preset];
        revised && (p.materialPilot = !0, p.gestaltPilot = !0, p.signaturePilot = !1, p.gestaltMode = revised), 
        !0 === p.signaturePilot && "original" !== p.variantRevision && (p.materialPilot = !0, 
        p.gestaltPilot = !0, p.signaturePilot = !1, p.gestaltMode = "signature"), p.variantRevision = "original" === p.variantRevision ? "original" : "revised", 
        p.signaturePilot = !0 === p.signaturePilot, p.materialPilot = !0 === p.materialPilot, 
        p.gestaltPilot = !0 === p.gestaltPilot, [ "imprint", "motion", "weave", "articulation", "signature", "film", "air", "freeze", "wander" ].includes(p.gestaltMode) || (p.gestaltMode = "imprint"), 
        p.gestaltPilot && (p.materialPilot = !0, p.signaturePilot = !1), [ "stretch", "loop", "hold" ].includes(p.materialTime) || (p.materialTime = "stretch");
        const oldSustain = "source-grains" === input.params?.engine || [ "source", "source-structure", "source-continuity", "source-held", "source-motion" ].includes(input.preset);
        !oldSustain && input.params || Object.assign(p, {
            mapping: 0,
            resonance: 1,
            noise: .65,
            motion: .45
        }), input.params || (p.materialPilot = !0, p.windowMode = "all"), p.engine = "spectral", 
        p.sustainWindows = normalizeSustainWindows(p.sustainWindows), null == input.params?.sustainFlavor && (p.sustainFlavor = {
            "source-structure": "structure",
            "source-continuity": "continuity",
            "source-held": "held",
            "source-motion": "motion"
        }[input.preset] ?? "direct"), [ "direct", "structure", "continuity", "held", "motion" ].includes(p.sustainFlavor) || (p.sustainFlavor = "direct");
        for (const [key, [lo, hi]] of Object.entries(limits)) p[key] = "mapping" !== key && "resonance" !== key || null != p[key] ? clamp(p[key], lo, hi) : null;
        [ "neutral", "structure", "reference" ].includes(p.planning) || (p.planning = "neutral"), 
        p.referenceEnd <= p.referenceStart && (p.referenceStart = 0, p.referenceEnd = 1), 
        [ "pendulum", "forward", "reverse" ].includes(p.direction) || (p.direction = "pendulum"), 
        [ "auto", "all", "pin" ].includes(p.windowMode) || (p.windowMode = "auto"), [ "similar", "evolving" ].includes(p.materialPolicy) || (p.materialPolicy = "similar"), 
        [ "capacity", "structure", "duration" ].includes(p.windowStrategy) || (p.windowStrategy = "capacity");
        const regions = (Array.isArray(input.regions) ? input.regions : []).slice(0, 128).filter(r => r && [ "include", "exclude", "texture", "tonal" ].includes(r.role)).map((r, i) => ({
            id: String(r.id ?? "r" + i),
            start: clamp(Math.min(r.start, r.end), 0, 1),
            end: clamp(Math.max(r.start, r.end), 0, 1),
            role: r.role
        })).filter(r => r.end - r.start > 1e-5);
        return Object.freeze({
            version: 2,
            preset: oldSustain ? "resonant" : String(input.preset ?? (p.materialPilot ? "material-flow" : "resonant")),
            params: Object.freeze(p),
            regions: Object.freeze(regions.map(Object.freeze)),
            sourceKey: input.sourceKey ? String(input.sourceKey) : null
        });
    }
    function portable(values) {
        return {
            ...make({
                params: values && null == values.engine && Object.prototype.hasOwnProperty.call(values, "mapping") ? {
                    ...values,
                    engine: "spectral"
                } : values
            }).params,
            windowMode: "auto",
            windowId: 0,
            referenceStart: 0,
            referenceEnd: 1,
            ..."reference" === values?.planning ? {
                planning: "neutral"
            } : {}
        };
    }
    function sourceKey(source) {
        if (!source) return null;
        const pcm = source.monoSamples ?? source.leftSamples ?? [], stride = Math.max(1, Math.floor(pcm.length / 128));
        let hash = 2166136261;
        for (let i = 0; i < pcm.length; i += stride) hash = Math.imul(hash ^ Math.round(1e6 * (pcm[i] ?? 0)), 16777619) >>> 0;
        return [ source.fileName ?? "", source.sampleRate, source.importStartSec, source.importDurationSec, pcm.length, hash ].join("|");
    }
    function fingerprint(value) {
        return JSON.stringify([ value.params, value.regions, value.sourceKey ]);
    }
    return Object.freeze({
        defaults: defaults,
        limits: limits,
        presets: presets,
        clamp: clamp,
        make: make,
        portable: portable,
        sourceKey: sourceKey,
        fingerprint: fingerprint
    });
}
