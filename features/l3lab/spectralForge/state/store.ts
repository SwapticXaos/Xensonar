import { create } from './miniStore';
import { SpectralData } from '../audio/SpectralData';
import type { AudioSourceAsset } from '../audio/AudioImporter';
import type { StampData } from '../audio/SpectralData';
import type { MorphMode } from '../audio/SpectralData';
import type { ColorMapName } from '../utils/colorMap';

// === Types ===

export type ToolType =
  | 'brush'
  | 'hardBrush'
  | 'line'
  | 'harmonicBrush'
  | 'noiseBrush'
  | 'spray'
  | 'formant'
  | 'stamp'
  | 'morph'
  | 'smudge'
  | 'dodgeBurn'
  | 'blurSharpen'
  | 'delaySmear'
  | 'threshold'
  | 'sourceTrace';

export type SynthMode = 'additive' | 'ifft' | 'granular' | 'glyph';

export type FormantVowel = 'a' | 'e' | 'i' | 'o' | 'u';

export type HarmonizerType = 'overtones' | 'intervals' | 'inharmonic' | 'spectralBlur';

export interface ViewPort {
  offsetX: number;
  offsetY: number;
  zoomX: number;
  zoomY: number;
}

export interface WaveformMix {
  sine: number;
  sawtooth: number;
  square: number;
  triangle: number;
}

export interface ToolSettings {
  brushSize: number;
  intensity: number;
  hardness: number;
  numHarmonics: number;
  harmonicDecay: number;
  formantVowel: FormantVowel;
  sprayDensity: number;
  eraseMode: boolean;
  grainSize: number;  // 0 = short/noisy grains, 1 = long/tonal grains
  morphMode: MorphMode;
}

export type ToolProfiles = Record<ToolType, ToolSettings>;

export type SourcePreviewMode = 'forge' | 'sourceWindow' | 'sourceFull';

export interface ForgeProjectSnapshot {
  version: 'spectral-forge-project-v1';
  activeTool: ToolType;
  toolProfiles: ToolProfiles;
  spectralSnapshot: Float32Array;
  materialExport: MaterialExportConfig;
  viewPort: ViewPort;
  synthMode: SynthMode;
  waveformMix: WaveformMix;
  colorMapName: ColorMapName;
  showGrainLayer: boolean;
  logScale: boolean;
  stampTransform: {
    scaleX: number;
    scaleY: number;
    rotation: number;
    flipX: boolean;
    flipY: boolean;
  };
  sourceMeta?: {
    kind: 'audio';
    fileName: string;
    originalDuration: number;
    sampleRate: number;
    importStartSec: number;
    importDurationSec: number;
  } | null;
}

function createBaseToolSettings(): ToolSettings {
  return {
    brushSize: 6,
    intensity: 0.4,
    hardness: 0.3,
    numHarmonics: 5,
    harmonicDecay: 0.6,
    formantVowel: 'a',
    sprayDensity: 0.3,
    eraseMode: false,
    grainSize: 0.5,
    morphMode: 'push',
  };
}

export function createDefaultToolSettings(tool: ToolType): ToolSettings {
  const base = createBaseToolSettings();
  switch (tool) {
    case 'harmonicBrush':
      return { ...base, brushSize: 2, intensity: 0.55, hardness: 0.45, numHarmonics: 5, harmonicDecay: 0.58 };
    case 'noiseBrush':
      return { ...base, brushSize: 10, intensity: 0.28, hardness: 0.2, grainSize: 0.18 };
    case 'spray':
      return { ...base, brushSize: 18, intensity: 0.3, sprayDensity: 0.3, grainSize: 0.32 };
    case 'formant':
      return { ...base, brushSize: 12, intensity: 0.45, formantVowel: 'a' };
    case 'stamp':
      return { ...base, brushSize: 24, intensity: 0.5 };
    case 'morph':
      return { ...base, brushSize: 70, intensity: 0.55, hardness: 0.2, grainSize: 0.5, morphMode: 'push' };
    case 'hardBrush':
      return { ...base, brushSize: 5, intensity: 0.48, hardness: 1 };
    case 'line':
      return { ...base, brushSize: 4, intensity: 0.42, hardness: 0.55 };
    case 'smudge':
      return { ...base, brushSize: 18, intensity: 0.45, hardness: 0.38, grainSize: 0.5 };
    case 'dodgeBurn':
      return { ...base, brushSize: 14, intensity: 0.32, hardness: 0.45, grainSize: 0.5 };
    case 'blurSharpen':
      return { ...base, brushSize: 16, intensity: 0.35, hardness: 0.4, grainSize: 0.5 };
    case 'delaySmear':
      return { ...base, brushSize: 12, intensity: 0.36, hardness: 0.42, grainSize: 0.55 };
    case 'threshold':
      return { ...base, brushSize: 18, intensity: 0.35, hardness: 0.65, grainSize: 0.5 };
    case 'sourceTrace':
      return { ...base, brushSize: 26, intensity: 0.42, hardness: 0.5, grainSize: 0.52 };
    case 'brush':
    default:
      return base;
  }
}

export function createDefaultToolProfiles(): ToolProfiles {
  return {
    brush: createDefaultToolSettings('brush'),
    hardBrush: createDefaultToolSettings('hardBrush'),
    line: createDefaultToolSettings('line'),
    harmonicBrush: createDefaultToolSettings('harmonicBrush'),
    noiseBrush: createDefaultToolSettings('noiseBrush'),
    spray: createDefaultToolSettings('spray'),
    formant: createDefaultToolSettings('formant'),
    stamp: createDefaultToolSettings('stamp'),
    morph: createDefaultToolSettings('morph'),
    smudge: createDefaultToolSettings('smudge'),
    dodgeBurn: createDefaultToolSettings('dodgeBurn'),
    blurSharpen: createDefaultToolSettings('blurSharpen'),
    delaySmear: createDefaultToolSettings('delaySmear'),
    threshold: createDefaultToolSettings('threshold'),
    sourceTrace: createDefaultToolSettings('sourceTrace'),
  };
}

export function mergeToolSettings(tool: ToolType, incoming?: Partial<ToolSettings> | null): ToolSettings {
  const defaults = createDefaultToolSettings(tool);
  return { ...defaults, ...(incoming ?? {}) };
}

export function hydrateToolProfiles(incoming?: Partial<Record<ToolType, Partial<ToolSettings>>> | null): ToolProfiles {
  const defaults = createDefaultToolProfiles();
  return {
    brush: mergeToolSettings('brush', incoming?.brush ?? defaults.brush),
    hardBrush: mergeToolSettings('hardBrush', incoming?.hardBrush ?? defaults.hardBrush),
    line: mergeToolSettings('line', incoming?.line ?? defaults.line),
    harmonicBrush: mergeToolSettings('harmonicBrush', incoming?.harmonicBrush ?? defaults.harmonicBrush),
    noiseBrush: mergeToolSettings('noiseBrush', incoming?.noiseBrush ?? defaults.noiseBrush),
    spray: mergeToolSettings('spray', incoming?.spray ?? defaults.spray),
    formant: mergeToolSettings('formant', incoming?.formant ?? defaults.formant),
    stamp: mergeToolSettings('stamp', incoming?.stamp ?? defaults.stamp),
    morph: mergeToolSettings('morph', incoming?.morph ?? defaults.morph),
    smudge: mergeToolSettings('smudge', incoming?.smudge ?? defaults.smudge),
    dodgeBurn: mergeToolSettings('dodgeBurn', incoming?.dodgeBurn ?? defaults.dodgeBurn),
    blurSharpen: mergeToolSettings('blurSharpen', incoming?.blurSharpen ?? defaults.blurSharpen),
    delaySmear: mergeToolSettings('delaySmear', incoming?.delaySmear ?? defaults.delaySmear),
    threshold: mergeToolSettings('threshold', incoming?.threshold ?? defaults.threshold),
    sourceTrace: mergeToolSettings('sourceTrace', incoming?.sourceTrace ?? defaults.sourceTrace),
  };
}

function cloneToolProfiles(toolProfiles: ToolProfiles): ToolProfiles {
  return hydrateToolProfiles(toolProfiles);
}


export type MaterialRole = 'loop' | 'waveMaterial' | 'particleExciter' | 'droneTexture';

export interface MaterialExportConfig {
  name: string;
  role: MaterialRole;
  adapterId?: string;
  bpm: number;
  bars: number;
  guideSegments: number;
  guideMarkers: number[];
  beatGuideAudible: boolean;
  beatGuideVolume: number;
  loopPreview: boolean;
}

export function clampBars(value: number): number {
  return Math.max(1, Math.min(16, Math.round(value || 1)));
}

export function clampGuideSegments(value: number): number {
  return Math.max(1, Math.min(16, Math.round(value || 1)));
}

export function buildDefaultGuideMarkers(guideSegments: number): number[] {
  const count = clampGuideSegments(guideSegments);
  if (count <= 1) return [];
  return Array.from({ length: count - 1 }, (_, idx) => (idx + 1) / count);
}

export function sanitizeGuideMarkers(markers: number[], guideSegments: number): number[] {
  const count = clampGuideSegments(guideSegments);
  if (count <= 1) return [];
  const minGap = 1 / (count * 8);
  const normalized = Array.from({ length: count - 1 }, (_, idx) => {
    const fallback = (idx + 1) / count;
    const raw = Number.isFinite(markers[idx]) ? markers[idx] : fallback;
    return raw;
  }).sort((a, b) => a - b);
  const result = normalized.slice();
  for (let i = 0; i < result.length; i++) {
    const minVal = i == 0 ? minGap : result[i - 1] + minGap;
    const maxVal = i == result.length - 1 ? 1 - minGap : result[i + 1] - minGap;
    result[i] = Math.max(minVal, Math.min(maxVal, result[i]));
  }
  return result;
}

export function computeLoopDurationSec(bars: number, bpm: number): number {
  const safeBars = clampBars(bars);
  const safeBpm = Math.max(1, Number.isFinite(bpm) ? bpm : 1);
  return (safeBars * 4 * 60) / safeBpm;
}

// === Constants ===
export const SPECTRAL_WIDTH = 2048;
export const SPECTRAL_HEIGHT = 512;
export const SAMPLE_RATE = 44100;
export const DURATION = 10;

// === Store ===

interface AppState {
  // Spectral data
  spectralData: SpectralData;

  // Undo system
  undoStack: Float32Array[];
  redoStack: Float32Array[];
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;

  // Current tool
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;

  // Tool settings
  toolProfiles: ToolProfiles;
  toolSettings: ToolSettings;
  updateToolSettings: (settings: Partial<ToolSettings>) => void;
  toggleEraseMode: () => void;
  createProjectSnapshot: () => ForgeProjectSnapshot;
  loadProjectSnapshot: (snapshot: ForgeProjectSnapshot) => void;

  // Viewport / zoom
  viewPort: ViewPort;
  setViewPort: (vp: Partial<ViewPort>) => void;

  // Material export / musical structure
  materialExport: MaterialExportConfig;
  updateMaterialExport: (patch: Partial<MaterialExportConfig>) => void;
  setGuideMarker: (index: number, value: number) => void;

  // Source-aware preview
  sourceAsset: AudioSourceAsset | null;
  setSourceAsset: (asset: AudioSourceAsset | null) => void;
  sourcePreviewMode: SourcePreviewMode;
  setSourcePreviewMode: (mode: SourcePreviewMode) => void;

  // Playback
  isPlaying: boolean;
  playheadPosition: number;
  setIsPlaying: (playing: boolean) => void;
  setPlayheadPosition: (pos: number) => void;
  showPlayheadMarker: boolean;
  setShowPlayheadMarker: (show: boolean) => void;

  // Synth mode
  synthMode: SynthMode;
  setSynthMode: (mode: SynthMode) => void;

  // Waveform mix
  waveformMix: WaveformMix;
  setWaveformMix: (mix: Partial<WaveformMix>) => void;

  // Color map
  colorMapName: ColorMapName;
  setColorMapName: (name: ColorMapName) => void;

  // Show grain layer overlay
  showGrainLayer: boolean;
  setShowGrainLayer: (show: boolean) => void;

  // Frequency scale
  logScale: boolean;
  setLogScale: (log: boolean) => void;

  // Canvas needs re-render flag
  renderVersion: number;
  triggerRender: () => void;

  // Clear canvas
  clearCanvas: () => void;

  // Line tool state
  lineStart: { x: number; y: number } | null;
  setLineStart: (pos: { x: number; y: number } | null) => void;

  // Stamp tool
  stampData: StampData | null;
  stampScaleX: number;
  stampScaleY: number;
  stampRotation: number;
  stampFlipX: boolean;
  stampFlipY: boolean;
  stampPhase: 'idle' | 'selecting' | 'stamping';
  setStampData: (data: StampData | null) => void;
  setStampScale: (scaleX: number, scaleY?: number) => void;
  adjustStampScale: (dx: number, dy: number) => void;
  rotateStamp: (deltaRadians: number) => void;
  setStampRotation: (rotationRadians: number) => void;
  toggleStampFlipX: () => void;
  toggleStampFlipY: () => void;
  resetStampTransform: () => void;
  setStampPhase: (phase: 'idle' | 'selecting' | 'stamping') => void;

  // Stamp selection rect
  stampSelStart: { x: number; y: number } | null;
  setStampSelStart: (pos: { x: number; y: number } | null) => void;

  // Harmonizer
  applyHarmonizer: (type: HarmonizerType, params?: Record<string, number>) => void;

  // Audio buffer dirty flag
  audioBufferDirty: boolean;
  setAudioBufferDirty: (dirty: boolean) => void;
}

const MAX_UNDO = 30;

export const useStore = create<AppState>((set, get) => ({
  // Spectral data
  spectralData: new SpectralData(SPECTRAL_WIDTH, SPECTRAL_HEIGHT),

  // Undo
  undoStack: [],
  redoStack: [],

  pushUndo: () => {
    const { spectralData, undoStack } = get();
    const snapshot = spectralData.cloneData();
    const newStack = [...undoStack, snapshot];
    if (newStack.length > MAX_UNDO) newStack.shift();
    set({ undoStack: newStack, redoStack: [] });
  },

  undo: () => {
    const { spectralData, undoStack, redoStack } = get();
    if (undoStack.length === 0) return;
    const newUndoStack = [...undoStack];
    const snapshot = newUndoStack.pop()!;
    const redoSnapshot = spectralData.cloneData();
    spectralData.restoreData(snapshot);
    set({
      undoStack: newUndoStack,
      redoStack: [...redoStack, redoSnapshot],
      renderVersion: get().renderVersion + 1,
      audioBufferDirty: true,
    });
  },

  redo: () => {
    const { spectralData, undoStack, redoStack } = get();
    if (redoStack.length === 0) return;
    const newRedoStack = [...redoStack];
    const snapshot = newRedoStack.pop()!;
    const undoSnapshot = spectralData.cloneData();
    spectralData.restoreData(snapshot);
    set({
      redoStack: newRedoStack,
      undoStack: [...undoStack, undoSnapshot],
      renderVersion: get().renderVersion + 1,
      audioBufferDirty: true,
    });
  },

  // Tool
  activeTool: 'brush',
  setActiveTool: (tool) => set((state) => ({
    activeTool: tool,
    toolSettings: mergeToolSettings(tool, state.toolProfiles[tool]),
  })),

  toolProfiles: createDefaultToolProfiles(),
  toolSettings: createDefaultToolSettings('brush'),
  updateToolSettings: (settings) =>
    set((state) => {
      const nextToolSettings = mergeToolSettings(state.activeTool, { ...state.toolSettings, ...settings });
      return {
        toolSettings: nextToolSettings,
        toolProfiles: {
          ...state.toolProfiles,
          [state.activeTool]: nextToolSettings,
        },
      };
    }),
  toggleEraseMode: () =>
    set((state) => {
      const nextToolSettings = mergeToolSettings(state.activeTool, { ...state.toolSettings, eraseMode: !state.toolSettings.eraseMode });
      return {
        toolSettings: nextToolSettings,
        toolProfiles: {
          ...state.toolProfiles,
          [state.activeTool]: nextToolSettings,
        },
      };
    }),
  createProjectSnapshot: () => {
    const state = get();
    return {
      version: 'spectral-forge-project-v1',
      activeTool: state.activeTool,
      toolProfiles: cloneToolProfiles(state.toolProfiles),
      spectralSnapshot: state.spectralData.cloneData(),
      materialExport: { ...state.materialExport, guideMarkers: [...state.materialExport.guideMarkers] },
      viewPort: { ...state.viewPort },
      synthMode: state.synthMode,
      waveformMix: { ...state.waveformMix },
      colorMapName: state.colorMapName,
      showGrainLayer: state.showGrainLayer,
      logScale: state.logScale,
      stampTransform: {
        scaleX: state.stampScaleX,
        scaleY: state.stampScaleY,
        rotation: state.stampRotation,
        flipX: state.stampFlipX,
        flipY: state.stampFlipY,
      },
      sourceMeta: state.sourceAsset ? {
        kind: 'audio',
        fileName: state.sourceAsset.fileName,
        originalDuration: state.sourceAsset.originalDuration,
        sampleRate: state.sourceAsset.sampleRate,
        importStartSec: state.sourceAsset.importStartSec,
        importDurationSec: state.sourceAsset.importDurationSec,
      } : null,
    };
  },
  loadProjectSnapshot: (snapshot) => {
    const state = get();
    state.spectralData.restoreData(snapshot.spectralSnapshot);
    const toolProfiles = hydrateToolProfiles(snapshot.toolProfiles as Partial<Record<ToolType, Partial<ToolSettings>>> | null);
    const activeTool = snapshot.activeTool in toolProfiles ? snapshot.activeTool : 'brush';
    set((s) => ({
      activeTool,
      toolProfiles,
      toolSettings: mergeToolSettings(activeTool, toolProfiles[activeTool]),
      materialExport: {
        ...snapshot.materialExport,
        bars: clampBars(snapshot.materialExport.bars),
        guideSegments: clampGuideSegments(snapshot.materialExport.guideSegments),
        guideMarkers: sanitizeGuideMarkers(snapshot.materialExport.guideMarkers ?? buildDefaultGuideMarkers(snapshot.materialExport.guideSegments), snapshot.materialExport.guideSegments),
        beatGuideVolume: Math.max(0, Math.min(1, snapshot.materialExport.beatGuideVolume ?? 0.35)),
      },
      viewPort: { ...snapshot.viewPort },
      synthMode: snapshot.synthMode,
      waveformMix: { ...snapshot.waveformMix },
      colorMapName: snapshot.colorMapName,
      showGrainLayer: snapshot.showGrainLayer,
      logScale: snapshot.logScale,
      stampScaleX: snapshot.stampTransform?.scaleX ?? 1,
      stampScaleY: snapshot.stampTransform?.scaleY ?? 1,
      stampRotation: snapshot.stampTransform?.rotation ?? 0,
      stampFlipX: snapshot.stampTransform?.flipX ?? false,
      stampFlipY: snapshot.stampTransform?.flipY ?? false,
      sourceAsset: null,
      sourcePreviewMode: 'forge',
      renderVersion: s.renderVersion + 1,
      audioBufferDirty: true,
    }));
  },

  // Viewport
  viewPort: {
    offsetX: 0,
    offsetY: 0,
    zoomX: 1,
    zoomY: 1,
  },
  setViewPort: (vp) =>
    set((state) => ({
      viewPort: { ...state.viewPort, ...vp },
    })),

  // Material export / musical structure
  materialExport: {
    name: 'spectral-material',
    role: 'loop',
    bpm: 108,
    bars: 4,
    guideSegments: 4,
    guideMarkers: buildDefaultGuideMarkers(4),
    beatGuideAudible: false,
    beatGuideVolume: 0.35,
    loopPreview: true,
  },
  updateMaterialExport: (patch) =>
    set((state) => {
      const nextBars = patch.bars !== undefined ? clampBars(patch.bars) : state.materialExport.bars;
      const nextSegments = patch.guideSegments !== undefined ? clampGuideSegments(patch.guideSegments) : state.materialExport.guideSegments;
      const shouldResetMarkers = patch.guideSegments !== undefined && nextSegments !== state.materialExport.guideSegments && patch.guideMarkers === undefined;
      const nextMarkersSource = patch.guideMarkers !== undefined ? patch.guideMarkers : shouldResetMarkers ? buildDefaultGuideMarkers(nextSegments) : state.materialExport.guideMarkers;
      const nextBeatGuideVolume = patch.beatGuideVolume !== undefined
        ? Math.max(0, Math.min(1, patch.beatGuideVolume))
        : state.materialExport.beatGuideVolume;
      return {
        materialExport: {
          ...state.materialExport,
          ...patch,
          bars: nextBars,
          guideSegments: nextSegments,
          guideMarkers: sanitizeGuideMarkers(nextMarkersSource, nextSegments),
          beatGuideVolume: nextBeatGuideVolume,
        },
      };
    }),
  setGuideMarker: (index, value) =>
    set((state) => {
      const nextMarkers = state.materialExport.guideMarkers.slice();
      nextMarkers[index] = value;
      return { materialExport: { ...state.materialExport, guideMarkers: sanitizeGuideMarkers(nextMarkers, state.materialExport.guideSegments) } };
    }),

  // Source-aware preview
  sourceAsset: null,
  setSourceAsset: (asset) => set({ sourceAsset: asset, sourcePreviewMode: asset ? get().sourcePreviewMode : 'forge' }),
  sourcePreviewMode: 'forge',
  setSourcePreviewMode: (mode) => set({ sourcePreviewMode: mode }),

  // Playback
  isPlaying: false,
  playheadPosition: 0,
  showPlayheadMarker: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlayheadPosition: (pos) => set({ playheadPosition: pos }),
  setShowPlayheadMarker: (show) => set({ showPlayheadMarker: show }),

  // Synth
  synthMode: 'additive',
  setSynthMode: (mode) => set({ synthMode: mode }),

  // Waveform mix
  waveformMix: {
    sine: 1,
    sawtooth: 0,
    square: 0,
    triangle: 0,
  },
  setWaveformMix: (mix) =>
    set((state) => ({
      waveformMix: { ...state.waveformMix, ...mix },
      audioBufferDirty: true,
    })),

  // Color
  colorMapName: 'magma',
  setColorMapName: (name) => set({ colorMapName: name, renderVersion: get().renderVersion + 1 }),

  // Grain layer
  showGrainLayer: false,
  setShowGrainLayer: (show) => set({ showGrainLayer: show, renderVersion: get().renderVersion + 1 }),

  // Scale
  logScale: true,
  setLogScale: (log) => set({ logScale: log, renderVersion: get().renderVersion + 1 }),

  // Render
  renderVersion: 0,
  triggerRender: () => set((s) => ({ renderVersion: s.renderVersion + 1 })),

  // Clear
  clearCanvas: () => {
    const { spectralData } = get();
    get().pushUndo();
    spectralData.clear();
    set((s) => ({ renderVersion: s.renderVersion + 1, audioBufferDirty: true }));
  },

  // Line tool
  lineStart: null,
  setLineStart: (pos) => set({ lineStart: pos }),

  // Stamp tool
  stampData: null,
  stampScaleX: 1,
  stampScaleY: 1,
  stampRotation: 0,
  stampFlipX: false,
  stampFlipY: false,
  stampPhase: 'idle',
  setStampData: (data) => set({
    stampData: data,
    stampScaleX: 1,
    stampScaleY: 1,
    stampRotation: 0,
    stampFlipX: false,
    stampFlipY: false,
  }),
  setStampScale: (scaleX, scaleY) => set((state) => ({
    stampScaleX: Math.max(0.1, Math.min(8, scaleX)),
    stampScaleY: Math.max(0.1, Math.min(8, scaleY ?? state.stampScaleY)),
  })),
  adjustStampScale: (dx, dy) => set((state) => ({
    stampScaleX: Math.max(0.1, Math.min(8, state.stampScaleX + dx)),
    stampScaleY: Math.max(0.1, Math.min(8, state.stampScaleY + dy)),
  })),
  rotateStamp: (deltaRadians) => set((state) => {
    const next = state.stampRotation + deltaRadians;
    const twoPi = Math.PI * 2;
    const wrapped = ((next % twoPi) + twoPi) % twoPi;
    return { stampRotation: wrapped };
  }),
  setStampRotation: (rotationRadians) => {
    const twoPi = Math.PI * 2;
    const wrapped = ((rotationRadians % twoPi) + twoPi) % twoPi;
    set({ stampRotation: wrapped });
  },
  toggleStampFlipX: () => set((state) => ({ stampFlipX: !state.stampFlipX })),
  toggleStampFlipY: () => set((state) => ({ stampFlipY: !state.stampFlipY })),
  resetStampTransform: () => set({
    stampScaleX: 1,
    stampScaleY: 1,
    stampRotation: 0,
    stampFlipX: false,
    stampFlipY: false,
  }),
  setStampPhase: (phase) => set({ stampPhase: phase }),
  stampSelStart: null,
  setStampSelStart: (pos) => set({ stampSelStart: pos }),

  // Audio buffer dirty
  audioBufferDirty: false,
  setAudioBufferDirty: (dirty) => set({ audioBufferDirty: dirty }),

  // Harmonizer
  applyHarmonizer: (type, params = {}) => {
    const { spectralData } = get();
    get().pushUndo();

    const height = spectralData.height;
    const width = spectralData.width;

    switch (type) {
      case 'overtones': {
        const numHarmonics = params.harmonics ?? 6;
        const decay = params.decay ?? 0.5;
        const newData = spectralData.cloneData();
        // Extract amp data from combined snapshot
        const ampLen = width * height;
        const ampData = newData.subarray(0, ampLen);

        for (let x = 0; x < width; x++) {
          for (let y = 0; y < height; y++) {
            const amp = spectralData.get(x, y);
            if (amp < 0.05) continue;

            const normalized = 1 - y / height;
            const freq = 20 * Math.pow(1000, normalized);

            for (let h = 2; h <= numHarmonics + 1; h++) {
              const harmonicFreq = freq * h;
              if (harmonicFreq > 20000) break;
              const harmonicNorm = Math.log(harmonicFreq / 20) / Math.log(1000);
              const harmonicY = Math.round((1 - harmonicNorm) * height);
              if (harmonicY < 0 || harmonicY >= height) continue;
              const idx = harmonicY * width + x;
              ampData[idx] = Math.min(1, ampData[idx] + amp * Math.pow(decay, h - 1));
            }
          }
        }
        spectralData.restoreData(newData);
        break;
      }

      case 'intervals': {
        const semitones = params.semitones ?? 7;
        const ratio = Math.pow(2, semitones / 12);
        const amount = params.amount ?? 0.7;
        const newData = spectralData.cloneData();
        const ampLen = width * height;
        const ampData = newData.subarray(0, ampLen);

        for (let x = 0; x < width; x++) {
          for (let y = 0; y < height; y++) {
            const amp = spectralData.get(x, y);
            if (amp < 0.05) continue;
            const normalized = 1 - y / height;
            const freq = 20 * Math.pow(1000, normalized);
            const newFreq = freq * ratio;
            if (newFreq > 20000) continue;
            const newNorm = Math.log(newFreq / 20) / Math.log(1000);
            const newY = Math.round((1 - newNorm) * height);
            if (newY < 0 || newY >= height) continue;
            const idx = newY * width + x;
            ampData[idx] = Math.min(1, ampData[idx] + amp * amount);
          }
        }
        spectralData.restoreData(newData);
        break;
      }

      case 'inharmonic': {
        const partials = params.partials ?? 5;
        const spread = params.spread ?? 1.4;
        const decay = params.decay ?? 0.5;
        const newData = spectralData.cloneData();
        const ampLen = width * height;
        const ampData = newData.subarray(0, ampLen);

        for (let x = 0; x < width; x++) {
          for (let y = 0; y < height; y++) {
            const amp = spectralData.get(x, y);
            if (amp < 0.05) continue;
            const normalized = 1 - y / height;
            const freq = 20 * Math.pow(1000, normalized);

            for (let h = 2; h <= partials + 1; h++) {
              const harmonicFreq = freq * Math.pow(h, spread);
              if (harmonicFreq > 20000) break;
              const newNorm = Math.log(harmonicFreq / 20) / Math.log(1000);
              const newY = Math.round((1 - newNorm) * height);
              if (newY < 0 || newY >= height) continue;
              const idx = newY * width + x;
              ampData[idx] = Math.min(1, ampData[idx] + amp * Math.pow(decay, h - 1));
            }
          }
        }
        spectralData.restoreData(newData);
        break;
      }

      case 'spectralBlur': {
        const blurRadius = params.radius ?? 3;
        const newData = spectralData.cloneData();
        const ampLen = width * height;
        const ampData = newData.subarray(0, ampLen);

        for (let x = 0; x < width; x++) {
          for (let y = 0; y < height; y++) {
            let sum = 0;
            let count = 0;
            for (let ddx = -blurRadius; ddx <= blurRadius; ddx++) {
              for (let ddy = -blurRadius; ddy <= blurRadius; ddy++) {
                const nx = x + ddx;
                const ny = y + ddy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  sum += spectralData.get(nx, ny);
                  count++;
                }
              }
            }
            ampData[y * width + x] = sum / count;
          }
        }
        spectralData.restoreData(newData);
        break;
      }
    }

    set((s) => ({ renderVersion: s.renderVersion + 1, audioBufferDirty: true }));
  },
}));
