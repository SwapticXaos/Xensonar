import type { AudioSourceAsset } from '../audio/AudioImporterTypes';
import type { SpectralData, StampData, MorphMode } from '../audio/SpectralData';
import type { ColorMapName } from '../utils/colorMap';
import type { CommitDomain, SourceAssetContext } from '../model/forge3Layers';
import type { MediatedAudioBody } from '../body/mediatedAudioBodyTypes';
import type { AnchorBindingPreview, AnchorBindingPreviewSummary, AnchorRelativeTimbreTensor, CarrierAnchorContinuityGraph, CarrierAnchorContinuitySummary, CarrierSpectralSkeleton, CarrierSpectralSkeletonSummary, DonorAnchor, DonorTimbreAnalysisSummary, DonorTimbreAtlas, DonorTimbreAtlasSummary } from '../types/carrierDonorV2Types';
import type { GestaltField, GestaltFieldSummary, MaterialAllocationPreview, MaterialAllocationSummary, MaterialField, MaterialFieldSummary } from '../types/gestaltMaterialField';
import type { TransferMacroAxes, TransferProfilePresetId } from '../types/transferProfile';
import type { CarrierDonorV2DonorUseMode } from '../types/carrierDonorV2RenderPolicy';
import type { EmbodimentField, EmbodimentLayerVisibility, EmbodimentStatus } from '../types/embodimentFieldTypes';
import type { EmbodimentPipelineState } from '../types/embodimentStateTypes';
import type { CarrierIntegralMachineId } from '../integral/carrierIntegralContracts';
import type { CarrierIntegralSelection, CarrierIntegralSelectionPatch } from '../integral/carrierIntegralSelection';
import type { CarrierIntegralSynthLabSelection } from '../integral/carrierIntegralSynthLab';
import type {
  CarrierIntegralHarmonicXploreSelection,
  CarrierIntegralHarmonicXploreSelectionPatch,
} from '../integral/carrierIntegralHarmonicXploreRenderConfig';
import type { Forge3BodyFieldSnapshot } from '../../forge3/bodyField';
import type { HarmonizerType } from './storeSpectralOperations';
import type { CarrierDonorV2State, V2Fingerprint } from './storeCarrierDonorV2Types';
import type { StampPhase } from './storeStampToolActions';

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
export type Forge3EditTarget = 'workbench' | 'linked_body';


export type BasisHearingTransportBridgePhase = 'idle' | 'preparing' | 'ready' | 'playing' | 'error';

export interface BasisHearingTransportBridgeState {
  requestKey: string | null;
  optionId: string | null;
  machineId: CarrierIntegralMachineId | null;
  phase: BasisHearingTransportBridgePhase;
  progress: number;
  loopPreview: boolean;
  updatedAt: number;
}

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
  carrierIntegralSelection?: Partial<CarrierIntegralSelection> | null;
  carrierIntegralSynthLab?: Partial<CarrierIntegralSynthLabSelection> | null;
  carrierIntegralHarmonicXplore?: Partial<CarrierIntegralHarmonicXploreSelection> | null;
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


export interface Forge3MainSnapshot {
  spectralSnapshot: Float32Array;
  bodySnapshot: Forge3BodyFieldSnapshot;
  sourceAsset: AudioSourceAsset | null;
  sourceAssetContext: SourceAssetContext;
  sourcePreviewMode: SourcePreviewMode;
  lastCommitDomain: CommitDomain;
  activeMediatedBody: MediatedAudioBody | null;
}

// === Store Public State ===

export interface AppState {
  // Spectral data
  spectralData: SpectralData;

  // SpectralForge body + form-lab state
  activeMediatedBody: MediatedAudioBody | null;
  setActiveMediatedBody: (body: MediatedAudioBody | null) => void;
  spectralEmbodimentSourceAsset: AudioSourceAsset | null;
  setSpectralEmbodimentSourceAsset: (source: AudioSourceAsset | null) => void;
  carrierDonorV2: CarrierDonorV2State;
  carrierIntegralSelection: CarrierIntegralSelection;
  setCarrierIntegralSelection: (patch: CarrierIntegralSelectionPatch) => void;
  resetCarrierIntegralSelection: () => void;
  carrierIntegralSynthLab: CarrierIntegralSynthLabSelection;
  setCarrierIntegralSynthLab: (patch: Partial<Pick<CarrierIntegralSynthLabSelection, 'presetId' | 'paramsPatch' | 'source'>>) => void;
  resetCarrierIntegralSynthLab: () => void;
  carrierIntegralHarmonicXplore: CarrierIntegralHarmonicXploreSelection;
  setCarrierIntegralHarmonicXplore: (patch: CarrierIntegralHarmonicXploreSelectionPatch) => void;
  resetCarrierIntegralHarmonicXplore: () => void;
  embodimentField: EmbodimentField | null;
  embodimentStatus: EmbodimentStatus;
  embodimentMessage: string;
  embodimentLayersVisibility: EmbodimentLayerVisibility;
  embodimentPipelineState: EmbodimentPipelineState;
  setEmbodimentField: (field: EmbodimentField | null, status?: EmbodimentStatus, message?: string) => void;
  setEmbodimentStatus: (status: EmbodimentStatus, message?: string) => void;
  setEmbodimentLayersVisibility: (patch: Partial<EmbodimentLayerVisibility>) => void;
  setEmbodimentPipelineState: (
    patch:
      | Partial<EmbodimentPipelineState>
      | ((state: EmbodimentPipelineState) => Partial<EmbodimentPipelineState>)
  ) => void;
  clearEmbodimentField: () => void;
  resetEmbodimentPipeline: () => void;
  setCarrierDonorV2Patch: (
    patch:
      | Partial<CarrierDonorV2State>
      | ((state: CarrierDonorV2State) => Partial<CarrierDonorV2State>)
  ) => void;
  resetCarrierDonorV2State: () => void;
  markCarrierV2Dirty: (fingerprint: V2Fingerprint, reason?: string) => void;
  markDonorV2Dirty: (fingerprint: V2Fingerprint | null, reason?: string) => void;
  beginCarrierSkeletonBuild: (fingerprint: V2Fingerprint) => void;
  finishCarrierSkeletonBuild: (
    fingerprint: V2Fingerprint,
    skeleton: CarrierSpectralSkeleton,
    summary: CarrierSpectralSkeletonSummary,
    continuityGraph: CarrierAnchorContinuityGraph | null,
    continuitySummary: CarrierAnchorContinuitySummary | null
  ) => void;
  failCarrierSkeletonBuild: (message: string) => void;
  beginDonorAnalysisBuild: (fingerprint: V2Fingerprint) => void;
  finishDonorAnalysisBuild: (
    fingerprint: V2Fingerprint,
    donorAnchors: DonorAnchor[],
    donorTensor: AnchorRelativeTimbreTensor,
    donorSummary: DonorTimbreAnalysisSummary
  ) => void;
  failDonorAnalysisBuild: (message: string) => void;
  beginDonorAtlasBuild: () => void;
  finishDonorAtlasBuild: (
    donorAtlas: DonorTimbreAtlas,
    donorAtlasSummary: DonorTimbreAtlasSummary
  ) => void;
  failDonorAtlasBuild: (message: string) => void;
  beginGestaltFieldBuild: () => void;
  finishGestaltFieldBuild: (gestaltField: GestaltField, gestaltFieldSummary: GestaltFieldSummary) => void;
  failGestaltFieldBuild: (message: string) => void;
  beginMaterialFieldBuild: () => void;
  finishMaterialFieldBuild: (materialField: MaterialField, materialFieldSummary: MaterialFieldSummary) => void;
  failMaterialFieldBuild: (message: string) => void;
  beginMaterialAllocationBuild: () => void;
  finishMaterialAllocationBuild: (materialAllocationPreview: MaterialAllocationPreview, materialAllocationSummary: MaterialAllocationSummary) => void;
  failMaterialAllocationBuild: (message: string) => void;
  beginBindingBuild: () => void;
  finishBindingBuild: (
    bindingPreview: AnchorBindingPreview[],
    bindingSummary: AnchorBindingPreviewSummary
  ) => void;
  failBindingBuild: (message: string) => void;
  recomputeCarrierDonorV2Eligibility: () => void;
  setCarrierDonorTransferPreset: (presetId: TransferProfilePresetId) => void;
  setCarrierDonorTransferMacroAxes: (patch: Partial<TransferMacroAxes>) => void;
  setCarrierDonorV2DonorUseMode: (mode: CarrierDonorV2DonorUseMode) => void;

  // Undo system
  undoStack: Forge3MainSnapshot[];
  redoStack: Forge3MainSnapshot[];
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
  sourceAssetContext: SourceAssetContext;
  setSourceAsset: (asset: AudioSourceAsset | null, context?: SourceAssetContext) => void;
  sourcePreviewMode: SourcePreviewMode;
  setSourcePreviewMode: (mode: SourcePreviewMode) => void;
  lastCommitDomain: CommitDomain;
  setLastCommitDomain: (domain: CommitDomain) => void;
  forge3EditTarget: Forge3EditTarget;
  setForge3EditTarget: (target: Forge3EditTarget) => void;

  // Playback
  basisHearingTransportBridge: BasisHearingTransportBridgeState;
  setBasisHearingTransportBridge: (
    patch:
      | Partial<BasisHearingTransportBridgeState>
      | ((state: BasisHearingTransportBridgeState) => Partial<BasisHearingTransportBridgeState>)
  ) => void;
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
  resetForgeMainPath: () => void;

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
  stampPhase: StampPhase;
  setStampData: (data: StampData | null) => void;
  setStampScale: (scaleX: number, scaleY?: number) => void;
  adjustStampScale: (dx: number, dy: number) => void;
  rotateStamp: (deltaRadians: number) => void;
  setStampRotation: (rotationRadians: number) => void;
  toggleStampFlipX: () => void;
  toggleStampFlipY: () => void;
  resetStampTransform: () => void;
  setStampPhase: (phase: StampPhase) => void;

  // Stamp selection rect
  stampSelStart: { x: number; y: number } | null;
  setStampSelStart: (pos: { x: number; y: number } | null) => void;

  // Harmonizer
  applyHarmonizer: (type: HarmonizerType, params?: Record<string, number>) => void;

  // Audio buffer dirty flag
  audioBufferDirty: boolean;
  setAudioBufferDirty: (dirty: boolean) => void;
}
