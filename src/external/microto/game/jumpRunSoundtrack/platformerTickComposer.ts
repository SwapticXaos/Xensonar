/**
 * Composer obstacle collision handling for platformer tick.
 * Extracted from platformerTick to keep tick file under soft LOC target (vision §6, REFLECTION).
 */
import { clamp } from "../../shared/tuning/grid";
import type { SimState, Player } from "./platformerState";
import { PLAYER_W, PLAYER_H, MAX_SPEED } from "./platformerState";
import type { PlatformerComposerObstacleHit } from "./platformerAudio";
import { rectsOverlap, getComposerObstaclePulseStrength, COMPOSER_PHASE_LABELS } from "./platformerHelpers";
import { resolveForkRouteSelection } from "./platformerRouteProfile";

export type PlatformerTickComposerApi = {
  captureComposerObstacleHit: (hit: PlatformerComposerObstacleHit) => void;
};

/**
 * Process composer obstacle collisions: detect overlap with player, activate obstacles,
 * update route selections and score, and push capture events to audio.
 */
export function processComposerObstacleCollisions(
  s: SimState,
  api: PlatformerTickComposerApi,
  player: Player,
): void {
  for (const obstacle of s.composerObstacles) {
    if (obstacle.activated) continue;
    if (
      !rectsOverlap(player.x, player.y, PLAYER_W, PLAYER_H, obstacle.x, obstacle.y, obstacle.w, obstacle.h)
    )
      continue;
    obstacle.activated = true;
    obstacle.lastTriggeredAt = s.t;
    if (obstacle.groupId && obstacle.kind === "chord_fork") {
      s.routeSelections[obstacle.groupId] = resolveForkRouteSelection(obstacle.detail);
    }
    if (obstacle.groupId) {
      for (const sibling of s.composerObstacles) {
        if (sibling.id !== obstacle.id && sibling.groupId === obstacle.groupId) {
          sibling.activated = true;
        }
      }
    }
    if (obstacle.kind === "sync_gate") {
      const pulseStrength = getComposerObstaclePulseStrength(obstacle, s.t);
      api.captureComposerObstacleHit({
        kind: obstacle.kind,
        lane: obstacle.lane,
        energy: clamp(obstacle.strength * (0.55 + pulseStrength * 0.45), 0.2, 1),
        airborne: !player.onGround,
        detail: pulseStrength,
      });
      s.score += 18 + Math.round(pulseStrength * 10);
    } else if (obstacle.kind === "phase_gate") {
      const phaseIndex = obstacle.detail ?? COMPOSER_PHASE_LABELS.indexOf(obstacle.phase ?? "B");
      api.captureComposerObstacleHit({
        kind: obstacle.kind,
        lane: obstacle.lane,
        energy: clamp(obstacle.strength + (player.onGround ? 0 : 0.05), 0.25, 1),
        airborne: !player.onGround,
        detail: phaseIndex,
      });
      s.score += 20;
    } else if (obstacle.kind === "chord_fork") {
      api.captureComposerObstacleHit({
        kind: obstacle.kind,
        lane: obstacle.lane,
        energy: clamp(obstacle.strength + (Math.abs(player.vx) / MAX_SPEED) * 0.12, 0.25, 1),
        airborne: !player.onGround,
        detail: obstacle.detail ?? 0,
      });
      s.score += 22;
    } else if (obstacle.kind === "silence_field") {
      api.captureComposerObstacleHit({
        kind: obstacle.kind,
        lane: obstacle.lane,
        energy: clamp(obstacle.strength, 0.2, 1),
        airborne: !player.onGround,
        detail: obstacle.detail ?? 0.7,
      });
      s.score += 16;
    } else {
      api.captureComposerObstacleHit({
        kind: obstacle.kind,
        lane: obstacle.lane,
        energy: obstacle.strength,
        airborne: !player.onGround,
        detail: obstacle.detail ?? 0,
      });
      s.score += 24;
    }
  }
}
