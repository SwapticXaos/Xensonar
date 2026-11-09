/**
 * Pure L3 field simulation: wisps, bolts, pulses, cursor, step pattern.
 * Mutates state; returns events for audio and HUD sync. No RAF or audio ownership.
 * Aligns with commonsField, arenaCommonsField pattern (STRUCTURE optimization).
 */

import { clamp } from "../../shared/tuning/grid";
import type { Level3State, Pulse, PulseDirection } from "./level3State";
import { PATTERN } from "./level3State";

export type TickLevel3Params = {
  stepDur: number;
  width: number;
  height: number;
};

export type Level3TickEvent =
  | { type: "wisp_resonant"; freq: number; vol: number; dur: number }
  | { type: "wisp_nonresonant"; freq: number; vol: number; dur: number }
  | { type: "bolt_hit" }
  | { type: "game_over" }
  | { type: "won" };

export type Level3Hud = { score: number; hp: number; status: string };

function inPulseSector(pulse: Pulse, tx: number, ty: number): boolean {
  const dx = tx - pulse.x;
  const dy = ty - pulse.y;
  switch (pulse.direction) {
    case "left":
      return dx <= 0 && Math.abs(dy) <= Math.abs(dx);
    case "right":
      return dx >= 0 && Math.abs(dy) <= Math.abs(dx);
    case "up":
      return dy <= 0 && Math.abs(dx) <= Math.abs(dy);
    case "down":
      return dy >= 0 && Math.abs(dx) <= Math.abs(dy);
    default:
      return false;
  }
}

export function tickLevel3Field(
  state: Level3State,
  dt: number,
  params: TickLevel3Params,
): { events: Level3TickEvent[]; hud: Level3Hud } {
  const { stepDur, width, height } = params;
  const s = state;
  const w = width;
  const h = height;
  const events: Level3TickEvent[] = [];

  s.t += dt;
  s.stepClock += dt;
  if (s.hitCooldown > 0) s.hitCooldown -= dt;
  if (s.pulseCooldown > 0) s.pulseCooldown -= dt;

  const speed = 260;
  if (s.keys.left) s.cursorX -= speed * dt;
  if (s.keys.right) s.cursorX += speed * dt;
  if (s.keys.up) s.cursorY -= speed * dt;
  if (s.keys.down) s.cursorY += speed * dt;
  s.cursorX = clamp(s.cursorX, 0, w);
  s.cursorY = clamp(s.cursorY, 0, h);

  const a1x = w * 0.35 + Math.cos(s.t * 0.58) * 180;
  const a1y = h * 0.3 + Math.sin(s.t * 0.77) * 120;
  const a2x = w * 0.66 + Math.cos(s.t * 0.41 + 1.3) * 220;
  const a2y = h * 0.34 + Math.sin(s.t * 0.64 + 0.8) * 110;

  s.wisps.forEach((wisp, idx) => {
    wisp.phase = (wisp.phase + dt * (0.12 + idx * 0.03)) % 1;
    const tx = idx % 2 === 0 ? a1x : a2x;
    const ty = idx % 2 === 0 ? a1y : a2y;
    const dx = tx - wisp.x;
    const dy = ty - wisp.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const swirl = (idx % 2 ? -1 : 1) * 24;
    wisp.vx += ((dx / dist) * 72 + (-dy / dist) * swirl) * dt;
    wisp.vy += ((dy / dist) * 72 + (dx / dist) * swirl) * dt;
    wisp.vx *= 0.986;
    wisp.vy *= 0.986;
    wisp.x += wisp.vx * dt;
    wisp.y += wisp.vy * dt;
    wisp.x = clamp(wisp.x, 30, w - 30);
    wisp.y = clamp(wisp.y, 30, h - 130);
  });

  while (s.stepClock >= stepDur) {
    s.stepClock -= stepDur;
    const st = s.stepIndex % 16;
    if (PATTERN[st]) {
      s.wisps.forEach((w) => {
        const active = w.phase > 0.62 && w.phase < 0.78;
        if (!active) return;
        const ang = Math.atan2(s.cursorY - w.y, s.cursorX - w.x);
        const spread = 0.24;
        const spd = 210;
        [-spread, 0, spread].forEach((off) => {
          s.bolts.push({
            x: w.x,
            y: w.y,
            vx: Math.cos(ang + off) * spd,
            vy: Math.sin(ang + off) * spd,
            r: 6,
          });
        });
      });
    }
    s.stepIndex += 1;
  }

  s.pulses.forEach((p) => {
    p.radius += 390 * dt;
    p.life -= 0.95 * dt;
  });
  s.pulses = s.pulses.filter((p) => p.life > 0);

  s.bolts.forEach((b) => {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  });
  s.bolts = s.bolts.filter((b) => b.x > -40 && b.x < w + 40 && b.y > -40 && b.y < h + 40);

  s.pulses.forEach((p) => {
    s.wisps.forEach((w, idx) => {
      if (p.hit.has(idx)) return;
      if (!inPulseSector(p, w.x, w.y)) return;
      const d = Math.hypot(w.x - p.x, w.y - p.y);
      if (d > p.radius - 12 && d < p.radius + 12) {
        p.hit.add(idx);
        const active = w.phase > 0.62 && w.phase < 0.78;
        if (active) {
          s.score += 1;
          events.push({ type: "wisp_resonant", freq: 170 * w.ratio, vol: 0.16, dur: 0.22 });
          s.status = `Resonant Hit: ${w.ratio.toFixed(2)}x`;
        } else {
          events.push({ type: "wisp_nonresonant", freq: 90 * w.ratio, vol: 0.06, dur: 0.12 });
          s.status = "Wisp getroffen, aber nicht resonant";
        }
        const nx = (w.x - p.x) / Math.max(1, d);
        const ny = (w.y - p.y) / Math.max(1, d);
        w.vx += nx * 24;
        w.vy += ny * 24;
      }
    });
  });

  for (const b of s.bolts) {
    const d = Math.hypot(b.x - s.cursorX, b.y - s.cursorY);
    if (d < b.r + 12 && s.hitCooldown <= 0) {
      s.hitCooldown = 0.34;
      s.hp -= 1;
      events.push({ type: "bolt_hit" });
      if (s.hp <= 0) {
        s.status = "Signalverlust - Neustart empfohlen";
        events.push({ type: "game_over" });
      }
    }
  }

  if (s.score >= 18) {
    s.status = "L3-Lab gemeistert: Resonanzchor stabilisiert";
    events.push({ type: "won" });
  }

  s.uiTimer += dt;

  return {
    events,
    hud: { score: s.score, hp: s.hp, status: s.status },
  };
}

export function addPulse(state: Level3State, direction: PulseDirection): void {
  const s = state;
  if (s.pulseCooldown > 0) return;
  s.pulseCooldown = 0.11;
  if (s.pulses.length > 12) s.pulses.shift();
  s.pulses.push({
    x: s.cursorX,
    y: s.cursorY,
    radius: 2,
    life: 1,
    hit: new Set<number>(),
    direction,
  });
}
