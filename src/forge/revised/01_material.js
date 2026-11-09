function __f347MaterialFactory(){const {version,clamp,phase,check,tick,complexFFT,allowedModel,control,gainAt,plan,sample,sourceAt,read,resample}=__forgeMaterialToolsFactory();
async function render(carrier, input, sr, duration, options = {}) {
    check(options);
    const cfg = options.workbench,
      p = cfg.params,
      model = input.materialPrepared ? input : allowedModel(input, cfg);
    const length = Math.round(sr * duration);
    if (!Number.isSafeInteger(length) || length < 1 || length * 20 > 192 * 1024 * 1024)
      throw Error("The figure exceeds the 192 MiB offline-buffer budget.");
    const material = plan(carrier, model, sr, duration, cfg),
      out = new Float32Array(length);
    let sourceEnergy = 0,
      sourceCount = 0;
    for (const w of model.sourceIndex.windows)
      for (let i = w.startSample; i <= w.endSample; i++) {
        const v = model.samples[i];
        sourceEnergy += v * v;
        sourceCount++;
      }
    // One gain for the complete donor. Quiet/noisy states keep their original relation.
    const gain = 0.24 / Math.max(0.04, Math.sqrt(sourceEnergy / Math.max(1, sourceCount)));
    const tune = 2 ** ((p.carrierTranspose ?? 0) / 12),
      neutral = p.carrierNeutralHz ?? 220;
    let frames = 0,
      directSamples = 0,
      peak = 0,
      phaseResets = 0,
      bandlimitedBins = 0;
    const total = material.runs.reduce((s, r) => s + r.endSample - r.startSample, 0);
    let completed = 0;
    for (const run of material.runs) {
      check(options);
      const count = run.endSample - run.startSample;
      const b = carrier.bands[run.voice];
      const identity = !options.spectralEnvelope &&
        run.timeMode !== "hold" &&
        Math.abs(run.sourceSpeed - model.sampleRate / sr) < 1e-10 &&
        b.centerRatioCurve
          .slice(run.firstCell, run.lastCell + 1)
          .every(
            (r) => Math.abs(Math.log(((r * carrier.rootReferenceHz) / neutral) * tune)) < 1e-9,
          );
      if (identity) {
        for (let j = 0; j < count; j++) {
          if (j % 4096 === 0) {
            check(options);
            if (j % 32768 === 0) await tick();
          }
          const gainValue = gainAt(carrier, run.voice, run.startSample + j, length);
          if (gainValue === null) continue;
          const edge = Math.min(1, j / (sr * 0.002), (count - 1 - j) / (sr * 0.002));
          out[run.startSample + j] +=
            resample(model, run, sourceAt(run, j), model.sampleRate / sr) *
            gain *
            gainValue *
            Math.max(0, edge);
          directSamples++;
        }
        completed += count;
        options.onProgress?.(completed / Math.max(1, total));
        continue;
      }
      const size = 2 ** Math.round(Math.log2(sr * 0.085)),
        hop = size / 8,
        bins = size / 2 + 1,
        binHz = sr / size,
        step = model.sampleRate / sr;
      const re = new Float64Array(size),
        im = new Float64Array(size),
        yr = new Float64Array(size),
        yi = new Float64Array(size),
        mag = new Float64Array(bins),
        angles = new Float64Array(bins),
        priorAngles = new Float64Array(bins);
      const signal = new Float64Array(count),
        weights = new Float64Array(count);
      // Same IEEE64 sine weights for every analysis and overlap-add frame.
      const analysisWindow = Float64Array.from({length:size}, (_,j) => Math.sin((Math.PI * (j + 0.5)) / size));
      let priorPeaks = [],
        previousSource = NaN;
      for (let center = 0; center < count + size / 2; center += hop) {
        check(options);
        const age = clamp(center, 0, count - 1),
          c = control(carrier, run.voice, run.startSample + age, length);
        if (!c) continue;
        const ratio = (c.hz / neutral) * tune,
          source = sourceAt(run, age),
          delta = (source - previousSource) / step;
        const continuous =
          Number.isFinite(previousSource) &&
          (run.timeMode === "hold" || Math.abs(delta) < size / 2);
        re.fill(0);
        im.fill(0);
        let maximum = 0;
        for (let j = 0; j < size; j++) {
          const index = (j + size / 2) % size;
          re[index] =
            resample(model, run, source + (j - size / 2) * step, step) *
            analysisWindow[j];
        }
        complexFFT(re, im);
        for (let k = 1; k < bins - 1; k++) {
          mag[k] = Math.hypot(re[k], im[k]);
          angles[k] = Math.atan2(im[k], re[k]);
          maximum = Math.max(maximum, mag[k]);
        }
        const envelope = options.spectralEnvelope?.({bins,binHz,ageSec:age/sr,voice:run.voice});
        const peaks = [];
        let oldIndex=0;
        for (let k = 2; k < bins - 2; k++)
          if (mag[k] > maximum * 0.0001 && mag[k] > mag[k - 1] && mag[k] >= mag[k + 1]) {
            const l = Math.log(Math.max(1e-20, mag[k - 1])),
              m = Math.log(Math.max(1e-20, mag[k])),
              r = Math.log(Math.max(1e-20, mag[k + 1]));
            const off = clamp((0.5 * (l - r)) / (l - 2 * m + r || 1), -0.5, 0.5);
            const estimated =
              continuous && Math.abs(delta) > 0.5
                ? k * binHz +
                  (phase(angles[k] - priorAngles[k] - (2 * Math.PI * k * delta) / size) * sr) /
                    (2 * Math.PI * delta)
                : (k + off) * binHz;
            const hz = clamp(estimated, (k - 0.5) * binHz, (k + 0.5) * binHz),
              target = hz * ratio;
            let old = null,
              dist = Infinity;
            while(oldIndex < priorPeaks.length && priorPeaks[oldIndex].hz < hz-binHz*1.25) oldIndex++;
            for (let pi=oldIndex;pi<priorPeaks.length && priorPeaks[pi].hz<=hz+binHz*1.25;pi++) {
              const prev=priorPeaks[pi];
              const d = Math.abs(prev.hz - hz);
              if (!prev.used && d < binHz * 1.25 && d < dist) {
                old = prev;
                dist = d;
              }
            }
            if (old) old.used = true;
            const angle =
              continuous && old
                ? phase(old.angle + (Math.PI * (old.target + target) * hop) / sr)
                : angles[k];
            peaks.push({ bin: k, hz, target, angle });
          }
        if (!continuous) phaseResets++;
        yr.fill(0);
        yi.fill(0);
        if (peaks.length)
          for (let k = 1, index = 0; k < bins - 1; k++) {
            while (
              index + 1 < peaks.length &&
              Math.abs(peaks[index + 1].bin - k) < Math.abs(peaks[index].bin - k)
            )
              index++;
            const q = peaks[index],
              dest = q.target / binHz + (k - q.bin);
            // Translate the analysis lobe; its width is an analysis-window property.
            // All independent detected components use the SAME ratio, with no F0 rounding.
            if (dest < 1 || dest >= bins - 2) {
              bandlimitedBins++;
              continue;
            }
            const angle = phase(q.angle + phase(angles[k] - angles[q.bin])),
              a = Math.floor(dest),
              f = dest - a;
            const amplitude = mag[k] * (envelope ? envelope[k] : 1);
            const real = amplitude * Math.cos(angle),
              imag = amplitude * Math.sin(angle);
            yr[a] += real * (1 - f);
            yi[a] += imag * (1 - f);
            yr[a + 1] += real * f;
            yi[a + 1] += imag * f;
          }
        for (let k = 1; k < bins - 1; k++) {
          yr[size - k] = yr[k];
          yi[size - k] = -yi[k];
        }
        complexFFT(yr, yi, true);
        for (let j = 0; j < size; j++) {
          const at = center + j - size / 2;
          if (at < 0 || at >= count) continue;
          const w = analysisWindow[j];
          signal[at] += yr[(j + size / 2) % size] * w;
          weights[at] += w * w;
        }
        priorAngles.set(angles);
        priorPeaks = peaks;
        previousSource = source;
        frames++;
        if (frames % 12 === 0) {
          options.onProgress?.((completed + Math.min(count, center)) / Math.max(1, total));
          await tick();
        }
      }
      run.workbenchRead = {
        ...run.workbenchRead,
        size,
        hop,
        firstSourceCenter: sourceAt(run, 0),
        lastSourceCenter: sourceAt(run, count - 1),
      };
      for (let j = 0; j < count; j++) {
        const gainValue = gainAt(carrier, run.voice, run.startSample + j, length);
        if (gainValue === null) continue;
        const edge = Math.max(0, Math.min(1, j / (sr * 0.002), (count - 1 - j) / (sr * 0.002)));
        out[run.startSample + j] +=
          (signal[j] / Math.max(1e-12, weights[j])) * gainValue * gain * edge;
      }
      completed += count;
    }
    check(options);
    for (const value of out) {
      if (!Number.isFinite(value)) throw Error("Material transformation produced invalid audio.");
      peak = Math.max(peak, Math.abs(value));
    }
    const finalGain = peak > 0.9 ? 0.9 / peak : 1;
    if (finalGain !== 1) for (let i = 0; i < length; i++) out[i] *= finalGain;
    material.materialTransform = {
      version,
      neutralHz: neutral,
      transpose: p.carrierTranspose ?? 0,
      timeMode: p.materialTime,
      fixedSourceReference: true,
      sourceF0Used: false,
      frameNormalization: false,
      sourceGain: gain,
      finalGain,
      directSamples,
      frames,
      phaseResets,
      bandlimitedBins,
    };
    material.supportProjection = {
      version,
      source: "complete-recorded-pcm",
      spectralFrames: frames,
      phaseStarts: phaseResets,
    };
    Object.defineProperty(out, "donorMaterialPlan", { value: material });
    options.onProgress?.(1);
    return out;
  }
return Object.freeze({ version, allowedModel, plan, control, render });
}
const __F356Material=__f347MaterialFactory();