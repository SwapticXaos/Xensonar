import { useSyncExternalStore } from 'react';
import type { AudioSourceAsset } from '../audio/AudioImporterTypes';
import type { DonorProjectionModel } from './donorProjection';

export type DonorHearingSnapshot = Readonly<{
  phase: 'missing' | 'analyzing' | 'ready' | 'rendering' | 'playing' | 'error';
  source: AudioSourceAsset | null;
  model: DonorProjectionModel | null;
  selected: boolean;
  generation: number;
  error: string | null;
}>;

/** A runtime material lease. Never serialize a readiness flag without its PCM/model. */
export function createDonorHearingRuntime() {
  let state: DonorHearingSnapshot = { phase: 'missing', source: null, model: null, selected: false, generation: 0, error: null };
  const listeners = new Set<() => void>();
  let inputStart = 0, inputDuration = 0;
  let stopPlayback: (() => void) | null = null;
  const release = () => { const stop = stopPlayback; stopPlayback = null; stop?.(); };
  const publish = (patch: Partial<DonorHearingSnapshot>) => {
    state = { ...state, ...patch };
    for (const listener of [...listeners]) listener();
  };
  const matches = (source: AudioSourceAsset | null, start = source?.importStartSec, duration = source?.importDurationSec) =>
    !!source && !!state.source && source.monoSamples === state.source.monoSamples && source.leftSamples === state.source.leftSamples && source.rightSamples === state.source.rightSamples && source.sampleRate === state.source.sampleRate && start === inputStart && duration === inputDuration;
  return {
    getSnapshot: () => state,
    setPlaybackStopHandler(handler: (() => void) | null) { stopPlayback = handler; },
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    beginExtraction(source: AudioSourceAsset) {
      release();
      inputStart = source.importStartSec; inputDuration = source.importDurationSec;
      publish({ source, model: null, phase: 'analyzing', error: null, generation: state.generation + 1 });
      return state.generation;
    },
    commitExtraction(token: number, source: AudioSourceAsset, model: DonorProjectionModel) {
      if (token !== state.generation || !matches(source)) return false;
      publish({ source, model, phase: 'ready', error: null }); return true;
    },
    failExtraction(token: number, error: unknown) {
      if (token === state.generation) publish({ phase: 'error', model: null, error: error instanceof Error ? error.message : String(error) });
    },
    invalidateInput(source: AudioSourceAsset | null, start?: number, duration?: number) {
      if (matches(source, start ?? source?.importStartSec, duration ?? source?.importDurationSec)) return;
      if (!state.source && state.phase === 'missing') return;
      release();
      publish({ source: null, model: null, phase: 'missing', error: null, generation: state.generation + 1 });
    },
    selectDonor() { if (!state.model || !state.source) return false; publish({ selected: true }); return true; },
    selectCarrier() { release(); publish({ selected: false, phase: state.model ? 'ready' : state.phase, generation: state.phase === 'analyzing' ? state.generation : state.generation + 1 }); },
    beginRender() { if (!state.model || !state.source) throw new Error('Bitte zuerst Timbre extrahieren.'); release(); publish({ phase: 'rendering', generation: state.generation + 1, error: null }); return state.generation; },
    markPlaying(token: number) { if (token === state.generation) publish({ phase: 'playing' }); },
    finish(token: number) { if (token === state.generation) { stopPlayback = null; publish({ phase: state.model ? 'ready' : 'missing' }); } },
    failPlayback(token: number, error: unknown) { if (token === state.generation) { release(); publish({ phase: 'error', error: error instanceof Error ? error.message : String(error) }); } },
    stop() { if (state.phase === 'analyzing' && !stopPlayback) return; release(); publish({ phase: state.model ? 'ready' : state.phase === 'analyzing' ? 'analyzing' : 'missing', generation: state.generation + 1 }); },
  };
}
export const donorHearingRuntime = createDonorHearingRuntime();
export const useDonorHearingRuntime = () => useSyncExternalStore(donorHearingRuntime.subscribe, donorHearingRuntime.getSnapshot, donorHearingRuntime.getSnapshot);
