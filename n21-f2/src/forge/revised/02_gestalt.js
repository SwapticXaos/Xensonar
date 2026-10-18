

/* XenSonar F3.56.30 — Klanggestalt, original-PCM spectral transport.
 * Offline only. Carrier bands are immutable. No oscillators or generated noise.
 * A phrase owns one allowed donor region and a continuous gesture time map.
 */
function __f347GestaltFactory(){
  "use strict";
  const version = "donor-klanggestalt-f3.56.41",
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
    const c = __F356Material.control(carrier, voice, sample, length);
    if (!c) return null;
    const b = carrier.bands[voice],
      x = clamp(sample / Math.max(1, length - 1), 0, 1) * (b.gainCurve.length - 1);
    // Material.control returns a new {gain,hz,cell} for each request.
    // Extending this ephemeral value avoids a second object per sample.
    c.width = clamp(curve(b.supportSigmaCurve, x) / 0.14, 0, 1);
    return c;
  }
  function plan(carrier, input, sr, duration, cfg) {
    const model = assertMaterialContract(carrier, __F356Material.allowedModel(input, cfg)),
      material = __F356Material.plan(carrier, model, sr, duration, cfg);
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
    __F35641Field.plan(material,carrier,model,sr,duration,p);
    if(mode === "articulation") __F35636Articulation.apply(carrier,model,sr,duration,cfg,material);
    return material;
  }
  async function render(carrier, input, sr, duration, options = {}) {
    check(options);
    const cfg = options.workbench,
      p = cfg.params,
      model = assertMaterialContract(carrier, __F356Material.allowedModel(input, cfg)),
      length = Math.round(sr * duration);
    if (!Number.isSafeInteger(length) || length < 1 || !(sr >= 8000 && sr <= 192000))
      throw Error("Invalid Klanggestalt render size.");
    if(p.gestaltMode === "articulation" && !options.__resolution) {
      const longer=await render(carrier,input,sr,duration,{...options,__resolution:"long",onProgress:v=>options.onProgress?.(v*.6)});
      const shorter=await render(carrier,input,sr,duration,{...options,__resolution:"short",onProgress:v=>options.onProgress?.(.6+v*.4)});
      check(options);const result=longer.slice(),material=longer.donorMaterialPlan;
      for(const r of material.runs){const count=r.endSample-r.startSample;
        const edge=Math.min(count*.35,sr*.035),blend=Math.max(1,Math.min(sr*.018,count*.18));
        for(let j=0;j<count;j++){const distance=Math.min(j,count-1-j),w=1-__F35641Field.smooth((distance-edge)/blend);
          result[r.startSample+j]=longer[r.startSample+j]*(1-w)+shorter[r.startSample+j]*w;
          if(j%65536===0){check(options);await tick();}
        }
      }
      material.gestaltTransform.multiResolution={policy:"short-edge-long-body",longFrames:material.gestaltTransform.frames,shortFrames:shorter.donorMaterialPlan.gestaltTransform.frames,edgeMs:35,blendMs:18};
      Object.defineProperty(result,"donorMaterialPlan",{value:material});options.onProgress?.(1);return result;
    }
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
        11 * 1024 * 1024 >
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
    const sourceFrames=new Map();let cachedBytes=0,sourceCacheHits=0,sourceCacheMisses=0;
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
            Math.log2(clamp(Math.max(sr * (options.__resolution === "short" ? .012 : ({motion:.032,air:.020,film:.040,wander:.025,signature:.040}[p.gestaltMode]??.055)), options.__resolution === "short" ? 512 : (sr * 4) / Math.max(45, reference)), 512, 8192)),
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
        const ratio = (c.hz * tune) / Math.max(20, p.gestaltMode === "signature" ? reference : lastRef),
          width = c.width * gesture;
        const delta = (source - oldSource) / step,
          continuous = Number.isFinite(oldSource) && Math.abs(delta) < size * 0.45;
        const frameKey=[run.sourceStart,run.sourceEnd,source,size].join("|");
        const cached=options.__disableSourceCache?null:sourceFrames.get(frameKey);
        if(cached){mag.set(cached.mag);angle.set(cached.angle);env.set(cached.env);sourceCacheHits++;}
        else {
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

          sourceCacheMisses++;const bytes=bins*8*3;
          if(!options.__disableSourceCache && bytes<=8*1024*1024){while(cachedBytes+bytes>8*1024*1024){const key=sourceFrames.keys().next().value;const old=sourceFrames.get(key);cachedBytes-=old.mag.byteLength*3;sourceFrames.delete(key);}
            sourceFrames.set(frameKey,{mag:mag.slice(),angle:angle.slice(),env:env.slice()});cachedBytes+=bytes;}
        }
        let maximum=0;for(const value of mag)maximum=Math.max(maximum,value);
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
            const sourcePhase=continuous&&old?wrap((old.sourcePhase??old.phase)+(Math.PI*(old.hz+hz)*hop)/sr):angle[k];
            peaks.push({ bin: k, hz, target, phase,sourcePhase });
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
            const preserve = identity * (tonal ? 1 - width * 0.15 : 0.55);
            const correction = Math.exp(
              clamp((curve(env, dest) - env[k]) * preserve, -1.38629436112, 1.38629436112),
            );
            const a = Math.floor(dest),
              f = dest - a,
              ph = wrap(q.phase + wrap(angle[k] - angle[q.bin]));
            let colour=1;
            if(p.gestaltMode === "film") {
              const distance=Math.log2(Math.max(20,q.target)/Math.max(20,c.hz*tune));
              const bandwidth=.4+c.width*3.6;
              colour=.12+.88*Math.exp(-.5*(distance/bandwidth)**2);
            }
            if(p.gestaltMode === "air") {
              const relative=mag[k]/Math.max(1e-12,Math.exp(env[k]));
              const roughness=clamp(1/Math.max(.25,relative),.15,2.2);
              const shelf=.4+.6*clamp((k*binHz)/2200,0,1);
              colour=clamp((.3+.7*roughness)*shelf,.08,1.8);
            }
            const real = mag[k] * correction * colour * Math.cos(ph),
              imag = mag[k] * correction * colour * Math.sin(ph);
            // Soft assignment, not a claimed physical separation. Both parts use this same complex PCM frame.
            const split=tonal && (p.gestaltMode === "imprint" || p.gestaltMode === "air");
            const distanceToHarmonic=tonal?Math.abs(k*binHz-Math.max(1,Math.round(k*binHz/lastRef))*lastRef)/Math.max(binHz*1.5,lastRef*.07):0;
            const localHarmonic=1-__F35641Field.smooth((distanceToHarmonic-1)/1.5);
            const harmonic=split?1-(1-localHarmonic)*clamp((conf-.78)/.17,0,1):1;
            yr[a] += real * (1 - f)*harmonic;
            yi[a] += imag * (1 - f)*harmonic;
            yr[a + 1] += real * f*harmonic;
            yi[a + 1] += imag * f*harmonic;
            if(split && harmonic<1){
              const residualPhase=wrap(q.sourcePhase+wrap(angle[k]-angle[q.bin]));
              const residualMagnitude=mag[k]*colour*(1-harmonic);
              yr[k]+=residualMagnitude*Math.cos(residualPhase);yi[k]+=residualMagnitude*Math.sin(residualPhase);
            }
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
            centroidHz: n?.centroidHz ?? 1200,
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
        const c = __F356Material.control(carrier, run.voice, run.startSample + j, length);
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
      sourceFrameCache:{hits:sourceCacheHits,misses:sourceCacheMisses,bytes:cachedBytes,limitBytes:8*1024*1024},
      addedOscillators: 0,
      addedNoise: 0,
      harmonicResidual: ["imprint","air"].includes(p.gestaltMode)?"soft-confidence-weighted-original-PCM":"whole-spectrum",
      analysisResolution: options.__resolution??"mode-specific",
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
const __F356Gestalt=__f347GestaltFactory();


/* F3.56.30: worker-owned offline render; only a small, cooperatively-yielding
 * main-thread fallback is permitted if worker startup is blocked. */
var __F356GestaltWorker=__createForgePCMWorker([__forgeMaterialToolsFactory.toString()+"\n",__forgeGestaltToolsFactory.toString()+"\n","/* Offline, deterministic donor-state preparation. Original PCM is authoritative.\n * Features describe observed material; they do not manufacture a residual stem. */\n","const __F35641Field=("+__f347DonorFieldFactory.toString()+")();\n","\n\n/* Carrier-owned articulation for the existing original-PCM Gestalt renderer.\n * Pure preparation: no timers, audio graph, source mutation or stochastic selection. */\n",__f35636ArticulationFactory.toString()+'\n',"\n\nconst __F35636Articulation=__f35636ArticulationFactory();\n","const __F356Material=("+__f347MaterialFactory.toString()+")();\n","\n\n","const __F356Gestalt=("+__f347GestaltFactory.toString()+")();\n","\n\nself.postMessage({ready:true});self.onmessage=async e=>{const j=e.data;try{const pcm=await __F356Gestalt.render(j.plan,j.model,j.sampleRate,j.durationSec,{workbench:j.config,onProgress:progress=>self.postMessage({progress})});self.postMessage({pcm,material:pcm.donorMaterialPlan},[pcm.buffer]);}catch(error){self.postMessage({error:String(error.message??error),name:error.name});}};"].join(''),"Klanggestalt",__F356Gestalt.render);


var __F356Worker=__createForgePCMWorker([__forgeMaterialToolsFactory.toString()+"\n","","const __F356Material=("+__f347MaterialFactory.toString()+")();\n","\n\nself.postMessage({ready:true});self.onmessage=async e=>{const j=e.data;try{const pcm=await __F356Material.render(j.plan,j.model,j.sampleRate,j.durationSec,{workbench:j.config,onProgress:progress=>self.postMessage({progress})});self.postMessage({pcm,material:pcm.donorMaterialPlan},[pcm.buffer]);}catch(error){self.postMessage({error:String(error.message??error),name:error.name});}};"].join(''),"Sound Material",__F356Material.render);