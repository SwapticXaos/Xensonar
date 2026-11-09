import { clamp } from "../../shared/tuning/grid";
import type { DirectedPulse, NexusAgent } from "../runtime/types";

export type ResonanceAgentPersona = "helpful" | "playful" | "stubborn";

export type ResonancePersonaCueProfile = {
  cutoffShift: number;
  durationMul: number;
  volumeMul: number;
};

export type ResonanceConstellationInfluence = {
  order: number;
  persona: ResonanceAgentPersona;
  targetX: number;
  targetY: number;
  pull: number;
  swirl: number;
  hitRadius: number;
  melodicOffsetSeconds: number;
};

type CollapseConstellationKind = "orbit" | "fan" | "braid" | "ladder";

type CollapseConstellationArgs = {
  agent: NexusAgent;
  index: number;
  count: number;
  lane: number;
  centerX: number;
  centerY: number;
  seed: number;
  elapsedMs: number;
  wildness: number;
  cursorGravity: number;
  gameWidth: number;
  gameHeight: number;
};

type SectorConstellationArgs = {
  agent: NexusAgent;
  index: number;
  count: number;
  lane: number;
  pulse: DirectedPulse;
  wildness: number;
  cursorGravity: number;
  gameWidth: number;
  gameHeight: number;
};

function fract(value: number): number {
  return value - Math.floor(value);
}

function hash(value: number): number {
  return fract(Math.sin(value) * 43758.5453123);
}

function clampTargetX(x: number, gameWidth: number): number {
  return clamp(x, 44, gameWidth - 44);
}

function clampTargetY(y: number, gameHeight: number): number {
  return clamp(y, 44, gameHeight - 44);
}

function getConstellationOrder(lane: number, count: number, shift: number): number {
  const safeCount = Math.max(1, count);
  const normalized = fract(lane + shift);
  return Math.min(safeCount - 1, Math.floor(normalized * safeCount));
}

function getPersonaTraits(persona: ResonanceAgentPersona) {
  if (persona === "helpful") {
    return {
      pullMul: 1.16,
      swirlMul: 0.82,
      lagSeconds: 0.004,
    };
  }
  if (persona === "playful") {
    return {
      pullMul: 1,
      swirlMul: 1.18,
      lagSeconds: 0.012,
    };
  }
  return {
    pullMul: 0.84,
    swirlMul: 1.08,
    lagSeconds: 0.026,
  };
}

export function getResonancePersonaCueProfile(
  persona: ResonanceAgentPersona = "helpful",
): ResonancePersonaCueProfile {
  if (persona === "helpful") {
    return {
      cutoffShift: 120,
      durationMul: 0.94,
      volumeMul: 1.04,
    };
  }
  if (persona === "playful") {
    return {
      cutoffShift: 36,
      durationMul: 0.98,
      volumeMul: 1,
    };
  }
  return {
    cutoffShift: -140,
    durationMul: 1.08,
    volumeMul: 0.96,
  };
}

export function getResonanceAgentPersona(
  agent: NexusAgent,
  index: number,
): ResonanceAgentPersona {
  const seed =
    hash((index + 1) * 12.9898 + agent.ratio * 78.233 + agent.label.length * 0.91);
  if (seed < 0.34) return "helpful";
  if (seed < 0.67) return "playful";
  return "stubborn";
}

export function getConstellationMelodicOffsetSeconds(
  order: number,
  count: number,
  persona: ResonanceAgentPersona,
  maxSeconds: number,
): number {
  const safeCount = Math.max(1, count);
  const orderNorm = safeCount <= 1 ? 0 : order / (safeCount - 1);
  const traits = getPersonaTraits(persona);
  const playfulSwing =
    persona === "playful" ? (order % 2 === 0 ? 0.01 : 0.022) : 0;
  return clamp(
    traits.lagSeconds + orderNorm * maxSeconds * 0.78 + playfulSwing,
    0,
    maxSeconds,
  );
}

function getCollapseConstellationKind(seed: number): CollapseConstellationKind {
  const kinds: CollapseConstellationKind[] = ["orbit", "fan", "braid", "ladder"];
  const kindIndex = Math.min(
    kinds.length - 1,
    Math.floor(hash(seed * 0.031 + 2.17) * kinds.length),
  );
  return kinds[kindIndex];
}

function directionToAngle(direction: DirectedPulse["direction"]): number {
  return direction === "right"
    ? 0
    : direction === "up"
      ? -Math.PI / 2
      : direction === "left"
        ? Math.PI
        : Math.PI / 2;
}

export function getCollapseConstellationInfluence({
  agent,
  index,
  count,
  lane,
  centerX,
  centerY,
  seed,
  elapsedMs,
  wildness,
  cursorGravity,
  gameWidth,
  gameHeight,
}: CollapseConstellationArgs): ResonanceConstellationInfluence {
  const persona = getResonanceAgentPersona(agent, index);
  const traits = getPersonaTraits(persona);
  const kind = getCollapseConstellationKind(seed);
  const order = getConstellationOrder(lane, count, hash(seed * 0.0071 + 0.13));
  const safeCount = Math.max(1, count);
  const orderNorm = safeCount <= 1 ? 0 : order / (safeCount - 1);
  const centered = orderNorm * 2 - 1;
  const baseAngle = hash(seed * 0.013 + lane * 7.7) * Math.PI * 2;
  let targetX = centerX;
  let targetY = centerY;
  let hitRadius = 56;

  if (kind === "orbit") {
    const angle = baseAngle + centered * Math.PI * 1.35 + elapsedMs * 0.0021;
    const radius = 46 + orderNorm * (88 + wildness * 22);
    targetX = centerX + Math.cos(angle) * radius;
    targetY = centerY + Math.sin(angle) * radius * 0.72;
    hitRadius = radius;
  } else if (kind === "fan") {
    const angle = baseAngle + centered * (0.72 + wildness * 0.46);
    const radius = 54 + orderNorm * (96 + cursorGravity * 18);
    targetX = centerX + Math.cos(angle) * radius;
    targetY = centerY + Math.sin(angle) * radius;
    hitRadius = radius * 0.92;
  } else if (kind === "braid") {
    const sway = Math.sin(elapsedMs * 0.006 + orderNorm * Math.PI * 3.2);
    const forward = centered * (138 + wildness * 30);
    targetX = centerX + forward;
    targetY = centerY + sway * (42 + cursorGravity * 18) + (order % 2 === 0 ? -18 : 18);
    hitRadius = 40 + orderNorm * 54;
  } else {
    const rungSide = order % 2 === 0 ? -1 : 1;
    const forward = centered * (136 + wildness * 26);
    targetX = centerX + rungSide * (36 + Math.abs(centered) * 28);
    targetY = centerY + forward;
    hitRadius = 44 + orderNorm * 58;
  }

  return {
    order,
    persona,
    targetX: clampTargetX(targetX, gameWidth),
    targetY: clampTargetY(targetY, gameHeight),
    pull: (0.09 + cursorGravity * 0.18 + wildness * 0.07) * traits.pullMul,
    swirl: (0.03 + wildness * 0.11) * traits.swirlMul,
    hitRadius: clamp(hitRadius, 36, 148),
    melodicOffsetSeconds: getConstellationMelodicOffsetSeconds(order, count, persona, 0.11),
  };
}

export function getSectorConstellationInfluence({
  agent,
  index,
  count,
  lane,
  pulse,
  wildness,
  cursorGravity,
  gameWidth,
  gameHeight,
}: SectorConstellationArgs): ResonanceConstellationInfluence {
  const persona = getResonanceAgentPersona(agent, index);
  const traits = getPersonaTraits(persona);
  const orderShift =
    pulse.direction === "right"
      ? 0.08
      : pulse.direction === "up"
        ? 0.26
        : pulse.direction === "left"
          ? 0.52
          : 0.74;
  const order = getConstellationOrder(lane, count, orderShift);
  const safeCount = Math.max(1, count);
  const orderNorm = safeCount <= 1 ? 0 : order / (safeCount - 1);
  const centered = orderNorm * 2 - 1;
  const directionAngle = directionToAngle(pulse.direction);
  const normalAngle = directionAngle + Math.PI / 2;
  const frontRadius = Math.max(38, pulse.radius * (pulse.persistent ? 0.84 : 0.76) + 28);
  const lateral = centered * (48 + wildness * 22);
  const targetX =
    pulse.x +
    Math.cos(directionAngle) * frontRadius +
    Math.cos(normalAngle) * lateral;
  const targetY =
    pulse.y +
    Math.sin(directionAngle) * frontRadius +
    Math.sin(normalAngle) * lateral;

  return {
    order,
    persona,
    targetX: clampTargetX(targetX, gameWidth),
    targetY: clampTargetY(targetY, gameHeight),
    pull:
      ((pulse.persistent ? 0.18 : 0.13) + cursorGravity * 0.16 + wildness * 0.05) *
      traits.pullMul,
    swirl: (pulse.persistent ? 0.04 : 0.06) * traits.swirlMul,
    hitRadius: clamp(frontRadius + Math.abs(centered) * 22, 44, 160),
    melodicOffsetSeconds: getConstellationMelodicOffsetSeconds(
      order,
      count,
      persona,
      pulse.persistent ? 0.08 : 0.06,
    ),
  };
}
