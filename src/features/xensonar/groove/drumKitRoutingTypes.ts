import type { DrumKit } from '../domain/instrumentData';
import type { DrumLaneId } from '../drumPatternMachineTypes';

export type DrumLaneKitOverrides = Partial<Record<DrumLaneId, DrumKit>>;
export type DrumSoundPalette = {
  drumKit: DrumKit;
  drumLaneKits: DrumLaneKitOverrides;
};
