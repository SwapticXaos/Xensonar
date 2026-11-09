import { clamp } from "../../shared/tuning/grid";
import type { PlatformerRouteProfile } from "./platformerRouteProfile";

export type PlatformerRouteOrchestration = {
  colorLabel: string;
  grooveLabel: string;
  leadVoiceLabel: string;
  leadWave: OscillatorType;
  answerWave: OscillatorType;
  arpWave: OscillatorType;
  padWave: OscillatorType;
  bassWave: OscillatorType;
  ghostWave: OscillatorType;
  leadLift: number;
  arpLift: number;
  bassLift: number;
  responseShift: number;
  filterBias: number;
  accentBias: number;
  harmonicLift: number;
  drumBias: number;
  hatBias: number;
  ghostBias: number;
  tempoBias: number;
};

export const buildPlatformerRouteOrchestration = (
  profile: PlatformerRouteProfile,
): PlatformerRouteOrchestration => {
  const branchBias = clamp(profile.branchBias, -1, 1);
  const splitMotion = clamp(profile.splitMotion, -2, 2);
  const highLean = Math.max(0, branchBias);
  const lowLean = Math.max(0, -branchBias);
  const climbLean = Math.max(0, splitMotion) * 0.5;
  const dropLean = Math.max(0, -splitMotion) * 0.5;

  if (profile.mode === "ceiling") {
    return {
      colorLabel: "CANOPY",
      grooveLabel: "shimmer hats",
      leadVoiceLabel: "saw lead",
      leadWave: "sawtooth",
      answerWave: "triangle",
      arpWave: "triangle",
      padWave: "sine",
      bassWave: "triangle",
      ghostWave: "square",
      leadLift: 4 + Math.round(highLean * 2),
      arpLift: 14 + Math.round(highLean * 2),
      bassLift: -2,
      responseShift: 7,
      filterBias: 540 + highLean * 360,
      accentBias: 0.08 + highLean * 0.04,
      harmonicLift: 1.2 + highLean * 0.12,
      drumBias: 0.94,
      hatBias: 1.26 + highLean * 0.1,
      ghostBias: 1.18,
      tempoBias: 0.02,
    };
  }

  if (profile.mode === "floor") {
    return {
      colorLabel: "SUBFLOOR",
      grooveLabel: "heavy pulse",
      leadVoiceLabel: "triangle lead",
      leadWave: "triangle",
      answerWave: "sine",
      arpWave: "sine",
      padWave: "triangle",
      bassWave: "sine",
      ghostWave: "square",
      leadLift: -1 - Math.round(lowLean * 2),
      arpLift: 9,
      bassLift: -7 - Math.round(lowLean * 2),
      responseShift: -5,
      filterBias: -320 - lowLean * 220,
      accentBias: 0.03,
      harmonicLift: 0.92 - lowLean * 0.04,
      drumBias: 1.18 + lowLean * 0.12,
      hatBias: 0.82,
      ghostBias: 0.92,
      tempoBias: -0.015,
    };
  }

  if (profile.mode === "climb") {
    return {
      colorLabel: "ASCENT",
      grooveLabel: "rising drive",
      leadVoiceLabel: "bright reed",
      leadWave: "sawtooth",
      answerWave: "triangle",
      arpWave: "square",
      padWave: "triangle",
      bassWave: "triangle",
      ghostWave: "square",
      leadLift: 5 + Math.round(climbLean * 4),
      arpLift: 16 + Math.round(climbLean * 2),
      bassLift: -3,
      responseShift: 7,
      filterBias: 620 + climbLean * 320,
      accentBias: 0.1 + climbLean * 0.03,
      harmonicLift: 1.24 + climbLean * 0.08,
      drumBias: 1.02,
      hatBias: 1.2 + climbLean * 0.08,
      ghostBias: 1.24,
      tempoBias: 0.03,
    };
  }

  if (profile.mode === "drop") {
    return {
      colorLabel: "GRAVITY",
      grooveLabel: "falling thump",
      leadVoiceLabel: "square stab",
      leadWave: "square",
      answerWave: "triangle",
      arpWave: "triangle",
      padWave: "sine",
      bassWave: "sine",
      ghostWave: "triangle",
      leadLift: -3 - Math.round(dropLean * 3),
      arpLift: 10,
      bassLift: -9 - Math.round(dropLean * 2),
      responseShift: -7,
      filterBias: -460 - dropLean * 260,
      accentBias: 0.06,
      harmonicLift: 0.96,
      drumBias: 1.14 + dropLean * 0.08,
      hatBias: 0.9,
      ghostBias: 1.04,
      tempoBias: -0.01,
    };
  }

  return {
    colorLabel: branchBias >= 0 ? "CENTERLINE+" : "CENTERLINE-",
    grooveLabel: branchBias >= 0 ? "even shimmer" : "even pulse",
    leadVoiceLabel: branchBias >= 0 ? "triangle lead" : "sine lead",
    leadWave: branchBias >= 0 ? "triangle" : "sine",
    answerWave: "sine",
    arpWave: branchBias >= 0 ? "triangle" : "sine",
    padWave: "sine",
    bassWave: "sine",
    ghostWave: "square",
    leadLift: Math.round(branchBias * 2),
    arpLift: 12 + Math.round(highLean * 2),
    bassLift: -4 - Math.round(lowLean * 2),
    responseShift: branchBias >= 0 ? 7 : -5,
    filterBias: branchBias * 220,
    accentBias: 0.04 + Math.abs(branchBias) * 0.02,
    harmonicLift: 1 + highLean * 0.08 - lowLean * 0.04,
    drumBias: 1 + lowLean * 0.08,
    hatBias: 1 + highLean * 0.08,
    ghostBias: 1 + Math.abs(splitMotion) * 0.04,
    tempoBias: branchBias * 0.01,
  };
};
