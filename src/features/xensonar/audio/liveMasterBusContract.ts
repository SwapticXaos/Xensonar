export type LiveMasterBusRole = "main" | "drone" | "rhythm" | "space";

export const LIVE_MASTER_BUS_ROLES: LiveMasterBusRole[] = ["main", "drone", "rhythm", "space"];

export type LiveMasterRoleFilterConfig = {
  low: number;
  mid: number;
  high: number;
  midFreq: number;
};

export const LIVE_MASTER_ROLE_FILTER_CONFIGS: Record<LiveMasterBusRole, LiveMasterRoleFilterConfig> = {
  main: { low: 180, mid: 1400, high: 4800, midFreq: 1400 },
  drone: { low: 120, mid: 260, high: 3200, midFreq: 260 },
  rhythm: { low: 90, mid: 1900, high: 6200, midFreq: 1900 },
  space: { low: 260, mid: 2400, high: 5600, midFreq: 2400 },
};

export function isNoDrumRecordingRole(role: LiveMasterBusRole): boolean {
  return role !== "rhythm";
}

export type LiveMasterEffectKey =
  | "collectiveMemory"
  | "psychedelicSpiral"
  | "transientDrive"
  | "enterHoldPsyFx"
  | "schwarmdeuter"
  | "myzelPostFx";

export const LIVE_MASTER_EFFECT_OUTPUT_ROLES: Record<LiveMasterEffectKey, LiveMasterBusRole> = {
  collectiveMemory: "main",
  psychedelicSpiral: "space",
  transientDrive: "main",
  enterHoldPsyFx: "main",
  schwarmdeuter: "space",
  myzelPostFx: "space",
};

export function resolveLiveMasterEffectOutputRole(effect: LiveMasterEffectKey): LiveMasterBusRole {
  return LIVE_MASTER_EFFECT_OUTPUT_ROLES[effect];
}
