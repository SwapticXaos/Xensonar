const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const clamp01 = (value: number) => clamp(value, 0, 1);

const slewToward = (current: number, target: number, maxStep: number) => {
  if (!Number.isFinite(current)) return target;
  const delta = target - current;
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
};

const SIMPLE_RATIOS = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 11 / 8, 3 / 2, 8 / 5, 5 / 3, 7 / 4, 15 / 8, 2];

const foldFrequencyIntoRange = (frequency: number, min: number, max: number) => {
  let freq = Math.max(1e-3, frequency);
  while (freq < min) freq *= 2;
  while (freq > max) freq *= 0.5;
  return clamp(freq, min, max);
};

const octaveDistance = (a: number, b: number) => Math.abs(Math.log2(Math.max(1e-6, a) / Math.max(1e-6, b)));

const nearestRatioDistance = (ratio: number) => {
  let folded = Math.max(1e-6, ratio);
  while (folded < 1) folded *= 2;
  while (folded >= 2) folded *= 0.5;
  let best = Number.POSITIVE_INFINITY;
  for (const target of SIMPLE_RATIOS) {
    const dist = Math.abs(Math.log2(folded / target));
    if (dist < best) best = dist;
  }
  return best;
};

const estimateHarmonicRoot = (peaks: Array<{ freq: number; amp: number }>, fallbackHz: number) => {
  if (!peaks.length) {
    return { rootHz: fallbackHz, clarity: 0, tension: 0.5, spread: 0.5 };
  }

  const candidates = new Map<string, number>();
  for (const peak of peaks.slice(0, 10)) {
    for (let divisor = 1; divisor <= 6; divisor += 1) {
      const candidate = foldFrequencyIntoRange(peak.freq / divisor, 55, 440);
      const key = candidate.toFixed(2);
      if (!candidates.has(key)) candidates.set(key, candidate);
    }
  }

  let bestRoot = fallbackHz;
  let bestScore = -1;
  let bestCoverage = 0;

  for (const candidate of candidates.values()) {
    let score = 0;
    let coverage = 0;
    for (const peak of peaks) {
      let localBest = 0;
      for (const target of [1, 6 / 5, 5 / 4, 4 / 3, 3 / 2, 7 / 4, 2, 5 / 2, 3, 4, 5, 6]) {
        const modelFreq = foldFrequencyIntoRange(candidate * target, peak.freq * 0.5, peak.freq * 2);
        const distance = octaveDistance(modelFreq, peak.freq);
        const closeness = Math.exp(-(distance * distance) / 0.0018);
        if (closeness > localBest) localBest = closeness;
      }
      score += peak.amp * localBest;
      coverage += peak.amp;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCoverage = coverage;
      bestRoot = candidate;
    }
  }

  let tensionAccum = 0;
  let spreadAccum = 0;
  let weightSum = 0;
  for (const peak of peaks) {
    const ratio = peak.freq / Math.max(1e-6, bestRoot);
    const ratioDistance = nearestRatioDistance(ratio);
    tensionAccum += clamp01(ratioDistance / 0.115) * peak.amp;
    spreadAccum += clamp01(octaveDistance(peak.freq, bestRoot) / 2.75) * peak.amp;
    weightSum += peak.amp;
  }

  return {
    rootHz: bestRoot,
    clarity: clamp01(bestScore / Math.max(1e-6, bestCoverage)),
    tension: clamp01(tensionAccum / Math.max(1e-6, weightSum)),
    spread: clamp01(spreadAccum / Math.max(1e-6, weightSum)),
  };
};

export type DescriptorFrame = {
  time: number;
  energy: number;
  brightness: number;
  density: number;
  motion: number;
  low: number;
  mid: number;
  high: number;
  spectralCentroidHz: number;
  harmonicRootHz: number;
  harmonicClarity: number;
  intervalTension: number;
  rootSpread: number;
};

export type DescriptorProbe = {
  analyser: AnalyserNode;
  freqData: Uint8Array;
  timeData: Uint8Array;
  prevFreqData: Float32Array;
};

export type DescriptorSummary = DescriptorFrame & {
  windowSeconds: number;
  contrast: number;
};

export type CollectiveMemoryEffectOptions = {
  name: string;
  destination: AudioNode;
  sendLevel?: number;
  baseWet?: number;
  complementarity?: number;
};

export type CollectiveMemoryEffect = {
  name: string;
  input: GainNode;
  output: GainNode;
  probe: DescriptorProbe;
  setSendLevel: (value: number) => void;
  setWet: (value: number) => void;
  updateFromMemory: (memory: DescriptorSummary, now?: number) => void;
  disconnect: () => void;
};

const createSoftClipCurve = (amount = 1.6, length = 2048) => {
  const curve = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const x = (i / (length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount);
  }
  return curve;
};

export const createDescriptorProbe = (ctx: AudioContext, externalAnalyser?: AnalyserNode, fftSize = 2048): DescriptorProbe => {
  const analyser = externalAnalyser ?? ctx.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = 0.72;
  return {
    analyser,
    freqData: new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount)),
    timeData: new Uint8Array(new ArrayBuffer(analyser.fftSize)),
    prevFreqData: new Float32Array(analyser.frequencyBinCount),
  };
};

export const readDescriptorProbe = (probe: DescriptorProbe, now: number): DescriptorFrame => {
  probe.analyser.getByteFrequencyData(probe.freqData as unknown as Uint8Array<ArrayBuffer>);
  probe.analyser.getByteTimeDomainData(probe.timeData as unknown as Uint8Array<ArrayBuffer>);

  let rms = 0;
  let zeroCrossings = 0;
  for (let i = 0; i < probe.timeData.length; i += 1) {
    const centered = (probe.timeData[i] - 128) / 128;
    rms += centered * centered;
    if (i > 0) {
      const prev = probe.timeData[i - 1] - 128;
      const curr = probe.timeData[i] - 128;
      if ((prev >= 0 && curr < 0) || (prev < 0 && curr >= 0)) {
        zeroCrossings += 1;
      }
    }
  }
  rms = Math.sqrt(rms / Math.max(1, probe.timeData.length));

  const lowEnd = Math.max(1, Math.floor(probe.freqData.length * 0.14));
  const midEnd = Math.max(lowEnd + 1, Math.floor(probe.freqData.length * 0.52));
  let low = 0;
  let mid = 0;
  let high = 0;
  let flux = 0;
  let activeBins = 0;
  let centroidWeighted = 0;
  let centroidEnergy = 0;
  const peaks: Array<{ freq: number; amp: number }> = [];
  const sampleRate = probe.analyser.context.sampleRate;
  const fftSize = probe.analyser.fftSize;

  for (let i = 0; i < probe.freqData.length; i += 1) {
    const value = probe.freqData[i] / 255;
    const energy = value * value;
    if (i < lowEnd) low += energy;
    else if (i < midEnd) mid += energy;
    else high += energy;
    flux += Math.abs(value - probe.prevFreqData[i]);
    probe.prevFreqData[i] = value;
    if (value > 0.16) activeBins += 1;

    const freq = (i * sampleRate) / Math.max(1, fftSize);
    if (freq >= 40 && freq <= 8000) {
      centroidWeighted += freq * energy;
      centroidEnergy += energy;
    }
  }

  for (let i = 2; i < probe.freqData.length - 2; i += 1) {
    const value = probe.freqData[i] / 255;
    if (value < 0.13) continue;
    if (value >= probe.freqData[i - 1] / 255 && value >= probe.freqData[i + 1] / 255) {
      const freq = (i * sampleRate) / Math.max(1, fftSize);
      if (freq >= 45 && freq <= 6000) {
        peaks.push({ freq, amp: value });
      }
    }
  }
  peaks.sort((a, b) => b.amp - a.amp);
  const trimmedPeaks = peaks.slice(0, 14);

  const total = Math.max(1e-6, low + mid + high);
  const brightness = clamp01((mid * 0.42 + high * 1.18) / total);
  const density = clamp01((activeBins / Math.max(1, probe.freqData.length)) * 0.65 + (flux / Math.max(1, probe.freqData.length)) * 0.35);
  const motion = clamp01((flux / Math.max(1, probe.freqData.length)) * 1.6 + (zeroCrossings / Math.max(1, probe.timeData.length)) * 1.2);
  const spectralCentroidHz = centroidEnergy > 1e-6 ? centroidWeighted / centroidEnergy : 900;
  const harmonic = estimateHarmonicRoot(trimmedPeaks, foldFrequencyIntoRange(spectralCentroidHz * 0.5, 70, 330));

  return {
    time: now,
    energy: clamp01(rms * 3.4),
    brightness,
    density,
    motion,
    low: clamp01(low / total),
    mid: clamp01(mid / total),
    high: clamp01(high / total),
    spectralCentroidHz: clamp(spectralCentroidHz, 60, 8000),
    harmonicRootHz: clamp(harmonic.rootHz, 55, 440),
    harmonicClarity: harmonic.clarity,
    intervalTension: harmonic.tension,
    rootSpread: harmonic.spread,
  };
};

export const pushDescriptorFrame = (history: DescriptorFrame[], frame: DescriptorFrame, windowSeconds: number) => {
  history.push(frame);
  const cutoff = frame.time - windowSeconds;
  while (history.length > 1 && history[0].time < cutoff) {
    history.shift();
  }
  return history;
};

export const summarizeDescriptorHistory = (history: DescriptorFrame[], windowSeconds: number): DescriptorSummary => {
  if (!history.length) {
    return {
      time: 0,
      energy: 0,
      brightness: 0.5,
      density: 0,
      motion: 0,
      low: 0.33,
      mid: 0.34,
      high: 0.33,
      spectralCentroidHz: 900,
      harmonicRootHz: 220,
      harmonicClarity: 0,
      intervalTension: 0.5,
      rootSpread: 0.5,
      contrast: 0,
      windowSeconds,
    };
  }

  const latest = history[history.length - 1].time;
  let weightSum = 0;
  let energy = 0;
  let brightness = 0;
  let density = 0;
  let motion = 0;
  let low = 0;
  let mid = 0;
  let high = 0;
  let spectralCentroidHz = 0;
  let harmonicClarity = 0;
  let intervalTension = 0;
  let rootSpread = 0;
  let rootLog = 0;
  let contrast = 0;

  for (const frame of history) {
    const age = latest - frame.time;
    const normalizedAge = clamp01(age / Math.max(0.001, windowSeconds));
    const weight = 0.35 + (1 - normalizedAge) * 0.65;
    weightSum += weight;
    energy += frame.energy * weight;
    brightness += frame.brightness * weight;
    density += frame.density * weight;
    motion += frame.motion * weight;
    low += frame.low * weight;
    mid += frame.mid * weight;
    high += frame.high * weight;
    spectralCentroidHz += frame.spectralCentroidHz * weight;
    harmonicClarity += frame.harmonicClarity * weight;
    intervalTension += frame.intervalTension * weight;
    rootSpread += frame.rootSpread * weight;
    rootLog += Math.log2(Math.max(1e-6, frame.harmonicRootHz)) * weight;
  }

  const invWeight = 1 / Math.max(1e-6, weightSum);
  const meanBrightness = brightness * invWeight;
  const meanEnergy = energy * invWeight;
  const meanRootHz = Math.pow(2, rootLog * invWeight);
  const meanCentroidHz = spectralCentroidHz * invWeight;

  for (const frame of history) {
    const age = latest - frame.time;
    const normalizedAge = clamp01(age / Math.max(0.001, windowSeconds));
    const weight = 0.35 + (1 - normalizedAge) * 0.65;
    contrast += (
      Math.abs(frame.brightness - meanBrightness)
      + Math.abs(frame.energy - meanEnergy) * 0.75
      + octaveDistance(frame.harmonicRootHz, meanRootHz) * 0.55
      + clamp01(Math.abs(frame.spectralCentroidHz - meanCentroidHz) / 2600) * 0.4
    ) * weight;
  }

  return {
    time: latest,
    energy: clamp01(energy * invWeight),
    brightness: clamp01(meanBrightness),
    density: clamp01(density * invWeight),
    motion: clamp01(motion * invWeight),
    low: clamp01(low * invWeight),
    mid: clamp01(mid * invWeight),
    high: clamp01(high * invWeight),
    spectralCentroidHz: clamp(meanCentroidHz, 60, 8000),
    harmonicRootHz: clamp(meanRootHz, 55, 440),
    harmonicClarity: clamp01(harmonicClarity * invWeight),
    intervalTension: clamp01(intervalTension * invWeight),
    rootSpread: clamp01(rootSpread * invWeight),
    contrast: clamp01((contrast * invWeight) * 1.45),
    windowSeconds,
  };
};

export const createCollectiveMemoryEffect = (
  ctx: AudioContext,
  options: CollectiveMemoryEffectOptions,
): CollectiveMemoryEffect => {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const drySense = ctx.createGain();
  const driveIn = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  const highpass = ctx.createBiquadFilter();
  const bandpass = ctx.createBiquadFilter();
  const lowpass = ctx.createBiquadFilter();
  const lowShelf = ctx.createBiquadFilter();
  const highShelf = ctx.createBiquadFilter();
  const harmonicA = ctx.createBiquadFilter();
  const harmonicB = ctx.createBiquadFilter();
  const bodyGain = ctx.createGain();
  const delay = ctx.createDelay(0.4);
  const feedback = ctx.createGain();
  const feedbackFilter = ctx.createBiquadFilter();
  const delayWet = ctx.createGain();
  const combDelay = ctx.createDelay(0.03);
  const combFeedback = ctx.createGain();
  const combFilter = ctx.createBiquadFilter();
  const combWet = ctx.createGain();
  const pan = ctx.createStereoPanner();
  const lfo = ctx.createOscillator();
  const lfoDepth = ctx.createGain();

  const sendLevel = clamp(options.sendLevel ?? 0.48, 0, 1.5);
  const baseWet = clamp(options.baseWet ?? 0.34, 0, 1);
  const complementarity = clamp(options.complementarity ?? 0.72, 0, 1);

  input.gain.value = sendLevel;
  output.gain.value = 1;
  driveIn.gain.value = 1.15;
  shaper.curve = createSoftClipCurve(1.7);
  shaper.oversample = "4x";

  highpass.type = "highpass";
  highpass.frequency.value = 110;
  highpass.Q.value = 0.5;

  bandpass.type = "bandpass";
  bandpass.frequency.value = 1200;
  bandpass.Q.value = 1.8;

  lowpass.type = "lowpass";
  lowpass.frequency.value = 3200;
  lowpass.Q.value = 0.7;

  lowShelf.type = "lowshelf";
  lowShelf.frequency.value = 220;
  lowShelf.gain.value = -2;

  highShelf.type = "highshelf";
  highShelf.frequency.value = 2600;
  highShelf.gain.value = 1;

  harmonicA.type = "peaking";
  harmonicA.frequency.value = 540;
  harmonicA.Q.value = 1.8;
  harmonicA.gain.value = 1.5;

  harmonicB.type = "peaking";
  harmonicB.frequency.value = 960;
  harmonicB.Q.value = 2.2;
  harmonicB.gain.value = 2.1;

  bodyGain.gain.value = baseWet * 0.5;
  delay.delayTime.value = 0.08;
  feedback.gain.value = 0.25;
  feedbackFilter.type = "lowpass";
  feedbackFilter.frequency.value = 1800;
  delayWet.gain.value = baseWet * 0.3;

  combDelay.delayTime.value = 0.006;
  combFeedback.gain.value = 0.16;
  combFilter.type = "bandpass";
  combFilter.frequency.value = 1200;
  combFilter.Q.value = 0.7;
  combWet.gain.value = baseWet * 0.08;

  pan.pan.value = 0;
  lfo.type = "sine";
  lfo.frequency.value = 0.17;
  lfoDepth.gain.value = 0.0015;

  let lastUpdateAt = ctx.currentTime;
  let smoothedDelayTime = delay.delayTime.value;
  let smoothedCombTime = combDelay.delayTime.value;
  let smoothedFeedback = feedback.gain.value;
  let smoothedCombFeedback = combFeedback.gain.value;

  const probe = createDescriptorProbe(ctx);

  input.connect(probe.analyser);
  input.connect(drySense);
  drySense.connect(highpass);
  highpass.connect(bandpass);
  bandpass.connect(lowShelf);
  lowShelf.connect(highShelf);
  highShelf.connect(lowpass);
  lowpass.connect(driveIn);
  driveIn.connect(shaper);

  shaper.connect(harmonicA);
  harmonicA.connect(harmonicB);
  harmonicB.connect(bodyGain);
  bodyGain.connect(pan);

  harmonicB.connect(delay);
  delay.connect(delayWet);
  delayWet.connect(pan);
  delay.connect(feedback);
  feedback.connect(feedbackFilter);
  feedbackFilter.connect(delay);

  harmonicB.connect(combDelay);
  combDelay.connect(combWet);
  combWet.connect(pan);
  combDelay.connect(combFeedback);
  combFeedback.connect(combFilter);
  combFilter.connect(combDelay);

  lfo.connect(lfoDepth);
  lfoDepth.connect(delay.delayTime);

  pan.connect(output);
  output.connect(options.destination);
  lfo.start();

  return {
    name: options.name,
    input,
    output,
    probe,
    setSendLevel(value: number) {
      input.gain.setTargetAtTime(clamp(value, 0, 1.5), ctx.currentTime, 0.08);
    },
    setWet(value: number) {
      const safe = clamp(value, 0, 1);
      bodyGain.gain.setTargetAtTime(safe * 0.52, ctx.currentTime, 0.08);
      delayWet.gain.setTargetAtTime(safe * 0.38, ctx.currentTime, 0.08);
      combWet.gain.setTargetAtTime(safe * 0.18, ctx.currentTime, 0.08);
    },
    updateFromMemory(memory: DescriptorSummary, now = ctx.currentTime) {
      const dt = clamp(now - lastUpdateAt, 0.05, 0.5);
      lastUpdateAt = now;
      const local = readDescriptorProbe(probe, now);
      const brightnessGap = memory.brightness - local.brightness;
      const lowGap = memory.low - local.low;
      const openness = clamp01(0.18 + (1 - memory.density) * 0.34 + memory.motion * 0.24 + (1 - local.energy) * 0.24);
      const compensation = clamp01(0.5 + brightnessGap * 0.75 * complementarity + (1 - local.brightness) * 0.18);
      const mudPressure = clamp01(memory.low * 0.7 + local.low * 0.55 - memory.high * 0.32);
      const intensity = clamp01(memory.energy * 0.62 + local.energy * 0.38 + memory.contrast * 0.15);
      const shimmer = clamp01((memory.high * 0.7 + compensation * 0.5 + memory.motion * 0.2) - mudPressure * 0.2);

      const rootDelta = octaveDistance(memory.harmonicRootHz, local.harmonicRootHz);
      const rootAlignment = clamp01(1 - rootDelta / 0.46);
      const harmonicLift = clamp01(memory.harmonicClarity * 0.72 + (1 - memory.intervalTension) * 0.28);
      const fieldTension = clamp01(memory.intervalTension * 0.72 + local.intervalTension * 0.18 + rootDelta * 0.95 + memory.rootSpread * 0.15);
      const bridgeRoot = foldFrequencyIntoRange(Math.sqrt(Math.max(55, memory.harmonicRootHz) * Math.max(55, local.harmonicRootHz)), 80, 880);
      const primaryRatio = fieldTension > 0.62 ? 6 / 5 : fieldTension > 0.42 ? 5 / 4 : 9 / 8;
      const secondaryRatio = harmonicLift > 0.58 ? 3 / 2 : 4 / 3;
      const overtoneRatio = memory.harmonicClarity > 0.56 ? 7 / 4 : 11 / 8;

      const targetHighpass = 55 + mudPressure * 220 + Math.max(0, lowGap) * 55;
      const targetBand = 360 + compensation * 2300 + openness * 900;
      const targetBandQ = 0.8 + (1 - openness) * 4.8 + mudPressure * 0.6;
      const targetLowpass = 900 + compensation * 4200 + openness * 1900;
      const targetLowShelf = -7 * mudPressure;
      const targetHighShelf = -2 + shimmer * 9 - memory.density * 2.6;
      const targetDrive = 1.08 + intensity * 1.4 + memory.motion * 0.55 + harmonicLift * 0.2;
      const targetDelayTime = clamp(0.038 + (1 - memory.density) * 0.12 + memory.motion * 0.018 + compensation * 0.01, 0.028, 0.24);
      const targetFeedback = clamp(0.1 + openness * 0.4 - intensity * 0.14 + memory.contrast * 0.05, 0.08, 0.58);
      const targetBodyWet = clamp(baseWet * (0.35 + compensation * 0.4 + (1 - mudPressure) * 0.15 + harmonicLift * 0.08), 0.05, 0.9);
      const targetDelayWet = clamp(baseWet * (0.12 + openness * 0.42 + (1 - intensity) * 0.06), 0.02, 0.48);
      const targetFeedbackTone = 900 + shimmer * 2100 + openness * 500 + harmonicLift * 260;
      const targetLfoRate = 0.06 + memory.motion * 0.85 + memory.contrast * 0.3;
      const targetLfoDepth = 0.0007 + openness * 0.0048;
      const targetPan = clamp((memory.high - memory.low) * 0.3 + (local.brightness - 0.5) * 0.2, -0.35, 0.35);

      const targetHarmonicA = foldFrequencyIntoRange(bridgeRoot * primaryRatio, 180, 3200);
      const targetHarmonicB = foldFrequencyIntoRange(memory.harmonicRootHz * secondaryRatio * (rootAlignment > 0.55 ? 1 : primaryRatio), 240, 4400);
      const targetHarmonicAQ = clamp(1.1 + harmonicLift * 4.6 + (1 - fieldTension) * 1.3, 0.7, 8.4);
      const targetHarmonicBQ = clamp(1.0 + harmonicLift * 5.4 - fieldTension * 1.1 + memory.motion * 0.4, 0.7, 9.8);
      const targetHarmonicAGain = clamp(-1.4 + harmonicLift * 6.2 + compensation * 1.8 - mudPressure * 2.4, -10, 10);
      const targetHarmonicBGain = clamp(-2 + harmonicLift * 7.4 + shimmer * 2.1 - fieldTension * 2.9 + rootAlignment * 1.6, -10, 12);

      const combTuningHz = foldFrequencyIntoRange(memory.harmonicRootHz * (rootAlignment > 0.52 ? secondaryRatio : overtoneRatio), 90, 1100);
      const targetCombTime = clamp(1 / Math.max(90, combTuningHz), 0.0025, 0.016);
      const targetCombFeedback = clamp(0.05 + harmonicLift * 0.18 + (1 - fieldTension) * 0.08 - intensity * 0.04, 0.035, 0.28);
      const targetCombWet = clamp(baseWet * (0.02 + harmonicLift * 0.14 + openness * 0.04 + rootAlignment * 0.03), 0.008, 0.14);
      const targetCombTone = foldFrequencyIntoRange(memory.spectralCentroidHz * (0.72 + harmonicLift * 0.4), 260, 3600);
      const targetCombQ = clamp(0.55 + harmonicLift * 1.6 + (1 - fieldTension) * 0.6, 0.4, 3.2);

      const nextDelayTime = slewToward(smoothedDelayTime, targetDelayTime, 0.008 + dt * 0.03);
      const nextCombTime = slewToward(smoothedCombTime, targetCombTime, 0.00085 + dt * 0.0032);
      const nextFeedback = slewToward(smoothedFeedback, targetFeedback, 0.028 + dt * 0.06);
      const nextCombFeedback = slewToward(smoothedCombFeedback, targetCombFeedback, 0.018 + dt * 0.04);
      smoothedDelayTime = nextDelayTime;
      smoothedCombTime = nextCombTime;
      smoothedFeedback = nextFeedback;
      smoothedCombFeedback = nextCombFeedback;

      highpass.frequency.setTargetAtTime(targetHighpass, now, 0.14);
      bandpass.frequency.setTargetAtTime(targetBand, now, 0.14);
      bandpass.Q.setTargetAtTime(targetBandQ, now, 0.14);
      lowpass.frequency.setTargetAtTime(targetLowpass, now, 0.16);
      lowShelf.gain.setTargetAtTime(targetLowShelf, now, 0.14);
      highShelf.gain.setTargetAtTime(targetHighShelf, now, 0.14);
      driveIn.gain.setTargetAtTime(targetDrive, now, 0.12);
      delay.delayTime.setTargetAtTime(nextDelayTime, now, 0.22);
      feedback.gain.setTargetAtTime(nextFeedback, now, 0.2);
      feedbackFilter.frequency.setTargetAtTime(targetFeedbackTone, now, 0.2);
      bodyGain.gain.setTargetAtTime(targetBodyWet, now, 0.12);
      delayWet.gain.setTargetAtTime(targetDelayWet, now, 0.16);
      lfo.frequency.setTargetAtTime(targetLfoRate, now, 0.18);
      lfoDepth.gain.setTargetAtTime(targetLfoDepth, now, 0.18);
      pan.pan.setTargetAtTime(targetPan, now, 0.18);

      harmonicA.frequency.setTargetAtTime(targetHarmonicA, now, 0.14);
      harmonicB.frequency.setTargetAtTime(targetHarmonicB, now, 0.14);
      harmonicA.Q.setTargetAtTime(targetHarmonicAQ, now, 0.14);
      harmonicB.Q.setTargetAtTime(targetHarmonicBQ, now, 0.14);
      harmonicA.gain.setTargetAtTime(targetHarmonicAGain, now, 0.16);
      harmonicB.gain.setTargetAtTime(targetHarmonicBGain, now, 0.16);

      combDelay.delayTime.setTargetAtTime(nextCombTime, now, 0.2);
      combFeedback.gain.setTargetAtTime(nextCombFeedback, now, 0.18);
      combWet.gain.setTargetAtTime(targetCombWet, now, 0.18);
      combFilter.frequency.setTargetAtTime(targetCombTone, now, 0.18);
      combFilter.Q.setTargetAtTime(targetCombQ, now, 0.18);
    },
    disconnect() {
      try { lfo.stop(); } catch {}
      try { input.disconnect(); } catch {}
      try { drySense.disconnect(); } catch {}
      try { highpass.disconnect(); } catch {}
      try { bandpass.disconnect(); } catch {}
      try { lowpass.disconnect(); } catch {}
      try { lowShelf.disconnect(); } catch {}
      try { highShelf.disconnect(); } catch {}
      try { driveIn.disconnect(); } catch {}
      try { shaper.disconnect(); } catch {}
      try { harmonicA.disconnect(); } catch {}
      try { harmonicB.disconnect(); } catch {}
      try { bodyGain.disconnect(); } catch {}
      try { delay.disconnect(); } catch {}
      try { feedback.disconnect(); } catch {}
      try { feedbackFilter.disconnect(); } catch {}
      try { delayWet.disconnect(); } catch {}
      try { combDelay.disconnect(); } catch {}
      try { combFeedback.disconnect(); } catch {}
      try { combFilter.disconnect(); } catch {}
      try { combWet.disconnect(); } catch {}
      try { pan.disconnect(); } catch {}
      try { output.disconnect(); } catch {}
      try { lfo.disconnect(); } catch {}
      try { lfoDepth.disconnect(); } catch {}
    },
  };
};
