/**
 * Platformer NPC motion/pitch/tarot tuning and diatonic helpers.
 * Extracted from platformerNpcMusic for LOC discipline and clearer module boundary (vision §6 §8).
 */

import { clamp } from "../../shared/tuning/grid";
import type {
  PlatformerNpcAnimal,
  PlatformerNpcDisposition,
  PlatformerNpcTarotOrientation,
  PlatformerNpcTelemetry,
} from "./platformerNpcMusic";

const DIATONIC_ROOTS = [0, 2, 4, 5, 7, 9, 11] as const;

export function resolveDiatonicSemi(degreeIndex: number): number {
  const scaleLength = DIATONIC_ROOTS.length;
  const wrappedIndex = ((degreeIndex % scaleLength) + scaleLength) % scaleLength;
  const octave = Math.floor(degreeIndex / scaleLength);
  return DIATONIC_ROOTS[wrappedIndex] + octave * 12;
}

export function getDispositionMotionTuning(disposition: PlatformerNpcDisposition) {
  if (disposition === "guide") {
    return { intervalScale: 0.8, velocityScale: 0.84, lifeScale: 1.24, driftScale: 0.84 };
  }
  if (disposition === "trickster") {
    return { intervalScale: 0.92, velocityScale: 1.18, lifeScale: 0.92, driftScale: 1.14 };
  }
  return { intervalScale: 1.02, velocityScale: 1, lifeScale: 1.08, driftScale: 1.06 };
}

export function getTarotMotionTuning(
  disposition: PlatformerNpcDisposition,
  orientation: PlatformerNpcTarotOrientation,
) {
  const motion = getDispositionMotionTuning(disposition);
  if (orientation === "upright") return motion;
  return {
    intervalScale: motion.intervalScale * (disposition === "trickster" ? 0.96 : 1.02),
    velocityScale: motion.velocityScale * 1.06,
    lifeScale: motion.lifeScale * 0.92,
    driftScale: motion.driftScale * 1.08,
  };
}

export function getDispositionPitchBias(
  animal: PlatformerNpcAnimal,
  disposition: PlatformerNpcDisposition,
  telemetry: PlatformerNpcTelemetry,
) {
  const motionBias = telemetry.playerVx > 18 ? 2 : telemetry.playerVx < -18 ? -2 : 0;
  switch (animal) {
    case "wolf":
      return disposition === "trickster" ? 6 : disposition === "guide" ? 0 : motionBias;
    case "panda":
      return disposition === "guide" ? 7 : disposition === "mirror" ? 2 : -2;
    case "owl":
      return disposition === "mirror" ? (telemetry.actionDrive > 0.54 ? -5 : 5) : disposition === "trickster" ? 1 : 0;
    case "fox":
      return disposition === "trickster" ? (telemetry.lastMelodyToken === "minor" ? -1 : 1) : disposition === "guide" ? 4 : -4;
    case "frog":
      return disposition === "trickster" ? 2 : disposition === "guide" ? 5 : motionBias;
    case "camel":
      return disposition === "mirror" ? (telemetry.actionDrive > 0.52 ? 4 : 1) : disposition === "guide" ? 0 : 5;
    case "crane":
      return disposition === "mirror" ? (motionBias === 0 ? 5 : motionBias * 2 + 1) : disposition === "guide" ? 7 : 2;
    case "cat":
      return disposition === "guide" ? 4 : disposition === "trickster" ? 7 : 0;
  }
}

export function getTarotOrientation(
  animal: PlatformerNpcAnimal,
  disposition: PlatformerNpcDisposition,
  telemetry: PlatformerNpcTelemetry,
): PlatformerNpcTarotOrientation {
  const stuckPressure = clamp(telemetry.stuckTime / 7.5, 0, 1);
  const speedPressure = clamp(Math.abs(telemetry.playerVx) / 420, 0, 1);
  const shadowPressure = clamp(
    telemetry.actionDrive * 0.48
      + speedPressure * 0.24
      + (telemetry.lastMelodyToken === "minor" ? 0.08 : 0)
      + clamp((telemetry.solvedPedestals + telemetry.gatesOpen) * 0.04, 0, 0.14)
      + (telemetry.lives <= 2 ? 0.1 : 0),
    0,
    1,
  );
  const offset =
    animal === "panda"
      ? 0.12
      : animal === "cat"
        ? 0.08
        : animal === "wolf" || animal === "fox"
          ? -0.08
          : animal === "frog"
            ? -0.04
            : 0;
  if (disposition === "guide") {
    return shadowPressure > 0.72 + offset && stuckPressure < 0.42 ? "reversed" : "upright";
  }
  if (disposition === "trickster") {
    return shadowPressure > 0.46 + offset ? "reversed" : "upright";
  }
  return Math.abs(telemetry.actionDrive - 0.46) > 0.26 + offset * 0.4 ? "reversed" : "upright";
}
