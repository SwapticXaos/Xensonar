import { composerTrackById, type LoopComposerState, type LoopNoteEvent } from './loopDrumDomain';
import { startLoopComposerPreview } from './loopPreview';
import {
  exportMelodicLoopToForge1Action,
  exportMelodicLoopToForge2Action,
  exportMelodicLoopToXensonarAction,
} from './melodicLoopExportActions';
import {
  previewTrackInstrumentSelection as previewTrackInstrumentSelectionAction,
  startDrumPreview as startDrumPreviewAction,
  startEnabledTracksPreview as startEnabledTracksPreviewAction,
  startMaterialGroovePreview as startMaterialGroovePreviewAction,
  startSpecificTrackPreview as startSpecificTrackPreviewAction,
  stopAllForge2Preview as stopAllForge2PreviewAction,
} from './forgePlaybackActions';
import type { CanonicalSourceView } from './analysis';
import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';

type MaterialExportConfigLike = {
  name: string;
  role: string;
  adapterId: string;
  bpm: number;
  bars: number;
  rootFollowPreferred?: boolean;
};

type HandoffProfileLike = {
  preferredMyzelGroup: string;
  transitionGuard: string;
  balanceCarrier: string;
};

export type Forge2PreviewActionSet = {
  stopPreviewAudio: () => void;
  stopSelectionLoopPreview: () => void;
  setIsPlaying: (value: boolean) => void;
  setPlayheadPosition: (value: number) => void;
  setClipPreviewStep: (value: number | null) => void;
  setStatus: (value: string) => void;
};

export function stopAllForge2PreviewHelper(actions: Forge2PreviewActionSet, statusMessage = 'Vorschau gestoppt.') {
  stopAllForge2PreviewAction({
    actions,
    statusMessage,
  });
}

export async function startMaterialGroovePreviewHelper(args: {
  withDrums: boolean;
  trackMode: 'visible' | 'enabled';
  spectralData: any;
  synthMode: any;
  waveformMix: any;
  loopDurationSec: number;
  materialExport: MaterialExportConfigLike;
  loopComposer: LoopComposerState;
  grooveMachine: any;
  drumComputer: any;
  actions: Forge2PreviewActionSet;
}) {
  return startMaterialGroovePreviewAction(args as any);
}

export async function startDrumPreviewHelper(args: {
  withTracks: 'none' | 'visible' | 'enabled';
  loopComposer: LoopComposerState;
  materialExport: MaterialExportConfigLike;
  grooveMachine: any;
  drumComputer: any;
  actions: Forge2PreviewActionSet;
}) {
  return startDrumPreviewAction(args);
}

export async function startSpecificTrackPreviewHelper(args: {
  trackId: string;
  loopComposer: LoopComposerState;
  materialExport: MaterialExportConfigLike;
  actions: Forge2PreviewActionSet;
}) {
  return startSpecificTrackPreviewAction(args);
}

export async function previewTrackInstrumentSelectionHelper(args: {
  trackId: string;
  presetId: string;
  loopComposer: LoopComposerState;
  materialExport: MaterialExportConfigLike;
  actions: Forge2PreviewActionSet;
}) {
  return previewTrackInstrumentSelectionAction(args);
}

export async function startEnabledTracksPreviewHelper(args: {
  loopComposer: LoopComposerState;
  materialExport: MaterialExportConfigLike;
  actions: Forge2PreviewActionSet;
}) {
  return startEnabledTracksPreviewAction(args);
}

export async function handleLoopComposerExportHelper(args: {
  loopComposer: LoopComposerState;
  materialExport: MaterialExportConfigLike;
  activeHandoffProfile: HandoffProfileLike;
  referenceBpm: number;
  selectedAdapterName: string;
  canonicalProducer: any;
  setBusy: (value: boolean) => void;
  setStatus: (value: string) => void;
}) {
  args.setBusy(true);
  args.setStatus('Rendere Melodic Loop für Xensonar ...');
  try {
    await exportMelodicLoopToXensonarAction({
      loopComposer: args.loopComposer,
      materialExport: args.materialExport,
      activeHandoffProfile: args.activeHandoffProfile,
      referenceBpm: args.referenceBpm,
      selectedAdapterName: args.selectedAdapterName,
      canonicalProducer: args.canonicalProducer,
      setStatus: args.setStatus,
    });
  } catch (error) {
    console.error('[xensonar][melodic-loop][export]', error);
    args.setStatus(`Melodic-Loop-Export fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    args.setBusy(false);
  }
}

export async function handleLoopComposerExportToForge1Helper(args: {
  loopComposer: LoopComposerState;
  materialExport: MaterialExportConfigLike;
  onRequestModeChange?: ((mode: any) => void) | undefined;
  setBusy: (value: boolean) => void;
  setStatus: (value: string) => void;
}) {
  args.setBusy(true);
  args.setStatus('Rendere Melodic Loop für SpectralForge ...');
  try {
    await exportMelodicLoopToForge1Action({
      loopComposer: args.loopComposer,
      materialExport: args.materialExport,
      onRequestModeChange: args.onRequestModeChange,
      setStatus: args.setStatus,
    });
  } catch (error) {
    console.error('[xensonar][melodic-loop][forge1-export]', error);
    args.setStatus(`Melodic-Loop-Handoff nach SpectralForge fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    args.setBusy(false);
  }
}

export async function handleLoopComposerExportToForge2Helper(args: {
  loopComposer: LoopComposerState;
  materialExport: MaterialExportConfigLike;
  stopAllForge2Preview: (status?: string) => void;
  setPendingImageImport: (value: any) => void;
  setRawSourceAsset: (value: AudioSourceAsset) => void;
  setSelectionStartSec: (value: number) => void;
  setSelectionDurationSec: (value: number) => void;
  setMaterialExport: (updater: (state: MaterialExportConfigLike) => MaterialExportConfigLike) => void;
  setLastAutoCorrect: (value: any) => void;
  setSourceView: (value: CanonicalSourceView) => void;
  setSecondaryView: (value: CanonicalSourceView) => void;
  setViewBlend: (value: number) => void;
  applySelection: (source: AudioSourceAsset, startSec: number, durationSec: number, status?: string, options?: { preserveDetailSelection?: boolean; resetDetailViewport?: boolean }) => Promise<void>;
  setActiveWorkspace: (value: any) => void;
  setSourcePreviewMode: (value: 'forge' | 'sourceWindow' | 'sourceFull') => void;
  setBusy: (value: boolean) => void;
  setStatus: (value: string) => void;
}) {
  args.setBusy(true);
  args.setStatus('Rendere Melodic Loop innerhalb von SyntheticForge ...');
  try {
    await exportMelodicLoopToForge2Action({
      loopComposer: args.loopComposer,
      materialExport: args.materialExport,
      stopAllForge2Preview: args.stopAllForge2Preview,
      setPendingImageImport: args.setPendingImageImport,
      setRawSourceAsset: args.setRawSourceAsset,
      setSelectionStartSec: args.setSelectionStartSec,
      setSelectionDurationSec: args.setSelectionDurationSec,
      setMaterialExport: args.setMaterialExport,
      setLastAutoCorrect: args.setLastAutoCorrect,
      setSourceView: args.setSourceView,
      setSecondaryView: args.setSecondaryView,
      setViewBlend: args.setViewBlend,
      applySelection: args.applySelection,
      setActiveWorkspace: args.setActiveWorkspace,
      setStatus: args.setStatus,
    });
    args.setSourcePreviewMode('sourceWindow');
  } catch (error) {
    console.error('[xensonar][melodic-loop][forge2-export]', error);
    args.setStatus(`Melodic-Loop-Handoff innerhalb von SyntheticForge fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    args.setBusy(false);
  }
}

export async function startComposerPreviewModeHelper(args: {
  mode: 'selected-note' | 'selected-track' | 'visible-tracks' | 'enabled-tracks';
  noteOverride?: LoopNoteEvent;
  loopComposer: LoopComposerState;
  materialExport: MaterialExportConfigLike;
  stopAllForge2Preview: (status?: string) => void;
  setClipPreviewStep: (value: number | null) => void;
  setStatus: (value: string) => void;
}) {
  try {
    args.stopAllForge2Preview('Starte Clip-Vorschau ...');
    const composerForPreview = args.mode === 'selected-note' && args.noteOverride
      ? {
        ...args.loopComposer,
        selectedNoteId: args.noteOverride.id,
        selectedTrackId: args.noteOverride.trackId,
        notes: args.loopComposer.notes.map((note) => (note.id === args.noteOverride?.id ? { ...args.noteOverride } : note)),
      }
      : args.loopComposer;
    const selectedTrackIds = args.mode === 'selected-track'
      ? [composerForPreview.selectedTrackId]
      : args.mode === 'visible-tracks'
        ? composerForPreview.activeTrackIds
        : composerForPreview.tracks.filter((track) => track.enabled).map((track) => track.id);
    const filteredTrackIds = selectedTrackIds.filter((trackId) => composerTrackById(composerForPreview, trackId)?.enabled);
    const selectedId = args.mode === 'selected-note' ? composerForPreview.selectedNoteId : null;
    if (args.mode === 'selected-note' && !selectedId) {
      args.setStatus('Keine Note ausgewählt.');
      return;
    }
    if (args.mode !== 'selected-note' && filteredTrackIds.length === 0) {
      args.setStatus('Keine aktive Spur für die Vorschau.');
      return;
    }
    args.setClipPreviewStep(null);
    await startLoopComposerPreview({
      composer: composerForPreview,
      bpm: args.materialExport.bpm,
      bars: composerForPreview.bars,
      trackIds: filteredTrackIds,
      noteId: selectedId,
      onPlayhead: (stepFloat) => args.setClipPreviewStep(stepFloat),
      onEnded: () => {
        args.setClipPreviewStep(null);
        args.setStatus('Clip-Vorschau beendet.');
      },
    });
    args.setStatus(
      args.mode === 'selected-note'
        ? 'Ausgewählte Note vorgehört.'
        : args.mode === 'selected-track'
          ? 'Aktive Spur vorgehört.'
          : args.mode === 'visible-tracks'
            ? 'Sichtbare Spuren vorgehört.'
            : 'Alle aktiven Spuren vorgehört.'
    );
  } catch (error) {
    console.error('[xensonar][forge2][clip-preview]', error);
    args.setClipPreviewStep(null);
    args.setStatus(`Clip-Vorschau fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
  }
}
