/**
 * NPC field state builder: aggregates NPC auras, route votes, and manifest platforms.
 * Pure helpers moved to platformerNpcFieldHelpers.ts (vision §8, REFLECTION LOC discipline).
 */

import { clamp } from "../../shared/tuning/grid";
import { describePlatformerPuzzleToken,type PlatformerPuzzleToken } from "./platformerAdventure";
import {
buildDraftGateWindow,
buildLiftEchoPlatform,
buildPedestalEchoPlatform,
buildRouteBridgePlatform,
buildRouteHintLabel,
buildRouteSealPlatform,
buildStatusLabel,
DRAFT_DECOY_LABELS,
DRAFT_ECHO_LABELS,
DRAFT_GATE_LABELS,
DRAFT_ROUTE_LOCK_LABELS,
DRAFT_SHADOW_PUZZLE_LABELS,
getAuraColor,
getAuraRadius,
getHabitRouteChoice,
getNearestClosedGate,
getNearestClosedGateId,
getNextRouteGroupId,
getRouteVote,
getShadowPuzzleToken,
oppositeRouteChoice,
} from "./platformerNpcFieldHelpers";
import type {
PlatformerNpcFieldGateWindow,
PlatformerNpcFieldInput,
PlatformerNpcFieldPlatform,
PlatformerNpcFieldState
} from "./platformerNpcFieldTypes";
import type { PlatformerNpcDisposition,PlatformerNpcTarotOrientation } from "./platformerNpcMusic";
import type { RouteSelection } from "./platformerState";

export type {
PlatformerNpcFieldAura,
PlatformerNpcFieldGateWindow,
PlatformerNpcFieldInput,
PlatformerNpcFieldPlatform,
PlatformerNpcFieldState
} from "./platformerNpcFieldTypes";

export function buildPlatformerNpcFieldState(input: PlatformerNpcFieldInput): PlatformerNpcFieldState {
  let landingSnapBonus = 0;
  let oneWaySnapBonus = 0;
  let pedestalTouchBonus = 0;
  let puzzleTokenWindowBonus = 0;
  let pickupRadiusBonus = 0;
  let gravityDelta = 0;
  let tractionDelta = 0;
  let actionDriveBias = 0;
  let noteMagnetism = 0;
  let routeVote = 0;
  let routeHintLabel: string | null = null;
  let routeHintDisposition: PlatformerNpcDisposition | null = null;
  let routeHintOrientation: PlatformerNpcTarotOrientation | null = null;
  let routeSourceStrength = 0;
  let routeLockChoice: RouteSelection = 0;
  let routeLockStrength = 0;
  let routeLockLabel: string | null = null;
  let routeLockDisposition: PlatformerNpcDisposition | null = null;
  let routeLockOrientation: PlatformerNpcTarotOrientation | null = null;
  let decoyRouteChoice: RouteSelection = 0;
  let decoyRouteLabel: string | null = null;
  let strongestSupportDisposition: PlatformerNpcDisposition | null = null;
  let strongestSupportOrientation: PlatformerNpcTarotOrientation | null = null;
  let strongestSupportStrength = 0;
  let focusPedestalId: string | null = null;
  let focusLabel: string | null = null;
  let echoPuzzleToken: PlatformerPuzzleToken | null = null;
  let echoPuzzleLabel: string | null = null;
  let echoPuzzleStrength = 0;
  let echoPuzzleDisposition: PlatformerNpcDisposition | null = null;
  let echoPuzzleOrientation: PlatformerNpcTarotOrientation | null = null;
  let shadowPuzzleToken: PlatformerPuzzleToken | null = null;
  let shadowPuzzleLabel: string | null = null;
  let shadowPuzzleStrength = 0;
  let draftGateWindow: PlatformerNpcFieldGateWindow | null = null;
  let draftGateStrength = 0;
  let statusLabel: string | null = null;
  let strongestAuraStrength = 0;
  const stuckTime = clamp(input.t - input.lastProgressAt, 0, 12);
  const nextRouteGroupId = getNextRouteGroupId(input.routeSelections);
  const nextPedestalId = getNearestClosedGateId(input.puzzlePedestals, input.resonanceGates);
  const nextPedestal = nextPedestalId
    ? input.puzzlePedestals.find((pedestal) => pedestal.id === nextPedestalId) ?? null
    : null;
  const nearestClosedGate = getNearestClosedGate(input.resonanceGates, input.playerX);

  const auras = input.musicNpcs.flatMap((npc) => {
    const disposition = npc.disposition ?? "mirror";
    const orientation = npc.tarotOrientation ?? (disposition === "trickster" ? "reversed" : "upright");
    const draftLabel = (npc.loomActiveLabel ?? "").toUpperCase();
    const supportScale = orientation === "upright" ? 1 : 0.62;
    const disruptionScale = orientation === "upright" ? 0.84 : 1.08;
    const aspectLabel = orientation === "upright" ? npc.giftLabel ?? "clarity" : npc.shadowLabel ?? "friction";
    const radius = getAuraRadius(disposition);
    const dx = input.playerX - npc.x;
    const dy = input.playerY - npc.y;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) return [];
    const strength = clamp(1 - dist / radius, 0, 1);
    const focusThisAura =
      disposition === "mirror" && nextPedestal ? nextPedestal.id : null;

    if (
      (disposition === "guide" || disposition === "mirror")
      && orientation === "upright"
      && strength > strongestSupportStrength
    ) {
      strongestSupportStrength = strength;
      strongestSupportDisposition = disposition;
      strongestSupportOrientation = orientation;
    }

    if (disposition === "guide") {
      landingSnapBonus += strength * 5 * supportScale;
      oneWaySnapBonus += strength * 3.8 * supportScale;
      pedestalTouchBonus += strength * 3 * supportScale;
      puzzleTokenWindowBonus += strength * 0.16 * supportScale;
      pickupRadiusBonus += strength * 4 * supportScale;
      gravityDelta -= strength * 0.08 * supportScale;
      tractionDelta += strength * 0.06 * supportScale;
      noteMagnetism += strength * 0.08 * supportScale;
      if (npc.animal === "panda") {
        landingSnapBonus += strength * 4 * supportScale;
        oneWaySnapBonus += strength * 2.4 * supportScale;
        pedestalTouchBonus += strength * 1.8 * supportScale;
        puzzleTokenWindowBonus += strength * 0.12 * supportScale;
        pickupRadiusBonus += strength * 2.5 * supportScale;
        gravityDelta -= strength * 0.1 * supportScale;
      }
      if (npc.animal === "cat") {
        oneWaySnapBonus += strength * 1.4 * supportScale;
        noteMagnetism += strength * 0.1 * supportScale;
      }
      if (orientation === "reversed") {
        actionDriveBias += strength * 0.04;
        tractionDelta -= strength * 0.03;
      }
    } else if (disposition === "trickster") {
      tractionDelta -= strength * 0.16 * disruptionScale;
      actionDriveBias += strength * 0.12 * disruptionScale;
      if (npc.animal === "wolf") {
        tractionDelta -= strength * 0.08 * disruptionScale;
        actionDriveBias += strength * 0.06 * disruptionScale;
      }
      if (npc.animal === "fox") {
        actionDriveBias += strength * 0.04 * disruptionScale;
      }
      if (npc.animal === "frog") {
        tractionDelta -= strength * 0.04 * disruptionScale;
      }
      if (orientation === "upright") {
        landingSnapBonus += strength * 0.8;
        noteMagnetism += strength * 0.05;
      } else {
        gravityDelta += strength * 0.03;
      }
    } else {
      pedestalTouchBonus += strength * (orientation === "upright" ? 2.4 : 1.2);
      puzzleTokenWindowBonus += strength * (orientation === "upright" ? 0.12 : 0.05);
      pickupRadiusBonus += strength * (orientation === "upright" ? 1.5 : 0.9);
      noteMagnetism += strength * (orientation === "upright" ? 0.12 : 0.06);
      if (npc.animal === "owl") {
        pedestalTouchBonus += strength * (orientation === "upright" ? 1.2 : 0.5);
        noteMagnetism += strength * (orientation === "upright" ? 0.12 : 0.08);
      }
      if (npc.animal === "camel" || npc.animal === "crane") {
        oneWaySnapBonus += strength * (orientation === "upright" ? 1.6 : 0.8);
        landingSnapBonus += strength * (orientation === "upright" ? 1.25 : 0.7);
      }
      if (orientation === "reversed") {
        actionDriveBias += strength * 0.04;
      }
      if (!focusPedestalId && nextPedestal) {
        focusPedestalId = nextPedestal.id;
        focusLabel = describePlatformerPuzzleToken(nextPedestal.target);
      }
    }

    if (stuckTime > 6 && disposition === "guide") {
      pickupRadiusBonus += strength * 1.5 * supportScale;
      landingSnapBonus += strength * 1.5 * supportScale;
    }
    if (input.lastMelodyToken === "mode" && disposition === "mirror") {
      noteMagnetism += strength * (orientation === "upright" ? 0.04 : 0.02);
    }
    if (nextRouteGroupId) {
      const currentRouteVote = getRouteVote(
        npc,
        disposition,
        orientation,
        strength,
        nextPedestal?.target ?? null,
        input.playerVx,
      );
      routeVote += currentRouteVote;
      if (Math.abs(currentRouteVote) > routeSourceStrength) {
        routeSourceStrength = Math.abs(currentRouteVote);
        routeHintDisposition = disposition;
        routeHintOrientation = orientation;
      }
      if (DRAFT_ROUTE_LOCK_LABELS.has(draftLabel)) {
        const habitualChoice = getHabitRouteChoice(
          input.playerVx,
          nextPedestal?.target ?? input.lastMelodyToken,
        );
        const lockStrength =
          strength
          * (disposition === "trickster" ? 1.14 : disposition === "mirror" ? 0.96 : 0.78)
          * (orientation === "reversed" ? 1.08 : 0.92);
        if (lockStrength > routeLockStrength && lockStrength > 0.16) {
          routeLockStrength = lockStrength;
          routeLockChoice = habitualChoice;
          routeLockLabel = `${draftLabel} ${habitualChoice > 0 ? "HIGH" : "LOW"}`;
          routeLockDisposition = disposition;
          routeLockOrientation = orientation;
          if (DRAFT_DECOY_LABELS.has(draftLabel)) {
            const decoyChoice = oppositeRouteChoice(habitualChoice);
            decoyRouteChoice = decoyChoice;
            decoyRouteLabel = `MIRAGE ${decoyChoice > 0 ? "HIGH" : "LOW"}`;
          } else {
            decoyRouteChoice = 0;
            decoyRouteLabel = null;
          }
        }
      }
    }
    if (
      nextPedestal
      && DRAFT_ECHO_LABELS.has(draftLabel)
      && (orientation === "upright" || draftLabel === "BRIDGE")
    ) {
      const echoStrength =
        strength
        * (disposition === "guide" ? 1.12 : disposition === "mirror" ? 1 : 0.88)
        * (draftLabel === "REVEAL" || draftLabel === "MEND" ? 1.08 : 1);
      if (echoStrength > echoPuzzleStrength && echoStrength > 0.14) {
        echoPuzzleStrength = echoStrength;
        echoPuzzleToken = nextPedestal.target;
        echoPuzzleLabel = describePlatformerPuzzleToken(nextPedestal.target);
        echoPuzzleDisposition = disposition;
        echoPuzzleOrientation = orientation;
      }
    }
    if (
      nextPedestal
      && DRAFT_SHADOW_PUZZLE_LABELS.has(draftLabel)
      && (orientation === "reversed" || disposition === "trickster")
    ) {
      const shadowStrength =
        strength
        * (orientation === "reversed" ? 1.08 : 0.94)
        * (disposition === "trickster" ? 1.08 : disposition === "mirror" ? 0.98 : 0.84);
      const nextShadowToken = getShadowPuzzleToken(nextPedestal.target, draftLabel);
      if (shadowStrength > shadowPuzzleStrength && shadowStrength > 0.16) {
        shadowPuzzleStrength = shadowStrength;
        shadowPuzzleToken = nextShadowToken;
        shadowPuzzleLabel = describePlatformerPuzzleToken(nextShadowToken);
        if (!focusPedestalId) {
          focusPedestalId = nextPedestal.id;
          focusLabel = describePlatformerPuzzleToken(nextPedestal.target);
        }
      }
    }
    if (
      nearestClosedGate
      && DRAFT_GATE_LABELS.has(draftLabel)
      && Math.abs(nearestClosedGate.x + nearestClosedGate.w * 0.5 - input.playerX) < 380
    ) {
      const gateStrength =
        strength
        * (draftLabel === "OPEN" ? 1.16 : draftLabel === "BRIDGE" ? 1.08 : 0.96)
        * (orientation === "upright" ? 1 : 0.92);
      if (gateStrength > draftGateStrength && gateStrength > 0.16) {
        draftGateStrength = gateStrength;
        draftGateWindow = buildDraftGateWindow(
          nearestClosedGate,
          input.playerY,
          disposition,
          orientation,
          draftLabel,
          gateStrength,
        );
      }
    }
    if (strength > strongestAuraStrength) {
      strongestAuraStrength = strength;
      statusLabel = buildStatusLabel(npc, disposition, orientation, focusLabel);
    }

    return [{
      npcId: npc.id,
      animal: npc.animal,
      disposition,
      tarotTitle: npc.tarotTitle ?? "Arcana",
      tarotOrientation: orientation,
      modernRole: npc.modernRole ?? "Archetype",
      aspectLabel,
      x: npc.x,
      y: npc.y,
      radius,
      strength,
      color: getAuraColor(disposition),
      focusPedestalId: focusThisAura,
    }];
  });

  const routeFocusChoice: RouteSelection =
    nextRouteGroupId && Math.abs(routeVote) > 0.18
      ? routeVote > 0 ? 1 : -1
      : 0;
  const routeFocusStrength = routeFocusChoice === 0 ? 0 : clamp(Math.abs(routeVote), 0, 1);
  if (routeFocusChoice !== 0 && routeHintDisposition) {
    routeHintLabel = buildRouteHintLabel(routeHintDisposition, routeFocusChoice);
    if (statusLabel && routeHintLabel) {
      statusLabel = `${statusLabel} -> ${routeHintLabel.toLowerCase()}`;
    }
  }

  const manifestPlatforms: PlatformerNpcFieldPlatform[] = [];
  if (
    routeFocusChoice !== 0
    && nextRouteGroupId
    && routeHintDisposition
    && routeHintOrientation
  ) {
    const routeBridge = buildRouteBridgePlatform(
      input.platforms,
      nextRouteGroupId,
      routeFocusChoice,
      routeFocusStrength,
      routeHintDisposition,
      routeHintOrientation,
      routeHintLabel,
    );
    if (routeBridge) manifestPlatforms.push(routeBridge);
  }
  if (strongestSupportDisposition && strongestSupportOrientation) {
    const liftEcho = buildLiftEchoPlatform(
      input.platforms,
      input.playerX,
      oneWaySnapBonus,
      strongestSupportDisposition,
      strongestSupportOrientation,
    );
    if (liftEcho) manifestPlatforms.push(liftEcho);
  }
  if (
    routeLockChoice !== 0
    && nextRouteGroupId
    && routeLockDisposition
    && routeLockOrientation
    && routeLockLabel
  ) {
    const routeSeal = buildRouteSealPlatform(
      input.platforms,
      nextRouteGroupId,
      routeLockChoice,
      clamp(routeLockStrength, 0.22, 1),
      routeLockDisposition,
      routeLockOrientation,
      routeLockLabel,
    );
    if (routeSeal) manifestPlatforms.push(routeSeal);
    if (statusLabel) {
      statusLabel = `${statusLabel} -> ${String(routeLockLabel).toLowerCase()}`;
    }
  }
  if (
    nextPedestal
    && echoPuzzleToken
    && echoPuzzleDisposition
    && echoPuzzleOrientation
    && echoPuzzleStrength > 0.14
  ) {
    manifestPlatforms.push(
      buildPedestalEchoPlatform(
        nextPedestal,
        echoPuzzleDisposition,
        echoPuzzleOrientation,
        echoPuzzleToken,
        clamp(echoPuzzleStrength, 0.22, 1),
      ),
    );
    if (statusLabel && echoPuzzleLabel) {
      statusLabel = `${statusLabel} -> echo ${String(echoPuzzleLabel).toLowerCase()}`;
    }
  }
  if (statusLabel && shadowPuzzleLabel) {
    statusLabel = `${statusLabel} -> shadow ${String(shadowPuzzleLabel).toLowerCase()}`;
  }
  if (statusLabel && draftGateWindow) {
    statusLabel = `${statusLabel} -> ${String((draftGateWindow as { label?: string }).label ?? '').toLowerCase()} gate`;
  }

  return {
    landingSnapBonus: clamp(landingSnapBonus, 0, 12),
    oneWaySnapBonus: clamp(oneWaySnapBonus, 0, 9),
    pedestalTouchBonus: clamp(pedestalTouchBonus, 0, 12),
    puzzleTokenWindowBonus: clamp(puzzleTokenWindowBonus, 0, 0.5),
    pickupRadiusBonus: clamp(pickupRadiusBonus, 0, 8),
    gravityScale: clamp(1 + gravityDelta, 0.82, 1.04),
    tractionScale: clamp(1 + tractionDelta, 0.72, 1.12),
    actionDriveBias: clamp(actionDriveBias, 0, 0.22),
    noteMagnetism: clamp(noteMagnetism, 0, 0.32),
    routeFocusGroupId: routeFocusChoice === 0 ? null : nextRouteGroupId,
    routeFocusChoice,
    routeFocusStrength,
    routeHintLabel,
    routeHintDisposition,
    routeHintOrientation,
    routeLockGroupId: routeLockChoice === 0 ? null : nextRouteGroupId,
    routeLockChoice,
    routeLockStrength: clamp(routeLockStrength, 0, 1),
    routeLockLabel,
    decoyRouteChoice,
    decoyRouteLabel,
    focusPedestalId,
    focusLabel,
    echoPuzzleToken,
    echoPuzzleLabel,
    echoPuzzleStrength: clamp(echoPuzzleStrength, 0, 1),
    shadowPuzzleToken,
    shadowPuzzleLabel,
    shadowPuzzleStrength: clamp(shadowPuzzleStrength, 0, 1),
    draftGateWindow,
    statusLabel,
    auras,
    manifestPlatforms,
  };
}
