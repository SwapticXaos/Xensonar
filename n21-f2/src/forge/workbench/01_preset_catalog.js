const __F341PresetCatalog = Object.freeze({
    defaults: Object.freeze({
        engine: "spectral",
        sustainFlavor: "direct",
        stateFollow: 1,
        attackFollow: 1,
        color: 0,
        planning: "neutral",
        continuity: .7,
        articulation: .6,
        registerProtection: .5,
        referenceStart: 0,
        referenceEnd: 1,
        mapping: null,
        resonance: null,
        formant: 0,
        spread: 1,
        motion: 1,
        position: 0,
        direction: "pendulum",
        dynamics: 1,
        noise: 1,
        tonal: 1,
        detail: 1,
        windowMode: "auto",
        windowId: 0,
        materialPolicy: "similar",
        selectionTolerance: 1,
        windowStrategy: "capacity",
        windowMs: 35,
        sourceSpectrum: 0,
        sourceMotion: 0,
        spectralCohesion: 0,
        signaturePilot: !1,
        materialPilot: !1,
        gestaltPilot: !1,
        gestaltMode: "imprint",
        variantRevision: "revised",
        gestaltIdentity: .85,
        gestaltMotion: .6,
        gestaltGesture: .55,
        articulationAmount: 1,
        materialTime: "stretch",
        carrierNeutralHz: 220,
        carrierTranspose: 0,
        sustainWindows: {
            mode: "auto",
            minMs: 8,
            maxMs: 170,
            targetMs: 35,
            hopRatio: .5,
            preRollMs: 0,
            microDensity: 1,
            jitter: 0,
            maxSourceMs: 1400
        }
    }),
    limits: {
        continuity: [ 0, 1 ],
        articulation: [ 0, 1 ],
        registerProtection: [ 0, 1 ],
        referenceStart: [ 0, 1 ],
        referenceEnd: [ 0, 1 ],
        stateFollow: [ 0, 1 ],
        attackFollow: [ 0, 1 ],
        color: [ 0, 1 ],
        mapping: [ 0, 1 ],
        resonance: [ 0, 1 ],
        formant: [ -12, 12 ],
        spread: [ .5, 2 ],
        motion: [ 0, 3 ],
        position: [ 0, 1 ],
        noise: [ 0, 2 ],
        tonal: [ 0, 2 ],
        dynamics: [ 0, 1 ],
        detail: [ .25, 1 ],
        windowId: [ 0, 1024 ],
        selectionTolerance: [ .5, 2.5 ],
        windowMs: [ 8, 170 ],
        sourceSpectrum: [ 0, 1 ],
        sourceMotion: [ 0, 1 ],
        spectralCohesion: [ 0, 1 ],
        carrierNeutralHz: [ 20, 2e4 ],
        carrierTranspose: [ -48, 48 ],
        gestaltIdentity: [ 0, 1 ],
        gestaltMotion: [ 0, 1 ],
        gestaltGesture: [ 0, 1 ],
        articulationAmount: [ 0, 1 ]
    },
    presets: [ {
        id: "gestalt-articulation-original",
        name: "Klanggestalt · Articulation · 1",
        description: "Variante 1 dieser Hörweise · ursprüngliche Klangberechnung und Presetwerte (F3.56.40).",
        values: {
            engine: "spectral",
            materialPilot: !0,
            gestaltPilot: !0,
            gestaltMode: "articulation",
            articulationAmount: 1,
            gestaltIdentity: .85,
            gestaltMotion: .6,
            gestaltGesture: .6,
            position: .2,
            planning: "neutral",
            windowMode: "all",
            variantRevision: "original"
        }
    }, {
        id: "gestalt-articulation",
        name: "Klanggestalt · Articulation · 2",
        description: "Ü · observed onset, typical body and decay follow carrier-owned time.",
        values: {
            engine: "spectral",
            materialPilot: !0,
            gestaltPilot: !0,
            gestaltMode: "articulation",
            articulationAmount: 1,
            gestaltIdentity: .85,
            gestaltMotion: .6,
            gestaltGesture: .6,
            position: .2,
            planning: "neutral",
            windowMode: "all",
            signaturePilot: !1,
            variantRevision: "revised"
        }
    }, {
        id: "gestalt-imprint-original",
        name: "Klanggestalt · Resonant Imprint · 1",
        description: "Variante 1 dieser Hörweise · ursprüngliche Klangberechnung und Presetwerte (F3.56.40).",
        values: {
            engine: "spectral",
            materialPilot: !0,
            gestaltPilot: !0,
            gestaltMode: "imprint",
            gestaltIdentity: .9,
            gestaltMotion: .65,
            gestaltGesture: .45,
            position: .2,
            planning: "neutral",
            windowMode: "all",
            variantRevision: "original"
        }
    }, {
        id: "gestalt-imprint",
        name: "Klanggestalt · Resonant Imprint · 2",
        description: "Ü · coherent phrase transport with a stable absolute resonance envelope.",
        values: {
            engine: "spectral",
            materialPilot: !0,
            gestaltPilot: !0,
            gestaltMode: "imprint",
            gestaltIdentity: .94,
            gestaltMotion: .35,
            gestaltGesture: .35,
            position: .2,
            planning: "neutral",
            windowMode: "all",
            signaturePilot: !1,
            variantRevision: "revised"
        }
    }, {
        id: "gestalt-motion-original",
        name: "Klanggestalt · Timbre Motion · 1",
        description: "Variante 1 dieser Hörweise · ursprüngliche Klangberechnung und Presetwerte (F3.56.40).",
        values: {
            engine: "spectral",
            materialPilot: !0,
            gestaltPilot: !0,
            gestaltMode: "motion",
            gestaltIdentity: .7,
            gestaltMotion: 1,
            gestaltGesture: 1,
            position: 0,
            planning: "neutral",
            windowMode: "all",
            variantRevision: "original"
        }
    }, {
        id: "gestalt-motion",
        name: "Klanggestalt · Timbre Motion · 2",
        description: "Ü · signed pitch movement and changing stroke shape drive a reversible source journey.",
        values: {
            engine: "spectral",
            materialPilot: !0,
            gestaltPilot: !0,
            gestaltMode: "motion",
            gestaltIdentity: .65,
            gestaltMotion: 1,
            gestaltGesture: 1,
            position: 0,
            planning: "neutral",
            windowMode: "all",
            signaturePilot: !1,
            variantRevision: "revised"
        }
    }, {
        id: "gestalt-weave-original",
        name: "Klanggestalt · Material States · 1",
        description: "Variante 1 dieser Hörweise · ursprüngliche Klangberechnung und Presetwerte (F3.56.40).",
        values: {
            engine: "spectral",
            materialPilot: !0,
            gestaltPilot: !0,
            gestaltMode: "weave",
            gestaltIdentity: .8,
            gestaltMotion: .75,
            gestaltGesture: .8,
            position: .3,
            planning: "neutral",
            windowMode: "all",
            variantRevision: "original"
        }
    }, {
        id: "gestalt-weave",
        name: "Klanggestalt · Material States · 2",
        description: "Ü · observed recurring donor states and transitions guide phrase selection.",
        values: {
            engine: "spectral",
            materialPilot: !0,
            gestaltPilot: !0,
            gestaltMode: "weave",
            gestaltIdentity: .82,
            gestaltMotion: .65,
            gestaltGesture: .8,
            position: .3,
            planning: "neutral",
            windowMode: "all",
            signaturePilot: !1,
            variantRevision: "revised"
        }
    }, {
        id: "material-flow-original",
        name: "Sound Material · Motion · 1",
        description: "Variante 1 dieser Hörweise · ursprüngliche Klangberechnung und Presetwerte (F3.56.40).",
        values: {
            engine: "spectral",
            materialPilot: !0,
            signaturePilot: !1,
            materialTime: "stretch",
            carrierNeutralHz: 220,
            carrierTranspose: 0,
            planning: "neutral",
            windowMode: "all",
            position: 0,
            variantRevision: "original"
        }
    }, {
        id: "material-flow",
        name: "Sound Material · Motion · 2",
        description: "Ü · full-spectrum transport with faster peak tracking and explicit source-time ownership.",
        values: {
            engine: "spectral",
            materialPilot: !0,
            signaturePilot: !1,
            materialTime: "stretch",
            carrierNeutralHz: 220,
            carrierTranspose: 0,
            planning: "neutral",
            windowMode: "all",
            position: 0,
            materialRevision: 41,
            variantRevision: "revised"
        }
    }, {
        id: "signature-pilot-original",
        name: "Donor-Signatur · Versuch · 1",
        description: "Variante 1 dieser Hörweise · ursprüngliche Klangberechnung und Presetwerte (F3.56.40).",
        values: {
            engine: "spectral",
            signaturePilot: !0,
            sourceMotion: 1,
            sourceSpectrum: 1,
            spectralCohesion: 1,
            mapping: 0,
            resonance: 1,
            noise: .65,
            motion: 1,
            direction: "forward",
            variantRevision: "original"
        }
    }, {
        id: "signature-pilot",
        name: "Donor-Signatur · Versuch · 2",
        description: "Ü · original spectral deviations and donor motion retain a more direct source character.",
        values: {
            engine: "spectral",
            signaturePilot: !1,
            sourceMotion: 1,
            sourceSpectrum: 1,
            spectralCohesion: 1,
            mapping: 0,
            resonance: 1,
            noise: .65,
            motion: 1,
            direction: "forward",
            gestaltMode: "signature",
            gestaltIdentity: .5,
            gestaltMotion: .9,
            gestaltGesture: .6,
            materialPilot: !0,
            gestaltPilot: !0,
            variantRevision: "revised"
        }
    }, {
        id: "auto",
        name: "Parameters to Auto · Keep Markings",
        description: "Previous Auto parameters; material markings are preserved.",
        values: {
            engine: "spectral"
        }
    }, {
        id: "resonant",
        name: "Resonant Body",
        description: "Emphasize donor partial structure and stable resonances.",
        values: {
            engine: "spectral",
            mapping: 0,
            resonance: 1,
            noise: .65,
            motion: .45
        }
    }, {
        id: "film-original",
        name: "Spektraler Film · 1",
        description: "Variante 1 dieser Hörweise · ursprüngliche Klangberechnung und Presetwerte (F3.56.40).",
        values: {
            engine: "spectral",
            mapping: .9,
            resonance: .3,
            motion: 1.5,
            spread: 1.35,
            variantRevision: "original"
        }
    }, {
        id: "film",
        name: "Spektraler Film · 2",
        description: "Ü · painted width sculpts spectral bandwidth around each carrier voice.",
        values: {
            engine: "spectral",
            mapping: .9,
            resonance: .3,
            motion: 1.5,
            spread: 1.35,
            gestaltMode: "film",
            gestaltIdentity: .35,
            gestaltMotion: .9,
            gestaltGesture: .8,
            materialPilot: !0,
            gestaltPilot: !0,
            signaturePilot: !1,
            variantRevision: "revised"
        }
    }, {
        id: "air-original",
        name: "Hauch & Reibung · 1",
        description: "Variante 1 dieser Hörweise · ursprüngliche Klangberechnung und Presetwerte (F3.56.40).",
        values: {
            engine: "spectral",
            noise: 1.8,
            tonal: .55,
            motion: .65,
            detail: .5,
            variantRevision: "original"
        }
    }, {
        id: "air",
        name: "Hauch & Reibung · 2",
        description: "Ü · source-derived spectral texture and irregular components; no generated noise layer.",
        values: {
            engine: "spectral",
            noise: 1.8,
            tonal: .55,
            motion: .65,
            detail: .5,
            gestaltMode: "air",
            gestaltIdentity: .4,
            gestaltMotion: .65,
            gestaltGesture: .5,
            materialPilot: !0,
            gestaltPilot: !0,
            signaturePilot: !1,
            variantRevision: "revised"
        }
    }, {
        id: "freeze-original",
        name: "Stillbild · 1",
        description: "Variante 1 dieser Hörweise · ursprüngliche Klangberechnung und Presetwerte (F3.56.40).",
        values: {
            engine: "spectral",
            motion: 0,
            position: .45,
            resonance: 1,
            dynamics: 1,
            variantRevision: "original"
        }
    }, {
        id: "freeze",
        name: "Stillbild · 2",
        description: "Ü · hold one interior donor frame with continuous phase and carrier pitch.",
        values: {
            engine: "spectral",
            motion: 0,
            position: .45,
            resonance: 1,
            dynamics: 1,
            gestaltMode: "freeze",
            gestaltIdentity: .9,
            gestaltMotion: 0,
            gestaltGesture: .15,
            materialPilot: !0,
            gestaltPilot: !0,
            signaturePilot: !1,
            variantRevision: "revised"
        }
    }, {
        id: "wander-original",
        name: "Wandernd · 1",
        description: "Variante 1 dieser Hörweise · ursprüngliche Klangberechnung und Presetwerte (F3.56.40).",
        values: {
            engine: "spectral",
            motion: 2.2,
            direction: "forward",
            detail: .5,
            dynamics: .35,
            variantRevision: "original"
        }
    }, {
        id: "wander",
        name: "Wandernd · 2",
        description: "Ü · visit allowed source regions phrase by phrase and reflect smoothly inside them.",
        values: {
            engine: "spectral",
            motion: 2.2,
            direction: "forward",
            detail: .5,
            dynamics: .35,
            gestaltMode: "wander",
            gestaltIdentity: .55,
            gestaltMotion: .8,
            gestaltGesture: .7,
            materialPilot: !0,
            gestaltPilot: !0,
            signaturePilot: !1,
            variantRevision: "revised"
        }
    } ]
});
