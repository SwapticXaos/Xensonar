import { getStaticDrumStepTriggers, isRhythmForgeDrumPattern, freezeRhythmForgeDrumPatternMatrix } from '../drumPatternMachine';
import type { BassPattern, DrumPattern } from '../domain/instrumentData';
import { buildBassPatternPreviewClip, resolveBassEventFrequencyHz } from '../groove/bassPatternEvents';
import {
  STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION,
  type StationaryRhythmHitLane,
  type StationaryRhythmPatternHit,
  type StationaryRhythmPatternSnapshot,
} from './stationaryRhythmWorkletLaneContracts';

export type StationaryRhythmPatternSnapshotInput = {
  generation: number;
  patternVersion: number;
  bpm: number;
  bars?: number;
  beatsPerBar?: number;
  stepsPerBar?: number;
  drumActive?: boolean;
  bassActive?: boolean;
  drumPattern?: DrumPattern | string;
  bassPattern?: BassPattern | string;
  bassRootHz?: number;
  drumVolume?: number;
  bassVolume?: number;
  audibleMinimalVoices?: boolean;
  shadowOnly?: boolean;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

const DRUM_LANE_TO_STATIONARY_LANE: Record<string, StationaryRhythmHitLane> = {
  kick: 'kick',
  snare: 'snare',
  clap: 'snare',
  hatClosed: 'hat',
  hatOpen: 'hat',
  perc: 'hat',
};

const pushHit = (
  hits: StationaryRhythmPatternHit[],
  hit: StationaryRhythmPatternHit,
  maxHits = 256,
) => {
  if (hits.length >= maxHits) return;
  hits.push({
    ...hit,
    step: Math.max(0, Math.floor(hit.step)),
    velocity: clamp(hit.velocity, 0, 1.5),
    accent: hit.accent === undefined ? undefined : clamp(hit.accent, 0, 1.5),
    lengthSteps: hit.lengthSteps === undefined ? undefined : clamp(hit.lengthSteps, 0.05, 32),
    pitchHz: hit.pitchHz === undefined ? undefined : clamp(hit.pitchHz, 16, 8000),
  });
};

function appendDrumHits(args: {
  hits: StationaryRhythmPatternHit[];
  pattern: string;
  bars: number;
  stepsPerBar: number;
  level: number;
  rootHz: number;
}) {
  const pattern = args.pattern as DrumPattern;
  const level = clamp(args.level, 0, 1.5);
  if (isRhythmForgeDrumPattern(pattern)) {
    const matrix = freezeRhythmForgeDrumPatternMatrix({
      pattern,
      bars: args.bars,
      segmentsPerBar: args.stepsPerBar,
      rootHz: args.rootHz,
    });
    for (const laneId of matrix.laneOrder) {
      const lane = DRUM_LANE_TO_STATIONARY_LANE[laneId];
      if (!lane) continue;
      const values = matrix.laneSteps[laneId] ?? [];
      for (let step = 0; step < values.length; step += 1) {
        const intensity = values[step] ?? 0;
        if (intensity <= 0.02) continue;
        pushHit(args.hits, {
          step,
          lane,
          velocity: intensity * level,
          accent: intensity,
          soundToken: `rhythmforge:${laneId}`,
        });
      }
    }
    return;
  }
  for (let bar = 0; bar < args.bars; bar += 1) {
    const barOffset = bar * args.stepsPerBar;
    for (let legacyStep = 0; legacyStep < 16; legacyStep += 1) {
      const mappedStep = Math.round((legacyStep / 16) * args.stepsPerBar);
      for (const trigger of getStaticDrumStepTriggers(pattern, legacyStep)) {
        const lane = DRUM_LANE_TO_STATIONARY_LANE[trigger.laneId];
        if (!lane) continue;
        pushHit(args.hits, {
          step: barOffset + mappedStep,
          lane,
          velocity: trigger.intensity * level * (trigger.levelMultiplier ?? 1),
          accent: trigger.intensity,
          soundToken: `static:${trigger.laneId}`,
        });
      }
    }
  }
}

function appendBassHits(args: {
  hits: StationaryRhythmPatternHit[];
  pattern: string;
  bars: number;
  stepsPerBar: number;
  rootHz: number;
  level: number;
}) {
  const rootHz = clamp(args.rootHz, 20, 400);
  const level = clamp(args.level, 0, 1.5);
  for (let bar = 0; bar < args.bars; bar += 1) {
    const clip = buildBassPatternPreviewClip({
      pattern: args.pattern,
      rootHz,
      barIndex: bar,
      seed: 0x51b3,
    });
    const stepScale = args.stepsPerBar / Math.max(1, clip.stepsPerBar || clip.stepCount || 16);
    for (const event of clip.events) {
      const step = bar * args.stepsPerBar + Math.round(event.startStep * stepScale);
      pushHit(args.hits, {
        step,
        lane: 'bass',
        velocity: event.velocity * level,
        accent: event.accent,
        lengthSteps: Math.max(0.2, event.durationSteps * stepScale),
        pitchHz: resolveBassEventFrequencyHz(event, rootHz),
        soundToken: `bass:${args.pattern}`,
      });
    }
  }
}

export function buildStationaryRhythmPatternSnapshot(
  input: StationaryRhythmPatternSnapshotInput,
): StationaryRhythmPatternSnapshot {
  const bars = Math.round(clamp(input.bars ?? 1, 1, 8));
  const beatsPerBar = Math.round(clamp(input.beatsPerBar ?? 4, 1, 16));
  const stepsPerBar = Math.round(clamp(input.stepsPerBar ?? 16, 1, 128));
  const rootHz = clamp(input.bassRootHz ?? 55, 20, 400);
  const hits: StationaryRhythmPatternHit[] = [];
  if (input.drumActive && input.drumPattern) {
    appendDrumHits({
      hits,
      pattern: input.drumPattern,
      bars,
      stepsPerBar,
      level: input.drumVolume ?? 0.72,
      rootHz,
    });
  }
  if (input.bassActive && input.bassPattern) {
    appendBassHits({
      hits,
      pattern: input.bassPattern,
      bars,
      stepsPerBar,
      rootHz,
      level: input.bassVolume ?? 0.68,
    });
  }
  return {
    type: 'stationary-rhythm-pattern-snapshot',
    schemaVersion: STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION,
    generation: Math.max(0, Math.round(input.generation)),
    patternVersion: Math.max(1, Math.round(input.patternVersion)),
    bpm: clamp(input.bpm, 12, 360),
    bars,
    beatsPerBar,
    stepsPerBar,
    transportPolicy: 'switch-next-bar',
    hits,
    audibleMinimalVoices: input.audibleMinimalVoices !== false,
    shadowOnly: input.shadowOnly !== false,
    requestedAtMs: typeof performance !== 'undefined' ? performance.now() : Date.now(),
  };
}
