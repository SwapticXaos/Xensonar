import { useCallback, useRef, useState } from "react";
import type { ControlSchedulerMetrics } from "@/features/resonance/controlScheduler";
import type { DescriptorSummary } from "@/features/resonance/collectiveMemoryEffect";
import type { SwarmState } from "@/features/resonance/schwarmdeuter";
import type { TransientRuntimeSnapshot } from "@/features/resonance/transientRuntime";
import {
  getDefaultCollectiveMemoryUi,
  getDefaultControlPerfMonitor,
  getDefaultEnterHoldPsyFxUi,
  getDefaultPsychedelicSpiralMonitor,
  getDefaultPsychedelicSpiralUi,
  getDefaultSchwarmUi,
  getDefaultTransientDriveUi,
  getDefaultTransientRuntimeMonitor,
} from "./resonanceFxDefaults";
import { mergeNestedUiSection } from "./uiStatePatchers";
import {
  publishResonanceControlPerfMonitor,
  publishResonanceTransientRuntimeMonitor,
} from "./resonanceRuntimeMonitorLiveChannel";

export function useResonanceFxUiState() {
  const [collectiveMemoryEnabled, setCollectiveMemoryEnabled] = useState(true);
  const [collectiveMemoryWindow, setCollectiveMemoryWindow] = useState(8);
  const [collectiveMemoryUi, setCollectiveMemoryUi] = useState(() => getDefaultCollectiveMemoryUi());
  const [collectiveMemoryMonitor, setCollectiveMemoryMonitor] = useState<DescriptorSummary | null>(null);

  const updateCollectiveMemoryUi = (
    key: keyof typeof collectiveMemoryUi,
    partial: Partial<(typeof collectiveMemoryUi)[keyof typeof collectiveMemoryUi]>,
  ) => {
    setCollectiveMemoryUi((prev) => mergeNestedUiSection(prev, key, partial));
  };

  const [psychedelicSpiralEnabled, setPsychedelicSpiralEnabled] = useState(false);
  const [psychedelicSpiralFollow, setPsychedelicSpiralFollow] = useState(0.42);
  const [psychedelicSpiralUi, setPsychedelicSpiralUi] = useState(() => getDefaultPsychedelicSpiralUi());
  const [psychedelicSpiralMonitor, setPsychedelicSpiralMonitor] = useState(() => getDefaultPsychedelicSpiralMonitor());

  const updatePsychedelicSpiralSource = (
    key: keyof Pick<typeof psychedelicSpiralUi, "drone" | "particles" | "waves" | "myzel">,
    partial: Partial<(typeof psychedelicSpiralUi)["drone"]>,
  ) => {
    setPsychedelicSpiralUi((prev) => mergeNestedUiSection(prev, key, partial));
  };

  const [enterHoldPsyFxEnabled, setEnterHoldPsyFxEnabled] = useState(false);
  const [enterHoldPsyFxUi, setEnterHoldPsyFxUi] = useState(() => getDefaultEnterHoldPsyFxUi());

  const [transientDriveUi, setTransientDriveUi] = useState(() => getDefaultTransientDriveUi());

  const updateTransientDriveSource = (
    key: keyof typeof transientDriveUi,
    partial: Partial<(typeof transientDriveUi)[keyof typeof transientDriveUi]>,
  ) => {
    setTransientDriveUi((prev) => mergeNestedUiSection(prev, key, partial));
  };

  const [schwarmEnabled, setSchwarmEnabled] = useState(false);
  const [schwarmUi, setSchwarmUi] = useState(() => getDefaultSchwarmUi());
  const [schwarmMonitor, setSchwarmMonitor] = useState<SwarmState | null>(null);

  const updateSchwarmSource = (
    key: keyof Pick<typeof schwarmUi, "drone" | "particles" | "waves" | "myzel">,
    partial: Partial<(typeof schwarmUi)["particles"]>,
  ) => {
    setSchwarmUi((prev) => mergeNestedUiSection(prev, key, partial));
  };

  // Diagnostics telemetry is intentionally kept out of root React state. These
  // values update several times per second even when the instrument is idle;
  // routing them through App state makes every monitor tick re-render the full
  // modern Xensonar tree. Keep the latest snapshots in refs and publish them
  // to the tiny monitor readout instead.
  const controlPerfMonitorRef = useRef<ControlSchedulerMetrics>(getDefaultControlPerfMonitor());
  const transientRuntimeMonitorRef = useRef<TransientRuntimeSnapshot>(getDefaultTransientRuntimeMonitor());

  const setControlPerfMonitor = useCallback((metrics: ControlSchedulerMetrics) => {
    controlPerfMonitorRef.current = metrics;
    publishResonanceControlPerfMonitor(metrics);
  }, []);

  const setTransientRuntimeMonitor = useCallback((snapshot: TransientRuntimeSnapshot) => {
    transientRuntimeMonitorRef.current = snapshot;
    publishResonanceTransientRuntimeMonitor(snapshot);
  }, []);

  const controlPerfMonitor = controlPerfMonitorRef.current;
  const transientRuntimeMonitor = transientRuntimeMonitorRef.current;

  return {
    collectiveMemoryEnabled,
    setCollectiveMemoryEnabled,
    collectiveMemoryWindow,
    setCollectiveMemoryWindow,
    collectiveMemoryUi,
    setCollectiveMemoryUi,
    collectiveMemoryMonitor,
    setCollectiveMemoryMonitor,
    updateCollectiveMemoryUi,
    psychedelicSpiralEnabled,
    setPsychedelicSpiralEnabled,
    psychedelicSpiralFollow,
    setPsychedelicSpiralFollow,
    psychedelicSpiralUi,
    setPsychedelicSpiralUi,
    psychedelicSpiralMonitor,
    setPsychedelicSpiralMonitor,
    updatePsychedelicSpiralSource,
    enterHoldPsyFxEnabled,
    setEnterHoldPsyFxEnabled,
    enterHoldPsyFxUi,
    setEnterHoldPsyFxUi,
    transientDriveUi,
    setTransientDriveUi,
    updateTransientDriveSource,
    schwarmEnabled,
    setSchwarmEnabled,
    schwarmUi,
    setSchwarmUi,
    schwarmMonitor,
    setSchwarmMonitor,
    updateSchwarmSource,
    controlPerfMonitor,
    setControlPerfMonitor,
    transientRuntimeMonitor,
    setTransientRuntimeMonitor,
  };
}
