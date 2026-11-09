import { getMelodicLoopRenderPayloadAction } from './melodicLoopExportActions';
import type { SelectedNotePreviewOptions } from './selectedNotePreviewContract';
import {
  handleLoopComposerExportHelper,
  handleLoopComposerExportToForge1Helper,
  handleLoopComposerExportToForge2Helper,
  previewTrackInstrumentSelectionHelper,
  startComposerPreviewModeHelper,
  startDrumPreviewHelper,
  startEnabledTracksPreviewHelper,
  startMaterialGroovePreviewHelper,
  startSpecificTrackPreviewHelper,
  stopAllForge2PreviewHelper,
  type Forge2PreviewActionSet,
} from './melodicLoopPreviewActions';
import type { LoopComposerState } from './loopDrumDomain';
import type { CanonicalSourceView } from './analysis';
import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import type { TransferMode } from './selectionAudioTransfer';

export function createMelodicPreviewTransportController(args: {
  forge2PreviewActions: Forge2PreviewActionSet;
  loopComposer: LoopComposerState;
  materialExport: {
    name: string;
    role: 'loop' | 'waveMaterial' | 'particleExciter' | 'droneTexture';
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
  grooveMachine: any;
  drumComputer: any;
  spectralData: any;
  synthMode: any;
  waveformMix: any;
  loopDurationSec: number;
  activeHandoffProfile: any;
  selectedAdapterName: string;
  canonicalProducer: any;
  onRequestModeChange?: ((mode: any) => void) | undefined;
  setPendingImageImport: (value: any) => void;
  setRawSourceAsset: (value: AudioSourceAsset) => void;
  setSelectionStartSec: (value: number) => void;
  setSelectionDurationSec: (value: number) => void;
  setMaterialExport: (updater: (state: any) => any) => void;
  setLastAutoCorrect: (value: any) => void;
  setSourceView: (value: CanonicalSourceView) => void;
  setSecondaryView: (value: CanonicalSourceView) => void;
  setViewBlend: (value: number) => void;
  applySelection: (source: AudioSourceAsset, startSec: number, durationSec: number, status?: string, options?: { preserveDetailSelection?: boolean; resetDetailViewport?: boolean }) => Promise<void>;
  setActiveWorkspace: (value: any) => void;
  setSourcePreviewMode: (value: 'forge' | 'sourceWindow' | 'sourceFull') => void;
  setBusy: (value: boolean) => void;
  setStatus: (value: string) => void;
  referenceBpm: number;
}) {
  const stopAllForge2Preview = (statusMessage = 'Vorschau gestoppt.') => stopAllForge2PreviewHelper(args.forge2PreviewActions, statusMessage);

  const startMaterialGroovePreview = async (withDrums: boolean, trackMode: 'visible' | 'enabled' = 'visible') => startMaterialGroovePreviewHelper({
    withDrums,
    trackMode,
    spectralData: args.spectralData,
    synthMode: args.synthMode,
    waveformMix: args.waveformMix,
    loopDurationSec: args.loopDurationSec,
    materialExport: args.materialExport,
    loopComposer: args.loopComposer,
    grooveMachine: args.grooveMachine,
    drumComputer: args.drumComputer,
    actions: args.forge2PreviewActions,
  });

  const startDrumPreview = async (withTracks: 'none' | 'visible' | 'enabled' = 'none') => startDrumPreviewHelper({
    withTracks,
    loopComposer: args.loopComposer,
    materialExport: args.materialExport,
    grooveMachine: args.grooveMachine,
    drumComputer: args.drumComputer,
    actions: args.forge2PreviewActions,
  });

  const startSpecificTrackPreview = async (trackId: string) => startSpecificTrackPreviewHelper({
    trackId,
    loopComposer: args.loopComposer,
    materialExport: args.materialExport,
    actions: args.forge2PreviewActions,
  });

  const previewTrackInstrumentSelection = async (trackId: string, presetId: string) => previewTrackInstrumentSelectionHelper({
    trackId,
    presetId,
    loopComposer: args.loopComposer,
    materialExport: args.materialExport,
    actions: args.forge2PreviewActions,
  });

  const startEnabledTracksPreview = async () => startEnabledTracksPreviewHelper({
    loopComposer: args.loopComposer,
    materialExport: args.materialExport,
    actions: args.forge2PreviewActions,
  });

  const getMelodicLoopRenderPayload = async () => getMelodicLoopRenderPayloadAction({
    loopComposer: args.loopComposer,
    materialExport: args.materialExport,
  });

  const handleLoopComposerExport = async () => handleLoopComposerExportHelper({
    loopComposer: args.loopComposer,
    materialExport: args.materialExport,
    activeHandoffProfile: args.activeHandoffProfile,
    referenceBpm: args.referenceBpm,
    selectedAdapterName: args.selectedAdapterName,
    canonicalProducer: args.canonicalProducer,
    setBusy: args.setBusy,
    setStatus: args.setStatus,
  });

  const handleLoopComposerExportToForge1 = async () => handleLoopComposerExportToForge1Helper({
    loopComposer: args.loopComposer,
    materialExport: args.materialExport,
    onRequestModeChange: args.onRequestModeChange,
    setBusy: args.setBusy,
    setStatus: args.setStatus,
  });

  const handleLoopComposerExportToForge2 = async () => handleLoopComposerExportToForge2Helper({
    loopComposer: args.loopComposer,
    materialExport: args.materialExport,
    stopAllForge2Preview,
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
    setSourcePreviewMode: args.setSourcePreviewMode,
    setBusy: args.setBusy,
    setStatus: args.setStatus,
  });

  const startComposerPreviewMode = async (mode: 'selected-note' | 'selected-track' | 'visible-tracks' | 'enabled-tracks', options?: SelectedNotePreviewOptions) => startComposerPreviewModeHelper({
    mode,
    noteOverride: options?.noteOverride,
    loopComposer: args.loopComposer,
    materialExport: args.materialExport,
    stopAllForge2Preview,
    setClipPreviewStep: args.forge2PreviewActions.setClipPreviewStep,
    setStatus: args.setStatus,
  });

  return {
    stopAllForge2Preview,
    startMaterialGroovePreview,
    startDrumPreview,
    startSpecificTrackPreview,
    previewTrackInstrumentSelection,
    startEnabledTracksPreview,
    getMelodicLoopRenderPayload,
    handleLoopComposerExport,
    handleLoopComposerExportToForge1,
    handleLoopComposerExportToForge2,
    startComposerPreviewMode,
  };
}
