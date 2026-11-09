import type { MutableRefObject } from "react";
import { getAudioNowSec } from "../../../core/time/unifiedTime";
import { buildInstallationAttractors } from "../../topology/installationAttractors";
import { runAppResidentTrafficBridgeFrameBoundary, type AppResidentTrafficBridgeFrameBoundaryArgs } from "../audio/appResidentTrafficBridgeFrameBoundary";
import type { AppNexusAgentToneAction } from "../audio/useAppNexusAudioActionSurfaceBoundary";
import { GAME_HEIGHT, GAME_WIDTH, TOPO_HEIGHT, TOPO_WIDTH, type QuantizeGrid } from "../domain/instrumentData";
import type { PerformanceCrisisRuntimePolicy } from "../performanceCrisis/performanceCrisisRuntimePolicies";
import type { Room3TopologyStateRefs } from "../room3/room3TopologyUiStateTypes";
import { advanceAppParticleSimulationFrameBoundary, renderAppParticleSimulationFrameBoundary } from "./appParticleSimulationFrameBoundary";
import type { AppNexusParams } from "./nexusParamsInitialState";
import { createResonanceNexusFieldFrameKernel } from "./resonanceNexusFieldFrame";
import { BASE_WAVE_SPEED } from "./resonanceRuntimeMath";
import type { ResonanceNexusRuntimeRefs } from "./resonanceNexusRuntimeRefs";
import type { ResonanceFieldStepClockState } from "./resonanceFieldStepClock";

export const RESONANCE_NEXUS_FIELD_TRAFFIC_FRAME_CONTRACT = {
  preservesWaveParticleStepInterleave: true,
  preservesWaveRenderBeforeParticleRender: true,
  preservesResidentTrafficAfterParticleRender: true,
  ownsNoRafLifecycle: true,
  ownsNoReactLifecycle: true,
} as const;

export type ResonanceNexusFieldTrafficFrameArgs = {
  ctx: CanvasRenderingContext2D;
  state: ResonanceNexusRuntimeRefs;
  params: AppNexusParams;
  frameNowMs: number;
  t: number;
  targetFreq: number;
  fieldClockState: ResonanceFieldStepClockState;
  readonly installationSharedFieldActive: boolean;
  readonly topologyRefs: Room3TopologyStateRefs["topologyRefs"];
  readonly installationFieldConfigRef: Room3TopologyStateRefs["installationFieldConfigRef"];
  readonly performanceCrisisRuntimePolicy: PerformanceCrisisRuntimePolicy;
  readonly audioCtx: AudioContext;
  readonly audioCtxRef: MutableRefObject<AudioContext | null>;
  readonly playNexusAgentTone: AppNexusAgentToneAction;
  readonly gridTempoBpm: number;
  readonly quantizeGrid: QuantizeGrid;
  readonly particleQuantizeReferenceBars: number;
  readonly quantizeAnchorRef: AppResidentTrafficBridgeFrameBoundaryArgs["quantizeAnchorRef"];
  readonly waveCollisionQueueRef: AppResidentTrafficBridgeFrameBoundaryArgs["waveCollisionQueueRef"];
};

export function runResonanceNexusFieldTrafficFrame(args: ResonanceNexusFieldTrafficFrameArgs): void {
  const {
    ctx: c, state, params: p, frameNowMs, t, targetFreq, fieldClockState,
    installationSharedFieldActive, topologyRefs, installationFieldConfigRef, performanceCrisisRuntimePolicy,
    audioCtx, audioCtxRef, playNexusAgentTone, gridTempoBpm, quantizeGrid, particleQuantizeReferenceBars,
    quantizeAnchorRef, waveCollisionQueueRef,
  } = args;

  const { fieldStepFrame, fieldSteps, advanceFieldWaveStep, renderFieldWaves } = createResonanceNexusFieldFrameKernel({
    ctx: c,
    state,
    clockState: fieldClockState,
    frameNowMs,
  });

  const installationOscillatorBall = installationSharedFieldActive
    ? {
        x: (topologyRefs.current.cursor.x / TOPO_WIDTH) * GAME_WIDTH,
        y: (topologyRefs.current.cursor.y / TOPO_HEIGHT) * GAME_HEIGHT,
      }
    : null;

  const installationAttractors = buildInstallationAttractors({
    active: installationSharedFieldActive && installationFieldConfigRef.current.residentsEnabled,
    config: installationFieldConfigRef.current,
    cursor: { x: state.cursorX, y: state.cursorY },
    oscillatorBall: installationOscillatorBall,
  });

  for (const fieldStep of fieldSteps) {
    advanceFieldWaveStep(fieldStep.motionScale);
    advanceAppParticleSimulationFrameBoundary({
      ctx: c,
      state,
      params: {
        particleSystem: p.particleSystem,
        particleVolume: p.particleVolume,
        agentVolumes: p.agentVolumes,
        agentEnabled: p.agentEnabled,
        quantizeOn: p.quantizeOn,
        particleMute: p.particleMute,
        echoOn: p.echoOn,
        performancePolicy: performanceCrisisRuntimePolicy.particles,
      },
      frameNowMs: fieldStep.nowMs,
      t,
      particleMotionScale: fieldStep.motionScale,
      waveMotionScale: fieldStep.motionScale,
      baseWaveSpeed: BASE_WAVE_SPEED,
      targetFreq,
      installationAttractors,
      fieldWidth: GAME_WIDTH,
      fieldHeight: GAME_HEIGHT,
      audioNowSec: () => getAudioNowSec(audioCtxRef.current ?? audioCtx),
      playNexusAgentTone,
      echoOn: p.echoOn,
      delayNode: state.delayNode,
      noUiChangedByBoundary: true,
      noParticlePolicyRewrite: true,
      noResidentTrafficPolicyOwnedHere: true,
      noWellenstarterOrRootFollowPolicyOwnedHere: true,
      noStableLanePolicyOwnedHere: true,
    });
  }

  renderFieldWaves();
  renderAppParticleSimulationFrameBoundary({
    ctx: c,
    state,
    params: {
      particleSystem: p.particleSystem,
      particleVolume: p.particleVolume,
      agentVolumes: p.agentVolumes,
      agentEnabled: p.agentEnabled,
      quantizeOn: p.quantizeOn,
      particleMute: p.particleMute,
      echoOn: p.echoOn,
      performancePolicy: performanceCrisisRuntimePolicy.particles,
    },
    frameNowMs,
    t,
    particleMotionScale: fieldStepFrame.motionScale,
    waveMotionScale: fieldStepFrame.motionScale,
    baseWaveSpeed: BASE_WAVE_SPEED,
    targetFreq,
    installationAttractors,
    fieldWidth: GAME_WIDTH,
    fieldHeight: GAME_HEIGHT,
    audioNowSec: () => getAudioNowSec(audioCtxRef.current ?? audioCtx),
    playNexusAgentTone,
    echoOn: p.echoOn,
    delayNode: state.delayNode,
    noUiChangedByBoundary: true,
    noParticlePolicyRewrite: true,
    noResidentTrafficPolicyOwnedHere: true,
    noWellenstarterOrRootFollowPolicyOwnedHere: true,
    noStableLanePolicyOwnedHere: true,
  });

  runAppResidentTrafficBridgeFrameBoundary({
    active: installationSharedFieldActive && installationFieldConfigRef.current.residentsEnabled,
    config: installationFieldConfigRef.current,
    nodes: topologyRefs.current.nodes,
    oscillatorBall: installationOscillatorBall,
    sourceWidth: TOPO_WIDTH,
    sourceHeight: TOPO_HEIGHT,
    targetWidth: GAME_WIDTH,
    targetHeight: GAME_HEIGHT,
    ripples: state.ripples,
    sectorPulses: state.sectorPulses,
    nowMs: frameNowMs,
    targetFreq,
    quantizeOn: p.quantizeOn,
    audioCtx: audioCtxRef.current ?? audioCtx,
    gridTempoBpm,
    quantizeGrid,
    quantizeReferenceBars: particleQuantizeReferenceBars,
    quantizeAnchorRef,
    waveCollisionQueueRef,
    echoOn: p.echoOn,
    delayNode: state.delayNode,
    playNexusAgentTone,
    noUiChangedByBoundary: true,
    noFrameOrderMoved: true,
    noQuantizeAnchorRewrite: true,
    noQueuePolicyRewrite: true,
    noDirectVsQueuedBranchCollapse: true,
    noResidentSoundNormalization: true,
    noWellenstarterOrRootFollowPolicyOwnedHere: true,
    noStableLanePolicyOwnedHere: true,
  });
}
