// Identical shared helpers; every renderer gets its own closure.
function __forgeMaterialToolsFactory(){const version = "donor-material-f3.56",
    clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const phase = (p) => p - 2 * Math.PI * Math.round(p / (2 * Math.PI));
const check = (o) => {
    if (o.isCancelled?.())
      throw new DOMException("Sound Material rendering cancelled.", "AbortError");
  };
const tick = () => new Promise((r) => setTimeout(r, 0));
function complexFFT(real, imag, inverse = false) {
    const n = real.length;
    if (n !== imag.length || n < 2 || n & (n - 1)) throw new Error("FFT requires a power of two.");
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [real[i], real[j]] = [real[j], real[i]];
        [imag[i], imag[j]] = [imag[j], imag[i]];
      }
    }
    for (let size = 2; size <= n; size *= 2) {
      const angle = ((inverse ? 2 : -2) * Math.PI) / size,
        wr = Math.cos(angle),
        wi = Math.sin(angle);
      for (let start = 0; start < n; start += size) {
        let r = 1,
          im = 0;
        for (let k = 0; k < size / 2; k++) {
          const a = start + k,
            b = a + size / 2;
          const tr = real[b] * r - imag[b] * im,
            ti = real[b] * im + imag[b] * r;
          real[b] = real[a] - tr;
          imag[b] = imag[a] - ti;
          real[a] += tr;
          imag[a] += ti;
          const next = r * wr - im * wi;
          im = r * wi + im * wr;
          r = next;
        }
      }
    }
    if (inverse)
      for (let i = 0; i < n; i++) {
        real[i] /= n;
        imag[i] /= n;
      }
  }
function allowedModel(input, cfg) {
    const model = input.sourceGrains ?? input,
      count = model.samples?.length ?? 0;
    if (count < 128) throw Error("The donor selection contains too little sound material.");
    const regions = cfg.regions ?? [],
      inc = regions.filter((r) => r.role === "include"),
      exc = regions.filter((r) => r.role === "exclude");
    let spans = inc.length
      ? inc.map((r) => [Math.ceil(r.start * count), Math.min(count, Math.floor(r.end * count))])
      : [[0, count]];
    spans.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const [a, b] of spans) {
      const last = merged.at(-1);
      if (last && a <= last[1]) last[1] = Math.max(last[1], b);
      else merged.push([a, b]);
    }
    spans = merged;
    for (const r of exc) {
      const a = Math.floor(r.start * count),
        b = Math.ceil(r.end * count),
        next = [];
      for (const [lo, hi] of spans) {
        if (b <= lo || a >= hi) next.push([lo, hi]);
        else {
          if (a > lo) next.push([lo, a]);
          if (b < hi) next.push([b, hi]);
        }
      }
      spans = next;
    }
    if (cfg.params.planning === "reference") {
      const a = Math.ceil(cfg.params.referenceStart * count),
        b = Math.floor(cfg.params.referenceEnd * count);
      if (!spans.some(([lo, hi]) => a >= lo && b <= hi))
        throw Error("The reference sequence must lie entirely within an allowed donor region.");
      spans = [[a, b]];
    }
    const windows = spans
      .filter(([a, b]) => b - a >= 128)
      .map(([a, b], id) => ({
        id,
        startSample: a,
        endSample: b - 1,
        stateDistance: 0,
        role: "material",
      }));
    if (!windows.length) throw Error("The markings leave no continuous donor region.");
    return {
      ...model,
      sourceIndex: { windows, fallback: false, selection: "whole-recorded-material" },
      materialPrepared: true,
    };
  }
function control(carrier, voice, sample, length, gainOnly = false) {
    const b = carrier.bands[voice],
      d = b.gainCurve.length - 1,
      x = clamp((sample / Math.max(1, length - 1)) * d, 0, d),
      cell = Math.round(x);
    if (!(b.gainCurve[cell] > 0)) return null;
    const a = Math.floor(x),
      z = Math.min(d, a + 1),
      f = x - a,
      connected = b.gainCurve[a] > 0 && b.gainCurve[z] > 0;
    const gain = connected ? b.gainCurve[a] * (1 - f) + b.gainCurve[z] * f : b.gainCurve[cell];
    if (gainOnly) return gain;
    const ratio = connected
      ? Math.exp(Math.log(b.centerRatioCurve[a]) * (1 - f) + Math.log(b.centerRatioCurve[z]) * f)
      : b.centerRatioCurve[cell];
    return { gain, hz: ratio * carrier.rootReferenceHz, cell };
  }
// Per-sample output mixing needs the same gain, without log-pitch work or an object.
function gainAt(carrier, voice, sample, length) { return control(carrier, voice, sample, length, true); }
function plan(carrier, input, sr, duration, cfg) {
    const model = input.materialPrepared ? input : allowedModel(input, cfg),
      length = Math.round(sr * duration),
      windows = model.sourceIndex.windows,
      runs = [];
    const mode = cfg.params.materialTime ?? "stretch";
    let previousWindow = null;
    for (let voice = 0; voice < carrier.bands.length; voice++) {
      const b = carrier.bands[voice],
        d = Math.max(1, b.gainCurve.length - 1);
      for (let i = 0; i < b.gainCurve.length; ) {
        if (!(b.gainCurve[i] > 0)) {
          i++;
          continue;
        }
        const first = i;
        while (i < b.gainCurve.length && b.gainCurve[i] > 0) i++;
        const start = Math.max(0, Math.ceil(((first - 0.5) / d) * (length - 1))),
          end =
            i === b.gainCurve.length
              ? length
              : Math.min(length, Math.ceil(((i - 0.5) / d) * (length - 1)));
        // F53 continuity principle at phrase scale: never reselect at each pitch step.
        const preferred = cfg.params.position * model.samples.length;
        const selected =
          cfg.params.planning === "structure" && previousWindow && windows.includes(previousWindow)
            ? previousWindow
            : windows.reduce((a, b) =>
                Math.abs((a.startSample + a.endSample) / 2 - preferred) <
                Math.abs((b.startSample + b.endSample) / 2 - preferred)
                  ? a
                  : b,
              );
        previousWindow = selected;
        const sourceStart = selected.startSample,
          sourceEnd = selected.endSample + 1,
          span = sourceEnd - sourceStart;
        const speed =
          mode === "stretch"
            ? (span - 1) / Math.max(1, end - start - 1)
            : mode === "hold"
              ? 0
              : model.sampleRate / sr;
        runs.push({
          voice,
          firstCell: first,
          lastCell: i - 1,
          startSample: start,
          endSample: end,
          windowId: selected.id,
          sourceStart,
          sourceEnd: sourceEnd - 1,
          stateDistance: 0,
          sourceSpeed: speed,
          sourceOffset:
            mode === "stretch" ? 0 : clamp(cfg.params.position ?? 0, 0, 1) * Math.max(0, span - 1),
          timeMode: mode,
          workbenchRead: {
            size: 0,
            safeLo: sourceStart,
            safeHi: sourceEnd - 1,
            firstSourceCenter: sourceStart,
            lastSourceCenter: sourceEnd - 1,
          },
          states: [],
        });
      }
    }
    return {
      version,
      sampleRate: sr,
      durationSec: duration,
      runs,
      workbench: cfg,
      sourceFallback: false,
      maximumLevelCorrection: 1,
      structuralPlan: {
        version: "f353-continuity-adapted-f356",
        mode: cfg.params.planning,
        sourceJumps: 0,
        states: runs.length,
        warnings: [],
        roles: ["whole-source-span-per-carrier-event"],
      },
    };
  }
function sample(model, run, position) {
    const lo = run.sourceStart,
      hi = run.sourceEnd;
    if (position < lo || position > hi) return 0;
    const a = Math.floor(position),
      b = Math.min(hi, a + 1),
      f = position - a;
    return model.samples[a] * (1 - f) + model.samples[b] * f;
  }
function sourceAt(run, age) {
    const span = run.sourceEnd - run.sourceStart + 1,
      offset = run.sourceOffset + age * run.sourceSpeed;
    return run.sourceStart + (run.timeMode === "loop" ? offset : clamp(offset, 0, span - 1));
  }
function read(model, run, position) {
    if (run.timeMode !== "loop") return sample(model, run, position);
    const span = run.sourceEnd - run.sourceStart + 1,
      local = position - run.sourceStart;
    const fade = Math.min(span / 8, model.sampleRate * 0.025),
      period = span - fade;
    if (local < 0) return 0;
    // The first pass keeps the original entry. Later passes overlap the tail
    // with the beginning; the ring advances by span-fade, avoiding a second seam.
    if (local < period) return sample(model, run, position);
    const at = local % period;
    if (at >= fade) return sample(model, run, run.sourceStart + at);
    const w = 0.5 - 0.5 * Math.cos((Math.PI * at) / fade);
    return (
      sample(model, run, run.sourceStart + period + at) * (1 - w) +
      sample(model, run, run.sourceStart + at) * w
    );
  }
function resample(model, run, position, step) {
    if (step <= 1.02) return read(model, run, position);
    const cutoff = 1 / step,
      radius = Math.min(64, Math.ceil(8 * step)),
      center = Math.floor(position);
    let value = 0,
      weight = 0;
    for (let i = center - radius + 1; i <= center + radius; i++) {
      const x = (position - i) * cutoff;
      if (Math.abs(x) >= 8) continue;
      const sinc = Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x),
        w = sinc * (0.5 + 0.5 * Math.cos((Math.PI * x) / 8)) * cutoff;
      value += read(model, run, i) * w;
      weight += w;
    }
    return value / Math.max(1e-9, weight);
  }
return Object.freeze({version,clamp,phase,check,tick,complexFFT,allowedModel,control,gainAt,plan,sample,sourceAt,read,resample});}
