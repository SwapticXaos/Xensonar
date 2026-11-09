import type { Dispatch, SetStateAction } from 'react';
import { useCanonicalForgeHandoffEffects } from './useCanonicalForgeHandoffEffects';
import { useCanonicalForgeIntakeBridgeEffect } from './useCanonicalForgeIntakeBridgeEffect';
import { useCanonicalForgePreviewLifecycleEffects } from './useCanonicalForgePreviewLifecycleEffects';
import type { CanonicalLogicView } from './sessionTypes';

export function useCanonicalForgeLifecycleEffects(args: {
  stopPreviewAudio: () => void;
  stopLoopComposerPreview: () => void;
  stopSelectionLoopPreview: () => void;
  applyLogicView: (view: CanonicalLogicView) => void;
  setActiveWorkspace: (value: any) => void;
  setLoopComposer: (value: any) => void;
  setLoopPatternVariants: (value: any) => void;
  setLoopPatternLinks: (value: any) => void;
  loopPatternVariantsRef: { current: any };
  loopPatternLinksRef: { current: any };
  setSelectedMelodicProjectId: (value: string) => void;
  setSelectedLoopNoteIds: (value: string[]) => void;
  setMaterialExport: (value: any) => void;
  setStatus: (value: string) => void;
  stopAllForge2Preview: (statusMessage?: string) => void;
  setPendingImageImport: (value: any) => void;
  setRawSourceAsset: (value: any) => void;
  setSelectionStartSec: (value: number) => void;
  setSelectionDurationSec: (value: number) => void;
  setLastAutoCorrect: (value: any) => void;
  setSourceView: (value: any) => void;
  setSecondaryView: (value: any) => void;
  setViewBlend: (value: number) => void;
  applySelection: (source: any, startSec: number, durationSec: number) => Promise<any>;
  setSourcePreviewMode: (value: any) => void;
  selectionStartSec: number;
  selectionDurationSec: number;
  detailSelectionStartSec: number;
  detailSelectionDurationSec: number;
  detailSelectionDirty: boolean;
  selectionLoopPreviewPlaying: boolean;
  startSelectionLoopPreview: () => Promise<any>;
  auditionView: any;
  auditionBlendAmount: number;
  isPlaying: boolean;
  sourceAuditionModeRef: { current: any };
  startSourceAuditionPreview: (mode: any, playheadPosition: number) => Promise<boolean>;
  playheadPosition: number;
  setIsPlaying: (value: boolean) => void;
  setPlayheadPosition: (value: number) => void;
  activeHandoffProfile: any;
  activeWorkspace: any;
  materialExport: any;
  spectralData: any;
  synthMode: any;
  waveformMix: any;
  sourceView: any;
  destructiveAudioProfile: any;
  warpAudioProfile: any;
  canonicalProducer: string;
  createTransferMetadata: (args: any) => any;
  registerMelodicSampleFromBlob: (payload: any) => Promise<any> | any;
  setDetailSelectionStartSec: Dispatch<SetStateAction<number>>;
  setDetailSelectionDurationSec: Dispatch<SetStateAction<number>>;
  setDetailSelectionDirty: Dispatch<SetStateAction<boolean>>;
  setDetailViewportStartSec: Dispatch<SetStateAction<number>>;
  setDetailViewportDurationSec: Dispatch<SetStateAction<number>>;
  setBusy: Dispatch<SetStateAction<boolean>>;
}) {
  useCanonicalForgeHandoffEffects({
    stopLoopComposerPreview: args.stopLoopComposerPreview,
    applyLogicView: args.applyLogicView,
    setActiveWorkspace: args.setActiveWorkspace,
    setLoopComposer: args.setLoopComposer,
    setLoopPatternVariants: args.setLoopPatternVariants,
    setLoopPatternLinks: args.setLoopPatternLinks,
    loopPatternVariantsRef: args.loopPatternVariantsRef,
    loopPatternLinksRef: args.loopPatternLinksRef,
    setSelectedMelodicProjectId: args.setSelectedMelodicProjectId,
    setSelectedLoopNoteIds: args.setSelectedLoopNoteIds,
    setMaterialExport: args.setMaterialExport,
    setStatus: args.setStatus,
    stopAllForge2Preview: args.stopAllForge2Preview,
    setPendingImageImport: args.setPendingImageImport,
    setRawSourceAsset: args.setRawSourceAsset,
    setSelectionStartSec: args.setSelectionStartSec,
    setSelectionDurationSec: args.setSelectionDurationSec,
    setLastAutoCorrect: args.setLastAutoCorrect,
    setSourceView: args.setSourceView,
    setSecondaryView: args.setSecondaryView,
    setViewBlend: args.setViewBlend,
    applySelection: args.applySelection,
    setSourcePreviewMode: args.setSourcePreviewMode,
  });

  useCanonicalForgePreviewLifecycleEffects({
    stopPreviewAudio: args.stopPreviewAudio,
    stopLoopComposerPreview: args.stopLoopComposerPreview,
    stopSelectionLoopPreview: args.stopSelectionLoopPreview,
    setStatus: args.setStatus,
    selectionStartSec: args.selectionStartSec,
    selectionDurationSec: args.selectionDurationSec,
    detailSelectionStartSec: args.detailSelectionStartSec,
    detailSelectionDurationSec: args.detailSelectionDurationSec,
    detailSelectionDirty: args.detailSelectionDirty,
    selectionLoopPreviewPlaying: args.selectionLoopPreviewPlaying,
    startSelectionLoopPreview: args.startSelectionLoopPreview,
    auditionView: args.auditionView,
    auditionBlendAmount: args.auditionBlendAmount,
    isPlaying: args.isPlaying,
    sourceAuditionModeRef: args.sourceAuditionModeRef,
    startSourceAuditionPreview: args.startSourceAuditionPreview,
    playheadPosition: args.playheadPosition,
    setIsPlaying: args.setIsPlaying,
    setPlayheadPosition: args.setPlayheadPosition,
  });

  useCanonicalForgeIntakeBridgeEffect({
    activeHandoffProfile: args.activeHandoffProfile,
    activeWorkspace: args.activeWorkspace,
    materialExport: args.materialExport,
    spectralData: args.spectralData,
    synthMode: args.synthMode,
    waveformMix: args.waveformMix,
    sourceView: args.sourceView,
    destructiveAudioProfile: args.destructiveAudioProfile,
    warpAudioProfile: args.warpAudioProfile,
    canonicalProducer: args.canonicalProducer,
    applySelection: args.applySelection,
    createTransferMetadata: args.createTransferMetadata,
    registerMelodicSampleFromBlob: args.registerMelodicSampleFromBlob,
    setPendingImageImport: args.setPendingImageImport,
    setRawSourceAsset: args.setRawSourceAsset,
    setMaterialExport: args.setMaterialExport,
    setLastAutoCorrect: args.setLastAutoCorrect,
    setDetailSelectionStartSec: args.setDetailSelectionStartSec,
    setDetailSelectionDurationSec: args.setDetailSelectionDurationSec,
    setDetailSelectionDirty: args.setDetailSelectionDirty,
    setDetailViewportStartSec: args.setDetailViewportStartSec,
    setDetailViewportDurationSec: args.setDetailViewportDurationSec,
    setSourcePreviewMode: args.setSourcePreviewMode,
    setStatus: args.setStatus,
    setBusy: args.setBusy,
  });
}
