import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { registerCanonicalIntakeEventBridge } from './canonicalIntakeEventBridge';

export function useCanonicalForgeIntakeBridgeEffect(args: {
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
  applySelection: (source: any, startSec: number, durationSec: number) => Promise<any>;
  createTransferMetadata: (args: any) => any;
  registerMelodicSampleFromBlob: (payload: any) => Promise<any> | any;
  setPendingImageImport: (value: any) => void;
  setRawSourceAsset: (value: any) => void;
  setMaterialExport: (value: any) => void;
  setLastAutoCorrect: (value: any) => void;
  setDetailSelectionStartSec: Dispatch<SetStateAction<number>>;
  setDetailSelectionDurationSec: Dispatch<SetStateAction<number>>;
  setDetailSelectionDirty: Dispatch<SetStateAction<boolean>>;
  setDetailViewportStartSec: Dispatch<SetStateAction<number>>;
  setDetailViewportDurationSec: Dispatch<SetStateAction<number>>;
  setSourcePreviewMode: (value: any) => void;
  setStatus: (value: string) => void;
  setBusy: Dispatch<SetStateAction<boolean>>;
}) {
  const {
    activeHandoffProfile,
    activeWorkspace,
    materialExport,
    spectralData,
    synthMode,
    waveformMix,
    sourceView,
    destructiveAudioProfile,
    warpAudioProfile,
    canonicalProducer,
    applySelection,
    createTransferMetadata,
    registerMelodicSampleFromBlob,
    setPendingImageImport,
    setRawSourceAsset,
    setMaterialExport,
    setLastAutoCorrect,
    setDetailSelectionStartSec,
    setDetailSelectionDurationSec,
    setDetailSelectionDirty,
    setDetailViewportStartSec,
    setDetailViewportDurationSec,
    setSourcePreviewMode,
    setStatus,
    setBusy,
  } = args;

  useEffect(() => registerCanonicalIntakeEventBridge({
    materialExport,
    spectralData,
    synthMode,
    waveformMix,
    sourceView,
    activeWorkspace,
    destructiveAudioProfile,
    warpAudioProfile,
    activeHandoffProfile,
    canonicalProducer,
    applySelection,
    createTransferMetadata,
    registerMelodicSampleFromBlob,
    setPendingImageImport,
    setRawSourceAsset,
    setMaterialExport,
    setLastAutoCorrect,
    setDetailSelectionStartSec,
    setDetailSelectionDurationSec,
    setDetailSelectionDirty,
    setDetailViewportStartSec,
    setDetailViewportDurationSec,
    setSourcePreviewMode,
    setStatus,
    setBusy,
  }), [
    activeHandoffProfile,
    activeWorkspace,
    applySelection,
    createTransferMetadata,
    destructiveAudioProfile,
    materialExport,
    registerMelodicSampleFromBlob,
    setBusy,
    setDetailSelectionDirty,
    setDetailSelectionDurationSec,
    setDetailSelectionStartSec,
    setDetailViewportDurationSec,
    setDetailViewportStartSec,
    setLastAutoCorrect,
    setMaterialExport,
    setPendingImageImport,
    setRawSourceAsset,
    setSourcePreviewMode,
    setStatus,
    sourceView,
    spectralData,
    synthMode,
    waveformMix,
    warpAudioProfile,
  ]);
}
