/**
 * Audio engine boundary (vision §6: "Audio engine modules (drone, particles, drums, bass)").
 *
 * This module is the single entry point for shared one-shot tone API used across rooms.
 * - One-shot tones: createTonePlayer, PlayOneShotTone (below; implemented in shared/audio/tones).
 * - Drone / particles: features/resonance (useResonanceAudio, useQuantizedParticleQueue, useResonanceSimulation).
 * - Drums / bass: features/sequencer (drumBassScheduler).
 *
 * Import from here when you need the shared tone player or its type; keeps the audio engine
 * a named domain and aligns structure with project-vision.txt §6.
 */

export {
  createTonePlayer,
  type PlayOneShotTone,
} from "../../shared/audio/tones";
