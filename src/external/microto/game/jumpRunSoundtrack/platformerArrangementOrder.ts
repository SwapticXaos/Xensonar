/**
 * Platformer arrangement: section variants and form order resolution.
 * Extracted from platformerArrangement for LOC discipline and single-responsibility (vision §8).
 */
import { clamp } from "../../shared/tuning/grid";
import { CHORDS } from "./platformerState";
import {
  applyPlatformerSectionBiasToOrder,
  type PlatformerSectionBias,
} from "./platformerSectionBias";
import {
  dominantPhaseIndex,
  type CompletionPattern,
  type CompletionTheme,
  type MovementEvent,
  type PlatformerArrangementForm,
  type PlatformerArrangementMode,
} from "./platformerArrangementTypes";

export const clonePattern = (pattern: CompletionPattern): CompletionPattern => ({
  lengthSteps: pattern.lengthSteps,
  lead: [...pattern.lead],
  arp: [...pattern.arp],
  bass: [...pattern.bass],
  kick: [...pattern.kick],
  snare: [...pattern.snare],
  hat: [...pattern.hat],
  ghost: [...pattern.ghost],
  accent: [...pattern.accent],
  tension: [...pattern.tension],
  barRoots: [...pattern.barRoots],
  barChords: pattern.barChords.map((chord) => [...chord]),
  swing: pattern.swing,
  density: pattern.density,
  airRatio: pattern.airRatio,
});

export const getArrangementModeProfile = (mode: PlatformerArrangementMode) => {
  if (mode === "cinematic") {
    return {
      mutation: 0.84,
      drumBias: 0.82,
      hatBias: 0.9,
      harmonicLift: 1.28,
      glitchChance: 0.08,
      swingPush: 0.78,
      tempoScale: 0.95,
    };
  }
  if (mode === "percussive") {
    return {
      mutation: 1.18,
      drumBias: 1.35,
      hatBias: 1.4,
      harmonicLift: 0.92,
      glitchChance: 0.1,
      swingPush: 1.1,
      tempoScale: 1.06,
    };
  }
  if (mode === "glitch") {
    return {
      mutation: 1.34,
      drumBias: 1.08,
      hatBias: 1.22,
      harmonicLift: 1.06,
      glitchChance: 0.32,
      swingPush: 1.2,
      tempoScale: 1.02,
    };
  }
  return {
    mutation: 1,
    drumBias: 1,
    hatBias: 1,
    harmonicLift: 1,
    glitchChance: 0.12,
    swingPush: 1,
    tempoScale: 1,
  };
};

export const createSectionVariant = (
  base: CompletionPattern,
  section: "A" | "B" | "C",
  mode: PlatformerArrangementMode,
  theme: CompletionTheme,
): CompletionPattern => {
  const profile = getArrangementModeProfile(mode);
  const routeOrchestration = theme.routeOrchestration;
  const out = clonePattern(base);
  if (section === "A") return out;

  const length = out.lengthSteps;
  const leadLift = Math.round((section === "B" ? 2 : 4) * profile.harmonicLift * routeOrchestration.harmonicLift) + routeOrchestration.leadLift;
  const accentLift = (section === "B" ? 0.06 : 0.1) + routeOrchestration.accentBias * 0.5;
  const tensionLift = section === "B" ? 0.05 : 0.12;
  for (let step = 0; step < length; step += 1) {
    if (out.lead[step] != null && step % 8 === 0) {
      out.lead[step] = (out.lead[step] as number) + leadLift;
    }
    if (out.arp[step] == null && out.lead[step] != null && (section === "C" ? step % 2 === 1 : step % 4 === 3)) {
      out.arp[step] = (out.lead[step] as number) + (section === "C" ? 24 : 12);
    }
    if (step % 8 === 2 || (mode === "percussive" && step % 4 === 0) || (routeOrchestration.drumBias > 1.08 && step % 8 === 6)) out.kick[step] = true;
    if (step % 16 === 14 || (section === "C" && step % 4 === 1) || (mode === "percussive" && step % 8 === 6)) {
      out.snare[step] = true;
    }
    if (step % 4 !== 0 || section === "C" || mode !== "cinematic" || routeOrchestration.hatBias > 1.1) out.hat[step] = true;
    if ((section === "C" && step % 2 === 0) || (routeOrchestration.ghostBias > 1.1 && step % 8 === 5)) out.ghost[step] = true;
    if (mode === "cinematic" && step % 8 === 0 && out.lead[step] != null) {
      out.arp[(step + 2) % length] = (out.lead[step] as number) + 12;
    }
    if (mode === "glitch" && step % 16 === 7 && out.lead[step] != null) {
      out.lead[step] = (out.lead[step] as number) + (step % 2 === 0 ? 12 : -12);
    }
    out.accent[step] = clamp(out.accent[step] * (section === "B" ? 1.08 : 1.12) + (step % 4 === 0 ? accentLift : 0), 0.2, 1);
    out.tension[step] = clamp(out.tension[step] * (section === "B" ? 1.06 : 1.18) + tensionLift, 0.12, 1);
  }

  out.barRoots = out.barRoots.map((root, bar) => {
    if (section === "B") return root + (bar % 2 === 0 ? 2 : 0) + Math.round(routeOrchestration.harmonicLift - 1);
    return root + (bar % 2 === 0 ? 5 : 2) + Math.round((routeOrchestration.harmonicLift - 1) * 2);
  });
  out.barChords = out.barRoots.map((root, bar) => {
    const sourceShift = section === "B" ? 1 : 2;
    const source = CHORDS[(bar + sourceShift) % CHORDS.length] ?? CHORDS[0];
    return source.map((semi) => semi + root);
  });
  out.swing = clamp(out.swing + (section === "B" ? 0.012 : 0.02) * profile.swingPush, 0.012, 0.16);
  out.density = clamp(out.density + (section === "B" ? 0.15 : 0.3), 0.2, 2.2);
  out.airRatio = clamp(out.airRatio + (section === "B" ? 0.04 : 0.09), 0, 1);
  return out;
};

export const resolveArrangementOrder = (
  base: CompletionPattern,
  variety: number,
  orderedEvents: MovementEvent[],
  mode: PlatformerArrangementMode,
  selectedForm: PlatformerArrangementForm,
  theme: CompletionTheme,
  selectedSectionBias: PlatformerSectionBias,
): number[] => {
  if (selectedForm === "aaba") return [0, 0, 1, 0];
  if (selectedForm === "abab") return [0, 1, 0, 1];
  if (selectedForm === "abca") return [0, 1, 2, 0];
  if (selectedForm === "abcb") return [0, 1, 2, 1];
  if (selectedForm === "abac") return [0, 1, 0, 2];

  let order = [0, 1, 2, 1];
  if (theme.routeProfile.mode === "climb") {
    order = [0, 1, 2, 2];
  } else if (theme.routeProfile.mode === "drop") {
    order = [0, 2, 1, 0];
  } else if (theme.routeProfile.mode === "ceiling") {
    order = [0, 1, 2, 2];
  } else if (theme.routeProfile.mode === "floor") {
    order = [0, 0, 1, 2];
  }
  const phaseIndex = dominantPhaseIndex(theme.phaseWeights);
  const phaseSpread = Math.max(...theme.phaseWeights) - Math.min(...theme.phaseWeights);
  if (phaseSpread > 0.12) {
    if (phaseIndex === 0) {
      order = [0, 0, 1, 2];
    } else if (phaseIndex === 1) {
      order = [0, 1, 2, 1];
    } else {
      order = [0, 1, 2, 2];
    }
  }
  if (theme.forkBias > 0.32) {
    order = [0, 1, 2, 2];
  } else if (theme.forkBias < -0.32) {
    order = [0, 0, 1, 2];
  }
  if (theme.restDensity > 0.36) {
    order = [0, 1, 0, 2];
  }
  if (base.airRatio > 0.56) {
    order = [0, 1, 2, 2];
  } else if (base.density < 0.45) {
    order = [0, 0, 1, 2];
  } else if (base.density > 1.05 && variety >= 7) {
    order = [0, 1, 2, 1, 2, 1];
  } else if (orderedEvents.length < 16) {
    order = [0, 1, 0, 1];
  }
  if (mode === "cinematic" && order.length < 5) {
    order = [0, 1, 2, 1, 2];
  } else if (mode === "percussive") {
    order = [0, 1, 1, 2, 1];
  } else if (mode === "glitch") {
    order = [0, 2, 1, 2, 0, 1];
  }
  return applyPlatformerSectionBiasToOrder(order, selectedSectionBias);
};
