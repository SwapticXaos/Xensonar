import { fftMagnitudesReal } from '../audio/realSpectrum';

export type DonorReconstructionMetrics = {
  spectralSimilarity: number;
  logSpectralErrorDb: number;
  levelErrorDb: number;
  comparedFrames: number;
};

const rms = (data: Float32Array) => Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / Math.max(1, data.length));

/** Phase-independent, multi-frame comparison. It is a regression signal, not a
 * perceptual certificate; real listening remains the musical acceptance gate. */
export function evaluateDonorReconstruction(original: Float32Array, rendered: Float32Array): DonorReconstructionMetrics {
  const length = Math.min(original.length, rendered.length);
  const windowSize = Math.min(2048, Math.max(256, 2 ** Math.floor(Math.log2(Math.max(256, length / 4)))));
  const hop = Math.max(128, Math.floor(windowSize / 2));
  let cosineSum = 0, logErrorSum = 0, frames = 0;
  for (let offset = 0; offset + windowSize <= length; offset += hop) {
    const a = new Float32Array(windowSize), b = new Float32Array(windowSize);
    for (let i = 0; i < windowSize; i++) {
      const window = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / Math.max(1, windowSize - 1));
      a[i] = original[offset + i] * window; b[i] = rendered[offset + i] * window;
    }
    const sa = fftMagnitudesReal(a), sb = fftMagnitudesReal(b);
    let dot = 0, pa = 0, pb = 0, logError = 0;
    for (let bin = 1; bin < sa.length; bin++) {
      const av = sa[bin], bv = sb[bin];
      dot += av * bv; pa += av * av; pb += bv * bv;
      const deltaDb = 20 * Math.log10((bv + 1e-8) / (av + 1e-8));
      logError += Math.min(60, Math.abs(deltaDb));
    }
    cosineSum += dot / Math.sqrt(Math.max(1e-20, pa * pb));
    logErrorSum += logError / Math.max(1, sa.length - 1); frames++;
  }
  const originalRms = rms(original), renderedRms = rms(rendered);
  return {
    spectralSimilarity: frames ? cosineSum / frames : 0,
    logSpectralErrorDb: frames ? logErrorSum / frames : 60,
    levelErrorDb: 20 * Math.log10((renderedRms + 1e-9) / (originalRms + 1e-9)),
    comparedFrames: frames,
  };
}
