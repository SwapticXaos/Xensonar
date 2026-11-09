import type { DrumKit } from './domain/instrumentData';
import type { DrumLaneKitOverrides } from './groove/drumKitRoutingTypes';

export type DrumConfigMode = 'preset' | 'exported';
export type DrumConfigPatch = {
  drumConfigMode?: DrumConfigMode;
  drumConfigId?: string;
  drumKit?: DrumKit;
  drumLaneKits?: DrumLaneKitOverrides;
};
