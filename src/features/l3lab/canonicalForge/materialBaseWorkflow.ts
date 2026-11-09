import { clampBars } from '../spectralForge/state/storeMaterialExport';
import type { MaterialEntry } from '../materialLibrary';
import {
  clampComposerLength,
  createDefaultLoopTimeGuides,
  effectiveLoopLineHz,
  getLoopTimeGuides,
  isLoopActiveFragmentCutMarker,
  hydrateLoopTrack,
  loopUnitsPerBeat,
  makeLoopNote,
  noteDurationUnits,
  noteStartUnit,
  syncLoopNoteToState,
  totalLoopUnits,
  type LoopComposerState,
  type LoopNoteEvent,
  type LoopTimeGuideMarker,
} from './loopDrumDomain';
import type { LoopTrackInstrumentPreset } from './melodicSoundRegistry';
import type { MelodicImportLanePlacement } from './melodicImportLanePolicy';
import { LOOP_IMPORT_TRACK_IDS, isFragmentableLoopImportBody, isMaterialImportBody, loopImportBodyFragmentNoteClass, loopImportBodyLabel, sliceCarrierIntegralFieldClip } from './loopImportExportContracts';

export const MATERIAL_BASE_TRACK_ID = LOOP_IMPORT_TRACK_IDS.materialBase;
export const MATERIAL_BASE_TRACK_COLOR = '#ec4899';

export function inferMaterialEntrySourceBpm(
  entry: Pick<MaterialEntry, 'bpm' | 'bars' | 'intendedLoopDurationSec' | 'durationSec'>,
  beatsPerBar = 4,
) {
  const directBpm = Number.isFinite(entry.bpm) && entry.bpm > 0 ? Number(entry.bpm) : null;
  const intendedDuration = Number.isFinite(entry.intendedLoopDurationSec) && (entry.intendedLoopDurationSec ?? 0) > 0
    ? Number(entry.intendedLoopDurationSec)
    : Number.isFinite(entry.durationSec) && (entry.durationSec ?? 0) > 0
      ? Number(entry.durationSec)
      : null;
  if (intendedDuration && intendedDuration > 0 && Number.isFinite(entry.bars) && entry.bars > 0) {
    const inferred = (Math.max(1, entry.bars) * Math.max(1, beatsPerBar) * 60) / intendedDuration;
    if (Number.isFinite(inferred) && inferred > 0) return inferred;
  }
  return directBpm ?? 108;
}

export function resolveMaterialAnchor(
  loopComposer: Pick<LoopComposerState, 'pitchLines'>,
  anchorHz: number,
) {
  const safeAnchorHz = Number.isFinite(anchorHz) && anchorHz > 0 ? anchorHz : 55;
  const nearestPitchLine = loopComposer.pitchLines.reduce((best, line, index) => {
    const hz = effectiveLoopLineHz(line);
    const delta = Math.abs(hz - safeAnchorHz);
    if (!best || delta < best.delta) return { index, hz, label: line.label, delta };
    return best;
  }, null as { index: number; hz: number; label: string; delta: number } | null);
  return {
    anchorIndex: nearestPitchLine?.index ?? 0,
    roundedAnchorHz: nearestPitchLine?.hz ?? safeAnchorHz,
    roundedAnchorLabel: nearestPitchLine?.label ?? 'unterste Linie',
  };
}

export function computeMaterialSourceLoopDurationSec(
  entry: Pick<MaterialEntry, 'bars' | 'intendedLoopDurationSec'>,
  sourceBpm: number,
  beatsPerBar = 4,
) {
  return Number.isFinite(entry.intendedLoopDurationSec) && (entry.intendedLoopDurationSec ?? 0) > 0
    ? Math.max(0.01, Number(entry.intendedLoopDurationSec))
    : Math.max(0.01, (Math.max(1, entry.bars) * Math.max(1, beatsPerBar) * 60) / Math.max(40, sourceBpm));
}

export type MaterialBaseImportOptions = {
  sampleId: string;
  entry: Pick<MaterialEntry, 'id' | 'bars' | 'name'>;
  anchorIndex: number;
  roundedAnchorHz: number;
  sourceBpm: number;
  sourceLoopDurationSec: number;
  materialPitchMode?: 'grid-elastic' | 'source-fixed' | 'source-granular';
  lanePlacement?: MelodicImportLanePlacement | null;
};

export function applyMaterialBaseImportToDraft(
  draft: LoopComposerState,
  options: MaterialBaseImportOptions,
) {
  const { sampleId, entry, anchorIndex, roundedAnchorHz, sourceBpm, sourceLoopDurationSec, materialPitchMode, lanePlacement } = options;
  const materialTrackId = lanePlacement?.trackId ?? MATERIAL_BASE_TRACK_ID;
  const materialTrackColor = lanePlacement?.color ?? MATERIAL_BASE_TRACK_COLOR;
  const materialTrackLabel = entry.name ? `Material · ${entry.name}` : 'Materialbasis';
  let materialTrack = draft.tracks.find((track) => track.id === materialTrackId) ?? null;
  if (!materialTrack) {
    draft.tracks.push(hydrateLoopTrack({
      id: materialTrackId,
      label: materialTrackLabel,
      color: materialTrackColor,
      volume: 0.9,
      instrumentRole: 'texture',
      instrumentPreset: `sample:${sampleId}` as LoopTrackInstrumentPreset,
      patternPresetId: 'patternA',
      pan: 0,
      enabled: true,
    }, draft.tracks.length));
    materialTrack = draft.tracks.find((track) => track.id === materialTrackId) ?? null;
  }
  if (materialTrack) {
    materialTrack.label = materialTrackLabel;
    materialTrack.color = materialTrackColor;
    materialTrack.instrumentPreset = `sample:${sampleId}`;
    materialTrack.enabled = true;
  }

  const requiredBars = Math.max(1, Math.round(entry.bars || 1));
  if (requiredBars > draft.bars) {
    draft.bars = clampBars(requiredBars);
    draft.timeGuideMarkers = createDefaultLoopTimeGuides(draft.bars, draft.beatsPerBar, draft.segmentCount);
  }

  draft.notes = draft.notes.filter((note) => note.trackId !== materialTrackId);
  const durationUnits = clampComposerLength(Math.max(1, Math.min(totalLoopUnits(draft), requiredBars * Math.max(1, draft.stepsPerBar || 16))));
  const note = makeLoopNote(draft, {
    trackId: materialTrackId,
    channelIndex: anchorIndex,
    startUnit: 0,
    durationUnits,
    fadeInUnits: 0,
    fadeOutUnits: 0.5,
    velocity: 0.94,
  });
  note.noteClass = 'material-base';
  note.renderSourceKind = 'material-import';
  note.fragmentIndex = 1;
  note.fragmentCount = 1;
  note.fragmentGroupId = note.id;
  note.sourceMaterialId = entry.id;
  note.anchorHz = roundedAnchorHz;
  note.sourceTempoBpm = sourceBpm;
  note.sourceLoopDurationSec = sourceLoopDurationSec;
  note.sampleOffsetSec = 0;
  note.samplePlaybackDurationSec = sourceLoopDurationSec;
  note.materialPitchMode = materialPitchMode ?? 'grid-elastic';
  note.pendingPitchAnchor = lanePlacement?.pendingPitchAnchor === true;
  draft.notes.push(syncLoopNoteToState(draft, note));
  if (materialTrackId === MATERIAL_BASE_TRACK_ID) draft.selectedTrackId = MATERIAL_BASE_TRACK_ID;
  else draft.selectedTrackId = materialTrackId;
  draft.selectedNoteId = note.id;
  if (!draft.activeTrackIds.includes(materialTrackId)) draft.activeTrackIds.push(materialTrackId);
  return note.id;
}




export function retimeMaterialLoopBodyForDurationChange(note: LoopNoteEvent, previousDurationUnits: number, nextDurationUnits: number) {
  if (!isMaterialImportBody(note)) return;
  if (!Number.isFinite(note.samplePlaybackDurationSec)) return;
  const safePrev = Math.max(0.125, Number(previousDurationUnits) || 0.125);
  const safeNext = Math.max(0.125, Number(nextDurationUnits) || 0.125);
  const safeSlice = Math.max(0.005, Number(note.samplePlaybackDurationSec) || 0.005);
  note.samplePlaybackDurationSec = Math.max(0.005, safeSlice * (safeNext / safePrev));
}

export function resolveFragmentableLoopImportBody(loopComposer: LoopComposerState): LoopNoteEvent | null {
  const selected = loopComposer.notes.find((entry) => entry.id === loopComposer.selectedNoteId) ?? null;
  if (selected && isFragmentableLoopImportBody(selected) && !selected.pendingPitchAnchor) return selected as LoopNoteEvent;
  const fragmentableBodies = loopComposer.notes.filter((entry) => isFragmentableLoopImportBody(entry) && !entry.pendingPitchAnchor) as LoopNoteEvent[];
  if (fragmentableBodies.length === 1) return fragmentableBodies[0] ?? null;
  const baseBodies = fragmentableBodies.filter((entry) => entry.noteClass === 'material-base' || entry.noteClass === 'carrier-field');
  return baseBodies.length === 1 ? baseBodies[0] ?? null : null;
}

export function beginLoopImportFragmentGuideEdit(draft: LoopComposerState, selected: LoopNoteEvent) {
  draft.selectedNoteId = selected.id;
  draft.selectedTrackId = selected.trackId || draft.selectedTrackId;
  draft.timeGuideMarkers = getLoopTimeGuides(draft).map((marker) => marker.kind === 'guide' ? { ...marker, repeatPerBar: false } : { ...marker });
}

export type LoopImportFragmentCommitResult = {
  selectedIds: string[];
  spanCount: number;
  bodyLabel: string;
  restoredOnly: boolean;
};

export function commitLoopImportFragmentationInDraft(
  draft: LoopComposerState,
  selectedId: string,
  guideSnapshot: LoopTimeGuideMarker[],
): LoopImportFragmentCommitResult {
  const liveSelected = draft.notes.find((entry) => entry.id === selectedId) ?? null;
  if (!liveSelected || !isFragmentableLoopImportBody(liveSelected) || liveSelected.pendingPitchAnchor) {
    draft.timeGuideMarkers = guideSnapshot.map((marker) => ({ ...marker }));
    return { selectedIds: [], spanCount: 0, bodyLabel: 'Importkörper', restoredOnly: true };
  }
  const bodyLabel = loopImportBodyLabel(liveSelected);
  const spans = computeMaterialFragmentSpans(draft, liveSelected);
  if (spans.length <= 1) {
    draft.selectedNoteId = liveSelected.id;
    draft.selectedTrackId = liveSelected.trackId || draft.selectedTrackId;
    draft.timeGuideMarkers = guideSnapshot.map((marker) => ({ ...marker }));
    return { selectedIds: [liveSelected.id], spanCount: spans.length, bodyLabel, restoredOnly: true };
  }
  const selectedIds = replaceSelectedMaterialWithFragments(draft, liveSelected, spans, guideSnapshot.map((marker) => ({ ...marker })));
  return { selectedIds, spanCount: spans.length, bodyLabel, restoredOnly: false };
}

export function computeMaterialFragmentSpans(
  loopComposer: Pick<LoopComposerState, 'timeGuideMarkers' | 'bars' | 'beatsPerBar' | 'segmentCount' | 'stepsPerBar'>,
  selected: LoopNoteEvent,
) {
  const totalUnits = totalLoopUnits(loopComposer);
  const noteStart = Math.max(0, noteStartUnit(loopComposer, selected));
  const noteEnd = Math.min(totalUnits, noteStart + noteDurationUnits(loopComposer, selected));
  const unitsPerBeat = loopUnitsPerBeat(loopComposer);
  const boundaries = new Set<number>([noteStart, noteEnd]);
  getLoopTimeGuides(loopComposer).forEach((marker) => {
    if (!isLoopActiveFragmentCutMarker(loopComposer, marker)) return;
    const unit = marker.beat * unitsPerBeat;
    if (unit > noteStart + 0.001 && unit < noteEnd - 0.001) boundaries.add(unit);
  });
  const ordered = Array.from(boundaries).sort((a, b) => a - b);
  const spans: Array<{ startUnit: number; durationUnits: number }> = [];
  for (let index = 0; index < ordered.length - 1; index += 1) {
    const startUnit = ordered[index] ?? 0;
    const endUnit = ordered[index + 1] ?? startUnit;
    const durationUnits = clampComposerLength(Math.max(0.125, endUnit - startUnit));
    if (durationUnits <= 0.001) continue;
    spans.push({ startUnit, durationUnits });
  }
  return spans;
}

export function replaceSelectedMaterialWithFragments(
  draft: LoopComposerState,
  selected: LoopNoteEvent,
  spans: Array<{ startUnit: number; durationUnits: number }>,
  guideSnapshot: LoopTimeGuideMarker[],
) {
  const nextSelectedIds: string[] = [];
  if (!isFragmentableLoopImportBody(selected)) return [];
  const fragmentGroupId = selected.fragmentGroupId || selected.id;
  const noteStart = Math.max(0, noteStartUnit(draft, selected));
  const baseDurationUnits = Math.max(0.125, noteDurationUnits(draft, selected));
  const sourceOffsetSec = Math.max(0, Number.isFinite(selected.sampleOffsetSec) ? Number(selected.sampleOffsetSec) : 0);
  const sourceDurationSec = Number.isFinite(selected.samplePlaybackDurationSec)
    ? Math.max(0.005, Number(selected.samplePlaybackDurationSec))
    : Number.isFinite(selected.sourceLoopDurationSec)
      ? Math.max(0.005, Number(selected.sourceLoopDurationSec))
      : null;
  draft.notes = draft.notes.filter((entry) => entry.id !== selected.id);
  const isMaterialImport = isMaterialImportBody(selected);
  const fragmentNoteClass = loopImportBodyFragmentNoteClass(selected);
  const clones = spans.map((span, index) => {
    const relativeStart = Math.max(0, span.startUnit - noteStart);
    const sliceOffsetSec = sourceDurationSec != null
      ? sourceOffsetSec + (relativeStart / baseDurationUnits) * sourceDurationSec
      : sourceOffsetSec;
    const sliceDurationSec = sourceDurationSec != null
      ? Math.max(0.005, (span.durationUnits / baseDurationUnits) * sourceDurationSec)
      : null;
    const sliceStartRatio = Math.max(0, Math.min(1, relativeStart / baseDurationUnits));
    const sliceEndRatio = Math.max(sliceStartRatio, Math.min(1, (relativeStart + span.durationUnits) / baseDurationUnits));
    const carrierIntegralField = selected.carrierIntegralField
      ? sliceCarrierIntegralFieldClip(selected.carrierIntegralField, sliceStartRatio, sliceEndRatio)
      : selected.carrierIntegralField ?? null;
    return syncLoopNoteToState(draft, {
      ...selected,
      id: crypto.randomUUID(),
      startUnit: span.startUnit,
      durationUnits: span.durationUnits,
      noteClass: fragmentNoteClass,
      renderSourceKind: isMaterialImport ? 'material-import' : 'synth-live',
      fragmentIndex: index + 1,
      fragmentCount: spans.length,
      fragmentGroupId,
      fadeInUnits: isMaterialImport ? 0.06 : Math.min(0.12, span.durationUnits * 0.12),
      fadeOutUnits: isMaterialImport ? 0.09 : Math.min(0.14, span.durationUnits * 0.16),
      sampleOffsetSec: isMaterialImport ? sliceOffsetSec : null,
      samplePlaybackDurationSec: isMaterialImport ? sliceDurationSec : null,
      carrierIntegralField,
      localField: isMaterialImport ? null : selected.localField ?? null,
    });
  });
  draft.notes.push(...clones);
  draft.notes.sort((a, b) => (noteStartUnit(draft, a) - noteStartUnit(draft, b)) || (noteChannelIndexSafe(a) - noteChannelIndexSafe(b)) || a.trackId.localeCompare(b.trackId));
  draft.selectedTrackId = selected.trackId || MATERIAL_BASE_TRACK_ID;
  draft.selectedNoteId = clones[0]?.id ?? null;
  draft.timeGuideMarkers = guideSnapshot.map((marker) => ({ ...marker }));
  nextSelectedIds.push(...clones.map((entry) => entry.id));
  return nextSelectedIds;
}

function noteChannelIndexSafe(note: LoopNoteEvent) {
  return Number.isFinite(note.channelIndex) ? Number(note.channelIndex) : 0;
}
