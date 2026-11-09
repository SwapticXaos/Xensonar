import { useEffect, useRef, useState } from "react";
import { reportXensonarPromiseFailure } from "../diagnostics/runtimeIssueReporter";
import { listSavedMelodicSamples, type SavedMelodicSampleMeta } from "../../l3lab/canonicalForge/melodicSampleLibrary";
import { MELODIC_SAMPLE_LIBRARY_UPDATED_EVENT } from "../../l3lab/melodicSamples/melodicSampleLibraryEvents";

export interface WaveStarterSoundRuntimeState {
  enabled: boolean;
  volume: number;
  preset: string;
}

export const useWaveStarterSoundRuntime = (
  waveSoundEnabled: boolean,
  waveSoundVolume: number,
  waveSoundPreset: string,
) => {
  const [waveStarterSampleEntries, setWaveStarterSampleEntries] = useState<SavedMelodicSampleMeta[]>([]);
  const waveSoundRuntimeRef = useRef<WaveStarterSoundRuntimeState>({
    enabled: true,
    volume: 0.22,
    preset: "tape_halo",
  });

  useEffect(() => {
    waveSoundRuntimeRef.current = {
      enabled: waveSoundEnabled,
      volume: waveSoundVolume,
      preset: waveSoundPreset,
    };
  }, [waveSoundEnabled, waveSoundVolume, waveSoundPreset]);

  useEffect(() => {
    const refreshWaveStarterSampleEntries = () => {
      void listSavedMelodicSamples()
        .then(setWaveStarterSampleEntries)
        .catch((error) => reportXensonarPromiseFailure('samples', 'wave-starter-sample-list-refresh', error));
    };
    refreshWaveStarterSampleEntries();
    window.addEventListener(MELODIC_SAMPLE_LIBRARY_UPDATED_EVENT, refreshWaveStarterSampleEntries as EventListener);
    return () => {
      window.removeEventListener(MELODIC_SAMPLE_LIBRARY_UPDATED_EVENT, refreshWaveStarterSampleEntries as EventListener);
    };
  }, []);

  return {
    waveStarterSampleEntries,
    waveSoundRuntimeRef,
  };
};
