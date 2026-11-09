import type { BuildResonancePanelRuntimeBindingsArgs } from './resonancePanelRuntimeBindings';

export type ResonanceControlRuntimePropKeys =
  | 'nParamsUI'
  | 'droneVolume'
  | 'transientDriveUi'
  | 'quantizeGrid'
  | 'particleQuantizeReferenceBars'
  | 'gridTempoBpm'
  | 'quantizeStepMs'
  | 'myzelEnabled'
  | 'myzelStep16ths'
  | 'updateNParams'
  | 'setChurchMode'
  | 'changeGridTuning'
  | 'setGridMode'
  | 'getTuningSteps'
  | 'commitResonanceCursorY'
  | 'nexusRefs'
  | 'quantizeAnchorRef'
  | 'waveCollisionQueueRef'
  | 'particleQuantizeSeenRef'
  | 'particleQuantizeTimerRef'
  | 'setQuantizeGrid'
  | 'setParticleQuantizeReferenceBars'
  | 'setGridTempoBpm'
  | 'setDroneVolume'
  | 'applyRealtimeDroneOvertones'
  | 'updateTransientDriveSource'
  | 'toggleMyzelEnabled'
  | 'setMyzelStep16ths'
  | 'installationFieldConfig'
  | 'toggleInstallResidents'
  | 'setInstallResidentVolumeLevel'
  | 'setInstallResidentSystemValue'
  | 'setInstallResidentModeValue'
  | 'openInstallationTopologyRoom';

export type ResonanceControlRuntimeProps = Pick<BuildResonancePanelRuntimeBindingsArgs, ResonanceControlRuntimePropKeys>;

export type ResonanceControlRuntimeSpreadProps = Omit<
  ResonanceControlRuntimeProps,
  'updateNParams' | 'commitResonanceCursorY' | 'nexusRefs'
>;
