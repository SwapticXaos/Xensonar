import { SpectralData, yToFrequency } from './SpectralData';
import type { SynthMode, WaveformMix } from '../state/storeTypes';
import { DURATION } from '../spectralConstants';
import { mixedWaveform } from './audioWaveforms';
import {
  AUDIO_RENDER_ADDITIVE_BIN_BATCH_SIZE,
  AUDIO_RENDER_GLYPH_COLUMN_BATCH_SIZE,
  AUDIO_RENDER_GRANULAR_COLUMN_BATCH_SIZE,
  AUDIO_RENDER_IFFT_YIELD_COLUMN_INTERVAL,
  AUDIO_RENDER_NORMALIZATION_BATCH_SIZE,
  createAudioRenderProgressReporter,
  yieldAudioRenderControl,
} from './audioRenderCooperation';

/** Pure spectral-data -> AudioBuffer renderer. Playback/cache lifetime stays in AudioEngine. */
export class SpectralBufferRenderer {
  constructor(private readonly getAudioContext: () => AudioContext) {}

  private getContext(): AudioContext {
    return this.getAudioContext();
  }

  async renderToBuffer(
    spectralData: SpectralData,
    synthMode: SynthMode,
    waveformMix: WaveformMix,
    onProgress?: (progress: number) => void
  ): Promise<AudioBuffer> {
    const ctx = this.getContext();
    const sampleRate = ctx.sampleRate;
    const totalSamples = Math.round(DURATION * sampleRate);
    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const output = buffer.getChannelData(0);

    const width = spectralData.width;
    const height = spectralData.height;
    const samplesPerColumn = totalSamples / width;

    const progress = createAudioRenderProgressReporter(onProgress);
    progress.emit(0.01, { force: true });
    const synthesisProgress = progress.mapPhase(0.02, 0.9);

    if (synthMode === 'additive') {
      await this.renderAdditive(spectralData, output, totalSamples, width, height, samplesPerColumn, sampleRate, waveformMix, synthesisProgress);
    } else if (synthMode === 'granular') {
      await this.renderGranular(spectralData, output, totalSamples, width, height, samplesPerColumn, sampleRate, waveformMix, synthesisProgress);
    } else if (synthMode === 'glyph') {
      await this.renderGlyph(spectralData, output, totalSamples, width, height, samplesPerColumn, sampleRate, waveformMix, synthesisProgress);
    } else {
      await this.renderIFFT(spectralData, output, totalSamples, width, height, samplesPerColumn, sampleRate, synthesisProgress);
    }
    progress.emit(0.9, { force: true });

    // Normalize after synthesis. This keeps the mathematical output contract the
    // same for deterministic modes, but it is still a performance trade-off:
    // coarse progress/yield points make the end phase observable without turning
    // normalization into a high-overhead UI heartbeat.
    let maxAmp = 0;
    const normalizationBatchSize = AUDIO_RENDER_NORMALIZATION_BATCH_SIZE;
    for (let i = 0; i < totalSamples; i++) {
      maxAmp = Math.max(maxAmp, Math.abs(output[i]));
      if (i > 0 && i % normalizationBatchSize === 0) {
        progress.emit(0.9 + (i / totalSamples) * 0.045);
        await yieldAudioRenderControl();
      }
    }
    progress.emit(0.945, { force: true });
    if (maxAmp > 0) {
      const gain = 0.8 / maxAmp;
      for (let i = 0; i < totalSamples; i++) {
        output[i] *= gain;
        if (i > 0 && i % normalizationBatchSize === 0) {
          progress.emit(0.945 + (i / totalSamples) * 0.05);
          await yieldAudioRenderControl();
        }
      }
    }
    progress.emit(1, { force: true });

    return buffer;
  }

  private async renderAdditive(
    spectralData: SpectralData,
    output: Float32Array,
    totalSamples: number,
    width: number,
    height: number,
    _samplesPerColumn: number,
    sampleRate: number,
    waveformMix: WaveformMix,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const batchSize = AUDIO_RENDER_ADDITIVE_BIN_BATCH_SIZE;
    const phases = new Float32Array(height);

    for (let y = 0; y < height; y += batchSize) {
      const endY = Math.min(y + batchSize, height);

      for (let binY = y; binY < endY; binY++) {
        const freq = yToFrequency(binY, height);
        if (freq < 20 || freq > 20000) continue;

        // Check if this bin has any energy
        let hasEnergy = false;
        for (let x = 0; x < width; x++) {
          if (spectralData.get(x, binY) > 0.001) {
            hasEnergy = true;
            break;
          }
        }
        if (!hasEnergy) continue;

        const phaseInc = (2 * Math.PI * freq) / sampleRate;
        let phase = phases[binY];

        for (let s = 0; s < totalSamples; s++) {
          // Interpolate amplitude from spectral data
          const colF = (s / totalSamples) * width;
          const col0 = Math.floor(colF);
          const col1 = Math.min(col0 + 1, width - 1);
          const t = colF - col0;

          const amp0 = spectralData.get(col0, binY);
          const amp1 = spectralData.get(col1, binY);
          const amp = amp0 + (amp1 - amp0) * t;

          if (amp > 0.001) {
            output[s] += mixedWaveform(phase, waveformMix) * amp * 0.02;
          }
          phase += phaseInc;
        }

        phases[binY] = phase % (2 * Math.PI);
      }

      if (onProgress) {
        onProgress(endY / height);
      }

      // Yield to UI thread
      await yieldAudioRenderControl();
    }
  }

  /**
   * Granular synthesis - grain duration is controlled by the grain layer
   * Short grains → noise-like texture
   * Long grains → tonal, smooth
   */
  private async renderGranular(
    spectralData: SpectralData,
    output: Float32Array,
    totalSamples: number,
    width: number,
    height: number,
    samplesPerColumn: number,
    sampleRate: number,
    waveformMix: WaveformMix,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    // Process in column batches
    const colBatch = AUDIO_RENDER_GRANULAR_COLUMN_BATCH_SIZE;

    for (let xStart = 0; xStart < width; xStart += colBatch) {
      const xEnd = Math.min(xStart + colBatch, width);

      for (let x = xStart; x < xEnd; x++) {
        const colStartSample = Math.round((x / width) * totalSamples);

        for (let y = 0; y < height; y++) {
          const amp = spectralData.get(x, y);
          if (amp < 0.01) continue;

          const freq = yToFrequency(y, height);
          if (freq < 20 || freq > 20000) continue;

          // Get grain duration from grain layer
          const grainParam = spectralData.getGrain(x, y);
          // Map 0-1 to grain duration: 0 = 1ms (noisy), 1 = 150ms (tonal)
          const grainDuration = 0.001 + grainParam * grainParam * 0.149;
          const grainSamples = Math.max(4, Math.round(grainDuration * sampleRate));

          // Number of overlapping grains (more for longer durations = smoother)
          const numGrains = Math.max(1, Math.round(1 + grainParam * 2));

          for (let g = 0; g < numGrains; g++) {
            // Scatter grain within the column's time window
            const grainOffset = Math.round(Math.random() * samplesPerColumn);
            const grainStart = colStartSample + grainOffset;

            // Random initial phase for natural sound
            const randomPhase = Math.random() * 2 * Math.PI;
            const phaseInc = (2 * Math.PI * freq) / sampleRate;

            // Slight pitch randomization for short grains (adds noise character)
            const pitchJitter = grainParam < 0.3 ? (1 + (Math.random() - 0.5) * 0.1 * (1 - grainParam * 3)) : 1;

            for (let s = 0; s < grainSamples; s++) {
              const idx = grainStart + s;
              if (idx < 0 || idx >= totalSamples) continue;

              // Hann window
              const windowVal = 0.5 * (1 - Math.cos((2 * Math.PI * s) / grainSamples));
              const phase = randomPhase + phaseInc * s * pitchJitter;
              output[idx] += mixedWaveform(phase, waveformMix) * amp * windowVal * 0.015 / numGrains;
            }
          }
        }
      }

      if (onProgress) {
        onProgress(xEnd / width);
        await yieldAudioRenderControl();
      }
    }
  }

  private async renderGlyph(
    spectralData: SpectralData,
    output: Float32Array,
    totalSamples: number,
    width: number,
    height: number,
    samplesPerColumn: number,
    sampleRate: number,
    waveformMix: WaveformMix,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const colBatch = AUDIO_RENDER_GLYPH_COLUMN_BATCH_SIZE;
    const maxPeaksPerColumn = 5;
    const phases = new Float32Array(height);
    const columnEnergy = new Float32Array(width);

    for (let x = 0; x < width; x++) {
      let energy = 0;
      for (let y = 0; y < height; y++) energy += spectralData.get(x, y);
      columnEnergy[x] = energy / Math.max(1, height);
    }

    for (let xStart = 0; xStart < width; xStart += colBatch) {
      const xEnd = Math.min(xStart + colBatch, width);
      for (let x = xStart; x < xEnd; x++) {
        const columnTime = Math.round((x / width) * totalSamples);
        const prev = x > 0 ? columnEnergy[x - 1] : 0;
        const next = x < width - 1 ? columnEnergy[x + 1] : 0;
        const transient = Math.max(0, columnEnergy[x] - Math.max(prev, next) * 0.82);
        const peaks: Array<{ y: number; amp: number }> = [];

        for (let y = 1; y < height - 1; y++) {
          const amp = spectralData.get(x, y);
          if (amp < 0.05) continue;
          const prevAmp = spectralData.get(x, y - 1);
          const nextAmp = spectralData.get(x, y + 1);
          if (amp < prevAmp || amp < nextAmp) continue;
          peaks.push({ y, amp: amp + transient * 0.55 + spectralData.getGrain(x, y) * 0.06 });
        }

        peaks.sort((a, b) => b.amp - a.amp);
        peaks.length = Math.min(maxPeaksPerColumn, peaks.length);
        if (!peaks.length) continue;

        for (let p = 0; p < peaks.length; p++) {
          const y = peaks[p].y;
          const ampAtPeak = spectralData.get(x, y);
          const freq = yToFrequency(y, height);
          if (freq < 20 || freq > 18000) continue;
          const grain = spectralData.getGrain(x, y);
          const durSec = 0.014 + grain * grain * 0.18 + transient * 0.06;
          const voiceSamples = Math.max(8, Math.round(durSec * sampleRate));
          const localStart = columnTime + Math.round((p / Math.max(1, peaks.length)) * samplesPerColumn * 0.55);
          const phaseInc = (2 * Math.PI * freq) / sampleRate;
          let phase = phases[y] || Math.random() * Math.PI * 2;
          const brightness = Math.min(1, ampAtPeak * (0.75 + transient * 1.4));
          const gain = 0.014 + ampAtPeak * 0.055;

          for (let s = 0; s < voiceSamples; s++) {
            const idxOut = localStart + s;
            if (idxOut < 0 || idxOut >= totalSamples) break;
            const envT = s / Math.max(1, voiceSamples - 1);
            const env = Math.sin(Math.min(1, envT) * Math.PI) * Math.exp(-envT * (2.8 - grain * 1.1));
            const shimmer = Math.sin(envT * Math.PI * (1.5 + grain * 2.4)) * 0.12 * brightness;
            output[idxOut] += mixedWaveform(phase + shimmer, waveformMix) * env * gain * (1 - p * 0.12);
            phase += phaseInc * (1 + transient * 0.015);
          }
          phases[y] = phase % (2 * Math.PI);
        }
      }

      if (onProgress) onProgress(xEnd / width);
      await yieldAudioRenderControl();
    }
  }

  private async renderIFFT(
    spectralData: SpectralData,
    output: Float32Array,
    totalSamples: number,
    width: number,
    height: number,
    samplesPerColumn: number,
    sampleRate: number,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const fftSize = 2048;
    const hopSize = Math.round(samplesPerColumn);

    const window = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
    }

    for (let x = 0; x < width; x++) {
      const real = new Float32Array(fftSize);
      const imag = new Float32Array(fftSize);

      for (let y = 0; y < height; y++) {
        const amp = spectralData.get(x, y);
        if (amp < 0.001) continue;

        const freq = yToFrequency(y, height);
        const bin = Math.round((freq / sampleRate) * fftSize);
        if (bin > 0 && bin < fftSize / 2) {
          const phase = Math.random() * 2 * Math.PI;
          real[bin] += amp * Math.cos(phase);
          imag[bin] += amp * Math.sin(phase);
          real[fftSize - bin] = real[bin];
          imag[fftSize - bin] = -imag[bin];
        }
      }

      const timeDomain = this.idft(real, imag, fftSize);

      const startSample = Math.round(x * samplesPerColumn);
      for (let i = 0; i < fftSize && startSample + i < totalSamples; i++) {
        output[startSample + i] += timeDomain[i] * window[i] * 0.5;
      }

      if (onProgress && x % AUDIO_RENDER_IFFT_YIELD_COLUMN_INTERVAL === 0) {
        onProgress(x / width);
        await yieldAudioRenderControl();
      }
    }

    void sampleRate; void hopSize;
  }

  private idft(real: Float32Array, imag: Float32Array, N: number): Float32Array {
    const output = new Float32Array(N);

    const activeBins: number[] = [];
    for (let k = 0; k < N; k++) {
      if (Math.abs(real[k]) > 0.0001 || Math.abs(imag[k]) > 0.0001) {
        activeBins.push(k);
      }
    }

    for (let n = 0; n < N; n++) {
      let sum = 0;
      for (const k of activeBins) {
        const angle = (2 * Math.PI * k * n) / N;
        sum += real[k] * Math.cos(angle) - imag[k] * Math.sin(angle);
      }
      output[n] = sum / N;
    }

    return output;
  }

}
