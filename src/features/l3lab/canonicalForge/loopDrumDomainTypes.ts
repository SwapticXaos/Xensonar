import type { ImageImportFitMode, ImageImportReadMode } from '../spectralForge/audio/ImageImporter';
import type { CanonicalLoopComposerRepetitionModel, CanonicalLoopComposerTuning } from './sessionTypes';
import type { LoopTrackInstrumentPreset } from './melodicSoundRegistry';
import type { DrumLaneKitOverrides } from '../../xensonar/groove/drumKitRoutingTypes';
import type { DrumLaneSettingsMap } from '../../xensonar/groove/drumLaneSettings';
import type { DrumStepProgramMap } from './drumProgram';
import type { LocalFieldModuleState } from './localField';
import type { RootFollowCarrierTimbreSnapshot } from '../../xensonar/rootFollow/rootFollowTypes';
import type { RootFollowSpectralWindowMeta } from '../../xensonar/rootFollow/rootFollowSpectralWindowMeta';
import type { CarrierIntegralPinkVariant } from '../contracts/carrierIntegralPinkExportContract';
export type { CarrierIntegralPinkVariant } from '../contracts/carrierIntegralPinkExportContract';

export type GrooveMachineConfig = {
  drumPattern: string;
  drumKit: string;
  bassPattern: string;
  barsInterpretation: number;
  showGrid: boolean;
  drumLaneKitOverrides: DrumLaneKitOverrides;
  drumLaneSettings: DrumLaneSettingsMap;
};

export type DrumVoiceId = 'kick' | 'snare' | 'hatClosed' | 'hatOpen' | 'clap' | 'perc';

export type DrumComputerState = {
  useCustom: boolean;
  presetSource: string;
  bars: number;
  segmentsPerBar: number;
  segmentMarkers: number[];
  stepCount: number;
  laneOrder: DrumVoiceId[];
  laneSteps: Record<DrumVoiceId, number[]>;
  stepPrograms?: DrumStepProgramMap;
};

export type DrumViewportState = {
  startRatio: number;
  endRatio: number;
};

export type LoopAutocorrectSuggestion = {
  bpm: number;
  confidence: number;
  startSec: number;
  durationSec: number;
  bars: number;
  candidates: { bars: number; durationSec: number; fitScore: number }[];
};

export type StampPhase = 'idle' | 'selecting' | 'stamping';

export type LoopPitchStep = {
  id: string;
  label: string;
  ratio: number;
  cents: number;
  offsetCents: number;
  muted: boolean;
};

export type LoopTrackPatternPreset = 'patternA' | 'patternB' | 'patternC';
export type LoopCompositionPreset = 'jazz' | 'classical' | 'oriental';

export type LoopTrack = {
  id: string;
  label: string;
  color: string;
  volume: number;
  instrumentRole: 'bass' | 'companion' | 'aux' | 'texture';
  instrumentPreset?: LoopTrackInstrumentPreset;
  patternPresetId?: LoopTrackPatternPreset;
  pan?: number;
  enabled: boolean;
};

export type LoopPitchLine = {
  id: string;
  label: string;
  hz: number;
  ratio: number;
  cents: number;
  offsetCents: number;
  muted: boolean;
  presetIndex: number;
};

export type LoopTimeGuideMarker = {
  id: string;
  beat: number;
  kind: 'bar' | 'guide';
  repeatPerBar: boolean;
  locked: boolean;
  muted?: boolean;
};

export type LoopNoteRenderSourceKind = 'synth-live' | 'synth-frozen-sample' | 'material-import' | 'sample-block';
export type LoopMaterialPitchMode = 'grid-elastic' | 'source-fixed' | 'source-granular' | 'supernote-relative';


export type CarrierIntegralFieldVoiceEvent = {
  id: string;
  voiceId: string;
  trackId: string;
  startRatio: number;
  durationRatio: number;
  relativeSemitones: number;
  velocity: number;
  gate: number;
  pan: number;
  /** Source track energy from the Carrier/Root-Follow plan. Kept separate from the pink track's global volume. */
  trackVolume?: number;
  /** Original source voice frequency before pink-grid anchoring. This is provenance, not a target raster line. */
  sourceLineHz?: number | null;
  /** Fretless per-voice body motion: glissando, vibrato and dynamic field data must survive the pink clip. */
  localField?: LocalFieldModuleState | null;
  /** Branch-specific window/body metadata retained for future granular/render parity. */
  spectralWindowMeta?: RootFollowSpectralWindowMeta | null;
  instrumentPresetOverride?: LoopTrackInstrumentPreset | null;
};

export type CarrierIntegralFieldClip = {
  schemaVersion: 'carrier-integral-field-v1';
  variant: CarrierIntegralPinkVariant;
  label: string;
  sourceMachineId?: string | null;
  sourcePrism?: string | null;
  sourceBaseHz: number;
  sourceBars: number;
  sourceBeatsPerBar: number;
  totalBeats: number;
  voices: CarrierIntegralFieldVoiceEvent[];
};

export type LoopNoteEvent = {
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
  stepId?: string;
  startStep?: number;
  lengthSteps?: number;
  fadeInSteps?: number;
  fadeOutSteps?: number;
  noteClass?: 'standard' | 'material-base' | 'material-fragment' | 'carrier-field' | 'carrier-fragment';
  renderSourceKind?: LoopNoteRenderSourceKind | null;
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
  materialPitchMode?: LoopMaterialPitchMode | null;
  instrumentPresetOverride?: LoopTrackInstrumentPreset | null;
  localField?: LocalFieldModuleState | null;
  carrierIntegralTimbre?: RootFollowCarrierTimbreSnapshot | null;
  carrierIntegralField?: CarrierIntegralFieldClip | null;
};

export type LoopGhostNote = {
  trackId: string;
  channelIndex: number;
  lineId?: string;
  startUnit: number;
  durationUnits: number;
};

export type LoopNoteSelectionBox = {
  startUnit: number;
  endUnit: number;
  startChannelIndex: number;
  endChannelIndex: number;
};

export type ChordVoicing = 'triad' | 'quartal' | 'cluster' | 'open5';

export type PendingImageImport = {
  file: File;
  image: HTMLImageElement;
  fitMode: ImageImportFitMode;
  shiftX: number;
  shiftY: number;
  contrast: number;
  readMode: ImageImportReadMode;
};

export type LoopComposerState = {
  pitchSteps: LoopPitchStep[];
  pitchLines: LoopPitchLine[];
  timeGuideMarkers: LoopTimeGuideMarker[];
  tracks: LoopTrack[];
  notes: LoopNoteEvent[];
  selectedTrackId: string;
  selectedNoteId: string | null;
  compositionPresetId: LoopCompositionPreset;
  tuning: CanonicalLoopComposerTuning;
  repetitionModel: CanonicalLoopComposerRepetitionModel;
  baseHz: number;
  beatsPerBar: number;
  stepsPerBar: number;
  segmentCount: number;
  bars: number;
  zoom: number;
  scrollX: number;
  zoomY: number;
  scrollY: number;
  activeTrackIds: string[];
};

export type LoopComposerHydrationState = Omit<
  LoopComposerState,
  'pitchLines' | 'timeGuideMarkers' | 'compositionPresetId' | 'repetitionModel' | 'beatsPerBar' | 'segmentCount' | 'zoomY' | 'scrollY'
> &
  Partial<
    Pick<
      LoopComposerState,
      'pitchLines' | 'timeGuideMarkers' | 'compositionPresetId' | 'repetitionModel' | 'beatsPerBar' | 'segmentCount' | 'zoomY' | 'scrollY'
    >
  >;

export type DrumComputerHydrationState = Omit<DrumComputerState, 'segmentsPerBar' | 'segmentMarkers'> &
  Partial<Pick<DrumComputerState, 'segmentsPerBar' | 'segmentMarkers'>>;
