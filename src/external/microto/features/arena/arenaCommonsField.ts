import type { ArenaGameState } from "./arenaState";

const COMMONS_GATED_HIT_STEPS = new Set([0, 3, 6, 10, 14]);
export const ARENA_COMMONS_MAX_BOLTS = 120;

/**
 * Level>=3 commons-field augmentation for the arena orb.
 * Pure simulation helper: mutates ArenaGameState, no audio or RAF ownership.
 */
export function tickArenaCommonsField(
  state: ArenaGameState,
  dt: number,
  gameWidth: number,
  gameHeight: number,
): void {
  if (state.level < 3 || state.over || state.won) return;

  state.phaseA += dt * (0.82 + state.level * 0.06);
  state.phaseB += dt * (0.57 + state.level * 0.05);

  const fieldA = {
    x: gameWidth * 0.5 + Math.cos(state.phaseA) * 220,
    y: gameHeight * 0.38 + Math.sin(state.phaseA * 1.13) * 120,
  };
  const fieldB = {
    x: gameWidth * 0.5 + Math.cos(state.phaseB + 1.7) * 180,
    y: gameHeight * 0.34 + Math.sin(state.phaseB * 1.37 + 0.6) * 140,
  };

  const dxA = fieldA.x - state.orb.x;
  const dyA = fieldA.y - state.orb.y;
  const dxB = fieldB.x - state.orb.x;
  const dyB = fieldB.y - state.orb.y;
  const distA = Math.max(30, Math.hypot(dxA, dyA));
  const distB = Math.max(30, Math.hypot(dxB, dyB));
  const pull = 22 + state.level * 3.5;

  state.orb.vx += ((dxA / distA) * pull + (dxB / distB) * pull * 0.9) * dt;
  state.orb.vy += ((dyA / distA) * pull + (dyB / distB) * pull * 0.9) * dt;

  // Add a mild perpendicular swirl so the level-3 field stays distinct from the base arena drift.
  state.orb.vx += (-dyA / distA) * 16 * dt;
  state.orb.vy += (dxB / distB) * 14 * dt;

  const maxSpeed = 300 + (state.level - 2) * 40;
  const speed = Math.hypot(state.orb.vx, state.orb.vy);
  if (speed > maxSpeed) {
    const scale = maxSpeed / speed;
    state.orb.vx *= scale;
    state.orb.vy *= scale;
  }

  state.commonsStepDur = Math.max(0.085, 0.14 - (state.level - 3) * 0.008);
  state.commonsClock += dt;
  while (state.commonsClock >= state.commonsStepDur) {
    state.commonsClock -= state.commonsStepDur;
    state.commonsStep = (state.commonsStep + 1) % 16;

    if (COMMONS_GATED_HIT_STEPS.has(state.commonsStep)) {
      const aimX = state.playerX - state.orb.x;
      const aimY = state.playerY - state.orb.y;
      const base = Math.atan2(aimY, aimX);
      const spread = 0.32;
      const speed = 230 + state.level * 15;
      [-spread, 0, spread].forEach((offset) => {
        const angle = base + offset;
        state.bolts.push({
          x: state.orb.x,
          y: state.orb.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: 7,
        });
      });
    }

    if (state.commonsStep % 4 === 0) {
      const nudge = 34 + state.level * 3;
      state.orb.vx += Math.cos(state.phaseA * 1.8 + state.commonsStep) * nudge;
      state.orb.vy += Math.sin(state.phaseB * 1.5 + state.commonsStep) * nudge;
    }
  }

  if (state.bolts.length > ARENA_COMMONS_MAX_BOLTS) {
    state.bolts.splice(0, state.bolts.length - ARENA_COMMONS_MAX_BOLTS);
  }
}
