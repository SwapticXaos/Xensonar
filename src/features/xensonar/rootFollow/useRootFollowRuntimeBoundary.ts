import { useCallback, useEffect, useRef, useState } from "react";
import type { MaterialEntry } from "../../l3lab/materialLibrary";
import { useRootFollowLoopPlayback } from "../material/useRootFollowLoopPlayback";
import type { MaterialLoopTimeMode } from "../material/materialLoopMath";
import type { RootFollowBankEntryConfig } from "./rootFollowTypes";
import { resolveRootFollowTargetHz } from "./rootFollowPitchResolver";
import type { RootFollowRuntimeBoundaryRefs } from "./rootFollowRuntimeBoundary";
import type { RootFollowGranularSettings } from "./rootFollowGranularSettings";
import type { RootFollowImpulseRasterClockMode } from "./rootFollowImpulseRasterPolicy";
import type { RootFollowRuntimePolicy } from "../performanceCrisis/performanceCrisisRuntimePolicies";
import { installRootFollowPlaybackTruthProbeReader, recordRootFollowPlaybackTruthEvent } from './rootFollowPlaybackTruthProbe';

export type RootFollowAnchorHzReaderArgs = {
  getCursorY: () => number;
  freqFromY: (y: number) => number;
  minHz?: number;
  maxHz?: number;
};

export function createRootFollowAnchorHzReader({
  getCursorY,
  freqFromY,
  minHz = 27.5,
  maxHz = 3520,
}: RootFollowAnchorHzReaderArgs) {
  return () =>
    resolveRootFollowTargetHz({
      cursorY: getCursorY(),
      freqFromY,
      minHz,
      maxHz,
    });
}

export function useRootFollowPlayfieldGateBoundary() {
  const rootFollowPlayfieldGateRef = useRef({ inside: false });
  const [rootFollowPlayfieldInside, setRootFollowPlayfieldInside] =
    useState(false);

  const setRootFollowPlayfieldInsideGate = useCallback((inside: boolean) => {
    if (rootFollowPlayfieldGateRef.current.inside === inside) return;
    rootFollowPlayfieldGateRef.current.inside = inside;
    recordRootFollowPlaybackTruthEvent({
      stage: 'playfield-gate-change',
      rootFollowPlayfieldInside: inside,
      effectivePlaybackGate: inside,
      detail: { source: 'useRootFollowPlayfieldGateBoundary' },
    });
    setRootFollowPlayfieldInside(inside);
  }, []);

  return {
    rootFollowPlayfieldInside,
    setRootFollowPlayfieldInsideGate,
  };
}

type UseRootFollowPlaybackRuntimeBoundaryArgs = {
  audioCtx: AudioContext | null;
  nexusActive: boolean;
  rootFollowLoopActive: boolean;
  selectedRootFollowLoop: MaterialEntry | null;
  selectedRootFollowLoopConfig: RootFollowBankEntryConfig | null;
  quantizeBpm: number;
  rootFollowLoopTimeMode: MaterialLoopTimeMode;
  rootFollowLoopVolume: number;
  rootFollowLoopGranulationMode: "flowing" | "grainy";
  rootFollowGranularSettings: RootFollowGranularSettings;
  rootFollowImpulsRasterEvery: number;
  rootFollowImpulsRasterCycleDiv: number;
  rootFollowImpulsRasterClockMode: RootFollowImpulseRasterClockMode;
  rootFollowImpulsRasterPattern: number[];
  refs: RootFollowRuntimeBoundaryRefs;
  trafficRef: { current: unknown };
  getRhythmBus: (ctx: AudioContext) => AudioNode;
  rootFollowPreviewActive: boolean;
  rootFollowPlayfieldInside: boolean;
  playfieldCursorInside: boolean;
  ensureMyzelPostFxRouter: (ctx: AudioContext) => void;
  getForgeSend: () => GainNode | null;
  getCurrentRootHz: () => number;
  getAudioPressureBias?: () => number;
  rootFollowPolicy?: RootFollowRuntimePolicy;
};

export function useRootFollowPlaybackRuntimeBoundary({
  audioCtx,
  nexusActive,
  rootFollowLoopActive,
  selectedRootFollowLoop,
  selectedRootFollowLoopConfig,
  quantizeBpm,
  rootFollowLoopTimeMode,
  rootFollowLoopVolume,
  rootFollowLoopGranulationMode,
  rootFollowGranularSettings,
  rootFollowImpulsRasterEvery,
  rootFollowImpulsRasterCycleDiv,
  rootFollowImpulsRasterClockMode,
  rootFollowImpulsRasterPattern,
  refs,
  trafficRef,
  getRhythmBus,
  rootFollowPreviewActive,
  rootFollowPlayfieldInside,
  playfieldCursorInside,
  ensureMyzelPostFxRouter,
  getForgeSend,
  getCurrentRootHz,
  getAudioPressureBias,
  rootFollowPolicy,
}: UseRootFollowPlaybackRuntimeBoundaryArgs) {
  useEffect(() => {
    installRootFollowPlaybackTruthProbeReader();
  }, []);

  useRootFollowLoopPlayback({
    audioCtx,
    nexusActive,
    rootFollowLoopActive,
    selectedRootFollowLoop,
    selectedRootFollowLoopConfig,
    quantizeBpm,
    rootFollowLoopTimeMode,
    rootFollowLoopVolume,
    rootFollowLoopGranulationMode,
    rootFollowGranularSettings,
    rootFollowImpulsRasterEvery,
    rootFollowImpulsRasterCycleDiv,
    rootFollowImpulsRasterClockMode,
    rootFollowImpulsRasterPattern,
    refs: {
      cacheRef: refs.cacheRef,
      gainRef: refs.gainRef,
      tokenRef: refs.tokenRef,
      timerRef: refs.timerRef,
      activeNodesRef: refs.activeNodesRef,
      activeSynthVoicesRef: refs.activeSynthVoicesRef,
      trafficRef,
    },
    getRhythmBus,
    rootFollowPreviewActive,
    rootFollowPlayfieldInside,
    playfieldCursorInside,
    ensureMyzelPostFxRouter,
    getForgeSend,
    getCurrentRootHz,
    getAudioPressureBias,
    rootFollowPolicy,
  });
}
