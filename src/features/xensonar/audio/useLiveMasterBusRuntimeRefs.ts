import { useMemo, useRef } from "react";
import type { LiveMasteringSystem } from "../../resonance/liveMastering";
import type { LiveMasterBusRuntimeRefs } from "./liveMasterBusRuntimeBoundary";

export type LiveMasterBusRuntimeRefContract = LiveMasterBusRuntimeRefs & {
  liveMasterBusRuntimeRefs: LiveMasterBusRuntimeRefs;
};

export function useLiveMasterBusRuntimeRefs(): LiveMasterBusRuntimeRefContract {
  const finalMixBusRef = useRef<GainNode | null>(null);
  const drumMixBusRef = useRef<GainNode | null>(null);
  const masterMixBusRef = useRef<GainNode | null>(null);
  const finalLimiterRef = useRef<DynamicsCompressorNode | null>(null);
  const finalClipperRef = useRef<WaveShaperNode | null>(null);
  const finalOutputTrimRef = useRef<GainNode | null>(null);
  const finalMixAnalyserRef = useRef<AnalyserNode | null>(null);
  const preFxTapAnalyserRef = useRef<AnalyserNode | null>(null);
  const postFxTapAnalyserRef = useRef<AnalyserNode | null>(null);
  const monitorTapAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioTapScratchRef = useRef<Record<"pre_fx" | "post_fx" | "monitor", Uint8Array | null>>({
    pre_fx: null,
    post_fx: null,
    monitor: null,
  });
  const liveMasteringRef = useRef<LiveMasteringSystem | null>(null);
  const noDrumRecordClipperRef = useRef<WaveShaperNode | null>(null);
  const noDrumRecordLimiterRef = useRef<DynamicsCompressorNode | null>(null);
  const noDrumRecordOutputRef = useRef<GainNode | null>(null);
  const recordingDestinationWithDrumsRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recordingDestinationWithoutDrumsRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const externalGameRecordingBusRef = useRef<GainNode | null>(null);
  const externalGameRecordingBusConnectionTargetsRef = useRef<Set<MediaStreamAudioDestinationNode>>(new Set());

  const liveMasterBusRuntimeRefs = useMemo<LiveMasterBusRuntimeRefs>(() => ({
    finalMixBusRef,
    drumMixBusRef,
    masterMixBusRef,
    finalLimiterRef,
    finalClipperRef,
    finalOutputTrimRef,
    finalMixAnalyserRef,
    preFxTapAnalyserRef,
    postFxTapAnalyserRef,
    monitorTapAnalyserRef,
    audioTapScratchRef,
    liveMasteringRef,
    noDrumRecordClipperRef,
    noDrumRecordLimiterRef,
    noDrumRecordOutputRef,
    recordingDestinationWithDrumsRef,
    recordingDestinationWithoutDrumsRef,
    externalGameRecordingBusRef,
    externalGameRecordingBusConnectionTargetsRef,
  }), []);

  return {
    ...liveMasterBusRuntimeRefs,
    liveMasterBusRuntimeRefs,
  };
}
