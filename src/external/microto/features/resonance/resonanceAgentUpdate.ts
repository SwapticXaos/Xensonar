/**
 * Resonance agent/ripple/pulse simulation tick. Pure logic over mutable state; used by useResonanceSimulation.
 * Keeps the simulation hook as orchestration-only and separates policy from the loop. See STRUCTURE-optimization-v1.md.
 *
 * Time scale: frameNow, state.swarmCollapseUntil, and agent.lastHit are all in performance.now() (milliseconds).
 * ResonanceRoom sets swarmCollapseUntil = performance.now() + 760; useQuantizedParticleQueue uses performance.now() < swarmCollapseUntil.
 */
import { clamp } from "../../shared/tuning/grid";
import type { DirectedPulse, NexusAgent, NexusRipple } from "../runtime/types";
import type { NexusAgentToneCueInput } from "./resonanceAgentTones";
import { registerAudibleHitDensity } from "./resonanceAgentHitDensity";
import {
  getCollapseConstellationInfluence,
  getResonanceAgentPersona,
  getSectorConstellationInfluence,
  type ResonanceAgentPersona,
  type ResonanceConstellationInfluence,
} from "./resonanceConstellations";

const SWARM_COLLAPSE_MS = 760;
const CLICK_SCATTER_MIN_RADIUS = 22;
const CLICK_SCATTER_MAX_RADIUS = 118;
const RIPPLE_HIT_TOLERANCE = 6;
const SECTOR_HIT_TOLERANCE = 6;
const MAX_RIPPLE_HITS_PER_FRAME = 3;
const MAX_SECTOR_ONE_SHOT_HITS_PER_FRAME = 2;
const MAX_SECTOR_PERSISTENT_HITS_PER_FRAME = 3;
const SECTOR_RETRIGGER_COOLDOWN_MS = 140;

function applyConstellationInfluence(
  agent: NexusAgent,
  influence: ResonanceConstellationInfluence,
  weight = 1,
): void {
  const dx = influence.targetX - agent.x;
  const dy = influence.targetY - agent.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  agent.vx += (dx / dist) * influence.pull * weight + (-dy / dist) * influence.swirl * weight;
  agent.vy += (dy / dist) * influence.pull * weight + (dx / dist) * influence.swirl * weight;
}

function personaToAutonomy(persona: ResonanceAgentPersona, laneAutonomy: number): number {
  const base =
    persona === "stubborn"
      ? 0.78
      : persona === "playful"
        ? 0.5
        : 0.18;
  return clamp(base + laneAutonomy * 0.22, 0, 1);
}

export type ResonanceAgentUpdateState = {
  cursorX: number;
  cursorY: number;
  agents: NexusAgent[];
  ripples: NexusRipple[];
  sectorPulses: DirectedPulse[];
  wobble: number;
  swarmCollapseUntil: number;
  swarmCollapseX: number;
  swarmCollapseY: number;
  swarmScatterSeed: number;
  delayNode?: DelayNode | null;
  recentAudibleHitWindowStartedAt: number;
  recentAudibleHitCount: number;
  agentMelodicOffsetByIndex: number[];
  agentConstellationOrderByIndex: number[];
  agentPersonaByIndex: ResonanceAgentPersona[];
};

export type ResonanceAgentUpdateParams = {
  particleMute: boolean;
  agentEnabled: boolean[];
  agentVolumes: number[];
  echoOn: boolean;
  clickSoundOnly: boolean;
  swarmWildness: number;
  cursorGravity: number;
  particleVolume: number;
};

export type ResonanceAgentUpdateOpts = {
  gameWidth: number;
  gameHeight: number;
  frameNow: number;
  t: number;
  targetFreq: number;
  playNexusAgentTone: (
    freq: number,
    volume: number,
    targetDestination?: AudioNode,
    cue?: NexusAgentToneCueInput,
  ) => void;
  clampFreq: (f: number, min: number, max: number) => number;
};

export function tickResonanceAgents(
  state: ResonanceAgentUpdateState,
  params: ResonanceAgentUpdateParams,
  opts: ResonanceAgentUpdateOpts,
): void {
  const { gameWidth, gameHeight, frameNow, t, targetFreq, playNexusAgentTone, clampFreq } = opts;
  const p = params;
  const collapseActive = frameNow < state.swarmCollapseUntil;
  const collapseElapsedMs = collapseActive
    ? SWARM_COLLAPSE_MS - Math.max(0, state.swarmCollapseUntil - frameNow)
    : 0;
  const clickGateOpen = !p.clickSoundOnly || collapseActive;
  const wildness = clamp(p.swarmWildness ?? 0.82, 0, 1);
  const cursorGravity = clamp(p.cursorGravity ?? 0.42, 0, 1.4);
  let collapseHitsThisFrame = 0;
  const maxCollapseHitsPerFrame = 3;
  const rippleHitsThisFrame = state.ripples.map(() => 0);
  const sectorHitsThisFrame = state.sectorPulses.map(() => 0);
  const activeConstellationPulse =
    state.sectorPulses.length > 0 ? state.sectorPulses[state.sectorPulses.length - 1] : null;

  state.agents.forEach((agent, aIdx) => {
    agent.phase += 0.02 + wildness * 0.03;
    const laneSeed =
      Math.sin(
        (aIdx + 1) * 78.233 +
          agent.ratio * 17.171 +
          state.swarmScatterSeed * 0.173 +
          agent.phase * 0.19,
      ) * 43758.5453;
    const lane = laneSeed - Math.floor(laneSeed);
    const laneAutonomy = clamp(Math.abs(lane - 0.5) * 2, 0, 1);
    const scatterRadius =
      CLICK_SCATTER_MIN_RADIUS + lane * (CLICK_SCATTER_MAX_RADIUS - CLICK_SCATTER_MIN_RADIUS);
    const drift = 0.1 + wildness * 0.22;
    agent.vx += Math.sin(t * (2.8 + wildness * 2.4) + agent.phase + aIdx * 0.17) * drift;
    agent.vy += Math.cos(t * (3.4 + wildness * 1.9) + agent.phase * 0.9 + aIdx * 0.21) * drift;

    const cdx = state.cursorX - agent.x;
    const cdy = state.cursorY - agent.y;
    const cdist = Math.max(1, Math.hypot(cdx, cdy));
    const distNorm = clamp((cdist - 26) / 240, 0, 1);
    const followPull = (0.12 + wildness * 0.16) * cursorGravity * (0.45 + distNorm * 0.85);
    const followSwirl =
      (aIdx % 2 === 0 ? 1 : -1) *
      (0.06 + wildness * 0.16) *
      (0.65 + (1 - distNorm) * 0.35);
    agent.vx += (cdx / cdist) * followPull + (-cdy / cdist) * followSwirl;
    agent.vy += (cdy / cdist) * followPull + (cdx / cdist) * followSwirl;

    const desiredOrbitRadius = 72 + lane * 104 + wildness * 18;
    const orbitError = clamp((cdist - desiredOrbitRadius) / Math.max(1, desiredOrbitRadius), -1, 1);
    const orbitForce = orbitError * (0.2 + cursorGravity * 0.36);
    agent.vx += (cdx / cdist) * orbitForce;
    agent.vy += (cdy / cdist) * orbitForce;

    const innerRepelRadius = Math.max(40, desiredOrbitRadius * 0.58);
    if (cdist < innerRepelRadius) {
      const repel =
        (1 - cdist / innerRepelRadius) * (0.34 + wildness * 0.28) * cursorGravity;
      agent.vx -= (cdx / cdist) * repel;
      agent.vy -= (cdy / cdist) * repel;
    }

    const collapseInfluence = collapseActive
      ? getCollapseConstellationInfluence({
          agent,
          index: aIdx,
          count: state.agents.length,
          lane,
          centerX: state.swarmCollapseX,
          centerY: state.swarmCollapseY,
          seed: state.swarmScatterSeed,
          elapsedMs: collapseElapsedMs,
          wildness,
          cursorGravity,
          gameWidth,
          gameHeight,
        })
      : null;
    const sectorInfluence = activeConstellationPulse
      ? getSectorConstellationInfluence({
          agent,
          index: aIdx,
          count: state.agents.length,
          lane,
          pulse: activeConstellationPulse,
          wildness,
          cursorGravity,
          gameWidth,
          gameHeight,
        })
      : null;
    if (collapseInfluence) {
      applyConstellationInfluence(agent, collapseInfluence, 0.92);
    }
    if (sectorInfluence) {
      applyConstellationInfluence(
        agent,
        sectorInfluence,
        activeConstellationPulse?.persistent ? 1 : 0.74,
      );
    }
    const activeInfluence = sectorInfluence ?? collapseInfluence;
    const persona = activeInfluence?.persona ?? getResonanceAgentPersona(agent, aIdx);
    const autonomy = personaToAutonomy(persona, laneAutonomy);
    state.agentMelodicOffsetByIndex[aIdx] = activeInfluence?.melodicOffsetSeconds ?? 0;
    state.agentConstellationOrderByIndex[aIdx] = activeInfluence?.order ?? 0;
    state.agentPersonaByIndex[aIdx] = persona;

    if (collapseActive) {
      const kdx = agent.x - state.swarmCollapseX;
      const kdy = agent.y - state.swarmCollapseY;
      const kdist = Math.max(1, Math.hypot(kdx, kdy));
      const collapsePhase = clamp(
        (state.swarmCollapseUntil - frameNow) / SWARM_COLLAPSE_MS,
        0,
        1,
      );
      const outwardBurst = (0.34 + wildness * 0.5) * (0.45 + collapsePhase * 0.75);
      const tangentialScatter = (0.12 + lane * 0.22) * (0.45 + collapsePhase * 0.75);
      const spin = aIdx % 2 === 0 ? 1 : -1;
      agent.vx += (kdx / kdist) * outwardBurst + (-kdy / kdist) * tangentialScatter * spin;
      agent.vy += (kdy / kdist) * outwardBurst + (kdx / kdist) * tangentialScatter * spin;
      if (kdist < CLICK_SCATTER_MIN_RADIUS * 1.12) {
        const centerRepel =
          (1 - kdist / (CLICK_SCATTER_MIN_RADIUS * 1.12)) * (0.95 + wildness * 0.55);
        agent.vx -= (kdx / kdist) * centerRepel;
        agent.vy -= (kdy / kdist) * centerRepel;
      }
      if (kdist > CLICK_SCATTER_MAX_RADIUS) {
        const boundaryPull =
          ((kdist - CLICK_SCATTER_MAX_RADIUS) / CLICK_SCATTER_MAX_RADIUS) * (0.85 + wildness * 0.55);
        agent.vx -= (kdx / kdist) * boundaryPull;
        agent.vy -= (kdy / kdist) * boundaryPull;
      }
    }

    state.ripples.forEach((r, rippleIdx) => {
      if (rippleHitsThisFrame[rippleIdx] >= MAX_RIPPLE_HITS_PER_FRAME) return;
      const rdx = r.x - agent.x;
      const rdy = r.y - agent.y;
      const rdist = Math.hypot(rdx, rdy);
      if (
        Math.abs(rdist - r.radius) < RIPPLE_HIT_TOLERANCE &&
        frameNow - agent.lastHit > 260
      ) {
        const constellationIndex = rippleHitsThisFrame[rippleIdx];
        rippleHitsThisFrame[rippleIdx] += 1;
        if (!r.hitAgents) r.hitAgents = [];
        if (!r.hitAgents.includes(aIdx)) r.hitAgents.push(aIdx);
        r.lastImpactAt = frameNow;
        agent.lastHit = frameNow;
        agent.vx -= (rdx / Math.max(1, rdist)) * 3;
        agent.vy -= (rdy / Math.max(1, rdist)) * 3;
        state.wobble = Math.min(1.0, state.wobble + 0.35);
        if (!p.particleMute && p.agentEnabled[aIdx] && clickGateOpen) {
          const agentVolume = p.particleVolume * (p.agentVolumes[aIdx] ?? 1);
          const soundFreq = clampFreq(targetFreq * agent.ratio, 80, 2400);
          const density = registerAudibleHitDensity(state, frameNow);
          playNexusAgentTone(
            soundFreq,
            agentVolume,
            p.echoOn && state.delayNode ? state.delayNode : undefined,
            {
              source: "ripple",
              density,
              constellationIndex,
              autonomy,
            },
          );
        }
      }
    });

    state.sectorPulses.forEach((pulse, pulseIdx) => {
      const maxSectorHitsThisFrame = pulse.persistent
        ? MAX_SECTOR_PERSISTENT_HITS_PER_FRAME
        : MAX_SECTOR_ONE_SHOT_HITS_PER_FRAME;
      if (sectorHitsThisFrame[pulseIdx] >= maxSectorHitsThisFrame) return;
      if (pulse.hitAgents.includes(aIdx)) return;
      const dx = agent.x - pulse.x;
      const dy = agent.y - pulse.y;
      const dist = Math.hypot(dx, dy);
      if (Math.abs(dist - pulse.radius) > SECTOR_HIT_TOLERANCE) return;
      const centerAngle =
        pulse.direction === "right"
          ? 0
          : pulse.direction === "up"
            ? -Math.PI / 2
            : pulse.direction === "left"
              ? Math.PI
              : Math.PI / 2;
      const halfSector = Math.PI / 4;
      const angle = Math.atan2(dy, dx);
      let delta = angle - centerAngle;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      if (Math.abs(delta) > halfSector) return;
      if (frameNow - agent.lastHit <= SECTOR_RETRIGGER_COOLDOWN_MS) return;
      const constellationIndex = sectorHitsThisFrame[pulseIdx];
      sectorHitsThisFrame[pulseIdx] += 1;
      pulse.hitAgents.push(aIdx);
      pulse.lastImpactAt = frameNow;
      agent.lastHit = frameNow;
      agent.vx += (dx / Math.max(1, dist)) * 3;
      agent.vy += (dy / Math.max(1, dist)) * 3;
      state.wobble = Math.min(1.0, state.wobble + 0.35);
      if (!p.particleMute && p.agentEnabled[aIdx] && clickGateOpen) {
        const agentVolume = p.particleVolume * (p.agentVolumes[aIdx] ?? 1);
        const hitFreq = clampFreq(targetFreq * agent.ratio, 80, 2400);
        const density = registerAudibleHitDensity(state, frameNow);
        playNexusAgentTone(
          hitFreq,
          agentVolume,
          p.echoOn && state.delayNode ? state.delayNode : undefined,
          {
            source: "sector",
            direction: pulse.direction,
            persistent: !!pulse.persistent,
            density,
            constellationIndex,
            autonomy,
          },
        );
      }
    });

    if (collapseActive) {
      const mdx = agent.x - state.swarmCollapseX;
      const mdy = agent.y - state.swarmCollapseY;
      const mdist = Math.hypot(mdx, mdy);
      const slotDelayMs = 14 + lane * 220;
      const hitRadius = collapseInfluence?.hitRadius ?? scatterRadius;
      const ringTolerance = 7 + wildness * 3.2;
      const collapseCooldown = 170 + lane * 120;
      if (
        collapseElapsedMs >= slotDelayMs &&
        Math.abs(mdist - hitRadius) <= ringTolerance &&
        frameNow - agent.lastHit > collapseCooldown &&
        collapseHitsThisFrame < maxCollapseHitsPerFrame
      ) {
        const constellationIndex = collapseHitsThisFrame;
        collapseHitsThisFrame += 1;
        agent.lastHit = frameNow;
        state.wobble = Math.min(1.0, state.wobble + 0.25);
        const tangentKick = (lane < 0.5 ? -1 : 1) * (0.6 + lane * 1.2);
        agent.vx += (-mdy / Math.max(1, mdist)) * tangentKick;
        agent.vy += (mdx / Math.max(1, mdist)) * tangentKick;
        if (!p.particleMute && p.agentEnabled[aIdx] && clickGateOpen) {
          const agentVolume = p.particleVolume * (p.agentVolumes[aIdx] ?? 1);
          const mergeFreq = clampFreq(targetFreq * agent.ratio, 80, 2400);
          const density = registerAudibleHitDensity(state, frameNow);
          playNexusAgentTone(
            mergeFreq,
            agentVolume,
            p.echoOn && state.delayNode ? state.delayNode : undefined,
            {
              source: "collapse",
              density,
              constellationIndex,
              autonomy,
            },
          );
        }
      }
    }

    const maxSpeed = collapseActive ? 8 : 4.5 + wildness * 1.4;
    const speed = Math.hypot(agent.vx, agent.vy);
    if (speed > maxSpeed) {
      agent.vx = (agent.vx / speed) * maxSpeed;
      agent.vy = (agent.vy / speed) * maxSpeed;
    }
    const damping = collapseActive ? 0.93 : 0.955;
    agent.vx *= damping;
    agent.vy *= damping;
    agent.x += agent.vx;
    agent.y += agent.vy;
    if (agent.x < 50) agent.vx += 0.1;
    if (agent.x > gameWidth - 50) agent.vx -= 0.1;
    if (agent.y < 50) agent.vy += 0.1;
    if (agent.y > gameHeight - 50) agent.vy -= 0.1;
    agent.history.push({ x: agent.x, y: agent.y });
    if (agent.history.length > 25) agent.history.shift();
  });
}
