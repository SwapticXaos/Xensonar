// RFL resident grain processor.
// Self-contained Blob module for the standalone HTML. Host ABI alias: fne.
// Keep allocation and messaging out of the render hot path.
const fne=String.raw`
var et = Object.defineProperty;

var nt = (t, n, e) => n in t ? et(t, n, {
    enumerable: !0,
    configurable: !0,
    writable: !0,
    value: e
}) : t[n] = e;

var i = (t, n, e) => nt(t, typeof n != "symbol" ? n + "" : n, e);

function isTransferBuffer(t) {
    return t.buffer instanceof ArrayBuffer && t.byteOffset === 0 && t.byteLength === t.buffer.byteLength;
}

function validCutMap(t, n, e, s, r = !1) {
    if (!t || t.version !== 1 || t.sourceId !== s || !Number.isInteger(s) || s < 1 || e < 2 || e > 1048576 || n < 8e3 || n > 192e3 || !Number.isFinite(n) || t.sr !== n || t.n !== e || t.duration !== e / n || t.hop !== Math.max(24, Math.min(128, Math.round(n * .0012))) || !(t.base instanceof Float64Array) || t.base.length !== e || !(t.cross instanceof Uint8Array) || t.cross.length !== e || !isTransferBuffer(t.base) || !isTransferBuffer(t.cross)) return !1;
    let o = Math.ceil(e / t.hop), a = [ t.amp, t.slope, t.energy, t.peak ];
    for (let u of a) if (!(u instanceof Float32Array) || u.length !== o || !isTransferBuffer(u)) return !1;
    if (r) {
        for (let u = 0; u < e; u++) if (!Number.isFinite(t.base[u]) || t.cross[u] > 1) return !1;
        for (let u of a) for (let c = 0; c < u.length; c++) if (!Number.isFinite(u[c])) return !1;
    }
    return !0;
}

var E = (t, n, e) => Math.max(n, Math.min(e, t)), G = (t, n) => 1 - E(Math.abs(t) / Math.max(1e-4, n), 0, 1);

function chooseCut(t, n, e, s, r = .005) {
    if (e = E(e, 0, Math.max(0, t.duration - .001)), s = E(s, e, Math.max(e, t.duration - .001)),
    n = E(n, e, s), r = E(r, 0, .014), r <= 5e-4 || s - e <= 5e-4) return n;
    let o = t.hop / t.sr, a = Math.round(n / o), u = Math.max(0, Math.floor(Math.max(e, n - r) / o)), c = Math.min(t.amp.length - 1, Math.ceil(Math.min(s, n + r) / o));
    if (c <= u) return n;
    let h = a, m = -1 / 0, w = Math.max(1, Math.ceil(r / o));
    for (let l = u; l <= c; l++) {
        let f = G(t.amp[l] ?? 0, .055) * .34 + G(t.energy[l] ?? 0, .13) * .21 + G(t.peak[l] ?? 0, .24) * .12 + G(t.slope[l] ?? 0, .08) * .18 + (1 - E(Math.abs(l - a) / Math.max(1, w), 0, 1)) * .15;
        f > m && (m = f, h = l);
    }
    let R = Math.round(n * t.sr), d = h * t.hop, A = Math.max(0, Math.ceil(e * t.sr)), b = Math.min(t.n - 2, Math.floor(s * t.sr)), p = Math.max(16, Math.min(Math.round(r * t.sr), Math.round(t.sr * .0045))), g = Math.max(A, d - p), M = Math.min(b, d + p);
    if (M <= g) return E(h * o, e, s);
    let x = E(d, g, M);
    m = -1 / 0;
    for (let l = g; l <= M; l += Math.max(1, Math.floor(t.sr / 12e3))) {
        let f = t.base[l] + (1 - E(Math.abs(l - R) / Math.max(1, p), 0, 1)) * .15 + (t.cross[l] ? .16 : 0);
        f > m && (m = f, x = l);
    }
    return E(x / t.sr, e, s);
}

function deterministicDither(t) {
    if (!Number.isFinite(t)) return 0;
    let n = Math.sin(t * 12.9898 + 78.233) * 43758.5453123;
    return (n - Math.floor(n)) * 2 - 1;
}

var MAX_GRAINS = 1024, MAX_WINDOWS_PER_QUANTUM = 8, LOOKAHEAD_SECONDS = .02, clamp = (t, n, e) => Math.max(n, Math.min(e, t)), wrap = (t, n) => {
    let e = t % n;
    return e < 0 ? e + n : e;
}, HANN_WINDOW = new Float32Array(160);

for (let t = 1; t < 159; t++) HANN_WINDOW[t] = Math.max(0, .5 - .5 * Math.cos(Math.PI * 2 * (t / 159)));

var RawGrainPool = class {
    constructor() {
        i(this, "count", 0);
        i(this, "when", new Float64Array(MAX_GRAINS));
        i(this, "source", new Float64Array(MAX_GRAINS));
        i(this, "duration", new Float64Array(MAX_GRAINS));
        i(this, "sourceDuration", new Float64Array(MAX_GRAINS));
        i(this, "rate", new Float64Array(MAX_GRAINS));
        // Snapshot the crop per grain: subsequent edits must not reinterpret
        // the source region of an already sounding tail.
        i(this, "sourceLimit", new Float64Array(MAX_GRAINS));
        // Prepared once per grain, not once per sample/quantum.
        this.startFrame = new Float64Array(MAX_GRAINS);
        this.stopFrame = new Float64Array(MAX_GRAINS);
        this.sourceFrame = new Float64Array(MAX_GRAINS);
        this.sourceStep = new Float64Array(MAX_GRAINS);
        this.windowStep = new Float64Array(MAX_GRAINS);
    }
    clear() {
        this.count = 0;
    }
    expire(n) {
        let e = 0;
        for (let s = 0; s < this.count; s++) this.when[s] + this.duration[s] <= n || (e !== s && (this.when[e] = this.when[s],
        this.source[e] = this.source[s], this.duration[e] = this.duration[s], this.sourceDuration[e] = this.sourceDuration[s],
        this.rate[e] = this.rate[s], this.sourceLimit[e] = this.sourceLimit[s],
        this.startFrame[e] = this.startFrame[s], this.stopFrame[e] = this.stopFrame[s],
        this.sourceFrame[e] = this.sourceFrame[s], this.sourceStep[e] = this.sourceStep[s],
        this.windowStep[e] = this.windowStep[s]), e++);
        this.count = e;
    }
};

function validProgram(t) {
    if (!t || !t.tuning) return !1;
    let n = t.tuning;
    return (t.mode === void 0 || t.mode === "base" || t.mode === "fragment") && Number.isFinite(t.transportAnchorSec) && Number.isFinite(t.desiredLoopDurationSec) && t.desiredLoopDurationSec >= .25 && Number.isFinite(t.loopStartSec) && t.loopStartSec >= 0 && Number.isFinite(t.loopEndSec) && t.loopEndSec > t.loopStartSec && Number.isFinite(t.stepSec) && t.stepSec >= .008 && t.stepSec <= .056 && Number.isFinite(t.windowSec) && t.windowSec >= .024 && t.windowSec <= .12 && Number.isFinite(t.rawTargetHz) && (t.entryRootHz === null || Number.isFinite(t.entryRootHz)) && (t.sessionAnchorHz === null || Number.isFinite(t.sessionAnchorHz)) && (t.smoothedRootHz === null || Number.isFinite(t.smoothedRootHz)) && (t.mode === "fragment" || !n.microCutSafety) && Number.isFinite(n.maxGrains) && n.maxGrains >= 1 && n.maxGrains <= Math.max(5, Math.round((t.mode === "fragment" ? 480 : 400) * Math.max(.008, t.stepSec))) && Number.isFinite(n.grainWindowScale) && n.grainWindowScale >= .72 && n.grainWindowScale <= 1.48 && Number.isFinite(n.grainSpacingScale) && n.grainSpacingScale >= .52 && n.grainSpacingScale <= 2.2 && Number.isFinite(n.jitterScale) && n.jitterScale >= 0 && n.jitterScale <= 3.5 && Number.isFinite(n.sourceDurationScale) && n.sourceDurationScale >= .5 && n.sourceDurationScale <= 1.85 && Number.isFinite(n.sourceStartGuardMs) && Number.isFinite(n.grainTimeDitherMs) && Number.isFinite(n.grainSourceDitherMs) && Number.isFinite(n.microCutSearchRadiusMs);
}

var RawResidentCore = class {
    constructor(n) {
        this.sampleRate = n;
        i(this, "pool", new RawGrainPool);
        i(this, "left", null);
        i(this, "right", null);
        i(this, "sourceSampleRate", 48e3);
        i(this, "cutMap", null);
        i(this, "program", null);
        i(this, "nextWindowSec", 0);
        i(this, "latticeOriginSec", 0);
        i(this, "ordinal", 0);
        i(this, "generating", !1);
        i(this, "windows", 0);
        i(this, "skippedWindows", 0);
        i(this, "peakSlots", 0);
        i(this, "fault", null);
        i(this, "smoothedRootHz", null);
        i(this, "sessionAnchorHz", null);
    }
    load(n, e, s = null) {
        this.stop(), this.left = n[0], this.right = n[1] ?? n[0], this.sourceSampleRate = e,
        this.cutMap = s;
    }
    arm(n, e) {
        this.program = n, this.nextWindowSec = e, this.latticeOriginSec = e, this.ordinal = 0,
        this.smoothedRootHz = n.smoothedRootHz, this.sessionAnchorHz = n.sessionAnchorHz,
        this.generating = !0, this.fault = null;
    }
    update(n) {
        let e = n.stepSec !== this.program?.stepSec || n.transportAnchorSec !== this.program?.transportAnchorSec;
        this.program = n, e && (this.ordinal = Math.max(0, Math.ceil((this.nextWindowSec - n.transportAnchorSec) / n.stepSec - 1e-9)),
        this.latticeOriginSec = n.transportAnchorSec, this.nextWindowSec = this.latticeOriginSec + this.ordinal * n.stepSec);
    }
    drain() {
        return this.generating = !1, this.nextWindowSec;
    }
    stop() {
        this.generating = !1, this.pool.clear(), this.left = null, this.right = null, this.program = null,
        this.cutMap = null;
    }
    planWindow(n) {
        let e = this.program, s = this.left;
        if (!e || !s) return !1;
        let r = wrap(n - e.transportAnchorSec, e.desiredLoopDurationSec), o = e.mode === "fragment" ? Math.min(e.windowSec, e.desiredLoopDurationSec) : Math.min(e.windowSec, Math.max(.001, e.desiredLoopDurationSec - r));
        if (o <= .006) return !0;
        let a = clamp(Number.isFinite(e.rawTargetHz) ? e.rawTargetHz : 110, 27.5, 3520), u = this.smoothedRootHz === null ? a : clamp(this.smoothedRootHz, 27.5, 3520), c = clamp(1 - Math.exp(-Math.max(.001, e.stepSec) / .032), .08, .82), h = u + (a - u) * c, m = e.entryRootHz !== null ? Math.max(1, e.entryRootHz) : this.sessionAnchorHz !== null ? Math.max(1, this.sessionAnchorHz) : Math.max(1, h), w = clamp(clamp(h / m, .125, 8), .16, 9.5), R = e.mode === "fragment";
        if (R && !this.cutMap) return this.fault = "missing-cut-map", this.generating = !1,
        !1;
        let d = Math.max(.01, e.loopEndSec - e.loopStartSec);
        if (R) {
            let A = Math.min(o, Math.max(.006, e.desiredLoopDurationSec - r)), b = o - A > .006 ? 2 : 1;
            if (this.pool.count + b * Math.max(1, Math.round(e.tuning.maxGrains)) > MAX_GRAINS) return this.fault = "pool-capacity",
            this.generating = !1, !1;
            let p = o, g = n, M = r;
            for (;p > .006; ) {
                let x = Math.min(p, Math.max(.006, e.desiredLoopDurationSec - M)), l = clamp(M / e.desiredLoopDurationSec, 0, 1), f = e.loopStartSec + d * l, W = Math.max(.008, Math.min(Math.max(.008, d - d * l), d * (x / e.desiredLoopDurationSec)));
                this.planSlice(g, x, f, W, w, !0), p -= x, g += x, M = 0;
            }
        } else {
            let A = Math.max(e.loopStartSec, Math.min(e.loopEndSec - .02, e.loopStartSec + d * clamp(r / e.desiredLoopDurationSec, 0, 1))), b = Math.min(d, Math.max(.018, d * (o / e.desiredLoopDurationSec) + .012));
            if (!this.planSlice(n, o, A, b, w, !1)) return !1;
        }
        return this.smoothedRootHz = h, this.sessionAnchorHz = m, this.windows++, this.peakSlots = Math.max(this.peakSlots, this.pool.count),
        !0;
    }
    planSlice(n, e, s, r, o, a) {
        let u = this.program, c = this.left, h = u.tuning, m = Math.abs(Math.log2(Math.max(1e-4, o))), w = clamp(h.grainWindowScale ?? 1, .48, 1.8), R = clamp(((a ? .078 : .104) - m * (a ? .009 : .007) + (m > 1.25 ? (m - 1.25) * (a ? .006 : .004) : 0) + e * (a ? .092 : .104)) * w, (a ? .05 : .07) * Math.min(1, w), (a ? .165 : .19) * Math.max(1, w)), d = Math.max(.003, R * (1 - (a ? .885 : .905)) * clamp(h.grainSpacingScale ?? 1, .25, 2.4)), A = Math.max(1, Math.ceil(Math.max(.001, e) / d)), b = Math.max(1, Math.round(h.maxGrains ?? A)), p = Math.min(A, b);
        if (this.pool.count + p > MAX_GRAINS) return this.fault = "pool-capacity", this.generating = !1,
        !1;
        // Source-duration scaling may extend a grain within the crop, never
        // beyond it. The former buffer-only cap could expose an excluded hit.
        const sourceEnd = Math.min(c.length / this.sourceSampleRate,u.loopEndSec);
        let g = A > b ? Math.max(.003, Math.max(.001, e) / Math.max(1, p)) : d, M = sourceEnd, x = Math.max(.008, Math.min(r * clamp(h.sourceDurationScale ?? 1, .45, 2.4), Math.max(.008, M - s))), l = Math.max(.012, Math.min(x, R * o * 1.18)), f = Math.max(s, s + x - l), W = Math.max(0, f - s), y = n * 997.173 + s * 733.971 + o * 113.147 + (a ? 19.371 : 7.113), z = clamp((h.grainTimeDitherMs ?? 0) / 1e3, 0, .006), N = Math.min(z, Math.max(0, g * .24), Math.max(0, R * .035)), k = clamp((h.grainSourceDitherMs ?? 0) / 1e3, 0, .012), L = (h.microCutSearchRadiusMs ?? 6) / 1e3, X = Math.min(k, Number.isFinite(L) ? Math.max(0, L) * .72 : k, Math.max(0, l * .08)), Z = (a ? .008 : .003) * clamp(h.jitterScale ?? 1, 0, 3.5), H = n + e;
        for (let F = 0; F < p; F++) {
            let _ = n + Math.min(e, F * g), j = clamp((h.sourceStartGuardMs ?? 0) / 1e3, 0, .008);
            F === 0 && j > 2e-4 && (_ = Math.min(_ + Math.min(j, Math.max(0, g * .45)), H - .004));
            let U = z <= 5e-5 || N <= 5e-5 ? 0 : (deterministicDither(y + F * 1.61803398875 + .211) * .68 + deterministicDither(y + F * 2.41421356237 + 3.719) * .32) * N;
            if (Math.abs(U) > 5e-5 && (_ = clamp(_ + U, n, Math.max(n, H - .004))), _ >= H - .003) break;
            let $ = k <= 5e-5 || X <= 5e-5 ? 0 : (deterministicDither(y + F * 1.32471795724 + 11.17) * .74 + deterministicDither(y + F * 2.2360679775 + 5.03) * .26) * X, tt = Math.sin((F + 1) * 1.618 + y * 37e-5) * l * Z, V = clamp(s + W * (p <= 1 ? 0 : F / Math.max(1, p - 1)) + tt + $, s, f), K = a && h.microCutSafety ? chooseCut(this.cutMap, V, s, f, L) : V, Y = Math.min(Math.max(.012, Math.min(R, H - _)), Math.max(0, (M - K) / o));
            if (Y < .003) continue;
            let v = this.pool.count++;
            this.pool.when[v] = _, this.pool.source[v] = K, this.pool.duration[v] = Y, this.pool.sourceDuration[v] = Math.min(M - K, Y * o),
            this.pool.rate[v] = o;
            this.pool.sourceLimit[v] = Math.min(c.length-1,Math.ceil(sourceEnd*this.sourceSampleRate)-1);
            const pitch = Math.fround(o), pool = this.pool;
            pool.startFrame[v] = _*this.sampleRate;
            pool.sourceFrame[v] = pitch===1 ? Math.round(K*this.sourceSampleRate) : K*this.sourceSampleRate;
            pool.sourceStep[v] = pitch*this.sourceSampleRate/this.sampleRate;
            pool.windowStep[v] = 159/(Y*this.sampleRate);
            pool.stopFrame[v] = Math.min(
                Math.ceil((_+Y)*this.sampleRate),
                Math.ceil((_+pool.sourceDuration[v]/pitch)*this.sampleRate),
                Math.ceil(pool.startFrame[v]+(pool.sourceLimit[v]+1-pool.sourceFrame[v])/pool.sourceStep[v]));
        }
        return !0;
    }
    render(frame, outputs) {
        for (let channel=0;channel<outputs.length;channel++) outputs[channel].fill(0);
        const frames=outputs[0]?.length??0;
        if (!frames || !this.left || !this.right || !this.program) return;
        const now=frame/this.sampleRate, program=this.program, pool=this.pool;
        pool.expire(now);
        if (this.generating) {
            if (this.nextWindowSec<now) {
                // Resume on the audio-time lattice. Never replay missed windows.
                const next=Math.max(this.ordinal,Math.ceil((now-this.latticeOriginSec)/program.stepSec-1e-9));
                this.skippedWindows+=next-this.ordinal;
                this.ordinal=next;
                this.nextWindowSec=this.latticeOriginSec+this.ordinal*program.stepSec;
            }
            const horizon=now+Math.max(LOOKAHEAD_SECONDS,frames/this.sampleRate);
            for (let planned=0;this.nextWindowSec<horizon && planned<MAX_WINDOWS_PER_QUANTUM;planned++) {
                if (!this.planWindow(this.nextWindowSec)) break;
                this.ordinal++;
                this.nextWindowSec=this.latticeOriginSec+this.ordinal*program.stepSec;
            }
        }
        const leftOut=outputs[0],rightOut=outputs[1],left=this.left,right=this.right;
        const stereo=!!rightOut && right!==left;
        for (let slot=0;slot<pool.count;slot++) {
            // Gate before reading/preparing render state for future/ended grains.
            const first=Math.max(0,Math.ceil(pool.startFrame[slot])-frame);
            const last=Math.min(frames,pool.stopFrame[slot]-frame);
            if (last<=first) continue;
            const start=pool.startFrame[slot],source=pool.sourceFrame[slot];
            const sourceStep=pool.sourceStep[slot],windowStep=pool.windowStep[slot],limit=pool.sourceLimit[slot];
            if (stereo) {
                for (let i=first;i<last;i++) {
                    const elapsed=frame+i-start,position=source+elapsed*sourceStep,index=position|0,fraction=position-index;
                    if (index>limit) continue;
                    const phase=elapsed*windowStep,wi=phase|0;
                    const envelope=wi>=159?0:HANN_WINDOW[wi]+(HANN_WINDOW[wi+1]-HANN_WINDOW[wi])*(phase-wi);
                    const next=index<limit?index+1:index;
                    leftOut[i]+=Math.fround(left[index]+(left[next]-left[index])*fraction)*envelope;
                    rightOut[i]+=Math.fround(right[index]+(right[next]-right[index])*fraction)*envelope;
                }
            } else {
                // Mono sources are interpolated once, even with stereo output.
                for (let i=first;i<last;i++) {
                    const elapsed=frame+i-start,position=source+elapsed*sourceStep,index=position|0,fraction=position-index;
                    if (index>limit) continue;
                    const phase=elapsed*windowStep,wi=phase|0;
                    const envelope=wi>=159?0:HANN_WINDOW[wi]+(HANN_WINDOW[wi+1]-HANN_WINDOW[wi])*(phase-wi);
                    const next=index<limit?index+1:index;
                    const value=Math.fround(left[index]+(left[next]-left[index])*fraction)*envelope;
                    leftOut[i]+=value;
                    if (rightOut) rightOut[i]+=value;
                }
            }
        }
    }
};

var RAW_RESIDENT_PROCESSOR_NAME = "xensonar-raw-resident-v1", RAW_RESIDENT_MAX_PCM_FRAMES = 4194304, RawResidentProcessor = class extends AudioWorkletProcessor {
    constructor(e) {
        super(e);
        i(this, "core", new RawResidentCore(sampleRate));
        i(this, "session");
        i(this, "asset");
        i(this, "token");
        i(this, "sourceId");
        i(this, "ready", !1);
        i(this, "stopped", !1);
        i(this, "sequence", 0);
        i(this, "faultSent", !1);
        i(this, "tailEnded", !1);
        this.session = e?.processorOptions?.session, this.asset = e?.processorOptions?.asset,
        this.token = e?.processorOptions?.token, this.sourceId = e?.processorOptions?.sourceId,
        this.port.onmessage = s => {
            let r = s.data;
            if (!(this.stopped || !r || r.session !== this.session || r.asset !== this.asset || r.token !== this.token || r.sourceId !== this.sourceId)) {
                if (r.type === "stop") {
                    this.stopped = !0, this.ready = !1, this.core.stop(), this.port.onmessage = null,
                    this.port.postMessage({
                        type: "released",
                        session: this.session,
                        asset: this.asset,
                        token: this.token,
                        sourceId: this.sourceId
                    });
                    return;
                }
                if (r.type === "load" && !this.ready) {
                    let o = r.channels;
                    if (!Array.isArray(o) || o.length < 1 || o.length > 2 || !(o[0] instanceof Float32Array) || o[0].length < 2 || o[0].length > RAW_RESIDENT_MAX_PCM_FRAMES || o.some(a => !(a instanceof Float32Array) || a.length !== o[0].length || !isTransferBuffer(a)) || !Number.isFinite(r.sampleRate) || r.sampleRate < 8e3 || r.sampleRate > 192e3 || r.map && !validCutMap(r.map, r.sampleRate, o[0].length, this.sourceId)) return;
                    this.core.load(o, r.sampleRate, r.map ?? null), this.ready = !0, this.port.postMessage({
                        type: "ready",
                        session: this.session,
                        asset: this.asset,
                        token: this.token,
                        sourceId: this.sourceId,
                        sampleRate: r.sampleRate,
                        frameCount: o[0].length,
                        channelCount: o.length
                    });
                } else if (r.type === "arm" && this.ready && !this.core.program) {
                    let o = r.program;
                    if (!validProgram(o) || o.mode === "fragment" && !this.core.cutMap || o.loopEndSec > this.core.left.length / this.core.sourceSampleRate || !Number.isFinite(r.firstWindowSec) || r.firstWindowSec < currentFrame / sampleRate) {
                        this.port.postMessage({
                            type: "fault",
                            session: this.session,
                            asset: this.asset,
                            token: this.token,
                            sourceId: this.sourceId,
                            reason: "late-or-invalid-arm"
                        });
                        return;
                    }
                    this.sequence = r.sequence, this.core.arm(o, r.firstWindowSec), this.port.postMessage({
                        type: "owned",
                        session: this.session,
                        asset: this.asset,
                        token: this.token,
                        sourceId: this.sourceId,
                        firstWindowSec: r.firstWindowSec
                    });
                } else if (r.type === "state" && this.ready && this.core.generating && r.sequence > this.sequence) {
                    if (!validProgram(r.program) || r.program.mode === "fragment" && !this.core.cutMap || r.program.loopEndSec > this.core.left.length / this.core.sourceSampleRate) return;
                    this.sequence = r.sequence, this.core.update(r.program);
                } else if (r.type === "drain" && this.ready && this.core.program) {
                    let o = this.core.drain();
                    this.port.postMessage({
                        type: "drained",
                        session: this.session,
                        asset: this.asset,
                        token: this.token,
                        sourceId: this.sourceId,
                        nextWindowSec: o,
                        smoothedRootHz: this.core.smoothedRootHz,
                        sessionAnchorHz: this.core.sessionAnchorHz
                    });
                }
            }
        };
    }
    process(e, s) {
        if (this.stopped) return !1;
        let r = s[0];
        if (r?.[0]?.length > 512) {
            this.core.fault = "unsupported-quantum", this.core.generating = !1;
            for (let o = 0; o < r.length; o++) r[o].fill(0);
        } else r && this.core.render(currentFrame, r);
        return this.core.fault && !this.faultSent && (this.faultSent = !0, this.port.postMessage({
            type: "fault",
            session: this.session,
            asset: this.asset,
            token: this.token,
            sourceId: this.sourceId,
            reason: this.core.fault
        })), this.core.program && !this.core.generating && !this.core.pool.count && !this.tailEnded ? (this.tailEnded = !0,
        this.core.stop(), this.port.postMessage({
            type: "tail-ended",
            session: this.session,
            asset: this.asset,
            token: this.token,
            sourceId: this.sourceId
        }), this.stopped = !0, this.port.onmessage = null, !1) : !0;
    }
};

registerProcessor(RAW_RESIDENT_PROCESSOR_NAME, RawResidentProcessor);

export{ RAW_RESIDENT_MAX_PCM_FRAMES, RAW_RESIDENT_PROCESSOR_NAME, RawResidentProcessor };
`;
