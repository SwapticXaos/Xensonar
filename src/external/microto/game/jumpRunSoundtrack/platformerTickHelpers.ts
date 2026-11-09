/**
 * Pure helpers for platformer simulation tick (physics, collision, action drive, NPC proximity).
 * Extracted from platformerTick to keep tick file under soft LOC target (vision §6, STRUCTURE).
 */

import { clamp } from "../../shared/tuning/grid";
import { PLAYER_W, PLAYER_H, MAX_SPEED, type SimState } from "./platformerState";
import { rectsOverlap } from "./platformerHelpers";

export const PUZZLE_PEDESTAL_SURFACE_OFFSET = 22;

/** Minimal shape for gate window used in alignment check (from buildPlatformerNpcFieldState draftGateWindow). */
export type DraftGateWindow = { gateId: string; y: number; h: number } | null;

export function orbBounceVelocity(style: "arc" | "fan" | "drift" | "skip", vy: number): number {
  const speed = Math.max(28, Math.abs(vy));
  if (style === "drift") return -Math.max(22, speed * 0.42);
  if (style === "skip") return -Math.max(44, speed * 0.58);
  if (style === "fan") return -Math.max(38, speed * 0.5);
  return -Math.max(46, speed * 0.54);
}

export function isPlayerTouchingPuzzlePedestal(
  playerX: number,
  playerY: number,
  pedestalX: number,
  pedestalY: number,
  touchBonus = 0,
): boolean {
  if (
    rectsOverlap(
      playerX,
      playerY,
      PLAYER_W,
      PLAYER_H,
      pedestalX - 14 - touchBonus,
      pedestalY - 26 - touchBonus,
      28 + touchBonus * 2,
      34 + touchBonus * 2,
    )
  ) {
    return true;
  }
  const footX = playerX + PLAYER_W * 0.5;
  const footY = playerY + PLAYER_H;
  return (
    Math.abs(footX - pedestalX) <= PLAYER_W * 0.5 + 8 + touchBonus * 0.7 &&
    Math.abs(footY - (pedestalY + PUZZLE_PEDESTAL_SURFACE_OFFSET)) <= 18 + touchBonus
  );
}

export function getPlatformerActionDrive(
  playerVx: number,
  onGround: boolean,
  recentActionCount: number,
  solvedPedestals: number,
  gatesOpen: number,
): number {
  return clamp(
    (Math.abs(playerVx) / MAX_SPEED) * 0.42 +
      (onGround ? 0 : 0.18) +
      Math.min(0.32, recentActionCount * 0.05) +
      solvedPedestals * 0.04 +
      gatesOpen * 0.12,
    0,
    1,
  );
}

export function getNearbyNpc(
  musicNpcs: SimState["musicNpcs"],
  playerCenterX: number,
  maxDistance = 260,
): SimState["musicNpcs"][number] | null {
  return (
    [...musicNpcs]
      .filter((npc) => Math.abs(npc.x - playerCenterX) < maxDistance)
      .sort((a, b) => Math.abs(a.x - playerCenterX) - Math.abs(b.x - playerCenterX))[0] ?? null
  );
}

export function isPlayerAlignedWithGateWindow(
  gateId: string,
  gateWindow: DraftGateWindow,
  playerY: number,
  nextY: number,
): boolean {
  if (!gateWindow || gateWindow.gateId !== gateId) return false;
  const top = Math.min(playerY, nextY);
  const bottom = Math.max(playerY + PLAYER_H, nextY + PLAYER_H);
  return bottom > gateWindow.y + 4 && top < gateWindow.y + gateWindow.h - 4;
}
