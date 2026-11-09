import type { ColorMapName } from '../utils/colorMap';
import type { SynthMode, ViewPort, WaveformMix } from './storeTypes';

export type Forge3MinorState = {
  viewPort: ViewPort;
  isPlaying: boolean;
  playheadPosition: number;
  showPlayheadMarker: boolean;
  synthMode: SynthMode;
  waveformMix: WaveformMix;
  colorMapName: ColorMapName;
  showGrainLayer: boolean;
  logScale: boolean;
  renderVersion: number;
  lineStart: { x: number; y: number } | null;
  audioBufferDirty: boolean;
};

export type Forge3MinorStoreActions = {
  setViewPort: (vp: Partial<ViewPort>) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlayheadPosition: (pos: number) => void;
  setShowPlayheadMarker: (show: boolean) => void;
  setSynthMode: (mode: SynthMode) => void;
  setWaveformMix: (mix: Partial<WaveformMix>) => void;
  setColorMapName: (name: ColorMapName) => void;
  setShowGrainLayer: (show: boolean) => void;
  setLogScale: (log: boolean) => void;
  triggerRender: () => void;
  setLineStart: (pos: { x: number; y: number } | null) => void;
  setAudioBufferDirty: (dirty: boolean) => void;
};

type StoreSet<T extends Forge3MinorState> = (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;

export function createInitialForge3MinorState(): Forge3MinorState {
  return {
    viewPort: {
      offsetX: 0,
      offsetY: 0,
      zoomX: 1,
      zoomY: 1,
    },
    isPlaying: false,
    playheadPosition: 0,
    showPlayheadMarker: false,
    synthMode: 'additive',
    waveformMix: {
      sine: 1,
      sawtooth: 0,
      square: 0,
      triangle: 0,
    },
    colorMapName: 'magma',
    showGrainLayer: false,
    logScale: true,
    renderVersion: 0,
    lineStart: null,
    audioBufferDirty: false,
  };
}

export function setViewPortState<T extends Forge3MinorState>(state: T, vp: Partial<ViewPort>): Partial<T> {
  return {
    viewPort: { ...state.viewPort, ...vp },
  } as Partial<T>;
}

export function setWaveformMixState<T extends Forge3MinorState>(state: T, mix: Partial<WaveformMix>): Partial<T> {
  return {
    waveformMix: { ...state.waveformMix, ...mix },
    audioBufferDirty: true,
  } as Partial<T>;
}

export function setRenderColorMapState<T extends Forge3MinorState>(state: T, name: ColorMapName): Partial<T> {
  return {
    colorMapName: name,
    renderVersion: state.renderVersion + 1,
  } as Partial<T>;
}

export function setShowGrainLayerState<T extends Forge3MinorState>(state: T, show: boolean): Partial<T> {
  return {
    showGrainLayer: show,
    renderVersion: state.renderVersion + 1,
  } as Partial<T>;
}

export function setLogScaleState<T extends Forge3MinorState>(state: T, log: boolean): Partial<T> {
  return {
    logScale: log,
    renderVersion: state.renderVersion + 1,
  } as Partial<T>;
}

export function triggerRenderState<T extends Forge3MinorState>(state: T): Partial<T> {
  return {
    renderVersion: state.renderVersion + 1,
  } as Partial<T>;
}

export function createForge3MinorStoreActions<T extends Forge3MinorState>(set: StoreSet<T>): Forge3MinorStoreActions {
  return {
    setViewPort: (vp) => set((state) => setViewPortState(state, vp)),
    setIsPlaying: (playing) => set({ isPlaying: playing } as Partial<T>),
    setPlayheadPosition: (pos) => set({ playheadPosition: pos } as Partial<T>),
    setShowPlayheadMarker: (show) => set({ showPlayheadMarker: show } as Partial<T>),
    setSynthMode: (mode) => set({ synthMode: mode } as Partial<T>),
    setWaveformMix: (mix) => set((state) => setWaveformMixState(state, mix)),
    setColorMapName: (name) => set((state) => setRenderColorMapState(state, name)),
    setShowGrainLayer: (show) => set((state) => setShowGrainLayerState(state, show)),
    setLogScale: (log) => set((state) => setLogScaleState(state, log)),
    triggerRender: () => set((state) => triggerRenderState(state)),
    setLineStart: (pos) => set({ lineStart: pos } as Partial<T>),
    setAudioBufferDirty: (dirty) => set({ audioBufferDirty: dirty } as Partial<T>),
  };
}
