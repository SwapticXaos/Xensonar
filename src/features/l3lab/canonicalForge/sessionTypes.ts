import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporterTypes';
import type { DrumLaneKitOverrides } from '../../xensonar/groove/drumKitRoutingTypes';
import type { DrumLaneSettingsMap } from '../../xensonar/groove/drumLaneSettings';
import type { StampData, MorphMode } from '../spectralForge/audio/SpectralData';
import type { DrumStepProgramMap } from './drumProgram';
import type { CanonicalAnalysisBundle, CanonicalSourceView } from './analysis';
import type { LocalFieldModuleState } from './localField';
import type { RootFollowCarrierTimbreSnapshot } from '../../xensonar/rootFollow/rootFollowTypes';
import type { RootFollowSpectralWindowMeta } from '../../xensonar/rootFollow/rootFollowSpectralWindowMeta';


export type CanonicalCarrierIntegralFieldVoiceEvent = {
  id: string;
  voiceId: string;
  trackId: string;
  startRatio: number;
  durationRatio: number;
  relativeSemitones: number;
  velocity: number;
  gate: number;
  pan: number;
  trackVolume?: number;
  sourceLineHz?: number | null;
  localField?: LocalFieldModuleState | null;
  spectralWindowMeta?: RootFollowSpectralWindowMeta | null;
  instrumentPresetOverride?: string | null;
};

export type CanonicalCarrierIntegralFieldClip = {
  schemaVersion: 'carrier-integral-field-v1';
  variant: 'last-hearing' | 'grained' | 'scattered' | 'monotone';
  label: string;
  sourceMachineId?: string | null;
  sourcePrism?: string | null;
  sourceBaseHz: number;
  sourceBars: number;
  sourceBeatsPerBar: number;
  totalBeats: number;
  voices: CanonicalCarrierIntegralFieldVoiceEvent[];
};

export type CanonicalTool = 'brush' | 'smudge' | 'morph' | 'sourceTrace' | 'harmonicLift' | 'transientLift' | 'noiseGate' | 'dodgeBurn' | 'blurSharpen' | 'delaySmear' | 'threshold' | 'stamp';
export type CanonicalSynthMode = 'additive' | 'ifft' | 'granular' | 'glyph';
export type CanonicalMaterialRole = 'loop' | 'waveMaterial' | 'particleExciter' | 'droneTexture';
export type CanonicalSourcePreviewMode = 'forge' | 'sourceWindow' | 'sourceFull';
export type CanonicalForgeWorkspace = 'wave-material' | 'microtonal-logic';
export type CanonicalLogicView = 'drums' | 'melodic';
/** Product-facing alias for the legacy CanonicalForge workspace id. */
export type SyntheticForgeWorkspace = CanonicalForgeWorkspace;
/** Product-facing alias for Drum Machine / Melodic Loop selection. */
export type SyntheticForgeLogicView = CanonicalLogicView;
export type CanonicalTransferMode = 'forge-render' | 'source-direct';

export type CanonicalMaterialExportConfig = {
  name: string;
  role: CanonicalMaterialRole;
  adapterId: string;
  bpm: number;
  bars: number;
  guideSegments: number;
  guideMarkers: number[];
  beatGuideAudible: boolean;
  beatGuideVolume: number;
  loopPreview: boolean;
  transferMode?: CanonicalTransferMode;
  rootFollowPreferred?: boolean;
};

export type WaveformMix = {
  sine: number;
  sawtooth: number;
  square: number;
  triangle: number;
};

export type CanonicalToolSettings = {
  brushSize: number;
  intensity: number;
  hardness: number;
  eraseMode: boolean;
  morphMode: MorphMode;
};



export type CanonicalLoopPitchStep = {
  id: string;
  label: string;
  ratio: number;
  cents: number;
  offsetCents: number;
  muted: boolean;
};

export type CanonicalLoopPitchLine = {
  id: string;
  label: string;
  hz: number;
  ratio: number;
  cents: number;
  offsetCents: number;
  muted: boolean;
  presetIndex: number;
};

export type CanonicalLoopTimeGuideMarker = {
  id: string;
  beat: number;
  kind: 'bar' | 'guide';
  repeatPerBar: boolean;
  locked: boolean;
};

export type CanonicalLoopTrack = {
  id: string;
  label: string;
  color: string;
  volume: number;
  instrumentRole: 'bass' | 'companion' | 'aux' | 'texture';
  instrumentPreset?: string;
  patternPresetId?: 'patternA' | 'patternB' | 'patternC';
  pan?: number;
  enabled: boolean;
};

export type CanonicalLoopNoteRenderSourceKind = 'synth-live' | 'synth-frozen-sample' | 'material-import' | 'sample-block';

export type CanonicalLoopNoteEvent = {
  id: string;
  trackId: string;
  channelIndex: number;
  lineId?: string;
  octaveOffset: number;
  startUnit: number;
  durationUnits: number;
  startBeat?: number;
  endBeat?: number;
  fadeInUnits: number;
  fadeOutUnits: number;
  velocity: number;
  // legacy compatibility
  stepId?: string;
  startStep?: number;
  lengthSteps?: number;
  fadeInSteps?: number;
  fadeOutSteps?: number;
  noteClass?: 'standard' | 'material-base' | 'material-fragment' | 'carrier-field' | 'carrier-fragment';
  renderSourceKind?: CanonicalLoopNoteRenderSourceKind | null;
  fragmentIndex?: number;
  fragmentCount?: number;
  fragmentGroupId?: string | null;
  sourceMaterialId?: string | null;
  anchorHz?: number | null;
  sourceTempoBpm?: number | null;
  sourceLoopDurationSec?: number | null;
  sampleOffsetSec?: number | null;
  samplePlaybackDurationSec?: number | null;
  pendingPitchAnchor?: boolean;
  materialPitchMode?: 'grid-elastic' | 'source-fixed' | 'source-granular' | 'supernote-relative' | null;
  instrumentPresetOverride?: string | null;
  localField?: LocalFieldModuleState | null;
  carrierIntegralTimbre?: RootFollowCarrierTimbreSnapshot | null;
  carrierIntegralField?: CanonicalCarrierIntegralFieldClip | null;
};

export type CanonicalLoopComposerTuning = import("../../xensonar/domain/gridTuningTypes").GridTuning;

export type CanonicalLoopComposerRepetitionModel = 'octave' | 'tritave';

export type CanonicalLoopCompositionPreset = 'jazz' | 'classical' | 'oriental';

export type CanonicalLoopComposerState = {
  pitchSteps: CanonicalLoopPitchStep[];
  pitchLines: CanonicalLoopPitchLine[];
  timeGuideMarkers: CanonicalLoopTimeGuideMarker[];
  tracks: CanonicalLoopTrack[];
  notes: CanonicalLoopNoteEvent[];
  selectedTrackId: string;
  selectedNoteId: string | null;
  compositionPresetId?: CanonicalLoopCompositionPreset;
  tuning: CanonicalLoopComposerTuning;
  repetitionModel: CanonicalLoopComposerRepetitionModel;
  baseHz: number;
  beatsPerBar: number;
  stepsPerBar: number;
  bars: number;
  zoom: number;
  scrollX: number;
  activeTrackIds: string[];
};

export type CanonicalDrumVoiceId = 'kick' | 'snare' | 'hatClosed' | 'hatOpen' | 'clap' | 'perc';

export type CanonicalDrumComputerState = {
  useCustom: boolean;
  presetSource: string;
  bars: number;
  segmentsPerBar: number;
  segmentMarkers: number[];
  stepCount: number;
  laneOrder: CanonicalDrumVoiceId[];
  laneSteps: Record<CanonicalDrumVoiceId, number[]>;
  stepPrograms?: DrumStepProgramMap;
};

export type CanonicalDrumViewportState = {
  startRatio: number;
  endRatio: number;
};

export type CanonicalForgeSessionState = {
  materialExport: CanonicalMaterialExportConfig;
  rawSourceAsset: AudioSourceAsset | null;
  sourceAsset: AudioSourceAsset | null;
  bundle: CanonicalAnalysisBundle | null;
  spectralSnapshot: Float32Array | null;
  sourceView: CanonicalSourceView;
  secondaryView: CanonicalSourceView | 'none';
  viewBlend: number;
  activeTool: CanonicalTool;
  toolSettings: CanonicalToolSettings;
  synthMode: CanonicalSynthMode;
  waveformMix: WaveformMix;
  status: string;
  stampPresetId: string;
  stampData: StampData | null;
  stampScaleX: number;
  stampScaleY: number;
  stampRotation: number;
  stampFlipX: boolean;
  stampFlipY: boolean;
  selectionStartSec: number;
  selectionDurationSec: number;
  selectionDirty: boolean;
  detailSelectionStartSec?: number;
  detailSelectionDurationSec?: number;
  detailSelectionDirty?: boolean;
  detailViewportStartSec?: number;
  detailViewportDurationSec?: number;
  detailZoom: number;
  detailOffset: number;
  auditionView?: CanonicalSourceView | 'none';
  auditionBlendAmount?: number;
  selectedProjectId: string | null;
  sourcePreviewMode: CanonicalSourcePreviewMode;
  activeWorkspace?: CanonicalForgeWorkspace;
  logicView?: CanonicalLogicView;
  grooveMachine: {
    drumPattern: string;
    drumKit: string;
    bassPattern: string;
    barsInterpretation: number;
    showGrid: boolean;
    drumLaneKitOverrides: DrumLaneKitOverrides;
    drumLaneSettings: DrumLaneSettingsMap;
  };
  drumComputer?: CanonicalDrumComputerState;
  drumViewport?: CanonicalDrumViewportState;
  loopComposer: CanonicalLoopComposerState;
  selectedLoopNoteIds?: string[];
  autoZoomOnDenseOverlap?: boolean;
  lockTrackEditing?: boolean;
  chordVoicing?: 'triad' | 'quartal' | 'cluster' | 'open5';
  chordStrumSteps?: number;
  chordVelocitySlope?: number;
};
