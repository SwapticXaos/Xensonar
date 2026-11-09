export type AudioRenderProgressReporter = {
  emit: (progress: number, options?: { force?: boolean }) => void;
  mapPhase: (start: number, end: number) => (progress: number) => void;
};

// Direct-Renderer reference cadence, restored in 7.7.4 and isolated in 7.7.5.
// This module is deliberately a cadence/cooperation boundary, not a synthesis
// boundary: changing these values trades total render overhead against browser
// repaint/input opportunities. It must not silently change synthesis formulas,
// waveform equations, grain rules, phase rules or normalization target gain.
// Additive should remain deterministic for a fixed input; random-grain modes
// are not bit-identical across separate renders because they use Math.random().
export const AUDIO_RENDER_ADDITIVE_BIN_BATCH_SIZE = 16;
export const AUDIO_RENDER_GRANULAR_COLUMN_BATCH_SIZE = 32;
export const AUDIO_RENDER_GLYPH_COLUMN_BATCH_SIZE = 24;
export const AUDIO_RENDER_IFFT_YIELD_COLUMN_INTERVAL = 64;
export const AUDIO_RENDER_NORMALIZATION_BATCH_SIZE = 32768;

function nowMsForRenderProgress(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

export function createAudioRenderProgressReporter(
  onProgress?: (progress: number) => void,
): AudioRenderProgressReporter {
  let lastProgress = -1;
  let lastEmitAt = 0;
  const emit = (progress: number, options: { force?: boolean } = {}) => {
    if (!onProgress) return;
    const clamped = Math.max(0, Math.min(1, progress));
    const now = nowMsForRenderProgress();
    if (
      options.force ||
      clamped >= 1 ||
      clamped - lastProgress >= 0.0125 ||
      now - lastEmitAt >= 90
    ) {
      lastProgress = clamped;
      lastEmitAt = now;
      onProgress(clamped);
    }
  };
  return {
    emit,
    mapPhase: (start: number, end: number) => (progress: number) => {
      emit(start + Math.max(0, Math.min(1, progress)) * (end - start));
    },
  };
}

export function yieldAudioRenderControl(): Promise<void> {
  const schedulerApi = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (typeof schedulerApi?.yield === 'function') {
    return schedulerApi.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}
