import type { BuildResonancePanelSuitePropsArgs } from '../rooms/resonancePanelCoordinatorTypes';

export type AppAuxPanelBoundaryKey =
  | 'parallelEffects'
  | 'grooveBass'
  | 'recordingTake'
  | 'burstDiagnostics';

export type AppAuxPanelBoundaryInputContractMap = Pick<
  BuildResonancePanelSuitePropsArgs,
  AppAuxPanelBoundaryKey
>;
