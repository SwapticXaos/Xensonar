import type { ChurchMode, GridTuning } from "../xensonar/domain/instrumentData";
import { getModesForSystem } from "../xensonar/domain/instrumentData";
import { DEFAULT_RESIDENT_VOLUME } from "./residentAudioPolicy";

export type InstallationNomadAttractorKey = "cursor" | "oscillatorBall";
export type InstallationResidentWaveExcitationKey = "sonarWaves";
export type InstallationResidentBallCouplingKey = "oscillatorBall";
export type BuiltInInstallationResidentSoundPreset = "glass_needle" | "wire_bow" | "hollow_wood" | "star_chime" | "resonance_pipe" | "signal_splitter";
export type InstallationResidentSoundPreset = BuiltInInstallationResidentSoundPreset | `sample:${string}`;

export type InstallationFieldConfig = {
  residentsEnabled: boolean;
  residentVolume: number;
  residentSystem: GridTuning;
  residentMode: ChurchMode;
  nomadAttractors: {
    cursor: boolean;
    oscillatorBall: boolean;
  };
  residentWaveExcitation: {
    sonarWaves: boolean;
  };
  residentBallCoupling: {
    oscillatorBall: boolean;
  };
  residentSound: InstallationResidentSoundPreset;
  residentElasticPitch: boolean;
};

export const DEFAULT_INSTALLATION_FIELD_CONFIG: InstallationFieldConfig = {
  residentsEnabled: true,
  residentVolume: DEFAULT_RESIDENT_VOLUME,
  residentSystem: "ji",
  residentMode: "chromatic",
  nomadAttractors: {
    cursor: false,
    oscillatorBall: true,
  },
  residentWaveExcitation: {
    sonarWaves: false,
  },
  residentBallCoupling: {
    oscillatorBall: true,
  },
  residentSound: "glass_needle",
  residentElasticPitch: false,
};

export const toggleInstallationNomadAttractor = (config: InstallationFieldConfig, key: InstallationNomadAttractorKey): InstallationFieldConfig => ({
  ...config,
  nomadAttractors: {
    ...config.nomadAttractors,
    [key]: !config.nomadAttractors[key],
  },
});

export const toggleInstallationResidentsEnabled = (config: InstallationFieldConfig): InstallationFieldConfig => ({
  ...config,
  residentsEnabled: !config.residentsEnabled,
});

export const setInstallationResidentVolume = (config: InstallationFieldConfig, residentVolume: number): InstallationFieldConfig => ({
  ...config,
  residentVolume: Math.min(1, Math.max(0, residentVolume)),
});

export const setInstallationResidentSystem = (config: InstallationFieldConfig, residentSystem: GridTuning): InstallationFieldConfig => {
  const residentMode = getModesForSystem(residentSystem).some((entry) => entry.value === config.residentMode)
    ? config.residentMode
    : (getModesForSystem(residentSystem)[0]?.value ?? "chromatic") as ChurchMode;
  return {
    ...config,
    residentSystem,
    residentMode,
  };
};

export const setInstallationResidentMode = (config: InstallationFieldConfig, residentMode: ChurchMode): InstallationFieldConfig => ({
  ...config,
  residentMode,
});

export const toggleInstallationResidentWaveExcitation = (config: InstallationFieldConfig, key: InstallationResidentWaveExcitationKey): InstallationFieldConfig => ({
  ...config,
  residentWaveExcitation: {
    ...config.residentWaveExcitation,
    [key]: !config.residentWaveExcitation[key],
  },
});

export const toggleInstallationResidentBallCoupling = (config: InstallationFieldConfig, key: InstallationResidentBallCouplingKey): InstallationFieldConfig => ({
  ...config,
  residentBallCoupling: {
    ...config.residentBallCoupling,
    [key]: !config.residentBallCoupling[key],
  },
});

export const setInstallationResidentSound = (config: InstallationFieldConfig, residentSound: InstallationResidentSoundPreset): InstallationFieldConfig => ({
  ...config,
  residentSound,
});

export const setInstallationResidentElasticPitch = (config: InstallationFieldConfig, residentElasticPitch: boolean): InstallationFieldConfig => ({
  ...config,
  residentElasticPitch: !!residentElasticPitch,
});
