import type { DrumKit } from './domain/instrumentData';
import type { DrumLaneKitOverrides } from './groove/drumKitRoutingTypes';

export type DrumPlaylistPatternOption = { value: string; label: string };
export type DrumPlaylistConfigOption = { id: string; name: string; bars: number; drumKit: DrumKit; laneKitOverrides?: DrumLaneKitOverrides };
export type DrumPlaylistEntry = {
  id: string;
  kind: 'preset' | 'exported';
  value: string;
  name: string;
  bars?: number;
  drumKit?: DrumKit;
  laneKitOverrides?: DrumLaneKitOverrides;
};

export type DrumPlaylistState = {
  orderedIds: string[];
  hiddenIds: string[];
  aliases: Record<string, string>;
};
