/**
 * Completion intro pattern: builds intro pattern from theme and fallback phrase.
 * Extracted from platformerArrangement for LOC discipline and single-responsibility (STRUCTURE opt).
 */
import { clamp } from "../../shared/tuning/grid";
import {
  COMPLETION_INTRO_STEPS,
  dominantPhaseIndex,
  type CompletionIntroPattern,
  type CompletionTheme,
} from "./platformerArrangementTypes";
import {
  buildRootContour,
  fallbackPhraseSource,
  fallbackRootContour,
  normalizePitchClass,
} from "./platformerMotifHelpers";

export function buildCompletionIntroPattern(
  theme: CompletionTheme,
  fallbackPhrase: number[],
): CompletionIntroPattern {
  const phaseIndex = dominantPhaseIndex(theme.phaseWeights);
  const phaseLift = [0, 2, 5][phaseIndex] ?? 0;
  const tuningLift = Math.round(theme.tuningBias * 3);
  const forkLift = theme.forkBias > 0.2 ? 5 : theme.forkBias < -0.2 ? -2 : 0;
  const routeHighBias = theme.routeProfile.mode === "ceiling" || theme.routeProfile.mode === "climb";
  const routeLowBias = theme.routeProfile.mode === "floor" || theme.routeProfile.mode === "drop";
  const routeTravelLift = theme.routeProfile.splitMotion > 0.5 ? 2 : theme.routeProfile.splitMotion < -0.5 ? -2 : 0;
  const routeOrchestration = theme.routeOrchestration;
  const phrase = fallbackPhraseSource(fallbackPhrase);
  const ground = theme.groundMotif.length > 0 ? theme.groundMotif : phrase;
  const air = theme.airMotif.length > 0
    ? theme.airMotif
    : ground.map((semi, index) => semi + (index % 2 === 0 ? routeOrchestration.arpLift : routeOrchestration.responseShift) + tuningLift + Math.round(theme.forkBias * 2) + (routeHighBias ? 2 : 0));
  const accent = theme.accentMotif.length > 0 ? theme.accentMotif : ground.map((semi) => semi + 12 + phaseLift + forkLift + routeOrchestration.leadLift);
  const cadence = theme.cadenceMotif.length > 0 ? theme.cadenceMotif : phrase.slice(-4).map((semi) => semi + phaseLift + forkLift + routeOrchestration.responseShift);
  const roots = theme.rootContour.length > 0 ? theme.rootContour : buildRootContour([], fallbackRootContour(ground), 8);
  const lead = Array.from({ length: COMPLETION_INTRO_STEPS }, () => null as number | null);
  const answer = Array.from({ length: COMPLETION_INTRO_STEPS }, () => null as number | null);
  const bass = Array.from({ length: COMPLETION_INTRO_STEPS }, () => null as number | null);
  const energy = Array.from({ length: COMPLETION_INTRO_STEPS }, () => 0.2);
  const chordRoots = Array.from(
    { length: Math.max(2, Math.ceil(COMPLETION_INTRO_STEPS / 8)) },
    (_, bar) => roots[bar % roots.length] ?? normalizePitchClass(ground[bar % ground.length] ?? 0),
  );

  for (let step = 0; step < COMPLETION_INTRO_STEPS; step += 1) {
    const bar = Math.floor(step / 8);
    const stepInBar = step % 8;
    if (stepInBar % 2 === 0) {
      lead[step] = (ground[Math.floor(step / 2) % ground.length] ?? phrase[0] ?? 0) + tuningLift + Math.round(theme.forkBias * 2) + routeTravelLift + routeOrchestration.leadLift;
    }
    if (stepInBar === 2 || stepInBar === 5 || (phaseIndex === 1 && stepInBar === 3) || (routeHighBias && stepInBar === 1)) {
      answer[step] = air[Math.floor(step / 2) % air.length] ?? ((lead[Math.max(0, step - 1)] ?? 0) + 12 + tuningLift);
    }
    if (stepInBar === 6 || (routeHighBias && stepInBar === 4)) {
      answer[step] = accent[(bar + step) % accent.length] ?? answer[step];
    }
    if (stepInBar === 7) {
      lead[step] = cadence[bar % cadence.length] ?? lead[step] ?? phrase[0] ?? 0;
    }
    if (theme.restDensity > 0.42 && (stepInBar === 1 || stepInBar === 5)) {
      lead[step] = null;
      answer[step] = null;
    }
    if (stepInBar === 0 || stepInBar === 4) {
      bass[step] = (chordRoots[(bar * 2 + Math.floor(stepInBar / 4)) % chordRoots.length] ?? 0) - 12 + (phaseIndex === 0 ? 0 : phaseIndex === 2 ? -2 : 0) + (routeLowBias ? -2 : 0) + routeOrchestration.bassLift;
    }
    energy[step] = clamp(
      0.2
        + theme.strideDensity * 0.22
        + theme.airDensity * (stepInBar % 2 === 1 ? 0.18 : 0.08)
        + theme.accentDensity * (stepInBar === 0 || stepInBar === 7 ? 0.28 : 0.12)
        + theme.syncDensity * (stepInBar % 2 === 0 ? 0.12 : 0.2)
        + theme.phaseWeights[phaseIndex] * (stepInBar === 7 ? 0.16 : 0.05)
        + routeOrchestration.accentBias
        - theme.restDensity * (stepInBar % 2 === 1 ? 0.18 : 0.1),
      0.15,
      1,
    );
  }

  return {
    lengthSteps: COMPLETION_INTRO_STEPS,
    lead,
    answer,
    bass,
    accent: energy,
    chordRoots,
  };
}
