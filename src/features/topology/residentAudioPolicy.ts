export const DEFAULT_RESIDENT_VOLUME = 0.32;
export const RESIDENT_COLLISION_GAIN_SCALE = 0.72;

export function scaleResidentCollisionAmplitude(value: number) {
  return value * RESIDENT_COLLISION_GAIN_SCALE;
}
