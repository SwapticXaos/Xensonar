import type { ResonanceControlRuntimeProps } from './resonanceControlRuntimeTypes';

export type AppResonanceControlStateBoundary = Pick<
  ResonanceControlRuntimeProps,
  | 'nParamsUI'
  | 'droneVolume'
  | 'transientDriveUi'
  | 'quantizeGrid'
  | 'particleQuantizeReferenceBars'
  | 'gridTempoBpm'
  | 'quantizeStepMs'
  | 'myzelEnabled'
  | 'myzelStep16ths'
  | 'installationFieldConfig'
>;

export type AppResonanceControlGridBoundary = Pick<
  ResonanceControlRuntimeProps,
  | 'updateNParams'
  | 'setChurchMode'
  | 'changeGridTuning'
  | 'setGridMode'
  | 'getTuningSteps'
  | 'commitResonanceCursorY'
  | 'setQuantizeGrid'
  | 'setParticleQuantizeReferenceBars'
  | 'setGridTempoBpm'
>;

export type AppResonanceControlTrafficRefsBoundary = Pick<
  ResonanceControlRuntimeProps,
  | 'nexusRefs'
  | 'quantizeAnchorRef'
  | 'waveCollisionQueueRef'
  | 'particleQuantizeSeenRef'
  | 'particleQuantizeTimerRef'
>;

export type AppResonanceControlToneActionsBoundary = Pick<
  ResonanceControlRuntimeProps,
  | 'setDroneVolume'
  | 'applyRealtimeDroneOvertones'
  | 'updateTransientDriveSource'
>;

export type AppResonanceControlMyzelInstallationBoundary = Pick<
  ResonanceControlRuntimeProps,
  | 'toggleMyzelEnabled'
  | 'setMyzelStep16ths'
  | 'toggleInstallResidents'
  | 'setInstallResidentVolumeLevel'
  | 'setInstallResidentSystemValue'
  | 'setInstallResidentModeValue'
  | 'openInstallationTopologyRoom'
>;

export type AppResonanceControlPanelBoundaryArgs = {
  state: AppResonanceControlStateBoundary;
  gridAndTuning: AppResonanceControlGridBoundary;
  trafficRefs: AppResonanceControlTrafficRefsBoundary;
  toneActions: AppResonanceControlToneActionsBoundary;
  myzelInstallation: AppResonanceControlMyzelInstallationBoundary;
};
