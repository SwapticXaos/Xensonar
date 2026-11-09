import type { Dispatch, SetStateAction } from 'react';
import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import type { SpectralData } from '../spectralForge/audio/SpectralData';
import type { CanonicalSourceView } from './analysis';
import type { LocalFieldModuleState } from './localField';
import type { SavedMelodicSampleMeta } from './melodicSampleLibrary';
import {
  listSavedMelodicSamples,
  saveGeneratedMelodicSample,
  updateSavedMelodicSampleMeta,
} from './melodicSampleLibrary';
import {
  deleteMelodicSampleAction,
  importSpectralSelectionAsMelodicSampleAction,
  previewMelodicSampleReferencePitchAction,
  previewMelodicSampleTempoProfileAction,
  setMelodicSampleTempoProfileAction,
  renameMelodicSampleAction,
  updateMelodicSampleBaseHzAction,
  updateMelodicSampleEnvelopeAction,
  uploadMelodicSamplesAction,
} from './melodicSampleActions';
import { fragmentSelectedMaterialBaseNoteAction, importMaterialEntryIntoMelodicLoopAction } from './materialBaseActions';
import type { MelodicImportLanePlacement } from './melodicImportLanePolicy';
import { registerMelodicSampleFromBlobAction } from './melodicSampleRegistration';
import { getMelodicSoundDisplayLabel } from './melodicSoundRegistry';
import { resolveInstrumentDef } from './canonicalPreviewVoices';
import {
  canonicalLoopNoteOctaveOffset,
  cloneLoopComposerState,
  loopUnitsPerBeat,
  noteChannelIndex,
  noteDurationUnits,
  syncLoopNoteToState,
  type LoopComposerState,
  type LoopTimeGuideMarker,
} from './loopDrumDomain';
import { renderLoopComposerToWavBlob } from './loopPreview';
import type { LoopTrackInstrumentPreset } from './melodicSoundRegistry';
import type { DestructiveAudioProfile, SynthMode, TransferMode, WarpAudioProfile, WaveformMix } from './selectionAudioTransfer';
import type { Forge2WorkspaceId } from '../../xensonar/architecture/machineRoomTypes';
import type { MaterialEntry } from '../materialLibrary';

type MaterialExportConfigLike = {
  bpm: number;
  name: string;
  transferMode: TransferMode;
};

type MutateLoopComposer = (updater: (draft: LoopComposerState) => void, statusMessage?: string, options?: { history?: boolean }) => void;

export function createMelodicSampleWorkspaceController(args: {
  loopComposer: LoopComposerState;
  melodicSampleEntries: SavedMelodicSampleMeta[];
  materialEntries: MaterialEntry[];
  materialFragmentGuideSnapshot: LoopTimeGuideMarker[] | null;
  rawSourceAsset: AudioSourceAsset | null;
  materialExport: MaterialExportConfigLike;
  spectralData: SpectralData;
  synthMode: SynthMode;
  waveformMix: WaveformMix;
  selectionStartSec: number;
  selectionDurationSec: number;
  sourceView: CanonicalSourceView;
  activeWorkspace: Forge2WorkspaceId | string;
  destructivePreviewProfile: DestructiveAudioProfile | null;
  warpAudioProfile: WarpAudioProfile | null;
  setMelodicSampleEntries: Dispatch<SetStateAction<SavedMelodicSampleMeta[]>>;
  setMaterialExport: Dispatch<SetStateAction<{ bpm: number }>>;
  setMaterialFragmentGuideSnapshot: Dispatch<SetStateAction<LoopTimeGuideMarker[] | null>>;
  setSelectedLoopNoteIds: Dispatch<SetStateAction<string[]>>;
  mutateLoopComposer: MutateLoopComposer;
  setStatus: (status: string) => void;
}) {
  async function registerMelodicSampleFromBlob(
    blob: Blob,
    name: string,
    options?: { assignToSelectedTrack?: boolean; successStatus?: string; failureStatus?: string },
  ) {
    return registerMelodicSampleFromBlobAction({
      blob,
      name,
      loopComposer: args.loopComposer,
      assignToSelectedTrack: options?.assignToSelectedTrack,
      setMelodicSampleEntries: args.setMelodicSampleEntries,
      mutateLoopComposer: args.mutateLoopComposer,
      setStatus: args.setStatus,
      successStatus: options?.successStatus,
      failureStatus: options?.failureStatus,
    });
  }

  async function importMaterialEntryIntoMelodicLoop(materialId: string, anchorHz: number, lanePlacement?: MelodicImportLanePlacement | null) {
    await importMaterialEntryIntoMelodicLoopAction({
      materialEntries: args.materialEntries,
      materialId,
      anchorHz,
      lanePlacement,
      loopComposer: args.loopComposer,
      setMelodicSampleEntries: args.setMelodicSampleEntries,
      setMaterialExport: args.setMaterialExport,
      setMaterialFragmentGuideSnapshot: args.setMaterialFragmentGuideSnapshot,
      mutateLoopComposer: args.mutateLoopComposer,
      setStatus: args.setStatus,
    });
  }

  function fragmentSelectedMaterialBaseNote() {
    fragmentSelectedMaterialBaseNoteAction({
      loopComposer: args.loopComposer,
      materialFragmentGuideSnapshot: args.materialFragmentGuideSnapshot,
      setMaterialFragmentGuideSnapshot: args.setMaterialFragmentGuideSnapshot,
      setSelectedLoopNoteIds: args.setSelectedLoopNoteIds,
      mutateLoopComposer: args.mutateLoopComposer,
      setStatus: args.setStatus,
    });
  }

  function uploadMelodicSamples(files: File[]) {
    uploadMelodicSamplesAction({
      files,
      setMelodicSampleEntries: args.setMelodicSampleEntries,
      setStatus: args.setStatus,
    });
  }

  function importSpectralSelectionAsMelodicSample() {
    importSpectralSelectionAsMelodicSampleAction({
      rawSourceAsset: args.rawSourceAsset,
      materialExport: args.materialExport,
      spectralData: args.spectralData,
      synthMode: args.synthMode,
      waveformMix: args.waveformMix,
      selectionStartSec: args.selectionStartSec,
      selectionDurationSec: args.selectionDurationSec,
      sourceView: args.sourceView,
      activeWorkspace: args.activeWorkspace,
      destructivePreviewProfile: args.destructivePreviewProfile,
      warpAudioProfile: args.warpAudioProfile,
      registerMelodicSampleFromBlob: registerMelodicSampleFromBlob as any,
      setStatus: args.setStatus,
    });
  }

  function deleteMelodicSample(sampleId: string) {
    deleteMelodicSampleAction({
      sampleId,
      melodicSampleEntries: args.melodicSampleEntries,
      setMelodicSampleEntries: args.setMelodicSampleEntries,
      setStatus: args.setStatus,
    });
  }

  function renameMelodicSample(sampleId: string, name: string) {
    renameMelodicSampleAction({
      sampleId,
      name,
      melodicSampleEntries: args.melodicSampleEntries,
      setMelodicSampleEntries: args.setMelodicSampleEntries,
      setStatus: args.setStatus,
    });
  }

  function updateMelodicSampleBaseHz(sampleId: string, baseHz: number | null) {
    updateMelodicSampleBaseHzAction({
      sampleId,
      baseHz,
      melodicSampleEntries: args.melodicSampleEntries,
      setMelodicSampleEntries: args.setMelodicSampleEntries,
      setStatus: args.setStatus,
    });
  }

  async function previewMelodicSampleReferencePitch(sampleId: string, overrideBaseHz?: number | null) {
    await previewMelodicSampleReferencePitchAction({
      sampleId,
      melodicSampleEntries: args.melodicSampleEntries,
      overrideBaseHz,
      setStatus: args.setStatus,
    });
  }

  function setMelodicSampleTempoProfile(sampleId: string, options: { tempoPitchLinked: boolean; playbackDurationSec: number | null }) {
    setMelodicSampleTempoProfileAction({
      sampleId,
      options,
      melodicSampleEntries: args.melodicSampleEntries,
      setMelodicSampleEntries: args.setMelodicSampleEntries,
      setStatus: args.setStatus,
    });
  }

  async function previewMelodicSampleTempoProfile(sampleId: string, playbackDurationSec: number) {
    await previewMelodicSampleTempoProfileAction({
      sampleId,
      playbackDurationSec,
      melodicSampleEntries: args.melodicSampleEntries,
      setStatus: args.setStatus,
    });
  }

  function updateMelodicSampleEnvelope(sampleId: string, target: 'volumeEnvelope' | 'pitchEnvelope', field: LocalFieldModuleState | null) {
    updateMelodicSampleEnvelopeAction({
      sampleId,
      target,
      field,
      melodicSampleEntries: args.melodicSampleEntries,
      setMelodicSampleEntries: args.setMelodicSampleEntries,
      setStatus: args.setStatus,
    });
  }

  async function freezeSelectedLoopNoteToSample() {
    const selectedNoteId = args.loopComposer.selectedNoteId;
    if (!selectedNoteId) {
      args.setStatus('Kein Notenblock ausgewählt.');
      return;
    }
    const sourceNote = args.loopComposer.notes.find((entry) => entry.id === selectedNoteId);
    if (!sourceNote) {
      args.setStatus('Der ausgewählte Notenblock wurde nicht gefunden.');
      return;
    }
    const sourceTrack = args.loopComposer.tracks.find((entry) => entry.id === sourceNote.trackId);
    if (!sourceTrack) {
      args.setStatus('Die Spur des ausgewählten Notenblocks wurde nicht gefunden.');
      return;
    }
    const effectivePreset = (typeof sourceNote.instrumentPresetOverride === 'string' && sourceNote.instrumentPresetOverride.trim())
      ? sourceNote.instrumentPresetOverride
      : sourceTrack.instrumentPreset;
    if (!effectivePreset) {
      args.setStatus('Dieser Block hat kein rendertes Instrument.');
      return;
    }
    const sourcePresetIsSample = effectivePreset.startsWith('sample:');

    const renderComposer = cloneLoopComposerState(args.loopComposer);
    const renderTrack = renderComposer.tracks.find((entry) => entry.id === sourceTrack.id);
    const renderNote = renderComposer.notes.find((entry) => entry.id === sourceNote.id);
    if (!renderTrack || !renderNote) {
      args.setStatus('Die Render-Vorbereitung des ausgewählten Blocks ist fehlgeschlagen.');
      return;
    }

    const durationUnits = noteDurationUnits(renderComposer, renderNote);
    const barsForNote = Math.max(1, Math.ceil(durationUnits / Math.max(1, renderComposer.stepsPerBar)));
    renderComposer.bars = barsForNote;
    renderTrack.instrumentPreset = effectivePreset;
    renderNote.instrumentPresetOverride = null;
    if (!sourcePresetIsSample) {
      renderNote.localField = null;
      renderNote.sampleOffsetSec = null;
      renderNote.samplePlaybackDurationSec = null;
    }
    renderNote.startUnit = 0;
    renderNote.startStep = 0;
    renderNote.startBeat = 0;
    renderNote.endBeat = durationUnits / Math.max(0.25, loopUnitsPerBeat(renderComposer));
    renderComposer.notes = [syncLoopNoteToState(renderComposer, { ...renderNote })];
    renderComposer.selectedNoteId = renderNote.id;
    renderComposer.selectedTrackId = renderTrack.id;

    const presetLabel = getMelodicSoundDisplayLabel(effectivePreset as LoopTrackInstrumentPreset, args.melodicSampleEntries);
    args.setStatus(`Rendere ${presetLabel} als eigenes Sample …`);
    try {
      const blob = await renderLoopComposerToWavBlob({
        composer: renderComposer,
        bpm: args.materialExport.bpm,
        bars: renderComposer.bars,
        trackIds: [renderTrack.id],
        noteId: renderNote.id,
      }, { tailSec: 0.24 });
      const selectedChannelIndex = noteChannelIndex(args.loopComposer, sourceNote);
      const selectedLine = args.loopComposer.pitchLines?.[selectedChannelIndex];
      const selectedStep = args.loopComposer.pitchSteps[selectedChannelIndex] ?? args.loopComposer.pitchSteps[0];
      const safeBaseHz = Math.max(30, Math.min(1200, Number.isFinite(args.loopComposer.baseHz) ? args.loopComposer.baseHz : 220));
      const lineHz = selectedLine?.hz ?? (safeBaseHz * (selectedStep?.ratio ?? 1));
      const cents = ((selectedLine?.offsetCents ?? selectedStep?.offsetCents ?? 0)) / 1200;
      const repetitionRatio = args.loopComposer.repetitionModel === 'tritave' ? 3 : 2;
      const renderedInstrument = sourcePresetIsSample ? null : resolveInstrumentDef(effectivePreset, new Map());
      const renderedOctaveBias = renderedInstrument?.kind === 'synth' ? (renderedInstrument.voice.octaveBias ?? 0) : 0;
      const renderedAnchorHz = Math.max(20, Math.min(12000, lineHz * Math.pow(repetitionRatio, canonicalLoopNoteOctaveOffset(sourceNote) + renderedOctaveBias) * Math.pow(2, cents)));
      const saved = await saveGeneratedMelodicSample(sourcePresetIsSample ? `${presetLabel} Block-Kopie` : `${presetLabel} Block`, blob);
      await updateSavedMelodicSampleMeta(saved.id, { baseHz: renderedAnchorHz });
      const nextEntries = await listSavedMelodicSamples();
      args.setMelodicSampleEntries(nextEntries);
      args.mutateLoopComposer((draft) => {
        const note = draft.notes.find((entry) => entry.id === selectedNoteId);
        if (!note) return;
        note.instrumentPresetOverride = `sample:${saved.id}`;
        note.renderSourceKind = 'synth-frozen-sample';
        note.sampleOffsetSec = 0;
        note.samplePlaybackDurationSec = null;
        note.localField = null;
        note.anchorHz = renderedAnchorHz;
      }, sourcePresetIsSample ? `${presetLabel} als neuer Sample-Block gebacken.` : `${presetLabel} als eigener Sample-Block abgelegt · Pitchanker ${renderedAnchorHz.toFixed(1)} Hz.`);
    } catch (error) {
      console.warn('[xensonar][melodic-loop][freeze-note-to-sample]', error);
      args.setStatus(error instanceof Error ? `Block-Sample konnte nicht erzeugt werden: ${error.message}` : 'Block-Sample konnte nicht erzeugt werden.');
    }
  }

  return {
    registerMelodicSampleFromBlob,
    importMaterialEntryIntoMelodicLoop,
    fragmentSelectedMaterialBaseNote,
    uploadMelodicSamples,
    importSpectralSelectionAsMelodicSample,
    deleteMelodicSample,
    renameMelodicSample,
    updateMelodicSampleBaseHz,
    previewMelodicSampleReferencePitch,
    setMelodicSampleTempoProfile,
    previewMelodicSampleTempoProfile,
    updateMelodicSampleEnvelope,
    freezeSelectedLoopNoteToSample,
  };
}
