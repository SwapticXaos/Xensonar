/**
 * Player movement and platform/gate collision for platformer tick.
 * Extracted from platformerTick to keep tick file under soft LOC target and clarify flow (vision §6, REFLECTION, STRUCTURE).
 * Single responsibility: apply input, gravity, horizontal/vertical collision; return landing state for caller to handle cues.
 */

import {
  WORLD_W,
  PLAYER_W,
  PLAYER_H,
  GRAVITY,
  MOVE_ACCEL,
  AIR_ACCEL,
  MAX_SPEED,
  JUMP_SPEED,
  type Player,
  type Platform,
  type PlatformKind,
  type Keys,
  type RouteSelection,
} from "./platformerState";
import type { PlatformerResonanceGate } from "./platformerAdventure";
import type { PlatformerNpcFieldState } from "./platformerNpcFieldTypes";
import { clamp } from "../../shared/tuning/grid";
import { isPlayerAlignedWithGateWindow, type DraftGateWindow } from "./platformerTickHelpers";

const PLAYER_LEFT_SOFT_BOUNDARY = 52;
const PLAYER_LANDING_SNAP = 6;

export type ApplyPlatformerPlayerPhysicsParams = {
  player: Player;
  activeCollisionPlatforms: Platform[];
  closedGates: PlatformerResonanceGate[];
  npcField: PlatformerNpcFieldState;
  routeSelections: Record<string, RouteSelection>;
  dt: number;
  keys: Keys;
  lastProgressX: number;
  markProgress: (x?: number) => void;
};

export type ApplyPlatformerPlayerPhysicsResult = {
  landedKind: PlatformKind | null;
  didJump: boolean;
  /** Vertical velocity just before landing (for land cue impact); 0 if did not land this frame. */
  landingImpactVy: number;
};

/**
 * Apply player movement (input, gravity), horizontal and vertical collision with platforms and gates,
 * landing snap, bounce, and soft left boundary. Mutates player. Caller handles land/step/jump cues.
 */
export function applyPlatformerPlayerPhysics(params: ApplyPlatformerPlayerPhysicsParams): ApplyPlatformerPlayerPhysicsResult {
  const {
    player,
    activeCollisionPlatforms,
    closedGates,
    npcField,
    routeSelections,
    dt,
    keys,
    lastProgressX,
    markProgress,
  } = params;

  const gateWindow: DraftGateWindow = npcField.draftGateWindow
    ? { gateId: npcField.draftGateWindow.gateId, y: npcField.draftGateWindow.y, h: npcField.draftGateWindow.h }
    : null;

  let didJump = false;
  let landedKind: PlatformKind | null = null;
  let landingImpactVy = 0;

  player.wasGrounded = player.onGround;

  const inputX = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (inputX !== 0) {
    const accel = player.onGround ? MOVE_ACCEL : AIR_ACCEL;
    player.vx += inputX * accel * dt;
    player.facing = inputX > 0 ? 1 : -1;
  } else if (player.onGround) {
    player.vx *= Math.pow(0.001, dt * 4.6 * npcField.tractionScale);
  }
  player.vx = clamp(player.vx, -MAX_SPEED, MAX_SPEED);

  if (player.jumpQueued && player.onGround) {
    player.vy = -JUMP_SPEED;
    player.onGround = false;
    player.jumpQueued = false;
    didJump = true;
  }

  player.vy += GRAVITY * npcField.gravityScale * dt;

  let nextX = player.x + player.vx * dt;
  for (const p of activeCollisionPlatforms) {
    if (p.kind === "one_way") continue;
    if (player.y + PLAYER_H <= p.y + 2 || player.y >= p.y + p.h - 2) continue;
    if (player.vx > 0 && player.x + PLAYER_W <= p.x && nextX + PLAYER_W >= p.x) {
      nextX = p.x - PLAYER_W;
      player.vx = 0;
    } else if (player.vx < 0 && player.x >= p.x + p.w && nextX <= p.x + p.w) {
      nextX = p.x + p.w;
      player.vx = 0;
    }
  }
  for (const gate of closedGates) {
    if (isPlayerAlignedWithGateWindow(gate.id, gateWindow, player.y, player.y)) continue;
    if (player.y + PLAYER_H <= gate.y + 2 || player.y >= gate.y + gate.h - 2) continue;
    if (player.vx > 0 && player.x + PLAYER_W <= gate.x && nextX + PLAYER_W >= gate.x) {
      nextX = gate.x - PLAYER_W;
      player.vx = 0;
    } else if (player.vx < 0 && player.x >= gate.x + gate.w && nextX <= gate.x + gate.w) {
      nextX = gate.x + gate.w;
      player.vx = 0;
    }
  }
  player.x = clamp(nextX, 0, WORLD_W - PLAYER_W);
  if (player.x < PLAYER_LEFT_SOFT_BOUNDARY && player.vx < 0) {
    const softness = clamp(1 - player.x / PLAYER_LEFT_SOFT_BOUNDARY, 0, 1);
    player.vx *= 1 - softness * 0.82;
  }
  if (player.x > lastProgressX + 120) {
    markProgress(player.x);
  }

  const baseLandingSnap = PLAYER_LANDING_SNAP + Math.round(npcField.landingSnapBonus);
  let nextY = player.y + player.vy * dt;
  let grounded = false;

  for (const p of activeCollisionPlatforms) {
    if (player.x + PLAYER_W <= p.x + 4 || player.x >= p.x + p.w - 4) continue;
    const routeAssist =
      p.routeGroupId &&
      (routeSelections[p.routeGroupId] ?? 0) === 0 &&
      npcField.routeFocusGroupId === p.routeGroupId &&
      npcField.routeFocusChoice !== 0 &&
      p.routeDirection === npcField.routeFocusChoice
        ? Math.round(npcField.routeFocusStrength * 8)
        : 0;
    const landingSnap = Math.max(
      0,
      baseLandingSnap +
        (p.kind === "one_way" ? Math.round(npcField.oneWaySnapBonus) : 0) +
        routeAssist,
    );
    if (player.vy > 0 && player.y + PLAYER_H <= p.y + landingSnap && nextY + PLAYER_H >= p.y) {
      nextY = p.y - PLAYER_H;
      grounded = true;
      landedKind = p.kind;
      break;
    }
    if (p.kind !== "one_way" && player.vy < 0 && player.y >= p.y + p.h && nextY <= p.y + p.h) {
      nextY = p.y + p.h;
      player.vy = 0;
    }
  }
  if (!grounded) {
    for (const gate of closedGates) {
      if (isPlayerAlignedWithGateWindow(gate.id, gateWindow, player.y, nextY)) continue;
      if (player.x + PLAYER_W <= gate.x + 4 || player.x >= gate.x + gate.w - 4) continue;
      if (player.vy > 0 && player.y + PLAYER_H <= gate.y + baseLandingSnap && nextY + PLAYER_H >= gate.y) {
        nextY = gate.y - PLAYER_H;
        grounded = true;
        landedKind = "solid";
        break;
      }
      if (player.vy < 0 && player.y >= gate.y + gate.h && nextY <= gate.y + gate.h) {
        nextY = gate.y + gate.h;
        player.vy = 0;
      }
    }
  }

  player.y = nextY;
  player.onGround = grounded;

  if (player.onGround) {
    if (!player.wasGrounded) landingImpactVy = player.vy;
    if (landedKind === "bounce") {
      player.vy = -JUMP_SPEED * 0.86;
      player.onGround = false;
    } else {
      player.vy = 0;
    }
  }

  return { landedKind, didJump, landingImpactVy };
}
