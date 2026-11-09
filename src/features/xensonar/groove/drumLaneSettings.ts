import type { DrumLaneId } from '../drumPatternMachineTypes';

export type DrumLaneChokeGroup = 'none' | 'hat';

export type DrumLaneMixSettings = {
  level: number;
  decay: number;
  pan: number;
  chokeGroup: DrumLaneChokeGroup;
};

export type DrumLaneSettingsMap = Record<DrumLaneId, DrumLaneMixSettings>;

export const DEFAULT_DRUM_LANE_SETTINGS: DrumLaneSettingsMap = {
  kick: { level: 1, decay: 1, pan: 0, chokeGroup: 'none' },
  snare: { level: 1, decay: 1, pan: 0, chokeGroup: 'none' },
  hatClosed: { level: 1, decay: 1, pan: -0.12, chokeGroup: 'hat' },
  hatOpen: { level: 1, decay: 1, pan: 0.14, chokeGroup: 'hat' },
  clap: { level: 1, decay: 1, pan: 0.08, chokeGroup: 'none' },
  perc: { level: 1, decay: 1, pan: 0.18, chokeGroup: 'none' },
};

const DRUM_LANE_IDS = Object.keys(DEFAULT_DRUM_LANE_SETTINGS) as DrumLaneId[];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const asFiniteOr = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

export function cloneDrumLaneSettingsMap(value?: DrumLaneSettingsMap | null): DrumLaneSettingsMap {
  const source = value ?? DEFAULT_DRUM_LANE_SETTINGS;
  return Object.fromEntries(
    DRUM_LANE_IDS.map((laneId) => [laneId, { ...DEFAULT_DRUM_LANE_SETTINGS[laneId], ...(source?.[laneId] ?? {}) }]),
  ) as DrumLaneSettingsMap;
}

export function sanitizeDrumLaneSettings(value: unknown): DrumLaneSettingsMap {
  if (!value || typeof value !== 'object') return cloneDrumLaneSettingsMap();
  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    DRUM_LANE_IDS.map((laneId) => {
      const base = DEFAULT_DRUM_LANE_SETTINGS[laneId];
      const raw = source[laneId];
      if (!raw || typeof raw !== 'object') return [laneId, { ...base }];
      const candidate = raw as Record<string, unknown>;
      const chokeGroup = candidate.chokeGroup === 'hat' ? 'hat' : 'none';
      return [
        laneId,
        {
          level: clamp(asFiniteOr(candidate.level, base.level), 0, 2),
          decay: clamp(asFiniteOr(candidate.decay, base.decay), 0.25, 2),
          pan: clamp(asFiniteOr(candidate.pan, base.pan), -1, 1),
          chokeGroup,
        },
      ];
    }),
  ) as DrumLaneSettingsMap;
}

export { mergeDrumLaneKitOverrides } from './drumKitRouting';

export function resolveDrumLaneSettings(args: { laneId: DrumLaneId; laneSettings?: DrumLaneSettingsMap | null }): DrumLaneMixSettings {
  return args.laneSettings?.[args.laneId] ?? DEFAULT_DRUM_LANE_SETTINGS[args.laneId];
}
