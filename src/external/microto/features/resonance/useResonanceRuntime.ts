import { useResonanceInput } from "./useResonanceInput";
import { useResonanceAudio } from "./useResonanceAudio";
import { useResonanceSimulation } from "./useResonanceSimulation";
import { useQuantizedParticleQueue } from "./useQuantizedParticleQueue";
import { useDrumBassScheduler } from "../sequencer/drumBassScheduler";

/**
 * Centralizes all resonance room runtime side effects behind a single hook.
 * Keeps `App.tsx` thinner while preserving existing behavior lock by simply
 * composing the existing room-scoped hooks.
 */
type ResonanceRuntimeArgs =
  & Parameters<typeof useResonanceInput>[0]
  & Parameters<typeof useResonanceAudio>[0]
  & Parameters<typeof useResonanceSimulation>[0]
  & Parameters<typeof useQuantizedParticleQueue>[0]
  & Parameters<typeof useDrumBassScheduler>[0];

export function useResonanceRuntime(args: ResonanceRuntimeArgs) {
  useQuantizedParticleQueue(args);
  useResonanceInput(args);
  useResonanceAudio(args);
  useResonanceSimulation(args);
  useDrumBassScheduler(args);
}
