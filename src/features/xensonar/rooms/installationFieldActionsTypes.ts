import type { Dispatch, SetStateAction } from 'react';
import type { ChurchMode, GridTuning, Room } from '../types';
import type { MyzelTopologyMode } from '../../resonance/refactorTopologySupport';
import type {
  InstallationFieldConfig,
  InstallationNomadAttractorKey,
  InstallationResidentBallCouplingKey,
  InstallationResidentSoundPreset,
  InstallationResidentWaveExcitationKey,
} from '../../topology/installationFieldConfig';

export type BuildInstallationFieldActionsArgs = {
  setInstallationFieldConfig: Dispatch<SetStateAction<InstallationFieldConfig>>;
  retuneResidentsForConfig: (nextConfig: InstallationFieldConfig) => void;
  applyResidentModeForConfig: (nextConfig: InstallationFieldConfig) => void;
  updateNParams: (patch: Record<string, unknown>) => void;
  setMyzelModeAndPower: (mode: MyzelTopologyMode) => void;
  setRoom: (room: Room) => void;
};

export type InstallationFieldActions = {
  toggleInstallNomadAttractor: (key: InstallationNomadAttractorKey) => void;
  toggleInstallResidents: () => void;
  setInstallResidentVolumeLevel: (value: number) => void;
  setInstallResidentSystemValue: (system: GridTuning) => void;
  setInstallResidentModeValue: (mode: ChurchMode) => void;
  toggleInstallResidentWaveExcitation: (key: InstallationResidentWaveExcitationKey) => void;
  toggleInstallResidentBallCoupling: (key: InstallationResidentBallCouplingKey) => void;
  setInstallParticleSoundMode: (mode: 'normal' | 'all_off') => void;
  setInstallResidentSoundPreset: (preset: InstallationResidentSoundPreset) => void;
  setInstallResidentElasticPitch: (enabled: boolean) => void;
  openInstallationTopologyRoom: () => void;
};
