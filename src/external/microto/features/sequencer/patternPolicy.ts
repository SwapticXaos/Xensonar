import { type BassPattern, type DrumPattern } from "../resonance/config/types";

export type DrumTriggers = {
  kick: boolean;
  snare: boolean;
  hat: boolean;
};

export type BassTrigger = {
  freq: number;
  durMul: number;
} | null;

export const resolveDrumTriggers = (args: {
  drumPattern: DrumPattern;
  baseStep: number;
  finalHit: boolean;
  finalNearHit: boolean;
  heavyHitAllowed: boolean;
}): DrumTriggers => {
  const { drumPattern, baseStep, finalHit, finalNearHit, heavyHitAllowed } = args;

  if (drumPattern === "trip_hop") {
    return {
      kick: (baseStep === 0 || baseStep === 10) && finalHit && heavyHitAllowed,
      snare: (baseStep === 4 || baseStep === 12) && finalHit && heavyHitAllowed,
      hat: baseStep % 2 === 0 && finalNearHit,
    };
  }

  if (drumPattern === "four_on_floor") {
    return {
      kick: baseStep % 4 === 0 && finalHit && heavyHitAllowed,
      snare: (baseStep === 4 || baseStep === 12) && finalHit && heavyHitAllowed,
      hat: baseStep % 4 === 2 && finalNearHit,
    };
  }

  if (drumPattern === "breakbeat") {
    return {
      kick: (baseStep === 0 || baseStep === 5 || baseStep === 8) && finalHit && heavyHitAllowed,
      snare: (baseStep === 4 || baseStep === 12) && finalHit && heavyHitAllowed,
      hat: baseStep % 2 !== 0 && finalNearHit,
    };
  }

  return {
    kick: (baseStep === 0 || baseStep === 7 || baseStep === 9 || baseStep === 14) && finalHit && heavyHitAllowed,
    snare: (baseStep === 4 || baseStep === 11) && finalHit && heavyHitAllowed,
    hat: finalNearHit,
  };
};

export const isDrumCascadeAnchor = (args: {
  baseStep: number;
  finalHit: boolean;
  heavyHitAllowed: boolean;
}) => args.baseStep % 4 === 0 && args.finalHit && args.heavyHitAllowed;

export const resolveBassTrigger = (args: {
  bassPattern: BassPattern;
  baseStep: number;
  finalHit: boolean;
  bassHitAllowed: boolean;
  root: number;
}): BassTrigger => {
  const { bassPattern, baseStep, finalHit, bassHitAllowed, root } = args;
  if (!finalHit || !bassHitAllowed) return null;

  if (bassPattern === "offbeat") {
    if (baseStep % 4 !== 2) return null;
    return { freq: root, durMul: 1.5 };
  }

  if (bassPattern === "walking") {
    if (baseStep % 4 !== 0) return null;
    const intervals = [1, 1.189, 1.333, 1.498];
    return { freq: root * intervals[Math.floor(baseStep / 4) % 4], durMul: 1.8 };
  }

  if (bassPattern === "stotter") {
    if (![0, 1, 3, 4, 6, 8, 9, 11, 14].includes(baseStep)) return null;
    return { freq: root * (baseStep % 8 === 0 ? 1 : 1.5), durMul: 0.8 };
  }

  if (baseStep % 2 !== 0) return null;
  const intervals = [1, 1.5, 2, 2.5];
  return { freq: root * intervals[Math.floor(baseStep / 2) % 4], durMul: 1.5 };
};
