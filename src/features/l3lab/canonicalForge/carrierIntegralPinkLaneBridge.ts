import { clampBars } from '../spectralForge/state/storeMaterialExport';
import type { LocalFieldModuleState } from './localField';
import type { RootFollowBankEntryConfig, RootFollowSynthNoteSnapshot, RootFollowSynthPatternSnapshot } from '../../xensonar/rootFollow/rootFollowTypes';
import {
  createDefaultLoopTimeGuides,
  hydrateLoopTrack,
  loopUnitsPerBeat,
  makeLoopNote,
  syncLoopNoteToState,
  totalLoopUnits,
  type CarrierIntegralFieldClip,
  type CarrierIntegralFieldVoiceEvent,
  type LoopComposerState,
} from './loopDrumDomain';
import type { LoopTrackInstrumentPreset } from './melodicSoundRegistry';
import { resolveMaterialAnchor } from './materialBaseWorkflow';
import { LOOP_IMPORT_TRACK_IDS } from './loopImportExportContracts';
import type { CarrierIntegralPinkExportDetail, CarrierIntegralPinkVariant } from '../contracts/carrierIntegralPinkExportContract';
import type { MelodicImportLanePlacement } from './melodicImportLanePolicy';
export type { CarrierIntegralPinkExportDetail, CarrierIntegralPinkVariant } from '../contracts/carrierIntegralPinkExportContract';

export const CARRIER_INTEGRAL_PINK_TRACK_ID = LOOP_IMPORT_TRACK_IDS.carrierPink;
export const CARRIER_INTEGRAL_PINK_TRACK_COLOR = '#f472b6';

export const CARRIER_INTEGRAL_PINK_VARIANTS: Array<{ id: CarrierIntegralPinkVariant; label: string; description: string; enabled: boolean }> = [
  { id: 'last-hearing', label: 'Fretless-Feld', description: 'strukturierter Carrier-Feldclip: mehrstimmig, glissando-/vibratofähig, nicht Raw Audio', enabled: true },
  { id: 'grained', label: 'Raw Audio', description: 'gerenderter Carrier-Klangkörper als Audiomaterial in die pinke Sample-/Materialspur', enabled: true },
  { id: 'scattered', label: 'zerstreut', description: 'experimentelle Rasterprojektion wie 5.113', enabled: true },
  { id: 'monotone', label: 'monoton', description: 'Ankerkörper mit einer Pitchkurve wie 5.115', enabled: true },
];

export function normalizeCarrierIntegralPinkVariant(value: unknown): CarrierIntegralPinkVariant {
  if (value === 'last-hearing' || value === 'grained' || value === 'scattered' || value === 'monotone') return value;
  if (value === 'anchor-body') return 'monotone';
  if (value === 'experimental-frequency-projection') return 'scattered';
  return 'last-hearing';
}

export type CarrierIntegralPinkApplyResult = {
  applied: boolean;
  reason: string;
  noteCount: number;
  roundedAnchorHz: number;
  roundedAnchorLabel: string;
};

function asInstrumentPreset(value: string | null | undefined): LoopTrackInstrumentPreset {
  return (value && !value.startsWith('sample:') ? value : 'glassPad') as LoopTrackInstrumentPreset;
}

function resolveFallbackPreset(config: RootFollowBankEntryConfig): LoopTrackInstrumentPreset {
  const patternPreset = config.synthPattern?.tracks.find((track) => track.enabled !== false)?.instrumentPreset;
  const patchPreset = config.synthPatch?.trackPatches.find((track) => track.enabled !== false)?.instrumentPreset;
  return asInstrumentPreset(patternPreset ?? patchPreset ?? 'glassPad');
}

function clampChannel(draft: LoopComposerState, channelIndex: number): number {
  return Math.max(0, Math.min(Math.max(0, draft.pitchLines.length - 1), Math.round(channelIndex)));
}

function clampSigned(value: number): number {
  return Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));
}

function noteGateEndBeat(note: RootFollowSynthNoteSnapshot): number {
  return note.startBeat + Math.max(0.0625, note.durationBeats) * Math.max(0.05, Math.min(2, note.gate || 1));
}

function resolvePatternNoteHz(pattern: RootFollowSynthPatternSnapshot, note: RootFollowSynthNoteSnapshot): number {
  const repetition = pattern.repetitionModel === 'tritave' ? 3 : 2;
  return Math.max(
    1,
    Math.min(
      12000,
      (Number.isFinite(note.lineHz ?? NaN) ? Number(note.lineHz) : Math.max(1, pattern.baseHz || 220))
        * Math.pow(repetition, Number.isFinite(note.octaveOffset) ? note.octaveOffset : 0),
    ),
  );
}

function makeTargetSlot(curveInput: number[]) {
  const resolution = Math.max(64, Math.min(512, Math.round(curveInput.length || 360)));
  const curve = new Array(resolution).fill(0).map((_, index) => clampSigned(curveInput[Math.min(curveInput.length - 1, index)] ?? 0));
  return {
    edgeHandles: { left: curve[0] ?? 0, right: curve[curve.length - 1] ?? 0 },
    deformation: {
      resolution,
      curve,
      interior: [...curve],
      xOffsets: new Array(resolution).fill(0),
      smoothing: 0.34,
    },
  };
}

function buildCarrierIntegralBodyField(pattern: RootFollowSynthPatternSnapshot, totalBeats: number): LocalFieldModuleState {
  const resolution = 360;
  const baseHz = Math.max(1, pattern.baseHz || 220);
  const notes = pattern.notes.filter((note) => note.durationBeats > 0);
  const rawPitch = new Array(resolution).fill(0);
  const rawEnergy = new Array(resolution).fill(0);
  let lastPitch = 0;
  for (let index = 0; index < resolution; index += 1) {
    const ratio = resolution <= 1 ? 0 : index / Math.max(1, resolution - 1);
    const beat = ratio * Math.max(0.0001, totalBeats);
    const active = notes.filter((note) => beat >= note.startBeat && beat <= noteGateEndBeat(note));
    if (active.length > 0) {
      let weightedPitch = 0;
      let weightSum = 0;
      let energy = 0;
      for (const note of active) {
        const noteHz = resolvePatternNoteHz(pattern, note);
        const semitones = 12 * Math.log2(noteHz / baseHz);
        const weight = Math.max(0.05, Math.min(1, note.velocity || 0.8));
        weightedPitch += semitones * weight;
        weightSum += weight;
        energy += weight;
      }
      lastPitch = weightSum > 0 ? weightedPitch / weightSum : lastPitch;
      rawEnergy[index] = Math.min(1, energy / Math.max(1, active.length));
    } else {
      rawEnergy[index] = 0;
    }
    rawPitch[index] = lastPitch;
  }

  const maxAbsPitch = rawPitch.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  const pitchScale = Math.max(1, maxAbsPitch, 12);
  const pitchCurve = rawPitch.map((value) => clampSigned(value / pitchScale));
  const energyMax = rawEnergy.reduce((max, value) => Math.max(max, value), 0);
  const dynamicCurve = rawEnergy.map((value) => {
    const normalized = energyMax > 0 ? value / energyMax : 0.5;
    return clampSigned(normalized * 1.55 - 0.72);
  });

  const dynamicSlot = makeTargetSlot(dynamicCurve);
  const pitchSlot = makeTargetSlot(pitchCurve);
  return {
    id: `carrier-integral-body-field-${Date.now()}`,
    geometryKind: 'linear-strip',
    interpreterKind: 'pitch-elastic',
    enabled: true,
    bypassed: false,
    referenceLevel: 0,
    range: { startRatio: 0, endRatio: 1 },
    edgeHandles: { ...pitchSlot.edgeHandles },
    baseCurve: { kind: 'smooth' },
    deformation: {
      ...pitchSlot.deformation,
      curve: [...pitchSlot.deformation.curve],
      interior: [...pitchSlot.deformation.interior],
      xOffsets: [...pitchSlot.deformation.xOffsets],
    },
    targetSlots: {
      'dynamic-fade': dynamicSlot,
      'pitch-elastic': pitchSlot,
    },
  };
}

function buildCarrierIntegralFieldClip(
  pattern: RootFollowSynthPatternSnapshot,
  detail: CarrierIntegralPinkExportDetail,
  totalBeats: number,
  variant: CarrierIntegralPinkVariant,
): CarrierIntegralFieldClip {
  const baseHz = Math.max(1, pattern.baseHz || 220);
  const trackPan = new Map(pattern.tracks.map((track) => [track.id, Number.isFinite(track.pan ?? NaN) ? Number(track.pan) : 0] as const));
  const trackVolume = new Map(pattern.tracks.map((track) => [track.id, Number.isFinite(track.volume ?? NaN) ? Math.max(0, Math.min(1.5, Number(track.volume))) : 0.75] as const));
  const trackPreset = new Map(pattern.tracks.map((track) => [track.id, track.instrumentPreset] as const));
  const voices: CarrierIntegralFieldVoiceEvent[] = pattern.notes
    .filter((note) => note.durationBeats > 0)
    .map((note, index) => {
      const noteHz = resolvePatternNoteHz(pattern, note);
      return {
        id: `${note.id || 'note'}-${index}`,
        voiceId: note.id || `${note.trackId}-${index}`,
        trackId: note.trackId,
        startRatio: Math.max(0, Math.min(1, note.startBeat / Math.max(0.0001, totalBeats))),
        durationRatio: Math.max(0.001, Math.min(1, (Math.max(0.03125, note.durationBeats) * Math.max(0.05, Math.min(2, note.gate || 1))) / Math.max(0.0001, totalBeats))),
        relativeSemitones: Math.max(-72, Math.min(72, 12 * Math.log2(noteHz / baseHz))),
        velocity: Math.max(0.02, Math.min(1, Number.isFinite(note.velocity ?? NaN) ? Number(note.velocity) : 0.75)),
        gate: Math.max(0.05, Math.min(2, Number.isFinite(note.gate ?? NaN) ? Number(note.gate) : 1)),
        pan: Math.max(-1, Math.min(1, trackPan.get(note.trackId) ?? 0)),
        trackVolume: Math.max(0, Math.min(1.5, trackVolume.get(note.trackId) ?? 0.75)),
        sourceLineHz: Number.isFinite(noteHz) ? noteHz : null,
        localField: note.localField ?? null,
        spectralWindowMeta: note.spectralWindowMeta ?? null,
        instrumentPresetOverride: asInstrumentPreset(note.instrumentPresetOverride ?? trackPreset.get(note.trackId) ?? null),
      };
    });
  return {
    schemaVersion: 'carrier-integral-field-v1',
    variant,
    label: detail.prism ?? 'Fretless-Feld',
    sourceMachineId: detail.machineId ?? null,
    sourcePrism: detail.prism ?? null,
    sourceBaseHz: baseHz,
    sourceBars: Math.max(1, pattern.bars || 1),
    sourceBeatsPerBar: Math.max(1, pattern.beatsPerBar || 4),
    totalBeats: Math.max(0.0001, totalBeats),
    voices,
  };
}

function ensurePinkTrack(
  draft: LoopComposerState,
  config: RootFollowBankEntryConfig,
  detail: CarrierIntegralPinkExportDetail,
  lanePlacement?: MelodicImportLanePlacement | null,
) {
  const trackId = lanePlacement?.trackId ?? CARRIER_INTEGRAL_PINK_TRACK_ID;
  const color = lanePlacement?.color ?? CARRIER_INTEGRAL_PINK_TRACK_COLOR;
  const label = detail.prism ? `Carrier · ${detail.prism}` : 'Carrier-Figur';
  let track = draft.tracks.find((entry) => entry.id === trackId) ?? null;
  const fallbackPreset = resolveFallbackPreset(config);
  if (!track) {
    draft.tracks.push(hydrateLoopTrack({
      id: trackId,
      label,
      color,
      volume: 0.82,
      instrumentRole: 'texture',
      instrumentPreset: fallbackPreset,
      patternPresetId: 'patternA',
      pan: 0,
      enabled: true,
    }, draft.tracks.length));
    track = draft.tracks.find((entry) => entry.id === trackId) ?? null;
  }
  if (track) {
    track.label = label;
    track.color = color;
    track.instrumentRole = 'texture';
    track.instrumentPreset = fallbackPreset;
    track.enabled = true;
  }
  return { track, fallbackPreset, trackId };
}

function applyScatteredProjection(args: {
  draft: LoopComposerState;
  detail: CarrierIntegralPinkExportDetail;
  config: RootFollowBankEntryConfig;
  pattern: RootFollowSynthPatternSnapshot;
  anchorRoundedHz: number;
  fallbackPreset: LoopTrackInstrumentPreset;
  maxUnits: number;
  unitsPerBeat: number;
  trackId: string;
  pendingPitchAnchor?: boolean;
}) {
  const { draft, detail, config, pattern, anchorRoundedHz, fallbackPreset, maxUnits, unitsPerBeat, trackId, pendingPitchAnchor } = args;
  const baseHz = Math.max(1, pattern.baseHz || 220);
  const timbre = detail.carrierIntegralTimbre ?? config.synthPatch?.carrierIntegralTimbre ?? null;
  return pattern.notes
    .filter((sourceNote) => sourceNote.durationBeats > 0)
    .map((sourceNote) => {
      const sourceHz = resolvePatternNoteHz(pattern, sourceNote);
      const targetHz = Math.max(1, Math.min(12000, anchorRoundedHz * (sourceHz / baseHz)));
      const eventAnchor = resolveMaterialAnchor(draft, targetHz);
      const startUnit = Math.max(0, Math.min(maxUnits - 0.0625, sourceNote.startBeat * unitsPerBeat));
      const durationUnits = Math.max(0.0625, Math.min(maxUnits - startUnit, sourceNote.durationBeats * Math.max(0.05, Math.min(2, sourceNote.gate || 1)) * unitsPerBeat));
      const note = makeLoopNote(draft, {
        trackId,
        channelIndex: clampChannel(draft, eventAnchor.anchorIndex),
        startUnit,
        durationUnits,
        velocity: Math.max(0.16, Math.min(1, sourceNote.velocity || 0.72)),
        fadeInUnits: Math.max(0, Math.min(unitsPerBeat * 0.08, durationUnits * 0.12)),
        fadeOutUnits: Math.max(0, Math.min(unitsPerBeat * 0.12, durationUnits * 0.18)),
      });
      note.renderSourceKind = 'synth-live';
      note.noteClass = 'standard';
      note.octaveOffset = 0;
      note.instrumentPresetOverride = asInstrumentPreset(sourceNote.instrumentPresetOverride ?? fallbackPreset);
      note.carrierIntegralTimbre = timbre;
      note.anchorHz = eventAnchor.roundedAnchorHz;
      note.sourceTempoBpm = null;
      note.sourceLoopDurationSec = null;
      note.pendingPitchAnchor = pendingPitchAnchor === true;
      return syncLoopNoteToState(draft, note);
    });
}

function makeLongPinkCarrierNote(args: {
  draft: LoopComposerState;
  channelIndex: number;
  totalBeats: number;
  maxUnits: number;
  unitsPerBeat: number;
  fallbackPreset: LoopTrackInstrumentPreset;
  velocity: number;
  trackId: string;
  pendingPitchAnchor?: boolean;
}) {
  const { draft, channelIndex, totalBeats, maxUnits, unitsPerBeat, fallbackPreset, velocity, trackId, pendingPitchAnchor } = args;
  const startUnit = 0;
  const durationUnits = Math.max(0.125, Math.min(maxUnits, totalBeats * unitsPerBeat));
  const note = makeLoopNote(draft, {
    trackId,
    channelIndex,
    startUnit,
    durationUnits,
    velocity,
    fadeInUnits: Math.max(0, Math.min(unitsPerBeat * 0.25, durationUnits * 0.08)),
    fadeOutUnits: Math.max(0, Math.min(unitsPerBeat * 0.25, durationUnits * 0.08)),
  });
  note.renderSourceKind = 'synth-live';
  note.noteClass = 'carrier-field';
  note.octaveOffset = 0;
  note.instrumentPresetOverride = fallbackPreset;
  note.sourceTempoBpm = null;
  note.sourceLoopDurationSec = null;
  note.pendingPitchAnchor = pendingPitchAnchor === true;
  return note;
}

export function applyCarrierIntegralPinkLaneToDraft(
  draft: LoopComposerState,
  detail: CarrierIntegralPinkExportDetail,
  anchorHz: number,
  lanePlacement?: MelodicImportLanePlacement | null,
): CarrierIntegralPinkApplyResult {
  const config = detail.config ?? null;
  const pattern = config?.synthPattern ?? null;
  const variant = normalizeCarrierIntegralPinkVariant(detail.projectionMode);
  const anchor = resolveMaterialAnchor(draft, anchorHz);
  if (!config || !pattern || !Array.isArray(pattern.notes) || pattern.notes.length === 0) {
    return {
      applied: false,
      reason: 'Diese Linse hat noch keinen synthetischen Pinkspur-Plan.',
      noteCount: 0,
      roundedAnchorHz: anchor.roundedAnchorHz,
      roundedAnchorLabel: anchor.roundedAnchorLabel,
    };
  }

  if (variant === 'grained') {
    return {
      applied: false,
      reason: 'Raw Audio nutzt den gerenderten Materialkörper. Wähle den Raw-Audio-Eintrag im Importmenü und bestätige den Import.',
      noteCount: 0,
      roundedAnchorHz: anchor.roundedAnchorHz,
      roundedAnchorLabel: anchor.roundedAnchorLabel,
    };
  }

  const safeBars = clampBars(Math.max(1, Math.round(detail.bars || pattern.bars || 1)));
  if (safeBars > draft.bars) {
    draft.bars = safeBars;
    draft.timeGuideMarkers = createDefaultLoopTimeGuides(draft.bars, draft.beatsPerBar, draft.segmentCount);
  }

  const { fallbackPreset, trackId } = ensurePinkTrack(draft, config, detail, lanePlacement);
  const unitsPerBeat = loopUnitsPerBeat(draft);
  const maxUnits = totalLoopUnits(draft);
  draft.notes = draft.notes.filter((note) => note.trackId !== trackId);
  const totalBeats = safeBars * Math.max(1, pattern.beatsPerBar || draft.beatsPerBar || 4);
  const channelIndex = clampChannel(draft, anchor.anchorIndex);
  const sourceVelocityMax = pattern.notes.reduce((max, note) => Math.max(max, note.velocity || 0), 0.75);
  const timbre = detail.carrierIntegralTimbre ?? config.synthPatch?.carrierIntegralTimbre ?? null;

  let nextNotes = [] as ReturnType<typeof syncLoopNoteToState>[];
  let reason = '';

  if (variant === 'scattered') {
    nextNotes = applyScatteredProjection({
      draft,
      detail,
      config,
      pattern,
      anchorRoundedHz: anchor.roundedAnchorHz,
      fallbackPreset,
      maxUnits,
      unitsPerBeat,
      trackId,
      pendingPitchAnchor: lanePlacement?.pendingPitchAnchor === true,
    });
    reason = `${detail.prism ?? 'Carrier'} zerstreut als experimentelle Rasterprojektion eingesetzt`;
  } else {
    const note = makeLongPinkCarrierNote({
      draft,
      channelIndex,
      totalBeats,
      maxUnits,
      unitsPerBeat,
      fallbackPreset,
      velocity: Math.max(0.18, Math.min(1, sourceVelocityMax)),
      trackId,
      pendingPitchAnchor: lanePlacement?.pendingPitchAnchor === true,
    });
    note.carrierIntegralTimbre = timbre;
    note.anchorHz = anchor.roundedAnchorHz;
    if (variant === 'monotone') {
      note.localField = buildCarrierIntegralBodyField(pattern, totalBeats);
      note.carrierIntegralField = null;
      reason = `${detail.prism ?? 'Carrier'} monoton als Ankerkörper über ${safeBars} Takt${safeBars === 1 ? '' : 'e'} eingesetzt`;
    } else {
      note.localField = null;
      note.carrierIntegralField = buildCarrierIntegralFieldClip(pattern, detail, totalBeats, 'last-hearing');
      reason = `${detail.prism ?? 'Carrier'} als Fretless-Feld · mehrstimmiger Feldclip über ${safeBars} Takt${safeBars === 1 ? '' : 'e'} eingesetzt`;
    }
    nextNotes = [syncLoopNoteToState(draft, note)];
  }

  draft.notes.push(...nextNotes);
  draft.selectedTrackId = trackId;
  draft.selectedNoteId = nextNotes[0]?.id ?? null;
  if (!draft.activeTrackIds.includes(trackId)) draft.activeTrackIds.push(trackId);

  return {
    applied: nextNotes.length > 0,
    reason,
    noteCount: nextNotes.length,
    roundedAnchorHz: anchor.roundedAnchorHz,
    roundedAnchorLabel: anchor.roundedAnchorLabel,
  };
}
