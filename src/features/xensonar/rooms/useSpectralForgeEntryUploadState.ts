import { useRef, useState } from "react";
import type { SpectralForgeEntryScrollIntent, SpectralForgeExternalAudioOrigin } from "../../l3lab/contracts/spectralForgeEntryIntent";

export function useSpectralForgeEntryUploadState() {
  const [spectralForgeExternalAudioFile, setSpectralForgeExternalAudioFile] = useState<File | null>(null);
  const [spectralForgeExternalAudioOrigin, setSpectralForgeExternalAudioOrigin] = useState<SpectralForgeExternalAudioOrigin | null>(null);
  const [spectralForgeEntryScrollIntent, setSpectralForgeEntryScrollIntent] = useState<SpectralForgeEntryScrollIntent | null>(null);
  const spectralForgeCutUploadSequenceRef = useRef(0);
  const spectralForgeCutUploadRafIdsRef = useRef<number[]>([]);

  return {
    spectralForgeExternalAudioFile,
    setSpectralForgeExternalAudioFile,
    spectralForgeExternalAudioOrigin,
    setSpectralForgeExternalAudioOrigin,
    spectralForgeEntryScrollIntent,
    setSpectralForgeEntryScrollIntent,
    spectralForgeCutUploadSequenceRef,
    spectralForgeCutUploadRafIdsRef,
  };
}
