import {
  STABLE_MUSIC_LANE_SCHEMA_VERSION,
  type StableBassNote,
  type StableBeatHit,
  type StableMusicLaneSnapshot,
} from './stableMusicLaneContracts';
import { buildStationaryRhythmPatternSnapshot } from './stationaryRhythmPatternSnapshotBridge';

type StableMusicLaneUiState = {
  drumActive: boolean;
  drumPattern: string;
  drumVolume: number;
  bassActive: boolean;
  bassPattern: string;
  bassPatternMode: string;
  bassVolume: number;
  bassRootMode: string;
  bassRootHz: number;
  materialLoopActive: boolean;
  materialLoopId: string;
  materialLoopVolume: number;
  materialLoopTimeMode: string;
  rootFollowLoopActive: boolean;
  rootFollowLoopId: string;
  rootFollowLoopVolume: number;
  rootFollowLoopGranulationMode: string;
  gridBase: number;
};

export type StableMusicLaneSnapshotInput = {
  ui: StableMusicLaneUiState;
  tempoBpm: number;
  getCurrentRootFollowAnchorHz: () => number;
  getCurrentRootFollowInputHz: () => number;
  rootFollowVoiceEngineMode: string;
  selectedMaterialId?: string | null;
  selectedMaterialRootHz?: number | null;
  selectedRootFollowLoopId?: string | null;
};

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const finiteOr = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);

const makeBeatHits = (
  active: boolean,
  patternId: string,
  volume: number,
  bpm: number,
  rootHz: number,
): StableBeatHit[] => {
  if (!active) return [];
  const stationary = buildStationaryRhythmPatternSnapshot({
    generation: stableMusicLaneSnapshotGeneration + 1,
    patternVersion: stableMusicLaneSnapshotGeneration + 1,
    bpm,
    bars: 1,
    beatsPerBar: 4,
    stepsPerBar: 16,
    drumActive: true,
    bassActive: false,
    drumPattern: patternId,
    bassPattern: 'offbeat',
    bassRootHz: rootHz,
    drumVolume: volume,
    bassVolume: 0,
    audibleMinimalVoices: true,
    shadowOnly: false,
  });
  const hits: StableBeatHit[] = [];
  for (const hit of stationary.hits) {
    if (hit.lane !== 'kick' && hit.lane !== 'snare' && hit.lane !== 'hat') continue;
    hits.push({
      step: hit.step,
      lane: hit.lane,
      velocity: clamp(finiteOr(hit.velocity, 0), 0, 1.5),
    });
  }
  return hits;
};

const makeBassNotes = (active: boolean, rootHz: number, patternId: string): StableBassNote[] => {
  if (!active) return [];
  const safeRoot = clamp(rootHz, 16, 2000);
  const fractured = patternId.includes('fractured');
  return [
    { step: 0, lengthSteps: fractured ? 2.5 : 3, pitchHz: safeRoot, velocity: 0.8, slideToHz: safeRoot * 1.125 },
    { step: 6, lengthSteps: 1.75, pitchHz: safeRoot * 0.75, velocity: 0.58 },
    { step: 10, lengthSteps: 2.25, pitchHz: safeRoot * 1.25, velocity: 0.62 },
  ];
};

let stableMusicLaneSnapshotGeneration = 0;

export const buildStableMusicLaneSnapshot = ({
  ui,
  tempoBpm,
  getCurrentRootFollowAnchorHz,
  getCurrentRootFollowInputHz,
  rootFollowVoiceEngineMode,
  selectedMaterialId,
  selectedMaterialRootHz,
  selectedRootFollowLoopId,
}: StableMusicLaneSnapshotInput): StableMusicLaneSnapshot => {
  const generation = ++stableMusicLaneSnapshotGeneration;
  const bpm = clamp(finiteOr(tempoBpm, 108), 12, 360);
  const requestedAtMs = nowMs();
  const gridBaseHz = clamp(finiteOr(ui.gridBase, 440), 1, 20000);
  const bassRootHz = ui.bassRootMode === 'fixed'
    ? clamp(finiteOr(ui.bassRootHz, gridBaseHz / 8), 16, 2000)
    : clamp(gridBaseHz / 8, 16, 2000);
  const anchorHz = clamp(finiteOr(getCurrentRootFollowAnchorHz(), gridBaseHz / 2), 1, 20000);
  const targetHz = clamp(finiteOr(getCurrentRootFollowInputHz(), anchorHz), 1, 20000);
  const materialRootHz = clamp(finiteOr(selectedMaterialRootHz ?? anchorHz, anchorHz), 1, 20000);

  return {
    schemaVersion: STABLE_MUSIC_LANE_SCHEMA_VERSION,
    generation,
    mode: 'speaker-probe',
    intent: 'rfl-amplified-wavestarter-burst-threshold-decoupling',
    transport: {
      schemaVersion: STABLE_MUSIC_LANE_SCHEMA_VERSION,
      generation,
      bpm,
      beatsPerBar: 4,
      stepsPerBar: 16,
      audioNowSec: 0,
      barIndex: 0,
      stepIndex: 0,
      phase01: 0,
      gridBaseHz,
      requestedAtMs,
    },
    lanes: [
      {
        lane: 'beat',
        active: !!ui.drumActive,
        patternId: ui.drumPattern || 'unknown',
        volume: clamp(finiteOr(ui.drumVolume, 0.5), 0, 1),
        stepsPerBar: 16,
        hits: makeBeatHits(!!ui.drumActive, ui.drumPattern || '', clamp(finiteOr(ui.drumVolume, 0.5), 0, 1), bpm, gridBaseHz / 8),
      },
      {
        lane: 'bass',
        active: !!ui.bassActive,
        patternId: ui.bassPatternMode === 'clip' ? 'clip-shadow' : (ui.bassPattern || 'unknown'),
        volume: clamp(finiteOr(ui.bassVolume, 0.1), 0, 1),
        rootHz: bassRootHz,
        stepsPerBar: 16,
        notes: makeBassNotes(!!ui.bassActive, bassRootHz, ui.bassPattern || ''),
      },
      {
        lane: 'material',
        active: !!ui.materialLoopActive,
        materialEntryId: selectedMaterialId ?? ui.materialLoopId ?? null,
        rootHz: materialRootHz,
        volume: clamp(finiteOr(ui.materialLoopVolume, 0.22), 0, 1),
        timeMode: ui.materialLoopTimeMode || 'normal',
        bufferToken: null,
      },
      {
        lane: 'rootFollow',
        active: !!ui.rootFollowLoopActive,
        loopId: selectedRootFollowLoopId ?? ui.rootFollowLoopId ?? null,
        anchorHz,
        targetHz,
        voiceEngineMode: rootFollowVoiceEngineMode,
        granulationMode: ui.rootFollowLoopGranulationMode || 'flowing',
        freezeIfControlStale: true,
      },
    ],
  };
};
