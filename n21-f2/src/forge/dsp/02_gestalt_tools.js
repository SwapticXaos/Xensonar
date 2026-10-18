// Pure shared math; tuning and clamp belong to the selected renderer.
function __forgeGestaltToolsFactory(TAU,TUNING,clamp){function assertMaterialContract(carrier, model) {
    if (
      !carrier ||
      !Array.isArray(carrier.bands) ||
      !Number.isFinite(carrier.rootReferenceHz) ||
      carrier.rootReferenceHz <= 0
    )
      throw Error("Klanggestalt material contract: carrier bands or root reference missing.");
    if (
      !model ||
      !ArrayBuffer.isView(model.samples) ||
      !(model.sampleRate > 0) ||
      !Number.isFinite(model.sampleRate) ||
      !Array.isArray(model.sourceIndex?.windows)
    )
      throw Error(
        "Klanggestalt material contract: PCM, sample rate or allowed source windows missing.",
      );
    if (model.atlas && !Array.isArray(model.atlas.nodes))
      throw Error("Klanggestalt material contract: atlas.nodes must be an array.");
    for (const band of carrier.bands)
      if (
        !band?.gainCurve?.length ||
        !band.centerRatioCurve?.length ||
        band.centerRatioCurve.length !== band.gainCurve.length ||
        (band.supportSigmaCurve != null && band.supportSigmaCurve.length !== band.gainCurve.length)
      )
        throw Error("Klanggestalt material contract: malformed carrier band curves.");
    for (const w of model.sourceIndex.windows)
      if (
        !Number.isInteger(w.startSample) ||
        !Number.isInteger(w.endSample) ||
        w.startSample < 0 ||
        w.endSample < w.startSample ||
        w.endSample >= model.samples.length
      )
        throw Error("Klanggestalt material contract: source window lies outside donor PCM.");
    return model;
  }
function fft(re, im, inverse = false) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [re[i], re[j]] = [re[j], re[i]];
        [im[i], im[j]] = [im[j], im[i]];
      }
    }
    for (let size = 2; size <= n; size *= 2) {
      const angle = (inverse ? TAU : -TAU) / size,
        cr = Math.cos(angle),
        ci = Math.sin(angle);
      for (let start = 0; start < n; start += size) {
        let wr = 1,
          wi = 0;
        for (let k = 0; k < size / 2; k++) {
          const a = start + k,
            b = a + size / 2,
            tr = re[b] * wr - im[b] * wi,
            ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr;
          im[b] = im[a] - ti;
          re[a] += tr;
          im[a] += ti;
          const next = wr * cr - wi * ci;
          wi = wr * ci + wi * cr;
          wr = next;
        }
      }
    }
    if (inverse)
      for (let i = 0; i < n; i++) {
        re[i] /= n;
        im[i] /= n;
      }
  }
function curve(values, x, fallback = 0) {
    if (!values?.length) return fallback;
    const pos = clamp(x, 0, values.length - 1),
      a = Math.floor(pos),
      f = pos - a;
    return (
      (values[a] ?? fallback) * (1 - f) +
      (values[Math.min(values.length - 1, a + 1)] ?? fallback) * f
    );
  }
function nodeAt(model, position, run) {
    const nodes = model.atlas?.nodes ?? [],
      hop = model.atlas?.hop ?? model.levelHop ?? 1;
    const index = clamp(Math.round(position / hop), 0, nodes.length - 1),
      n = nodes[index];
    // Analysis windows touching an excluded boundary do not supply a pitch.
    const radius = model.sampleRate * 0.0275;
    if (!n || n.center - radius < run.sourceStart || n.center + radius > run.sourceEnd) return null;
    const next = nodes[Math.min(nodes.length - 1, index + (position >= n.center ? 1 : -1))];
    if (
      !next ||
      next.center - radius < run.sourceStart ||
      next.center + radius > run.sourceEnd ||
      !(n.f0Hz > 0 && next.f0Hz > 0)
    )
      return n;
    const f = clamp(
      Math.abs(position - n.center) / Math.max(1, Math.abs(next.center - n.center)),
      0,
      1,
    );
    const compatible = Math.abs(Math.log(n.f0Hz / next.f0Hz)) < 0.18;
    return compatible
      ? {
          ...n,
          f0Hz: Math.exp(Math.log(n.f0Hz) * (1 - f) + Math.log(next.f0Hz) * f),
          pitchConfidence: Math.min(n.pitchConfidence, next.pitchConfidence),
        }
      : n;
  }
function read(model, run, position) {
    if (position < run.sourceStart || position > run.sourceEnd) return 0;
    const a = Math.floor(position),
      b = Math.min(run.sourceEnd, a + 1),
      f = position - a;
    return model.samples[a] * (1 - f) + model.samples[b] * f;
  }
function makeSincKernel(step) {
    if (step <= 1.02) return null;
    const cutoff = 1 / step,
      radius = Math.min(64, Math.ceil(8 * step));
    const taps = radius * 2,
      phases = TUNING.resamplingPhases;
    const table = new Float64Array((phases + 1) * taps);
    for (let phase = 0; phase <= phases; phase++) {
      const f = phase / phases,
        row = phase * taps;
      let total = 0;
      for (let q = 0; q < taps; q++) {
        const x = (f + radius - 1 - q) * cutoff;
        if (Math.abs(x) >= 8) continue;
        const w =
          (Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)) *
          (0.5 + 0.5 * Math.cos((Math.PI * x) / 8)) *
          cutoff;
        table[row + q] = w;
        total += w;
      }
      const factor = 1 / Math.max(1e-9, total);
      for (let q = 0; q < taps; q++) table[row + q] *= factor;
    }
    return { table, radius, taps, phases };
  }
function resample(model, run, position, kernel) {
    if (!kernel) return read(model, run, position);
    const mid = Math.floor(position),
      f = (position - mid) * kernel.phases;
    const phase = Math.min(kernel.phases - 1, Math.floor(f)),
      blend = f - phase;
    const row = phase * kernel.taps,
      next = row + kernel.taps;
    const first = mid - kernel.radius + 1,
      samples = model.samples;
    let value = 0;
    // Values beyond the selected donor window remain strictly zero, and are
    // never drawn from an excluded region even when the sinc crosses a seam.
    for (let q = 0; q < kernel.taps; q++) {
      const i = first + q;
      if (i >= run.sourceStart && i <= run.sourceEnd)
        value +=
          samples[i] * (kernel.table[row + q] * (1 - blend) + kernel.table[next + q] * blend);
    }
    return value;
  }
function envelope(mag, f0, confidence, sr, re, im, output) {
    const size = re.length,
      bins = mag.length;
    re.fill(0);
    im.fill(0);
    let maximum = 0;
    for (const m of mag) maximum = Math.max(maximum, m);
    const floor = Math.max(1e-12, maximum * 0.00004);
    for (let k = 0; k < bins; k++) re[k] = Math.log(Math.max(floor, mag[k]));
    for (let k = 1; k < bins - 1; k++) re[size - k] = re[k];
    fft(re, im, true);
    const cutoff = clamp(
      Math.round(sr / (confidence > 0.65 && f0 > 0 ? f0 * 1.8 : 650)),
      8,
      size / 8,
    );
    for (let q = 1; q < size; q++) {
      const d = Math.min(q, size - q),
        w = d <= cutoff ? 0.5 + 0.5 * Math.cos((Math.PI * d) / cutoff) : 0;
      re[q] *= w;
      im[q] = 0;
    }
    fft(re, im);
    for (let k = 0; k < bins; k++) output[k] = re[k];
  }
return Object.freeze({assertMaterialContract,fft,curve,nodeAt,read,makeSincKernel,resample,envelope});}
