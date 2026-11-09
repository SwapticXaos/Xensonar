import { ensureLocalFieldState } from './localField';
import type {
  CanonicalDrumComputerState,
  CanonicalLoopComposerState,
} from './sessionTypes';
import type { DrumLaneKitOverrides } from '../../xensonar/groove/drumKitRoutingTypes';
import type { DrumLaneSettingsMap } from '../../xensonar/groove/drumLaneSettings';
import type { DrumKit, DrumPattern } from '../../xensonar/domain/instrumentData';

export type { LoopTrackInstrumentPreset } from './melodicSoundRegistry';

export type PreviewRequest = {
  composer: CanonicalLoopComposerState;
  bpm: number;
  bars: number;
  trackIds: string[];
  noteId?: string | null;
  drumPattern?: DrumPattern;
  drumKit?: DrumKit;
  drumLevel?: number;
  customDrumPattern?: CanonicalDrumComputerState | null;
  drumLaneKitOverrides?: DrumLaneKitOverrides;
  drumLaneSettings?: DrumLaneSettingsMap;
  drumSegmentsPerBar?: number;
  drumSegmentMarkers?: number[];
  onPlayhead?: (stepFloat: number | null) => void;
  onComposerPlayhead?: (stepFloat: number | null) => void;
  onGlobalPlayheadRatio?: (ratio: number | null) => void;
  onEnded?: () => void;
  loop?: boolean;
};

export type LiveNode = OscillatorNode | GainNode | BiquadFilterNode | StereoPannerNode | AudioBufferSourceNode;

export type InstrumentOscDef = {
  type: OscillatorType;
  gain: number;
  detune?: number;
  freqMul?: number;
  startOffsetSec?: number;
  durationMul?: number;
};

export type InstrumentVoiceDef = {
  oscillators: InstrumentOscDef[];
  filterType?: BiquadFilterType;
  filterFrequency?: number;
  filterQ?: number;
  attackScale: number;
  releaseScale: number;
  transientGain: number;
  panSpread: number;
  octaveBias?: number;
};

export type LocalFieldState = ReturnType<typeof ensureLocalFieldState>;

export type SamplePlaybackDef = {
  kind: 'sample';
  sampleId: string;
  baseHz: number | null;
  baseHzSource: 'estimated' | 'manual' | null;
  tempoPitchLinked: boolean;
  playbackDurationSec: number | null;
  volumeEnvelope: LocalFieldState | null;
  pitchEnvelope: LocalFieldState | null;
  buffer: AudioBuffer;
};

export type ResolvedInstrumentDef =
  | { kind: 'synth'; presetId: string; voice: InstrumentVoiceDef }
  | SamplePlaybackDef;

export type SchedulingContext = AudioContext | OfflineAudioContext;
export type NodeRegistrar = ((node: LiveNode) => void) | null;

export type MaterialElasticPitchInfo = {
  targetHz: number;
  anchorHz: number;
  desiredRate: number;
  playbackRate: number;
  elasticRate: number;
  effectiveHz: number;
  saturated: boolean;
};
