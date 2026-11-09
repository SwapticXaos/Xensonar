import type { AgentImpactRipple, DirectedPulse, NexusAgent, NexusRipple } from "../domain/runtimeTypes";
import type { ParticleSystem } from "../domain/instrumentData";
import type { WeightedPoint } from "../../topology/installationAttractors";
import { crossedExpandingShell, crossingT, getPulseCenterAngle, normalizeAngleDelta } from "../../topology/waveCollisionGeometry";
import { getImpactRippleHue, waveIntensityScalar } from "./resonanceRuntimeMath";
import {
  commitParticleAudioIntent,
  selectParticleAudioIntentCandidates,
  type ParticleAudioIntentCandidate,
  type ParticleToneIntent,
  type ParticleAudioIntentRuntimeParams,
} from "./particleAudioIntentShaper";
import { resolveParticleAmbientMotionTarget, resolveParticleCrisisPressure, stepParticleAmbientMotionScale } from "../performanceCrisis/particleCrisisAgencyPolicy";

export type ResonanceParticleRuntimeParams = ParticleAudioIntentRuntimeParams & {
  particleSystem: ParticleSystem;
  echoOn: boolean;
};

export type ResonanceParticleFieldState = {
  wobble: number;
  ripples: NexusRipple[];
  sectorPulses: DirectedPulse[];
  impactRipples: AgentImpactRipple[];
  agents: NexusAgent[];
  ambientCrisisMotionScale?: number;
  ambientCrisisMotionLastFrameMs?: number;
};

export type AdvanceResonanceParticleSimulationLaneArgs = {
  state: ResonanceParticleFieldState;
  params: ResonanceParticleRuntimeParams;
  frameNowMs: number;
  particleMotionScale: number;
  waveMotionScale: number;
  baseWaveSpeed: number;
  targetFreq: number;
  installationAttractors: WeightedPoint[];
  fieldWidth: number;
  fieldHeight: number;
  audioNowSec: () => number;
  onParticleTone: (tone: ParticleToneIntent) => void;
};

export type RenderResonanceParticleSimulationLaneArgs = {
  ctx: CanvasRenderingContext2D;
  state: ResonanceParticleFieldState;
  params: ResonanceParticleRuntimeParams;
  frameNowMs: number;
  t: number;
};

export const RESONANCE_PARTICLE_SIMULATION_LANE_CONTRACT = {
  maxImpactRipples: 260,
  maxAgentSpeed: 2.5,
  hitCooldownMs: 400,
  shellThicknessPx: 8,
  impactRippleMaxRadius: 64,
  impactRippleMinLife: 0.02,
  impactRippleRadiusStep: 1.85,
  impactRippleLifeStep: 0.046,
  historyLimit: 25,
  edgeMarginPx: 50,
  edgePush: 0.1,
  randomDrift: 0.15,
  attractorRadiusPx: 250,
  attractorStrength: 0.04,
} as const;

function spawnAgentImpactRipple(args: {
  state: ResonanceParticleFieldState;
  params: ResonanceParticleRuntimeParams;
  agentIndex: number;
  x: number;
  y: number;
}) {
  const hue = getImpactRippleHue(args.params.particleSystem, args.agentIndex, args.state.agents.length);
  args.state.impactRipples.push({ x: args.x, y: args.y, radius: 2, life: 1, hue });
  const overflow = args.state.impactRipples.length - RESONANCE_PARTICLE_SIMULATION_LANE_CONTRACT.maxImpactRipples;
  if (overflow > 0) args.state.impactRipples.splice(0, overflow);
}

export function advanceResonanceParticleSimulationLane(args: AdvanceResonanceParticleSimulationLaneArgs): void {
  const {
    state,
    params,
    frameNowMs,
    particleMotionScale,
    waveMotionScale,
    baseWaveSpeed,
    targetFreq,
    installationAttractors,
    fieldWidth,
    fieldHeight,
    audioNowSec,
    onParticleTone,
  } = args;
  const contract = RESONANCE_PARTICLE_SIMULATION_LANE_CONTRACT;
  const shellPrevFallback = baseWaveSpeed * waveMotionScale;
  const audioIntentCandidates: ParticleAudioIntentCandidate[] = [];
  const particlePressure = resolveParticleCrisisPressure({
    activeWaveCount: state.ripples.length + state.sectorPulses.length,
    activeAgentCount: state.agents.length,
  });
  const ambientMotionTarget = resolveParticleAmbientMotionTarget(params.performancePolicy?.ambientMotion, particlePressure);
  const ambientElapsedMs = Math.max(0, frameNowMs - (state.ambientCrisisMotionLastFrameMs ?? frameNowMs));
  state.ambientCrisisMotionScale = stepParticleAmbientMotionScale({
    currentScale: state.ambientCrisisMotionScale,
    targetScale: ambientMotionTarget,
    elapsedMs: ambientElapsedMs,
    policy: params.performancePolicy?.ambientMotion,
  });
  state.ambientCrisisMotionLastFrameMs = frameNowMs;
  const ambientMotionScale = state.ambientCrisisMotionScale ?? 1;
  const ambientInputScale = particleMotionScale * ambientMotionScale;

  state.impactRipples = state.impactRipples.filter((ripple) => ripple.life > contract.impactRippleMinLife && ripple.radius < contract.impactRippleMaxRadius);
  for (let i = 0; i < state.impactRipples.length; i += 1) {
    const ripple = state.impactRipples[i];
    ripple.radius += contract.impactRippleRadiusStep * particleMotionScale;
    ripple.life -= contract.impactRippleLifeStep * particleMotionScale;
  }

  for (let aIdx = 0; aIdx < state.agents.length; aIdx += 1) {
    const agent = state.agents[aIdx];
    agent.vx += (Math.random() - 0.5) * contract.randomDrift * ambientInputScale;
    agent.vy += (Math.random() - 0.5) * contract.randomDrift * ambientInputScale;

    for (let i = 0; i < installationAttractors.length; i += 1) {
      const attractor = installationAttractors[i];
      const cdx = attractor.x - agent.x;
      const cdy = attractor.y - agent.y;
      const cdist = Math.max(1, Math.hypot(cdx, cdy));
      if (cdist < contract.attractorRadiusPx) {
        const scalar = contract.attractorStrength * attractor.weight * ambientInputScale;
        agent.vx += (cdx / cdist) * scalar;
        agent.vy += (cdy / cdist) * scalar;
      }
    }

    for (let i = 0; i < state.ripples.length; i += 1) {
      const r = state.ripples[i];
      const rdx = r.x - agent.x;
      const rdy = r.y - agent.y;
      const rdist = Math.hypot(rdx, rdy);
      const prevRadius = r.prevRadius ?? Math.max(0, r.radius - shellPrevFallback);
      if (!crossedExpandingShell(rdist, prevRadius, r.radius, contract.shellThicknessPx) || frameNowMs - agent.lastHit <= contract.hitCooldownMs) continue;

      const hitT = crossingT(rdist, prevRadius, r.radius);
      agent.lastHit = frameNowMs;
      agent.lastHitAudioTimeSec = audioNowSec();
      spawnAgentImpactRipple({ state, params, agentIndex: aIdx, x: agent.x, y: agent.y });
      const waveProgress = r.maxRadius > 0 ? ((prevRadius + (r.radius - prevRadius) * hitT) / r.maxRadius) : 0;
      const waveGain = waveIntensityScalar(waveProgress, r.decay);
      agent.lastHitGain = waveGain;
      agent.lastHitX = agent.x;
      agent.lastHitY = agent.y;

      agent.vx -= (rdx / Math.max(1, rdist)) * 3;
      agent.vy -= (rdy / Math.max(1, rdist)) * 3;
      state.wobble = Math.min(1.0, state.wobble + 0.35);

      audioIntentCandidates.push({
        agent,
        agentIndex: aIdx,
        frameNowMs,
        audioTimeSec: agent.lastHitAudioTimeSec ?? audioNowSec(),
        waveGain,
        x: agent.x,
        y: agent.y,
        targetFreq,
        sourceKind: "ripple",
      });
    }

    for (let i = 0; i < state.sectorPulses.length; i += 1) {
      const pulse = state.sectorPulses[i];
      if (pulse.hitAgents.includes(aIdx)) continue;

      const dx = agent.x - pulse.x;
      const dy = agent.y - pulse.y;
      const dist = Math.hypot(dx, dy);
      const prevRadius = pulse.prevRadius ?? Math.max(0, pulse.radius - shellPrevFallback);
      if (!crossedExpandingShell(dist, prevRadius, pulse.radius, contract.shellThicknessPx)) continue;

      const centerAngle = getPulseCenterAngle(pulse.direction);
      const halfSector = Math.PI / 4;
      const angle = Math.atan2(dy, dx);
      const delta = normalizeAngleDelta(angle, centerAngle);
      if (Math.abs(delta) > halfSector) continue;

      const hitT = crossingT(dist, prevRadius, pulse.radius);
      pulse.hitAgents.push(aIdx);
      agent.lastHit = frameNowMs;
      agent.lastHitAudioTimeSec = audioNowSec();
      spawnAgentImpactRipple({ state, params, agentIndex: aIdx, x: agent.x, y: agent.y });
      const waveProgress = pulse.maxRadius > 0 ? ((prevRadius + (pulse.radius - prevRadius) * hitT) / pulse.maxRadius) : 0;
      const waveGain = waveIntensityScalar(waveProgress, pulse.decay);
      agent.lastHitGain = waveGain;
      agent.lastHitX = agent.x;
      agent.lastHitY = agent.y;

      agent.vx += (dx / Math.max(1, dist)) * 3;
      agent.vy += (dy / Math.max(1, dist)) * 3;
      state.wobble = Math.min(1.0, state.wobble + 0.35);

      audioIntentCandidates.push({
        agent,
        agentIndex: aIdx,
        frameNowMs,
        audioTimeSec: agent.lastHitAudioTimeSec ?? audioNowSec(),
        waveGain,
        x: agent.x,
        y: agent.y,
        targetFreq,
        sourceKind: "sector",
      });
    }

    const speed = Math.hypot(agent.vx, agent.vy);
    if (speed > contract.maxAgentSpeed) {
      agent.vx = (agent.vx / speed) * contract.maxAgentSpeed;
      agent.vy = (agent.vy / speed) * contract.maxAgentSpeed;
    }

    const recentImpactWindowMs = params.performancePolicy?.ambientMotion.impactPreserveWindowMs ?? 180;
    const recentImpactMotion = frameNowMs - agent.lastHit <= recentImpactWindowMs;
    const coordinateMotionScale = particleMotionScale * (recentImpactMotion ? 1 : ambientMotionScale);
    agent.x += agent.vx * coordinateMotionScale;
    agent.y += agent.vy * coordinateMotionScale;

    if (agent.x < contract.edgeMarginPx) agent.vx += contract.edgePush * ambientInputScale;
    if (agent.x > fieldWidth - contract.edgeMarginPx) agent.vx -= contract.edgePush * ambientInputScale;
    if (agent.y < contract.edgeMarginPx) agent.vy += contract.edgePush * ambientInputScale;
    if (agent.y > fieldHeight - contract.edgeMarginPx) agent.vy -= contract.edgePush * ambientInputScale;

    agent.history.push({ x: agent.x, y: agent.y });
    if (agent.history.length > contract.historyLimit) agent.history.shift();
  }

  const selectedAudioIntents = selectParticleAudioIntentCandidates({ candidates: audioIntentCandidates, params });
  for (const candidate of selectedAudioIntents) {
    commitParticleAudioIntent({ candidate, params, onParticleTone });
  }
}

export function renderResonanceParticleSimulationLane(args: RenderResonanceParticleSimulationLaneArgs): void {
  const { ctx, state, params, frameNowMs, t } = args;

  for (let i = 0; i < state.impactRipples.length; i += 1) {
    const ripple = state.impactRipples[i];
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    ctx.strokeStyle = ripple.hue === null
      ? `rgba(255, 255, 255, ${Math.max(0, ripple.life * 0.9)})`
      : `hsla(${ripple.hue}, 92%, 64%, ${Math.max(0, ripple.life * 0.86)})`;
    ctx.lineWidth = 1.15;
    ctx.stroke();
  }

  for (let aIdx = 0; aIdx < state.agents.length; aIdx += 1) {
    const agent = state.agents[aIdx];
    const agentHue = getImpactRippleHue(params.particleSystem, aIdx, state.agents.length) ?? 220;

    if (agent.history.length > 1) {
      ctx.beginPath();
      ctx.moveTo(agent.history[0].x, agent.history[0].y);
      for (let i = 1; i < agent.history.length; i += 1) ctx.lineTo(agent.history[i].x, agent.history[i].y);
      ctx.strokeStyle = `hsla(${agentHue}, 88%, 68%, ${0.13 + Math.sin(t * 2 + agent.phase) * 0.1})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    const hitGlow = Math.max(0, 1 - (frameNowMs - agent.lastHit) * 0.002);
    ctx.fillStyle = `hsla(${agentHue}, 90%, ${72 + hitGlow * 10}%, ${0.38 + hitGlow * 0.58})`;
    ctx.beginPath();
    ctx.arc(agent.x, agent.y, 4 + hitGlow * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `hsla(${agentHue}, 98%, ${82 + hitGlow * 8}%, ${0.34 + hitGlow * 0.66})`;
    ctx.font = "10px monospace";
    ctx.fillText(agent.label, agent.x + 8, agent.y + 4);
  }
}
