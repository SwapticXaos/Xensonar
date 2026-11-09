import { useRef, useState } from "react";
import { createEmptyAudioEventIntakeState, type AudioEventIntakeState } from "@/features/soundLibrary/audioEventIntake";
import { summarizeAudioTapState } from "@/features/soundLibrary/audioTapDiagnostics";
import type { LiveMasterTelemetry } from "@/features/resonance/liveMastering";

const createDefaultLiveMasterTelemetry = (): LiveMasterTelemetry => ({
  main: 0,
  drone: 0,
  rhythm: 0,
  space: 0,
  density: 0,
  trim: 0.92,
});

export function useLiveMasteringUiState() {
  const [liveMasteringEnabled, setLiveMasteringEnabled] = useState(false);
  const [liveMasteringStrength, setLiveMasteringStrength] = useState(0.68);
  const [liveMasteringGlue, setLiveMasteringGlue] = useState(0.54);
  const [liveMasteringAir, setLiveMasteringAir] = useState(0.48);
  const [liveMasterMonitor, setLiveMasterMonitor] = useState<LiveMasterTelemetry>(() => createDefaultLiveMasterTelemetry());
  const [audioEventIntakeMonitor, setAudioEventIntakeMonitor] = useState<AudioEventIntakeState>(() => createEmptyAudioEventIntakeState());
  const audioEventIntakeMonitorRef = useRef<AudioEventIntakeState>(createEmptyAudioEventIntakeState());
  const [audioTapMonitor, setAudioTapMonitor] = useState(() => summarizeAudioTapState(createEmptyAudioEventIntakeState()));

  return {
    liveMasteringEnabled,
    setLiveMasteringEnabled,
    liveMasteringStrength,
    setLiveMasteringStrength,
    liveMasteringGlue,
    setLiveMasteringGlue,
    liveMasteringAir,
    setLiveMasteringAir,
    liveMasterMonitor,
    setLiveMasterMonitor,
    audioEventIntakeMonitor,
    setAudioEventIntakeMonitor,
    audioEventIntakeMonitorRef,
    audioTapMonitor,
    setAudioTapMonitor,
  };
}
