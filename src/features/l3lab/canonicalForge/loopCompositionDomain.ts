import type { CanonicalLoopComposerRepetitionModel, CanonicalLoopComposerTuning } from './sessionTypes';
import type { LoopTrackInstrumentPreset } from './melodicSoundRegistry';
import {
  canonicalLoopNoteOctaveOffset,
  composerChannelCount,
  hydrateLoopNoteEvent,
  noteStartUnit,
  totalLoopUnits,
} from './loopGridKernel';
import type {
  ChordVoicing,
  LoopCompositionPreset,
  LoopComposerState,
  LoopGhostNote,
  LoopNoteEvent,
  LoopTrack,
  LoopTrackPatternPreset,
} from './loopDrumDomainTypes';

export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

type LoopCompositionPresetMeta = {
  id: LoopCompositionPreset;
  label: string;
  tuning: CanonicalLoopComposerTuning;
  baseHz: number;
  rootLabel: string;
  repetitionModel?: CanonicalLoopComposerRepetitionModel;
  instrumentPresets: Record<string, LoopTrackInstrumentPreset>;
  defaultTrackPatterns: Record<string, LoopTrackPatternPreset>;
};

type CompositionPhraseStep = [number, number, number, number?];

export const LOOP_COMPOSITION_PRESETS: Record<LoopCompositionPreset, LoopCompositionPresetMeta> = {
  jazz: {
    id: 'jazz',
    label: 'Pulsbogen',
    tuning: '12edo',
    baseHz: 220,
    rootLabel: 'A',
    repetitionModel: 'octave',
    instrumentPresets: { bass: 'drone:dark_sub', companion: 'wave:reed_sigh', aux: 'particle:chime', texture: 'drone:fjord_tape' },
    defaultTrackPatterns: { bass: 'patternA', companion: 'patternB', aux: 'patternC', texture: 'patternA' },
  },
  classical: {
    id: 'classical',
    label: 'Ji Halo',
    tuning: 'ji',
    baseHz: 196,
    rootLabel: 'G',
    repetitionModel: 'octave',
    instrumentPresets: { bass: 'drone:cello', companion: 'resident:resonance_pipe', aux: 'particle:kalimba', texture: 'drone:vocal_choir' },
    defaultTrackPatterns: { bass: 'patternA', companion: 'patternC', aux: 'patternB', texture: 'patternA' },
  },
  oriental: {
    id: 'oriental',
    label: 'Orient',
    tuning: 'maqam',
    baseHz: 293.66,
    rootLabel: 'D',
    repetitionModel: 'octave',
    instrumentPresets: { bass: 'subPulse', companion: 'airPluck', aux: 'metalBloom', texture: 'bowGlass' },
    defaultTrackPatterns: { bass: 'patternA', companion: 'patternC', aux: 'patternB', texture: 'patternA' },
  },
};

export function getLoopCompositionPresetMeta(presetId: LoopCompositionPreset | undefined): LoopCompositionPresetMeta {
  return LOOP_COMPOSITION_PRESETS[presetId ?? 'jazz'] ?? LOOP_COMPOSITION_PRESETS.jazz;
}

export function defaultLoopTrackLabel(trackId: string, index = 0) {
  if (trackId === 'bass') return 'Instrument 1';
  if (trackId === 'companion') return 'Instrument 2';
  if (trackId === 'aux') return 'Instrument 3';
  if (trackId === 'texture') return 'Instrument 4';
  return `Instrument ${index + 1}`;
}

export const DEFAULT_LOOP_TRACKS: LoopTrack[] = [
  { id: 'bass', label: defaultLoopTrackLabel('bass', 0), color: '#38bdf8', volume: 0.9, instrumentRole: 'bass', instrumentPreset: 'subPulse', patternPresetId: 'patternA', pan: -0.08, enabled: true },
  { id: 'companion', label: defaultLoopTrackLabel('companion', 1), color: '#c084fc', volume: 0.72, instrumentRole: 'companion', instrumentPreset: 'reedTone', patternPresetId: 'patternB', pan: 0.06, enabled: true },
  { id: 'aux', label: defaultLoopTrackLabel('aux', 2), color: '#f59e0b', volume: 0.65, instrumentRole: 'aux', instrumentPreset: 'airPluck', patternPresetId: 'patternC', pan: 0.12, enabled: true },
  { id: 'texture', label: defaultLoopTrackLabel('texture', 3), color: '#34d399', volume: 0.62, instrumentRole: 'texture', instrumentPreset: 'glassPad', patternPresetId: 'patternB', pan: -0.16, enabled: true },
];

export function totalComposerSteps(state: LoopComposerState) {
  return totalLoopUnits(state);
}

export function chordIntervalsForVoicing(voicing: ChordVoicing) {
  if (voicing === 'quartal') return [0, 3, 6];
  if (voicing === 'cluster') return [0, 1, 2, 4];
  if (voicing === 'open5') return [0, 4, 8];
  return [0, 2, 4];
}


export function makeLoopNote(state: Pick<LoopComposerState, 'pitchSteps' | 'pitchLines' | 'stepsPerBar' | 'beatsPerBar' | 'bars'>, params: {
  trackId: string;
  channelIndex: number;
  startUnit: number;
  durationUnits: number;
  octaveOffset?: number;
  velocity?: number;
  fadeInUnits?: number;
  fadeOutUnits?: number;
}): LoopNoteEvent {
  return hydrateLoopNoteEvent(state, {
    id: crypto.randomUUID(),
    trackId: params.trackId,
    channelIndex: Math.max(0, Math.min(composerChannelCount(state) - 1, params.channelIndex)),
    octaveOffset: canonicalLoopNoteOctaveOffset(null),
    startUnit: params.startUnit,
    durationUnits: params.durationUnits,
    fadeInUnits: params.fadeInUnits ?? 0,
    fadeOutUnits: params.fadeOutUnits ?? 0,
    velocity: params.velocity ?? 0.72,
  });
}

export function buildChordGhostNotes(
  state: LoopComposerState,
  params: { trackId: string; rootChannelIndex: number; startUnit: number; durationUnits: number; voicing: ChordVoicing; strumUnits?: number },
): LoopGhostNote[] {
  const strum = Math.max(0, Math.round(params.strumUnits ?? 0));
  return chordIntervalsForVoicing(params.voicing)
    .map((interval, index) => {
      const channelIndex = Math.min(composerChannelCount(state) - 1, params.rootChannelIndex + interval);
      if (channelIndex < 0) return null;
      return {
        trackId: params.trackId,
        channelIndex,
        startUnit: params.startUnit + index * strum,
        durationUnits: params.durationUnits,
      } as LoopGhostNote;
    })
    .filter((entry): entry is LoopGhostNote => Boolean(entry));
}

export function buildChordNotesFromStep(
  state: LoopComposerState,
  params: { trackId: string; rootChannelIndex: number; startUnit: number; durationUnits: number; velocity: number; octaveOffset: number; voicing: ChordVoicing; strumUnits?: number; velocitySlope?: number },
) {
  const strum = Math.max(0, Math.round(params.strumUnits ?? 0));
  const slope = Math.max(0, Math.min(0.3, params.velocitySlope ?? 0.08));
  const totalUnits = totalComposerSteps(state);
  return chordIntervalsForVoicing(params.voicing)
    .map((interval, index) => {
      const channelIndex = Math.min(composerChannelCount(state) - 1, params.rootChannelIndex + interval);
      if (channelIndex < 0) return null;
      const startUnit = Math.min(totalUnits - 0.125, params.startUnit + index * strum);
      return makeLoopNote(state, {
        trackId: params.trackId,
        channelIndex,
        startUnit,
        durationUnits: params.durationUnits,
        octaveOffset: params.octaveOffset,
        fadeInUnits: index === 0 ? 0 : 1,
        fadeOutUnits: 1,
        velocity: clamp01(params.velocity - index * slope),
      });
    })
    .filter((entry): entry is LoopNoteEvent => Boolean(entry));
}

export function clampComposerLength(length: number) {
  return Math.max(0.125, Number.isFinite(length) ? length : 0.125);
}

export function buildBassPatternNotes(pattern: string, state: LoopComposerState): LoopNoteEvent[] {
  const totalUnits = totalComposerSteps(state);
  const notes: LoopNoteEvent[] = [];
  const push = (trackId: string, startUnit: number, channelIndex: number, durationUnits: number, octaveOffset = -1, velocity = 0.88) => {
    if (startUnit >= totalUnits) return;
    notes.push(makeLoopNote(state, {
      trackId,
      channelIndex,
      startUnit,
      durationUnits: clampComposerLength(Math.min(durationUnits, totalUnits - startUnit)),
      octaveOffset,
      velocity,
      fadeOutUnits: 1,
    }));
  };
  const root = 0;
  const fifth = Math.min(6, composerChannelCount(state) - 1);
  const third = Math.min(3, composerChannelCount(state) - 1);
  const seventh = Math.min(9, composerChannelCount(state) - 1);
  if (pattern === 'forge_braided') {
    for (let bar = 0; bar < state.bars; bar++) {
      const base = bar * state.stepsPerBar;
      push('bass', base + 0, root, 3);
      push('bass', base + 4, fifth, 2, -1, 0.8);
      push('bass', base + 8, third, 3, -1, 0.78);
      push('bass', base + 12, seventh, 2, -1, 0.76);
    }
    return notes;
  }
  if (pattern === 'forge_rooted' || pattern === 'offbeat') {
    for (let bar = 0; bar < state.bars; bar++) {
      const base = bar * state.stepsPerBar;
      push('bass', base + 0, root, 2);
      push('bass', base + 4, root, 2);
      push('bass', base + 8, fifth, 2, -1, 0.82);
      push('bass', base + 12, root, 2);
    }
    return notes;
  }
  if (pattern === 'walking') {
    for (let step = 0; step < totalUnits; step += 2) {
      const degree = [root, third, fifth, seventh][Math.floor(step / 2) % 4] ?? root;
      push('bass', step, degree, 2, -1, 0.74);
    }
    return notes;
  }
  if (pattern === 'arpeggio') {
    for (let step = 0; step < totalUnits; step += 1) {
      const degree = [root, third, fifth, seventh][step % 4] ?? root;
      push('bass', step, degree, 1, 0, 0.66);
    }
    return notes;
  }
  for (let bar = 0; bar < state.bars; bar++) {
    const base = bar * state.stepsPerBar;
    push('bass', base + 0, root, 2);
    push('bass', base + 3, root, 1, -1, 0.8);
    push('bass', base + 6, fifth, 1, -1, 0.76);
    push('bass', base + 8, root, 2);
    push('bass', base + 12, third, 2, -1, 0.7);
  }
  return notes;
}

export function buildCompanionPatternNotes(pattern: string, state: LoopComposerState): LoopNoteEvent[] {
  const totalUnits = totalComposerSteps(state);
  const notes: LoopNoteEvent[] = [];
  const push = (startUnit: number, channelIndex: number, durationUnits: number, octaveOffset = 0, velocity = 0.62) => {
    if (startUnit >= totalUnits) return;
    notes.push(makeLoopNote(state, {
      trackId: 'companion',
      channelIndex,
      startUnit,
      durationUnits: clampComposerLength(Math.min(durationUnits, totalUnits - startUnit)),
      octaveOffset,
      velocity,
      fadeOutUnits: Math.min(4, durationUnits),
    }));
  };
  const root = 0;
  const third = Math.min(3, composerChannelCount(state) - 1);
  const fifth = Math.min(6, composerChannelCount(state) - 1);
  const eleventh = Math.min(8, composerChannelCount(state) - 1);
  if (pattern === 'forge_braided') {
    for (let bar = 0; bar < state.bars; bar++) {
      const base = bar * state.stepsPerBar;
      push(base + 0, root, 6, 0, 0.54);
      push(base + 4, third, 6, 0, 0.5);
      push(base + 8, fifth, 6, 0, 0.5);
      push(base + 12, eleventh, 4, 0, 0.46);
    }
    return notes;
  }
  if (pattern === 'arpeggio') {
    for (let step = 0; step < totalUnits; step += 2) {
      const degree = [root, third, fifth, eleventh][Math.floor(step / 2) % 4] ?? root;
      push(step, degree, 2, 1, 0.5);
    }
    return notes;
  }
  for (let bar = 0; bar < state.bars; bar++) {
    const base = bar * state.stepsPerBar;
    push(base + 0, root, 8, 0, 0.48);
    push(base + 8, fifth, 8, 0, 0.48);
  }
  return notes;
}


export function defaultLoopTrackPatternPreset(trackId: string): LoopTrackPatternPreset {
  return DEFAULT_LOOP_TRACKS.find((track) => track.id === trackId)?.patternPresetId ?? 'patternA';
}


function trackPatternAnchors(state: LoopComposerState, trackId: string, presetId: LoopCompositionPreset) {
  const last = Math.max(0, composerChannelCount(state) - 1);
  const pick = (ratio: number) => Math.max(0, Math.min(last, Math.round(last * ratio)));
  const families: Record<LoopCompositionPreset, Record<string, number[]>> = {
    jazz: {
      bass: [0.7, 0.76, 0.81, 0.85, 0.89, 0.93, 0.97],
      companion: [0.42, 0.48, 0.54, 0.6, 0.66, 0.72, 0.78],
      aux: [0.26, 0.32, 0.38, 0.44, 0.5, 0.56, 0.62],
      texture: [0.08, 0.14, 0.2, 0.26, 0.32, 0.38, 0.44],
    },
    classical: {
      bass: [0.62, 0.68, 0.73, 0.78, 0.83, 0.88, 0.93],
      companion: [0.34, 0.4, 0.46, 0.52, 0.58, 0.64, 0.7],
      aux: [0.2, 0.26, 0.32, 0.38, 0.44, 0.5, 0.56],
      texture: [0.1, 0.16, 0.22, 0.28, 0.34, 0.4, 0.46],
    },
    oriental: {
      bass: [0.66, 0.72, 0.77, 0.82, 0.87, 0.92, 0.97],
      companion: [0.4, 0.45, 0.5, 0.56, 0.62, 0.68, 0.74],
      aux: [0.24, 0.29, 0.34, 0.4, 0.46, 0.52, 0.58],
      texture: [0.12, 0.18, 0.24, 0.3, 0.36, 0.42, 0.48],
    },
  };
  const ratios = families[presetId][trackId] ?? families[presetId].companion;
  return ratios.map(pick);
}

function trackPatternOctaveBias(_trackId: string) {
  return 0;
}

const COMPOSITION_MOTIFS: Record<LoopCompositionPreset, Record<LoopTrackPatternPreset, CompositionPhraseStep[][]>> = {
  jazz: {
    patternA: [
      [[0.0, 0, 0.24, 0.98], [0.36, 2, 0.12, 0.84], [0.62, 4, 0.16, 0.88]],
      [[0.0, 1, 0.22, 0.96], [0.34, 3, 0.12, 0.84], [0.62, 5, 0.16, 0.88]],
      [[0.0, 2, 0.22, 0.96], [0.32, 4, 0.12, 0.84], [0.58, 6, 0.16, 0.9], [0.84, 4, 0.08, 0.76]],
      [[0.0, 1, 0.24, 0.98], [0.38, 3, 0.12, 0.84], [0.66, 0, 0.18, 0.82]],
    ],
    patternB: [
      [[0.0, 0, 0.18, 0.94], [0.22, 1, 0.08, 0.78], [0.44, 3, 0.14, 0.88], [0.72, 2, 0.1, 0.8]],
      [[0.0, 1, 0.18, 0.94], [0.22, 2, 0.08, 0.78], [0.44, 4, 0.14, 0.88], [0.72, 3, 0.1, 0.8]],
      [[0.0, 2, 0.18, 0.94], [0.2, 3, 0.08, 0.78], [0.42, 5, 0.14, 0.88], [0.7, 4, 0.1, 0.8]],
      [[0.0, 1, 0.18, 0.94], [0.24, 3, 0.08, 0.78], [0.5, 2, 0.12, 0.84], [0.76, 0, 0.14, 0.82]],
    ],
    patternC: [
      [[0.0, 4, 0.16, 0.9], [0.26, 5, 0.12, 0.84], [0.56, 3, 0.18, 0.88]],
      [[0.0, 5, 0.16, 0.9], [0.26, 6, 0.12, 0.84], [0.56, 4, 0.18, 0.88]],
      [[0.0, 6, 0.16, 0.9], [0.28, 4, 0.12, 0.84], [0.58, 2, 0.18, 0.88]],
      [[0.0, 4, 0.16, 0.9], [0.28, 2, 0.12, 0.84], [0.6, 0, 0.2, 0.9]],
    ],
  },
  classical: {
    patternA: [
      [[0.0, 0, 0.2, 0.94], [0.3, 2, 0.16, 0.88], [0.62, 4, 0.18, 0.9]],
      [[0.0, 1, 0.2, 0.94], [0.3, 3, 0.16, 0.88], [0.62, 5, 0.18, 0.9]],
      [[0.0, 2, 0.2, 0.94], [0.3, 4, 0.16, 0.88], [0.62, 6, 0.18, 0.9]],
      [[0.0, 1, 0.2, 0.94], [0.32, 3, 0.16, 0.88], [0.66, 0, 0.2, 0.9]],
    ],
    patternB: [
      [[0.0, 0, 0.16, 0.92], [0.2, 2, 0.1, 0.84], [0.42, 4, 0.14, 0.88], [0.7, 2, 0.12, 0.82]],
      [[0.0, 1, 0.16, 0.92], [0.2, 3, 0.1, 0.84], [0.42, 5, 0.14, 0.88], [0.7, 3, 0.12, 0.82]],
      [[0.0, 2, 0.16, 0.92], [0.2, 4, 0.1, 0.84], [0.42, 6, 0.14, 0.88], [0.7, 4, 0.12, 0.82]],
      [[0.0, 1, 0.16, 0.92], [0.22, 3, 0.1, 0.84], [0.48, 2, 0.14, 0.86], [0.74, 0, 0.12, 0.82]],
    ],
    patternC: [
      [[0.0, 4, 0.16, 0.9], [0.24, 3, 0.12, 0.84], [0.5, 2, 0.14, 0.86], [0.78, 0, 0.18, 0.92]],
      [[0.0, 5, 0.16, 0.9], [0.24, 4, 0.12, 0.84], [0.5, 3, 0.14, 0.86], [0.78, 1, 0.18, 0.92]],
      [[0.0, 6, 0.16, 0.9], [0.24, 5, 0.12, 0.84], [0.5, 4, 0.14, 0.86], [0.78, 2, 0.18, 0.92]],
      [[0.0, 4, 0.16, 0.9], [0.26, 2, 0.12, 0.84], [0.54, 1, 0.14, 0.86], [0.8, 0, 0.2, 0.94]],
    ],
  },
  oriental: {
    patternA: [
      [[0.0, 0, 0.22, 1.0], [0.16, 1, 0.06, 0.78], [0.24, 2, 0.1, 0.82], [0.42, 3, 0.14, 0.88], [0.68, 2, 0.1, 0.82], [0.84, 0, 0.1, 0.76]],
      [[0.0, 1, 0.2, 0.96], [0.14, 2, 0.06, 0.8], [0.24, 3, 0.1, 0.84], [0.44, 4, 0.14, 0.9], [0.7, 3, 0.1, 0.82], [0.86, 1, 0.08, 0.76]],
      [[0.0, 2, 0.18, 0.94], [0.13, 3, 0.06, 0.8], [0.22, 4, 0.1, 0.84], [0.4, 5, 0.14, 0.9], [0.66, 4, 0.1, 0.82], [0.84, 2, 0.08, 0.76]],
      [[0.0, 1, 0.2, 0.96], [0.18, 2, 0.06, 0.8], [0.3, 3, 0.1, 0.84], [0.5, 4, 0.14, 0.9], [0.74, 2, 0.1, 0.82], [0.88, 0, 0.08, 0.76]],
    ],
    patternB: [
      [[0.0, 0, 0.16, 0.96], [0.12, 1, 0.06, 0.78], [0.2, 2, 0.1, 0.84], [0.36, 1, 0.08, 0.8], [0.5, 3, 0.14, 0.9], [0.72, 4, 0.12, 0.84], [0.88, 2, 0.08, 0.76]],
      [[0.0, 1, 0.16, 0.96], [0.12, 2, 0.06, 0.78], [0.2, 3, 0.1, 0.84], [0.36, 2, 0.08, 0.8], [0.5, 4, 0.14, 0.9], [0.72, 5, 0.12, 0.84], [0.88, 3, 0.08, 0.76]],
      [[0.0, 2, 0.16, 0.96], [0.12, 3, 0.06, 0.78], [0.2, 4, 0.1, 0.84], [0.36, 3, 0.08, 0.8], [0.5, 5, 0.14, 0.9], [0.72, 6, 0.12, 0.84], [0.88, 4, 0.08, 0.76]],
      [[0.0, 1, 0.16, 0.96], [0.12, 2, 0.06, 0.78], [0.2, 3, 0.1, 0.84], [0.38, 4, 0.12, 0.86], [0.6, 2, 0.12, 0.82], [0.84, 0, 0.1, 0.76]],
    ],
    patternC: [
      [[0.0, 3, 0.16, 0.94], [0.14, 2, 0.08, 0.82], [0.26, 1, 0.08, 0.78], [0.4, 0, 0.16, 0.86], [0.62, 2, 0.12, 0.84], [0.82, 0, 0.12, 0.8]],
      [[0.0, 4, 0.16, 0.94], [0.14, 3, 0.08, 0.82], [0.26, 2, 0.08, 0.78], [0.4, 1, 0.16, 0.86], [0.62, 3, 0.12, 0.84], [0.82, 1, 0.12, 0.8]],
      [[0.0, 5, 0.16, 0.94], [0.14, 4, 0.08, 0.82], [0.26, 3, 0.08, 0.78], [0.4, 2, 0.16, 0.86], [0.62, 4, 0.12, 0.84], [0.82, 2, 0.12, 0.8]],
      [[0.0, 3, 0.16, 0.94], [0.16, 2, 0.08, 0.82], [0.3, 1, 0.1, 0.78], [0.5, 0, 0.18, 0.9], [0.78, 0, 0.12, 0.82]],
    ],
  },
};

function motifForCompositionBar(presetId: LoopCompositionPreset, patternPresetId: LoopTrackPatternPreset, bar: number) {
  const family = COMPOSITION_MOTIFS[presetId]?.[patternPresetId] ?? COMPOSITION_MOTIFS.jazz.patternA;
  return family[bar % family.length] ?? family[0] ?? [];
}

function neighborDegree(degree: number, delta: number) {
  return Math.max(0, Math.min(6, degree + delta));
}

function pushTextureChord(push: (startUnit: number, anchorIndex: number, durationUnits: number, octaveOffset?: number, velocity?: number) => void, start: number, degree: number, perBar: number, octaveBias: number, velocityBase: number) {
  push(start, degree, Math.max(0.9, perBar * 0.34), octaveBias, velocityBase * 0.74);
  push(start + perBar * 0.03, neighborDegree(degree, 2), Math.max(0.75, perBar * 0.28), octaveBias, velocityBase * 0.58);
}

export function buildTrackPatternNotes(trackId: string, patternPresetId: LoopTrackPatternPreset, state: LoopComposerState): LoopNoteEvent[] {
  const totalUnits = totalComposerSteps(state);
  const perBar = Math.max(1, state.stepsPerBar);
  const compositionPresetId = state.compositionPresetId ?? 'jazz';
  const anchors = trackPatternAnchors(state, trackId, compositionPresetId);
  const octaveBias = trackPatternOctaveBias(trackId);
  const velocityBase = trackId === 'bass' ? 0.8 : trackId === 'texture' ? 0.44 : trackId === 'aux' ? 0.54 : 0.62;
  const notes: LoopNoteEvent[] = [];
  const push = (startUnit: number, anchorIndex: number, durationUnits: number, octaveOffset = octaveBias, velocity = velocityBase) => {
    if (startUnit >= totalUnits) return;
    notes.push(makeLoopNote(state, {
      trackId,
      channelIndex: anchors[Math.max(0, Math.min(anchors.length - 1, Math.round(anchorIndex)))] ?? anchors[0] ?? 0,
      startUnit,
      durationUnits: clampComposerLength(Math.min(durationUnits, totalUnits - startUnit)),
      octaveOffset,
      velocity,
      fadeInUnits: Math.min(1.2, Math.max(0.06, durationUnits * 0.1)),
      fadeOutUnits: Math.min(2.5, Math.max(0.18, durationUnits * 0.2)),
    }));
  };

  for (let bar = 0; bar < state.bars; bar += 1) {
    const base = bar * perBar;
    const motif = motifForCompositionBar(compositionPresetId, patternPresetId, bar);
    if (trackId === 'bass') {
      motif.forEach(([startRatio, degree, durationRatio, velocityMul = 1], index) => {
        if (!(index === 0 || index === motif.length - 1 || index % 2 === 0)) return;
        const start = base + perBar * startRatio;
        const length = Math.max(0.5, perBar * durationRatio * (index === 0 ? 1.6 : 1.22));
        const mappedDegree = Math.max(0, Math.min(6, degree - (compositionPresetId === 'jazz' ? 1 : 0)));
        push(start, mappedDegree, length, octaveBias, velocityBase * velocityMul * (index === 0 ? 1.06 : 0.96));
      });
      if (patternPresetId === 'patternB') {
        push(base + perBar * 0.5, neighborDegree((motif[0]?.[1] ?? 0), 1), Math.max(0.35, perBar * 0.12), octaveBias, velocityBase * 0.84);
      }
      continue;
    }
    if (trackId === 'companion') {
      motif.forEach(([startRatio, degree, durationRatio, velocityMul = 1], index) => {
        const start = base + perBar * startRatio;
        const length = Math.max(0.28, perBar * durationRatio * 0.95);
        const degreeShift = compositionPresetId === 'classical' && patternPresetId === 'patternB' && index % 3 === 0 ? 1 : 0;
        push(start, neighborDegree(degree, degreeShift), length, octaveBias, velocityBase * velocityMul);
      });
      continue;
    }
    if (trackId === 'aux') {
      motif.forEach(([startRatio, degree, durationRatio, velocityMul = 1], index) => {
        if (index % 2 === 0 && patternPresetId !== 'patternC') return;
        const start = base + perBar * (startRatio + 0.035);
        const shortDur = Math.max(0.18, perBar * durationRatio * 0.55);
        const ornament = compositionPresetId === 'oriental' ? (index % 3 === 0 ? -1 : 1) : (index % 2 === 0 ? 1 : -1);
        push(start, neighborDegree(degree, ornament), shortDur, octaveBias, velocityBase * velocityMul * 0.92);
        if (patternPresetId === 'patternC' || compositionPresetId === 'oriental') {
          push(start + perBar * 0.035, degree, Math.max(0.12, shortDur * 0.66), octaveBias, velocityBase * velocityMul * 0.74);
        }
      });
      continue;
    }
    const entryDegree = motif[0]?.[1] ?? 0;
    pushTextureChord(push, base + perBar * 0.02, entryDegree, perBar, octaveBias, velocityBase);
    const cadence = motif[motif.length - 1]?.[1] ?? entryDegree;
    pushTextureChord(push, base + perBar * 0.56, cadence, perBar, octaveBias, velocityBase * 0.95);
    if (patternPresetId === 'patternC') {
      push(base + perBar * 0.32, neighborDegree(entryDegree, 1), Math.max(0.5, perBar * 0.2), octaveBias, velocityBase * 0.52);
    }
  }

  return notes.sort((a, b) => noteStartUnit(state, a) - noteStartUnit(state, b));
}
