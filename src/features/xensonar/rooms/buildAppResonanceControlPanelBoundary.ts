import type { ResonanceControlRuntimeProps } from './resonanceControlRuntimeTypes';
import type { AppResonanceControlPanelBoundaryArgs } from './appResonanceControlPanelBoundaryTypes';
export type {
  AppResonanceControlGridBoundary,
  AppResonanceControlMyzelInstallationBoundary,
  AppResonanceControlPanelBoundaryArgs,
  AppResonanceControlStateBoundary,
  AppResonanceControlToneActionsBoundary,
  AppResonanceControlTrafficRefsBoundary,
} from './appResonanceControlPanelBoundaryTypes';

export function buildAppResonanceControlPanelBoundary({
  state,
  gridAndTuning,
  trafficRefs,
  toneActions,
  myzelInstallation,
}: AppResonanceControlPanelBoundaryArgs): ResonanceControlRuntimeProps {
  return {
    ...state,
    ...gridAndTuning,
    ...trafficRefs,
    ...toneActions,
    ...myzelInstallation,
  };
}
