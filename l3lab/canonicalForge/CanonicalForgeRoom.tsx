import { useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine } from '../spectralForge/audio/AudioEngine';
import { attachAnalysisCacheToSourceAsset, prepareAudioSourceAsset, retargetAudioSourceAsset, type AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import { SpectralData, type MorphMode, type StampData } from '../spectralForge/audio/SpectralData';
import { importImageElementToSpectralData, loadImageElementFromFile, renderImageImportPreview, type ImageImportFitMode, type ImageImportReadMode } from '../spectralForge/audio/ImageImporter';
import { stampPresets } from '../spectralForge/audio/stampPresets';
import { buildColorLUT, magma } from '../spectralForge/utils/colorMap';
import { buildCanonicalAnalysisBundle, buildSpectralDataFromComposite, getCanonicalViewData, sampleCanonicalView, type CanonicalAnalysisBundle, type CanonicalSourceView } from './analysis';
import { buildForgeExportContext, createExampleExternalPackageFromContext, exportThroughForgeAdapter, getForgeMaterialAdapter, useForgeMaterialAdapters } from '../forgeBridge';
import { deleteMaterialEntry, registerExternalMaterialPackage, updateMaterialEntry, useMaterialLibrary } from '../materialLibrary';
import { buildDefaultGuideMarkers, clampBars, clampGuideSegments, computeLoopDurationSec } from '../spectralForge/state/store';
import { deleteCustomStamp, renameCustomStamp, saveCustomStamp, useCustomStampLibrary } from '../spectralForge/customStampLibrary';
import { deleteCanonicalForgeProject, loadCanonicalForgeProject, renameCanonicalForgeProject, saveCanonicalForgeProject, useCanonicalForgeProjectLibrary } from './projectLibrary';
import { getCanonicalForgeSession, setCanonicalForgeSession, type CanonicalForgeWorkspace, type CanonicalLogicView } from './session';
import { LOOP_TRACK_INSTRUMENTS, startLoopComposerPreview, stopLoopComposerPreview, type LoopTrackInstrumentPreset } from './loopPreview';
import { DRUM_PATTERNS, BASS_PATTERNS, JI_NODES } from '../../xensonar/constants';
import { FORGE2_WORKSPACES, buildMachineRoomHandoffProfile, buildProducerRoadmapNotes, getForge2WorkspaceDefinition, summarizeHandoffProfile, type Forge2WorkspaceId } from '../../xensonar/architecture/machineRooms';
import { DRUM_KITS, type DrumPattern } from '../../xensonar/domain/instrumentData';
import { buildVisibleDrumPatternMatrix, createEmptyDrumPatternMatrix } from '../../xensonar/drumPatternMachine';
import { registerDrumConfigFromMatrix } from '../../xensonar/drumConfigLibrary';
import { estimateLoopSnapSuggestion } from './loopSnap';

const LUT = buildColorLUT(magma);
const CANONICAL_PRODUCER = {
  producerId: 'spectralforge-canonical',
  producerName: 'Spectral Forge Canonical',
  version: 'forge2-a',
  family: 'canonical' as const,
  notes: buildProducerRoadmapNotes('canonical', 'Spectral Forge Canonical'),
};

type SynthMode = 'additive' | 'ifft' | 'granular' | 'glyph';
type MaterialRole = 'loop' | 'waveMaterial' | 'particleExciter' | 'droneTexture';
type SourcePreviewMode = 'forge' | 'sourceWindow' | 'sourceFull';
type CanonicalTool = 'brush' | 'smudge' | 'morph' | 'sourceTrace' | 'harmonicLift' | 'transientLift' | 'noiseGate' | 'dodgeBurn' | 'blurSharpen' | 'delaySmear' | 'threshold' | 'stamp';
type TransferMode = 'forge-render' | 'source-direct';

type MaterialExportConfig = {
  name: string;
  role: MaterialRole;
  adapterId: string;
  bpm: number;
  bars: number;
  guideSegments: number;
  guideMarkers: number[];
  beatGuideAudible: boolean;
  beatGuideVolume: number;
  loopPreview: boolean;
  transferMode: TransferMode;
};

type WaveformMix = {
  sine: number;
  sawtooth: number;
  square: number;
  triangle: number;
};

const DEFAULT_EXPORT: MaterialExportConfig = {
  name: 'Canonical Forge Loop',
  role: 'loop',
  adapterId: 'canonical-forge-bridge',
  bpm: 108,
  bars: 4,
  guideSegments: 4,
  guideMarkers: buildDefaultGuideMarkers(4),
  beatGuideAudible: false,
  beatGuideVolume: 0.35,
  loopPreview: true,
  transferMode: 'source-direct',
};

const DEFAULT_WAVEFORM_MIX: WaveformMix = {
  sine: 0.7,
  sawtooth: 0.2,
  square: 0.1,
  triangle: 0.2,
};

const SOURCE_VIEWS: { id: CanonicalSourceView; label: string; hint: string }[] = [
  { id: 'synesthetic', label: 'Synästhetisch', hint: 'Breite Mischansicht aus Spektrum, Kontur, Harmonik, Pulse, Breite' },
  { id: 'energy', label: 'Energie', hint: 'Volles Spektrum als Grundmasse' },
  { id: 'harmonic', label: 'Harmonik', hint: 'Stabilere tonale Linien und Partialzüge' },
  { id: 'transient', label: 'Transient', hint: 'Anschläge, Rillen, Kanten, Impulse' },
  { id: 'lowBand', label: 'Low Band', hint: 'Tiefe Tragmasse und Körperzonen' },
  { id: 'air', label: 'Air', hint: 'Obere Luft, Schimmer, Ausfransungen' },
  { id: 'stereo', label: 'Stereo', hint: 'Breitenenergie und Seitenanteile der Quelle' },
  { id: 'pulse', label: 'Pulse', hint: 'Wellenkörper, Puls und Impulsdichte' },
  { id: 'noise', label: 'Rauschen', hint: 'Körnige, zerfasende, residuale Anteile' },
  { id: 'contour', label: 'Kontur', hint: 'Zeichenhafte Kanten und Formlinien' },
];

const DRUM_PATTERN_OPTIONS = [
  ...DRUM_PATTERNS,
  { value: 'minimal_techno', label: 'Minimal Techno' },
  { value: 'duststep', label: 'Duststep' },
  { value: 'broken_lilt', label: 'Broken Lilt' },
] as const;

const BASS_PATTERN_OPTIONS = [
  ...BASS_PATTERNS,
  { value: 'forge_rooted', label: 'Forge Rooted' },
  { value: 'forge_braided', label: 'Forge Braided' },
  { value: 'forge_fractured', label: 'Forge Fractured' },
] as const;

const TOOLS: { id: CanonicalTool; icon: string; label: string; hint: string }[] = [
  { id: 'brush', icon: '🖌️', label: 'Brush', hint: 'Direktes Malen in die kanonische Fläche' },
  { id: 'smudge', icon: '🫟', label: 'Wischfinger', hint: 'Material in Zugrichtung verwischen' },
  { id: 'morph', icon: '🌀', label: 'Verformen', hint: 'Push, Bloat, Pinch und Twirl wie in Forge 1' },
  { id: 'sourceTrace', icon: '🧬', label: 'Source Trace', hint: 'Aus gewählter Analyseansicht direkt hineinziehen' },
  { id: 'harmonicLift', icon: '🎼', label: 'Harmonic Lift', hint: 'Harmonische Linien lokal nach vorne holen' },
  { id: 'transientLift', icon: '⚡', label: 'Transient Lift', hint: 'Impulsreiche Zonen nachzeichnen' },
  { id: 'noiseGate', icon: '🚪', label: 'Noise Gate', hint: 'Leise Reste lokal kappen oder freilegen' },
  { id: 'dodgeBurn', icon: '☀️', label: 'Dodge/Burn', hint: 'Nachbelichten oder lokal abdunkeln wie im Bildlabor' },
  { id: 'blurSharpen', icon: '🪞', label: 'Blur/Sharpen', hint: 'Weichzeichnen oder Details lokal zuspitzen' },
  { id: 'delaySmear', icon: '⟿', label: 'Delay Smear', hint: 'Echoartige Wiederholungen in Zeitrichtung ziehen' },
  { id: 'threshold', icon: '⛶', label: 'Threshold', hint: 'Unteres Material ausdünnen oder leise Zonen anheben' },
  { id: 'stamp', icon: '📋', label: 'Stamp', hint: 'Stempel mit Scale/Rotation/Flip aus Forge 1 recycelt' },
];

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function sanitizeName(input: string) {
  return input.trim().replace(/[\\/:*?"<>|]/g, '-').slice(0, 80) || 'canonical-forge-material';
}

function makeEmptySpectral(width = 1536, height = 384) {
  return new SpectralData(width, height);
}

function buildRawPreviewAsset(source: AudioSourceAsset | null): AudioSourceAsset | null {
  if (!source) return null;
  return {
    ...source,
    importStartSec: 0,
    importDurationSec: Math.max(0.05, source.originalDuration),
  };
}

function hasPlayableSource(asset: AudioSourceAsset | null) {
  return !!asset && asset.monoSamples.length > 0 && asset.sampleRate > 0;
}

function cloneStamp(presetId: string): StampData {
  const preset = stampPresets.find((entry) => entry.id === presetId) ?? stampPresets[0];
  return {
    width: preset.stamp.width,
    height: preset.stamp.height,
    data: preset.stamp.data.slice(),
    grainData: preset.stamp.grainData.slice(),
  };
}


type CanonicalToolSettings = {
  brushSize: number;
  intensity: number;
  hardness: number;
  eraseMode: boolean;
  morphMode: MorphMode;
};

type GrooveMachineConfig = {
  drumPattern: string;
  drumKit: string;
  bassPattern: string;
  barsInterpretation: number;
  showGrid: boolean;
};

type DrumVoiceId = 'kick' | 'snare' | 'hatClosed' | 'hatOpen' | 'clap' | 'perc';

type DrumComputerState = {
  useCustom: boolean;
  presetSource: string;
  bars: number;
  stepCount: number;
  laneOrder: DrumVoiceId[];
  laneSteps: Record<DrumVoiceId, number[]>;
};

type LoopAutocorrectSuggestion = {
  bpm: number;
  confidence: number;
  startSec: number;
  durationSec: number;
  bars: number;
  candidates: { bars: number; durationSec: number; fitScore: number }[];
};

type StampPhase = 'idle' | 'selecting' | 'stamping';

type LoopPitchStep = {
  id: string;
  label: string;
  ratio: number;
  cents: number;
  offsetCents: number;
  muted: boolean;
};

type LoopTrack = {
  id: string;
  label: string;
  color: string;
  volume: number;
  instrumentRole: 'bass' | 'companion' | 'aux';
  instrumentPreset?: LoopTrackInstrumentPreset;
  pan?: number;
  enabled: boolean;
};

type LoopNoteEvent = {
  id: string;
  trackId: string;
  stepId: string;
  octaveOffset: number;
  startStep: number;
  lengthSteps: number;
  fadeInSteps: number;
  fadeOutSteps: number;
  velocity: number;
};

type LoopGhostNote = {
  trackId: string;
  stepId: string;
  startStep: number;
  lengthSteps: number;
};

type LoopNoteSelectionBox = {
  startStep: number;
  endStep: number;
  startStepIndex: number;
  endStepIndex: number;
};

type ChordVoicing = 'triad' | 'quartal' | 'cluster' | 'open5';

type PendingImageImport = {
  file: File;
  image: HTMLImageElement;
  fitMode: ImageImportFitMode;
  shiftX: number;
  shiftY: number;
  contrast: number;
  readMode: ImageImportReadMode;
};

type LoopComposerState = {
  pitchSteps: LoopPitchStep[];
  tracks: LoopTrack[];
  notes: LoopNoteEvent[];
  selectedTrackId: string;
  selectedNoteId: string | null;
  stepsPerBar: number;
  bars: number;
  zoom: number;
  scrollX: number;
  activeTrackIds: string[];
};

const MAX_HISTORY = 32;
const DEFAULT_TOOL_SETTINGS: CanonicalToolSettings = {
  brushSize: 20,
  intensity: 0.4,
  hardness: 0.42,
  eraseMode: false,
  morphMode: 'push',
};
const DEFAULT_GROOVE_MACHINE: GrooveMachineConfig = {
  drumPattern: 'broken_lilt',
  drumKit: 'dusty_tape',
  bassPattern: 'forge_fractured',
  barsInterpretation: 4,
  showGrid: true,
};

const DRUM_LANE_LABELS: Record<DrumVoiceId, string> = { kick: 'Kick', snare: 'Snare', hatClosed: 'Hat C', hatOpen: 'Hat O', clap: 'Clap', perc: 'Perc' };
const DRUM_LANE_COLORS: Record<DrumVoiceId, string> = { kick: '#38bdf8', snare: '#f472b6', hatClosed: '#f59e0b', hatOpen: '#fbbf24', clap: '#c084fc', perc: '#34d399' };

const DEFAULT_LOOP_TRACKS: LoopTrack[] = [
  { id: 'bass', label: 'Bass', color: '#38bdf8', volume: 0.9, instrumentRole: 'bass', instrumentPreset: 'subPulse', pan: -0.08, enabled: true },
  { id: 'companion', label: 'Begleitung', color: '#c084fc', volume: 0.72, instrumentRole: 'companion', instrumentPreset: 'reedTone', pan: 0.06, enabled: true },
  { id: 'aux', label: 'Spur 3', color: '#f59e0b', volume: 0.65, instrumentRole: 'aux', instrumentPreset: 'airPluck', pan: 0.12, enabled: false },
];

function createDefaultLoopPitchSteps(): LoopPitchStep[] {
  return JI_NODES.map((node, index) => ({
    id: `step-${index}`,
    label: node.label,
    ratio: node.ratio,
    cents: node.cents,
    offsetCents: 0,
    muted: false,
  }));
}

function createEmptyLoopComposer(bars = DEFAULT_GROOVE_MACHINE.barsInterpretation): LoopComposerState {
  return {
    pitchSteps: createDefaultLoopPitchSteps(),
    tracks: DEFAULT_LOOP_TRACKS.map((track) => ({ ...track })),
    notes: [],
    selectedTrackId: 'bass',
    selectedNoteId: null,
    stepsPerBar: 16,
    bars,
    zoom: 1,
    scrollX: 0,
    activeTrackIds: ['bass', 'companion'],
  };
}

function hydrateLoopTrack(track: LoopTrack, index: number): LoopTrack {
  const fallback = DEFAULT_LOOP_TRACKS.find((entry) => entry.id === track.id) ?? DEFAULT_LOOP_TRACKS[index] ?? DEFAULT_LOOP_TRACKS[0];
  return { ...fallback, ...track, instrumentPreset: track.instrumentPreset ?? fallback.instrumentPreset, pan: track.pan ?? fallback.pan };
}

function cloneLoopComposerState(state: LoopComposerState): LoopComposerState {
  return {
    pitchSteps: state.pitchSteps.map((step) => ({ ...step })),
    tracks: state.tracks.map((track, index) => hydrateLoopTrack(track, index)),
    notes: state.notes.map((note) => ({ ...note })),
    selectedTrackId: state.selectedTrackId,
    selectedNoteId: state.selectedNoteId,
    stepsPerBar: state.stepsPerBar,
    bars: state.bars,
    zoom: state.zoom,
    scrollX: state.scrollX,
    activeTrackIds: [...state.activeTrackIds],
  };
}

function totalComposerSteps(state: LoopComposerState) {
  return Math.max(1, state.stepsPerBar * Math.max(1, state.bars));
}

function snapComposerStep(step: number, totalSteps: number) {
  return Math.max(0, Math.min(totalSteps - 1, Math.round(step)));
}

function composerTrackById(state: LoopComposerState, trackId: string) {
  return state.tracks.find((track) => track.id === trackId) ?? state.tracks[0];
}

function composerStepIndex(state: LoopComposerState, stepId: string) {
  return state.pitchSteps.findIndex((step) => step.id === stepId);
}

function notesAtGridCell(
  state: LoopComposerState,
  stepId: string,
  gridStep: number,
  preferredTrackId?: string,
  preferredNoteId?: string | null,
) {
  return state.notes
    .filter((entry) => entry.stepId === stepId && gridStep >= entry.startStep && gridStep < entry.startStep + entry.lengthSteps)
    .sort((a, b) => {
      if (preferredNoteId) {
        const aSelected = a.id === preferredNoteId ? 1 : 0;
        const bSelected = b.id === preferredNoteId ? 1 : 0;
        if (aSelected !== bSelected) return bSelected - aSelected;
      }
      if (preferredTrackId) {
        const aPref = a.trackId === preferredTrackId ? 1 : 0;
        const bPref = b.trackId === preferredTrackId ? 1 : 0;
        if (aPref !== bPref) return bPref - aPref;
      }
      if (a.lengthSteps !== b.lengthSteps) return a.lengthSteps - b.lengthSteps;
      return a.startStep - b.startStep;
    });
}

function overlapCountAtCell(state: LoopComposerState, stepId: string, gridStep: number) {
  return notesAtGridCell(state, stepId, gridStep).length;
}

function normalizeLoopSelectionBox(box: {
  anchorStep: number;
  headStep: number;
  anchorStepIndex: number;
  headStepIndex: number;
}): LoopNoteSelectionBox {
  return {
    startStep: Math.min(box.anchorStep, box.headStep),
    endStep: Math.max(box.anchorStep, box.headStep),
    startStepIndex: Math.min(box.anchorStepIndex, box.headStepIndex),
    endStepIndex: Math.max(box.anchorStepIndex, box.headStepIndex),
  };
}

function noteIntersectsLoopSelection(state: LoopComposerState, note: LoopNoteEvent, box: LoopNoteSelectionBox) {
  const pitchIndex = composerStepIndex(state, note.stepId);
  if (pitchIndex < box.startStepIndex || pitchIndex > box.endStepIndex) return false;
  const noteStart = note.startStep;
  const noteEnd = note.startStep + note.lengthSteps - 1;
  return noteEnd >= box.startStep && noteStart <= box.endStep;
}

function chordIntervalsForVoicing(voicing: ChordVoicing) {
  if (voicing === 'quartal') return [0, 3, 6];
  if (voicing === 'cluster') return [0, 1, 2, 4];
  if (voicing === 'open5') return [0, 4, 8];
  return [0, 2, 4];
}

function buildChordGhostNotes(
  state: LoopComposerState,
  params: { trackId: string; rootStepIndex: number; startStep: number; lengthSteps: number; voicing: ChordVoicing; strumSteps?: number },
): LoopGhostNote[] {
  const strum = Math.max(0, Math.round(params.strumSteps ?? 0));
  return chordIntervalsForVoicing(params.voicing)
    .map((interval, index) => {
      const step = state.pitchSteps[params.rootStepIndex + interval] ?? state.pitchSteps[state.pitchSteps.length - 1];
      if (!step) return null;
      return {
        trackId: params.trackId,
        stepId: step.id,
        startStep: params.startStep + index * strum,
        lengthSteps: params.lengthSteps,
      } as LoopGhostNote;
    })
    .filter((entry): entry is LoopGhostNote => Boolean(entry));
}

function buildChordNotesFromStep(
  state: LoopComposerState,
  params: { trackId: string; rootStepIndex: number; startStep: number; lengthSteps: number; velocity: number; octaveOffset: number; voicing: ChordVoicing; strumSteps?: number; velocitySlope?: number },
) {
  const strum = Math.max(0, Math.round(params.strumSteps ?? 0));
  const slope = Math.max(0, Math.min(0.3, params.velocitySlope ?? 0.08));
  const totalSteps = totalComposerSteps(state);
  return chordIntervalsForVoicing(params.voicing)
    .map((interval, index) => {
      const step = state.pitchSteps[params.rootStepIndex + interval] ?? state.pitchSteps[state.pitchSteps.length - 1];
      if (!step) return null;
      const startStep = Math.min(totalSteps - 1, params.startStep + index * strum);
      return {
        id: crypto.randomUUID(),
        trackId: params.trackId,
        stepId: step.id,
        octaveOffset: params.octaveOffset,
        startStep,
        lengthSteps: params.lengthSteps,
        fadeInSteps: index === 0 ? 0 : 1,
        fadeOutSteps: 1,
        velocity: clamp01(params.velocity - index * slope),
      } as LoopNoteEvent;
    })
    .filter((entry): entry is LoopNoteEvent => Boolean(entry));
}

function clampComposerLength(length: number) {
  return Math.max(1, Math.round(length));
}

function buildBassPatternNotes(pattern: string, state: LoopComposerState): LoopNoteEvent[] {
  const totalSteps = totalComposerSteps(state);
  const pitchSteps = state.pitchSteps;
  const root = pitchSteps[0]?.id ?? 'step-0';
  const fifth = pitchSteps[Math.min(6, pitchSteps.length - 1)]?.id ?? root;
  const third = pitchSteps[Math.min(3, pitchSteps.length - 1)]?.id ?? root;
  const seventh = pitchSteps[Math.min(9, pitchSteps.length - 1)]?.id ?? fifth;
  const notes: LoopNoteEvent[] = [];
  const push = (trackId: string, startStep: number, stepId: string, lengthSteps: number, octaveOffset = -1, velocity = 0.88) => {
    if (startStep >= totalSteps) return;
    notes.push({
      id: crypto.randomUUID(),
      trackId,
      stepId,
      octaveOffset,
      startStep,
      lengthSteps: clampComposerLength(Math.min(lengthSteps, totalSteps - startStep)),
      fadeInSteps: 0,
      fadeOutSteps: 1,
      velocity,
    });
  };
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
    for (let step = 0; step < totalSteps; step += 2) {
      const degree = [root, third, fifth, seventh][Math.floor(step / 2) % 4] ?? root;
      push('bass', step, degree, 2, -1, 0.74);
    }
    return notes;
  }
  if (pattern === 'arpeggio') {
    for (let step = 0; step < totalSteps; step += 1) {
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

function buildCompanionPatternNotes(pattern: string, state: LoopComposerState): LoopNoteEvent[] {
  const totalSteps = totalComposerSteps(state);
  const pitchSteps = state.pitchSteps;
  const root = pitchSteps[0]?.id ?? 'step-0';
  const third = pitchSteps[Math.min(3, pitchSteps.length - 1)]?.id ?? root;
  const fifth = pitchSteps[Math.min(6, pitchSteps.length - 1)]?.id ?? root;
  const eleventh = pitchSteps[Math.min(8, pitchSteps.length - 1)]?.id ?? fifth;
  const notes: LoopNoteEvent[] = [];
  const push = (startStep: number, stepId: string, lengthSteps: number, octaveOffset = 0, velocity = 0.62) => {
    if (startStep >= totalSteps) return;
    notes.push({
      id: crypto.randomUUID(),
      trackId: 'companion',
      stepId,
      octaveOffset,
      startStep,
      lengthSteps: clampComposerLength(Math.min(lengthSteps, totalSteps - startStep)),
      fadeInSteps: 0,
      fadeOutSteps: Math.min(4, lengthSteps),
      velocity,
    });
  };
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
    for (let step = 0; step < totalSteps; step += 2) {
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

function buildLoopComposerFromPresets(bassPattern: string, state: LoopComposerState): LoopComposerState {
  const next = cloneLoopComposerState(state);
  next.notes = [
    ...buildBassPatternNotes(bassPattern, next),
    ...buildCompanionPatternNotes(bassPattern, next),
  ];
  next.selectedTrackId = 'bass';
  next.selectedNoteId = next.notes[0]?.id ?? null;
  next.activeTrackIds = ['bass', 'companion'];
  return next;
}

function drumPatternMatrixToState(pattern: string, matrix: ReturnType<typeof buildVisibleDrumPatternMatrix>, useCustom: boolean): DrumComputerState {
  return {
    useCustom,
    presetSource: pattern,
    bars: matrix.bars,
    stepCount: matrix.stepCount,
    laneOrder: [...matrix.laneOrder] as DrumVoiceId[],
    laneSteps: Object.fromEntries(matrix.laneOrder.map((laneId) => [laneId, [...(matrix.laneSteps[laneId] ?? [])]])) as Record<DrumVoiceId, number[]>,
  };
}

function createEmptyDrumComputer(bars = DEFAULT_GROOVE_MACHINE.barsInterpretation): DrumComputerState {
  const matrix = createEmptyDrumPatternMatrix(DEFAULT_GROOVE_MACHINE.drumPattern as DrumPattern, bars);
  return drumPatternMatrixToState(DEFAULT_GROOVE_MACHINE.drumPattern, matrix, false);
}

function cloneDrumComputerState(state: DrumComputerState): DrumComputerState {
  return { useCustom: state.useCustom, presetSource: state.presetSource, bars: state.bars, stepCount: state.stepCount, laneOrder: [...state.laneOrder], laneSteps: Object.fromEntries(state.laneOrder.map((laneId) => [laneId, [...(state.laneSteps[laneId] ?? [])]])) as Record<DrumVoiceId, number[]> };
}

function resizeDrumComputerState(state: DrumComputerState, bars: number) {
  const safeBars = Math.max(1, bars);
  const stepCount = safeBars * 16;
  const next = cloneDrumComputerState(state);
  next.bars = safeBars;
  next.stepCount = stepCount;
  next.laneOrder.forEach((laneId) => {
    const current = next.laneSteps[laneId] ?? [];
    next.laneSteps[laneId] = Array.from({ length: stepCount }, (_, index) => current[index] ?? 0);
  });
  return next;
}

function cycleDrumCellValue(value: number) {
  if (value <= 0) return 0.62;
  if (value < 0.8) return 0.86;
  if (value < 0.97) return 1;
  return 0;
}


function countActiveDrumSteps(state: DrumComputerState) {
  return state.laneOrder.reduce((sum, laneId) => sum + (state.laneSteps[laneId] ?? []).filter((value) => value > 0).length, 0);
}


function cloneStampData(stamp: StampData | null): StampData | null {
  return stamp ? {
    width: stamp.width,
    height: stamp.height,
    data: stamp.data.slice(),
    grainData: stamp.grainData.slice(),
  } : null;
}

function createHistorySnapshot(spectralData: SpectralData) {
  return spectralData.cloneData();
}

function restoreHistorySnapshot(spectralData: SpectralData, snapshot: Float32Array) {
  spectralData.restoreData(snapshot);
}

function drawGrooveGrid(
  ctx: CanvasRenderingContext2D,
  options: {
    steps?: number;
    rows?: number;
    bars?: number;
    exportBars?: number;
    drumPattern?: string;
    bassPattern?: string;
    showGrid?: boolean;
  } = {},
) {
  const { steps = 16, rows = 3, bars = 4, exportBars = 4, drumPattern = '', bassPattern = '', showGrid = true } = options;
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#060913';
  ctx.fillRect(0, 0, width, height);
  const rowH = height / rows;
  const safeBars = Math.max(1, bars);
  const stepsPerBar = Math.max(1, steps / safeBars);
  for (let row = 0; row < rows; row++) {
    for (let step = 0; step < steps; step++) {
      const x = (step / steps) * width;
      const y = row * rowH;
      const barBoundary = step % Math.max(1, Math.round(stepsPerBar)) === 0;
      const strongBeat = step % 4 === 0;
      ctx.strokeStyle = barBoundary
        ? 'rgba(34,211,238,0.42)'
        : strongBeat
          ? 'rgba(34,211,238,0.22)'
          : 'rgba(148,163,184,0.14)';
      ctx.strokeRect(x + 0.5, y + 0.5, width / steps - 1, rowH - 1);
    }
  }
  if (showGrid) {
    ctx.fillStyle = 'rgba(236,254,255,0.82)';
    ctx.font = '11px sans-serif';
    ctx.fillText('Kick / Snare / Bass', 10, 14);
    ctx.fillStyle = 'rgba(34,211,238,0.86)';
    ctx.fillText(`${safeBars} Raster-Takte · Export ${exportBars} · ${drumPattern} · ${bassPattern}`, 10, height - 8);
  } else {
    ctx.fillStyle = 'rgba(148,163,184,0.66)';
    ctx.font = '11px sans-serif';
    ctx.fillText('Raster verborgen – Interpretation bleibt aktiv', 10, 14);
  }
}

function getLoopComposerViewport(state: LoopComposerState) {
  const totalSteps = totalComposerSteps(state);
  const visibleSteps = Math.max(8, Math.min(totalSteps, Math.round(totalSteps / Math.max(1, state.zoom))));
  const maxScroll = Math.max(0, totalSteps - visibleSteps);
  const scrollStart = Math.round(clamp01(state.scrollX) * maxScroll);
  return { totalSteps, visibleSteps, scrollStart, scrollEnd: scrollStart + visibleSteps };
}


type DrumStepRole = {
  kick: boolean;
  snare: boolean;
  hat: boolean;
  accent: boolean;
};

function getDrumStepRole(pattern: string, step: number): DrumStepRole {
  if (pattern === 'trip_hop') return {
    kick: step === 0 || step === 10,
    snare: step === 4 || step === 12,
    hat: step % 2 === 0 || step === 7 || step === 15,
    accent: step === 3 || step === 11,
  };
  if (pattern === 'four_on_floor') return {
    kick: step % 4 === 0,
    snare: step === 4 || step === 12,
    hat: step % 2 === 0 || step === 7 || step === 15,
    accent: false,
  };
  if (pattern === 'breakbeat') return {
    kick: step === 0 || step === 5 || step === 8 || step === 13,
    snare: step === 4 || step === 12,
    hat: step % 2 !== 0 || step === 15,
    accent: step === 11,
  };
  if (pattern === 'idm') return {
    kick: step === 0 || step === 7 || step === 9 || step === 14,
    snare: step === 4 || step === 11,
    hat: step % 3 === 0,
    accent: step === 6 || step === 15,
  };
  if (pattern === 'minimal_techno') return {
    kick: false,
    snare: false,
    hat: step % 2 === 0 || step === 7 || step === 15,
    accent: false,
  };
  if (pattern === 'duststep') return {
    kick: step === 0 || step === 7 || step === 10,
    snare: step === 4 || step === 12,
    hat: [2, 6, 8, 11, 14, 15].includes(step),
    accent: step === 3 || step === 9,
  };
  if (pattern === 'broken_lilt') return {
    kick: step === 0 || step === 6 || step === 11 || step === 14,
    snare: step === 4 || step === 13,
    hat: [1, 3, 7, 9, 12, 15].includes(step),
    accent: step === 8 || step === 10,
  };
  return { kick: false, snare: false, hat: false, accent: false };
}

function drawDrumComputerCanvas(
  ctx: CanvasRenderingContext2D,
  drumComputer: DrumComputerState,
  options: { playheadStep?: number | null } = {},
) {
  const { width, height } = ctx.canvas;
  const headerH = 22;
  const labelW = 72;
  const rows = drumComputer.laneOrder.length;
  const rowH = (height - headerH) / Math.max(1, rows);
  const totalSteps = Math.max(1, drumComputer.stepCount);
  const cellW = (width - labelW) / totalSteps;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#060913';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(236,254,255,0.82)';
  ctx.font = '11px ui-sans-serif, system-ui';
  ctx.fillText(`Drum Computer · ${drumComputer.useCustom ? 'Custom Beat aktiv' : 'Preset routing'} · ${countActiveDrumSteps(drumComputer)} Hits`, 10, 15);
  drumComputer.laneOrder.forEach((laneId, rowIndex) => {
    const y = headerH + rowIndex * rowH;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(DRUM_LANE_LABELS[laneId], 10, y + rowH * 0.64);
    for (let step = 0; step < totalSteps; step += 1) {
      const x = labelW + step * cellW;
      const localStep = step % 16;
      const barBoundary = localStep === 0;
      const beatBoundary = localStep % 4 === 0;
      ctx.strokeStyle = barBoundary ? 'rgba(34,211,238,0.32)' : beatBoundary ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.1)';
      ctx.strokeRect(x + 0.5, y + 0.5, cellW - 1, rowH - 1);
      const value = drumComputer.laneSteps[laneId]?.[step] ?? 0;
      if (value > 0) {
        const inset = 2;
        const alpha = value >= 0.95 ? 0.98 : value >= 0.8 ? 0.82 : 0.58;
        ctx.fillStyle = `${DRUM_LANE_COLORS[laneId]}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.fillRect(x + inset, y + inset, Math.max(2, cellW - inset * 2), Math.max(2, rowH - inset * 2));
      }
    }
  });
  if (options.playheadStep != null && Number.isFinite(options.playheadStep)) {
    const step = Math.max(0, Math.min(totalSteps - 1, Math.floor(options.playheadStep)));
    const x = labelW + step * cellW;
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(x, headerH, Math.max(2, cellW), height - headerH);
  }
}

function hitDrumComputerCanvas(
  canvas: HTMLCanvasElement,
  event: React.MouseEvent<HTMLCanvasElement>,
  drumComputer: DrumComputerState,
) {
  const rect = canvas.getBoundingClientRect();
  const px = (event.clientX - rect.left) / Math.max(1, rect.width);
  const py = (event.clientY - rect.top) / Math.max(1, rect.height);
  const width = canvas.width;
  const height = canvas.height;
  const headerH = 22;
  const labelW = 72;
  const rows = drumComputer.laneOrder.length;
  const rowH = (height - headerH) / Math.max(1, rows);
  const x = px * width;
  const y = py * height;
  if (x < labelW || y < headerH) return null;
  const rowIndex = Math.max(0, Math.min(rows - 1, Math.floor((y - headerH) / Math.max(1, rowH))));
  const cellW = (width - labelW) / Math.max(1, drumComputer.stepCount);
  const step = Math.max(0, Math.min(drumComputer.stepCount - 1, Math.floor((x - labelW) / Math.max(1, cellW))));
  return { laneId: drumComputer.laneOrder[rowIndex], step };
}

function drawLoopComposerCanvas(
  ctx: CanvasRenderingContext2D,
  state: LoopComposerState,
  options: {
    selectedTrackId?: string;
    selectedNoteId?: string | null;
    selectedNoteIds?: string[];
    hoverStepIndex?: number | null;
    hoverGridStep?: number | null;
    playheadStep?: number | null;
    drumPattern?: string;
    exportBars?: number;
    selectionBox?: LoopNoteSelectionBox | null;
    ghostNotes?: LoopGhostNote[];
  } = {},
) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#050816';
  ctx.fillRect(0, 0, width, height);
  const gutterW = 112;
  const headerH = 50;
  const rows = state.pitchSteps.length;
  const rowH = (height - headerH) / Math.max(1, rows);
  const { totalSteps, visibleSteps, scrollStart } = getLoopComposerViewport(state);
  const cellW = (width - gutterW) / Math.max(1, visibleSteps);

  ctx.fillStyle = 'rgba(148,163,184,0.72)';
  ctx.font = '11px sans-serif';
  ctx.fillText('Pitch / Zeit', 12, 17);
  if (options.drumPattern) {
    ctx.fillStyle = 'rgba(34,211,238,0.84)';
    ctx.fillText(`Groove · ${options.drumPattern} · Export ${options.exportBars ?? state.bars} T`, 12, 33);
  }

  for (let step = 0; step <= visibleSteps; step++) {
    const gridStep = scrollStart + step;
    const x = gutterW + step * cellW;
    const strongBeat = gridStep % 4 === 0;
    const barBoundary = gridStep % state.stepsPerBar === 0;
    ctx.strokeStyle = barBoundary
      ? 'rgba(34,211,238,0.34)'
      : strongBeat
        ? 'rgba(148,163,184,0.18)'
        : 'rgba(82,82,91,0.12)';
    ctx.beginPath();
    ctx.moveTo(x + 0.5, headerH);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
    if (step < visibleSteps && gridStep < totalSteps) {
      const label = String(Math.floor(gridStep / state.stepsPerBar) + 1) + '.' + String((gridStep % state.stepsPerBar) + 1).padStart(2, '0');
      if (barBoundary || strongBeat) {
        ctx.fillStyle = barBoundary ? 'rgba(103,232,249,0.8)' : 'rgba(203,213,225,0.56)';
        ctx.fillText(label, x + 4, 16);
      }
    }
  }


  if (options.drumPattern) {
    const laneY = 34;
    const laneH = 10;
    for (let step = 0; step < visibleSteps; step++) {
      const gridStep = scrollStart + step;
      if (gridStep >= totalSteps) continue;
      const localStep = gridStep % 16;
      const x = gutterW + step * cellW + 2;
      const role = getDrumStepRole(options.drumPattern, localStep);
      if (!role.kick && !role.snare && !role.hat && !role.accent) continue;
      ctx.fillStyle = role.kick
        ? 'rgba(56,189,248,0.85)'
        : role.snare
          ? 'rgba(244,114,182,0.82)'
          : role.hat
            ? 'rgba(250,204,21,0.78)'
            : 'rgba(196,181,253,0.76)';
      const markerW = Math.max(3, cellW - 4);
      const markerH = role.kick || role.snare ? laneH : Math.max(4, laneH - 3);
      ctx.fillRect(x, laneY, markerW, markerH);
      if (role.accent) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.strokeRect(x + 0.5, laneY + 0.5, Math.max(2, markerW - 1), markerH - 1);
      }
    }
  }

  state.pitchSteps.forEach((pitchStep, rowIndex) => {
    const y = headerH + rowIndex * rowH;
    ctx.fillStyle = rowIndex % 2 === 0 ? 'rgba(8,12,26,0.92)' : 'rgba(10,15,30,0.98)';
    ctx.fillRect(0, y, width, rowH);
    ctx.strokeStyle = 'rgba(82,82,91,0.18)';
    ctx.beginPath();
    ctx.moveTo(0, y + rowH + 0.5);
    ctx.lineTo(width, y + rowH + 0.5);
    ctx.stroke();
    const triCenterY = y + rowH / 2;
    const triX = 18;
    ctx.beginPath();
    ctx.moveTo(triX, triCenterY);
    ctx.lineTo(triX + 12, triCenterY - 7);
    ctx.lineTo(triX + 12, triCenterY + 7);
    ctx.closePath();
    ctx.fillStyle = pitchStep.muted ? 'rgba(113,113,122,0.55)' : 'rgba(103,232,249,0.9)';
    ctx.fill();
    ctx.fillStyle = pitchStep.muted ? 'rgba(113,113,122,0.75)' : 'rgba(226,232,240,0.88)';
    ctx.font = '11px sans-serif';
    ctx.fillText(pitchStep.label, 36, triCenterY - 2);
    ctx.fillStyle = 'rgba(148,163,184,0.72)';
    const cents = Math.round((pitchStep.cents ?? 0) + (pitchStep.offsetCents ?? 0));
    ctx.fillText(`${cents >= 0 ? '+' : ''}${cents}c`, 36, triCenterY + 11);
  });

  const activeNotes = state.notes.filter((note) => state.activeTrackIds.includes(note.trackId));
  const overlapCount = (candidate: LoopNoteEvent) => activeNotes.filter((note) => note.id !== candidate.id && note.stepId === candidate.stepId && note.startStep < candidate.startStep + candidate.lengthSteps && candidate.startStep < note.startStep + note.lengthSteps).length;

  activeNotes.forEach((note) => {
    const rowIndex = composerStepIndex(state, note.stepId);
    if (rowIndex < 0) return;
    const noteStart = note.startStep;
    const noteEnd = note.startStep + note.lengthSteps;
    if (noteEnd < scrollStart || noteStart > scrollStart + visibleSteps) return;
    const track = composerTrackById(state, note.trackId);
    const x = gutterW + (Math.max(noteStart, scrollStart) - scrollStart) * cellW;
    const visibleLength = Math.min(noteEnd, scrollStart + visibleSteps) - Math.max(noteStart, scrollStart);
    const w = Math.max(6, visibleLength * cellW);
    const y = headerH + rowIndex * rowH + 4;
    const overlap = overlapCount(note);
    const innerH = Math.max(10, rowH - 8 - overlap * 4);
    const selected = note.id === options.selectedNoteId || Boolean(options.selectedNoteIds?.includes(note.id));
    ctx.fillStyle = track.color + (track.id === options.selectedTrackId ? 'dd' : '99');
    ctx.fillRect(x + 1, y + overlap * 2, w - 2, innerH);
    ctx.strokeStyle = selected ? 'rgba(255,255,255,0.92)' : track.color;
    ctx.lineWidth = selected ? 2 : 1;
    ctx.strokeRect(x + 1, y + overlap * 2, w - 2, innerH);
    const fadeInW = Math.min(w * 0.4, note.fadeInSteps * cellW);
    const fadeOutW = Math.min(w * 0.4, note.fadeOutSteps * cellW);
    if (fadeInW > 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(x + 1, y + overlap * 2 + innerH);
      ctx.lineTo(x + 1 + fadeInW, y + overlap * 2 + innerH);
      ctx.lineTo(x + 1 + fadeInW, y + overlap * 2);
      ctx.closePath();
      ctx.fill();
    }
    if (fadeOutW > 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(x + w - 1, y + overlap * 2 + innerH);
      ctx.lineTo(x + w - 1 - fadeOutW, y + overlap * 2 + innerH);
      ctx.lineTo(x + w - 1 - fadeOutW, y + overlap * 2);
      ctx.closePath();
      ctx.fill();
    }
  });

  if (options.ghostNotes?.length) {
    ctx.save();
    ctx.setLineDash([6, 4]);
    options.ghostNotes.forEach((note) => {
      const rowIndex = composerStepIndex(state, note.stepId);
      if (rowIndex < 0) return;
      const noteEnd = note.startStep + note.lengthSteps;
      if (noteEnd < scrollStart || note.startStep > scrollStart + visibleSteps) return;
      const track = composerTrackById(state, note.trackId);
      const x = gutterW + (Math.max(note.startStep, scrollStart) - scrollStart) * cellW;
      const visibleLength = Math.min(noteEnd, scrollStart + visibleSteps) - Math.max(note.startStep, scrollStart);
      const w = Math.max(6, visibleLength * cellW);
      const y = headerH + rowIndex * rowH + 8;
      const h = Math.max(8, rowH - 16);
      ctx.fillStyle = track.color + '22';
      ctx.fillRect(x + 1, y, w - 2, h);
      ctx.strokeStyle = track.color + 'aa';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 1, y, w - 2, h);
    });
    ctx.restore();
  }

  if (options.selectionBox) {
    const box = options.selectionBox;
    const x = gutterW + (box.startStep - scrollStart) * cellW;
    const w = Math.max(cellW, (box.endStep - box.startStep + 1) * cellW);
    const y = headerH + box.startStepIndex * rowH;
    const h = Math.max(rowH, (box.endStepIndex - box.startStepIndex + 1) * rowH);
    ctx.fillStyle = 'rgba(125,211,252,0.12)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(125,211,252,0.72)';
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x + 0.5, y + 0.5, Math.max(1, w - 1), Math.max(1, h - 1));
    ctx.setLineDash([]);
  }

  if (options.hoverStepIndex != null && options.hoverGridStep != null && options.hoverStepIndex >= 0) {
    const y = headerH + options.hoverStepIndex * rowH;
    const x = gutterW + (options.hoverGridStep - scrollStart) * cellW;
    ctx.strokeStyle = 'rgba(255,255,255,0.42)';
    ctx.strokeRect(x + 1.5, y + 1.5, cellW - 3, rowH - 3);
  }

  if (options.playheadStep != null && Number.isFinite(options.playheadStep)) {
    const x = gutterW + (options.playheadStep - scrollStart) * cellW;
    if (x >= gutterW && x <= width) {
      ctx.strokeStyle = 'rgba(34,197,94,0.94)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, headerH);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }
  }
}

function drawSpectralCanvas(ctx: CanvasRenderingContext2D, spectralData: SpectralData, widthPx: number, heightPx: number, playheadPosition: number, hoveredCell: { x: number; y: number } | null, brushSizePx: number, statusText: string, overlays?: { stampSelection?: { x0: number; y0: number; x1: number; y1: number } | null; stampPreview?: { centerX: number; centerY: number; halfW: number; halfH: number; outW: number; outH: number; stampData: StampData; transform: { scaleX: number; scaleY: number; rotation: number; flipX: boolean; flipY: boolean } } | null }) {
  const width = spectralData.width;
  const height = spectralData.height;
  const image = ctx.createImageData(widthPx, heightPx);
  const out = image.data;
  for (let py = 0; py < heightPx; py++) {
    const sy = Math.floor((py / heightPx) * height);
    for (let px = 0; px < widthPx; px++) {
      const sx = Math.floor((px / widthPx) * width);
      const value = clamp01(spectralData.data[sy * width + sx] ?? 0);
      const idx = (py * widthPx + px) * 4;
      const lutIdx = Math.max(0, Math.min(255, Math.round(value * 255)));
      out[idx] = LUT[lutIdx * 3];
      out[idx + 1] = LUT[lutIdx * 3 + 1];
      out[idx + 2] = LUT[lutIdx * 3 + 2];
      out[idx + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  ctx.strokeStyle = 'rgba(34,211,238,0.16)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    const x = (i / 8) * widthPx;
    ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, heightPx); ctx.stroke();
  }
  for (let i = 1; i < 6; i++) {
    const y = (i / 6) * heightPx;
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(widthPx, y + 0.5); ctx.stroke();
  }
  const playX = Math.max(0, Math.min(widthPx - 1, playheadPosition * widthPx));
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.95)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(playX + 0.5, 0);
  ctx.lineTo(playX + 0.5, heightPx);
  ctx.stroke();

  if (hoveredCell) {
    const x = (hoveredCell.x / width) * widthPx;
    const y = (hoveredCell.y / height) * heightPx;
    ctx.strokeStyle = 'rgba(244, 244, 245, 0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, brushSizePx, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (overlays?.stampSelection) {
    const { x0, y0, x1, y1 } = overlays.stampSelection;
    const left = (Math.min(x0, x1) / width) * widthPx;
    const right = ((Math.max(x0, x1) + 1) / width) * widthPx;
    const top = (Math.min(y0, y1) / height) * heightPx;
    const bottom = ((Math.max(y0, y1) + 1) / height) * heightPx;
    ctx.fillStyle = 'rgba(34, 211, 238, 0.14)';
    ctx.fillRect(left, top, Math.max(1, right - left), Math.max(1, bottom - top));
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.96)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([8, 5]);
    ctx.strokeRect(left + 0.5, top + 0.5, Math.max(1, right - left - 1), Math.max(1, bottom - top - 1));
    ctx.setLineDash([]);
  }

  if (overlays?.stampPreview) {
    const { centerX, centerY, halfW, halfH, outW, outH, stampData, transform } = overlays.stampPreview;
    const left = ((centerX - halfW) / width) * widthPx;
    const right = ((centerX + halfW) / width) * widthPx;
    const top = ((centerY - halfH) / height) * heightPx;
    const bottom = ((centerY + halfH) / height) * heightPx;
    const drawW = Math.max(1, right - left);
    const drawH = Math.max(1, bottom - top);

    if (outW > 1 && outH > 1 && drawW > 1 && drawH > 1) {
      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = outW;
      previewCanvas.height = outH;
      const pctx = previewCanvas.getContext('2d');
      if (pctx) {
        const previewImage = pctx.createImageData(outW, outH);
        const pdata = previewImage.data;
        for (let dy = 0; dy < outH; dy++) {
          for (let dx = 0; dx < outW; dx++) {
            const sample = spectralData.sampleStampTransformed(stampData, dx - halfW, dy - halfH, transform);
            const val = clamp01(sample.amp);
            if (val <= 0.01) continue;
            const lutIdx = Math.max(0, Math.min(255, Math.round(val * 255)));
            const pIdx = (dy * outW + dx) * 4;
            pdata[pIdx] = LUT[lutIdx * 3];
            pdata[pIdx + 1] = LUT[lutIdx * 3 + 1];
            pdata[pIdx + 2] = LUT[lutIdx * 3 + 2];
            pdata[pIdx + 3] = 118;
          }
        }
        pctx.putImageData(previewImage, 0, 0);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(previewCanvas, left, top, drawW, drawH);
        ctx.restore();
      }
    }

    ctx.fillStyle = 'rgba(34, 211, 238, 0.10)';
    ctx.fillRect(left, top, drawW, drawH);
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.95)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(left + 0.5, top + 0.5, Math.max(1, drawW - 1), Math.max(1, drawH - 1));
    ctx.setLineDash([]);
  }

  if (statusText) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(8, 8, Math.min(widthPx - 16, Math.max(180, statusText.length * 6.5)), 20);
    ctx.fillStyle = 'rgba(236, 254, 255, 0.95)';
    ctx.font = '12px sans-serif';
    ctx.fillText(statusText, 14, 22);
  }
}

function drawSmallView(ctx: CanvasRenderingContext2D, data: Float32Array, width: number, height: number, targetW: number, targetH: number, selected: boolean) {
  const image = ctx.createImageData(targetW, targetH);
  const out = image.data;
  for (let py = 0; py < targetH; py++) {
    const sy = Math.floor((py / targetH) * height);
    for (let px = 0; px < targetW; px++) {
      const sx = Math.floor((px / targetW) * width);
      const value = clamp01(data[sy * width + sx] ?? 0);
      const idx = (py * targetW + px) * 4;
      const lutIdx = Math.max(0, Math.min(255, Math.round(value * 255)));
      out[idx] = LUT[lutIdx * 3];
      out[idx + 1] = LUT[lutIdx * 3 + 1];
      out[idx + 2] = LUT[lutIdx * 3 + 2];
      out[idx + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  ctx.strokeStyle = selected ? 'rgba(34,211,238,1)' : 'rgba(255,255,255,0.22)';
  ctx.lineWidth = selected ? 2 : 1;
  ctx.strokeRect(0.5, 0.5, targetW - 1, targetH - 1);
}


function renderWaveformRegion(
  ctx: CanvasRenderingContext2D,
  source: AudioSourceAsset,
  targetWidth: number,
  targetHeight: number,
  rangeStartSec: number,
  rangeDurationSec: number,
  highlightStartSec?: number,
  highlightDurationSec?: number,
  playheadSec?: number | null,
  playheadColor = 'rgba(250, 204, 21, 0.95)',
) {
  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.fillStyle = '#060913';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  const midY = targetHeight * 0.5;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(targetWidth, midY);
  ctx.stroke();

  const sampleRate = source.sampleRate;
  const totalStartSample = Math.max(0, Math.floor(rangeStartSec * sampleRate));
  const totalSamples = Math.max(1, Math.floor(rangeDurationSec * sampleRate));
  const maxSample = Math.min(source.monoSamples.length, totalStartSample + totalSamples);

  if (highlightStartSec != null && highlightDurationSec != null && rangeDurationSec > 0) {
    const relStart = (highlightStartSec - rangeStartSec) / rangeDurationSec;
    const relEnd = (highlightStartSec + highlightDurationSec - rangeStartSec) / rangeDurationSec;
    const leftClipped = relStart < 0;
    const rightClipped = relEnd > 1;
    const left = Math.floor(Math.max(0, relStart) * targetWidth);
    const right = Math.ceil(Math.min(1, relEnd) * targetWidth);
    if (right > left) {
      ctx.fillStyle = 'rgba(34, 211, 238, 0.12)';
      ctx.fillRect(left, 0, right - left, targetHeight);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.82)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(left + 0.5, 0.5, Math.max(1, right - left - 1), targetHeight - 1);
      if (leftClipped || rightClipped) {
        ctx.save();
        ctx.strokeStyle = 'rgba(103, 232, 249, 0.95)';
        ctx.fillStyle = 'rgba(103, 232, 249, 0.95)';
        ctx.lineWidth = 1.5;
        const markerHalf = Math.max(5, Math.min(10, targetHeight * 0.18));
        const drawEdgeMarker = (x: number, dir: 'left' | 'right') => {
          const tip = dir === 'left' ? 0 : targetWidth;
          const inner = dir === 'left' ? x + markerHalf : x - markerHalf;
          ctx.beginPath();
          ctx.moveTo(tip, midY);
          ctx.lineTo(inner, midY - markerHalf);
          ctx.lineTo(inner, midY + markerHalf);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x, 2);
          ctx.lineTo(x, targetHeight - 2);
          ctx.stroke();
        };
        if (leftClipped) drawEdgeMarker(1.5, 'left');
        if (rightClipped) drawEdgeMarker(targetWidth - 1.5, 'right');
        ctx.restore();
      }
    }
  }

  ctx.strokeStyle = 'rgba(248, 250, 252, 0.92)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < targetWidth; x++) {
    const start = totalStartSample + Math.floor((x / targetWidth) * totalSamples);
    const end = Math.max(start + 1, totalStartSample + Math.floor(((x + 1) / targetWidth) * totalSamples));
    let peak = 0;
    for (let i = start; i < end && i < maxSample; i++) {
      const abs = Math.abs(source.monoSamples[i] ?? 0);
      if (abs > peak) peak = abs;
    }
    const yTop = midY - peak * (targetHeight * 0.42);
    const yBottom = midY + peak * (targetHeight * 0.42);
    ctx.moveTo(x + 0.5, yTop);
    ctx.lineTo(x + 0.5, yBottom);
  }
  ctx.stroke();

  if (playheadSec != null && Number.isFinite(playheadSec) && rangeDurationSec > 0) {
    const rel = (playheadSec - rangeStartSec) / rangeDurationSec;
    if (rel >= 0 && rel <= 1) {
      const x = Math.max(0.5, Math.min(targetWidth - 0.5, rel * targetWidth));
      ctx.strokeStyle = playheadColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, targetHeight);
      ctx.stroke();
    }
  }
}



type SelectionDragMode = 'move' | 'resize-start' | 'resize-end';

type DetailSelectionDrag = {
  mode: 'new' | SelectionDragMode;
  startSec: number;
  durationSec: number;
  anchorTime: number;
};

function clampSelectionBounds(startSec: number, durationSec: number, maxDuration: number, minDuration = 0.05) {
  const safeDuration = Math.max(minDuration, Math.min(durationSec, maxDuration));
  const safeStart = Math.max(0, Math.min(maxDuration - safeDuration, startSec));
  return { startSec: safeStart, durationSec: safeDuration };
}

function buildDetailViewport(startSec: number, durationSec: number, maxDuration: number, paddingFactor = 2.2) {
  const safeDuration = Math.max(0.15, Math.min(maxDuration, durationSec * paddingFactor));
  const center = startSec + durationSec * 0.5;
  return clampSelectionBounds(center - safeDuration * 0.5, safeDuration, maxDuration, 0.15);
}

async function buildAuditionMixedLoopBuffer(
  ctx: AudioContext,
  source: AudioSourceAsset,
  startSec: number,
  durationSec: number,
  overlay: { audioEngine: typeof audioEngine; spectralData: SpectralData; synthMode: SynthMode; waveformMix: WaveformMix; amount: number } | null,
  crossfadeMs = 24,
) {
  const base = buildLoopPreviewBuffer(ctx, source, startSec, durationSec, crossfadeMs);
  if (!overlay || overlay.amount <= 0.0001) return base;
  const rendered = await overlay.audioEngine.renderToBuffer(overlay.spectralData, overlay.synthMode, overlay.waveformMix);
  const out = ctx.createBuffer(1, base.length, base.sampleRate);
  const baseData = base.getChannelData(0);
  const renderData = rendered.getChannelData(0);
  const mixed = out.getChannelData(0);
  const wet = Math.max(0, Math.min(0.45, overlay.amount));
  const dryGain = Math.sqrt(1 - wet);
  const wetGain = Math.sqrt(wet) * 0.78;
  for (let i = 0; i < mixed.length; i += 1) {
    const renderIndex = Math.min(renderData.length - 1, Math.floor((i / Math.max(1, mixed.length - 1)) * Math.max(0, renderData.length - 1)));
    mixed[i] = baseData[i] * dryGain + renderData[renderIndex] * wetGain;
  }
  let maxAmp = 0;
  for (let i = 0; i < mixed.length; i += 1) maxAmp = Math.max(maxAmp, Math.abs(mixed[i]));
  if (maxAmp > 0.98) {
    const gain = 0.98 / maxAmp;
    for (let i = 0; i < mixed.length; i += 1) mixed[i] *= gain;
  }
  return out;
}

async function buildAuditionSelectionBuffer(
  ctx: AudioContext,
  source: AudioSourceAsset,
  startSec: number,
  durationSec: number,
  overlay: { audioEngine: typeof audioEngine; spectralData: SpectralData; synthMode: SynthMode; waveformMix: WaveformMix; amount: number } | null,
) {
  const base = buildDirectSourceSelectionBuffer(ctx, source, startSec, durationSec);
  if (!overlay || overlay.amount <= 0.0001) return base;
  const rendered = await overlay.audioEngine.renderToBuffer(overlay.spectralData, overlay.synthMode, overlay.waveformMix);
  const out = ctx.createBuffer(base.numberOfChannels, base.length, base.sampleRate);
  const wet = Math.max(0, Math.min(0.45, overlay.amount));
  const dryGain = Math.sqrt(1 - wet);
  const wetGain = Math.sqrt(wet) * 0.78;
  let maxAmp = 0;
  for (let channel = 0; channel < out.numberOfChannels; channel += 1) {
    const baseData = base.getChannelData(channel);
    const renderData = rendered.getChannelData(Math.min(channel, rendered.numberOfChannels - 1));
    const mixed = out.getChannelData(channel);
    for (let i = 0; i < mixed.length; i += 1) {
      const renderIndex = Math.min(renderData.length - 1, Math.floor((i / Math.max(1, mixed.length - 1)) * Math.max(0, renderData.length - 1)));
      mixed[i] = baseData[i] * dryGain + renderData[renderIndex] * wetGain;
      maxAmp = Math.max(maxAmp, Math.abs(mixed[i]));
    }
  }
  if (maxAmp > 0.98) {
    const gain = 0.98 / maxAmp;
    for (let channel = 0; channel < out.numberOfChannels; channel += 1) {
      const mixed = out.getChannelData(channel);
      for (let i = 0; i < mixed.length; i += 1) mixed[i] *= gain;
    }
  }
  return out;
}

function buildSelectionLoopSeamScore(source: AudioSourceAsset, startSec: number, durationSec: number) {
  const startSample = Math.max(0, Math.floor(startSec * source.sampleRate));
  const sampleCount = Math.max(1, Math.floor(durationSec * source.sampleRate));
  const endSample = Math.min(source.monoSamples.length, startSample + sampleCount);
  const actualCount = Math.max(1, endSample - startSample);
  const edgeSamples = Math.max(32, Math.min(Math.floor(source.sampleRate * 0.03), Math.max(32, Math.floor(actualCount * 0.12))));
  let diffSum = 0;
  let energySum = 0;
  let count = 0;
  for (let i = 0; i < edgeSamples && startSample + i < endSample && endSample - edgeSamples + i >= startSample; i++) {
    const a = source.monoSamples[startSample + i] ?? 0;
    const b = source.monoSamples[endSample - edgeSamples + i] ?? 0;
    const diff = a - b;
    diffSum += diff * diff;
    energySum += (a * a + b * b) * 0.5;
    count++;
  }
  if (count === 0) return 0;
  const rmsDiff = Math.sqrt(diffSum / count);
  const rmsEnergy = Math.sqrt(Math.max(1e-8, energySum / count));
  return clamp01(1 - rmsDiff / Math.max(0.02, rmsEnergy * 1.15));
}

function buildLoopPreviewBuffer(ctx: AudioContext, source: AudioSourceAsset, startSec: number, durationSec: number, crossfadeMs = 24) {
  const sampleRate = source.sampleRate;
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const requestedSamples = Math.max(1, Math.floor(durationSec * sampleRate));
  const endSample = Math.min(source.monoSamples.length, startSample + requestedSamples);
  const frameCount = Math.max(1, endSample - startSample);
  const channelCount = source.channelCount >= 2 ? 2 : 1;
  const buffer = ctx.createBuffer(channelCount, frameCount, sampleRate);
  const fadeSamples = Math.max(16, Math.min(Math.floor(frameCount * 0.12), Math.floor(sampleRate * (crossfadeMs / 1000))));

  const copyChannel = (dest: Float32Array, src: Float32Array) => {
    for (let i = 0; i < frameCount; i++) dest[i] = src[startSample + i] ?? 0;
    if (fadeSamples * 2 >= frameCount) return;
    for (let i = 0; i < fadeSamples; i++) {
      const t = fadeSamples <= 1 ? 1 : i / (fadeSamples - 1);
      const startIdx = i;
      const endIdx = frameCount - fadeSamples + i;
      const a = dest[startIdx] ?? 0;
      const b = dest[endIdx] ?? 0;
      const mixStart = a * (1 - t) + b * t;
      const mixEnd = b * (1 - t) + a * t;
      dest[startIdx] = mixStart;
      dest[endIdx] = mixEnd;
    }
  };

  copyChannel(buffer.getChannelData(0), source.leftSamples.length > 0 ? source.leftSamples : source.monoSamples);
  if (channelCount > 1) {
    copyChannel(buffer.getChannelData(1), source.rightSamples.length > 0 ? source.rightSamples : source.leftSamples);
  }
  return buffer;
}


function buildDirectSourceSelectionBuffer(ctx: AudioContext, source: AudioSourceAsset, startSec: number, durationSec: number) {
  const sampleRate = source.sampleRate;
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const requestedSamples = Math.max(1, Math.floor(durationSec * sampleRate));
  const endSample = Math.min(source.monoSamples.length, startSample + requestedSamples);
  const frameCount = Math.max(1, endSample - startSample);
  const channelCount = source.channelCount >= 2 ? 2 : 1;
  const buffer = ctx.createBuffer(channelCount, frameCount, sampleRate);

  const copyChannel = (dest: Float32Array, src: Float32Array) => {
    for (let i = 0; i < frameCount; i += 1) dest[i] = src[startSample + i] ?? 0;
  };

  copyChannel(buffer.getChannelData(0), source.leftSamples.length > 0 ? source.leftSamples : source.monoSamples);
  if (channelCount > 1) {
    copyChannel(buffer.getChannelData(1), source.rightSamples.length > 0 ? source.rightSamples : source.leftSamples);
  }
  return buffer;
}

function encodeAudioBufferToWav(buffer: AudioBuffer) {
  const channels = Math.max(1, buffer.numberOfChannels || 1);
  const frameCount = Math.max(1, buffer.length || 1);
  const sampleRate = buffer.sampleRate || 44100;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const wav = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wav);
  const writeAscii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataSize, true);
  let offset = 44;
  const channelData = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  for (let i = 0; i < frameCount; i += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel]?.[i] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([wav], { type: 'audio/wav' });
}

async function buildTransferBlob(args: {
  transferMode: TransferMode;
  spectralData: SpectralData;
  synthMode: SynthMode;
  waveformMix: WaveformMix;
  rawSourceAsset: AudioSourceAsset | null;
  selectionStartSec: number;
  selectionDurationSec: number;
  sourceView: CanonicalSourceView;
  activeWorkspace: CanonicalForgeWorkspace;
}) {
  if (args.transferMode === 'source-direct' && args.rawSourceAsset && hasPlayableSource(args.rawSourceAsset)) {
    const ctx = new AudioContext({ sampleRate: args.rawSourceAsset.sampleRate });
    try {
      const buffer = buildDirectSourceSelectionBuffer(ctx, args.rawSourceAsset, args.selectionStartSec, args.selectionDurationSec);
      return {
        blob: encodeAudioBufferToWav(buffer),
        sourceVersion: 'source-direct-v1',
        renderMode: `source-direct:${args.sourceView}:${args.activeWorkspace}`,
      };
    } finally {
      void ctx.close().catch(() => {});
    }
  }

  const blob = await audioEngine.exportWAV(args.spectralData, args.synthMode, args.waveformMix);
  return {
    blob,
    sourceVersion: CANONICAL_PRODUCER.version,
    renderMode: `${args.synthMode}:${args.sourceView}:${args.activeWorkspace}`,
  };
}


function estimateLoopAutocorrect(source: AudioSourceAsset, startSec: number, durationSec: number): LoopAutocorrectSuggestion {
  return estimateLoopSnapSuggestion(source, startSec, durationSec);
}

export function CanonicalForgeRoom({ onBack }: { onBack: () => void }) {
  const initialSession = getCanonicalForgeSession();
  const [materialExport, setMaterialExport] = useState<MaterialExportConfig>(() => initialSession?.materialExport ? { ...DEFAULT_EXPORT, ...initialSession.materialExport, transferMode: initialSession.materialExport.transferMode ?? DEFAULT_EXPORT.transferMode, guideMarkers: [...initialSession.materialExport.guideMarkers] } : DEFAULT_EXPORT);
  const [rawSourceAsset, setRawSourceAsset] = useState<AudioSourceAsset | null>(() => initialSession?.rawSourceAsset ?? null);
  const [sourceAsset, setSourceAsset] = useState<AudioSourceAsset | null>(() => initialSession?.sourceAsset ?? null);
  const [bundle, setBundle] = useState<CanonicalAnalysisBundle | null>(() => initialSession?.bundle ?? null);
  const [spectralData, setSpectralData] = useState<SpectralData>(() => {
    const next = makeEmptySpectral();
    if (initialSession?.spectralSnapshot) next.restoreData(initialSession.spectralSnapshot);
    return next;
  });
  const [sourceView, setSourceView] = useState<CanonicalSourceView>(() => initialSession?.sourceView ?? 'synesthetic');
  const [secondaryView, setSecondaryView] = useState<CanonicalSourceView | 'none'>(() => initialSession?.secondaryView ?? 'harmonic');
  const [viewBlend, setViewBlend] = useState(() => initialSession?.viewBlend ?? 0.26);
  const [activeTool, setActiveTool] = useState<CanonicalTool>(() => initialSession?.activeTool ?? 'sourceTrace');
  const [brushSize, setBrushSize] = useState(() => initialSession?.toolSettings.brushSize ?? DEFAULT_TOOL_SETTINGS.brushSize);
  const [intensity, setIntensity] = useState(() => initialSession?.toolSettings.intensity ?? DEFAULT_TOOL_SETTINGS.intensity);
  const [hardness, setHardness] = useState(() => initialSession?.toolSettings.hardness ?? DEFAULT_TOOL_SETTINGS.hardness);
  const [eraseMode, setEraseMode] = useState(() => initialSession?.toolSettings.eraseMode ?? DEFAULT_TOOL_SETTINGS.eraseMode);
  const [morphMode, setMorphMode] = useState<MorphMode>(() => initialSession?.toolSettings.morphMode ?? DEFAULT_TOOL_SETTINGS.morphMode);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sourcePreviewMode, setSourcePreviewMode] = useState<SourcePreviewMode>(() => initialSession?.sourcePreviewMode ?? 'sourceWindow');
  const [activeWorkspace, setActiveWorkspace] = useState<CanonicalForgeWorkspace>(() => ((initialSession as any)?.activeWorkspace ?? 'wave-material') as CanonicalForgeWorkspace);
  const [status, setStatus] = useState(() => initialSession?.status ?? 'Canonical Forge 2: Audio-first, source-aware, exportiert über dieselbe Brücke.');
  const [logicView, setLogicView] = useState<CanonicalLogicView>(() => (((initialSession as any)?.logicView ?? 'drums') as CanonicalLogicView));
  const [busy, setBusy] = useState(false);
  const [synthMode, setSynthMode] = useState<SynthMode>(() => initialSession?.synthMode ?? 'glyph');
  const [waveformMix, setWaveformMix] = useState<WaveformMix>(() => initialSession?.waveformMix ? { ...initialSession.waveformMix } : DEFAULT_WAVEFORM_MIX);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [revision, setRevision] = useState(0);
  const [stampPresetId, setStampPresetId] = useState(() => initialSession?.stampPresetId ?? '');
  const [stampData, setStampData] = useState<StampData | null>(() => initialSession?.stampData ? cloneStampData(initialSession.stampData) : null);
  const [stampScaleX, setStampScaleX] = useState(() => initialSession?.stampScaleX ?? 1);
  const [stampScaleY, setStampScaleY] = useState(() => initialSession?.stampScaleY ?? 1);
  const [stampRotation, setStampRotation] = useState(() => initialSession?.stampRotation ?? 0);
  const [stampFlipX, setStampFlipX] = useState(() => initialSession?.stampFlipX ?? false);
  const [stampFlipY, setStampFlipY] = useState(() => initialSession?.stampFlipY ?? false);
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionStartSec, setSelectionStartSec] = useState(() => initialSession?.selectionStartSec ?? 0);
  const [selectionDurationSec, setSelectionDurationSec] = useState(() => initialSession?.selectionDurationSec ?? 10);
  const [selectionDirty, setSelectionDirty] = useState(() => initialSession?.selectionDirty ?? false);
  const [detailSelectionStartSec, setDetailSelectionStartSec] = useState(() => initialSession?.detailSelectionStartSec ?? (initialSession?.selectionStartSec ?? 0));
  const [detailSelectionDurationSec, setDetailSelectionDurationSec] = useState(() => initialSession?.detailSelectionDurationSec ?? (initialSession?.selectionDurationSec ?? 10));
  const [detailSelectionDirty, setDetailSelectionDirty] = useState(() => initialSession?.detailSelectionDirty ?? false);
  const [detailViewportStartSec, setDetailViewportStartSec] = useState(() => (initialSession as any)?.detailViewportStartSec ?? (initialSession?.selectionStartSec ?? 0));
  const [detailViewportDurationSec, setDetailViewportDurationSec] = useState(() => (initialSession as any)?.detailViewportDurationSec ?? Math.max(initialSession?.selectionDurationSec ?? 10, 0.5));
  const [detailZoom, setDetailZoom] = useState(() => initialSession?.detailZoom ?? 1);
  const [detailOffset, setDetailOffset] = useState(() => initialSession?.detailOffset ?? 0);
  const [auditionView, setAuditionView] = useState<CanonicalSourceView | 'none'>(() => ((initialSession as any)?.auditionView ?? 'none') as CanonicalSourceView | 'none');
  const [auditionBlendAmount, setAuditionBlendAmount] = useState(() => (initialSession as any)?.auditionBlendAmount ?? 0);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => initialSession?.selectedProjectId ?? null);
  const [grooveMachine, setGrooveMachine] = useState<GrooveMachineConfig>(() => initialSession?.grooveMachine ?? DEFAULT_GROOVE_MACHINE);
  const [drumComputer, setDrumComputer] = useState<DrumComputerState>(() => {
    const sessionDrums = (initialSession as any)?.drumComputer as DrumComputerState | undefined;
    return sessionDrums ? cloneDrumComputerState(resizeDrumComputerState(sessionDrums, initialSession?.grooveMachine?.barsInterpretation ?? DEFAULT_GROOVE_MACHINE.barsInterpretation)) : createEmptyDrumComputer(initialSession?.grooveMachine?.barsInterpretation ?? DEFAULT_GROOVE_MACHINE.barsInterpretation);
  });
  const [loopComposer, setLoopComposer] = useState<LoopComposerState>(() => initialSession?.loopComposer
    ? cloneLoopComposerState(initialSession.loopComposer as LoopComposerState)
    : buildLoopComposerFromPresets(
        initialSession?.grooveMachine?.bassPattern ?? DEFAULT_GROOVE_MACHINE.bassPattern,
        createEmptyLoopComposer(initialSession?.grooveMachine?.barsInterpretation ?? DEFAULT_GROOVE_MACHINE.barsInterpretation),
      ));
  const [composerHover, setComposerHover] = useState<{ stepIndex: number | null; gridStep: number | null }>({ stepIndex: null, gridStep: null });
  const [selectedLoopNoteIds, setSelectedLoopNoteIds] = useState<string[]>(() => (initialSession as any)?.selectedLoopNoteIds ?? []);
  const [composerSelectionBox, setComposerSelectionBox] = useState<LoopNoteSelectionBox | null>(null);
  const [showChordGhost, setShowChordGhost] = useState(false);
  const [autoZoomOnDenseOverlap, setAutoZoomOnDenseOverlap] = useState(() => (initialSession as any)?.autoZoomOnDenseOverlap ?? true);
  const [lockTrackEditing, setLockTrackEditing] = useState(() => (initialSession as any)?.lockTrackEditing ?? false);
  const [chordVoicing, setChordVoicing] = useState<ChordVoicing>(() => (initialSession as any)?.chordVoicing ?? 'triad');
  const [chordStrumSteps, setChordStrumSteps] = useState(() => (initialSession as any)?.chordStrumSteps ?? 0);
  const [chordVelocitySlope, setChordVelocitySlope] = useState(() => (initialSession as any)?.chordVelocitySlope ?? 0.08);
  const [, setDenseOverlapWarning] = useState<{ stepId: string; gridStep: number; count: number } | null>(null);
  const [pendingImageImport, setPendingImageImport] = useState<PendingImageImport | null>(null);
  const [lastAutoCorrect, setLastAutoCorrect] = useState<LoopAutocorrectSuggestion | null>(null);
  const [clipPreviewStep, setClipPreviewStep] = useState<number | null>(null);
  const [selectionLoopPreviewPlaying, setSelectionLoopPreviewPlaying] = useState(false);
  const [selectionLoopPreviewPlayheadSec, setSelectionLoopPreviewPlayheadSec] = useState<number | null>(null);
  const [stampPhase, setStampPhase] = useState<StampPhase>(() => initialSession?.stampData ? 'stamping' : 'idle');
  const [stampSelStart, setStampSelStart] = useState<{ x: number; y: number } | null>(null);

  const forgeRootRef = useRef<HTMLElement | null>(null);
  const forgeHotkeyScopeActiveRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourcePreviewRef = useRef<HTMLCanvasElement>(null);
  const sourceDetailRef = useRef<HTMLCanvasElement>(null);
  const sourceDetailPlaystripRef = useRef<HTMLCanvasElement>(null);
  const detailSelectionDragRef = useRef<DetailSelectionDrag | null>(null);
  const grooveGridRef = useRef<HTMLCanvasElement>(null);
  const drumComputerRef = useRef<HTMLCanvasElement>(null);
  const clipComposerRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageImportPreviewRef = useRef<HTMLCanvasElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const viewCanvasesRef = useRef<Record<string, HTMLCanvasElement | null>>({});
  const selectionLoopPreviewCtxRef = useRef<AudioContext | null>(null);
  const selectionLoopPreviewSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const selectionLoopPreviewGainRef = useRef<GainNode | null>(null);
  const selectionLoopPreviewStartTimeRef = useRef(0);
  const selectionLoopPreviewDurationRef = useRef(0);
  const selectionLoopPreviewAnimationRef = useRef<number | null>(null);
  const sourceAuditionCtxRef = useRef<AudioContext | null>(null);
  const sourceAuditionSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const sourceAuditionGainRef = useRef<GainNode | null>(null);
  const sourceAuditionStartTimeRef = useRef(0);
  const sourceAuditionDurationRef = useRef(0);
  const sourceAuditionAnimationRef = useRef<number | null>(null);
  const sourceAuditionModeRef = useRef<'sourceWindow' | 'sourceFull' | null>(null);
  const stampSelEndRef = useRef<{ x: number; y: number } | null>(null);
  const isStampSelectingRef = useRef(false);
  const stampLoadedModeRef = useRef<'positive' | 'erase'>((initialSession?.toolSettings.eraseMode ?? DEFAULT_TOOL_SETTINGS.eraseMode) ? 'erase' : 'positive');
  const stampArrowHoldRef = useRef<Record<string, number>>({});
  const mouseClientRef = useRef<{ x: number; y: number } | null>(null);
  const drawingRef = useRef(false);
  const lastCellRef = useRef<{ x: number; y: number } | null>(null);
  const selectionDragRef = useRef<{ mode: SelectionDragMode; startSec: number; durationSec: number; anchorTime: number } | null>(null);
  const composerDragRef = useRef<{ type: 'note-move' | 'note-resize-start' | 'note-resize-end' | 'pitch-drag' | 'paint' | 'box-select'; noteId?: string; originStep?: number; originPitchIndex?: number; startStep?: number; lengthSteps?: number; offsetCents?: number; pointerStartX?: number; pointerStartY?: number; paintTrackId?: string; lastPaintSignature?: string; boxAnchorStep?: number; boxAnchorStepIndex?: number } | null>(null);
  const undoStackRef = useRef<Float32Array[]>([]);
  const redoStackRef = useRef<Float32Array[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);
  const materialEntries = useMaterialLibrary((s) => s.entries);
  const customStampEntries = useCustomStampLibrary((s) => s.entries);
  const canonicalProjects = useCanonicalForgeProjectLibrary((s) => s.entries);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [selectedStampId, setSelectedStampId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState(() => initialSession?.materialExport.name ?? DEFAULT_EXPORT.name);
  const [customStampName, setCustomStampName] = useState('');
  const [materialRenameDraft, setMaterialRenameDraft] = useState('');

  const adapters = useForgeMaterialAdapters();
  const selectedAdapter = useMemo(() => getForgeMaterialAdapter(materialExport.adapterId), [materialExport.adapterId, adapters]);
  const activeHandoffProfile = useMemo(() => buildMachineRoomHandoffProfile({ role: materialExport.role, workspaceOrigin: activeWorkspace }), [materialExport.role, activeWorkspace]);
  const activeWorkspaceDef = useMemo(() => getForge2WorkspaceDefinition(activeWorkspace as Forge2WorkspaceId), [activeWorkspace]);
  const loopDurationSec = useMemo(() => computeLoopDurationSec(materialExport.bars, materialExport.bpm), [materialExport.bars, materialExport.bpm]);
  const visibleDrumComputer = useMemo(() => (drumComputer.useCustom ? drumComputer : drumPatternMatrixToState(grooveMachine.drumPattern, buildVisibleDrumPatternMatrix({ pattern: grooveMachine.drumPattern as DrumPattern, bars: grooveMachine.barsInterpretation }), false)), [drumComputer, grooveMachine.drumPattern, grooveMachine.barsInterpretation]);
  const melodicPreviewNotes = useMemo(() => {
    const bassNotes = loopComposer.notes.filter((note) => note.trackId === 'bass');
    if (bassNotes.length > 0) return bassNotes.slice().sort((a, b) => a.startStep - b.startStep);
    const seeded = cloneLoopComposerState(loopComposer);
    seeded.notes = [];
    return buildBassPatternNotes(grooveMachine.bassPattern, seeded).sort((a, b) => a.startStep - b.startStep);
  }, [loopComposer, grooveMachine.bassPattern]);
  const logicWindowAnchor = useMemo(() => {
    const index = Math.floor(loopComposer.pitchSteps.length / 2);
    return loopComposer.pitchSteps[index]?.label ?? '—';
  }, [loopComposer.pitchSteps]);

  const selectedMaterial = useMemo(() => materialEntries.find((entry) => entry.id === selectedMaterialId) ?? null, [materialEntries, selectedMaterialId]);
  const selectedCustomStamp = useMemo(() => customStampEntries.find((entry) => entry.id === selectedStampId) ?? null, [customStampEntries, selectedStampId]);
  const selectedLoopNote = useMemo(() => loopComposer.notes.find((note) => note.id === loopComposer.selectedNoteId) ?? null, [loopComposer]);
  const selectedLoopTrack = useMemo(() => composerTrackById(loopComposer, loopComposer.selectedTrackId), [loopComposer]);
  const chordGhostNotes = useMemo(() => {
    if (!showChordGhost || composerHover.stepIndex == null || composerHover.gridStep == null) return [];
    if (lockTrackEditing && selectedLoopTrack.id !== loopComposer.selectedTrackId) return [];
    return buildChordGhostNotes(loopComposer, {
      trackId: selectedLoopTrack.id,
      rootStepIndex: composerHover.stepIndex,
      startStep: composerHover.gridStep,
      lengthSteps: 2,
      voicing: chordVoicing,
      strumSteps: chordStrumSteps,
    });
  }, [showChordGhost, composerHover, selectedLoopTrack, lockTrackEditing, loopComposer, chordVoicing, chordStrumSteps]);
  const effectiveLoopPreviewSelection = useMemo(() => ({
    startSec: detailSelectionDirty ? detailSelectionStartSec : selectionStartSec,
    durationSec: detailSelectionDirty ? detailSelectionDurationSec : selectionDurationSec,
    isDetail: detailSelectionDirty,
  }), [detailSelectionDirty, detailSelectionStartSec, detailSelectionDurationSec, selectionStartSec, selectionDurationSec]);
  const detailViewportRange = useMemo(
    () => clampSelectionBounds(selectionStartSec, selectionDurationSec, Math.max(0.05, rawSourceAsset?.originalDuration ?? selectionDurationSec), 0.15),
    [selectionStartSec, selectionDurationSec, rawSourceAsset],
  );
  const detailSelectionVisibility = useMemo(() => {
    if (!detailSelectionDirty) return { state: 'none' as const, leftOverflow: false, rightOverflow: false };
    const viewportStart = detailViewportRange.startSec;
    const viewportEnd = detailViewportRange.startSec + detailViewportRange.durationSec;
    const detailStart = detailSelectionStartSec;
    const detailEnd = detailSelectionStartSec + detailSelectionDurationSec;
    const leftOverflow = detailStart < viewportStart;
    const rightOverflow = detailEnd > viewportEnd;
    if (detailEnd <= viewportStart || detailStart >= viewportEnd) {
      return { state: 'outside' as const, leftOverflow, rightOverflow };
    }
    if (leftOverflow || rightOverflow) {
      return { state: 'partial' as const, leftOverflow, rightOverflow };
    }
    return { state: 'inside' as const, leftOverflow, rightOverflow };
  }, [detailSelectionDirty, detailSelectionStartSec, detailSelectionDurationSec, detailViewportRange]);
  const selectionSeamScore = useMemo(() => rawSourceAsset ? buildSelectionLoopSeamScore(rawSourceAsset, effectiveLoopPreviewSelection.startSec, effectiveLoopPreviewSelection.durationSec) : 0, [rawSourceAsset, effectiveLoopPreviewSelection]);
  const stampSelectionOverlay = useMemo(() => {
    if (!stampSelStart || !stampSelEndRef.current) return null;
    return { x0: stampSelStart.x, y0: stampSelStart.y, x1: stampSelEndRef.current.x, y1: stampSelEndRef.current.y };
  }, [stampSelStart, revision, hoveredCell]);
  const stampPreviewOverlay = useMemo(() => {
    if (activeTool !== 'stamp' || stampPhase !== 'stamping' || !stampData || !hoveredCell) return null;
    const transform = {
      scaleX: stampScaleX,
      scaleY: stampScaleY,
      rotation: stampRotation,
      flipX: stampFlipX,
      flipY: stampFlipY,
    };
    const bounds = spectralData.getStampBounds(stampData, transform);
    return { centerX: hoveredCell.x, centerY: hoveredCell.y, halfW: bounds.halfW, halfH: bounds.halfH, outW: bounds.outW, outH: bounds.outH, stampData, transform };
  }, [activeTool, stampPhase, stampData, hoveredCell, spectralData, stampScaleX, stampScaleY, stampRotation, stampFlipX, stampFlipY]);

  const pushUndo = () => {
    const snapshot = createHistorySnapshot(spectralData);
    const next = [...undoStackRef.current, snapshot];
    if (next.length > MAX_HISTORY) next.shift();
    undoStackRef.current = next;
    redoStackRef.current = [];
    setHistoryVersion((v) => v + 1);
  };

  const performUndo = () => {
    const snapshot = undoStackRef.current.pop();
    if (!snapshot) return;
    redoStackRef.current = [...redoStackRef.current, createHistorySnapshot(spectralData)];
    restoreHistorySnapshot(spectralData, snapshot);
    audioEngine.invalidateBuffer();
    setRevision((v) => v + 1);
    setHistoryVersion((v) => v + 1);
    setStatus('Undo ausgeführt.');
  };

  const performRedo = () => {
    const snapshot = redoStackRef.current.pop();
    if (!snapshot) return;
    undoStackRef.current = [...undoStackRef.current, createHistorySnapshot(spectralData)];
    restoreHistorySnapshot(spectralData, snapshot);
    audioEngine.invalidateBuffer();
    setRevision((v) => v + 1);
    setHistoryVersion((v) => v + 1);
    setStatus('Redo ausgeführt.');
  };

  const updateStampData = (next: StampData | null) => setStampData(next ? cloneStampData(next) : null);

  const stopPreviewAudio = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
  };

  const stopSourceAuditionPreview = (resetPlayhead = true) => {
    if (sourceAuditionAnimationRef.current != null) {
      cancelAnimationFrame(sourceAuditionAnimationRef.current);
      sourceAuditionAnimationRef.current = null;
    }
    if (sourceAuditionSourceRef.current) {
      try { sourceAuditionSourceRef.current.stop(); } catch {}
      try { sourceAuditionSourceRef.current.disconnect(); } catch {}
      sourceAuditionSourceRef.current = null;
    }
    if (sourceAuditionGainRef.current) {
      try { sourceAuditionGainRef.current.disconnect(); } catch {}
      sourceAuditionGainRef.current = null;
    }
    sourceAuditionModeRef.current = null;
    if (resetPlayhead) setPlayheadPosition(0);
  };

  const stopSelectionLoopPreview = () => {
    if (selectionLoopPreviewAnimationRef.current != null) {
      cancelAnimationFrame(selectionLoopPreviewAnimationRef.current);
      selectionLoopPreviewAnimationRef.current = null;
    }
    if (selectionLoopPreviewSourceRef.current) {
      try { selectionLoopPreviewSourceRef.current.stop(); } catch {}
      try { selectionLoopPreviewSourceRef.current.disconnect(); } catch {}
      selectionLoopPreviewSourceRef.current = null;
    }
    if (selectionLoopPreviewGainRef.current) {
      try { selectionLoopPreviewGainRef.current.disconnect(); } catch {}
      selectionLoopPreviewGainRef.current = null;
    }
    setSelectionLoopPreviewPlaying(false);
    setSelectionLoopPreviewPlayheadSec(null);
  };

  const startSelectionLoopPreview = async () => {
    if (!rawSourceAsset) {
      setStatus('Keine Rohquelle für die Loop-Vorschau geladen.');
      return;
    }
    try {
      const previewRange = effectiveLoopPreviewSelection;
      stopAllForge2Preview('Starte Loop-Vorhörer ...');
      const ctx = selectionLoopPreviewCtxRef.current ?? new AudioContext({ sampleRate: rawSourceAsset.sampleRate });
      selectionLoopPreviewCtxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();
      const overlay = bundle && auditionView !== 'none'
        ? { audioEngine, spectralData: buildSpectralDataFromComposite(bundle, auditionView, 'none', 0), synthMode, waveformMix, amount: auditionBlendAmount }
        : null;
      const buffer = await buildAuditionMixedLoopBuffer(ctx, rawSourceAsset, previewRange.startSec, previewRange.durationSec, overlay);
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 0.02);
      source.start();
      selectionLoopPreviewSourceRef.current = source;
      selectionLoopPreviewGainRef.current = gain;
      selectionLoopPreviewStartTimeRef.current = ctx.currentTime;
      selectionLoopPreviewDurationRef.current = Math.max(0.05, previewRange.durationSec);
      const updatePlayhead = () => {
        if (!selectionLoopPreviewSourceRef.current || !selectionLoopPreviewCtxRef.current) return;
        const duration = Math.max(0.05, selectionLoopPreviewDurationRef.current);
        const elapsed = Math.max(0, selectionLoopPreviewCtxRef.current.currentTime - selectionLoopPreviewStartTimeRef.current);
        const phase = duration > 0 ? (elapsed % duration) / duration : 0;
        setSelectionLoopPreviewPlayheadSec(previewRange.startSec + phase * duration);
        selectionLoopPreviewAnimationRef.current = requestAnimationFrame(updatePlayhead);
      };
      if (selectionLoopPreviewAnimationRef.current != null) cancelAnimationFrame(selectionLoopPreviewAnimationRef.current);
      selectionLoopPreviewAnimationRef.current = requestAnimationFrame(updatePlayhead);
      source.onended = () => {
        if (selectionLoopPreviewSourceRef.current === source) stopSelectionLoopPreview();
      };
      setSelectionLoopPreviewPlaying(true);
      setStatus(`Loop-Vorhörer läuft${previewRange.isDetail ? ' auf Feinauswahl' : ''} · Naht ${(selectionSeamScore * 100).toFixed(0)}%${auditionView !== 'none' && auditionBlendAmount > 0 ? ` · ${SOURCE_VIEWS.find((entry) => entry.id === auditionView)?.label ?? auditionView} ${(auditionBlendAmount * 100).toFixed(0)}% beigemischt` : ''} · Crossfade 24ms.`);
    } catch (error) {
      console.error('[xensonar][forge2][selection-loop-preview]', error);
      stopSelectionLoopPreview();
      setStatus(`Loop-Vorhörer fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const toggleSelectionLoopPreview = async () => {
    if (selectionLoopPreviewPlaying) {
      stopSelectionLoopPreview();
      setStatus('Loop-Vorhörer gestoppt.');
      return;
    }
    await startSelectionLoopPreview();
  };

  const startSourceAuditionPreview = async (previewMode: 'sourceWindow' | 'sourceFull', fromPosition = 0) => {
    if (!rawSourceAsset) return false;
    const ctx = sourceAuditionCtxRef.current ?? new AudioContext({ sampleRate: rawSourceAsset.sampleRate });
    sourceAuditionCtxRef.current = ctx;
    if (ctx.state === 'suspended') await ctx.resume();
    stopPreviewAudio();
    stopSelectionLoopPreview();
    stopSourceAuditionPreview(false);
    const overlayEnabled = previewMode === 'sourceWindow' && bundle && auditionView !== 'none' && auditionBlendAmount > 0;
    const overlay = overlayEnabled
      ? { audioEngine, spectralData: buildSpectralDataFromComposite(bundle!, auditionView as CanonicalSourceView, 'none', 0), synthMode, waveformMix, amount: auditionBlendAmount }
      : null;
    const buffer = previewMode === 'sourceFull'
      ? buildDirectSourceSelectionBuffer(ctx, rawSourceAsset, 0, rawSourceAsset.originalDuration)
      : await buildAuditionSelectionBuffer(ctx, rawSourceAsset, selectionStartSec, selectionDurationSec, overlay);
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.92, ctx.currentTime + 0.02);
    const duration = Math.max(0.05, buffer.duration);
    const startOffset = Math.max(0, Math.min(duration - 0.001, fromPosition * duration));
    source.start(0, startOffset);
    sourceAuditionSourceRef.current = source;
    sourceAuditionGainRef.current = gain;
    sourceAuditionModeRef.current = previewMode;
    sourceAuditionStartTimeRef.current = ctx.currentTime - startOffset;
    sourceAuditionDurationRef.current = duration;
    const updatePlayhead = () => {
      if (!sourceAuditionSourceRef.current || !sourceAuditionCtxRef.current) return;
      const elapsed = Math.max(0, sourceAuditionCtxRef.current.currentTime - sourceAuditionStartTimeRef.current);
      setPlayheadPosition(Math.max(0, Math.min(1, elapsed / Math.max(0.05, sourceAuditionDurationRef.current))));
      sourceAuditionAnimationRef.current = requestAnimationFrame(updatePlayhead);
    };
    sourceAuditionAnimationRef.current = requestAnimationFrame(updatePlayhead);
    source.onended = () => {
      if (sourceAuditionSourceRef.current !== source) return;
      stopSourceAuditionPreview();
      setIsPlaying(false);
    };
    return true;
  };

  const resetStampTransforms = () => {
    setStampScaleX(1);
    setStampScaleY(1);
    setStampRotation(0);
    setStampFlipX(false);
    setStampFlipY(false);
    setStatus('Stamp-Transformation zurückgesetzt.');
  };

  const clearStampAndRestoreWorkflow = (statusMessage = 'Stamp geleert.') => {
    isStampSelectingRef.current = false;
    setStampSelStart(null);
    stampSelEndRef.current = null;
    updateStampData(null);
    setStampPhase('idle');
    setEraseMode(stampLoadedModeRef.current === 'erase');
    stampArrowHoldRef.current = {};
    setStatus(statusMessage);
  };

  const loadStampForPlacement = (
    next: StampData,
    options?: { loadedFromMode?: 'positive' | 'erase'; autoReturnToPositive?: boolean; status?: string },
  ) => {
    updateStampData(next);
    setStampPhase('stamping');
    resetStampTransforms();
    stampLoadedModeRef.current = options?.loadedFromMode ?? (eraseMode ? 'erase' : 'positive');
    if (options?.autoReturnToPositive) {
      setEraseMode(false);
    }
    if (options?.status) setStatus(options.status);
  };

  const getStampArrowDelta = (event: KeyboardEvent, key: string) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!event.repeat || !(key in stampArrowHoldRef.current)) {
      stampArrowHoldRef.current[key] = now;
      return 0.004;
    }
    const heldMs = now - stampArrowHoldRef.current[key];
    if (heldMs >= 6000) return 0.06;
    if (heldMs >= 4000) return 0.03;
    if (heldMs >= 2000) return 0.015;
    return 0.004;
  };

  const getEffectiveStampIntensity = () => {
    if (eraseMode || stampLoadedModeRef.current === 'erase') return 1;
    return 0.25;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawSpectralCanvas(ctx, spectralData, canvas.width, canvas.height, playheadPosition, hoveredCell, brushSize, status, { stampSelection: stampSelectionOverlay, stampPreview: stampPreviewOverlay });
  }, [spectralData, playheadPosition, hoveredCell, brushSize, status, revision, stampSelectionOverlay, stampPreviewOverlay]);

  useEffect(() => {
    const canvas = sourcePreviewRef.current;
    if (!canvas || !rawSourceAsset) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderWaveformRegion(ctx, rawSourceAsset, canvas.width, canvas.height, 0, Math.max(0.05, rawSourceAsset.originalDuration), selectionStartSec, selectionDurationSec, sourcePreviewMode === 'sourceFull' ? playheadPosition * Math.max(0.05, rawSourceAsset.originalDuration) : null);
  }, [rawSourceAsset, selectionStartSec, selectionDurationSec, sourcePreviewMode, playheadPosition]);

  useEffect(() => {
    const canvas = imageImportPreviewRef.current;
    if (!canvas || !pendingImageImport) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderImageImportPreview(ctx, pendingImageImport.image, pendingImageImport.image.naturalWidth, pendingImageImport.image.naturalHeight, {
      fitMode: pendingImageImport.fitMode,
      shiftX: pendingImageImport.shiftX,
      shiftY: pendingImageImport.shiftY,
      contrast: pendingImageImport.contrast,
      readMode: pendingImageImport.readMode,
    }, canvas.width, canvas.height);
  }, [pendingImageImport]);

  useEffect(() => {
    const canvas = sourceDetailRef.current;
    if (!canvas || !rawSourceAsset) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderWaveformRegion(
      ctx,
      rawSourceAsset,
      canvas.width,
      canvas.height,
      detailViewportRange.startSec,
      detailViewportRange.durationSec,
      detailSelectionStartSec,
      detailSelectionDurationSec,
      selectionLoopPreviewPlayheadSec,
    );
  }, [rawSourceAsset, detailViewportRange, detailSelectionStartSec, detailSelectionDurationSec, selectionLoopPreviewPlayheadSec]);

  useEffect(() => {
    const canvas = sourceDetailPlaystripRef.current;
    if (!canvas || !rawSourceAsset) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderWaveformRegion(
      ctx,
      rawSourceAsset,
      canvas.width,
      canvas.height,
      detailViewportRange.startSec,
      detailViewportRange.durationSec,
      effectiveLoopPreviewSelection.startSec,
      effectiveLoopPreviewSelection.durationSec,
      selectionLoopPreviewPlayheadSec,
    );
  }, [rawSourceAsset, detailViewportRange, effectiveLoopPreviewSelection, selectionLoopPreviewPlayheadSec]);

  useEffect(() => {
    if (selectionLoopPreviewPlaying) {
      stopSelectionLoopPreview();
      setStatus('Loop-Vorhörer gestoppt, weil sich die Auswahl geändert hat.');
    }
  }, [selectionStartSec, selectionDurationSec, detailSelectionStartSec, detailSelectionDurationSec, detailSelectionDirty]);

  useEffect(() => {
    if (!selectionLoopPreviewPlaying) return;
    void startSelectionLoopPreview();
  }, [auditionView, auditionBlendAmount]);

  useEffect(() => {
    if (!isPlaying || !sourceAuditionModeRef.current) return;
    const currentMode = sourceAuditionModeRef.current;
    void startSourceAuditionPreview(currentMode, playheadPosition).then((started) => {
      if (!started) {
        setIsPlaying(false);
        setPlayheadPosition(0);
      }
    });
  }, [auditionView, auditionBlendAmount]);

  useEffect(() => {
    const canvas = grooveGridRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawGrooveGrid(ctx, { bars: grooveMachine.barsInterpretation, exportBars: materialExport.bars, drumPattern: drumComputer.useCustom ? `${drumComputer.presetSource} → custom` : grooveMachine.drumPattern, bassPattern: grooveMachine.bassPattern, showGrid: grooveMachine.showGrid });
  }, [grooveMachine, materialExport.bars, drumComputer.useCustom, drumComputer.presetSource]);

  useEffect(() => {
    const canvas = drumComputerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawDrumComputerCanvas(ctx, visibleDrumComputer, { playheadStep: clipPreviewStep });
  }, [visibleDrumComputer, clipPreviewStep]);


  useEffect(() => {
    setLoopComposer((state) => {
      if (state.bars === grooveMachine.barsInterpretation) return state;
      const next = cloneLoopComposerState(state);
      next.bars = grooveMachine.barsInterpretation;
      const maxSteps = totalComposerSteps(next);
      next.notes = next.notes
        .filter((note) => note.startStep < maxSteps)
        .map((note) => ({ ...note, lengthSteps: clampComposerLength(Math.min(note.lengthSteps, maxSteps - note.startStep)) }));
      return next;
    });
    setDrumComputer((state) => resizeDrumComputerState(state, grooveMachine.barsInterpretation));
  }, [grooveMachine.barsInterpretation]);

  useEffect(() => {
    const canvas = clipComposerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawLoopComposerCanvas(ctx, loopComposer, {
      selectedTrackId: loopComposer.selectedTrackId,
      selectedNoteId: loopComposer.selectedNoteId,
      selectedNoteIds: selectedLoopNoteIds,
      hoverStepIndex: composerHover.stepIndex,
      hoverGridStep: composerHover.gridStep,
      playheadStep: clipPreviewStep,
      drumPattern: grooveMachine.drumPattern,
      exportBars: materialExport.bars,
      selectionBox: composerSelectionBox,
      ghostNotes: chordGhostNotes,
    });
  }, [loopComposer, composerHover, clipPreviewStep, selectedLoopNoteIds, composerSelectionBox, chordGhostNotes, grooveMachine.drumPattern, materialExport.bars]);

  useEffect(() => {
    if (!selectedMaterialId && materialEntries.length > 0) setSelectedMaterialId(materialEntries[0].id);
  }, [materialEntries, selectedMaterialId]);

  useEffect(() => {
    if (!selectedStampId && customStampEntries.length > 0) setSelectedStampId(customStampEntries[0].id);
  }, [customStampEntries, selectedStampId]);

  useEffect(() => {
    setProjectName(materialExport.name);
  }, [materialExport.name]);

  useEffect(() => {
    setCustomStampName(selectedCustomStamp?.name ?? `${projectName || 'forge2'}-stamp`);
  }, [selectedCustomStamp, projectName]);

  useEffect(() => {
    setMaterialRenameDraft(selectedMaterial?.name ?? materialExport.name);
  }, [selectedMaterial, materialExport.name]);

  useEffect(() => {
    return () => {
      stopPreviewAudio();
      stopLoopComposerPreview();
      stopSelectionLoopPreview();
    };
  }, []);

  useEffect(() => {
    setCanonicalForgeSession({
      materialExport: { ...materialExport, guideMarkers: [...materialExport.guideMarkers] },
      rawSourceAsset,
      sourceAsset,
      bundle,
      spectralSnapshot: createHistorySnapshot(spectralData),
      sourceView,
      secondaryView,
      viewBlend,
      activeTool,
      toolSettings: { brushSize, intensity, hardness, eraseMode, morphMode },
      synthMode,
      waveformMix: { ...waveformMix },
      status,
      stampPresetId,
      stampData: cloneStampData(stampData),
      stampScaleX,
      stampScaleY,
      stampRotation,
      stampFlipX,
      stampFlipY,
      selectionStartSec,
      selectionDurationSec,
      selectionDirty,
      detailSelectionStartSec,
      detailSelectionDurationSec,
      detailSelectionDirty,
      detailViewportStartSec,
      detailViewportDurationSec,
      detailZoom,
      detailOffset,
      auditionView,
      auditionBlendAmount,
      selectedProjectId,
      sourcePreviewMode,
      activeWorkspace,
      logicView,
      grooveMachine: { ...grooveMachine },
      drumComputer: cloneDrumComputerState(drumComputer),
      loopComposer: cloneLoopComposerState(loopComposer),
      selectedLoopNoteIds: [...selectedLoopNoteIds],
      autoZoomOnDenseOverlap,
      lockTrackEditing,
      chordVoicing,
      chordStrumSteps,
      chordVelocitySlope,
    } as any);
  }, [materialExport, rawSourceAsset, sourceAsset, bundle, spectralData, sourceView, secondaryView, viewBlend, activeTool, brushSize, intensity, hardness, eraseMode, morphMode, synthMode, waveformMix, status, stampPresetId, stampData, stampScaleX, stampScaleY, stampRotation, stampFlipX, stampFlipY, selectionStartSec, selectionDurationSec, selectionDirty, detailSelectionStartSec, detailSelectionDurationSec, detailSelectionDirty, detailViewportStartSec, detailViewportDurationSec, detailZoom, detailOffset, auditionView, auditionBlendAmount, selectedProjectId, sourcePreviewMode, activeWorkspace, logicView, grooveMachine, drumComputer, loopComposer, selectedLoopNoteIds, autoZoomOnDenseOverlap, lockTrackEditing, chordVoicing, chordStrumSteps, chordVelocitySlope]);

  useEffect(() => {
    if (!bundle) return;
    for (const view of SOURCE_VIEWS) {
      const canvas = viewCanvasesRef.current[view.id];
      if (!canvas) continue;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      drawSmallView(ctx, getCanonicalViewData(bundle, view.id), bundle.width, bundle.height, canvas.width, canvas.height, sourceView === view.id);
    }
  }, [bundle, sourceView]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      mouseClientRef.current = { x: event.clientX, y: event.clientY };
      if (activeTool === 'stamp' && isStampSelectingRef.current) {
        const cell = toCellFromClient(event.clientX, event.clientY);
        stampSelEndRef.current = cell;
        setHoveredCell(cell);
        setRevision((v) => v + 1);
      }
    };
    const onUp = (event: MouseEvent) => {
      if (activeTool === 'stamp' && isStampSelectingRef.current) {
        finalizeStampSelection(toCellFromClient(event.clientX, event.clientY));
      }
      drawingRef.current = false;
      lastCellRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [activeTool, stampPhase, stampSelStart, eraseMode, spectralData, stampData, stampScaleX, stampScaleY, stampRotation, stampFlipX, stampFlipY]);

  useEffect(() => {
    const syncHotkeyScope = (target: EventTarget | null) => {
      const root = forgeRootRef.current;
      const el = target as Node | null;
      forgeHotkeyScopeActiveRef.current = !!root && !!el && root.contains(el);
    };
    const handlePointerDown = (event: PointerEvent) => syncHotkeyScope(event.target);
    const handleFocusIn = (event: FocusEvent) => syncHotkeyScope(event.target);
    const handleFocusOut = () => {
      const root = forgeRootRef.current;
      const active = document.activeElement as Node | null;
      forgeHotkeyScopeActiveRef.current = !!root && !!active && root.contains(active);
    };
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('focusin', handleFocusIn, true);
    window.addEventListener('focusout', handleFocusOut, true);
    return () => {
      forgeHotkeyScopeActiveRef.current = false;
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('focusin', handleFocusIn, true);
      window.removeEventListener('focusout', handleFocusOut, true);
    };
  }, []);

  useEffect(() => {
    const onStampKeyCapture = (event: KeyboardEvent) => {
      const root = forgeRootRef.current;
      const target = event.target as HTMLElement | null;
      if (target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable)) return;
      const scopeActive = forgeHotkeyScopeActiveRef.current
        || (!!root && !!target && root.contains(target))
        || (!!root && !!document.activeElement && root.contains(document.activeElement));
      if (!scopeActive || activeTool !== 'stamp') return;

      const key = event.key.toLowerCase();
      const code = event.code;
      const isStampTransformKey = key === 'escape'
        || key === 'enter'
        || key === 'r'
        || key === 'arrowright'
        || key === 'arrowleft'
        || key === 'arrowup'
        || key === 'arrowdown'
        || code === 'KeyQ'
        || code === 'KeyE'
        || key === 'q'
        || key === 'e';
      if (!isStampTransformKey) return;

      event.preventDefault();
      event.stopPropagation();

      if (key === 'escape') {
        if (isStampSelectingRef.current) {
          isStampSelectingRef.current = false;
          setStampSelStart(null);
          stampSelEndRef.current = null;
          setStampPhase(stampData ? 'stamping' : 'idle');
          setStatus('Stamp-Auswahl abgebrochen.');
        } else {
          setStampPhase(stampData ? 'stamping' : 'idle');
        }
        return;
      }
      if (key === 'r') {
        setStampPhase('selecting');
        setStatus('Stamp steht auf Rechteck-Aufnahme.');
        return;
      }
      if (key === 'enter' && stampData) {
        setStampPhase('stamping');
        setStatus('Stamp steht auf Einsetzen.');
        return;
      }
      if (code === 'KeyQ' || key === 'q') {
        setStampRotation((v) => v - Math.PI / 32);
        return;
      }
      if (code === 'KeyE' || key === 'e') {
        setStampRotation((v) => v + Math.PI / 32);
        return;
      }
      if (key === 'arrowright') {
        const delta = getStampArrowDelta(event, key);
        setStampScaleX((v) => Math.min(4, v + delta));
        return;
      }
      if (key === 'arrowleft') {
        const delta = getStampArrowDelta(event, key);
        setStampScaleX((v) => Math.max(0.2, v - delta));
        return;
      }
      if (key === 'arrowup') {
        const delta = getStampArrowDelta(event, key);
        setStampScaleY((v) => Math.min(4, v + delta));
        return;
      }
      if (key === 'arrowdown') {
        const delta = getStampArrowDelta(event, key);
        setStampScaleY((v) => Math.max(0.2, v - delta));
      }
    };
    window.addEventListener('keydown', onStampKeyCapture, true);
    return () => window.removeEventListener('keydown', onStampKeyCapture, true);
  }, [activeTool, stampData]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!forgeHotkeyScopeActiveRef.current) return;
      const target = event.target as HTMLElement | null;
      if (target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable)) return;
      const key = event.key.toLowerCase();
      if (event.ctrlKey || event.metaKey) {
        if (key === 'z' && !event.shiftKey) {
          event.preventDefault();
          performUndo();
          return;
        }
        if (key === 'y' || (key === 'z' && event.shiftKey)) {
          event.preventDefault();
          performRedo();
          return;
        }
      }
      if (activeTool === 'stamp') {
        if (key === 'escape') {
          event.preventDefault();
          if (isStampSelectingRef.current) {
            isStampSelectingRef.current = false;
            setStampSelStart(null);
            stampSelEndRef.current = null;
            setStampPhase(stampData ? 'stamping' : 'idle');
            setStatus('Stamp-Auswahl abgebrochen.');
          } else {
            setStampPhase(stampData ? 'stamping' : 'idle');
          }
          return;
        }
        if (key === 'r') {
          event.preventDefault();
          setStampPhase('selecting');
          setStatus('Stamp steht auf Rechteck-Aufnahme.');
          return;
        }
        if (key === 'enter' && stampData) {
          event.preventDefault();
          setStampPhase('stamping');
          setStatus('Stamp steht auf Einsetzen.');
          return;
        }
        if (key === 'q') {
          event.preventDefault();
          setStampRotation((v) => v - Math.PI / 32);
          return;
        }
        if (key === 'e') {
          event.preventDefault();
          setStampRotation((v) => v + Math.PI / 32);
          return;
        }
        if (key === 'arrowright') {
          event.preventDefault();
          const delta = getStampArrowDelta(event, key);
          setStampScaleX((v) => Math.min(4, v + delta));
          return;
        }
        if (key === 'arrowleft') {
          event.preventDefault();
          const delta = getStampArrowDelta(event, key);
          setStampScaleX((v) => Math.max(0.2, v - delta));
          return;
        }
        if (key === 'arrowup') {
          event.preventDefault();
          const delta = getStampArrowDelta(event, key);
          setStampScaleY((v) => Math.min(4, v + delta));
          return;
        }
        if (key === 'arrowdown') {
          event.preventDefault();
          const delta = getStampArrowDelta(event, key);
          setStampScaleY((v) => Math.max(0.2, v - delta));
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTool, performRedo, performUndo]);

  useEffect(() => {
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!(key in stampArrowHoldRef.current)) return;
      delete stampArrowHoldRef.current[key];
    };
    window.addEventListener('keyup', onKeyUp);
    return () => window.removeEventListener('keyup', onKeyUp);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleNativeWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (activeTool !== 'stamp' || stampPhase !== 'stamping' || !stampData) return;
      const zoomFactor = event.deltaY < 0 ? 1.085 : 1 / 1.085;
      setStampScaleX((value) => Math.max(0.2, Math.min(4, value * zoomFactor)));
      setStampScaleY((value) => Math.max(0.2, Math.min(4, value * zoomFactor)));
    };
    canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleNativeWheel as EventListener);
  }, [activeTool, stampPhase, stampData]);

  const rebuildFromView = (view: CanonicalSourceView) => {
    if (!bundle) return;
    pushUndo();
    const next = buildSpectralDataFromComposite(bundle, view, secondaryView, viewBlend);
    setSpectralData(next);
    audioEngine.invalidateBuffer();
    setRevision((v) => v + 1);
    const secondaryLabel = secondaryView && secondaryView !== 'none' && viewBlend > 0
      ? ` + ${SOURCE_VIEWS.find((entry) => entry.id === secondaryView)?.label ?? secondaryView} ${(viewBlend * 100).toFixed(0)}%`
      : '';
    setStatus(`Arbeitsfläche neu aus ${SOURCE_VIEWS.find((entry) => entry.id === view)?.label ?? view}${secondaryLabel} aufgebaut.`);
  };

  const sampleActiveSource = (x: number, y: number) => {
    if (!bundle) return 0;
    const primary = sampleCanonicalView(bundle, sourceView, x, y);
    if (!secondaryView || secondaryView === 'none' || viewBlend <= 0) return primary;
    const secondary = sampleCanonicalView(bundle, secondaryView, x, y);
    return clamp01(primary * (1 - viewBlend) + secondary * viewBlend);
  };

  const applySelection = async (
    baseSource: AudioSourceAsset,
    startSec: number,
    durationSec: number,
    mode: 'manual' | 'autocorrect' = 'manual',
    options: { preserveDetailSelection?: boolean; resetDetailViewport?: boolean } = {},
  ) => {
    setBusy(true);
    setStatus(mode === 'autocorrect' ? 'Loop-Auswahl autokorrigieren …' : 'Auswahl in Canonical Forge laden …');
    try {
      const retargeted = retargetAudioSourceAsset(baseSource, { startSec, durationSec });
      const analyzed = await attachAnalysisCacheToSourceAsset(retargeted, (p) => setStatus(`Analyse-Bundle bauen ${(p * 100).toFixed(0)}%`));
      const nextBundle = buildCanonicalAnalysisBundle(analyzed);
      const nextViewport = buildDetailViewport(analyzed.importStartSec, analyzed.importDurationSec, Math.max(0.05, baseSource.originalDuration));
      pushUndo();
      setSourceAsset(analyzed);
      setBundle(nextBundle);
      setSpectralData(buildSpectralDataFromComposite(nextBundle, sourceView, secondaryView, viewBlend));
      setSelectionStartSec(analyzed.importStartSec);
      setSelectionDurationSec(analyzed.importDurationSec);
      setSelectionDirty(false);
      if (!options.preserveDetailSelection) {
        setDetailSelectionStartSec(analyzed.importStartSec);
        setDetailSelectionDurationSec(analyzed.importDurationSec);
        setDetailSelectionDirty(false);
      }
      if (options.resetDetailViewport ?? !options.preserveDetailSelection) {
        setDetailViewportStartSec(nextViewport.startSec);
        setDetailViewportDurationSec(nextViewport.durationSec);
      }
      setDetailOffset(0);
      audioEngine.invalidateBuffer();
      setRevision((v) => v + 1);
      setStatus(`${mode === 'autocorrect' ? 'Loop-Auswahl autokorrigiert' : 'Auswahl geladen'}: ${analyzed.importStartSec.toFixed(2)}s → ${(analyzed.importStartSec + analyzed.importDurationSec).toFixed(2)}s (${analyzed.importDurationSec.toFixed(2)}s).`);
    } catch (error) {
      console.error(error);
      setStatus('Auswahl konnte nicht geladen werden.');
    } finally {
      setBusy(false);
    }
  };

  const applyLoopSuggestion = async (suggestion: LoopAutocorrectSuggestion, barsOverride?: number, updateSelection = true) => {
    if (!rawSourceAsset) return;
    const effectiveBars = clampBars(barsOverride ?? suggestion.bars);
    const matchedCandidate = suggestion.candidates.find((candidate) => candidate.bars === effectiveBars);
    const nextDuration = matchedCandidate?.durationSec ?? suggestion.durationSec;
    setMaterialExport((state) => ({
      ...state,
      bpm: suggestion.bpm,
      bars: effectiveBars,
      guideSegments: clampGuideSegments(effectiveBars),
      guideMarkers: buildDefaultGuideMarkers(clampGuideSegments(effectiveBars)),
    }));
    setGrooveMachine((state) => ({ ...state, barsInterpretation: effectiveBars }));
    if (updateSelection) {
      await applySelection(rawSourceAsset, suggestion.startSec, nextDuration, 'autocorrect', { preserveDetailSelection: true, resetDetailViewport: false });
    } else {
      setSelectionStartSec(suggestion.startSec);
      setSelectionDurationSec(nextDuration);
      setSelectionDirty(true);
    }
  };

  const handleAutoCorrect = async () => {
    if (!rawSourceAsset) return;
    const guess = estimateLoopAutocorrect(rawSourceAsset, selectionStartSec, selectionDurationSec);
    setLastAutoCorrect(guess);
    await applyLoopSuggestion(guess, guess.bars, false);
    setStatus(`Loop-Auswahl korrigiert: ${guess.bpm} BPM · ${guess.bars} Takte · Vertrauen ${(guess.confidence * 100).toFixed(0)}%. Wenn es passt: Übernehmen.`);
  };

  const handleImport = async (file: File) => {
    if (file.type.startsWith('image/')) {
      setBusy(true);
      setStatus(`Lade Bild ${file.name} ...`);
      try {
        const image = await loadImageElementFromFile(file);
        setPendingImageImport({
          file,
          image,
          fitMode: 'crop',
          shiftX: 0,
          shiftY: 0,
          contrast: 0.22,
          readMode: 'hybrid',
        });
        setStatus(`Bild bereit: ${image.naturalWidth}×${image.naturalHeight}. Übersetzung in Forge 2 jetzt unten feinjustierbar.`);
      } catch (error) {
        console.error(error);
        setStatus('Bild konnte nicht geladen werden.');
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    setStatus(`Lade ${file.name} ...`);
    try {
      const prepared = await prepareAudioSourceAsset(file, (p) => setStatus(`Quelle dekodieren ${(p * 100).toFixed(0)}%`));
      const defaultDuration = Math.min(Math.max(1, prepared.importDurationSec), prepared.originalDuration);
      setPendingImageImport(null);
      setRawSourceAsset(prepared);
      setSelectionStartSec(0);
      setSelectionDurationSec(defaultDuration);
      setMaterialExport((state) => ({ ...state, name: sanitizeName(file.name.replace(/\.[^.]+$/, '')) }));
      setLastAutoCorrect(null);
      setSourceView('synesthetic');
      setSecondaryView('harmonic');
      setViewBlend(0.26);
      await applySelection(prepared, 0, defaultDuration);
      setSourcePreviewMode('sourceWindow');
      setStatus(`Canonical Import fertig: ${file.name}. Gesamtquelle, Loop-Auswahl und Arbeitsfläche sind jetzt getrennt vorhanden.`);
    } catch (error) {
      console.error(error);
      setStatus('Import fehlgeschlagen.');
      setBusy(false);
    }
  };

  const confirmImageImport = async () => {
    if (!pendingImageImport) return;
    setBusy(true);
    setStatus(`Übersetze Bild ${pendingImageImport.file.name} in Forge-Material ...`);
    try {
      stopAllForge2Preview('Bild-Import startet ...');
      pushUndo();
      await importImageElementToSpectralData(
        pendingImageImport.image,
        spectralData,
        {
          fitMode: pendingImageImport.fitMode,
          shiftX: pendingImageImport.shiftX,
          shiftY: pendingImageImport.shiftY,
          contrast: pendingImageImport.contrast,
          readMode: pendingImageImport.readMode,
        },
        (p) => setStatus(`Bildübersetzung ${(p * 100).toFixed(0)}%`),
      );
      setRawSourceAsset(null);
      setSourceAsset(null);
      setBundle(null);
      setSelectionDirty(false);
      setSelectionStartSec(0);
      setSelectionDurationSec(loopDurationSec);
      setMaterialExport((state) => ({ ...state, name: sanitizeName(pendingImageImport.file.name.replace(/\.[^.]+$/, '')) }));
      setPendingImageImport(null);
      audioEngine.invalidateBuffer();
      setRevision((v) => v + 1);
      setStatus(`Bild importiert: ${pendingImageImport.file.name} · ${pendingImageImport.readMode === 'legacy' ? 'Legacy' : pendingImageImport.readMode === 'contour' ? 'Kontur' : 'Hybrid'} · ${pendingImageImport.fitMode === 'crop' ? 'Crop' : pendingImageImport.fitMode === 'stretch' ? 'Stretch' : pendingImageImport.fitMode === 'containLeft' ? 'Contain links' : 'Contain rechts'}.`);
    } catch (error) {
      console.error(error);
      setStatus('Bild-Import fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };


  const applySourceAwareBrush = (cellX: number, cellY: number, bundleView: CanonicalSourceView, gain = 1, erase = false) => {
    if (!bundle) return;
    const radius = Math.max(2, Math.round(brushSize));
    const r = Math.ceil(radius);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const falloff = hardness >= 1 ? 1 : Math.exp(-((dist / radius) ** 2) / (2 * Math.max(0.08, 1 - hardness * 0.9) * 0.15));
        const x = cellX + dx;
        const y = cellY + dy;
        if (x < 0 || x >= spectralData.width || y < 0 || y >= spectralData.height) continue;
        const sample = bundleView === sourceView ? sampleActiveSource(x, y) : sampleCanonicalView(bundle, bundleView, x, y);
        const amount = sample * intensity * gain * falloff;
        if (erase) spectralData.subtract(x, y, amount);
        else spectralData.add(x, y, amount);
        const idx = y * spectralData.width + x;
        const harmonicVal = sampleCanonicalView(bundle, 'harmonic', x, y);
        const transientVal = sampleCanonicalView(bundle, 'transient', x, y);
        const noiseVal = sampleCanonicalView(bundle, 'noise', x, y);
        spectralData.grainData[idx] = clamp01(0.14 + harmonicVal * 0.54 - transientVal * 0.18 - noiseVal * 0.12);
      }
    }
  };

  const applyNoiseGate = (cellX: number, cellY: number) => {
    const radius = Math.max(2, Math.round(brushSize));
    const threshold = clamp01(intensity * 0.7 + 0.08);
    const r = Math.ceil(radius);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const x = cellX + dx;
        const y = cellY + dy;
        if (x < 0 || x >= spectralData.width || y < 0 || y >= spectralData.height) continue;
        const idx = y * spectralData.width + x;
        const current = spectralData.data[idx] ?? 0;
        if (!eraseMode) {
          if (current < threshold) {
            spectralData.data[idx] = 0;
            spectralData.grainData[idx] = 0.5;
          }
        } else {
          spectralData.data[idx] = clamp01(current + (threshold - current) * 0.18);
        }
      }
    }
  };

  const applyTool = (cellX: number, cellY: number) => {
    switch (activeTool) {
      case 'brush':
        spectralData.applyBrush(cellX, cellY, brushSize, intensity, hardness, eraseMode, 0.5);
        break;
      case 'smudge': {
        const last = lastCellRef.current ?? { x: cellX, y: cellY };
        spectralData.applySmudge(cellX, cellY, brushSize, intensity, cellX - last.x, cellY - last.y, 0.5);
        break;
      }
      case 'morph': {
        const last = lastCellRef.current ?? { x: cellX, y: cellY };
        spectralData.applyMorph(cellX, cellY, brushSize, intensity, morphMode, cellX - last.x, cellY - last.y);
        break;
      }
      case 'sourceTrace':
        applySourceAwareBrush(cellX, cellY, sourceView, 1.12, eraseMode);
        break;
      case 'harmonicLift':
        applySourceAwareBrush(cellX, cellY, 'harmonic', 1.3, eraseMode);
        break;
      case 'transientLift':
        applySourceAwareBrush(cellX, cellY, 'transient', 1.35, eraseMode);
        break;
      case 'noiseGate':
        applyNoiseGate(cellX, cellY);
        break;
      case 'dodgeBurn':
        spectralData.applyDodgeBurn(cellX, cellY, brushSize, intensity, hardness, eraseMode, 0.58);
        break;
      case 'blurSharpen':
        spectralData.applyBlurSharpen(cellX, cellY, brushSize, intensity, hardness, eraseMode);
        break;
      case 'delaySmear':
        spectralData.applyDelaySmear(cellX, cellY, brushSize, intensity, hardness, eraseMode, 0.42);
        break;
      case 'threshold':
        spectralData.applyThresholdBrush(cellX, cellY, brushSize, Math.max(0.03, intensity * 0.95), hardness, eraseMode, 0.46);
        break;
      case 'stamp':
        if (!stampData) break;
        spectralData.pasteStamp(cellX, cellY, stampData, getEffectiveStampIntensity(), eraseMode, {
          scaleX: stampScaleX,
          scaleY: stampScaleY,
          rotation: stampRotation,
          flipX: stampFlipX,
          flipY: stampFlipY,
        });
        break;
    }
    audioEngine.invalidateBuffer();
    setRevision((v) => v + 1);
  };

  const toCell = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / Math.max(1, rect.width));
    const py = ((event.clientY - rect.top) / Math.max(1, rect.height));
    return {
      x: Math.max(0, Math.min(spectralData.width - 1, Math.round(px * (spectralData.width - 1)))),
      y: Math.max(0, Math.min(spectralData.height - 1, Math.round(py * (spectralData.height - 1)))),
    };
  };

  const updateSelectionFromMouse = (clientX: number) => {
    if (!rawSourceAsset || !selectionDragRef.current || !sourcePreviewRef.current) return;
    const rect = sourcePreviewRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    const time = ratio * rawSourceAsset.originalDuration;
    const drag = selectionDragRef.current;
    const minDuration = 0.25;
    if (drag.mode === 'move') {
      const nextStart = Math.max(0, Math.min(rawSourceAsset.originalDuration - drag.durationSec, drag.startSec + (time - drag.anchorTime)));
      setSelectionStartSec(nextStart);
    } else if (drag.mode === 'resize-start') {
      const end = drag.startSec + drag.durationSec;
      const nextStart = Math.max(0, Math.min(end - minDuration, time));
      setSelectionStartSec(nextStart);
      setSelectionDurationSec(Math.max(minDuration, end - nextStart));
    } else if (drag.mode === 'resize-end') {
      const nextEnd = Math.max(drag.startSec + minDuration, Math.min(rawSourceAsset.originalDuration, time));
      setSelectionDurationSec(nextEnd - drag.startSec);
    }
    setSelectionDirty(true);
  };

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (selectionDragRef.current) updateSelectionFromMouse(event.clientX);
      if (detailSelectionDragRef.current) updateDetailSelectionFromMouse(event.clientX);
    };
    const onUp = () => {
      if (selectionDragRef.current) {
        selectionDragRef.current = null;
        setStatus('Grobauswahl geändert. Unten Feinauswahl setzen oder direkt Übernehmen.');
      }
      if (detailSelectionDragRef.current) {
        detailSelectionDragRef.current = null;
        setStatus('Feinauswahl gesetzt. Wenn sie passt: Auswahl laden.');
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [rawSourceAsset, selectionStartSec, selectionDurationSec, detailSelectionStartSec, detailSelectionDurationSec, detailViewportRange.startSec, detailViewportRange.durationSec]);

  const handleSourcePreviewDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rawSourceAsset || !sourcePreviewRef.current) return;
    const rect = sourcePreviewRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)));
    const time = ratio * rawSourceAsset.originalDuration;
    const start = selectionStartSec;
    const end = selectionStartSec + selectionDurationSec;
    const handleThreshold = (10 / Math.max(1, rect.width)) * rawSourceAsset.originalDuration;
    let mode: 'move' | 'resize-start' | 'resize-end' = 'move';
    if (Math.abs(time - start) <= handleThreshold) mode = 'resize-start';
    else if (Math.abs(time - end) <= handleThreshold) mode = 'resize-end';
    else if (time < start || time > end) {
      const nextStart = Math.max(0, Math.min(rawSourceAsset.originalDuration - selectionDurationSec, time - selectionDurationSec * 0.5));
      setSelectionStartSec(nextStart);
      setSelectionDirty(true);
    }
    selectionDragRef.current = { mode, startSec: selectionStartSec, durationSec: selectionDurationSec, anchorTime: time };
  };



  const handleSourceDetailDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rawSourceAsset) return;
    const rect = sourceDetailRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)));
    const currentStart = detailViewportRange.startSec;
    const currentDuration = detailViewportRange.durationSec;
    const time = currentStart + ratio * currentDuration;
    const start = detailSelectionStartSec;
    const end = detailSelectionStartSec + detailSelectionDurationSec;
    const handleThreshold = (10 / Math.max(1, rect.width)) * currentDuration;
    let mode: DetailSelectionDrag['mode'] = 'new';
    if (detailSelectionDirty) {
      if (Math.abs(time - start) <= handleThreshold) mode = 'resize-start';
      else if (Math.abs(time - end) <= handleThreshold) mode = 'resize-end';
      else if (time > start && time < end) mode = 'move';
    }
    detailSelectionDragRef.current = {
      mode,
      startSec: detailSelectionStartSec,
      durationSec: detailSelectionDurationSec,
      anchorTime: time,
    };
    if (mode === 'new') {
      setDetailSelectionStartSec(time);
      setDetailSelectionDurationSec(Math.max(0.05, currentDuration * 0.2));
      setDetailSelectionDirty(true);
    }
  };

  const updateDetailSelectionFromMouse = (clientX: number) => {
    if (!rawSourceAsset || !detailSelectionDragRef.current || !sourceDetailRef.current) return;
    const rect = sourceDetailRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    const currentStart = detailViewportRange.startSec;
    const currentDuration = detailViewportRange.durationSec;
    const time = currentStart + ratio * currentDuration;
    const drag = detailSelectionDragRef.current;
    const minDuration = Math.max(0.05, Math.min(0.25, currentDuration));
    let nextStart = drag.startSec;
    let nextDuration = drag.durationSec;
    if (drag.mode === 'move') {
      nextStart = drag.startSec + (time - drag.anchorTime);
    } else if (drag.mode === 'resize-start') {
      const end = drag.startSec + drag.durationSec;
      nextStart = Math.min(time, end - minDuration);
      nextDuration = end - nextStart;
    } else if (drag.mode === 'resize-end') {
      const nextEnd = Math.max(drag.startSec + minDuration, time);
      nextDuration = nextEnd - drag.startSec;
    } else {
      nextStart = Math.min(drag.anchorTime, time);
      nextDuration = Math.abs(time - drag.anchorTime);
    }
    const clamped = clampSelectionBounds(nextStart - currentStart, nextDuration, currentDuration, minDuration);
    setDetailSelectionStartSec(currentStart + clamped.startSec);
    setDetailSelectionDurationSec(clamped.durationSec);
    setDetailSelectionDirty(true);
  };

  const loadDetailSelection = () => {
    const next = clampSelectionBounds(detailSelectionStartSec, detailSelectionDurationSec, Math.max(0.05, rawSourceAsset?.originalDuration ?? selectionDurationSec));
    setSelectionStartSec(next.startSec);
    setSelectionDurationSec(next.durationSec);
    setSelectionDirty(true);
    setDetailSelectionDirty(true);
    setLastAutoCorrect(null);
    setStatus('Feinauswahl geladen. Oben bestimmt jetzt wieder, was unten sichtbar ist; die untere Maske selbst bleibt erhalten.');
  };

  const handleSourceViewAuditionClick = (view: CanonicalSourceView) => {
    setSourceView(view);
    setSourcePreviewMode((mode) => mode === 'forge' ? 'sourceWindow' : mode);
    setAuditionView((current) => {
      if (current === view) {
        setAuditionBlendAmount((amount: number) => amount >= 0.36 ? 0.12 : Math.round((amount + 0.12) * 100) / 100);
      } else {
        setAuditionBlendAmount(0.12);
      }
      return view;
    });
    setStatus(`${SOURCE_VIEWS.find((entry) => entry.id === view)?.label ?? view} wird der Original-WAV im oberen WAV-Fenster und im unteren Loop-Vorhörer leicht beigemischt. Erst „Auf Arbeitsfläche übertragen“ macht den harten Umbau.`);
  };

  const resetAuditionBlend = () => {
    setAuditionView('none');
    setAuditionBlendAmount(0);
    setStatus('Preview wieder auf reine Original-WAV zurückgesetzt.');
  };

  const mutateLoopComposer = (updater: (draft: LoopComposerState) => void, statusMessage?: string) => {
    setLoopComposer((state) => {
      const next = cloneLoopComposerState(state);
      updater(next);
      return next;
    });
    if (statusMessage) setStatus(statusMessage);
  };

  const refreshSelectionFromBox = (box: LoopNoteSelectionBox, keepExisting = false) => {
    const matches = loopComposer.notes
      .filter((note) => noteIntersectsLoopSelection(loopComposer, note, box))
      .map((note) => note.id);
    setSelectedLoopNoteIds((state) => {
      if (!keepExisting) return matches;
      return Array.from(new Set([...state, ...matches]));
    });
    if (matches.length > 0) {
      const first = loopComposer.notes.find((note) => note.id === matches[0]);
      if (first) {
        mutateLoopComposer((draft) => {
          draft.selectedNoteId = first.id;
          draft.selectedTrackId = first.trackId;
        });
      }
    }
  };

  const applyToSelectedNotes = (mutator: (note: LoopNoteEvent, state: LoopComposerState) => void, statusMessage?: string) => {
    if (selectedLoopNoteIds.length === 0) return;
    mutateLoopComposer((draft) => {
      draft.notes.forEach((note) => {
        if (!selectedLoopNoteIds.includes(note.id)) return;
        mutator(note, draft);
      });
    }, statusMessage);
  };

  const clearSelectedNotes = () => {
    if (selectedLoopNoteIds.length === 0) return;
    mutateLoopComposer((draft) => {
      draft.notes = draft.notes.filter((note) => !selectedLoopNoteIds.includes(note.id));
      if (draft.selectedNoteId && selectedLoopNoteIds.includes(draft.selectedNoteId)) {
        draft.selectedNoteId = null;
      }
    }, `${selectedLoopNoteIds.length} Noten gelöscht.`);
    setSelectedLoopNoteIds([]);
    setComposerSelectionBox(null);
  };

  const paintComposerNoteAt = (stepIndex: number, gridStep: number, trackId: string) => {
    mutateLoopComposer((draft) => {
      const track = draft.tracks.find((entry) => entry.id === trackId);
      if (!track?.enabled) return;
      const stepId = draft.pitchSteps[stepIndex]?.id;
      if (!stepId) return;
      const already = draft.notes.some((note) => note.trackId === trackId && note.stepId === stepId && note.startStep === gridStep);
      if (already) return;
      draft.notes.push({
        id: crypto.randomUUID(),
        trackId,
        stepId,
        octaveOffset: track.instrumentRole === 'bass' ? -1 : 0,
        startStep: gridStep,
        lengthSteps: 1,
        fadeInSteps: 0,
        fadeOutSteps: 0,
        velocity: track.instrumentRole === 'bass' ? 0.82 : 0.64,
      });
    });
  };

  const zoomComposerAroundStep = (draft: LoopComposerState, focusStep: number, zoomFactor = 1.5) => {
    const nextZoom = Math.min(8, Math.max(1, draft.zoom * zoomFactor));
    draft.zoom = nextZoom;
    const totalSteps = totalComposerSteps(draft);
    const visibleSteps = Math.max(8, Math.min(totalSteps, Math.round(totalSteps / Math.max(1, nextZoom))));
    const maxScroll = Math.max(0, totalSteps - visibleSteps);
    const centerStart = Math.max(0, Math.min(maxScroll, Math.round(focusStep - visibleSteps * 0.5)));
    draft.scrollX = maxScroll > 0 ? clamp01(centerStart / maxScroll) : 0;
  };

  const composerGeometry = () => {
    const canvas = clipComposerRef.current;
    if (!canvas) return null;
    const { totalSteps, visibleSteps, scrollStart } = getLoopComposerViewport(loopComposer);
    const gutterW = 112;
    const headerH = 26;
    const rowH = (canvas.height - headerH) / Math.max(1, loopComposer.pitchSteps.length);
    const cellW = (canvas.width - gutterW) / Math.max(1, visibleSteps);
    return { canvas, totalSteps, visibleSteps, scrollStart, gutterW, headerH, rowH, cellW };
  };

  const hitComposer = (clientX: number, clientY: number) => {
    const geometry = composerGeometry();
    if (!geometry) return null;
    const rect = geometry.canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / Math.max(1, rect.width)) * geometry.canvas.width;
    const y = ((clientY - rect.top) / Math.max(1, rect.height)) * geometry.canvas.height;
    const stepIndex = Math.max(0, Math.min(loopComposer.pitchSteps.length - 1, Math.floor((y - geometry.headerH) / Math.max(1, geometry.rowH))));
    const gridStep = snapComposerStep(geometry.scrollStart + (x - geometry.gutterW) / Math.max(1, geometry.cellW), geometry.totalSteps);
    const inGrid = x >= geometry.gutterW && y >= geometry.headerH;
    const inGutter = x < geometry.gutterW && y >= geometry.headerH;
    const rowStepId = loopComposer.pitchSteps[stepIndex]?.id;
    const rawCellNotes = inGrid && rowStepId
      ? notesAtGridCell(loopComposer, rowStepId, gridStep, loopComposer.selectedTrackId, loopComposer.selectedNoteId)
      : [];
    const filteredCellNotes = lockTrackEditing
      ? rawCellNotes.filter((entry) => entry.trackId === loopComposer.selectedTrackId)
      : rawCellNotes;
    const cellNotes = lockTrackEditing ? filteredCellNotes : rawCellNotes;
    let note: LoopNoteEvent | null = null;
    if (inGrid) note = cellNotes[0] ?? null;
    return { x, y, stepIndex, gridStep, inGrid, inGutter, note, cellNotes, rowStepId, geometry };
  };

  const handleLoopComposerDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setShowChordGhost(false);
    const hit = hitComposer(event.clientX, event.clientY);
    if (!hit) return;
    if (hit.inGrid && hit.rowStepId) {
      const overlap = overlapCountAtCell(loopComposer, hit.rowStepId, hit.gridStep);
      setDenseOverlapWarning(overlap >= 3 ? { stepId: hit.rowStepId, gridStep: hit.gridStep, count: overlap } : null);
      if (autoZoomOnDenseOverlap && overlap >= 3 && loopComposer.zoom < 8) {
        mutateLoopComposer((draft) => {
          zoomComposerAroundStep(draft, hit.gridStep, 1.6);
        }, 'Dense area erkannt: Auto-Zoom aktiviert, damit Noten sauber greifbar bleiben.');
      }
    }
    if (event.button === 2) {
      if (hit.note) {
        setSelectedLoopNoteIds((state) => state.filter((id) => id !== hit.note!.id));
        mutateLoopComposer((draft) => {
          draft.notes = draft.notes.filter((entry) => entry.id !== hit.note?.id);
          if (draft.selectedNoteId === hit.note?.id) draft.selectedNoteId = null;
        }, 'Note entfernt.');
      }
      return;
    }
    if (hit.inGutter) {
      if (event.altKey) {
        mutateLoopComposer((draft) => {
          const step = draft.pitchSteps[hit.stepIndex];
          if (step) step.muted = !step.muted;
        }, 'Rasterschritt stumm/aktiv umgeschaltet.');
        return;
      }
      const step = loopComposer.pitchSteps[hit.stepIndex];
      composerDragRef.current = { type: 'pitch-drag', originPitchIndex: hit.stepIndex, offsetCents: step?.offsetCents ?? 0, pointerStartY: hit.y };
      return;
    }
    if (!hit.inGrid) return;
    if ((event.metaKey || event.ctrlKey) && !hit.note) {
      composerDragRef.current = {
        type: 'box-select',
        boxAnchorStep: hit.gridStep,
        boxAnchorStepIndex: hit.stepIndex,
      };
      const nextBox = normalizeLoopSelectionBox({
        anchorStep: hit.gridStep,
        headStep: hit.gridStep,
        anchorStepIndex: hit.stepIndex,
        headStepIndex: hit.stepIndex,
      });
      setComposerSelectionBox(nextBox);
      if (!event.shiftKey) setSelectedLoopNoteIds([]);
      refreshSelectionFromBox(nextBox, event.shiftKey);
      return;
    }
    if (event.altKey && !hit.note) {
      const selectedTrack = composerTrackById(loopComposer, loopComposer.selectedTrackId);
      if (!selectedTrack || !selectedTrack.enabled) return;
      const signature = `${selectedTrack.id}:${hit.stepIndex}:${hit.gridStep}`;
      composerDragRef.current = {
        type: 'paint',
        paintTrackId: selectedTrack.id,
        lastPaintSignature: signature,
      };
      paintComposerNoteAt(hit.stepIndex, hit.gridStep, selectedTrack.id);
      setStatus('Paint-Modus: Alt halten und ziehen, um Noten entlang des Grids zu setzen.');
      return;
    }
    if (hit.cellNotes.length > 1 && (event.metaKey || event.ctrlKey)) {
      const currentIdx = hit.cellNotes.findIndex((entry) => entry.id === loopComposer.selectedNoteId);
      const next = hit.cellNotes[(currentIdx + 1 + hit.cellNotes.length) % hit.cellNotes.length] ?? hit.cellNotes[0];
      if (next) {
        setSelectedLoopNoteIds([next.id]);
        mutateLoopComposer((draft) => {
          draft.selectedNoteId = next.id;
          draft.selectedTrackId = next.trackId;
        }, `Stack-Cycle: ${hit.cellNotes.length} überlagerte Noten, Fokus gewechselt.`);
      }
      return;
    }
    if (event.shiftKey && !hit.note) {
      const selectedTrack = composerTrackById(loopComposer, loopComposer.selectedTrackId);
      if (!selectedTrack || !selectedTrack.enabled) return;
      const chordNotes = buildChordNotesFromStep(loopComposer, {
        trackId: selectedTrack.id,
        rootStepIndex: hit.stepIndex,
        startStep: hit.gridStep,
        lengthSteps: 2,
        velocity: selectedTrack.instrumentRole === 'bass' ? 0.84 : 0.66,
        octaveOffset: selectedTrack.instrumentRole === 'bass' ? -1 : 0,
        voicing: chordVoicing,
        strumSteps: chordStrumSteps,
        velocitySlope: chordVelocitySlope,
      });
      if (chordNotes.length > 0) {
        setSelectedLoopNoteIds(chordNotes.map((entry) => entry.id));
        mutateLoopComposer((draft) => {
          draft.notes.push(...chordNotes);
          draft.selectedTrackId = selectedTrack.id;
          draft.selectedNoteId = chordNotes[0]?.id ?? null;
        }, `Akkord gesetzt (${chordVoicing}, Shift-Klick, Strum ${chordStrumSteps}).`);
      }
      return;
    }
    if (hit.note) {
      const geometry = hit.geometry;
      const noteStartX = geometry.gutterW + (hit.note.startStep - geometry.scrollStart) * geometry.cellW;
      const noteEndX = geometry.gutterW + (hit.note.startStep + hit.note.lengthSteps - geometry.scrollStart) * geometry.cellW;
      const edgeThreshold = 8;
      const type = hit.x - noteStartX < edgeThreshold ? 'note-resize-start' : noteEndX - hit.x < edgeThreshold ? 'note-resize-end' : 'note-move';
      composerDragRef.current = { type, noteId: hit.note.id, startStep: hit.note.startStep, lengthSteps: hit.note.lengthSteps, originStep: hit.gridStep };
      setComposerSelectionBox(null);
      setSelectedLoopNoteIds(event.shiftKey ? Array.from(new Set([...selectedLoopNoteIds, hit.note.id])) : [hit.note.id]);
      mutateLoopComposer((draft) => { draft.selectedNoteId = hit.note!.id; draft.selectedTrackId = hit.note!.trackId; });
      return;
    }
    const selectedTrack = composerTrackById(loopComposer, loopComposer.selectedTrackId);
    if (!selectedTrack || !selectedTrack.enabled) return;
    const stepId = loopComposer.pitchSteps[hit.stepIndex]?.id;
    if (!stepId) return;
    const note: LoopNoteEvent = {
      id: crypto.randomUUID(),
      trackId: selectedTrack.id,
      stepId,
      octaveOffset: selectedTrack.instrumentRole === 'bass' ? -1 : 0,
      startStep: hit.gridStep,
      lengthSteps: 2,
      fadeInSteps: 0,
      fadeOutSteps: 0,
      velocity: selectedTrack.instrumentRole === 'bass' ? 0.85 : 0.65,
    };
    composerDragRef.current = { type: 'note-resize-end', noteId: note.id, startStep: note.startStep, lengthSteps: note.lengthSteps, originStep: hit.gridStep };
    mutateLoopComposer((draft) => {
      draft.notes.push(note);
      draft.selectedNoteId = note.id;
    }, 'Neue Note gesetzt.');
    setComposerSelectionBox(null);
    setSelectedLoopNoteIds([note.id]);
  };

  const handleLoopComposerMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const hit = hitComposer(event.clientX, event.clientY);
    if (!hit) return;
    setComposerHover({ stepIndex: hit.stepIndex, gridStep: hit.inGrid ? hit.gridStep : null });
    setShowChordGhost(event.shiftKey && hit.inGrid && !hit.note && !composerDragRef.current);
    if (hit.inGrid && hit.rowStepId) {
      const overlap = overlapCountAtCell(loopComposer, hit.rowStepId, hit.gridStep);
      setDenseOverlapWarning(overlap >= 3 ? { stepId: hit.rowStepId, gridStep: hit.gridStep, count: overlap } : null);
    } else {
      setDenseOverlapWarning(null);
    }
    const drag = composerDragRef.current;
    if (!drag) return;
    if (drag.type === 'box-select') {
      if (!hit.inGrid) return;
      const box = normalizeLoopSelectionBox({
        anchorStep: drag.boxAnchorStep ?? hit.gridStep,
        headStep: hit.gridStep,
        anchorStepIndex: drag.boxAnchorStepIndex ?? hit.stepIndex,
        headStepIndex: hit.stepIndex,
      });
      setComposerSelectionBox(box);
      refreshSelectionFromBox(box, event.shiftKey);
      return;
    }
    if (drag.type === 'paint') {
      if (!hit.inGrid || !drag.paintTrackId) return;
      const signature = `${drag.paintTrackId}:${hit.stepIndex}:${hit.gridStep}`;
      if (drag.lastPaintSignature === signature) return;
      drag.lastPaintSignature = signature;
      paintComposerNoteAt(hit.stepIndex, hit.gridStep, drag.paintTrackId);
      return;
    }
    if (drag.type === 'pitch-drag') {
      const delta = ((drag.pointerStartY ?? hit.y) - hit.y) / Math.max(1, hit.geometry.rowH);
      const nextOffset = Math.max(-2400, Math.min(2400, Math.round((drag.offsetCents ?? 0) + delta * 90)));
      mutateLoopComposer((draft) => {
        const step = draft.pitchSteps[drag.originPitchIndex ?? hit.stepIndex];
        if (step) step.offsetCents = nextOffset;
      });
      return;
    }
    if (!drag.noteId) return;
    mutateLoopComposer((draft) => {
      const note = draft.notes.find((entry) => entry.id === drag.noteId);
      if (!note) return;
      const totalSteps = totalComposerSteps(draft);
      if (drag.type === 'note-move') {
        const delta = hit.gridStep - (drag.originStep ?? hit.gridStep);
        note.startStep = snapComposerStep((drag.startStep ?? note.startStep) + delta, totalSteps);
        note.stepId = draft.pitchSteps[hit.stepIndex]?.id ?? note.stepId;
      } else if (drag.type === 'note-resize-start') {
        const originalEnd = (drag.startStep ?? note.startStep) + (drag.lengthSteps ?? note.lengthSteps);
        const nextStart = Math.max(0, Math.min(originalEnd - 1, hit.gridStep));
        note.startStep = nextStart;
        note.lengthSteps = clampComposerLength(originalEnd - nextStart);
      } else if (drag.type === 'note-resize-end') {
        const nextEnd = Math.max((drag.startStep ?? note.startStep) + 1, hit.gridStep + 1);
        note.lengthSteps = clampComposerLength(Math.min(totalSteps - note.startStep, nextEnd - note.startStep));
      }
    });
  };

  const handleLoopComposerContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const hit = hitComposer(event.clientX, event.clientY);
    if (!hit?.note) return;
    setSelectedLoopNoteIds((state) => state.filter((id) => id !== hit.note!.id));
    mutateLoopComposer((draft) => {
      draft.notes = draft.notes.filter((entry) => entry.id !== hit.note?.id);
      if (draft.selectedNoteId === hit.note?.id) draft.selectedNoteId = null;
    }, 'Note entfernt.');
  };

  const applyPresetToComposer = () => {
    mutateLoopComposer((draft) => {
      draft.bars = grooveMachine.barsInterpretation;
      const seeded = buildLoopComposerFromPresets(grooveMachine.bassPattern, draft);
      draft.notes = seeded.notes;
      draft.selectedTrackId = seeded.selectedTrackId;
      draft.selectedNoteId = seeded.selectedNoteId;
      draft.activeTrackIds = seeded.activeTrackIds;
    }, 'Bass- und Begleitspur aus Preset erzeugt. Danach frei editierbar.');
  };

  const applyBassPresetToComposer = () => {
    mutateLoopComposer((draft) => {
      draft.bars = grooveMachine.barsInterpretation;
      draft.notes = draft.notes.filter((note) => note.trackId !== 'bass');
      draft.notes.push(...buildBassPatternNotes(grooveMachine.bassPattern, draft));
      draft.selectedTrackId = 'bass';
      draft.selectedNoteId = draft.notes.find((note) => note.trackId === 'bass')?.id ?? null;
      if (!draft.activeTrackIds.includes('bass')) draft.activeTrackIds.push('bass');
    }, 'Bass-Preset in Raster-Events übersetzt. Jetzt frei verformbar.');
  };

  const applyCompanionPresetToComposer = () => {
    mutateLoopComposer((draft) => {
      draft.bars = grooveMachine.barsInterpretation;
      draft.notes = draft.notes.filter((note) => note.trackId !== 'companion');
      draft.notes.push(...buildCompanionPatternNotes(grooveMachine.bassPattern, draft));
      if (!draft.activeTrackIds.includes('companion')) draft.activeTrackIds.push('companion');
      if (draft.selectedTrackId !== 'bass') {
        draft.selectedTrackId = 'companion';
        draft.selectedNoteId = draft.notes.find((note) => note.trackId === 'companion')?.id ?? null;
      }
    }, 'Begleit-Preset aktualisiert. Danach weiter im Raster editieren.');
  };



  const showPresetDrumPattern = (pattern: string) => {
    setGrooveMachine((state) => ({ ...state, drumPattern: pattern }));
    setDrumComputer({ ...createEmptyDrumComputer(grooveMachine.barsInterpretation), useCustom: false, presetSource: pattern });
  };

  const handleDrumBarsChange = (bars: number) => {
    const nextBars = clampBars(bars || grooveMachine.barsInterpretation);
    setGrooveMachine((state) => ({ ...state, barsInterpretation: nextBars }));
    setDrumComputer((state) => {
      if (!state.useCustom) return { ...createEmptyDrumComputer(nextBars), useCustom: false, presetSource: grooveMachine.drumPattern };
      const next = cloneDrumComputerState(resizeDrumComputerState(state, nextBars));
      next.bars = nextBars;
      next.stepCount = nextBars * 16;
      return next;
    });
  };

  const resetDrumComputerToPreset = () => {
    setDrumComputer({ ...createEmptyDrumComputer(grooveMachine.barsInterpretation), useCustom: false, presetSource: grooveMachine.drumPattern });
    setStatus('Preset wieder sichtbar. Änderungen bleiben erst nach erneutem Anklicken custom.');
  };

  const randomizeDrumComputer = () => {
    setDrumComputer((state) => {
      const next = cloneDrumComputerState(resizeDrumComputerState(state.useCustom ? state : visibleDrumComputer, grooveMachine.barsInterpretation));
      next.useCustom = true;
      next.presetSource = grooveMachine.drumPattern;
      next.laneOrder.forEach((laneId) => {
        next.laneSteps[laneId] = next.laneSteps[laneId].map((_, index) => {
          const local = index % 16;
          const strong = local % 4 === 0;
          const chance = laneId === 'kick' ? (strong ? 0.42 : 0.12) : laneId === 'snare' ? ([4, 12].includes(local) ? 0.5 : 0.08) : laneId === 'hatClosed' ? 0.36 : laneId === 'hatOpen' ? 0.08 : laneId === 'clap' ? 0.08 : 0.14;
          if (Math.random() > chance) return 0;
          return Math.random() > 0.74 ? 1 : Math.random() > 0.45 ? 0.86 : 0.62;
        });
      });
      return next;
    });
    setStatus('Neuer Drum-Beat erzeugt. Prüfe ihn gegen den Loop und forme weiter.');
  };

  const clearDrumComputer = () => {
    setDrumComputer((state) => ({ ...createEmptyDrumComputer(grooveMachine.barsInterpretation), useCustom: true, presetSource: state.presetSource || grooveMachine.drumPattern }));
    setStatus('Drum Computer geleert.');
  };

  const exportDrumComputerToXensonar = async () => {
    try {
      const matrix = {
        pattern: (grooveMachine.drumPattern || 'broken_lilt') as DrumPattern,
        bars: visibleDrumComputer.bars,
        stepCount: visibleDrumComputer.stepCount,
        laneOrder: [...visibleDrumComputer.laneOrder],
        laneSteps: Object.fromEntries(visibleDrumComputer.laneOrder.map((laneId) => [laneId, [...(visibleDrumComputer.laneSteps[laneId] ?? [])]])) as Record<any, number[]>,
        sourceKind: 'static' as const,
      };
      const entry = await registerDrumConfigFromMatrix({
        name: `${materialExport.name || 'Forge 2'}-drums`,
        drumKit: grooveMachine.drumKit,
        matrix: matrix as any,
        sourceWorkspace: 'microtonal-logic',
      });
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('xensonar:drum-config-send-request', { detail: { id: entry.id } }));
      }
      setStatus(`Drum-Konfiguration exportiert und an Xensonar übergeben: ${entry.name}.`);
    } catch (error) {
      console.error('[xensonar][forge2][drum-export]', error);
      setStatus(`Drum-Export fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleDrumComputerDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drumComputerRef.current;
    if (!canvas) return;
    const hit = hitDrumComputerCanvas(canvas, event, visibleDrumComputer);
    if (!hit) return;
    setDrumComputer((state) => {
      const next = cloneDrumComputerState(state.useCustom ? state : visibleDrumComputer);
      next.useCustom = true;
      next.presetSource = grooveMachine.drumPattern;
      const lane = [...(next.laneSteps[hit.laneId] ?? [])];
      lane[hit.step] = cycleDrumCellValue(lane[hit.step] ?? 0);
      next.laneSteps[hit.laneId] = lane;
      return next;
    });
  };


  const shiftPitchWindow = (delta: number) => {
    if (!delta) return;
    mutateLoopComposer((draft) => {
      const steps = [...draft.pitchSteps];
      if (!steps.length) return;
      const normalized = ((delta % steps.length) + steps.length) % steps.length;
      if (!normalized) return;
      draft.pitchSteps = [...steps.slice(normalized), ...steps.slice(0, normalized)];
    }, delta > 0 ? 'Rasterfenster nach oben verschoben.' : 'Rasterfenster nach unten verschoben.');
  };

  const updateSelectedNote = (updater: (note: LoopNoteEvent) => void) => {
    mutateLoopComposer((draft) => {
      const note = draft.notes.find((entry) => entry.id === draft.selectedNoteId);
      if (!note) return;
      updater(note);
    });
  };


  const stopAllForge2Preview = (statusMessage = 'Vorschau gestoppt.') => {
    audioEngine.stop();
    stopPreviewAudio();
    stopLoopComposerPreview();
    stopSelectionLoopPreview();
    setIsPlaying(false);
    setPlayheadPosition(0);
    setClipPreviewStep(null);
    setStatus(statusMessage);
  };

  const toCellFromClient = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left) / Math.max(1, rect.width);
    const py = (clientY - rect.top) / Math.max(1, rect.height);
    return {
      x: Math.max(0, Math.min(spectralData.width - 1, Math.round(px * (spectralData.width - 1)))),
      y: Math.max(0, Math.min(spectralData.height - 1, Math.round(py * (spectralData.height - 1)))),
    };
  };

  const finalizeStampSelection = (endCell: { x: number; y: number }) => {
    if (!stampSelStart) return;
    const x0 = Math.min(stampSelStart.x, endCell.x);
    const y0 = Math.min(stampSelStart.y, endCell.y);
    const width = Math.abs(endCell.x - stampSelStart.x);
    const height = Math.abs(endCell.y - stampSelStart.y);
    if (width > 1 && height > 1) {
      const captured = eraseMode
        ? (() => {
            pushUndo();
            const cut = spectralData.cutRegion(x0, y0, width, height);
            audioEngine.invalidateBuffer();
            setRevision((v) => v + 1);
            return cut;
          })()
        : spectralData.copyRegion(x0, y0, width, height);
      loadStampForPlacement(captured, {
        loadedFromMode: eraseMode ? 'erase' : 'positive',
        autoReturnToPositive: eraseMode,
        status: eraseMode
          ? 'Bereich destruktiv ausgeschnitten und als Stamp geladen. Stamp setzt jetzt positiv ein; nach Leeren springt Erase zurück.'
          : 'Bereich als Rechteck-Stempel geladen.'
      });
    } else {
      setStatus('Stamp-Auswahl zu klein — bitte ein Rechteck ziehen.');
    }
    setStampSelStart(null);
    stampSelEndRef.current = null;
    isStampSelectingRef.current = false;
  };

  const startMaterialGroovePreview = async (withDrums: boolean, trackMode: 'visible' | 'enabled' = 'visible') => {
    try {
      stopAllForge2Preview('Starte Materialspur mit Groove ...');
      const trackIds = (trackMode === 'visible'
        ? loopComposer.activeTrackIds
        : loopComposer.tracks.filter((track) => track.enabled).map((track) => track.id)
      ).filter((trackId) => composerTrackById(loopComposer, trackId)?.enabled);
      setIsPlaying(true);
      const finish = () => {
        setIsPlaying(false);
        setPlayheadPosition(0);
        stopLoopComposerPreview();
        setClipPreviewStep(null);
        setStatus(withDrums ? 'Materialspur + Groove beendet.' : 'Materialspur + Clip-Spuren beendet.');
      };
      const previewPlaybackRate = 10 / Math.max(0.05, loopDurationSec);
      await audioEngine.play(
        spectralData,
        synthMode,
        waveformMix,
        0,
        setPlayheadPosition,
        finish,
        undefined,
        {
          beatGuideAudible: materialExport.beatGuideAudible,
          beatGuideVolume: materialExport.beatGuideVolume,
          bars: materialExport.bars,
          guideSegments: materialExport.guideSegments,
          guideMarkers: materialExport.guideMarkers,
          loopPreview: materialExport.loopPreview,
          loopDurationSec,
          playbackRate: previewPlaybackRate,
        },
      );
      await startLoopComposerPreview({
        composer: loopComposer,
        bpm: materialExport.bpm,
        bars: loopComposer.bars,
        trackIds,
        drumPattern: withDrums && !drumComputer.useCustom ? grooveMachine.drumPattern as any : undefined,
        drumKit: withDrums ? grooveMachine.drumKit as any : undefined,
        drumLevel: withDrums ? 0.9 : undefined,
        customDrumPattern: withDrums && drumComputer.useCustom ? drumComputer : null,
        onPlayhead: (stepFloat) => setClipPreviewStep(stepFloat),
        onEnded: () => {
          setClipPreviewStep(null);
        },
      });
      setStatus(withDrums ? 'Materialspur mit Drums + Clip-Spuren vorgehört.' : 'Materialspur mit Clip-Spuren vorgehört.');
    } catch (error) {
      console.error('[xensonar][forge2][material-groove-preview]', error);
      stopAllForge2Preview(`Material-/Groove-Vorschau fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const startDrumPreview = async (withTracks: 'none' | 'visible' | 'enabled' = 'none') => {
    try {
      stopAllForge2Preview('Starte Drum-Vorschau ...');
      const trackIds = withTracks === 'visible'
        ? loopComposer.activeTrackIds.filter((trackId) => composerTrackById(loopComposer, trackId)?.enabled)
        : withTracks === 'enabled'
          ? loopComposer.tracks.filter((track) => track.enabled).map((track) => track.id)
          : [];
      await startLoopComposerPreview({
        composer: loopComposer,
        bpm: materialExport.bpm,
        bars: loopComposer.bars,
        trackIds,
        drumPattern: !drumComputer.useCustom ? grooveMachine.drumPattern as any : undefined,
        drumKit: grooveMachine.drumKit as any,
        drumLevel: 0.92,
        customDrumPattern: drumComputer.useCustom ? drumComputer : null,
        onPlayhead: (stepFloat) => setClipPreviewStep(stepFloat),
        onEnded: () => {
          setClipPreviewStep(null);
          setStatus(withTracks === 'none' ? 'Drum-Vorschau beendet.' : 'Groove-Vorschau beendet.');
        },
      });
      setStatus(withTracks === 'none' ? 'Drum-Pattern vorgehört.' : 'Drums mit Clip-Spuren vorgehört.');
    } catch (error) {
      console.error('[xensonar][forge2][drum-preview]', error);
      setClipPreviewStep(null);
      setStatus(`Drum-Vorschau fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const startSpecificTrackPreview = async (trackId: string) => {
    try {
      stopAllForge2Preview('Starte Spur-Vorschau ...');
      await startLoopComposerPreview({
        composer: loopComposer,
        bpm: materialExport.bpm,
        bars: loopComposer.bars,
        trackIds: [trackId],
        onPlayhead: (stepFloat) => setClipPreviewStep(stepFloat),
        onEnded: () => {
          setClipPreviewStep(null);
          setStatus('Spurvorschau beendet.');
        },
      });
      setStatus('Spur vorgehört.');
    } catch (error) {
      console.error('[xensonar][forge2][track-preview]', error);
      setClipPreviewStep(null);
      setStatus(`Spurvorschau fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const startComposerPreviewMode = async (mode: 'selected-note' | 'selected-track' | 'visible-tracks' | 'enabled-tracks') => {
    try {
      stopAllForge2Preview('Starte Clip-Vorschau ...');
      const selectedTrackIds = mode === 'selected-track'
        ? [loopComposer.selectedTrackId]
        : mode === 'visible-tracks'
          ? loopComposer.activeTrackIds
          : loopComposer.tracks.filter((track) => track.enabled).map((track) => track.id);
      const filteredTrackIds = selectedTrackIds.filter((trackId) => composerTrackById(loopComposer, trackId)?.enabled);
      const selectedId = mode === 'selected-note' ? loopComposer.selectedNoteId : null;
      if (mode === 'selected-note' && !selectedId) {
        setStatus('Keine Note ausgewählt.');
        return;
      }
      if (mode !== 'selected-note' && filteredTrackIds.length === 0) {
        setStatus('Keine aktive Spur für die Vorschau.');
        return;
      }
      setClipPreviewStep(null);
      await startLoopComposerPreview({
        composer: loopComposer,
        bpm: materialExport.bpm,
        bars: loopComposer.bars,
        trackIds: filteredTrackIds,
        noteId: selectedId,
        onPlayhead: (stepFloat) => setClipPreviewStep(stepFloat),
        onEnded: () => {
          setClipPreviewStep(null);
          setStatus('Clip-Vorschau beendet.');
        },
      });
      setStatus(
        mode === 'selected-note'
          ? 'Ausgewählte Note vorgehört.'
          : mode === 'selected-track'
            ? 'Aktive Spur vorgehört.'
            : mode === 'visible-tracks'
              ? 'Sichtbare Spuren vorgehört.'
              : 'Alle aktiven Spuren vorgehört.'
      );
    } catch (error) {
      console.error('[xensonar][forge2][clip-preview]', error);
      setClipPreviewStep(null);
      setStatus(`Clip-Vorschau fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  useEffect(() => {
    const onUp = () => {
      if (!composerDragRef.current) return;
      if (composerDragRef.current.type !== 'box-select') setComposerSelectionBox(null);
      composerDragRef.current = null;
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!forgeHotkeyScopeActiveRef.current) return;
      const target = event.target as HTMLElement | null;
      if (target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable)) return;
      const key = event.key.toLowerCase();
      if (key !== 'tab') return;
      if (composerHover.gridStep == null || composerHover.stepIndex == null) return;
      const stepId = loopComposer.pitchSteps[composerHover.stepIndex]?.id;
      if (!stepId) return;
      const rawStack = notesAtGridCell(loopComposer, stepId, composerHover.gridStep, loopComposer.selectedTrackId, loopComposer.selectedNoteId);
      const lockStack = lockTrackEditing ? rawStack.filter((entry) => entry.trackId === loopComposer.selectedTrackId) : rawStack;
      const stack = lockStack.length > 0 ? lockStack : rawStack;
      if (stack.length <= 1) return;
      event.preventDefault();
      const currentIdx = stack.findIndex((entry) => entry.id === loopComposer.selectedNoteId);
      const direction = event.shiftKey ? -1 : 1;
      const next = stack[(currentIdx + direction + stack.length) % stack.length] ?? stack[0];
      if (!next) return;
      setSelectedLoopNoteIds([next.id]);
      mutateLoopComposer((draft) => {
        draft.selectedNoteId = next.id;
        draft.selectedTrackId = next.trackId;
      }, `Stack-Cycle via ${event.shiftKey ? 'Shift+Tab' : 'Tab'}: ${stack.length} Noten am selben Gridpunkt.`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [composerHover, loopComposer, lockTrackEditing]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!forgeHotkeyScopeActiveRef.current) return;
      const target = event.target as HTMLElement | null;
      if (target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable)) return;
      const note = loopComposer.notes.find((entry) => entry.id === loopComposer.selectedNoteId);
      if (!note) return;
      const activeSelection = selectedLoopNoteIds.length > 1
        ? loopComposer.notes.filter((entry) => selectedLoopNoteIds.includes(entry.id))
        : note ? [note] : [];
      if ((event.key === 'Delete' || event.key === 'Backspace') && activeSelection.length > 0) {
        event.preventDefault();
        clearSelectedNotes();
        return;
      }
      if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        const ids = activeSelection.map((entry) => entry.id);
        let duplicatedIds: string[] = [];
        mutateLoopComposer((draft) => {
          const direction = event.key === 'ArrowUp' ? -1 : 1;
          const clones: LoopNoteEvent[] = [];
          ids.forEach((id) => {
            const hit = draft.notes.find((entry) => entry.id === id);
            if (!hit) return;
            const currentIndex = composerStepIndex(draft, hit.stepId);
            if (currentIndex < 0) return;
            const nextIndex = Math.max(0, Math.min(draft.pitchSteps.length - 1, currentIndex + direction));
            const nextStep = draft.pitchSteps[nextIndex];
            if (!nextStep) return;
            clones.push({ ...hit, id: crypto.randomUUID(), stepId: nextStep.id });
          });
          duplicatedIds = clones.map((entry) => entry.id);
          draft.notes.push(...clones);
          if (clones[0]) {
            draft.selectedNoteId = clones[0].id;
            draft.selectedTrackId = clones[0].trackId;
          }
        }, 'Auswahl auf Nachbar-Rasterschritt dupliziert.');
        if (duplicatedIds.length > 0) setSelectedLoopNoteIds(duplicatedIds);
        return;
      }
      const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
      if (horizontal && activeSelection.length > 0) {
        event.preventDefault();
        const delta = event.key === 'ArrowLeft' ? -(event.shiftKey ? 4 : 1) : (event.shiftKey ? 4 : 1);
        applyToSelectedNotes((entry, state) => {
          const maxSteps = totalComposerSteps(state);
          entry.startStep = snapComposerStep(entry.startStep + delta, maxSteps);
          entry.lengthSteps = clampComposerLength(Math.min(entry.lengthSteps, maxSteps - entry.startStep));
        }, `Auswahl ${delta < 0 ? 'nach links' : 'nach rechts'} verschoben.`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loopComposer, selectedLoopNoteIds, composerHover, lockTrackEditing]);

  const handleCanvasDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    canvasRef.current?.focus({ preventScroll: true });
    const cell = toCell(event);
    mouseClientRef.current = { x: event.clientX, y: event.clientY };
    setHoveredCell(cell);
    if (activeTool === 'stamp') {
      if (!stampData || stampPhase === 'selecting') {
        setStampSelStart(cell);
        stampSelEndRef.current = cell;
        isStampSelectingRef.current = true;
        setStampPhase('selecting');
        setStatus('Stamp-Rechteck ziehen und loslassen, um den Bereich zu übernehmen.');
        return;
      }
      if (stampData && stampPhase === 'stamping') {
        pushUndo();
        applyTool(cell.x, cell.y);
      }
      return;
    }
    if (event.shiftKey) {
      if (!lineStart) {
        setLineStart(cell);
        setStatus('Linienstart gesetzt. Shift-Klick erneut, um zur zweiten Position zu ziehen.');
      } else {
        pushUndo();
        spectralData.drawLine(lineStart.x, lineStart.y, cell.x, cell.y, brushSize, intensity, hardness, 'brush', eraseMode, 0.3, 0.5);
        setLineStart(null);
        audioEngine.invalidateBuffer();
        setRevision((v) => v + 1);
      }
      return;
    }
    drawingRef.current = true;
    pushUndo();
    lastCellRef.current = cell;
    applyTool(cell.x, cell.y);
  };

  const handleCanvasMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = toCell(event);
    mouseClientRef.current = { x: event.clientX, y: event.clientY };
    setHoveredCell(cell);
    if (activeTool === 'stamp' && isStampSelectingRef.current) {
      stampSelEndRef.current = cell;
      setRevision((v) => v + 1);
      return;
    }
    if (!drawingRef.current || activeTool === 'stamp') return;
    applyTool(cell.x, cell.y);
    lastCellRef.current = cell;
  };

  const handleCanvasContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (activeTool !== 'stamp') return;
    clearStampAndRestoreWorkflow('Stamp geleert.');
  };

  const handleCanvasWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePlay = async () => {
    if (isPlaying) {
      audioEngine.stop();
      stopSourceAuditionPreview();
      setIsPlaying(false);
      setPlayheadPosition(0);
      return;
    }
    setIsPlaying(true);
    audioEngine.invalidateBuffer();
    const finish = () => {
      stopSourceAuditionPreview();
      setIsPlaying(false);
      setPlayheadPosition(0);
    };
    try {
      if (rawSourceAsset && sourcePreviewMode !== 'forge') {
        const started = await startSourceAuditionPreview(sourcePreviewMode);
        if (!started) finish();
      } else {
        stopSourceAuditionPreview(false);
        const previewPlaybackRate = 10 / Math.max(0.05, loopDurationSec);
        await audioEngine.play(
          spectralData,
          synthMode,
          waveformMix,
          playheadPosition,
          setPlayheadPosition,
          finish,
          undefined,
          {
            beatGuideAudible: materialExport.beatGuideAudible,
            beatGuideVolume: materialExport.beatGuideVolume,
            bars: materialExport.bars,
            guideSegments: materialExport.guideSegments,
            guideMarkers: materialExport.guideMarkers,
            loopPreview: materialExport.loopPreview,
            loopDurationSec,
            playbackRate: previewPlaybackRate,
          },
        );
      }
    } catch (error) {
      console.error(error);
      finish();
    }
  };

  const handleExport = async (transferModeOverride?: TransferMode) => {
    const effectiveTransferMode = transferModeOverride ?? materialExport.transferMode;
    setBusy(true);
    setStatus(effectiveTransferMode === 'source-direct' ? 'Bereite Direktquelle für Xensonar vor ...' : 'Rendere Canonical Forge Material ...');
    try {
      audioEngine.invalidateBuffer();
      const transfer = await buildTransferBlob({
        transferMode: effectiveTransferMode,
        spectralData,
        synthMode,
        waveformMix,
        rawSourceAsset,
        selectionStartSec,
        selectionDurationSec,
        sourceView,
        activeWorkspace,
      });
      const metadata = {
        name: materialExport.name,
        role: materialExport.role,
        bpm: materialExport.bpm,
        bars: materialExport.bars,
        guideSegments: materialExport.guideSegments,
        guideMarkers: materialExport.guideMarkers,
        loopStartSec: 0,
        loopEndSec: selectionDurationSec,
        rootHz: null,
        sourceVersion: transfer.sourceVersion,
        renderMode: transfer.renderMode,
        durationSec: selectionDurationSec,
        intendedLoopDurationSec: loopDurationSec,
        preferredMyzelGroup: activeHandoffProfile.preferredMyzelGroup,
        workspaceOrigin: activeWorkspace,
        transitionGuard: activeHandoffProfile.transitionGuard,
        balanceCarrier: activeHandoffProfile.balanceCarrier,
        routeSummary: effectiveTransferMode === 'source-direct'
          ? 'Der gewählte Quellloop darf unverzerrt nach Xensonar wandern; Forge-Render bleibt Option, nicht Zwang.'
          : activeHandoffProfile.routeSummary,
        stabilizeBy: activeHandoffProfile.stabilizeBy,
      };
      const pkg = exportThroughForgeAdapter(materialExport.adapterId, buildForgeExportContext(metadata, transfer.blob, CANONICAL_PRODUCER));
      registerExternalMaterialPackage(pkg);
      setStatus(`${materialExport.role === 'loop' ? 'Loop' : 'Material'} über ${selectedAdapter.adapterName} exportiert${effectiveTransferMode === 'source-direct' ? ' (Direktquelle)' : ''}.`);
    } catch (error) {
      console.error(error);
      setStatus('Export fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  const handleProbe = async () => {
    setBusy(true);
    setStatus(materialExport.transferMode === 'source-direct' ? 'Registriere externe Direktquellen-Probe ...' : 'Registriere externe Probe über dieselbe Brücke ...');
    try {
      audioEngine.invalidateBuffer();
      const transfer = await buildTransferBlob({
        transferMode: materialExport.transferMode,
        spectralData,
        synthMode,
        waveformMix,
        rawSourceAsset,
        selectionStartSec,
        selectionDurationSec,
        sourceView,
        activeWorkspace,
      });
      const metadata = {
        name: `${materialExport.name}-probe`,
        role: materialExport.role,
        bpm: materialExport.bpm,
        bars: materialExport.bars,
        guideSegments: materialExport.guideSegments,
        guideMarkers: materialExport.guideMarkers,
        loopStartSec: 0,
        loopEndSec: selectionDurationSec,
        rootHz: null,
        sourceVersion: transfer.sourceVersion,
        renderMode: transfer.renderMode,
        durationSec: selectionDurationSec,
        intendedLoopDurationSec: loopDurationSec,
        preferredMyzelGroup: activeHandoffProfile.preferredMyzelGroup,
        workspaceOrigin: activeWorkspace,
        transitionGuard: activeHandoffProfile.transitionGuard,
        balanceCarrier: activeHandoffProfile.balanceCarrier,
        routeSummary: materialExport.transferMode === 'source-direct'
          ? 'Der gewählte Quellloop darf unverzerrt nach Xensonar wandern; Forge-Render bleibt Option, nicht Zwang.'
          : activeHandoffProfile.routeSummary,
        stabilizeBy: activeHandoffProfile.stabilizeBy,
      };
      const context = buildForgeExportContext(metadata, transfer.blob, CANONICAL_PRODUCER);
      registerExternalMaterialPackage(createExampleExternalPackageFromContext(context));
      setStatus(`Externe Probe registriert${materialExport.transferMode === 'source-direct' ? ' (Direktquelle)' : ''}. So kann später auch die App deines Kumpels andocken.`);
    } catch (error) {
      console.error(error);
      setStatus('Probe fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };


  const syncProjectMaterialToXensonar = async (projectId: string, projectLabel: string) => {
    const effectiveTransferMode: TransferMode = rawSourceAsset && hasPlayableSource(rawSourceAsset) ? 'source-direct' : materialExport.transferMode;
    audioEngine.invalidateBuffer();
    const transfer = await buildTransferBlob({
      transferMode: effectiveTransferMode,
      spectralData,
      synthMode,
      waveformMix,
      rawSourceAsset,
      selectionStartSec,
      selectionDurationSec,
      sourceView,
      activeWorkspace,
    });
    const metadata = {
      name: projectLabel,
      role: materialExport.role,
      bpm: materialExport.bpm,
      bars: materialExport.bars,
      guideSegments: materialExport.guideSegments,
      guideMarkers: materialExport.guideMarkers,
      loopStartSec: 0,
      loopEndSec: selectionDurationSec,
      rootHz: null,
      sourceVersion: transfer.sourceVersion,
      renderMode: transfer.renderMode,
      durationSec: selectionDurationSec,
      intendedLoopDurationSec: loopDurationSec,
      preferredMyzelGroup: activeHandoffProfile.preferredMyzelGroup,
      workspaceOrigin: activeWorkspace,
      transitionGuard: activeHandoffProfile.transitionGuard,
      balanceCarrier: activeHandoffProfile.balanceCarrier,
      routeSummary: effectiveTransferMode === 'source-direct'
        ? 'Der gewählte Quellloop darf unverzerrt nach Xensonar wandern; Forge-Render bleibt Option, nicht Zwang.'
        : activeHandoffProfile.routeSummary,
      stabilizeBy: activeHandoffProfile.stabilizeBy,
      stableId: `canonical-forge-project-${projectId}`,
    };
    const pkg = exportThroughForgeAdapter(materialExport.adapterId, buildForgeExportContext(metadata, transfer.blob, CANONICAL_PRODUCER));
    registerExternalMaterialPackage(pkg);
  };

  const buildProjectSnapshot = () => ({
    materialExport: { ...materialExport, guideMarkers: [...materialExport.guideMarkers] },
    sourceAsset: sourceAsset ? { ...sourceAsset } : null,
    spectralSnapshot: createHistorySnapshot(spectralData),
    sourceView,
    secondaryView,
    viewBlend,
    activeTool,
    toolSettings: { brushSize, intensity, hardness, eraseMode, morphMode },
    synthMode,
    waveformMix: { ...waveformMix },
    stampPresetId,
    stampData: cloneStampData(stampData),
    stampScaleX,
    stampScaleY,
    stampRotation,
    stampFlipX,
    stampFlipY,
    selectionStartSec,
    selectionDurationSec,
    selectionDirty,
    detailSelectionStartSec,
    detailSelectionDurationSec,
    detailSelectionDirty,
    detailViewportStartSec,
    detailViewportDurationSec,
    detailZoom,
    detailOffset,
    auditionView,
    auditionBlendAmount,
    selectedProjectId,
    sourcePreviewMode,
    activeWorkspace,
    logicView,
    grooveMachine: { ...grooveMachine },
    drumComputer: cloneDrumComputerState(drumComputer),
    loopComposer: cloneLoopComposerState(loopComposer),
    selectedLoopNoteIds: [...selectedLoopNoteIds],
    autoZoomOnDenseOverlap,
    lockTrackEditing,
    chordVoicing,
    chordStrumSteps,
    chordVelocitySlope,
  } as any);

  const saveProject = async (overwrite = false) => {
    setBusy(true);
    try {
      const meta = await saveCanonicalForgeProject({
        id: overwrite ? (selectedProjectId ?? undefined) : undefined,
        name: projectName || materialExport.name,
        snapshot: buildProjectSnapshot(),
      });
      setSelectedProjectId(meta.id);
      setProjectName(meta.name);
      if (materialExport.role === 'loop') {
        try {
          await syncProjectMaterialToXensonar(meta.id, meta.name);
          setStatus(`Forge-2-Projekt gespeichert und Materialspur aktualisiert: ${meta.name}`);
        } catch (syncError) {
          console.error('[xensonar][forge2][project-material-sync]', syncError);
          setStatus(`Forge-2-Projekt gespeichert, aber Materialspur-Sync fehlgeschlagen: ${meta.name}`);
        }
      } else {
        setStatus(`Forge-2-Projekt gespeichert: ${meta.name}`);
      }
    } catch (error) {
      console.error(error);
      setStatus('Forge-2-Projekt konnte nicht gespeichert werden.');
    } finally {
      setBusy(false);
    }
  };

  const loadProject = async (id: string) => {
    setBusy(true);
    try {
      const record = await loadCanonicalForgeProject(id);
      const snapshot = record.snapshot;
      const next = makeEmptySpectral();
      if (snapshot.spectralSnapshot) next.restoreData(snapshot.spectralSnapshot);
      setMaterialExport({ ...DEFAULT_EXPORT, ...snapshot.materialExport, transferMode: snapshot.materialExport.transferMode ?? DEFAULT_EXPORT.transferMode, guideMarkers: [...snapshot.materialExport.guideMarkers] });
      setSpectralData(next);
      setSourceView(snapshot.sourceView);
      setSecondaryView(snapshot.secondaryView);
      setViewBlend(snapshot.viewBlend);
      setActiveTool(snapshot.activeTool);
      setBrushSize(snapshot.toolSettings.brushSize);
      setIntensity(snapshot.toolSettings.intensity);
      setHardness(snapshot.toolSettings.hardness);
      setEraseMode(snapshot.toolSettings.eraseMode);
      setMorphMode(snapshot.toolSettings.morphMode);
      setSynthMode(snapshot.synthMode);
      setWaveformMix({ ...snapshot.waveformMix });
      setStampPresetId(snapshot.stampPresetId);
      setStampData(cloneStampData(snapshot.stampData));
      setStampScaleX(snapshot.stampScaleX);
      setStampScaleY(snapshot.stampScaleY);
      setStampRotation(snapshot.stampRotation);
      setStampFlipX(snapshot.stampFlipX);
      setStampFlipY(snapshot.stampFlipY);
      setSelectionStartSec(snapshot.selectionStartSec);
      setSelectionDurationSec(snapshot.selectionDurationSec);
      setSelectionDirty(snapshot.selectionDirty);
      setDetailSelectionStartSec(snapshot.detailSelectionStartSec ?? snapshot.selectionStartSec);
      setDetailSelectionDurationSec(snapshot.detailSelectionDurationSec ?? snapshot.selectionDurationSec);
      setDetailSelectionDirty(snapshot.detailSelectionDirty ?? false);
      setDetailViewportStartSec((snapshot as any).detailViewportStartSec ?? snapshot.selectionStartSec);
      setDetailViewportDurationSec((snapshot as any).detailViewportDurationSec ?? Math.max(snapshot.selectionDurationSec, 0.5));
      setDetailZoom(snapshot.detailZoom);
      setDetailOffset(snapshot.detailOffset);
      setAuditionView((snapshot as any).auditionView ?? 'none');
      setAuditionBlendAmount((snapshot as any).auditionBlendAmount ?? 0);
      setSelectedProjectId(id);
      setProjectName(record.name);
      setSourcePreviewMode(snapshot.sourcePreviewMode);
      setActiveWorkspace(((snapshot as any).activeWorkspace ?? 'wave-material') as CanonicalForgeWorkspace);
      setLogicView((((snapshot as any).logicView ?? 'drums') as CanonicalLogicView));
      setGrooveMachine({ ...snapshot.grooveMachine });
      setDrumComputer(snapshot.drumComputer ? cloneDrumComputerState(resizeDrumComputerState(snapshot.drumComputer as DrumComputerState, snapshot.grooveMachine?.barsInterpretation ?? grooveMachine.barsInterpretation)) : createEmptyDrumComputer(snapshot.grooveMachine?.barsInterpretation ?? grooveMachine.barsInterpretation));
      setLoopComposer(snapshot.loopComposer ? cloneLoopComposerState(snapshot.loopComposer as LoopComposerState) : buildLoopComposerFromPresets(snapshot.grooveMachine?.bassPattern ?? grooveMachine.bassPattern, createEmptyLoopComposer(snapshot.grooveMachine?.barsInterpretation ?? grooveMachine.barsInterpretation)));
      setSelectedLoopNoteIds((snapshot as any).selectedLoopNoteIds ?? []);
      setAutoZoomOnDenseOverlap((snapshot as any).autoZoomOnDenseOverlap ?? true);
      setLockTrackEditing((snapshot as any).lockTrackEditing ?? false);
      setChordVoicing((snapshot as any).chordVoicing ?? 'triad');
      setChordStrumSteps((snapshot as any).chordStrumSteps ?? 0);
      setChordVelocitySlope((snapshot as any).chordVelocitySlope ?? 0.08);
      setSourceAsset(snapshot.sourceAsset ? { ...snapshot.sourceAsset } : null);
      setRawSourceAsset(buildRawPreviewAsset(snapshot.sourceAsset));
      setBundle(snapshot.sourceAsset ? buildCanonicalAnalysisBundle(snapshot.sourceAsset) : null);
      undoStackRef.current = [];
      redoStackRef.current = [];
      setHistoryVersion((v) => v + 1);
      audioEngine.invalidateBuffer();
      setRevision((v) => v + 1);
      setStatus(snapshot.sourceAsset
        ? 'Forge-2-Projekt geladen. Quelle, Analyse und Arbeitsfläche wurden wiederhergestellt.'
        : 'Forge-2-Projekt geladen. Arbeitsfläche wiederhergestellt; es war keine Quelle im Projekt enthalten.');
    } catch (error) {
      console.error(error);
      setStatus('Forge-2-Projekt konnte nicht geladen werden.');
    } finally {
      setBusy(false);
    }
  };

  const removeProject = async () => {
    if (!selectedProjectId) return;
    setBusy(true);
    try {
      await deleteCanonicalForgeProject(selectedProjectId);
      setSelectedProjectId(null);
      setStatus('Forge-2-Projekt gelöscht.');
    } catch (error) {
      console.error(error);
      setStatus('Forge-2-Projekt konnte nicht gelöscht werden.');
    } finally {
      setBusy(false);
    }
  };

  const renameProject = async () => {
    if (!selectedProjectId) return;
    setBusy(true);
    try {
      const meta = await renameCanonicalForgeProject(selectedProjectId, projectName);
      setProjectName(meta.name);
      setStatus(`Forge-2-Projekt umbenannt: ${meta.name}`);
    } catch (error) {
      console.error(error);
      setStatus('Forge-2-Projekt konnte nicht umbenannt werden.');
    } finally {
      setBusy(false);
    }
  };

  const renameCurrentCustomStamp = async () => {
    if (!selectedStampId) return;
    setBusy(true);
    try {
      const entry = await renameCustomStamp(selectedStampId, customStampName);
      setCustomStampName(entry.name);
      setStatus(`Custom-Stempel umbenannt: ${entry.name}`);
    } catch (error) {
      console.error(error);
      setStatus('Custom-Stempel konnte nicht umbenannt werden.');
    } finally {
      setBusy(false);
    }
  };

  const previewMaterial = (blobUrl: string) => {
    stopPreviewAudio();
    const audio = new Audio(blobUrl);
    audioPreviewRef.current = audio;
    void audio.play().catch((error) => console.warn('[xensonar][canonical-forge][preview-material]', error));
  };

  const saveCurrentStampToLibrary = async (overwrite = false) => {
    if (!stampData) { setStatus('Kein Stempel zum Sichern vorhanden.'); return; }
    setBusy(true);
    try {
      const entry = await saveCustomStamp({ id: overwrite ? (selectedStampId ?? undefined) : undefined, name: customStampName || projectName + '-stamp', stamp: stampData });
      setSelectedStampId(entry.id);
      setStatus(`Stempel gespeichert: ${entry.name}`);
    } catch (error) {
      console.error(error);
      setStatus('Stempel konnte nicht gespeichert werden.');
    } finally {
      setBusy(false);
    }
  };

  const loadCustomStampFromLibrary = () => {
    if (!selectedCustomStamp) return;
    loadStampForPlacement(selectedCustomStamp.stamp, { status: `Custom-Stempel geladen: ${selectedCustomStamp.name}` });
    setStampPresetId(selectedCustomStamp.id);
    setActiveTool('stamp');
  };

  const removeCustomStampFromLibrary = async () => {
    if (!selectedStampId) return;
    setBusy(true);
    try {
      await deleteCustomStamp(selectedStampId);
      setSelectedStampId(null);
      setStatus('Custom-Stempel gelöscht.');
    } catch (error) {
      console.error(error);
      setStatus('Custom-Stempel konnte nicht gelöscht werden.');
    } finally {
      setBusy(false);
    }
  };

  const renameSelectedMaterial = async () => {
    if (!selectedMaterial) return;
    setBusy(true);
    try {
      const next = await updateMaterialEntry(selectedMaterial.id, { name: materialRenameDraft || selectedMaterial.name, role: materialExport.role });
      setMaterialRenameDraft(next.name);
      setStatus('Materialdatenbank-Eintrag aktualisiert.');
    } catch (error) {
      console.error(error);
      setStatus('Materialdatenbank konnte nicht aktualisiert werden.');
    } finally {
      setBusy(false);
    }
  };

  const removeSelectedMaterial = async () => {
    if (!selectedMaterial) return;
    setBusy(true);
    try {
      await deleteMaterialEntry(selectedMaterial.id);
      setSelectedMaterialId(null);
      setStatus('Material aus Datenbank gelöscht.');
    } catch (error) {
      console.error(error);
      setStatus('Material konnte nicht gelöscht werden.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section ref={forgeRootRef} data-hotkey-scope="forge" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-neutral-800 bg-neutral-950/70 p-4">
        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-[0.3em] text-violet-300">III.2b Canonical Forge</div>
          <h2 className="text-lg font-semibold text-neutral-100">Forge 2</h2>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onBack} className="border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-900">← Zurück zu V</button>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="border border-violet-700 bg-violet-950/40 px-3 py-1.5 text-violet-200 hover:bg-violet-900/40">Quelle laden</button>
          <input ref={fileInputRef} type="file" accept="audio/*,image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleImport(file); e.currentTarget.value = ''; }} />
        </div>
      </div>

      <div className="rounded border border-violet-900/40 bg-violet-950/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-neutral-200">Arbeitsbereich: {activeWorkspaceDef.label}</div>
          <div className="flex flex-wrap gap-2">
            {FORGE2_WORKSPACES.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                onClick={() => setActiveWorkspace(workspace.id as CanonicalForgeWorkspace)}
                className={`border px-3 py-1.5 text-xs ${activeWorkspace === workspace.id ? 'border-violet-500 bg-violet-950/40 text-violet-100' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}
              >
                {workspace.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeWorkspace === 'microtonal-logic' && (
        <div className="space-y-4 rounded border border-neutral-800 bg-neutral-950/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4">
            <div className="text-[11px] uppercase tracking-[0.25em] text-violet-300">Microtonal Logic</div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setLogicView('drums')} className={`min-w-[11rem] rounded border px-5 py-3 text-left text-sm font-semibold ${logicView === 'drums' ? 'border-cyan-500 bg-cyan-950/35 text-cyan-100' : 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800'}`}>
                Drum Machine
              </button>
              <button type="button" onClick={() => setLogicView('melodic')} className={`min-w-[11rem] rounded border px-5 py-3 text-left text-sm font-semibold ${logicView === 'melodic' ? 'border-violet-500 bg-violet-950/35 text-violet-100' : 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800'}`}>
                Melodic Loop
              </button>
            </div>
          </div>

          {logicView === 'drums' ? (
            <div className="space-y-4">
              <div className="space-y-3 rounded border border-neutral-800 bg-black/40 p-3">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_8rem_10rem]">
                  <label className="space-y-1 text-xs text-neutral-400"><span className="uppercase tracking-[0.18em] text-neutral-500">Drum Pattern</span><select value={grooveMachine.drumPattern} onChange={(e) => showPresetDrumPattern(e.target.value)} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100">{DRUM_PATTERN_OPTIONS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label>
                  <label className="space-y-1 text-xs text-neutral-400"><span className="uppercase tracking-[0.18em] text-neutral-500">Drum Kit</span><select value={grooveMachine.drumKit} onChange={(e) => setGrooveMachine((s) => ({ ...s, drumKit: e.target.value }))} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100">{DRUM_KITS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label>
                  <label className="space-y-1 text-xs text-neutral-400"><span className="uppercase tracking-[0.18em] text-neutral-500">Takte</span><input type="number" min={1} max={16} value={grooveMachine.barsInterpretation} onChange={(e) => handleDrumBarsChange(Number(e.target.value))} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100" /></label>
                  <div className="rounded border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-300">
                    <div>{drumComputer.useCustom ? 'Custom Beat' : 'Preset'}</div>
                    <div className="text-[11px] text-neutral-500">{countActiveDrumSteps(visibleDrumComputer)} Hits</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button type="button" onClick={resetDrumComputerToPreset} className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900">Zum Preset zurück</button>
                  <button type="button" onClick={randomizeDrumComputer} className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900">Random</button>
                  <button type="button" onClick={clearDrumComputer} className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900">Leeren</button>
                  <button type="button" onClick={() => void startDrumPreview('none')} className="rounded border border-violet-700/70 px-3 py-2 text-violet-100 hover:bg-violet-950/30">Hören</button>
                  <button type="button" onClick={() => void exportDrumComputerToXensonar()} className="rounded border border-cyan-700/70 px-3 py-2 text-cyan-100 hover:bg-cyan-950/30">An Xensonar senden</button>
                  <div className="ml-auto self-center text-[11px] text-neutral-500">Klick: aus → ghost → normal → accent</div>
                </div>
                <canvas ref={drumComputerRef} width={1180} height={250} onMouseDown={handleDrumComputerDown} className="w-full border border-neutral-800 bg-black" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-3 rounded border border-neutral-800 bg-black/40 p-3">
                  <div className="grid gap-3 md:grid-cols-5">
                    <label className="space-y-1 text-xs text-neutral-400 md:col-span-2"><span className="uppercase tracking-[0.18em] text-neutral-500">Bass Pattern</span><select value={grooveMachine.bassPattern} onChange={(e) => setGrooveMachine((s) => ({ ...s, bassPattern: e.target.value }))} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100">{BASS_PATTERN_OPTIONS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label>
                    <label className="space-y-1 text-xs text-neutral-400"><span className="uppercase tracking-[0.18em] text-neutral-500">Bass Voice</span><select value={(loopComposer.tracks.find((track) => track.id === 'bass')?.instrumentPreset ?? 'subPulse')} onChange={(e) => mutateLoopComposer((draft) => { const track = draft.tracks.find((entry) => entry.id === 'bass'); if (track) track.instrumentPreset = e.target.value as LoopTrackInstrumentPreset; })} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100">{LOOP_TRACK_INSTRUMENTS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></label>
                    <label className="space-y-1 text-xs text-neutral-400"><span className="uppercase tracking-[0.18em] text-neutral-500">Begleit-Voice</span><select value={(loopComposer.tracks.find((track) => track.id === 'companion')?.instrumentPreset ?? 'reedTone')} onChange={(e) => mutateLoopComposer((draft) => { const track = draft.tracks.find((entry) => entry.id === 'companion'); if (track) track.instrumentPreset = e.target.value as LoopTrackInstrumentPreset; })} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100">{LOOP_TRACK_INSTRUMENTS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></label>
                    <div className="rounded border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-400">
                      <div className="uppercase tracking-[0.18em] text-neutral-500">Rasterfenster</div>
                      <div className="mt-1 text-neutral-200">Mitte: {logicWindowAnchor}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button type="button" onClick={applyBassPresetToComposer} className="rounded border border-violet-700/70 bg-violet-950/30 px-3 py-2 text-violet-100 hover:bg-violet-900/30">Bass laden</button>
                    <button type="button" onClick={applyCompanionPresetToComposer} className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900">Begleitung ergänzen</button>
                    <button type="button" onClick={applyPresetToComposer} className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900">Bass + Begleitung neu setzen</button>
                    <button type="button" onClick={() => mutateLoopComposer((draft) => { const aux = draft.tracks.find((track) => track.id === 'aux'); if (aux) { aux.enabled = true; } if (!draft.activeTrackIds.includes('aux')) draft.activeTrackIds.push('aux'); draft.selectedTrackId = 'aux'; })} className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900">Neue Spur</button>
                    <button type="button" onClick={() => void startSpecificTrackPreview(loopComposer.selectedTrackId)} className="rounded border border-violet-700/70 px-3 py-2 text-violet-100 hover:bg-violet-950/30">Aktive Spur hören</button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {loopComposer.tracks.map((track) => {
                      const active = loopComposer.selectedTrackId === track.id;
                      return (
                        <button key={track.id} type="button" onClick={() => mutateLoopComposer((draft) => { draft.selectedTrackId = track.id; draft.selectedNoteId = draft.notes.find((note) => note.trackId === track.id)?.id ?? null; if (!draft.activeTrackIds.includes(track.id)) draft.activeTrackIds.push(track.id); })} className={`rounded border px-3 py-1.5 ${active ? 'border-cyan-500 bg-cyan-950/30 text-cyan-100' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}>
                          {track.label}
                        </button>
                      );
                    })}
                    <div className="ml-auto flex gap-2">
                      <button type="button" onClick={() => shiftPitchWindow(-1)} className="rounded border border-neutral-700 px-3 py-1.5 text-neutral-200 hover:bg-neutral-900">Fenster ↑</button>
                      <button type="button" onClick={() => shiftPitchWindow(1)} className="rounded border border-neutral-700 px-3 py-1.5 text-neutral-200 hover:bg-neutral-900">Fenster ↓</button>
                    </div>
                  </div>
                  <canvas
                    ref={clipComposerRef}
                    width={1180}
                    height={460}
                    className="w-full border border-neutral-800 bg-black"
                    onMouseDown={handleLoopComposerDown}
                    onMouseMove={handleLoopComposerMove}
                    onMouseLeave={() => {
                      setComposerHover({ stepIndex: null, gridStep: null });
                      setDenseOverlapWarning(null);
                      setShowChordGhost(false);
                      if (composerDragRef.current?.type !== 'box-select') setComposerSelectionBox(null);
                    }}
                    onContextMenu={handleLoopComposerContextMenu}
                  />
                </div>
                <div className="space-y-3 rounded border border-neutral-800 bg-neutral-950/50 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">Preset als sichtbare Struktur</div>
                  <div className="space-y-2 text-xs text-neutral-400">
                    {melodicPreviewNotes.slice(0, 18).map((note) => {
                      const stepLabel = loopComposer.pitchSteps.find((step) => step.id === note.stepId)?.label ?? note.stepId;
                      const bar = Math.floor(note.startStep / loopComposer.stepsPerBar) + 1;
                      const pos = String((note.startStep % loopComposer.stepsPerBar) + 1).padStart(2, '0');
                      return <div key={note.id} className="rounded border border-neutral-800 bg-neutral-950/60 px-2 py-1.5"><span className="text-neutral-200">{bar}.{pos}</span> · <span className="text-cyan-200">{stepLabel}</span> · Len {note.lengthSteps}</div>;
                    })}
                    {melodicPreviewNotes.length === 0 && <div className="rounded border border-dashed border-neutral-800 px-2 py-2 text-neutral-500">Noch keine Bass-Ereignisse sichtbar.</div>}
                  </div>
                  <details className="rounded border border-neutral-800 bg-neutral-950/60 p-2 text-xs text-neutral-400">
                    <summary className="cursor-pointer list-none text-neutral-200">Advanced</summary>
                    <div className="mt-3 space-y-3">
                      <label className="block space-y-1"><span>Zoom {loopComposer.zoom.toFixed(2)}</span><input type="range" min={1} max={8} step={0.1} value={loopComposer.zoom} onChange={(e) => mutateLoopComposer((draft) => { draft.zoom = Number(e.target.value); })} className="w-full" /></label>
                      <label className="block space-y-1"><span>Scroll {loopComposer.scrollX.toFixed(2)}</span><input type="range" min={0} max={1} step={0.01} value={loopComposer.scrollX} onChange={(e) => mutateLoopComposer((draft) => { draft.scrollX = Number(e.target.value); })} className="w-full" /></label>
                      <label className="block space-y-1"><span>Schritte / Takt {loopComposer.stepsPerBar}</span><input type="range" min={8} max={32} step={4} value={loopComposer.stepsPerBar} onChange={(e) => mutateLoopComposer((draft) => { draft.stepsPerBar = Number(e.target.value); draft.notes = draft.notes.map((note) => ({ ...note, startStep: Math.min(note.startStep, totalComposerSteps(draft) - 1), lengthSteps: clampComposerLength(Math.min(note.lengthSteps, totalComposerSteps(draft) - note.startStep)) })); })} className="w-full" /></label>
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={autoZoomOnDenseOverlap} onChange={(e) => setAutoZoomOnDenseOverlap(e.target.checked)} /> Auto-Zoom bei dichter Überlagerung</label>
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={lockTrackEditing} onChange={(e) => setLockTrackEditing(e.target.checked)} /> Nur aktive Spur editieren</label>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <label className="space-y-1"><span>Voicing</span><select value={chordVoicing} onChange={(e) => setChordVoicing(e.target.value as ChordVoicing)} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"><option value="triad">Triad</option><option value="quartal">Quartal</option><option value="cluster">Cluster</option><option value="open5">Open5</option></select></label>
                        <label className="space-y-1"><span>Strum {chordStrumSteps}</span><input type="range" min={0} max={3} step={1} value={chordStrumSteps} onChange={(e) => setChordStrumSteps(Number(e.target.value))} className="w-full" /></label>
                        <label className="space-y-1"><span>Vel-Slope {chordVelocitySlope.toFixed(2)}</span><input type="range" min={0} max={0.2} step={0.01} value={chordVelocitySlope} onChange={(e) => setChordVelocitySlope(Number(e.target.value))} className="w-full" /></label>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="rounded border border-neutral-800 bg-neutral-950/50 p-3">
              <div className="grid gap-3 md:grid-cols-5">
                <label className="space-y-1 text-xs text-neutral-400 md:col-span-2"><span className="uppercase tracking-[0.18em] text-neutral-500">Materialname</span><input value={materialExport.name} onChange={(e) => setMaterialExport((s) => ({ ...s, name: e.target.value }))} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100" /></label>
                <label className="space-y-1 text-xs text-neutral-400"><span className="uppercase tracking-[0.18em] text-neutral-500">Rolle</span><select value={materialExport.role} onChange={(e) => setMaterialExport((s) => ({ ...s, role: e.target.value as MaterialRole }))} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100"><option value="loop">Loop</option><option value="waveMaterial">Wellenstarter</option><option value="particleExciter">Partikel</option><option value="droneTexture">Drone</option></select></label>
                <label className="space-y-1 text-xs text-neutral-400"><span className="uppercase tracking-[0.18em] text-neutral-500">BPM</span><input type="number" value={materialExport.bpm} min={40} max={320} onChange={(e) => setMaterialExport((s) => ({ ...s, bpm: Math.max(40, Math.min(320, Number(e.target.value) || 108)) }))} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100" /></label>
                <label className="space-y-1 text-xs text-neutral-400"><span className="uppercase tracking-[0.18em] text-neutral-500">Takte</span><input type="number" value={materialExport.bars} min={1} max={16} onChange={(e) => setMaterialExport((s) => ({ ...s, bars: clampBars(Number(e.target.value) || 4) }))} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100" /></label>
              </div>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-950/50 p-3 text-xs text-neutral-400">
              <div className="uppercase tracking-[0.18em] text-neutral-500">Schnellzugriff</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={performUndo} disabled={undoStackRef.current.length === 0} className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900 disabled:opacity-40">Undo</button>
                <button type="button" onClick={performRedo} disabled={redoStackRef.current.length === 0} className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900 disabled:opacity-40">Redo</button>
                <button type="button" onClick={() => void startMaterialGroovePreview(true)} className="rounded border border-violet-700/70 px-3 py-2 text-violet-100 hover:bg-violet-950/30">Material + Groove</button>
                <button type="button" onClick={() => void handleExport()} disabled={busy} className="rounded border border-cyan-700/70 bg-cyan-950/35 px-3 py-2 text-cyan-100 hover:bg-cyan-900/35 disabled:opacity-50">Export</button>
                <button type="button" onClick={() => void handleExport('source-direct')} disabled={busy || !rawSourceAsset} className="rounded border border-emerald-700/70 bg-emerald-950/25 px-3 py-2 text-emerald-100 hover:bg-emerald-900/30 disabled:opacity-50">Direktquelle</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={activeWorkspace === 'microtonal-logic' ? 'hidden' : 'grid gap-3 lg:grid-cols-[minmax(0,1fr)_26rem]'}>
        <div className="space-y-3">
          <div className="grid gap-3 border border-neutral-800 bg-neutral-950/70 p-3 md:grid-cols-6">
            <label className="space-y-1 text-xs text-neutral-400 md:col-span-2">
              <span className="block uppercase tracking-[0.2em] text-neutral-500">Materialname</span>
              <input value={materialExport.name} onChange={(e) => setMaterialExport((s) => ({ ...s, name: e.target.value }))} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
            </label>
            <label className="space-y-1 text-xs text-neutral-400">
              <span className="block uppercase tracking-[0.2em] text-neutral-500">Rolle</span>
              <select value={materialExport.role} onChange={(e) => setMaterialExport((s) => ({ ...s, role: e.target.value as MaterialRole }))} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100">
                <option value="loop">Loop</option>
                <option value="waveMaterial">Wellenstarter-Material</option>
                <option value="particleExciter">Partikel-Exciter</option>
                <option value="droneTexture">Drone-Textur</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-neutral-400">
              <span className="block uppercase tracking-[0.2em] text-neutral-500">BPM</span>
              <input type="number" value={materialExport.bpm} min={40} max={320} onChange={(e) => setMaterialExport((s) => ({ ...s, bpm: Math.max(40, Math.min(320, Number(e.target.value) || 108)) }))} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
            </label>
            <label className="space-y-1 text-xs text-neutral-400">
              <span className="block uppercase tracking-[0.2em] text-neutral-500">Takte</span>
              <input type="number" value={materialExport.bars} min={1} max={16} onChange={(e) => setMaterialExport((s) => ({ ...s, bars: clampBars(Number(e.target.value) || 4) }))} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
            </label>
            <label className="space-y-1 text-xs text-neutral-400">
              <span className="block uppercase tracking-[0.2em] text-neutral-500">Segmente</span>
              <input type="number" value={materialExport.guideSegments} min={1} max={16} onChange={(e) => {
                const nextSegments = clampGuideSegments(Number(e.target.value) || 4);
                setMaterialExport((s) => ({ ...s, guideSegments: nextSegments, guideMarkers: buildDefaultGuideMarkers(nextSegments) }));
              }} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
            </label>
          </div>

          {activeWorkspace === 'wave-material' ? (
          <div className="border border-neutral-800 bg-neutral-950/70 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-neutral-400">
              <div className="uppercase tracking-[0.2em] text-neutral-500">Arbeitsfläche</div>
              <div className="text-neutral-500">Auswahl {sourceAsset ? sourceAsset.importDurationSec.toFixed(2) : selectionDurationSec.toFixed(2)}s → Vollbreite · Loop bei {materialExport.bpm} BPM = {loopDurationSec.toFixed(2)}s</div>
            </div>
            <canvas
              ref={canvasRef}
              tabIndex={0}
              width={1200}
              height={420}
              className="w-full border border-neutral-800 bg-black cursor-crosshair"
              onMouseDown={handleCanvasDown}
              onMouseMove={handleCanvasMove}
              onMouseUp={() => {
                if (activeTool === 'stamp' && isStampSelectingRef.current && stampSelEndRef.current) finalizeStampSelection(stampSelEndRef.current);
                drawingRef.current = false;
                lastCellRef.current = null;
              }}
              onMouseLeave={() => setHoveredCell(null)}
              onContextMenu={handleCanvasContextMenu}
              onWheel={handleCanvasWheel}
            />
          </div>
          ) : (
          <div className="rounded border border-neutral-800 bg-neutral-950/40 p-3 text-xs text-neutral-400">
            <div className="uppercase tracking-[0.2em] text-neutral-500">Wave / Material ruht</div>
            <div className="mt-1 leading-relaxed">Die spektrale Arbeitsfläche bleibt erhalten, ist aber im Moment bewusst in den Hintergrund genommen, damit die Microtonal-Logic-Ebene als eigener Maschinenraum bearbeitet werden kann.</div>
            <button type="button" onClick={() => setActiveWorkspace('wave-material')} className="mt-3 rounded border border-violet-700 px-2 py-1 text-violet-200 hover:bg-violet-950/30">Zur Wave / Material Fläche wechseln</button>
          </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 border border-neutral-800 bg-neutral-950/70 p-3">
              <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">Transport</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void handlePlay()} className="border border-neutral-700 px-3 py-1.5 text-neutral-200 hover:bg-neutral-900">{isPlaying ? 'Stop' : 'Play'}</button>
                <button type="button" onClick={() => setPlayheadPosition(0)} className="border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-900">Zurück</button>
                <button type="button" onClick={performUndo} disabled={undoStackRef.current.length === 0} className="border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-900 disabled:opacity-40">Undo</button>
                <button type="button" onClick={performRedo} disabled={redoStackRef.current.length === 0} className="border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-900 disabled:opacity-40">Redo</button>
                <button type="button" onClick={() => void handleExport()} disabled={busy} className="border border-violet-700 px-3 py-1.5 text-violet-200 hover:bg-violet-900/40 disabled:opacity-60">Export</button>
                <button type="button" onClick={() => void handleExport('source-direct')} disabled={busy || !rawSourceAsset} className="border border-emerald-700 px-3 py-1.5 text-emerald-200 hover:bg-emerald-900/30 disabled:opacity-60">Direktquelle</button>
                <button type="button" onClick={() => void handleProbe()} disabled={busy} className="border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-900 disabled:opacity-60">Externe Probe</button>
              </div>
              <div className="text-[10px] text-neutral-500">History: {undoStackRef.current.length} Undo · {redoStackRef.current.length} Redo · Ctrl/Cmd+Z / Ctrl/Cmd+Y</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {([
                  { id: 'forge', label: 'Forge' },
                  { id: 'sourceWindow', label: 'WAV-Fenster' },
                  { id: 'sourceFull', label: 'WAV komplett' },
                ] as const).map((entry) => (
                  <button key={entry.id} type="button" onClick={() => setSourcePreviewMode(entry.id)} className={`border px-2 py-1 ${sourcePreviewMode === entry.id ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200' : 'border-neutral-700 text-neutral-400 hover:bg-neutral-900'}`}>{entry.label}</button>
                ))}
              </div>
              <div className="grid gap-2 md:grid-cols-3 text-xs text-neutral-400">
                <label className="space-y-1">
                  <span className="block uppercase tracking-[0.2em] text-neutral-500">Synthese</span>
                  <select value={synthMode} onChange={(e) => { setSynthMode(e.target.value as SynthMode); audioEngine.invalidateBuffer(); }} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100">
                    <option value="glyph">Glyph</option>
                    <option value="granular">Granular</option>
                    <option value="additive">Additiv</option>
                    <option value="ifft">IFFT</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="block uppercase tracking-[0.2em] text-neutral-500">Adapter</span>
                  <select value={materialExport.adapterId} onChange={(e) => setMaterialExport((s) => ({ ...s, adapterId: e.target.value }))} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100">
                    {adapters.map((adapter) => <option key={adapter.adapterId} value={adapter.adapterId}>{adapter.adapterName}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="block uppercase tracking-[0.2em] text-neutral-500">Xensonar-Handoff</span>
                  <select value={materialExport.transferMode} onChange={(e) => setMaterialExport((s) => ({ ...s, transferMode: e.target.value as TransferMode }))} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100">
                    <option value="forge-render">Forge-Render / Übersetzung</option>
                    <option value="source-direct">Direktquelle / unbearbeiteter Loop</option>
                  </select>
                </label>
              </div>
              <div className="rounded border border-neutral-800 bg-neutral-900/70 p-2 text-[11px] text-neutral-400">
                <div className="font-medium text-neutral-200">{selectedAdapter.adapterName}</div>
                <div>{selectedAdapter.description}</div>
                <div className="mt-2 text-neutral-500">{materialExport.transferMode === 'source-direct' ? 'Direktquelle bedeutet: die gewählte Audio-Auswahl darf ohne Forge-Resynthese in Xensonar landen.' : 'Forge-Render bedeutet: die Auswahl wird durch die aktive Forge-Übersetzung in Material verwandelt.'}</div>
              </div>
              <div className="rounded border border-cyan-900/40 bg-cyan-950/10 p-2 text-[11px] text-neutral-300">
                <div className="uppercase tracking-[0.2em] text-cyan-300">Handoff-Kompass</div>
                <div className="mt-1">{summarizeHandoffProfile(activeHandoffProfile)}</div>
                <div className="mt-1 text-neutral-500">Balance-Träger: {activeHandoffProfile.balanceCarrier}</div>
              </div>
            </div>

            {activeWorkspace === 'wave-material' ? (
            <div className="space-y-3 border border-neutral-800 bg-neutral-950/70 p-3 md:col-span-2">
              <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">Quelle · Loop-Auswahl · Detailzoom</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span>Gesamte Datei</span>
                  <span>{rawSourceAsset ? `${rawSourceAsset.originalDuration.toFixed(2)}s` : 'keine Quelle'}</span>
                </div>
                <canvas ref={sourcePreviewRef} width={1200} height={96} className="w-full border border-neutral-800 bg-black cursor-ew-resize" onMouseDown={handleSourcePreviewDown} />
              </div>
              <div className="grid gap-2 md:grid-cols-[10rem_10rem_minmax(0,1fr)_auto]">
                <label className="space-y-1 text-xs text-neutral-400">
                  <span className="block uppercase tracking-[0.2em] text-neutral-500">Start</span>
                  <input type="number" min={0} step={0.01} value={selectionStartSec} onChange={(e) => { setSelectionStartSec(Math.max(0, Number(e.target.value) || 0)); setSelectionDirty(true); }} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
                </label>
                <label className="space-y-1 text-xs text-neutral-400">
                  <span className="block uppercase tracking-[0.2em] text-neutral-500">Dauer</span>
                  <input type="number" min={0.25} step={0.01} value={selectionDurationSec} onChange={(e) => { setSelectionDurationSec(Math.max(0.25, Number(e.target.value) || 0.25)); setSelectionDirty(true); }} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
                </label>
                <div className="rounded border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-[11px] text-neutral-400">
                  Grob oben markieren → unten fein markieren → Auswahl laden → Loop korrigieren → Übernehmen
                </div>
                <button type="button" onClick={resetAuditionBlend} className="self-end rounded border border-neutral-700 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-900">Nur WAV</button>
              </div>
              {lastAutoCorrect && (
                <div className="space-y-2 rounded border border-cyan-900/50 bg-cyan-950/10 p-2 text-[11px] text-cyan-100/90">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="uppercase tracking-[0.2em] text-cyan-300">Loop-Deutung</span>
                    <span>{lastAutoCorrect.bpm} BPM</span>
                    <span>·</span>
                    <span>{lastAutoCorrect.bars} Takte</span>
                    <span>·</span>
                    <span>Vertrauen {(lastAutoCorrect.confidence * 100).toFixed(0)}%</span>
                    <button type="button" onClick={() => void applyLoopSuggestion(lastAutoCorrect, lastAutoCorrect.bars, true)} className="ml-auto rounded border border-cyan-700 px-2 py-1 text-cyan-100 hover:bg-cyan-900/30">Übernehmen</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {lastAutoCorrect.candidates.map((candidate) => (
                      <button
                        key={candidate.bars}
                        type="button"
                        onClick={() => void applyLoopSuggestion(lastAutoCorrect, candidate.bars, false)}
                        className={`rounded border px-2 py-1 ${materialExport.bars === candidate.bars ? 'border-cyan-500 bg-cyan-950/40 text-cyan-100' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}
                      >
                        {candidate.bars} T · {candidate.durationSec.toFixed(2)}s · {(candidate.fitScore * 100).toFixed(0)}%
                      </button>
                    ))}
                  </div>
                  <div className="text-cyan-100/70">Die Buttons deuten denselben Ausschnitt unterschiedlich. So lässt sich derselbe Loop später bewusst polyrhythmisch gegen Xensonar lesen.</div>
                </div>
              )}
              {pendingImageImport && (
                <div className="space-y-2 rounded border border-fuchsia-900/50 bg-fuchsia-950/10 p-3 text-xs text-fuchsia-100/90">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="uppercase tracking-[0.2em] text-fuchsia-300">Bildübersetzung</div>
                      <div className="text-[11px] text-fuchsia-100/70">Forge-1-Ansätze werden hier in einen feineren Übersetzungsraum gezogen: Fit, Verschiebung, Kontrast und Leseart bleiben offen, bevor das Bild Material wird.</div>
                    </div>
                    <div className="text-[11px] text-fuchsia-100/70">{pendingImageImport.image.naturalWidth}×{pendingImageImport.image.naturalHeight}</div>
                  </div>
                  <canvas ref={imageImportPreviewRef} width={1200} height={180} className="w-full border border-fuchsia-900/40 bg-white" />
                  <div className="grid gap-2 md:grid-cols-3">
                    <label className="space-y-1"><span>Fit</span><select value={pendingImageImport.fitMode} onChange={(e) => setPendingImageImport((state) => state ? { ...state, fitMode: e.target.value as ImageImportFitMode } : state)} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"><option value="crop">Crop</option><option value="stretch">Stretch</option><option value="containLeft">Contain links</option><option value="containRight">Contain rechts</option></select></label>
                    <label className="space-y-1"><span>Leseart</span><select value={pendingImageImport.readMode} onChange={(e) => setPendingImageImport((state) => state ? { ...state, readMode: e.target.value as ImageImportReadMode } : state)} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"><option value="legacy">Legacy-Masse</option><option value="contour">Kontur</option><option value="hybrid">Hybrid</option></select></label>
                    <label className="space-y-1"><span>Kontrast {pendingImageImport.contrast.toFixed(2)}</span><input type="range" min={0} max={1} step={0.01} value={pendingImageImport.contrast} onChange={(e) => setPendingImageImport((state) => state ? { ...state, contrast: Number(e.target.value) } : state)} className="w-full" /></label>
                    <label className="space-y-1 md:col-span-2"><span>Shift X {(pendingImageImport.shiftX * 100).toFixed(0)}%</span><input type="range" min={-1} max={1} step={0.01} value={pendingImageImport.shiftX} onChange={(e) => setPendingImageImport((state) => state ? { ...state, shiftX: Number(e.target.value) } : state)} className="w-full" /></label>
                    <label className="space-y-1"><span>Shift Y {(pendingImageImport.shiftY * 100).toFixed(0)}%</span><input type="range" min={-1} max={1} step={0.01} value={pendingImageImport.shiftY} onChange={(e) => setPendingImageImport((state) => state ? { ...state, shiftY: Number(e.target.value) } : state)} className="w-full" /></label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => void confirmImageImport()} className="rounded border border-fuchsia-700 bg-fuchsia-950/40 px-3 py-1 text-fuchsia-100 hover:bg-fuchsia-900/30 disabled:opacity-50">Bild in Wave/Material laden</button>
                    <button type="button" onClick={() => setPendingImageImport(null)} className="rounded border border-neutral-700 px-3 py-1 text-neutral-200 hover:bg-neutral-900">verwerfen</button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span>Loop-Detail / Sicht folgt oben</span>
                  <span>{rawSourceAsset ? `${detailViewportRange.startSec.toFixed(2)}s → ${(detailViewportRange.startSec + detailViewportRange.durationSec).toFixed(2)}s` : 'noch nicht geladen'}</span>
                </div>
                <canvas ref={sourceDetailRef} width={1200} height={110} className="w-full border border-neutral-800 bg-black cursor-crosshair" onMouseDown={handleSourceDetailDown} />
                <div className="flex items-center justify-between gap-3 text-[11px] text-neutral-500">
                  <span>Feinauswahl unten setzen (Maske bleibt eigenständig)</span>
                  <span className="text-right">{detailSelectionDirty ? `${detailSelectionStartSec.toFixed(2)}s → ${(detailSelectionStartSec + detailSelectionDurationSec).toFixed(2)}s` : 'noch keine Feinauswahl'}</span>
                </div>
                <div className="text-[10px] text-neutral-500">
                  {detailSelectionVisibility.state === 'partial' ? `Feinauswahl bleibt erhalten, greift aber aktuell ${detailSelectionVisibility.leftOverflow && detailSelectionVisibility.rightOverflow ? 'links und rechts' : detailSelectionVisibility.leftOverflow ? 'links' : 'rechts'} über das obere Sichtfenster hinaus.` : detailSelectionVisibility.state === 'outside' ? 'Feinauswahl bleibt gespeichert, liegt aktuell aber komplett außerhalb des oberen Sichtfensters.' : 'Oben bestimmt, was unten sichtbar ist; die untere Maske bleibt dabei bestehen.'}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                    <span>Abtaststreifen / Playback</span>
                    <span>{effectiveLoopPreviewSelection.isDetail ? 'Loop hören folgt der Feinauswahl' : 'Loop hören folgt der geladenen Auswahl'}</span>
                  </div>
                  <canvas ref={sourceDetailPlaystripRef} width={1200} height={30} className="w-full border border-neutral-800 bg-black" />
                </div>
                <div className="grid gap-2 md:grid-cols-[auto_auto_auto_auto_1fr] text-xs text-neutral-300">
                  <button type="button" onClick={loadDetailSelection} disabled={!rawSourceAsset || !detailSelectionDirty} className="rounded border border-neutral-700 px-3 py-2 hover:bg-neutral-900 disabled:opacity-40">Auswahl laden</button>
                  <button type="button" onClick={() => void handleAutoCorrect()} disabled={!rawSourceAsset || busy} className="rounded border border-cyan-700 px-3 py-2 text-cyan-200 hover:bg-cyan-950/30 disabled:opacity-40">Loop korrigieren</button>
                  <button type="button" onClick={() => rawSourceAsset && void applySelection(rawSourceAsset, selectionStartSec, selectionDurationSec, 'manual', { preserveDetailSelection: true, resetDetailViewport: false })} disabled={!rawSourceAsset || busy} className="rounded border border-violet-700 px-3 py-2 text-violet-200 hover:bg-violet-950/30 disabled:opacity-40">Übernehmen</button>
                  <button type="button" onClick={() => void toggleSelectionLoopPreview()} disabled={!rawSourceAsset} className="rounded border border-emerald-700 px-3 py-2 text-emerald-100 hover:bg-emerald-900/30 disabled:opacity-40">{selectionLoopPreviewPlaying ? 'Stop' : 'Loop hören'}</button>
                  <div className="self-center text-[11px] text-neutral-500">Naht {(selectionSeamScore * 100).toFixed(0)}%{auditionView !== 'none' && auditionBlendAmount > 0 ? ` · ${SOURCE_VIEWS.find((entry) => entry.id === auditionView)?.label ?? auditionView} ${(auditionBlendAmount * 100).toFixed(0)}%` : ''}</div>
                </div>
                <div className="grid gap-2 text-[10px] text-neutral-500 md:grid-cols-4">
                  <div className="rounded border border-neutral-800 bg-neutral-900/50 px-2 py-1">Auswahl laden = die Feinauswahl wird oben zur aktiven Auswahl; unten folgt der Sichtbereich wieder oben, ohne die untere Maske zu löschen.</div>
                  <div className="rounded border border-neutral-800 bg-neutral-900/50 px-2 py-1">Loop hören folgt der unteren Maske; Pfeile an den Rändern zeigen, wenn die Maske über das aktuelle obere Sichtfenster hinausreicht.</div>
                  <div className="rounded border border-neutral-800 bg-neutral-900/50 px-2 py-1">Loop korrigieren macht nur den letzten metrischen/nahtbezogenen Feinschliff.</div>
                  <div className="rounded border border-neutral-800 bg-neutral-900/50 px-2 py-1">Übernehmen schiebt erst dann in die spektrale Arbeitsfläche.</div>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="space-y-2 rounded border border-neutral-800 bg-neutral-950/40 p-3">
                  <div className="uppercase tracking-[0.2em] text-xs text-neutral-500">Waveform-Mix</div>
                  <div className="grid gap-2 text-xs text-neutral-400 sm:grid-cols-2">
                    {(['sine', 'sawtooth', 'square', 'triangle'] as const).map((key) => (
                      <label key={key} className="block space-y-1">
                        <span>{key} {waveformMix[key].toFixed(2)}</span>
                        <input type="range" min={0} max={1} step={0.01} value={waveformMix[key]} onChange={(e) => setWaveformMix((state) => ({ ...state, [key]: Number(e.target.value) }))} className="w-full" />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 rounded border border-neutral-800 bg-neutral-950/40 p-3 text-xs text-neutral-300">
                  <div className="uppercase tracking-[0.2em] text-neutral-500">Noten-Inspector</div>
                  {selectedLoopNote ? (
                    <>
                      <div className="rounded border border-neutral-800 bg-neutral-950/60 p-2 text-[11px] text-neutral-400">
                        <div><span className="text-neutral-500">Spur:</span> {composerTrackById(loopComposer, selectedLoopNote.trackId).label}</div>
                        <div><span className="text-neutral-500">Rasterschritt:</span> {loopComposer.pitchSteps.find((step) => step.id === selectedLoopNote.stepId)?.label ?? selectedLoopNote.stepId}</div>
                        <div><span className="text-neutral-500">Start/Länge:</span> {selectedLoopNote.startStep} / {selectedLoopNote.lengthSteps}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void startComposerPreviewMode('selected-note')} className="rounded border border-emerald-700/70 bg-emerald-950/30 px-2 py-1 text-emerald-200 hover:bg-emerald-900/30">Note hören</button>
                        <button type="button" onClick={() => stopAllForge2Preview('Notenvorschau gestoppt.')} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900">Stop</button>
                      </div>
                      <label className="space-y-1"><span>Velocity {selectedLoopNote.velocity.toFixed(2)}</span><input type="range" min={0.1} max={1} step={0.01} value={selectedLoopNote.velocity} onChange={(e) => updateSelectedNote((note) => { note.velocity = Number(e.target.value); })} className="w-full" /></label>
                      <label className="space-y-1"><span>Fade In {selectedLoopNote.fadeInSteps}</span><input type="range" min={0} max={Math.max(0, selectedLoopNote.lengthSteps - 1)} step={1} value={selectedLoopNote.fadeInSteps} onChange={(e) => updateSelectedNote((note) => { note.fadeInSteps = Math.min(Number(e.target.value), Math.max(0, note.lengthSteps - 1)); })} className="w-full" /></label>
                      <label className="space-y-1"><span>Fade Out {selectedLoopNote.fadeOutSteps}</span><input type="range" min={0} max={Math.max(0, selectedLoopNote.lengthSteps - 1)} step={1} value={selectedLoopNote.fadeOutSteps} onChange={(e) => updateSelectedNote((note) => { note.fadeOutSteps = Math.min(Number(e.target.value), Math.max(0, note.lengthSteps - 1)); })} className="w-full" /></label>
                      <label className="space-y-1"><span>Oktavoffset {selectedLoopNote.octaveOffset}</span><input type="range" min={-3} max={3} step={1} value={selectedLoopNote.octaveOffset} onChange={(e) => updateSelectedNote((note) => { note.octaveOffset = Number(e.target.value); })} className="w-full" /></label>
                    </>
                  ) : (
                    <div className="rounded border border-dashed border-neutral-800 p-3 text-neutral-500">Noch keine Note gewählt.</div>
                  )}
                  <div className="rounded border border-neutral-800 bg-neutral-950/60 p-2 text-[10px] text-neutral-500">Die Noten hängen an stabilen Step-IDs, nicht bloß an visuellen Reihen. Wenn du die Dreiecke links verschiebst, bleiben die Noten an ihrem Rasterschritt, aber ihr Klang verändert sich kontrolliert mit.</div>
                </div>
              </div>
              <div className="text-[11px] leading-relaxed text-neutral-500">
                {rawSourceAsset
                  ? `${rawSourceAsset.fileName} · ${rawSourceAsset.sampleRate} Hz · ${rawSourceAsset.channelCount} Kanäle · Stereo-Breite ${(Math.max(...Array.from(rawSourceAsset.stereoWidthPreview)) * 100).toFixed(0)}% max · Auswahl ${selectionDurationSec.toFixed(2)}s`
                  : 'Noch keine Quelle geladen. Audio und Bild lassen sich hier jetzt in getrennte Übersetzungswege schicken.'}
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px]"><span className="text-cyan-300">{status}</span><span className="text-neutral-500">{activeWorkspaceDef.label} · History {historyVersion} · Undo {undoStackRef.current.length} · Redo {redoStackRef.current.length}</span></div>
            </div>
            ) : (
            <div className="rounded border border-neutral-800 bg-neutral-950/40 p-3 text-xs text-neutral-400 md:col-span-2">
              <div className="uppercase tracking-[0.2em] text-neutral-500">Quelle · Loop-Auswahl · Detailzoom</div>
              <div className="mt-1 leading-relaxed">Die Rohquelle, Loop-Auswahl und der pragmatische Preview-Strang bleiben erhalten, sind aber gerade nicht die aktive Arbeitsfläche. So kann Forge 2 gleitend zwischen Klangmaterial und Pitch-Time-Komposition umschalten, ohne den alten Balancekern zu verlieren.</div>
              <button type="button" onClick={() => setActiveWorkspace('wave-material')} className="mt-3 rounded border border-cyan-700 px-2 py-1 text-cyan-200 hover:bg-cyan-950/30">Zur Quell- und Loop-Fläche wechseln</button>
            </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-3 border border-neutral-800 bg-neutral-950/70 p-3">
            <div className="rounded border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-[11px] text-neutral-400">View-Klicks mischen die gewählte Lesart nur leicht in die Original-WAV im oberen WAV-Fenster und im unteren Loop-Vorhörer. Erst „Auf Arbeitsfläche übertragen“ baut daraus die eigentliche Forge-Arbeitsfläche.</div>

            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">Source Views</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {SOURCE_VIEWS.map((view) => (
                  <button key={view.id} type="button" onClick={() => handleSourceViewAuditionClick(view.id)} className={`rounded border p-2 text-left ${sourceView === view.id ? 'border-cyan-500 bg-cyan-950/30' : 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900'}`}>
                    <canvas ref={(node) => { viewCanvasesRef.current[view.id] = node; }} width={180} height={70} className="mb-2 w-full border border-black/40 bg-black" />
                    <div className="text-[11px] font-medium text-neutral-200">{view.label}</div>
                    <div className="text-[10px] leading-snug text-neutral-500">{auditionView === view.id && auditionBlendAmount > 0 ? `Preview-Mix ${(auditionBlendAmount * 100).toFixed(0)}%` : view.hint}</div>
                  </button>
                ))}
              </div>
              <div className="mt-2 space-y-2 rounded border border-neutral-800 bg-neutral-900/60 p-2 text-xs text-neutral-400">
                <div className="uppercase tracking-[0.2em] text-neutral-500">View-Komposition</div>
                <label className="block space-y-1">
                  <span>Sekundäransicht</span>
                  <select value={secondaryView} onChange={(e) => setSecondaryView(e.target.value as CanonicalSourceView | 'none')} className="w-full border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100">
                    <option value="none">keine</option>
                    {SOURCE_VIEWS.filter((view) => view.id !== sourceView).map((view) => <option key={view.id} value={view.id}>{view.label}</option>)}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span>Blend {Math.round(viewBlend * 100)}%</span>
                  <input type="range" min={0} max={1} step={0.01} value={viewBlend} onChange={(e) => setViewBlend(Number(e.target.value))} className="w-full" />
                </label>
              </div>
              <button type="button" disabled={!bundle} onClick={() => rebuildFromView(sourceView)} className="mt-2 w-full border border-neutral-700 px-3 py-2 text-left text-neutral-300 hover:bg-neutral-900 disabled:opacity-50">Gewählte View auf die Arbeitsfläche übertragen</button>
            </div>

            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">Werkzeuge</div>
              <div className="grid grid-cols-2 gap-2">
                {TOOLS.map((tool) => (
                  <button key={tool.id} type="button" onClick={() => setActiveTool(tool.id)} className={`rounded border px-2 py-2 text-left ${activeTool === tool.id ? 'border-violet-500 bg-violet-950/30 text-violet-200' : 'border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:bg-neutral-900'}`}>
                    <div className="text-sm">{tool.icon} {tool.label}</div>
                    <div className="text-[10px] leading-snug text-neutral-500">{tool.hint}</div>
                  </button>
                ))}
              </div>
              <div className="mt-2 space-y-2 text-xs text-neutral-400">
                <label className="block space-y-1"><span>Größe {brushSize.toFixed(0)}</span><input type="range" min={2} max={activeTool === 'morph' ? spectralData.height : 96} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full" /></label>
                <label className="block space-y-1"><span>Intensität {intensity.toFixed(2)}</span><input type="range" min={0.05} max={1} step={0.01} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} className="w-full" /></label>
                <label className="block space-y-1"><span>Härte {hardness.toFixed(2)}</span><input type="range" min={0} max={1} step={0.01} value={hardness} onChange={(e) => setHardness(Number(e.target.value))} className="w-full" /></label>
                {activeTool === 'morph' && (
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['push', 'Verziehen'],
                      ['bloat', 'Wölben'],
                      ['pinch', 'Schrumpfen'],
                      ['twirlCW', 'Kreisel ↻'],
                      ['twirlCCW', 'Kreisel ↺'],
                    ] as const).map(([mode, label]) => (
                      <button key={mode} type="button" onClick={() => setMorphMode(mode)} className={`rounded border px-2 py-1 text-left ${morphMode === mode ? 'border-cyan-500 bg-cyan-950/30 text-cyan-200' : 'border-neutral-700 text-neutral-400 hover:bg-neutral-900'}`}>{label}</button>
                    ))}
                  </div>
                )}
                <label className="inline-flex items-center gap-2 text-neutral-300"><input type="checkbox" checked={eraseMode} onChange={(e) => setEraseMode(e.target.checked)} /> Erase / invertieren</label>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">Stamp-Modul aus Forge 1</div>
              <div className="space-y-2 text-xs text-neutral-400">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <select value={stampPresetId} onChange={(e) => setStampPresetId(e.target.value)} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100">
                    <option value="">Kein Preset</option>
                    {stampPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                  </select>
                  <button type="button" onClick={() => { if (!stampPresetId) return; loadStampForPlacement(cloneStamp(stampPresetId), { status: 'Preset-Stempel geladen.' }); setActiveTool('stamp'); }} disabled={!stampPresetId} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900 disabled:opacity-40">Preset laden</button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => { setActiveTool('stamp'); setStampPhase('selecting'); setStatus('Stamp steht auf Rechteck-Aufnahme.'); }} className={`rounded border px-2 py-1 ${stampPhase === 'selecting' ? 'border-cyan-500 bg-cyan-950/40 text-cyan-100' : 'border-neutral-700 text-neutral-200 hover:bg-neutral-900'}`}>Rechteck aufnehmen</button>
                  <button type="button" onClick={() => { setActiveTool('stamp'); if (stampData) setStampPhase('stamping'); }} disabled={!stampData} className={`rounded border px-2 py-1 ${stampPhase === 'stamping' ? 'border-cyan-500 bg-cyan-950/40 text-cyan-100' : 'border-neutral-700 text-neutral-200 hover:bg-neutral-900 disabled:opacity-40'}`}>Stempeln</button>
                  <button type="button" onClick={() => clearStampAndRestoreWorkflow('Stamp geleert.')} disabled={!stampData} className="rounded border border-red-900/70 px-2 py-1 text-red-200 hover:bg-red-950/40 disabled:opacity-40">Leeren</button>
                  <span className="text-[10px] text-cyan-200/70">{stampPhase === 'selecting' ? 'Im Arbeitsfeld ein Rechteck ziehen.' : `Aktiver Stempel ${stampData ? `${stampData.width}×${stampData.height}` : '—'}`}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1"><span>Scale X {stampScaleX.toFixed(2)}</span><input type="range" min={0.2} max={4} step={0.01} value={stampScaleX} onChange={(e) => setStampScaleX(Number(e.target.value))} className="w-full" /></label>
                  <label className="block space-y-1"><span>Scale Y {stampScaleY.toFixed(2)}</span><input type="range" min={0.2} max={4} step={0.01} value={stampScaleY} onChange={(e) => setStampScaleY(Number(e.target.value))} className="w-full" /></label>
                </div>
                <label className="block space-y-1"><span>Rotation {(stampRotation * 180 / Math.PI).toFixed(0)}°</span><input type="range" min={-3.14159} max={3.14159} step={0.01} value={stampRotation} onChange={(e) => setStampRotation(Number(e.target.value))} className="w-full" /></label>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={stampFlipX} onChange={(e) => setStampFlipX(e.target.checked)} /> Flip X</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={stampFlipY} onChange={(e) => setStampFlipY(e.target.checked)} /> Flip Y</label>
                  <button type="button" onClick={resetStampTransforms} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900">Reset</button>
                </div>
                <div className="text-[10px] text-neutral-500">Linksklick stempelt. Rechtsklick leert. Pfeiltasten ändern X/Y. Mausrad oder Zwei-Finger-Zoom skaliert gleichmäßig. Q/E dreht.</div>
              </div>
            </div>


            <div className="space-y-2 rounded border border-neutral-800 bg-neutral-900/40 p-3">
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">Forge-2-Projekte</div>
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Projektname" className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100" />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button type="button" disabled={busy} onClick={() => void saveProject(false)} className="rounded border border-cyan-700/60 bg-cyan-950/30 px-2 py-1 text-cyan-200 hover:bg-cyan-900/30 disabled:opacity-50">neu speichern</button>
                <button type="button" disabled={busy} onClick={() => void saveProject(true)} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50">überschreiben</button>
                <button type="button" disabled={!selectedProjectId || busy} onClick={() => void renameProject()} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50">umbenennen</button>
                <button type="button" disabled={!selectedProjectId || busy} onClick={() => selectedProjectId && void loadProject(selectedProjectId)} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50">laden</button>
                <button type="button" disabled={!selectedProjectId || busy} onClick={() => void removeProject()} className="rounded border border-red-900/70 px-2 py-1 text-red-200 hover:bg-red-950/40 disabled:opacity-50">löschen</button>
              </div>
              <div className="max-h-40 space-y-2 overflow-y-auto pr-1 text-xs">
                {canonicalProjects.length === 0 ? <div className="rounded border border-dashed border-neutral-800 px-2 py-2 text-neutral-500">Noch keine Forge-2-Projekte.</div> : canonicalProjects.map((entry) => (
                  <button key={entry.id} type="button" onClick={() => setSelectedProjectId(entry.id)} className={`block w-full rounded border p-2 text-left ${selectedProjectId === entry.id ? 'border-cyan-600/70 bg-cyan-950/20' : 'border-neutral-800 bg-neutral-950/40'}`}>
                    <div className="text-neutral-100">{entry.name}</div>
                    <div className="text-[10px] text-neutral-500">{entry.bars} Takte · {Math.round(entry.bpm)} BPM · {entry.hasSourceAudio ? `${entry.sourceDurationSec?.toFixed(1) ?? '?'}s Quelle · ` : ''}{new Date(entry.updatedAt).toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded border border-neutral-800 bg-neutral-900/40 p-3">
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">Datenbanken · Material & Stempel</div>
              <input value={customStampName} onChange={(e) => setCustomStampName(e.target.value)} placeholder="Custom-Stempelname" className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100" />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button type="button" disabled={busy || !stampData} onClick={() => void saveCurrentStampToLibrary(false)} className="rounded border border-cyan-700/60 bg-cyan-950/30 px-2 py-1 text-cyan-200 hover:bg-cyan-900/30 disabled:opacity-50">Stempel sichern</button>
                <button type="button" disabled={busy || !stampData} onClick={() => void saveCurrentStampToLibrary(true)} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50">Stempel überschreiben</button>
                <button type="button" disabled={!selectedCustomStamp || busy} onClick={() => void renameCurrentCustomStamp()} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50">Stempel umbenennen</button>
                <button type="button" disabled={!selectedCustomStamp} onClick={loadCustomStampFromLibrary} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50">Stempel laden</button>
                <button type="button" disabled={!selectedStampId || busy} onClick={() => void removeCustomStampFromLibrary()} className="rounded border border-red-900/70 px-2 py-1 text-red-200 hover:bg-red-950/40 disabled:opacity-50">Stempel löschen</button>
              </div>
              <div className="max-h-28 space-y-2 overflow-y-auto pr-1 text-xs">
                {customStampEntries.length === 0 ? <div className="rounded border border-dashed border-neutral-800 px-2 py-2 text-neutral-500">Noch keine Custom-Stempel.</div> : customStampEntries.map((entry) => (
                  <button key={entry.id} type="button" onClick={() => setSelectedStampId(entry.id)} className={`block w-full rounded border p-2 text-left ${selectedStampId === entry.id ? 'border-cyan-600/70 bg-cyan-950/20' : 'border-neutral-800 bg-neutral-950/40'}`}>
                    <div className="text-neutral-100">{entry.name}</div>
                    <div className="text-[10px] text-neutral-500">{entry.width}×{entry.height}</div>
                  </button>
                ))}
              </div>
              <input value={materialRenameDraft} onChange={(e) => setMaterialRenameDraft(e.target.value)} placeholder="Materialname" className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100" />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button type="button" disabled={!selectedMaterial} onClick={() => selectedMaterial && previewMaterial(selectedMaterial.blobUrl)} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50">Material vorhören</button>
                <button type="button" disabled={!selectedMaterial || busy} onClick={() => void renameSelectedMaterial()} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50">Material umbenennen</button>
                <button type="button" disabled={!selectedMaterial || busy} onClick={() => void removeSelectedMaterial()} className="rounded border border-red-900/70 px-2 py-1 text-red-200 hover:bg-red-950/40 disabled:opacity-50">Material löschen</button>
                <button type="button" onClick={() => setMaterialRenameDraft(materialExport.name)} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900">Forge-Name übernehmen</button>
              </div>
              <div className="max-h-28 space-y-2 overflow-y-auto pr-1 text-xs">
                {materialEntries.length === 0 ? <div className="rounded border border-dashed border-neutral-800 px-2 py-2 text-neutral-500">Noch keine exportierten Materialien.</div> : materialEntries.map((entry) => (
                  <button key={entry.id} type="button" onClick={() => setSelectedMaterialId(entry.id)} className={`block w-full rounded border p-2 text-left ${selectedMaterialId === entry.id ? 'border-cyan-600/70 bg-cyan-950/20' : 'border-neutral-800 bg-neutral-950/40'}`}>
                    <div className="text-neutral-100">{entry.name}</div>
                    <div className="text-[10px] text-neutral-500">{entry.role} · {entry.bars} Takte · {Math.round(entry.bpm)} BPM</div>
                  </button>
                ))}
              </div>
            </div>



          </div>
        </div>
      </div>
    </section>
  );
}

