import { DRUM_KITS, type DrumKit } from '../domain/instrumentData';
import type { DrumLaneId } from '../drumPatternMachineTypes';
import type { DrumVoice } from '../../resonance/drumMachineTypes';

import type { DrumLaneKitOverrides, DrumSoundPalette } from './drumKitRoutingTypes';

export type { DrumLaneKitOverrides, DrumSoundPalette } from './drumKitRoutingTypes';

export const DRUM_LANE_LABELS: Record<DrumLaneId, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hatClosed: 'HiHat zu',
  hatOpen: 'HiHat offen',
  clap: 'Clap',
  perc: 'Perc',
};

export function isDrumKit(value: unknown): value is DrumKit {
  return typeof value === 'string' && DRUM_KITS.some((entry) => entry.value === value);
}

export const DEFAULT_DRUM_LANE_KIT_OVERRIDES: DrumLaneKitOverrides = {
  kick: undefined,
  snare: undefined,
  hatClosed: undefined,
  hatOpen: undefined,
  clap: undefined,
  perc: undefined,
};

export function sanitizeDrumLaneKitOverrides(value: unknown): DrumLaneKitOverrides {
  if (!value || typeof value !== 'object') return { ...DEFAULT_DRUM_LANE_KIT_OVERRIDES };
  const source = value as Record<string, unknown>;
  const result: DrumLaneKitOverrides = { ...DEFAULT_DRUM_LANE_KIT_OVERRIDES };
  (Object.keys(DRUM_LANE_LABELS) as DrumLaneId[]).forEach((laneId) => {
    const raw = source[laneId];
    if (isDrumKit(raw)) result[laneId] = raw;
  });
  return result;
}


export function sanitizeDrumKit(value: unknown, fallback: DrumKit = 'dusty_tape'): DrumKit {
  return isDrumKit(value) ? value : fallback;
}

export function buildDrumSoundPalette(args: {
  drumKit?: unknown;
  laneKitOverrides?: unknown;
  fallbackKit?: DrumKit;
}): DrumSoundPalette {
  return {
    drumKit: sanitizeDrumKit(args.drumKit, args.fallbackKit),
    drumLaneKits: sanitizeDrumLaneKitOverrides(args.laneKitOverrides),
  };
}

export function mergeDrumLaneKitOverrides(
  primary?: DrumLaneKitOverrides | null,
  secondary?: DrumLaneKitOverrides | null,
): DrumLaneKitOverrides {
  const result: DrumLaneKitOverrides = {};
  (Object.keys(DRUM_LANE_LABELS) as DrumLaneId[]).forEach((laneId) => {
    result[laneId] = primary?.[laneId] ?? secondary?.[laneId] ?? undefined;
  });
  return result;
}

export function withDrumLaneKitOverride(
  current: DrumLaneKitOverrides | null | undefined,
  laneId: DrumLaneId,
  value: unknown,
): DrumLaneKitOverrides {
  const next = sanitizeDrumLaneKitOverrides(current);
  next[laneId] = isDrumKit(value) ? value : undefined;
  return next;
}

export function resolveDrumLaneKit(args: {
  laneId: DrumLaneId;
  globalKit: DrumKit;
  overrides?: DrumLaneKitOverrides | null;
}): DrumKit {
  return args.overrides?.[args.laneId] ?? args.globalKit;
}

export function resolveDrumVoiceKit(args: {
  voice: DrumVoice;
  globalKit: DrumKit;
  overrides?: DrumLaneKitOverrides | null;
}): DrumKit {
  const laneId: DrumLaneId = args.voice === 'hat_closed'
    ? 'hatClosed'
    : args.voice === 'hat_open'
      ? 'hatOpen'
      : args.voice;
  return resolveDrumLaneKit({ laneId, globalKit: args.globalKit, overrides: args.overrides });
}
