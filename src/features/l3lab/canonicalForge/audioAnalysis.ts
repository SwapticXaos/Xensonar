/**
 * Audio Analysis Module v3 – Production-Grade BPM Detection
 * 
 * v3 Improvements:
 * 1. Percussive/Harmonic Separation (median filtering HPSS) before onset detection
 * 2. Energy-envelope BPM as 4th method (RMS-based tempo estimation)
 * 3. Onset strength weighting for IOI histogram
 * 4. Improved adaptive thresholding with spectral whitening
 * 5. Auto-snap loop to nearest whole bar count
 * 6. Better downbeat detection with bar-level accent pattern matching
 * 7. Tempo stability check (variance of inter-beat intervals)
 */

export interface BPMResult {
  bpm: number;
  confidence: number;
  onsets: number[];
  onsetStrengths: number[]; // strength of each onset (normalized 0-1)
  downbeatOffset: number;
  allCandidates: BPMCandidate[];
  tempoStability: number; // 0-1, how consistent the tempo is
}

export interface BPMCandidate {
  bpm: number;
  score: number;
  source: string; // which method found it
}

export type GridDivision = '1/1' | '1/2' | '1/4' | '1/8' | '1/16' | '1/32' | '1/3' | '1/6';

// ═══════════════════════════════════════════════════════
//  FFT – Minimal in-place radix-2 Cooley-Tukey
// ═══════════════════════════════════════════════════════

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < halfLen; j++) {
        const uRe = re[i + j], uIm = im[i + j];
        const vRe = re[i + j + halfLen] * curRe - im[i + j + halfLen] * curIm;
        const vIm = re[i + j + halfLen] * curIm + im[i + j + halfLen] * curRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + halfLen] = uRe - vRe;
        im[i + j + halfLen] = uIm - vIm;
        const newCurRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newCurRe;
      }
    }
  }
}

// ifft reserved for future HPSS resynthesis

function nextPow2(n: number): number {
  let v = 1;
  while (v < n) v <<= 1;
  return v;
}

// ═══════════════════════════════════════════════════════
//  Windowing (Hann)
// ═══════════════════════════════════════════════════════

function hannWindow(size: number): Float64Array {
  const w = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return w;
}

// ═══════════════════════════════════════════════════════
//  STFT – Compute magnitude spectrogram
// ═══════════════════════════════════════════════════════

interface Spectrogram {
  magnitudes: Float64Array[]; // [frame][bin]
  fftSize: number;
  hopSize: number;
  numFrames: number;
  sampleRate: number;
}

function computeSpectrogram(
  samples: Float32Array,
  sampleRate: number,
  frameSize: number = 2048,
  hopSize: number = 512
): Spectrogram {
  const fftSize = nextPow2(frameSize);
  const numFrames = Math.floor((samples.length - frameSize) / hopSize) + 1;
  const window = hannWindow(frameSize);
  const magnitudes: Float64Array[] = [];

  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);

  for (let frame = 0; frame < numFrames; frame++) {
    const offset = frame * hopSize;
    re.fill(0);
    im.fill(0);
    for (let i = 0; i < frameSize; i++) {
      re[i] = samples[offset + i] * window[i];
    }
    fft(re, im);

    const mag = new Float64Array(fftSize / 2 + 1);
    for (let k = 0; k <= fftSize / 2; k++) {
      mag[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    }
    magnitudes.push(mag);
  }

  return { magnitudes, fftSize, hopSize, numFrames, sampleRate };
}

// ═══════════════════════════════════════════════════════
//  HPSS – Harmonic/Percussive Source Separation
//  Uses median filtering on the spectrogram
// ═══════════════════════════════════════════════════════

function medianFilter1D(data: number[], kernelSize: number): number[] {
  const half = Math.floor(kernelSize / 2);
  const result = new Array(data.length);
  const window: number[] = [];

  for (let i = 0; i < data.length; i++) {
    window.length = 0;
    for (let j = i - half; j <= i + half; j++) {
      const idx = Math.max(0, Math.min(data.length - 1, j));
      window.push(data[idx]);
    }
    window.sort((a, b) => a - b);
    result[i] = window[Math.floor(window.length / 2)];
  }
  return result;
}

/**
 * Separates percussive component from the spectrogram using median filtering.
 * 
 * - Harmonic content is smooth along time → median filter along time axis preserves it
 * - Percussive content is smooth along frequency → median filter along frequency axis preserves it
 * 
 * We use soft masking to get the percussive magnitude spectrogram.
 */
function hpssPercussiveMask(spec: Spectrogram, harmKernel: number = 17, percKernel: number = 17): Float64Array[] {
  const { magnitudes, numFrames } = spec;
  if (numFrames < 4) return magnitudes;

  const numBins = magnitudes[0].length;

  // Harmonic-enhanced spectrogram: median filter along TIME for each frequency bin
  const harmonicSpec: number[][] = [];
  for (let frame = 0; frame < numFrames; frame++) {
    harmonicSpec.push(new Array(numBins).fill(0));
  }
  
  for (let bin = 0; bin < numBins; bin++) {
    const timeSlice: number[] = [];
    for (let frame = 0; frame < numFrames; frame++) {
      timeSlice.push(magnitudes[frame][bin]);
    }
    const filtered = medianFilter1D(timeSlice, harmKernel);
    for (let frame = 0; frame < numFrames; frame++) {
      harmonicSpec[frame][bin] = filtered[frame];
    }
  }

  // Percussive-enhanced spectrogram: median filter along FREQUENCY for each time frame
  const percussiveSpec: number[][] = [];
  for (let frame = 0; frame < numFrames; frame++) {
    const freqSlice: number[] = [];
    for (let bin = 0; bin < numBins; bin++) {
      freqSlice.push(magnitudes[frame][bin]);
    }
    percussiveSpec.push(medianFilter1D(freqSlice, percKernel) as number[]);
  }

  // Soft Wiener-like mask: percussive / (harmonic + percussive + eps)
  const percMagnitudes: Float64Array[] = [];
  const eps = 1e-10;

  for (let frame = 0; frame < numFrames; frame++) {
    const percMag = new Float64Array(numBins);
    for (let bin = 0; bin < numBins; bin++) {
      const h = harmonicSpec[frame][bin];
      const p = percussiveSpec[frame][bin];
      // Wiener mask: p^2 / (h^2 + p^2)
      const mask = (p * p) / (h * h + p * p + eps);
      percMag[bin] = magnitudes[frame][bin] * mask;
    }
    percMagnitudes.push(percMag);
  }

  return percMagnitudes;
}

// ═══════════════════════════════════════════════════════
//  Multi-band Spectral Flux with HPSS
// ═══════════════════════════════════════════════════════

interface OnsetResult {
  onsetTimes: number[];
  onsetStrengths: number[]; // normalized strength per onset
  odf: Float64Array; // full onset detection function
  odfRate: number;
}

function multiBandOnsetDetection(
  spec: Spectrogram,
  useHPSS: boolean = true
): OnsetResult {
  const { fftSize, hopSize, numFrames, sampleRate } = spec;
  
  if (numFrames < 4) {
    return { onsetTimes: [], onsetStrengths: [], odf: new Float64Array(0), odfRate: sampleRate / hopSize };
  }

  // Apply HPSS to focus on percussive content
  const magnitudes = useHPSS ? hpssPercussiveMask(spec) : spec.magnitudes;

  const binHz = sampleRate / fftSize;
  const lowEnd = Math.min(Math.floor(300 / binHz), fftSize / 2);
  const midEnd = Math.min(Math.floor(3000 / binHz), fftSize / 2);
  const highEnd = Math.min(Math.floor(16000 / binHz), fftSize / 2);
  const lowStart = Math.max(1, Math.floor(20 / binHz));
  const midStart = lowEnd;
  const highStart = midEnd;

  const bands = [
    { start: lowStart, end: lowEnd, weight: 2.0 },   // Bass – most important for beat
    { start: midStart, end: midEnd, weight: 1.0 },
    { start: highStart, end: highEnd, weight: 0.5 },
  ];

  const numBands = bands.length;
  const odf = new Float64Array(numFrames);

  // Spectral whitening: normalize each band's magnitude to reduce timbral bias
  for (let frame = 1; frame < numFrames; frame++) {
    for (let b = 0; b < numBands; b++) {
      const band = bands[b];
      let flux = 0;
      let energy = 0;
      const bandSize = band.end - band.start;
      if (bandSize <= 0) continue;

      for (let k = band.start; k < band.end; k++) {
        const mag = magnitudes[frame][k];
        const prevMag = magnitudes[frame - 1][k];
        // Spectral whitening: log-compression reduces dynamic range
        const logMag = Math.log1p(mag * 100);
        const logPrevMag = Math.log1p(prevMag * 100);
        const diff = logMag - logPrevMag;
        if (diff > 0) flux += diff; // half-wave rectification
        energy += mag;
      }

      // Normalize by band energy to make bands comparable
      const normFactor = energy > 0 ? bandSize / (energy + 1e-10) : 1;
      odf[frame] += flux * normFactor * band.weight;
    }
  }

  // Adaptive peak picking
  const odfRate = sampleRate / hopSize;
  const { times, strengths } = adaptivePeakPick(odf, odfRate, 0.06);

  return { onsetTimes: times, onsetStrengths: strengths, odf, odfRate };
}

// ═══════════════════════════════════════════════════════
//  Adaptive Peak Picking with strength tracking
// ═══════════════════════════════════════════════════════

function adaptivePeakPick(
  odf: Float64Array,
  odfRate: number,
  minTimeDiff: number = 0.06
): { times: number[]; strengths: number[] } {
  const times: number[] = [];
  const rawStrengths: number[] = [];
  const windowSize = Math.max(4, Math.round(odfRate * 0.12)); // ~120ms adaptive window
  const minFrameDiff = Math.round(minTimeDiff * odfRate);

  // Compute global statistics
  let globalMean = 0;
  let globalMax = 0;
  for (let i = 0; i < odf.length; i++) {
    globalMean += odf[i];
    if (odf[i] > globalMax) globalMax = odf[i];
  }
  globalMean /= odf.length;
  const globalThreshold = globalMean + (globalMax - globalMean) * 0.08;

  let lastOnsetFrame = -Infinity;

  for (let i = windowSize; i < odf.length - windowSize; i++) {
    // Local statistics (using sliding window)
    const windowVals: number[] = [];
    for (let j = i - windowSize; j <= i + windowSize; j++) {
      windowVals.push(odf[j]);
    }
    windowVals.sort((a, b) => a - b);
    const localMedian = windowVals[Math.floor(windowVals.length / 2)];
    
    let localMean = 0;
    for (const v of windowVals) localMean += v;
    localMean /= windowVals.length;

    // Adaptive threshold with spectral-whitened ODF
    const threshold = Math.max(
      localMedian * 1.8 + localMean * 0.5,
      globalThreshold
    );

    // Local maximum check (must be peak in ±2 samples)
    if (
      odf[i] > threshold &&
      odf[i] >= odf[i - 1] &&
      odf[i] >= odf[i + 1] &&
      odf[i] >= odf[i - 2] &&
      (i - lastOnsetFrame) >= minFrameDiff
    ) {
      times.push(i / odfRate);
      rawStrengths.push(odf[i]);
      lastOnsetFrame = i;
    }
  }

  // Normalize strengths to 0-1
  const maxStrength = rawStrengths.length > 0 ? Math.max(...rawStrengths) : 1;
  const strengths = rawStrengths.map(s => s / (maxStrength + 1e-10));

  return { times, strengths };
}

// ═══════════════════════════════════════════════════════
//  BPM Method 1: IOI Histogram (strength-weighted)
// ═══════════════════════════════════════════════════════

function ioiHistogramBPM(
  onsets: number[],
  onsetStrengths: number[],
  minBPM: number,
  maxBPM: number
): { bpm: number; score: number } {
  const resolution = 0.25;
  const numBins = Math.floor((maxBPM - minBPM) / resolution) + 1;
  const histogram = new Float64Array(numBins);

  if (onsets.length < 3) {
    return { bpm: 120, score: 0 };
  }

  const maxPairDist = Math.min(onsets.length, 16);

  for (let i = 0; i < onsets.length; i++) {
    for (let j = i + 1; j < Math.min(i + maxPairDist, onsets.length); j++) {
      const ioi = onsets[j] - onsets[i];
      if (ioi <= 0) continue;

      // Weight by onset strengths (both onsets contribute)
      const weight = (onsetStrengths[i] + onsetStrengths[j]) / 2;

      for (let mult = 1; mult <= 8; mult++) {
        const candidateBPM = (60 * mult) / ioi;
        if (candidateBPM >= minBPM && candidateBPM <= maxBPM) {
          const bin = Math.round((candidateBPM - minBPM) / resolution);
          if (bin >= 0 && bin < numBins) {
            const spread = 2;
            for (let k = -spread * 3; k <= spread * 3; k++) {
              const idx = bin + k;
              if (idx >= 0 && idx < numBins) {
                const gaussWeight = Math.exp(-(k * k) / (2 * spread * spread)) / mult;
                histogram[idx] += gaussWeight * weight;
              }
            }
          }
        }
      }
    }
  }

  let maxVal = 0;
  let maxBin = 0;
  for (let i = 0; i < numBins; i++) {
    if (histogram[i] > maxVal) { maxVal = histogram[i]; maxBin = i; }
  }

  const bpm = parabolicInterp(histogram, maxBin, resolution) + minBPM;

  let mean = 0;
  for (let i = 0; i < numBins; i++) mean += histogram[i];
  mean /= numBins;
  const score = mean > 0 ? Math.min(1, (maxVal - mean) / (maxVal + 0.001)) : 0;

  return { bpm, score };
}

// ═══════════════════════════════════════════════════════
//  BPM Method 2: Autocorrelation with parabolic interpolation
// ═══════════════════════════════════════════════════════

function autocorrelationBPM(
  odf: Float64Array,
  odfRate: number,
  minBPM: number,
  maxBPM: number
): { bpm: number; score: number } {
  if (odf.length < 32) return { bpm: 120, score: 0 };

  const minLag = Math.floor((60 / maxBPM) * odfRate);
  const maxLag = Math.ceil((60 / minBPM) * odfRate);
  const safeMaxLag = Math.min(maxLag, Math.floor(odf.length / 2));

  if (minLag >= safeMaxLag) return { bpm: 120, score: 0 };

  // Normalize
  let mean = 0;
  for (let i = 0; i < odf.length; i++) mean += odf[i];
  mean /= odf.length;
  const normalized = new Float64Array(odf.length);
  for (let i = 0; i < odf.length; i++) normalized[i] = odf[i] - mean;

  // Autocorrelation
  const acf = new Float64Array(safeMaxLag + 1);
  for (let lag = minLag; lag <= safeMaxLag; lag++) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < normalized.length - lag; i++) {
      sum += normalized[i] * normalized[i + lag];
      count++;
    }
    acf[lag] = count > 0 ? sum / count : 0;
  }

  // Find peaks with harmonic boosting
  let maxVal = -Infinity;
  let bestLag = minLag;
  for (let lag = minLag; lag <= safeMaxLag; lag++) {
    let harmonicBoost = 1.0;
    // Check 2x and 3x harmonics
    for (const mult of [2, 3]) {
      const mLag = lag * mult;
      if (mLag <= safeMaxLag && acf[mLag] > 0 && acf[lag] > 0) {
        harmonicBoost += 0.2 * (acf[mLag] / acf[lag]);
      }
    }
    // Check sub-harmonics too
    const halfLag = Math.round(lag / 2);
    if (halfLag >= minLag && acf[halfLag] > 0 && acf[lag] > 0) {
      harmonicBoost += 0.15 * (acf[halfLag] / acf[lag]);
    }

    const weighted = acf[lag] * harmonicBoost;
    if (weighted > maxVal) { maxVal = weighted; bestLag = lag; }
  }

  // Parabolic interpolation
  let preciseLag = bestLag;
  if (bestLag > minLag && bestLag < safeMaxLag) {
    const alpha = acf[bestLag - 1];
    const beta = acf[bestLag];
    const gamma = acf[bestLag + 1];
    const denom = 2 * (2 * beta - alpha - gamma);
    if (Math.abs(denom) > 1e-10) {
      preciseLag = bestLag + (alpha - gamma) / denom;
    }
  }

  const bpm = (60 * odfRate) / preciseLag;

  let acfMean = 0;
  for (let lag = minLag; lag <= safeMaxLag; lag++) acfMean += acf[lag];
  acfMean /= safeMaxLag - minLag + 1;
  const score = acfMean > 0 ? Math.min(1, (acf[bestLag] - acfMean) / (acf[bestLag] + 0.001)) : 0;

  return { bpm, score };
}

// ═══════════════════════════════════════════════════════
//  BPM Method 3: Comb Filter / Resonator Bank
// ═══════════════════════════════════════════════════════

function combFilterBPM(
  odf: Float64Array,
  odfRate: number,
  minBPM: number,
  maxBPM: number
): { bpm: number; score: number } {
  if (odf.length < 32) return { bpm: 120, score: 0 };

  const resolution = 0.5;
  const numCandidates = Math.floor((maxBPM - minBPM) / resolution) + 1;
  const scores = new Float64Array(numCandidates);

  for (let i = 0; i < numCandidates; i++) {
    const candidateBPM = minBPM + i * resolution;
    const period = (60 / candidateBPM) * odfRate;

    let energy = 0;
    for (let harmonic = 1; harmonic <= 4; harmonic++) {
      const p = period * harmonic;
      if (p >= odf.length / 2) break;

      let sum = 0;
      let count = 0;
      for (let j = 0; j < odf.length; j++) {
        const beatPhase = (j % p) / p;
        const phaseWeight = Math.cos(2 * Math.PI * beatPhase);
        if (phaseWeight > 0) {
          sum += odf[j] * phaseWeight;
          count++;
        }
      }
      if (count > 0) {
        energy += (sum / count) / harmonic;
      }
    }
    scores[i] = energy;
  }

  let maxVal = -Infinity;
  let maxIdx = 0;
  for (let i = 0; i < numCandidates; i++) {
    if (scores[i] > maxVal) { maxVal = scores[i]; maxIdx = i; }
  }

  const bpm = parabolicInterp(scores, maxIdx, resolution) + minBPM;
  let mean = 0;
  for (let i = 0; i < numCandidates; i++) mean += scores[i];
  mean /= numCandidates;
  const score = mean > 0 ? Math.min(1, (maxVal - mean) / (maxVal + 0.001)) : 0;

  return { bpm: Math.max(minBPM, Math.min(maxBPM, bpm)), score };
}

// ═══════════════════════════════════════════════════════
//  BPM Method 4: Energy Envelope Autocorrelation
//  Operates on the RMS energy curve – catches "big picture" tempo
// ═══════════════════════════════════════════════════════

function energyEnvelopeBPM(
  samples: Float32Array,
  sampleRate: number,
  minBPM: number,
  maxBPM: number
): { bpm: number; score: number } {
  // Compute RMS energy in ~20ms windows
  const envHop = Math.round(sampleRate * 0.02);
  const envFrameSize = Math.round(sampleRate * 0.04);
  const envLength = Math.floor((samples.length - envFrameSize) / envHop);

  if (envLength < 32) return { bpm: 120, score: 0 };

  const envelope = new Float64Array(envLength);
  for (let i = 0; i < envLength; i++) {
    const offset = i * envHop;
    let sum = 0;
    for (let j = 0; j < envFrameSize && offset + j < samples.length; j++) {
      sum += samples[offset + j] * samples[offset + j];
    }
    envelope[i] = Math.sqrt(sum / envFrameSize);
  }

  // Low-pass filter the envelope (simple moving average, ~100ms)
  const lpSize = Math.max(1, Math.round(0.1 * sampleRate / envHop));
  const smoothed = new Float64Array(envLength);
  let runSum = 0;
  for (let i = 0; i < envLength; i++) {
    runSum += envelope[i];
    if (i >= lpSize) runSum -= envelope[i - lpSize];
    smoothed[i] = runSum / Math.min(i + 1, lpSize);
  }

  // Difference (onset-like)
  const diff = new Float64Array(envLength);
  for (let i = 1; i < envLength; i++) {
    diff[i] = Math.max(0, smoothed[i] - smoothed[i - 1]);
  }

  // Autocorrelation on energy diff
  const envRate = sampleRate / envHop;
  const result = autocorrelationBPM(diff, envRate, minBPM, maxBPM);
  
  // Slightly lower confidence since this method is less precise
  return { bpm: result.bpm, score: result.score * 0.85 };
}

// ═══════════════════════════════════════════════════════
//  Parabolic interpolation
// ═══════════════════════════════════════════════════════

function parabolicInterp(data: Float64Array, peakIdx: number, binWidth: number): number {
  if (peakIdx <= 0 || peakIdx >= data.length - 1) return peakIdx * binWidth;
  const alpha = data[peakIdx - 1];
  const beta = data[peakIdx];
  const gamma = data[peakIdx + 1];
  const denom = 2 * (2 * beta - alpha - gamma);
  if (Math.abs(denom) < 1e-10) return peakIdx * binWidth;
  const correction = (alpha - gamma) / denom;
  return (peakIdx + correction) * binWidth;
}

// ═══════════════════════════════════════════════════════
//  Octave Error Resolution (enhanced)
// ═══════════════════════════════════════════════════════

function resolveOctaveError(
  rawBPM: number,
  onsets: number[],
  onsetStrengths: number[],
  preferredMin: number = 80,
  preferredMax: number = 160
): number {
  let bpm = rawBPM;
  while (bpm < preferredMin && bpm * 2 <= 300) bpm *= 2;
  while (bpm > preferredMax && bpm / 2 >= 30) bpm /= 2;

  if (onsets.length > 4) {
    const candidates = [rawBPM, rawBPM * 2, rawBPM / 2, rawBPM * 3 / 2, rawBPM * 2 / 3]
      .filter(b => b >= 40 && b <= 300);
    let bestScore = -1;
    let bestBPM = bpm;

    for (const candidate of candidates) {
      const beatInterval = 60 / candidate;
      let score = 0;
      for (let i = 1; i < onsets.length; i++) {
        const ioi = onsets[i] - onsets[i - 1];
        const ratio = ioi / beatInterval;
        const nearestInt = Math.round(ratio);
        if (nearestInt > 0 && nearestInt <= 8) {
          const error = Math.abs(ratio - nearestInt);
          // Weight by onset strength
          const strength = (onsetStrengths[i] + onsetStrengths[i - 1]) / 2;
          score += Math.exp(-error * error * 50) * strength;
        }
      }
      // Perceptual preference
      if (candidate >= preferredMin && candidate <= preferredMax) score *= 1.2;
      if (score > bestScore) { bestScore = score; bestBPM = candidate; }
    }
    bpm = bestBPM;
  }

  return bpm;
}

// ═══════════════════════════════════════════════════════
//  Downbeat Detection (enhanced with accent pattern)
// ═══════════════════════════════════════════════════════

function detectDownbeat(
  odf: Float64Array,
  odfRate: number,
  bpm: number,
  onsets: number[],
  onsetStrengths: number[]
): number {
  const beatFrames = (60 / bpm) * odfRate;
  const barFrames = beatFrames * 4;

  if (barFrames <= 0 || odf.length < barFrames) return 0;

  const numPhases = Math.min(128, Math.floor(barFrames));
  let bestPhase = 0;
  let bestScore = -Infinity;

  for (let phase = 0; phase < numPhases; phase++) {
    const phaseOffset = (phase / numPhases) * barFrames;
    let score = 0;

    // Score using ODF energy at beat positions
    for (let frame = phaseOffset; frame < odf.length; frame += beatFrames) {
      const idx = Math.round(frame);
      if (idx >= 0 && idx < odf.length) {
        // Window around beat position
        for (let k = -3; k <= 3; k++) {
          const ii = idx + k;
          if (ii >= 0 && ii < odf.length) {
            score += odf[ii] * Math.exp(-k * k * 0.5);
          }
        }
      }
    }

    // Extra weight for downbeat positions (beat 1 of each bar tends to be stronger)
    for (let frame = phaseOffset; frame < odf.length; frame += barFrames) {
      const idx = Math.round(frame);
      if (idx >= 0 && idx < odf.length) {
        score += odf[idx] * 0.5;
      }
    }

    // Also check if real onsets align with this phase
    for (let oi = 0; oi < onsets.length; oi++) {
      const onsetFrame = onsets[oi] * odfRate;
      const relativeFrame = onsetFrame - phaseOffset;
      if (relativeFrame < 0) continue;
      const nearestBeat = Math.round(relativeFrame / beatFrames) * beatFrames;
      const error = Math.abs(relativeFrame - nearestBeat) / beatFrames;
      if (error < 0.15) {
        score += onsetStrengths[oi] * 2;
      }
    }

    if (score > bestScore) { bestScore = score; bestPhase = phase; }
  }

  return (bestPhase / numPhases) * (barFrames / odfRate);
}

// ═══════════════════════════════════════════════════════
//  Tempo Stability Measurement
// ═══════════════════════════════════════════════════════

function measureTempoStability(onsets: number[], bpm: number): number {
  if (onsets.length < 4) return 0;

  const expectedInterval = 60 / bpm;
  const errors: number[] = [];

  for (let i = 1; i < onsets.length; i++) {
    const ioi = onsets[i] - onsets[i - 1];
    const ratio = ioi / expectedInterval;
    const nearestInt = Math.round(ratio);
    if (nearestInt > 0 && nearestInt <= 4) {
      const error = Math.abs(ratio - nearestInt);
      errors.push(error);
    }
  }

  if (errors.length < 2) return 0;

  const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
  // Convert to stability: low error → high stability
  return Math.max(0, Math.min(1, 1 - meanError * 5));
}

// ═══════════════════════════════════════════════════════
//  Main Entry Point: detectBPM
// ═══════════════════════════════════════════════════════

export function detectBPM(
  audioBuffer: AudioBuffer,
  startTime = 0,
  endTime?: number,
  minBPM = 55,
  maxBPM = 210
): BPMResult {
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.floor(startTime * sampleRate);
  const endSample = endTime
    ? Math.min(Math.floor(endTime * sampleRate), audioBuffer.length)
    : audioBuffer.length;

  // Mix down to mono
  const length = endSample - startSample;
  const mono = new Float32Array(length);
  const numChannels = audioBuffer.numberOfChannels;

  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i] += channelData[startSample + i] / numChannels;
    }
  }

  // ── Step 1: Compute spectrogram ──
  const frameSize = 2048;
  const hopSize = 512;
  const spec = computeSpectrogram(mono, sampleRate, frameSize, hopSize);

  // ── Step 2: Multi-band onset detection WITH HPSS ──
  const { onsetTimes, onsetStrengths, odf, odfRate } = multiBandOnsetDetection(spec, true);

  // ── Step 3: Four BPM methods ──
  const ioiResult = ioiHistogramBPM(onsetTimes, onsetStrengths, minBPM, maxBPM);
  const acfResult = autocorrelationBPM(odf, odfRate, minBPM, maxBPM);
  const combResult = combFilterBPM(odf, odfRate, minBPM, maxBPM);
  const energyResult = energyEnvelopeBPM(mono, sampleRate, minBPM, maxBPM);

  // ── Step 4: Weighted fusion ──
  const candidates: { bpm: number; score: number; source: string }[] = [
    { bpm: ioiResult.bpm, score: ioiResult.score, source: 'IOI Histogram' },
    { bpm: acfResult.bpm, score: acfResult.score, source: 'Autocorrelation' },
    { bpm: combResult.bpm, score: combResult.score, source: 'Comb Filter' },
    { bpm: energyResult.bpm, score: energyResult.score, source: 'Energy Envelope' },
  ];

  candidates.sort((a, b) => b.score - a.score);

  let finalBPM: number;
  let finalConfidence: number;

  const top = candidates[0];
  const agreeing = candidates.filter(c => {
    const diff = Math.abs(c.bpm - top.bpm);
    const ratio = c.bpm / top.bpm;
    return diff < 4 || Math.abs(ratio - 1) < 0.04 ||
      Math.abs(ratio - 2) * top.bpm < 4 || Math.abs(ratio - 0.5) * top.bpm < 4;
  });

  if (agreeing.length >= 2) {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const c of agreeing) {
      let bpm = c.bpm;
      if (Math.abs(bpm / top.bpm - 2) < 0.1) bpm /= 2;
      if (Math.abs(bpm / top.bpm - 0.5) < 0.1) bpm *= 2;
      weightedSum += bpm * c.score;
      totalWeight += c.score;
    }
    finalBPM = weightedSum / totalWeight;
    finalConfidence = Math.min(1, (agreeing.reduce((s, c) => s + c.score, 0)) / (candidates.length * 0.6));
  } else {
    finalBPM = top.bpm;
    finalConfidence = top.score * 0.6;
  }

  // ── Step 5: Octave error resolution ──
  finalBPM = resolveOctaveError(finalBPM, onsetTimes, onsetStrengths);
  finalBPM = Math.round(finalBPM * 10) / 10;

  // ── Step 6: Downbeat detection ──
  const downbeatOffset = detectDownbeat(odf, odfRate, finalBPM, onsetTimes, onsetStrengths);

  // ── Step 7: Tempo stability ──
  const tempoStability = measureTempoStability(onsetTimes, finalBPM);

  // Boost confidence if tempo is stable
  finalConfidence = Math.min(1, finalConfidence * (0.7 + 0.3 * tempoStability));

  const adjustedOnsets = onsetTimes.map(t => t + startTime);
  const adjustedStrengths = [...onsetStrengths];

  const allCandidates: BPMCandidate[] = candidates
    .map(c => ({ bpm: Math.round(c.bpm * 10) / 10, score: c.score, source: c.source }))
    .sort((a, b) => b.score - a.score);

  return {
    bpm: finalBPM,
    confidence: finalConfidence,
    onsets: adjustedOnsets,
    onsetStrengths: adjustedStrengths,
    downbeatOffset: downbeatOffset + startTime,
    allCandidates,
    tempoStability,
  };
}

// ═══════════════════════════════════════════════════════
//  Auto-snap loop to nearest whole bar count
// ═══════════════════════════════════════════════════════

export function autoSnapLoopToBars(
  loopStart: number,
  loopEnd: number,
  bpm: number,
  gridOffset: number,
  duration: number
): { start: number; end: number; bars: number } {
  const barDuration = (60 / bpm) * 4; // 4/4 time
  const loopDuration = loopEnd - loopStart;
  
  // Find nearest whole number of bars
  const rawBars = loopDuration / barDuration;
  const nearestBars = Math.max(1, Math.round(rawBars));
  
  // Snap start to nearest grid line
  const relStart = loopStart - gridOffset;
  const snappedStart = Math.round(relStart / barDuration) * barDuration + gridOffset;
  const snappedEnd = snappedStart + nearestBars * barDuration;
  
  // Ensure within bounds
  const finalStart = Math.max(0, snappedStart);
  const finalEnd = Math.min(duration, snappedEnd);
  
  return { start: finalStart, end: finalEnd, bars: nearestBars };
}

// ═══════════════════════════════════════════════════════
//  Grid Snapping Utilities
// ═══════════════════════════════════════════════════════

export function getGridIntervalSeconds(bpm: number, division: GridDivision): number {
  const beatDuration = 60 / bpm;
  switch (division) {
    case '1/1':  return beatDuration * 4;
    case '1/2':  return beatDuration * 2;
    case '1/4':  return beatDuration;
    case '1/8':  return beatDuration / 2;
    case '1/16': return beatDuration / 4;
    case '1/32': return beatDuration / 8;
    case '1/3':  return beatDuration * 4 / 3;
    case '1/6':  return beatDuration * 2 / 3;
    default:     return beatDuration;
  }
}

export function snapToGrid(time: number, bpm: number, division: GridDivision, offset = 0): number {
  const interval = getGridIntervalSeconds(bpm, division);
  const relativeTime = time - offset;
  const snapped = Math.round(relativeTime / interval) * interval;
  return snapped + offset;
}

export function getGridLines(
  startTime: number,
  endTime: number,
  bpm: number,
  division: GridDivision,
  offset = 0
): number[] {
  const interval = getGridIntervalSeconds(bpm, division);
  if (interval <= 0) return [];
  const lines: number[] = [];
  const firstLine = Math.ceil((startTime - offset) / interval) * interval + offset;
  for (let t = firstLine; t <= endTime; t += interval) {
    if (t >= startTime) lines.push(t);
  }
  return lines;
}

// ═══════════════════════════════════════════════════════
//  Waveform Peak Generation
// ═══════════════════════════════════════════════════════

export function generateWaveformPeaks(
  audioBuffer: AudioBuffer,
  numPeaks: number,
  channel = -1
): { positive: Float32Array; negative: Float32Array } {
  const length = audioBuffer.length;
  const samplesPerPeak = length / numPeaks;
  const positive = new Float32Array(numPeaks);
  const negative = new Float32Array(numPeaks);
  const numChannels = channel >= 0 ? 1 : audioBuffer.numberOfChannels;

  for (let i = 0; i < numPeaks; i++) {
    const start = Math.floor(i * samplesPerPeak);
    const end = Math.min(Math.floor((i + 1) * samplesPerPeak), length);
    let max = 0;
    let min = 0;

    for (let ch = 0; ch < numChannels; ch++) {
      const chIdx = channel >= 0 ? channel : ch;
      const data = audioBuffer.getChannelData(chIdx);
      for (let j = start; j < end; j++) {
        const sample = data[j] / numChannels;
        if (sample > max) max = sample;
        if (sample < min) min = sample;
      }
    }

    positive[i] = max;
    negative[i] = min;
  }

  return { positive, negative };
}
