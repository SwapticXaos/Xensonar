import { GAME_HEIGHT, GAME_WIDTH } from "../domain/instrumentData";
import type { IrrlichtArenaRuntimeState } from "@/features/xensonar/rooms/xenpolarExtrasBridge";

const GATED_STEPS = new Set([0, 3, 6, 10, 14]);

/**
 * Patch 284 owner for the Level-3+ commons/field layer.
 *
 * Patch 281 had three independent RAF loops mutating the same commonsClock,
 * commonsStep, phase and bolt state around the main arena RAF.  This module
 * preserves their established formulas, but centralizes all writes so the
 * frame runtime can execute them in a deterministic order from one clock.
 */
export function runIrrlichtArenaLevel3PreGameplayFrame(state: IrrlichtArenaRuntimeState, dt: number) {
  const g = state;
  if (g.over || g.won || g.level < 3) return;

  const t = g.elapsed;
  const fieldA = {
    x: GAME_WIDTH * 0.5 + Math.sin(t * 0.92 + 0.4) * 210,
    y: GAME_HEIGHT * 0.32 + Math.cos(t * 0.71) * 120,
  };
  const fieldB = {
    x: GAME_WIDTH * 0.5 + Math.cos(t * 0.58 + 1.6) * 240,
    y: GAME_HEIGHT * 0.36 + Math.sin(t * 0.87 + 0.3) * 110,
  };

  const pullA = 0.9;
  const pullB = 0.6;
  g.orb.vx += ((fieldA.x - g.orb.x) * pullA + (fieldB.x - g.orb.x) * pullB) * dt;
  g.orb.vy += ((fieldA.y - g.orb.y) * pullA + (fieldB.y - g.orb.y) * pullB) * dt;

  g.commonsClock += dt;
  const stepDur = Math.max(0.08, 0.16 - (g.level - 3) * 0.01);
  while (g.commonsClock >= stepDur) {
    g.commonsClock -= stepDur;
    g.commonsStep = (g.commonsStep + 1) % 16;

    if (GATED_STEPS.has(g.commonsStep)) {
      const dx = g.playerX - g.orb.x;
      const dy = g.playerY - g.orb.y;
      const base = Math.atan2(dy, dx);
      const spread = 0.36;
      for (const offset of [-spread, 0, spread]) {
        const a = base + offset;
        const speed = 175 + g.level * 18;
        g.bolts.push({ x: g.orb.x, y: g.orb.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 6 });
      }
      if (g.bolts.length > 90) g.bolts.splice(0, g.bolts.length - 90);
    }
  }
}

function runLegacyPostFieldPrimary(state: IrrlichtArenaRuntimeState, dt: number) {
  const g = state;
  if (g.level < 3 || g.over || g.won) return;

  g.commonsStepDur = 60 / (108 + (g.level - 3) * 8) / 4;
  g.commonsClock += dt;
  g.phaseA += dt * (0.8 + g.level * 0.09);

  const fieldA = {
    x: GAME_WIDTH * (0.5 + Math.sin(g.phaseA * 0.91) * 0.22),
    y: GAME_HEIGHT * (0.32 + Math.cos(g.phaseA * 1.17) * 0.14),
  };
  const fieldB = {
    x: GAME_WIDTH * (0.5 + Math.cos(g.phaseA * 0.67 + 0.8) * 0.18),
    y: GAME_HEIGHT * (0.35 + Math.sin(g.phaseA * 0.83 + 0.3) * 0.16),
  };

  const pull = 28 + g.level * 5;
  g.orb.vx += ((fieldA.x - g.orb.x) * 0.55 + (fieldB.x - g.orb.x) * 0.45) * dt * (pull / 100);
  g.orb.vy += ((fieldA.y - g.orb.y) * 0.55 + (fieldB.y - g.orb.y) * 0.45) * dt * (pull / 100);

  while (g.commonsClock >= g.commonsStepDur) {
    g.commonsClock -= g.commonsStepDur;
    g.commonsStep = (g.commonsStep + 1) % 16;
    const step = g.commonsStep;
    if (GATED_STEPS.has(step)) {
      const targetAngle = Math.atan2(g.playerY - g.orb.y, g.playerX - g.orb.x);
      const spread = 0.32 + (step % 2) * 0.08;
      [-spread, 0, spread].forEach((offset) => {
        const angle = targetAngle + offset;
        const speed = 170 + g.level * 18;
        g.bolts.push({ x: g.orb.x, y: g.orb.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 6 });
      });
    }

    if (step % 4 === 0) {
      g.orb.vx += (Math.random() - 0.5) * (95 + g.level * 10);
      g.orb.vy += (Math.random() - 0.5) * (80 + g.level * 9);
    }

    if (g.bolts.length > 140) g.bolts.splice(0, g.bolts.length - 140);
  }
}

function runLegacyPostFieldSecondary(state: IrrlichtArenaRuntimeState, dt: number) {
  const g = state;
  if (g.level < 3 || g.over || g.won) return;

  g.phaseA += dt * (0.82 + g.level * 0.06);
  g.phaseB += dt * (0.57 + g.level * 0.05);

  const fieldA = {
    x: GAME_WIDTH * 0.5 + Math.cos(g.phaseA) * 220,
    y: GAME_HEIGHT * 0.38 + Math.sin(g.phaseA * 1.13) * 120,
  };
  const fieldB = {
    x: GAME_WIDTH * 0.5 + Math.cos(g.phaseB + 1.7) * 180,
    y: GAME_HEIGHT * 0.34 + Math.sin(g.phaseB * 1.37 + 0.6) * 140,
  };

  const dxA = fieldA.x - g.orb.x;
  const dyA = fieldA.y - g.orb.y;
  const dxB = fieldB.x - g.orb.x;
  const dyB = fieldB.y - g.orb.y;
  const distA = Math.max(30, Math.hypot(dxA, dyA));
  const distB = Math.max(30, Math.hypot(dxB, dyB));
  const pull = 22 + g.level * 3.5;

  g.orb.vx += ((dxA / distA) * pull + (dxB / distB) * pull * 0.9) * dt;
  g.orb.vy += ((dyA / distA) * pull + (dyB / distB) * pull * 0.9) * dt;
  g.orb.vx += (-dyA / distA) * 16 * dt;
  g.orb.vy += (dxB / distB) * 14 * dt;

  const maxSpeed = 300 + (g.level - 2) * 40;
  const speed = Math.hypot(g.orb.vx, g.orb.vy);
  if (speed > maxSpeed) {
    const k = maxSpeed / speed;
    g.orb.vx *= k;
    g.orb.vy *= k;
  }

  g.commonsStepDur = Math.max(0.085, 0.14 - (g.level - 3) * 0.008);
  g.commonsClock += dt;
  while (g.commonsClock >= g.commonsStepDur) {
    g.commonsClock -= g.commonsStepDur;
    g.commonsStep = (g.commonsStep + 1) % 16;

    if (GATED_STEPS.has(g.commonsStep)) {
      const base = Math.atan2(g.playerY - g.orb.y, g.playerX - g.orb.x);
      const spread = 0.32;
      const spd = 230 + g.level * 15;
      [-spread, 0, spread].forEach((off) => {
        const a = base + off;
        g.bolts.push({ x: g.orb.x, y: g.orb.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 7 });
      });
    }

    if (g.commonsStep % 4 === 0) {
      const nudge = 34 + g.level * 3;
      g.orb.vx += Math.cos(g.phaseA * 1.8 + g.commonsStep) * nudge;
      g.orb.vy += Math.sin(g.phaseB * 1.5 + g.commonsStep) * nudge;
    }
  }

  if (g.bolts.length > 120) g.bolts.splice(0, g.bolts.length - 120);
}

export function runIrrlichtArenaLevel3PostGameplayFrame(
  state: IrrlichtArenaRuntimeState,
  primaryDt: number,
  secondaryDt: number,
) {
  // Preserve the Patch-281 registration order and each legacy loop's dt cap.
  runLegacyPostFieldPrimary(state, primaryDt);
  runLegacyPostFieldSecondary(state, secondaryDt);
}
