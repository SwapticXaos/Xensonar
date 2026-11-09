/* xen-waveform-donor-idle-render: original animated-waveform-placeholder-animation.zip
 * Original TypeScript modules copied in third_party/animated_waveform_placeholder_2026.
 * tsc --target es2020 --module es2020; module boundaries concatenated for file://
 * Export/import declarations removed only, animation and mask math unchanged.
 * Only idle visuals are used, never the donor audio engine.
 */
const __XenIdleWaveDonorP33 = (()=>{
// *** rand.ts (direct TypeScript transpilation, no reimplementation) ***
/** Deterministic hash based pseudo randomness — stable per (x, seed). */
function hash(x, seed = 0) {
    let h = Math.imul(x ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(seed + 0x165667b1, 0xc2b2ae35);
    h = Math.imul(h ^ (h >>> 13), 0x27d4eb2d);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967295;
}
/** Signed hash noise in [-1, 1]. */
function snoise(x, seed = 0) {
    return hash(x | 0, seed) * 2 - 1;
}
/** Smooth 1D value noise in [-1, 1]. */
function valueNoise(x, seed = 0) {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    const a = snoise(i, seed);
    const b = snoise(i + 1, seed);
    return a + (b - a) * u;
}
/** Layered value noise. */
function fbm(x, seed = 0, octaves = 3) {
    let amp = 0.6;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
        sum += valueNoise(x * freq, seed + o * 17) * amp;
        norm += amp;
        amp *= 0.5;
        freq *= 2.1;
    }
    return sum / norm;
}
const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
const smoothstep = (edge0, edge1, x) => {
    const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6));
    return t * t * (3 - 2 * t);
};
/** Ease with a little overshoot — makes the letters "pop" out of the line. */
function easeOutBack(t, k = 1.45) {
    const x = clamp(t);
    const c3 = k + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + k * Math.pow(x - 1, 2);
}

// *** textMask.ts (direct TypeScript transpilation, no reimplementation) ***
const EMPTY_RUN = new Float32Array(0);
function emptyMask(width, height) {
    const w = Math.max(1, width | 0);
    return {
        width: w,
        height: Math.max(1, height | 0),
        runs: new Array(w).fill(EMPTY_RUN),
        coverage: new Float32Array(w),
        env: new Float32Array(w),
        top: new Float32Array(w),
        bottom: new Float32Array(w),
        ink: new Uint8Array(w),
    };
}
function buildTextMask(text, width, height, options = {}) {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(8, Math.floor(height));
    const { fill = 0.9, capHeight = 0.74, tracking = 0.07, fontWeight = 900, fontFamily = '"Inter", "Helvetica Neue", Arial, sans-serif', } = options;
    if (typeof document === "undefined")
        return emptyMask(w, h);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx)
        return emptyMask(w, h);
    const chars = [...text];
    const measure = (size) => {
        ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
        const space = size * tracking;
        let total = 0;
        const widths = [];
        for (const c of chars) {
            const m = ctx.measureText(c).width;
            widths.push(m);
            total += m;
        }
        total += space * Math.max(0, chars.length - 1);
        return { total, widths, space };
    };
    // Fit horizontally, then clamp by the available cap height.
    let size = h * 0.8;
    let m = measure(size);
    if (m.total > 0)
        size = (size * (w * fill)) / m.total;
    const capTest = (() => {
        ctx.font = `${fontWeight} 100px ${fontFamily}`;
        const met = ctx.measureText("HX");
        const asc = met.actualBoundingBoxAscent || 72;
        return asc / 100;
    })();
    const maxSize = (h * capHeight) / capTest;
    size = Math.min(size, maxSize);
    m = measure(size);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    const met = ctx.measureText("HX");
    const ascent = met.actualBoundingBoxAscent || size * 0.72;
    const baseline = h / 2 + ascent / 2;
    let x = (w - m.total) / 2;
    chars.forEach((c, i) => {
        ctx.fillText(c, x, baseline);
        x += m.widths[i] + m.space;
    });
    const img = ctx.getImageData(0, 0, w, h).data;
    const mask = emptyMask(w, h);
    const halfH = h / 2;
    const runBuf = [];
    for (let col = 0; col < w; col++) {
        runBuf.length = 0;
        let inkCount = 0;
        let runStart = -1;
        for (let row = 0; row < h; row++) {
            const a = img[(row * w + col) * 4 + 3];
            const on = a > 110;
            if (on)
                inkCount++;
            if (on && runStart < 0)
                runStart = row;
            if ((!on || row === h - 1) && runStart >= 0) {
                const end = on ? row : row - 1;
                if (end - runStart >= 0) {
                    runBuf.push((runStart - halfH) / halfH, (end + 1 - halfH) / halfH);
                }
                runStart = -1;
            }
        }
        if (runBuf.length) {
            mask.runs[col] = Float32Array.from(runBuf);
            mask.ink[col] = 1;
            mask.top[col] = runBuf[0];
            mask.bottom[col] = runBuf[runBuf.length - 1];
            mask.coverage[col] = inkCount / h;
        }
    }
    mask.env.set(smooth(smooth(mask.coverage, Math.max(3, Math.round(w / 110))), Math.max(2, Math.round(w / 180))));
    return mask;
}
/** Box blur via prefix sums — turns the blocky ink coverage into a soft envelope. */
function smooth(src, radius) {
    const n = src.length;
    const out = new Float32Array(n);
    const sums = new Float32Array(n + 1);
    for (let i = 0; i < n; i++)
        sums[i + 1] = sums[i] + src[i];
    for (let i = 0; i < n; i++) {
        const a = Math.max(0, i - radius);
        const b = Math.min(n, i + radius + 1);
        out[i] = (sums[b] - sums[a]) / (b - a);
    }
    return out;
}

// *** render.ts (direct TypeScript transpilation, no reimplementation) ***
const IDLE = {
    sweep: 7.2,
    hold: 1.7,
    collapse: 0.95,
    rest: 0.55,
};
const IDLE_CYCLE = IDLE.sweep + IDLE.hold + IDLE.collapse + IDLE.rest;
const IDLE_DURATION = IDLE.sweep;
function wipeRightToLeft(cp, u, soft = 0.22) {
    const boundary = 1 - cp * (1 + soft);
    return clamp((u - boundary) / soft);
}
function drawTrack(p) {
    const { ctx, width: w, height: h, dpr, colors } = p;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // ---- background -------------------------------------------------------
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#080d13");
    bg.addColorStop(0.5, "#0a1118");
    bg.addColorStop(1, "#070b10");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    const mid = Math.round(h / 2) + 0.5;
    const halfH = h / 2 - 7;
    // ---- grid -------------------------------------------------------------
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(109, 160, 196, 0.07)";
    ctx.beginPath();
    for (const gx of p.gridXs) {
        const x = Math.round(gx) + 0.5;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(109, 160, 196, 0.1)";
    ctx.beginPath();
    for (const f of [0.5, -0.5]) {
        const y = Math.round(mid - f * halfH) + 0.5;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
    }
    ctx.stroke();
    // zero line
    ctx.strokeStyle = "rgba(140, 190, 225, 0.22)";
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();
    const gain = p.muted ? 0.08 : p.gain;
    if (p.mode === "audio" && p.peaks) {
        drawAudio(p, mid, halfH, gain);
    }
    else {
        drawIdle(p, mid, halfH, gain);
    }
    // subtle top/bottom inner shadow for depth
    const sh = ctx.createLinearGradient(0, 0, 0, h);
    sh.addColorStop(0, "rgba(0,0,0,0.45)");
    sh.addColorStop(0.14, "rgba(0,0,0,0)");
    sh.addColorStop(0.86, "rgba(0,0,0,0)");
    sh.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = sh;
    ctx.fillRect(0, 0, w, h);
    void colors;
}
/* ------------------------------------------------------------------ */
/*  IDLE — the letters grow out of the flat line                       */
/* ------------------------------------------------------------------ */
function drawIdle(p, mid, halfH, gain) {
    const { ctx, width: w, mask, colors, seed, time, cycleT, head } = p;
    const collapseStart = IDLE.sweep + IDLE.hold;
    const cp = clamp((cycleT - collapseStart) / IDLE.collapse);
    const topY = new Array(w);
    const botY = new Array(w);
    const bright = new Path2D();
    const core = new Path2D();
    const hot = new Path2D();
    const frameSeed = (p.frame * 2654435761) >>> 0;
    for (let x = 0; x < w; x++) {
        const u = w > 1 ? x / (w - 1) : 0;
        const px = x + 0.5;
        // --- reveal state for this column ---
        const since = (head - u) * IDLE.sweep;
        let r = easeOutBack(smoothstep(0, 0.34, since), 1.3);
        if (cp > 0)
            r *= 1 - wipeRightToLeft(cp, u);
        r = Math.max(0, r);
        // --- noise floor ("no signal" hiss) ---
        const drift = time * 2.6;
        let nf = 0.013 + 0.02 * Math.abs(fbm(x * 0.09 + drift, seed, 2));
        if (hash(x + Math.floor(time * 20) * 7919, seed + 3) > 0.9965)
            nf += 0.07;
        // --- scan head: garbage right in front of the cursor ---
        const d = (u - head) * w;
        if (cp === 0 && d > -4 && d < 34) {
            const fall = Math.exp(-Math.max(0, d) / 11);
            nf += 0.34 * fall * Math.abs(fbm(x * 0.5 + time * 24, seed + 9, 2));
        }
        const headGlow = Math.exp(-(d * d) / (2 * 15 * 15));
        const breath = 1 + 0.028 * Math.sin(time * 1.7 + u * 7.5);
        const s = r * breath * gain * (1 + headGlow * 0.18);
        const cov = mask ? mask.env[x] : 0;
        const wobble = fbm(x * 0.035 + time * 0.75, seed + 5, 2) * 1.3;
        // envelope body (plausible RMS shape of the word)
        let bodyA = Math.min(1, cov * 2.1) * s * (0.86 + 0.14 * fbm(x * 0.12, seed + 61, 2));
        bodyA = Math.max(bodyA, nf * (1 + headGlow * 2.2));
        topY[x] = mid - bodyA * halfH + wobble * 0.5;
        botY[x] = mid + bodyA * halfH + wobble * 0.5;
        // noise floor strokes (always visible → the "empty" track)
        const nY = nf * halfH * (1 + headGlow * 1.8);
        hot.moveTo(px, mid - nY + wobble * 0.5);
        hot.lineTo(px, mid + nY + wobble * 0.5);
        // --- glyph runs = the actual letters ---
        const runs = mask ? mask.runs[x] : null;
        if (runs && runs.length && s > 0.004) {
            const jitterA = (hash(x * 3 + frameSeed, seed) * 2 - 1) * 1.5;
            const jitterB = (hash(x * 7 + frameSeed, seed + 1) * 2 - 1) * 1.5;
            // ragged "audio" edge + occasional transient spikes
            const fuzz = (0.9 + 1.5 * Math.abs(fbm(x * 0.55 + time * 5, seed + 21, 2))) * s;
            const spike = hash(x * 13 + Math.floor(time * 12) * 104729, seed + 31) > 0.978 ? 5.5 + 7 * hash(x, seed + 2) : 0;
            const lastRun = runs.length - 2;
            for (let i = 0; i < runs.length; i += 2) {
                const v0 = runs[i] * s;
                const v1 = runs[i + 1] * s;
                const outerTop = i === 0 ? fuzz + spike * s : 0;
                const outerBot = i === lastRun ? fuzz + spike * s : 0;
                const y0 = mid + v0 * halfH + wobble + jitterA - outerTop;
                const y1 = mid + v1 * halfH + wobble + jitterB + outerBot;
                if (y1 - y0 < 0.9) {
                    bright.moveTo(px, y0 - 0.5);
                    bright.lineTo(px, y0 + 0.5);
                    continue;
                }
                bright.moveTo(px, y0);
                bright.lineTo(px, y1);
                const cy = (y0 + y1) / 2;
                const ch = (y1 - y0) * 0.5 * (0.4 + 0.12 * fbm(x * 0.2 + time * 1.3, seed + 44, 2));
                if (ch > 0.8) {
                    core.moveTo(px, cy - ch);
                    core.lineTo(px, cy + ch);
                }
            }
        }
    }
    paintBody(ctx, topY, botY, w, mid, colors);
    // noise floor
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.noise;
    ctx.stroke(hot);
    // bloom + crisp letters
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 3.5;
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = colors.peak;
    ctx.stroke(bright);
    ctx.restore();
    ctx.lineWidth = 1;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = colors.peak;
    ctx.stroke(bright);
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = colors.core;
    ctx.stroke(core);
    ctx.globalAlpha = 1;
    // scan head comet trail
    if (cp === 0 && head < 1) {
        const hx = head * w;
        const g = ctx.createLinearGradient(hx - 54, 0, hx + 16, 0);
        g.addColorStop(0, "rgba(190, 235, 255, 0)");
        g.addColorStop(0.62, "rgba(190, 235, 255, 0.035)");
        g.addColorStop(0.77, "rgba(220, 245, 255, 0.075)");
        g.addColorStop(1, "rgba(190, 235, 255, 0)");
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = g;
        ctx.fillRect(hx - 54, 0, 70, p.height);
        ctx.restore();
    }
}
/* ------------------------------------------------------------------ */
/*  AUDIO — real peaks                                                 */
/* ------------------------------------------------------------------ */
function drawAudio(p, mid, halfH, gain) {
    const { ctx, width: w, peaks, colors } = p;
    if (!peaks)
        return;
    const topY = new Array(w);
    const botY = new Array(w);
    const bright = new Path2D();
    for (let x = 0; x < w; x++) {
        const px = x + 0.5;
        const hi = clamp(peaks.max[x] * gain, -1, 1);
        const lo = clamp(peaks.min[x] * gain, -1, 1);
        const rms = clamp(peaks.rms[x] * gain, 0, 1);
        let y0 = mid - hi * halfH;
        let y1 = mid - lo * halfH;
        if (y1 - y0 < 1) {
            y0 = mid - 0.5;
            y1 = mid + 0.5;
        }
        bright.moveTo(px, y0);
        bright.lineTo(px, y1);
        topY[x] = mid - rms * halfH;
        botY[x] = mid + rms * halfH;
    }
    paintBody(ctx, topY, botY, w, mid, colors);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = colors.peak;
    ctx.stroke(bright);
    ctx.restore();
    ctx.lineWidth = 1;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = colors.peak;
    ctx.stroke(bright);
    // played region tint
    const hx = p.head * w;
    if (hx > 0.5) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(120, 190, 255, 0.032)";
        ctx.fillRect(0, 0, hx, p.height);
        ctx.restore();
    }
}
function paintBody(ctx, topY, botY, w, mid, colors) {
    const path = new Path2D();
    path.moveTo(0.5, topY[0]);
    for (let x = 1; x < w; x++)
        path.lineTo(x + 0.5, topY[x]);
    for (let x = w - 1; x >= 0; x--)
        path.lineTo(x + 0.5, botY[x]);
    path.closePath();
    const grad = ctx.createLinearGradient(0, mid - 60, 0, mid + 60);
    grad.addColorStop(0, colors.body);
    grad.addColorStop(0.5, colors.bodyEdge);
    grad.addColorStop(1, colors.body);
    ctx.fillStyle = grad;
    ctx.fill(path);
}

return Object.freeze({drawTrack,buildTextMask,IDLE_CYCLE,IDLE,IDLE_DURATION});
})();
