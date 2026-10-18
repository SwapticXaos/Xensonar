
function __f347OriginalGestaltFactory(){
  "use strict";
  const version = "donor-klanggestalt-f3.56.30",
    TAU = 2 * Math.PI;
  // Sonic parameters are intentionally unchanged. Internal constants, not new UI controls.
  const TUNING = Object.freeze({
    shortPhraseSec: 0.16,
    validPitchConfidence: 0.7,
    tonalPitchConfidence: 0.68,
    pitchBlendSec: 0.035,
    edgeFadeSec: 0.002,
    resamplingPhases: 2048,
  });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
const {assertMaterialContract,fft,curve,nodeAt,read,makeSincKernel,resample,envelope}=__forgeGestaltToolsFactory(TAU,TUNING,clamp);

  const wrap = (v) => v - TAU * Math.round(v / TAU);
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  const check = (o) => {
    if (o.isCancelled?.())
      throw new DOMException("Klanggestalt rendering cancelled.", "AbortError");
  };
  function control(carrier, voice, sample, length) {
    const c = __F356MaterialOriginal.control(carrier, voice, sample, length);
    if (!c) return null;
    const b = carrier.bands[voice],
      x = clamp(sample / Math.max(1, length - 1), 0, 1) * (b.gainCurve.length - 1);
    // Material.control returns a new {gain,hz,cell} for each request.
    // Extending this ephemeral value avoids a second object per sample.
    c.width = clamp(curve(b.supportSigmaCurve, x) / 0.14, 0, 1);
    return c;
  }
  function plan(carrier, input, sr, duration, cfg) {
    const model = assertMaterialContract(carrier, __F356MaterialOriginal.allowedModel(input, cfg)),
      material = __F356MaterialOriginal.plan(carrier, model, sr, duration, cfg);
    const p = cfg.params,
      motion = clamp(p.gestaltMotion, 0, 1),
      gesture = clamp(p.gestaltGesture, 0, 1),
      mode = p.gestaltMode ?? "imprint";
    const nodes = model.atlas?.nodes ?? [],
      windows = model.sourceIndex.windows,
      length = Math.round(sr * duration);
    let priorWindow = null,
      plannedBytes = 0;
    for (let id = 0; id < material.runs.length; id++) {
      const run = material.runs[id],
        band = carrier.bands[run.voice],
        count = run.endSample - run.startSample;
      let meanGain = 0,
        meanWidth = 0;
      for (let c = run.firstCell; c <= run.lastCell; c++) {
        meanGain += band.gainCurve[c];
        meanWidth += clamp((band.supportSigmaCurve?.[c] ?? 0) / 0.14, 0, 1);
      }
      const cells = run.lastCell - run.firstCell + 1;
      meanGain /= cells;
      meanWidth /= cells;
      // Whole phrases select coherent material. No grain lottery or per-note reselection.
      let chosen = windows.find((w) => w.id === run.windowId) ?? windows[0],
        focus = null;
      if (mode === "weave") {
        let best = Infinity;
        for (const n of nodes) {
          const w = windows.find(
            (w) =>
              n.center - model.sampleRate * 0.03 >= w.startSample &&
              n.center + model.sampleRate * 0.03 <= w.endSample,
          );
          if (!w || n.relativeLevel < 0.005) continue;
          const score =
            Math.abs((n.level ?? 0.5) - meanGain) * 0.65 +
            Math.abs((n.aperiodicity ?? 0) - meanWidth) * 0.35 +
            Math.abs(n.center / model.samples.length - (p.position ?? 0)) * 0.08 +
            (priorWindow && w.id !== priorWindow.id ? 0.12 : 0);
          if (score < best) {
            best = score;
            chosen = w;
            focus = n;
          }
        }
      }
      priorWindow = chosen;
      run.windowId = chosen.id;
      run.sourceStart = chosen.startSample;
      run.sourceEnd = chosen.endSample;
      const span = run.sourceEnd - run.sourceStart,
        short = count / sr <= TUNING.shortPhraseSec;
      let extent = span * motion,
        from = run.sourceStart + (span - extent) * clamp(p.position ?? 0, 0, 1);
      if (mode === "weave" && focus) {
        extent = Math.min(
          extent,
          Math.max(model.sampleRate * 0.12, (count / sr) * model.sampleRate * 0.8),
        );
        from = clamp(focus.center - extent * 0.25, run.sourceStart, run.sourceEnd - extent);
      }
      if (short) {
        extent = Math.min(span, Math.max(0, (count / sr) * model.sampleRate * (1 + motion)));
        const attack = (model.atlas?.attacks ?? []).find(
          (a) => a.start >= run.sourceStart && a.end <= run.sourceEnd,
        );
        from = attack
          ? clamp(attack.start - model.sampleRate * 0.002, run.sourceStart, run.sourceEnd - extent)
          : clamp(focus?.center ?? from, run.sourceStart, run.sourceEnd - extent);
      }
      // Width, pitch speed and changes of intensity shape donor time, not note pitch.
      const steps = Math.max(2, Math.min(4096, cells * 2));
      plannedBytes += steps * 12 + 1024;
      if (plannedBytes > 16 * 1024 * 1024)
        throw Error("Klanggestalt phrase planning exceeds its 16 MiB budget. Simplify the figure.");
      const time = new Float64Array(steps),
        widths = new Float32Array(steps);
      let accumulated = 0,
        oldHz = 0,
        oldGain = 0,
        oldWidth = 0;
      for (let k = 0; k < steps; k++) {
        const t = k / (steps - 1),
          at = run.startSample + t * Math.max(0, count - 1),
          c = control(carrier, run.voice, at, length);
        const hz = c?.hz ?? oldHz,
          gain = c?.gain ?? oldGain,
          width = c?.width ?? oldWidth;
        const dt = Math.max(1 / sr, count / sr / (steps - 1));
        const velocity = oldHz > 0 && hz > 0 ? Math.abs(Math.log2(hz / oldHz)) / dt : 0;
        const change =
          (Math.abs(gain - oldGain) / dt) * 0.15 + (Math.abs(width - oldWidth) / dt) * 0.12;
        if (k) accumulated += 0.25 + Math.min(6, velocity * 0.7 + change) + width * 0.45;
        time[k] = accumulated;
        widths[k] = width;
        oldHz = hz;
        oldGain = gain;
        oldWidth = width;
      }
      const sum = accumulated || 1;
      for (let k = 0; k < steps; k++) {
        const t = k / (steps - 1),
          elastic = time[k] / sum;
        time[k] = from + extent * (t * (1 - gesture) + elastic * gesture);
      }
      run.gestalt = {
        mode,
        short,
        meanWidth,
        meanGain,
        sourceCurve: time,
        widthCurve: widths,
        extent,
        from,
      };
      run.timeMode = "gestalt";
      run.sourceSpeed = extent / Math.max(1, count - 1);
      run.sourceOffset = from - run.sourceStart;
      run.workbenchRead = {
        size: 0,
        safeLo: run.sourceStart,
        safeHi: run.sourceEnd,
        firstSourceCenter: time[0],
        lastSourceCenter: time.at(-1),
      };
    }
    material.version = version;
    material.plannedBytes = plannedBytes;
    material.structuralPlan = {
      version,
      mode,
      sourceJumps: 0,
      states: material.runs.length,
      warnings: [],
      roles: ["continuous-phrase", "gesture-time", "original-pcm"],
    };
    if(mode === "articulation") __F35636ArticulationOriginal.apply(carrier,model,sr,duration,cfg,material);
    return material;
  }
  async function render(carrier, input, sr, duration, options = {}) {
    check(options);
    const cfg = options.workbench,
      p = cfg.params,
      model = assertMaterialContract(carrier, __F356MaterialOriginal.allowedModel(input, cfg)),
      length = Math.round(sr * duration);
    if (!Number.isSafeInteger(length) || length < 1 || !(sr >= 8000 && sr <= 192000))
      throw Error("Invalid Klanggestalt render size.");
    const material = plan(carrier, model, sr, duration, cfg);
    let longest = 0;
    for (const r of material.runs) longest = Math.max(longest, r.endSample - r.startSample);
    const step = model.sampleRate / sr;
    const sincRadius = step > 1.02 ? Math.min(64, Math.ceil(8 * step)) : 0;
    const kernelBytes = sincRadius * 2 * (TUNING.resamplingPhases + 1) * 8;
    const metadataEstimate = material.runs.reduce(
      (n, r) =>
        n +
        (Math.ceil(
          (r.endSample - r.startSample) /
            Math.max(64, 2 ** Math.ceil(Math.log2(Math.max(512, sr * 0.055))) / 8),
        ) +
          8) *
          512,
      material.plannedBytes,
    );
    if (
      length * 4 +
        longest * 16 +
        model.samples.byteLength * 2 +
        metadataEstimate +
        kernelBytes +
        3 * 1024 * 1024 >
      192 * 1024 * 1024
    )
      throw Error(
        "Klanggestalt exceeds the 192 MiB offline-buffer budget. Shorten the figure or donor.",
      );
    const sincKernel = makeSincKernel(step);
    const out = new Float32Array(length),
      tune = 2 ** ((p.carrierTranspose ?? 0) / 12),
      identity = clamp(p.gestaltIdentity, 0, 1),
      gesture = clamp(p.gestaltGesture, 0, 1);
    let energy = 0,
      samples = 0;
    for (const w of model.sourceIndex.windows)
      for (let i = w.startSample; i <= w.endSample; i++) {
        energy += model.samples[i] ** 2;
        samples++;
      }
    if (energy / Math.max(1, samples) < 1e-14)
      throw Error("The allowed donor regions contain no audible material.");
    const sourceGain = 0.22 / Math.max(0.04, Math.sqrt(energy / Math.max(1, samples)));
    const total = material.runs.reduce((sum, r) => sum + r.endSample - r.startSample, 0);
    let completed = 0,
      frames = 0,
      tonalFrames = 0,
      textureFrames = 0,
      resets = 0,
      lostBins = 0;
    for (const run of material.runs) {
      check(options);
      const count = run.endSample - run.startSample;
      const pitchNodes = (model.atlas?.nodes ?? [])
        .filter(
          (n) =>
            n.center - model.sampleRate * 0.0275 >= run.sourceStart &&
            n.center + model.sampleRate * 0.0275 <= run.sourceEnd &&
            n.f0Hz > 0 &&
            n.pitchConfidence > TUNING.validPitchConfidence,
        )
        .map((n) => n.f0Hz)
        .sort((a, b) => a - b);
      const reference = pitchNodes[Math.floor(pitchNodes.length / 2)] ?? p.carrierNeutralHz ?? 220;
      const size =
          2 **
          Math.ceil(
            Math.log2(clamp(Math.max(sr * 0.055, (sr * 4) / Math.max(45, reference)), 512, 8192)),
          ),
        hop = size / 8,
        bins = size / 2 + 1,
        binHz = sr / size;
      const re = new Float64Array(size),
        im = new Float64Array(size),
        yr = new Float64Array(size),
        yi = new Float64Array(size),
        er = new Float64Array(size),
        ei = new Float64Array(size);
      const mag = new Float64Array(bins),
        angle = new Float64Array(bins),
        priorAngle = new Float64Array(bins),
        env = new Float64Array(bins);
      const signal = new Float64Array(count),
        weight = new Float64Array(count);
      // Same IEEE64 sine weights for every analysis and overlap-add frame.
      const analysisWindow = Float64Array.from({length:size}, (_,j) => Math.sin((Math.PI * (j + 0.5)) / size));
      let oldPeaks = [],
        oldSource = NaN,
        lastRef = reference,
        referenceStarted = false;
      for (let center = 0; center < count + size / 2; center += hop) {
        check(options);
        const age = clamp(center, 0, count - 1),
          t = age / Math.max(1, count - 1),
          c = control(carrier, run.voice, run.startSample + age, length);
        if (!c) continue;
        const source = curve(run.gestalt.sourceCurve, t * (run.gestalt.sourceCurve.length - 1)),
          n = nodeAt(model, source, run),
          conf = n?.pitchConfidence ?? 0;
        const tonal = n?.f0Hz > 0 && conf > TUNING.tonalPitchConfidence;
        // Only confident fundamental observations anchor tonal sources. Unknown
        // material keeps its complete structure with an explicit fixed reference.
        const desiredRef = tonal ? n.f0Hz : reference;
        const blend = clamp(hop / sr / TUNING.pitchBlendSec, 0, 1);
        lastRef = referenceStarted
          ? Math.exp(Math.log(lastRef) * (1 - blend) + Math.log(desiredRef) * blend)
          : desiredRef;
        referenceStarted = true;
        const ratio = (c.hz * tune) / Math.max(20, lastRef),
          width = c.width * gesture;
        const delta = (source - oldSource) / step,
          continuous = Number.isFinite(oldSource) && Math.abs(delta) < size * 0.45;
        re.fill(0);
        im.fill(0);
        for (let j = 0; j < size; j++)
          re[(j + size / 2) % size] =
            resample(model, run, source + (j - size / 2) * step, sincKernel) *
            analysisWindow[j];
        fft(re, im);
        let maximum = 0;
        for (let k = 0; k < bins; k++) {
          mag[k] = Math.hypot(re[k], im[k]);
          angle[k] = Math.atan2(im[k], re[k]);
          maximum = Math.max(maximum, mag[k]);
        }
        envelope(mag, n?.f0Hz ?? reference, conf, sr, er, ei, env);
        const peaks = [];
        let oldIndex = 0;
        for (let k = 1; k < bins - 1; k++)
          if (mag[k] > maximum * 0.00004 && mag[k] > mag[k - 1] && mag[k] >= mag[k + 1]) {
            const left = Math.log(Math.max(1e-20, mag[k - 1])),
              mid = Math.log(Math.max(1e-20, mag[k])),
              right = Math.log(Math.max(1e-20, mag[k + 1]));
            const offset = clamp((0.5 * (left - right)) / (left - 2 * mid + right || 1), -0.5, 0.5);
            const instant =
              continuous && delta > 0.5
                ? k * binHz +
                  (wrap(angle[k] - priorAngle[k] - (TAU * k * delta) / size) * sr) / (TAU * delta)
                : (k + offset) * binHz;
            const hz = clamp(instant, (k - 0.5) * binHz, (k + 0.5) * binHz);
            let target = hz * ratio;
            if (tonal && width > 0) {
              const harmonic = Math.round(hz / lastRef),
                deviation = hz - harmonic * lastRef;
              if (harmonic >= 1 && Math.abs(deviation) < lastRef * 0.16)
                target += deviation * width * 0.65 * (1 - ratio);
            }
            let old = null,
              distance = Infinity;
            const tolerance = binHz * 2 + hz * 0.035;
            while (oldIndex < oldPeaks.length && oldPeaks[oldIndex].hz < hz - tolerance) oldIndex++;
            for (
              let oi = oldIndex;
              oi < oldPeaks.length && oldPeaks[oi].hz <= hz + tolerance;
              oi++
            ) {
              const q = oldPeaks[oi],
                d = Math.abs(q.hz - hz);
              if (!q.used && d < distance) {
                old = q;
                distance = d;
              }
            }
            if (old) old.used = true;
            const phase =
              continuous && old
                ? wrap(old.phase + (Math.PI * (old.target + target) * hop) / sr)
                : angle[k];
            peaks.push({ bin: k, hz, target, phase });
          }
        if (!continuous) resets++;
        yr.fill(0);
        yi.fill(0);
        if (peaks.length)
          for (let k = 1, pi = 0; k < bins - 1; k++) {
            while (
              pi + 1 < peaks.length &&
              Math.abs(peaks[pi + 1].bin - k) < Math.abs(peaks[pi].bin - k)
            )
              pi++;
            const q = peaks[pi],
              dest = q.target / binHz + k - q.bin;
            if (dest < 1 || dest >= bins - 2) {
              lostBins++;
              continue;
            }
            // Preserve absolute resonance shape by whitening/recolouring the
            // ORIGINAL complex frame; a bounded ratio cannot invent a new layer.
            const preserve = identity * (tonal ? 1 - width * 0.25 : 0.35);
            const correction = Math.exp(
              clamp((curve(env, dest) - env[k]) * preserve, -1.38629436112, 1.38629436112),
            );
            const a = Math.floor(dest),
              f = dest - a,
              ph = wrap(q.phase + wrap(angle[k] - angle[q.bin]));
            const real = mag[k] * correction * Math.cos(ph),
              imag = mag[k] * correction * Math.sin(ph);
            yr[a] += real * (1 - f);
            yi[a] += imag * (1 - f);
            yr[a + 1] += real * f;
            yi[a + 1] += imag * f;
          }
        for (let k = 1; k < bins - 1; k++) {
          yr[size - k] = yr[k];
          yi[size - k] = -yi[k];
        }
        fft(yr, yi, true);
        for (let j = 0; j < size; j++) {
          const at = center + j - size / 2;
          if (at < 0 || at >= count) continue;
          const w = analysisWindow[j];
          signal[at] += yr[(j + size / 2) % size] * w;
          weight[at] += w * w;
        }
        if (center <= count)
          run.states.push({
            sample: run.startSample + age,
            sourceCenter: source,
            sourceLevel: n?.level ?? 0.5,
            sourceRms: n?.rms ?? 0,
            targetLevel: c.gain,
            nodeId: n?.id ?? -1,
            role: run.articulation ? (t < run.articulation.onsetFraction ? "attack" : t > 1-run.articulation.releaseFraction ? "release" : "sustain") : run.gestalt.short ? "attack" : (n?.role ?? "sustain"),
            f0Hz: tonal ? n.f0Hz : 0,
            confidence: conf,
            aperiodicity: n?.aperiodicity ?? 1,
            windowId: run.windowId,
            spanStart: run.sourceStart,
            spanEnd: run.sourceEnd,
            attackStart: null,
            attackEnd: null,
          });
        oldSource = source;
        oldPeaks = peaks;
        priorAngle.set(angle);
        frames++;
        if (tonal) tonalFrames++;
        else textureFrames++;
        if (frames % 8 === 0) {
          options.onProgress?.((completed + Math.min(count, center)) / Math.max(1, total));
          await tick();
        }
      }
      const fade = Math.min(sr * TUNING.edgeFadeSec, Math.max(1, count * 0.08));
      for (let j = 0; j < count; j++) {
        const c = __F356MaterialOriginal.control(carrier, run.voice, run.startSample + j, length);
        if (!c) continue;
        const edge = Math.max(0, Math.min(1, j / fade, (count - 1 - j) / fade));
        out[run.startSample + j] +=
          (signal[j] / Math.max(1e-12, weight[j])) * c.gain * sourceGain * edge;
        if (j % 65536 === 0) {
          check(options);
          await tick();
        }
      }
      run.workbenchRead.size = size;
      run.workbenchRead.hop = hop;
      completed += count;
      options.onProgress?.(completed / Math.max(1, total));
    }
    check(options);
    let peak = 0;
    for (const v of out) {
      if (!Number.isFinite(v)) throw Error("Klanggestalt produced invalid audio.");
      peak = Math.max(peak, Math.abs(v));
    }
    if (material.runs.length && peak < 1e-8)
      throw Error(
        "No audible Klanggestalt result in this register. Move the carrier closer to the donor.",
      );
    const finalGain = peak > 0.9 ? 0.9 / peak : 1;
    if (finalGain !== 1) for (let i = 0; i < length; i++) out[i] *= finalGain;
    material.gestaltTransform = {
      version,
      mode: p.gestaltMode,
      identity,
      motion: p.gestaltMotion,
      gesture,
      frames,
      tonalFrames,
      textureFrames,
      phaseResets: resets,
      bandlimitedBins: lostBins,
      sourceGain,
      finalGain,
      source: "original-complex-pcm",
      addedOscillators: 0,
      addedNoise: 0,
    };
    material.supportProjection = {
      version,
      source: "original-pcm-resonance-transport",
      spectralFrames: frames,
      phaseStarts: resets,
    };
    Object.defineProperty(out, "donorMaterialPlan", { value: material });
    options.onProgress?.(1);
    return out;
  }
  return Object.freeze({ version, plan, control, render });
}
const __F356GestaltOriginal=__f347OriginalGestaltFactory();

var __F356WorkerOriginal=__createForgePCMWorker(["self.postMessage({ready:true});\n/* F3.56. Pure offline PCM material module. Carrier events are immutable.\n * Whole recorded spectra, a fixed Carrier reference, and explicit source time.\n * No F0 classification, harmonic mask, per-state normalization, or oscillator.\n */\n","const __F356MaterialOriginal=("+__f347OriginalMaterialFactory.toString()+")();\n","\n\nself.onmessage=async e=>{const j=e.data;try{const pcm=await __F356MaterialOriginal.render(j.plan,j.model,j.sampleRate,j.durationSec,{workbench:j.config,onProgress:progress=>self.postMessage({progress})});self.postMessage({pcm,material:pcm.donorMaterialPlan},[pcm.buffer]);}catch(error){self.postMessage({error:String(error.message??error),name:error.name});}};\n"].join(''),"Sound Material",__F356MaterialOriginal.render);

var __F356GestaltWorkerOriginal=__createForgePCMWorker([__forgeMaterialToolsFactory.toString()+"\n",__forgeGestaltToolsFactory.toString()+"\n","/* Carrier-owned articulation for the existing original-PCM Gestalt renderer.\n * Pure preparation: no timers, audio graph, source mutation or stochastic selection. */\n",__f35636ArticulationFactoryOriginal.toString()+'\n',"\nconst __F35636ArticulationOriginal=__f35636ArticulationFactoryOriginal();\n\n","const __F356MaterialOriginal=("+__f347OriginalGestaltMaterialFactory.toString()+")();\n","\n\n","const __F356GestaltOriginal=("+__f347OriginalGestaltFactory.toString()+")();\n","\n\nself.postMessage({ready:true});self.onmessage=async e=>{const j=e.data;try{const pcm=await __F356GestaltOriginal.render(j.plan,j.model,j.sampleRate,j.durationSec,{workbench:j.config,onProgress:progress=>self.postMessage({progress})});self.postMessage({pcm,material:pcm.donorMaterialPlan},[pcm.buffer]);}catch(error){self.postMessage({error:String(error.message??error),name:error.name});}};"].join(''),"Klanggestalt",__F356GestaltOriginal.render);