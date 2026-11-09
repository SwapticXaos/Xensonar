/**
 * Pure helpers for NPC field state: aura/route/gate/pedestal labels, colors, and platform builders.
 * Extracted from platformerNpcField to keep main module under soft LOC target (vision §8, REFLECTION).
 */

import { clamp } from "../../shared/tuning/grid";
import {
  describePlatformerPuzzleToken,
  getNextPlatformerPuzzlePedestal,
  type PlatformerPuzzlePedestal,
  type PlatformerPuzzleToken,
  type PlatformerResonanceGate,
} from "./platformerAdventure";
import type {
  PlatformerMusicNpc,
  PlatformerNpcDisposition,
  PlatformerNpcTarotOrientation,
} from "./platformerNpcMusic";
import { PLATFORMER_ROUTE_GROUP_IDS, type Platform, type RouteSelection } from "./platformerState";
import type {
  PlatformerNpcFieldGateWindow,
  PlatformerNpcFieldPlatform,
} from "./platformerNpcFieldTypes";

export const ROUTE_PREFERENCE_BY_ANIMAL: Record<PlatformerMusicNpc["animal"], Exclude<RouteSelection, 0>> = {
  camel: 1,
  panda: -1,
  owl: 1,
  fox: -1,
  wolf: 1,
  crane: -1,
  frog: -1,
  cat: 1,
};

export const getAuraRadius = (disposition: PlatformerNpcDisposition) => {
  if (disposition === "guide") return 240;
  if (disposition === "trickster") return 220;
  return 260;
};

export const getAuraColor = (disposition: PlatformerNpcDisposition) => {
  if (disposition === "guide") return "rgba(134, 239, 172, 0.28)";
  if (disposition === "trickster") return "rgba(251, 113, 133, 0.24)";
  return "rgba(196, 181, 253, 0.24)";
};

export const getNearestClosedGateId = (
  pedestals: PlatformerPuzzlePedestal[],
  gates: PlatformerResonanceGate[],
) => {
  const closedGate = gates.find((gate) => !gate.open);
  if (!closedGate) return null;
  const nextPedestal = getNextPlatformerPuzzlePedestal(pedestals, closedGate.id);
  return nextPedestal?.id ?? null;
};

export const getNearestClosedGate = (
  gates: PlatformerResonanceGate[],
  playerX: number,
) =>
  gates
    .filter((gate) => !gate.open)
    .map((gate) => ({
      gate,
      dist: Math.abs(gate.x + gate.w * 0.5 - playerX),
    }))
    .sort((a, b) => a.dist - b.dist)[0]?.gate ?? null;

export const buildStatusLabel = (
  npc: PlatformerMusicNpc,
  disposition: PlatformerNpcDisposition,
  orientation: NonNullable<PlatformerMusicNpc["tarotOrientation"]>,
  focusLabel: string | null,
) => {
  const role = (npc.modernRole ?? npc.tarotTitle ?? "archetype").toLowerCase();
  const gift = (npc.giftLabel ?? "clarity").toLowerCase();
  const shadow = (npc.shadowLabel ?? "friction").toLowerCase();
  const lesson = (npc.lessonLabel ?? "timing").toLowerCase();
  const draft = (npc.loomActiveLabel ?? "draft").toLowerCase();
  const mirror = (npc.mirrorLabel ?? "telemetry").toLowerCase();
  if (disposition === "guide") {
    return orientation === "upright"
      ? `${npc.label} channels ${role}: ${gift} via ${draft}`
      : `${npc.label} overguides with ${shadow} via ${draft}`;
  }
  if (disposition === "trickster") {
    return orientation === "upright"
      ? `${npc.label} provokes ${lesson} via ${draft}`
      : `${npc.label} triggers ${shadow} via ${draft}`;
  }
  if (focusLabel) {
    return orientation === "upright"
      ? `${npc.label} mirrors ${focusLabel} through ${role} and ${mirror}`
      : `${npc.label} bends ${focusLabel} into ${shadow} and ${mirror}`;
  }
  return orientation === "upright"
    ? `${npc.label} reflects ${gift} and ${mirror}`
    : `${npc.label} reflects ${shadow} and ${mirror}`;
};

export const getNextRouteGroupId = (routeSelections: Record<string, RouteSelection>) =>
  PLATFORMER_ROUTE_GROUP_IDS.find((groupId) => (routeSelections[groupId] ?? 0) === 0) ?? null;

export const getRouteChoiceFromToken = (token: PlatformerPuzzleToken | null): Exclude<RouteSelection, 0> => {
  if (token === "minor" || token === "mode") return -1;
  return 1;
};

export const getRouteVote = (
  npc: PlatformerMusicNpc,
  disposition: PlatformerNpcDisposition,
  orientation: PlatformerNpcTarotOrientation,
  strength: number,
  tokenTarget: PlatformerPuzzleToken | null,
  playerVx: number,
) => {
  const tokenChoice = getRouteChoiceFromToken(tokenTarget);
  const motionChoice: Exclude<RouteSelection, 0> = playerVx < 0 ? -1 : 1;
  const animalChoice = ROUTE_PREFERENCE_BY_ANIMAL[npc.animal];
  const baseChoice = tokenTarget == null ? motionChoice : tokenChoice;
  const animalWeight =
    npc.animal === "panda" || npc.animal === "wolf"
      ? 0.34
      : npc.animal === "owl" || npc.animal === "fox" || npc.animal === "camel"
        ? 0.26
        : 0.18;

  let vote = animalChoice * animalWeight * strength;
  if (disposition === "guide") {
    vote += baseChoice * (orientation === "upright" ? 1.02 : 0.34) * strength;
  } else if (disposition === "trickster") {
    vote += baseChoice * (orientation === "upright" ? -0.72 : -1.04) * strength;
  } else {
    vote += baseChoice * (orientation === "upright" ? 0.88 : -0.48) * strength;
  }
  return vote;
};

export const buildRouteHintLabel = (
  disposition: PlatformerNpcDisposition,
  choice: Exclude<RouteSelection, 0>,
) => {
  const routeLabel = choice > 0 ? "HIGH" : "LOW";
  if (disposition === "guide") return `GUIDE ${routeLabel}`;
  if (disposition === "trickster") return `BAIT ${routeLabel}`;
  return `ECHO ${routeLabel}`;
};

export const getFieldPlatformColor = (
  disposition: PlatformerNpcDisposition,
  orientation: PlatformerNpcTarotOrientation,
) => {
  if (disposition === "guide") {
    return orientation === "upright" ? "rgba(253, 224, 71, 0.7)" : "rgba(250, 204, 21, 0.48)";
  }
  if (disposition === "trickster") {
    return orientation === "upright" ? "rgba(251, 146, 60, 0.64)" : "rgba(251, 113, 133, 0.66)";
  }
  return orientation === "upright" ? "rgba(196, 181, 253, 0.68)" : "rgba(167, 139, 250, 0.5)";
};

export const buildRouteBridgePlatform = (
  platforms: Platform[],
  routeGroupId: string,
  routeFocusChoice: Exclude<RouteSelection, 0>,
  routeFocusStrength: number,
  disposition: PlatformerNpcDisposition,
  orientation: PlatformerNpcTarotOrientation,
  routeHintLabel: string | null,
): PlatformerNpcFieldPlatform | null => {
  const branchPlatform = platforms.find(
    (platform) =>
      platform.id === `${routeGroupId}-${routeFocusChoice > 0 ? "high-a" : "low-a"}`,
  );
  if (!branchPlatform) return null;
  return {
    id: `field-route-bridge-${routeGroupId}-${routeFocusChoice > 0 ? "high" : "low"}`,
    fieldKind: "route_bridge",
    label: routeHintLabel ?? (routeFocusChoice > 0 ? "HIGH" : "LOW"),
    color: getFieldPlatformColor(disposition, orientation),
    disposition,
    tarotOrientation: orientation,
    strength: routeFocusStrength,
    x: branchPlatform.x - 58,
    y: branchPlatform.y + (routeFocusChoice > 0 ? 28 : -24),
    w: 74,
    h: 8,
    kind: "one_way",
    routeGroupId,
    routeDirection: routeFocusChoice,
  };
};

export const buildRouteSealPlatform = (
  platforms: Platform[],
  routeGroupId: string,
  routeLockChoice: Exclude<RouteSelection, 0>,
  strength: number,
  disposition: PlatformerNpcDisposition,
  orientation: PlatformerNpcTarotOrientation,
  label: string,
): PlatformerNpcFieldPlatform | null => {
  const branchPlatform = platforms.find(
    (platform) =>
      platform.id === `${routeGroupId}-${routeLockChoice > 0 ? "high-a" : "low-a"}`,
  );
  if (!branchPlatform) return null;
  return {
    id: `field-route-seal-${routeGroupId}-${routeLockChoice > 0 ? "high" : "low"}`,
    fieldKind: "route_seal",
    label,
    color: orientation === "reversed" ? "rgba(248, 113, 113, 0.7)" : "rgba(251, 146, 60, 0.64)",
    disposition,
    tarotOrientation: orientation,
    strength,
    x: branchPlatform.x + 8,
    y: branchPlatform.y - 58,
    w: 12,
    h: 60,
    kind: "solid",
    routeGroupId,
    routeDirection: routeLockChoice,
  };
};

export const buildLiftEchoPlatform = (
  platforms: Platform[],
  playerX: number,
  oneWaySnapBonus: number,
  disposition: PlatformerNpcDisposition,
  orientation: PlatformerNpcTarotOrientation,
): PlatformerNpcFieldPlatform | null => {
  if (oneWaySnapBonus < 1.6) return null;
  const nearestLift = platforms
    .filter((platform) => platform.kind === "one_way")
    .map((platform) => ({
      platform,
      dist: Math.abs(platform.x + platform.w * 0.5 - playerX),
    }))
    .sort((a, b) => a.dist - b.dist)[0];
  if (!nearestLift || nearestLift.dist > 320) return null;
  const lift = nearestLift.platform;
  return {
    id: `field-lift-echo-${lift.id}`,
    fieldKind: "lift_echo",
    label: "ECHO STEP",
    color: getFieldPlatformColor(disposition, orientation),
    disposition,
    tarotOrientation: orientation,
    strength: clamp(oneWaySnapBonus / 5, 0.24, 1),
    x: lift.x + 22,
    y: lift.y - 34,
    w: Math.max(54, lift.w - 44),
    h: 8,
    kind: "one_way",
    routeGroupId: undefined,
    routeDirection: undefined,
  };
};

export const DRAFT_ECHO_LABELS = new Set(["MEND", "REVEAL", "WEAVE", "BALANCE", "BRIDGE", "OPEN"]);
export const DRAFT_GATE_LABELS = new Set(["OPEN", "BRIDGE", "RELEASE"]);
export const DRAFT_ROUTE_LOCK_LABELS = new Set(["SEAL", "VEIL", "STALL", "FRAY", "UNWEAVE", "TILT", "SEVER"]);
export const DRAFT_DECOY_LABELS = new Set(["VEIL", "UNWEAVE", "TILT"]);
export const DRAFT_SHADOW_PUZZLE_LABELS = new Set(["VEIL", "SEAL", "FRAY", "UNWEAVE", "STALL", "TILT", "SEVER"]);

export const oppositeRouteChoice = (choice: Exclude<RouteSelection, 0>): Exclude<RouteSelection, 0> =>
  choice > 0 ? -1 : 1;

export const getHabitRouteChoice = (
  playerVx: number,
  token: PlatformerPuzzleToken | null,
): Exclude<RouteSelection, 0> => {
  if (playerVx < -18) return -1;
  if (playerVx > 18) return 1;
  return getRouteChoiceFromToken(token);
};

export const getShadowPuzzleToken = (
  target: PlatformerPuzzleToken,
  draftLabel: string,
): PlatformerPuzzleToken => {
  if (draftLabel === "VEIL" || draftLabel === "SEAL" || draftLabel === "TILT") {
    if (target === "major" || target === "minor") return "mode";
    if (target === "npc") return "minor";
    return "npc";
  }
  if (target === "major") return "minor";
  if (target === "minor") return "major";
  if (target === "npc") return "mode";
  return "npc";
};

export const buildPedestalEchoPlatform = (
  pedestal: PlatformerPuzzlePedestal,
  disposition: PlatformerNpcDisposition,
  orientation: PlatformerNpcTarotOrientation,
  token: PlatformerPuzzleToken,
  strength: number,
): PlatformerNpcFieldPlatform => ({
  id: `field-pedestal-echo-${pedestal.id}`,
  fieldKind: "pedestal_echo",
  label: `ECHO ${describePlatformerPuzzleToken(token).toUpperCase()}`,
  color: getFieldPlatformColor(disposition, orientation),
  disposition,
  tarotOrientation: orientation,
  strength,
  x: pedestal.x - 38,
  y: pedestal.y - 36,
  w: 76,
  h: 8,
  kind: "one_way",
  routeGroupId: undefined,
  routeDirection: undefined,
});

export const buildDraftGateWindow = (
  gate: PlatformerResonanceGate,
  playerY: number,
  disposition: PlatformerNpcDisposition,
  orientation: PlatformerNpcTarotOrientation,
  label: string,
  strength: number,
): PlatformerNpcFieldGateWindow => {
  const h = 58;
  const y = clamp(playerY - h * 0.5, gate.y + 16, gate.y + gate.h - h - 14);
  return {
    gateId: gate.id,
    x: gate.x - 4,
    y,
    w: gate.w + 8,
    h,
    label,
    color: getFieldPlatformColor(disposition, orientation),
    disposition,
    tarotOrientation: orientation,
    strength,
  };
};
