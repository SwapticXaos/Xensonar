import { GAME_HEIGHT, GAME_WIDTH, JI_NODES } from "../domain/instrumentData";
import type { AppResonanceNexusMainLoopBoundaryArgs } from "./resonanceNexusRuntimeBoundaryTypes";
import { renderResonanceNexusBackgroundFrame } from "./resonanceNexusBackgroundFrame";
import { runResonanceNexusDroneAudioFrame } from "./resonanceNexusDroneAudioFrame";
import { runResonanceNexusFieldTrafficFrame } from "./resonanceNexusFieldTrafficFrame";
import { runResonanceNexusOverlayFrame } from "./resonanceNexusOverlayFrame";

export const RESONANCE_NEXUS_FRAME_RUNTIME_CONTRACT = {
  ownsRafLifecycle: true,
  ownsNoAudioNodeCreation: true,
  ownsNoAudioNodeCleanup: true,
  startsLoopSynchronously: true,
  preservesFrameOrder: true,
} as const;

type ResonanceNexusFrameRuntimeArgs = Omit<
  AppResonanceNexusMainLoopBoundaryArgs,
  "room" | "nexusActive" | "audioCtx" | "getLiveMasterBus"
> & {
  readonly audioCtx: AudioContext;
  readonly osc: OscillatorNode;
  readonly filter: BiquadFilterNode;
  readonly gain: GainNode;
};

export type ResonanceNexusFrameRuntime = {
  readonly stop: () => void;
};

export function startResonanceNexusFrameRuntime(args: ResonanceNexusFrameRuntimeArgs): ResonanceNexusFrameRuntime {
  const {
    audioCtx,
    osc,
    filter,
    gain,
    nexusRefs,
    nexusParamsRef,
    applyRealtimeDroneOvertones,
    nexusCanvasRef,
    myceliumDroneModRef,
    myzelEnabled,
    myzelLayerModRef,
    myzelGateRef,
    room3BodyEnabled,
    room3TimbreStateRef,
    droneVolume,
    resonanceFieldStepClockRef,
    installationSharedFieldActive,
    topologyRefs,
    installationFieldConfigRef,
    performanceCrisisRuntimePolicy,
    audioCtxRef,
    playNexusAgentTone,
    gridTempoBpm,
    quantizeGrid,
    particleQuantizeReferenceBars,
    quantizeAnchorRef,
    waveCollisionQueueRef,
    focusCursorRef,
    getVisibleGridLines,
    activeGridLineFreqRef,
    activeGridLineSinceRef,
    previousGridLineFreqRef,
    previousGridLineAtRef,
    keyboardWindowOffsetRef,
  } = args;

  if (nexusRefs.current.agents.length === 0) {
    nexusRefs.current.agents = JI_NODES.map((ji, idx) => ({
      x: GAME_WIDTH * (0.1 + Math.random() * 0.8),
      y: GAME_HEIGHT * (0.1 + Math.random() * 0.8),
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      ratio: ji.ratio,
      label: ji.label,
      phase: Math.random() * Math.PI * 2,
      lastHit: nexusParamsRef.current.agentEnabled[idx] ? 0 : Number.POSITIVE_INFINITY,
      lastHitAudioTimeSec: undefined,
      lastHitGain: 1,
      lastHitX: GAME_WIDTH * 0.5,
      lastHitY: GAME_HEIGHT * 0.5,
      history: [],
    }));
  }

  applyRealtimeDroneOvertones();

  let rafId = 0;
  let t = 0;
  let droneFrameArgs: Parameters<typeof runResonanceNexusDroneAudioFrame>[0] | null = null;
  let fieldTrafficFrameArgs: Parameters<typeof runResonanceNexusFieldTrafficFrame>[0] | null = null;
  let overlayFrameArgs: Parameters<typeof runResonanceNexusOverlayFrame>[0] | null = null;

  const loop = () => {
    t += 0.016;
    const frameNowMs = performance.now();
    const canvas = nexusCanvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;

    const state = nexusRefs.current;
    const p = nexusParamsRef.current;
    if (droneFrameArgs === null) {
      droneFrameArgs = {
        ctx: audioCtx,
        state,
        params: p,
        t,
        osc,
        filter,
        gain,
        myceliumDroneModRef,
        myzelEnabled,
        myzelLayerModRef,
        myzelGateRef,
        room3BodyEnabled,
        room3TimbreStateRef,
        droneVolume,
      };
    } else {
      droneFrameArgs.state = state;
      droneFrameArgs.params = p;
      droneFrameArgs.t = t;
    }
    const targetFreq = runResonanceNexusDroneAudioFrame(droneFrameArgs);

    renderResonanceNexusBackgroundFrame(c, state, t);

    if (fieldTrafficFrameArgs === null) {
      fieldTrafficFrameArgs = {
        ctx: c,
        state,
        params: p,
        frameNowMs,
        t,
        targetFreq,
        fieldClockState: resonanceFieldStepClockRef.current,
        installationSharedFieldActive,
        topologyRefs,
        installationFieldConfigRef,
        performanceCrisisRuntimePolicy,
        audioCtx,
        audioCtxRef,
        playNexusAgentTone,
        gridTempoBpm,
        quantizeGrid,
        particleQuantizeReferenceBars,
        quantizeAnchorRef,
        waveCollisionQueueRef,
      };
    } else {
      fieldTrafficFrameArgs.ctx = c;
      fieldTrafficFrameArgs.state = state;
      fieldTrafficFrameArgs.params = p;
      fieldTrafficFrameArgs.frameNowMs = frameNowMs;
      fieldTrafficFrameArgs.t = t;
      fieldTrafficFrameArgs.targetFreq = targetFreq;
      fieldTrafficFrameArgs.fieldClockState = resonanceFieldStepClockRef.current;
    }
    runResonanceNexusFieldTrafficFrame(fieldTrafficFrameArgs);

    if (overlayFrameArgs === null) {
      overlayFrameArgs = {
        ctx: c,
        state,
        params: p,
        t,
        focusCursorRef,
        getVisibleGridLines,
        activeGridLineFreqRef,
        activeGridLineSinceRef,
        previousGridLineFreqRef,
        previousGridLineAtRef,
        keyboardWindowOffsetRef,
      };
    } else {
      overlayFrameArgs.ctx = c;
      overlayFrameArgs.state = state;
      overlayFrameArgs.params = p;
      overlayFrameArgs.t = t;
    }
    runResonanceNexusOverlayFrame(overlayFrameArgs);

    rafId = requestAnimationFrame(loop);
  };

  loop();

  return {
    stop: () => cancelAnimationFrame(rafId),
  };
}
