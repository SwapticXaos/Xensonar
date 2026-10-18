function __createF352Recipe() {
    const defaults = Object.freeze({
        schema: "xensonar-forge-hybrid-v2",
        enabled: false,
        provider: "cecilia",
        mode: "parallel",
        variantRevision: "revised",
        amount: .35,
        coupling: .3,
        color: .5
    });
    const modes = Object.freeze([ {
        id: "parallel",
        label: "Parallel · Klangschichten",
        description: "Donor and Cecilia follow the same figure. The blend crossfades between their sound bodies."
    }, {
        id: "spectral",
        label: "Spectral · Soft Complement",
        description: "Cecilia's broad frequency regions are attenuated where the donor already has energy."
    }, {
        id: "state",
        label: "States · Link Sound Motion",
        description: "Noisiness and brightness of the actual selected donor states shape Cecilia's timbre."
    } ]);
    const providers = Object.freeze([ {
        id: "cecilia",
        label: "Cecilia",
        readyForPilot: true
    }, {
        id: "antonia",
        label: "Antonia",
        readyForPilot: false
    }, {
        id: "bert",
        label: "Bert",
        readyForPilot: false
    }, {
        id: "harmonic-xplore",
        label: "HarmonicXplorE",
        readyForPilot: false
    }, {
        id: "spectral-synthesis",
        label: "Spectral Synthesis",
        readyForPilot: false
    } ]);
    const bound = (v, f) => Number.isFinite(v) ? Math.round(Math.min(1, Math.max(0, v)) * 100) / 100 : f;
    function normalize(input) {
        const r = input?.recipe ?? input ?? {};
        return Object.freeze({
            ...defaults,
            enabled: r.schema === defaults.schema ? r.enabled === true : false,
            mode: modes.some(m => m.id === r.mode) ? r.mode : "parallel",
            variantRevision: r.variantRevision === "original" ? "original" : "revised",
            amount: bound(r.amount, .35),
            coupling: bound(r.coupling, .3),
            color: bound(r.color, .5)
        });
    }
    return Object.freeze({
        defaults: defaults,
        modes: modes,
        providers: providers,
        normalize: normalize
    });
}

const __F352Recipe = __createF352Recipe();
