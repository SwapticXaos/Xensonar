/**
 * Pure commons-field simulation: wisp, agents, bolts, pulses, groove.
 * Mutates sim state; calls onHit for audio events. No RAF or audio ownership.
 * Aligns with arenaCommonsField pattern (STRUCTURE optimization).
 */

import { clamp } from "../../shared/tuning/grid";

const JI_RATIOS = [1, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 3 / 2, 8 / 5, 5 / 3, 15 / 8];

export type SystemMode = "ji" | "edo12";

export type CommonsAgent = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ratio: number;
  label: string;
  glow: number;
  enabled: boolean;
};

export type CommonsPulse = { x: number; y: number; r: number; life: number };
export type CommonsBolt = { x: number; y: number; vx: number; vy: number; life: number };

export type CommonsSimState = {
  cursorX: number;
  cursorY: number;
  wispX: number;
  wispY: number;
  wispVx: number;
  wispVy: number;
  t: number;
  score: number;
  integrity: number;
  pulses: CommonsPulse[];
  bolts: CommonsBolt[];
  agents: CommonsAgent[];
  pulseAt: number;
  boltAt: number;
  clockAt: number;
  queuedHits: number[];
};

export type TickCommonsParams = {
  bpm: number;
  grooveOn: boolean;
  pulsePower: number;
  width: number;
  height: number;
};

export type CommonsHud = { score: number; integrity: number; queued: number; state: string };

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

function buildRatios(mode: SystemMode) {
  if (mode === "edo12") {
    return Array.from({ length: 9 }, (_, i) => ({ ratio: Math.pow(2, i / 12), label: i === 0 ? "Root" : `${i}` }));
  }
  return JI_RATIOS.map((ratio, i) => ({ ratio, label: i === 0 ? "Root" : `${ratio.toFixed(3).replace(".", "/")}` }));
}

export function createCommonsAgents(mode: SystemMode, width: number, height: number): CommonsAgent[] {
  const entries = buildRatios(mode);
  return entries.map((entry, i) => {
    const angle = (Math.PI * 2 * i) / entries.length;
    const radius = 120 + (i % 3) * 42;
    return {
      x: width * 0.5 + Math.cos(angle) * radius,
      y: height * 0.46 + Math.sin(angle) * radius * 0.82,
      vx: (Math.random() - 0.5) * 24,
      vy: (Math.random() - 0.5) * 24,
      ratio: entry.ratio,
      label: entry.label,
      glow: 0,
      enabled: true,
    };
  });
}

export function tickCommonsField(
  sim: CommonsSimState,
  dt: number,
  nowMs: number,
  params: TickCommonsParams,
  onHit?: (freq: number, vol: number, dur: number) => void,
): CommonsHud {
  const { bpm, grooveOn, pulsePower, width, height } = params;
  const w = width;
  const h = height;

  sim.t += dt;
  const stepDur = 60 / bpm / 4;

  if (grooveOn && nowMs - sim.clockAt > stepDur * 1000) {
    sim.clockAt = nowMs;
    const queued = sim.queuedHits.splice(0, 4);
    if (queued.length && onHit) {
      const base = 90 + (1 - sim.cursorY / h) * 190;
      queued.forEach((ratio, idx) => onHit(base * ratio, 0.09, 0.12 + idx * 0.02));
    }
  }

  const attractorA = { x: w * (0.5 + Math.sin(sim.t * 0.37) * 0.22), y: h * (0.42 + Math.cos(sim.t * 0.51) * 0.16) };
  const attractorB = { x: w * (0.5 + Math.cos(sim.t * 0.21 + 1.1) * 0.2), y: h * (0.44 + Math.sin(sim.t * 0.48) * 0.14) };
  const toA = { x: attractorA.x - sim.wispX, y: attractorA.y - sim.wispY };
  const toB = { x: attractorB.x - sim.wispX, y: attractorB.y - sim.wispY };
  sim.wispVx += (toA.x * 0.3 + toB.x * 0.22) * dt;
  sim.wispVy += (toA.y * 0.3 + toB.y * 0.22) * dt;
  sim.wispVx += Math.sin(sim.t * 3.1) * dt * 68;
  sim.wispVy += Math.cos(sim.t * 2.7) * dt * 61;
  sim.wispVx *= 0.985;
  sim.wispVy *= 0.985;
  sim.wispX = clamp(sim.wispX + sim.wispVx * dt, 30, w - 30);
  sim.wispY = clamp(sim.wispY + sim.wispVy * dt, 30, h - 30);

  sim.agents.forEach((a, idx) => {
    const orbit = (Math.PI * 2 * idx) / Math.max(1, sim.agents.length) + sim.t * 0.12;
    const homeX = w * 0.5 + Math.cos(orbit) * (180 + (idx % 2) * 40);
    const homeY = h * 0.46 + Math.sin(orbit) * (110 + (idx % 3) * 16);
    a.vx += (homeX - a.x) * dt * 0.52;
    a.vy += (homeY - a.y) * dt * 0.52;
    const dW = dist(a.x, a.y, sim.wispX, sim.wispY) + 0.001;
    a.vx += ((sim.wispX - a.x) / dW) * dt * 9;
    a.vy += ((sim.wispY - a.y) / dW) * dt * 9;
    a.vx += (Math.random() - 0.5) * dt * 7;
    a.vy += (Math.random() - 0.5) * dt * 7;
    a.vx *= 0.984;
    a.vy *= 0.984;
    a.x = clamp(a.x + a.vx, 14, w - 14);
    a.y = clamp(a.y + a.vy, 14, h - 14);
    a.glow = Math.max(0, a.glow - dt * 1.4);
  });

  if (nowMs - sim.boltAt > clamp(1100 - sim.score * 8, 440, 1200)) {
    sim.boltAt = nowMs;
    const dx = sim.cursorX - sim.wispX;
    const dy = sim.cursorY - sim.wispY;
    const d = Math.hypot(dx, dy) + 0.001;
    sim.bolts.push({ x: sim.wispX, y: sim.wispY, vx: (dx / d) * 205, vy: (dy / d) * 205, life: 1.9 });
    if (onHit) onHit(160 + Math.random() * 40, 0.05, 0.07);
  }

  sim.bolts = sim.bolts.filter((b) => {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (dist(b.x, b.y, sim.cursorX, sim.cursorY) < 18) {
      sim.integrity = Math.max(0, sim.integrity - 7);
      if (onHit) onHit(84 + Math.random() * 18, 0.09, 0.14);
      return false;
    }
    return b.life > 0;
  });

  sim.pulses.forEach((p) => {
    p.r += dt * 250 * pulsePower;
    p.life -= dt * 0.78;
  });
  sim.pulses = sim.pulses.filter((p) => p.life > 0);

  sim.pulses.forEach((p) => {
    if (Math.abs(dist(p.x, p.y, sim.wispX, sim.wispY) - p.r) < 12) {
      sim.score += 1;
      sim.wispVx += (Math.random() - 0.5) * 150;
      sim.wispVy += (Math.random() - 0.5) * 150;
      if (!grooveOn && onHit) onHit(220 * (3 / 2), 0.12, 0.15);
    }

    sim.agents.forEach((a) => {
      const ringHit = Math.abs(dist(a.x, a.y, p.x, p.y) - p.r) < 8;
      if (!ringHit || !a.enabled) return;
      a.glow = 1;
      const normal = Math.atan2(a.y - p.y, a.x - p.x);
      a.vx += Math.cos(normal) * 0.8;
      a.vy += Math.sin(normal) * 0.8;
      if (grooveOn) {
        sim.queuedHits.push(a.ratio);
        if (sim.queuedHits.length > 20) sim.queuedHits.splice(0, sim.queuedHits.length - 20);
      } else if (onHit) {
        const base = 100 + (1 - sim.cursorY / h) * 180;
        onHit(base * a.ratio, 0.09, 0.12);
      }
    });
  });

  return {
    score: sim.score,
    integrity: Math.round(sim.integrity),
    queued: sim.queuedHits.length,
    state:
      sim.integrity > 50
        ? sim.queuedHits.length > 8
          ? "Verdichtete Resonanz"
          : "Resonanz offen"
        : "Feld unter Druck",
  };
}
