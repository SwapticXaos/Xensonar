function __createF341MaterialSelection(clamp, allowedMaterialModel) {
    function localRegions(model, cfg) {
        const ctx = model.workbenchContext ?? {}, duration = ctx.selectionDurationSec ?? model.samples.length / model.sampleRate, offset = ctx.eventStartSec ?? 0;
        return cfg.regions.map(r => ({
            ...r,
            startSample: clamp((r.start * duration - offset) * model.sampleRate, 0, model.samples.length - 1),
            endSample: clamp((r.end * duration - offset) * model.sampleRate, 0, model.samples.length - 1)
        })).filter(r => r.endSample - r.startSample >= 1);
    }
    const bindBody = function(hybrid, body, source) {
        return hybrid && (hybrid.workbenchAnalysis = body, hybrid.workbenchContext = {
            eventStartSec: body.eventStartSec ?? 0,
            selectionDurationSec: source?.importDurationSec ?? (body.eventStartSec ?? 0) + hybrid.samples.length / hybrid.sampleRate
        }), hybrid;
    };
    const materialModel = function(model, cfg) {
        if (cfg.params.materialPilot) return allowedMaterialModel(model, cfg);
        if (!model?.samples) return model;
        const p = cfg.params, regions = localRegions(model, cfg), includes = regions.filter(r => "include" === r.role), excludes = regions.filter(r => "exclude" === r.role);
        if (cfg.regions.some(r => "include" === r.role) && !includes.length) throw Error("The Include mark lies outside the analyzed sound body. First reanalyze the region as a donor.");
        const chosen = "auto" !== p.windowMode || includes.length ? model : function(model, p) {
            const body = model.workbenchAnalysis, index = model.sourceIndex;
            if (!body?.frames?.length || !index) return model;
            if ("similar" === p.materialPolicy && 1 === p.selectionTolerance) return model;
            const frames = body.frames, hop = Math.max(.001, body.frameHopSec), minSpan = Math.max(128, Math.round(.025 * model.sampleRate));
            let spans = [], decisions = [];
            if ("evolving" === p.materialPolicy) {
                const changes = frames.slice(1).map((f, i) => ((a, b) => {
                    const aa = a.formantEnvelope ?? [], bb = b.formantEnvelope ?? [];
                    let difference = 0, total = 0;
                    for (let i = 0; i < Math.min(aa.length, bb.length); i++) difference += Math.abs(aa[i] - bb[i]), 
                    total += Math.max(1e-6, aa[i] + bb[i]);
                    return difference / Math.max(1e-6, total);
                })(f, frames[i]) + .5 * Math.abs(f.relativeLevel - frames[i].relativeLevel) + .5 * Math.abs(f.aperiodicity - frames[i].aperiodicity)), sorted = [ ...changes ].sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)] ?? 0, threshold = Math.max(.035, 2.5 * median) / p.selectionTolerance, minimum = Math.max(minSpan, Math.round(.06 * model.sampleRate));
                let start = 0;
                for (let i = 1; i < frames.length; i++) {
                    const at = Math.round(frames[i].timeSec * model.sampleRate);
                    changes[i - 1] > threshold && at - start >= minimum && model.samples.length - 1 - at >= minimum && (spans.push([ start, at ]), 
                    start = at);
                }
                spans.push([ start, model.samples.length - 1 ]), decisions = frames.map((_, frame) => ({
                    frame: frame,
                    reasons: [ "evolving" ],
                    stateDistance: frame ? changes[frame - 1] : 0
                }));
            } else {
                const t = index.thresholds ?? {}, accepted = [];
                decisions = (index.frameDecisions ?? []).map(d => {
                    const frame = frames[d.frame], reasons = d.reasons.filter(r => ![ "air", "shape", "accepted" ].includes(r));
                    return reasons.length || (Math.abs(frame.aperiodicity - (t.air ?? 0)) > (t.airTolerance ?? .035) * p.selectionTolerance && reasons.push("air"), 
                    (d.stateDistance ?? 0) > (t.shapeTolerance ?? .18) * p.selectionTolerance && reasons.push("shape"), 
                    reasons.length || (reasons.push("accepted"), accepted.push(d.frame))), {
                        ...d,
                        reasons: reasons
                    };
                });
                for (let k = 0; k < accepted.length; ) {
                    const first = k;
                    for (;k + 1 < accepted.length && accepted[k + 1] === accepted[k] + 1; ) k++;
                    const last = k++;
                    spans.push([ Math.max(0, Math.round((frames[accepted[first]].timeSec - .5 * hop) * model.sampleRate)), Math.min(model.samples.length - 1, Math.round((frames[accepted[last]].timeSec + .5 * hop) * model.sampleRate)) ]);
                }
                if (spans = spans.filter(([a, b]) => b - a >= minSpan), !spans.length) throw Error("This similarity tolerance produces no sufficiently long material window. Increase tolerance, choose Continuous Motion, or manually include a region.");
            }
            const atLevel = x => model.levels?.[Math.min(model.levels.length - 1, Math.max(0, Math.round(x / model.levelHop)))] ?? 1, windows = spans.filter(([a, b]) => b - a >= minSpan).slice(0, 128).map(([a, b], id) => ({
                id: id,
                startSample: a,
                endSample: b,
                role: "sustain",
                stateDistance: 0,
                level: atLevel((a + b) / 2),
                policy: p.materialPolicy
            })), level = windows.map(w => w.level).sort((a, b) => a - b);
            return {
                ...model,
                sourceIndex: {
                    ...index,
                    windows: windows,
                    selection: "evolving" === p.materialPolicy ? "changing-structure" : "similarity-tolerance",
                    representativeLevel: Math.max(1e-7, level[Math.floor(level.length / 2)] ?? index.representativeLevel),
                    frameDecisions: decisions,
                    acceptedFrames: decisions.filter(d => d.reasons.includes("accepted") || d.reasons.includes("evolving")).map(d => d.frame),
                    rejectedFrames: decisions.filter(d => d.reasons.includes("air") || d.reasons.includes("shape")).map(d => d.frame),
                    fallback: !1
                }
            };
        }(model, p);
        if (!includes.length && !excludes.length && "auto" === p.windowMode) return chosen;
        if (!includes.length && "pin" === p.windowMode && !(model.sourceIndex?.windows ?? []).some(w => w.id === p.windowId)) throw Error("The pinned window does not belong to this donor selection. Choose an existing window or reset to Auto.");
        let spans = includes.length ? includes.map(r => [ r.startSample, r.endSample ]) : "all" === p.windowMode ? [ [ 0, model.samples.length - 1 ] ] : (chosen.sourceIndex?.windows ?? [ {
            startSample: model.bodyStart,
            endSample: model.bodyEnd
        } ]).filter(w => "pin" !== p.windowMode || w.id === p.windowId).map(w => [ w.startSample, w.endSample ]);
        spans.sort((a, b) => a[0] - b[0]);
        const merged = [];
        for (const [a, b] of spans) {
            const last = merged[merged.length - 1];
            last && a <= last[1] && (includes.length || "all" === p.windowMode) ? last[1] = Math.max(last[1], b) : merged.push([ a, b ]);
        }
        spans = merged;
        for (const r of excludes) {
            const split = [];
            for (const [a, b] of spans) r.endSample <= a || r.startSample >= b ? split.push([ a, b ]) : (r.startSample > a && split.push([ a, r.startSample - 1 ]), 
            r.endSample < b && split.push([ r.endSample + 1, b ]));
            spans = split;
        }
        const minimum = Math.max(128, Math.round(.015 * model.sampleRate)), windows = spans.filter(([a, b]) => b - a >= minimum).map(([a, b], id) => ({
            id: id,
            startSample: Math.ceil(a),
            endSample: Math.floor(b),
            role: "sustain",
            stateDistance: 0,
            level: model.sourceIndex?.representativeLevel ?? 1,
            manual: !0
        }));
        if (!windows.length) throw Error("The material marking leaves no sufficiently long donor window. Mark at least 15 ms or reduce excluded regions.");
        const decisions = model.workbenchAnalysis?.frames?.map((f, frame) => ({
            frame: frame,
            reasons: [ windows.some(w => f.timeSec * model.sampleRate >= w.startSample && f.timeSec * model.sampleRate <= w.endSample) ? "manual" : "outside" ],
            stateDistance: null
        }));
        return {
            ...model,
            sourceIndex: {
                ...model.sourceIndex,
                windows: windows,
                selection: "manual-workbench",
                manualSelection: !0,
                ...decisions ? {
                    frameDecisions: decisions,
                    acceptedFrames: decisions.filter(d => d.reasons.includes("manual")).map(d => d.frame),
                    rejectedFrames: []
                } : {},
                fallback: !1
            }
        };
    };
    const readPosition = function(lo, hi, age, p) {
        const span = hi - lo;
        if (!(span > 0)) return lo;
        const start = p.position * span;
        if (0 === p.motion) return lo + start;
        const travel = age * p.motion;
        if ("forward" === p.direction) return lo + ((start + travel) % span + span) % span;
        if ("reverse" === p.direction) return lo + ((start - travel) % span + span) % span;
        const cycle = (start + travel) % (2 * span);
        return lo + (cycle <= span ? cycle : 2 * span - cycle);
    };
    const spectralWeight = function(hz, f0, binHz, kind, evidence, model, sourceCenter, cfg) {
        let distance, tonal = cfg.params.tonal, noise = cfg.params.noise;
        for (const r of cfg.localRegions ?? localRegions(model, cfg)) sourceCenter >= r.startSample && sourceCenter <= r.endSample && ("texture" === r.role && (noise *= 1.75, 
        tonal *= .5), "tonal" === r.role && (tonal *= 1.5, noise *= .5));
        if (1 === tonal && 1 === noise) return 1;
        distance = "periodic" === kind && f0 > 0 ? Math.abs(hz - Math.max(1, Math.round(hz / f0)) * f0) / Math.max(1.5 * binHz, .055 * f0) : "modal" === kind && evidence.partialRatios?.length ? Math.min(...evidence.partialRatios.map(r => Math.abs(hz - r * f0))) / Math.max(1.5 * binHz, .012 * hz) : 3;
        const harmonic = Math.exp(-.5 * distance * distance);
        return clamp(tonal * harmonic + noise * (1 - harmonic), 0, 3);
    };
    const spectrumEnvelope = function(evidence, hz, sourceHz, blend, options, cfg) {
        const auto = "partials" === options.registerPolicy ? 0 : 1, amount = cfg.params.resonance ?? auto, shift = 2 ** (cfg.params.formant / 12);
        return 0 === amount && 1 === shift ? 1 : Math.exp((1 - blend) * amount * Math.log(clamp(evidence.envelope(hz / shift) / evidence.envelope(Math.max(35, sourceHz)), .18, 4)));
    };
    const metrics = function(frame) {
        return {
            pitchHz: frame?.f0Hz ?? 0,
            confidence: frame?.pitchConfidence ?? 0,
            noise: frame?.aperiodicity ?? 0,
            level: frame?.relativeLevel ?? 0
        };
    };
    return Object.freeze({
        localRegions: localRegions,
        bindBody: bindBody,
        materialModel: materialModel,
        readPosition: readPosition,
        spectralWeight: spectralWeight,
        spectrumEnvelope: spectrumEnvelope,
        metrics: metrics
    });
}
