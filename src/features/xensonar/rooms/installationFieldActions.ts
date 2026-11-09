import {
  setInstallationResidentMode,
  setInstallationResidentSound,
  setInstallationResidentSystem,
  setInstallationResidentVolume,
  setInstallationResidentElasticPitch,
  toggleInstallationNomadAttractor,
  toggleInstallationResidentBallCoupling,
  toggleInstallationResidentWaveExcitation,
  toggleInstallationResidentsEnabled,
} from '../../topology/installationFieldConfig';
import type { BuildInstallationFieldActionsArgs, InstallationFieldActions } from './installationFieldActionsTypes';

export function buildInstallationFieldActions(args: BuildInstallationFieldActionsArgs): InstallationFieldActions {
  return {
    toggleInstallNomadAttractor: (key) => {
      args.setInstallationFieldConfig((prev) => toggleInstallationNomadAttractor(prev, key));
    },
    toggleInstallResidents: () => {
      args.setInstallationFieldConfig((prev) => toggleInstallationResidentsEnabled(prev));
    },
    setInstallResidentVolumeLevel: (value) => {
      args.setInstallationFieldConfig((prev) => setInstallationResidentVolume(prev, value));
    },
    setInstallResidentSystemValue: (system) => {
      args.setInstallationFieldConfig((prev) => {
        const next = setInstallationResidentSystem(prev, system);
        args.retuneResidentsForConfig(next);
        return next;
      });
    },
    setInstallResidentModeValue: (mode) => {
      args.setInstallationFieldConfig((prev) => {
        const next = setInstallationResidentMode(prev, mode);
        args.applyResidentModeForConfig(next);
        return next;
      });
    },
    toggleInstallResidentWaveExcitation: (key) => {
      args.setInstallationFieldConfig((prev) => toggleInstallationResidentWaveExcitation(prev, key));
    },
    toggleInstallResidentBallCoupling: (key) => {
      args.setInstallationFieldConfig((prev) => toggleInstallationResidentBallCoupling(prev, key));
    },
    setInstallParticleSoundMode: (mode) => {
      args.updateNParams({ particleMute: mode === 'all_off' });
    },
    setInstallResidentSoundPreset: (preset) => {
      args.setInstallationFieldConfig((prev) => setInstallationResidentSound(prev, preset));
    },
    setInstallResidentElasticPitch: (enabled) => {
      args.setInstallationFieldConfig((prev) => setInstallationResidentElasticPitch(prev, enabled));
    },
    openInstallationTopologyRoom: () => {
      args.setMyzelModeAndPower('installation');
      args.setRoom('TOPOLOGY');
    },
  };
}
