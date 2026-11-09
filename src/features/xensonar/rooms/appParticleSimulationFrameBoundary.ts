import {
  advanceResonanceParticleSimulationLane,
  renderResonanceParticleSimulationLane,
  type AdvanceResonanceParticleSimulationLaneArgs,
  type RenderResonanceParticleSimulationLaneArgs,
} from "./resonanceParticleSimulationLane";
import type { AppNexusAgentToneAction } from "../audio/useAppNexusAudioActionSurfaceBoundary";

export const APP_PARTICLE_SIMULATION_FRAME_BOUNDARY_CONTRACT = {
  pureFrameCallsiteBoundary: true,
  noUiChangedByBoundary: true,
  noParticlePolicyRewrite: true,
  noResidentTrafficPolicyOwnedHere: true,
  noWellenstarterOrRootFollowPolicyOwnedHere: true,
  noStableLanePolicyOwnedHere: true,
} as const;

export type AppParticleSimulationFrameBoundaryArgs = {
  ctx: RenderResonanceParticleSimulationLaneArgs["ctx"];
  state: AdvanceResonanceParticleSimulationLaneArgs["state"];
  params: AdvanceResonanceParticleSimulationLaneArgs["params"];
  frameNowMs: AdvanceResonanceParticleSimulationLaneArgs["frameNowMs"];
  t: RenderResonanceParticleSimulationLaneArgs["t"];
  particleMotionScale: AdvanceResonanceParticleSimulationLaneArgs["particleMotionScale"];
  waveMotionScale: AdvanceResonanceParticleSimulationLaneArgs["waveMotionScale"];
  baseWaveSpeed: AdvanceResonanceParticleSimulationLaneArgs["baseWaveSpeed"];
  targetFreq: AdvanceResonanceParticleSimulationLaneArgs["targetFreq"];
  installationAttractors: AdvanceResonanceParticleSimulationLaneArgs["installationAttractors"];
  fieldWidth: AdvanceResonanceParticleSimulationLaneArgs["fieldWidth"];
  fieldHeight: AdvanceResonanceParticleSimulationLaneArgs["fieldHeight"];
  audioNowSec: AdvanceResonanceParticleSimulationLaneArgs["audioNowSec"];
  playNexusAgentTone: AppNexusAgentToneAction;
  echoOn: boolean;
  delayNode?: AudioNode | null;
  noUiChangedByBoundary?: true;
  noParticlePolicyRewrite?: true;
  noResidentTrafficPolicyOwnedHere?: true;
  noWellenstarterOrRootFollowPolicyOwnedHere?: true;
  noStableLanePolicyOwnedHere?: true;
};

export function advanceAppParticleSimulationFrameBoundary(args: AppParticleSimulationFrameBoundaryArgs): void {
  advanceResonanceParticleSimulationLane({
    state: args.state,
    params: args.params,
    frameNowMs: args.frameNowMs,
    particleMotionScale: args.particleMotionScale,
    waveMotionScale: args.waveMotionScale,
    baseWaveSpeed: args.baseWaveSpeed,
    targetFreq: args.targetFreq,
    installationAttractors: args.installationAttractors,
    fieldWidth: args.fieldWidth,
    fieldHeight: args.fieldHeight,
    audioNowSec: args.audioNowSec,
    onParticleTone: (tone) => {
      args.playNexusAgentTone(
        tone.playbackFreq,
        tone.volume,
        args.echoOn && args.delayNode ? args.delayNode : undefined,
        undefined,
        undefined,
        tone.position,
        "particle",
        tone.rootFreq,
      );
    },
  });

}

export function renderAppParticleSimulationFrameBoundary(args: AppParticleSimulationFrameBoundaryArgs): void {
  renderResonanceParticleSimulationLane({
    ctx: args.ctx,
    state: args.state,
    params: args.params,
    frameNowMs: args.frameNowMs,
    t: args.t,
  });
}

export function runAppParticleSimulationFrameBoundary(args: AppParticleSimulationFrameBoundaryArgs): void {
  advanceAppParticleSimulationFrameBoundary(args);
  renderAppParticleSimulationFrameBoundary(args);
}
