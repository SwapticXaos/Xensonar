import type { AppBurstDiagnosticsPanelBoundaryArgs } from '../diagnostics/buildAppBurstDiagnosticsPanelBoundary';
import type { AppParticleSystemPanelBoundaryArgs } from '../rooms/buildAppParticleSystemPanelBoundaryTypes';
import type { UseAppResonancePanelPropsBoundaryArgs } from './useAppResonancePanelPropsBoundaryTypes';
import type {
  AppPanelBurstDiagnosticsCallsiteSource,
  AppPanelParticleSystemCallsiteSource,
  AppResonancePanelCallsiteSourcesArgs,
} from './appResonancePanelCallsiteSourceTypes';

export type * from './appResonancePanelCallsiteSourceTypes';

function buildAppBurstDiagnosticsPanelCallsiteInput({
  exportContextSource,
  recovery,
  ...diagnostics
}: AppPanelBurstDiagnosticsCallsiteSource): AppBurstDiagnosticsPanelBoundaryArgs {
  return {
    ...diagnostics,
    exportContext: exportContextSource,
    rootFollowRecoveryActions: recovery,
  };
}

function buildAppParticleSystemPanelCallsiteInput({
  selection,
  particlePresets,
  agentActions,
}: AppPanelParticleSystemCallsiteSource): AppParticleSystemPanelBoundaryArgs {
  return {
    selection,
    presetCatalogSource: { particlePresets },
    agentActions,
  };
}

export function buildAppResonancePanelCallsiteSources({
  materialTrack,
  burstDiagnostics,
  performanceCrisis,
  resonanceControl,
  particleSystem,
}: AppResonancePanelCallsiteSourcesArgs): UseAppResonancePanelPropsBoundaryArgs {
  return {
    materialTrack,
    burstDiagnostics: buildAppBurstDiagnosticsPanelCallsiteInput(burstDiagnostics),
    performanceCrisis,
    resonanceControl,
    particleSystem: buildAppParticleSystemPanelCallsiteInput(particleSystem),
  };
}
