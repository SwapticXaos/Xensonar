import type { AppBurstDiagnosticsPanelBoundaryArgs, AudioBurstExportContext } from '../diagnostics/buildAppBurstDiagnosticsPanelBoundary';
import type { AppMaterialTrackPanelBoundaryArgs } from '../groove/buildAppMaterialTrackPanelBoundaryTypes';
import type { AppPerformanceCrisisPanelBoundaryArgs } from '../performanceCrisis/buildAppPerformanceCrisisPanelBoundary';
import type { AppParticleSystemPanelBoundaryArgs } from '../rooms/buildAppParticleSystemPanelBoundaryTypes';
import type { AppResonanceControlPanelBoundaryArgs } from '../rooms/appResonanceControlPanelBoundaryTypes';

type AppMaterialTrackCompactPanelSource = Extract<
  AppMaterialTrackPanelBoundaryArgs,
  { readonly previewSource: unknown }
>;

export type AppPanelMaterialTrackCallsiteSource = AppMaterialTrackCompactPanelSource;

export type AppPanelBurstDiagnosticsExportContextSource = Pick<
  AudioBurstExportContext,
  | 'room'
  | 'liveMasteringEnabled'
  | 'gridTempoBpm'
  | 'quantizeGrid'
  | 'particleQuantizeReferenceBars'
  | 'materialLoopActive'
  | 'waveSoundEnabled'
>;

export type AppPanelBurstDiagnosticsCallsiteSource = Omit<
  AppBurstDiagnosticsPanelBoundaryArgs,
  'exportContext' | 'rootFollowRecoveryActions'
> & {
  readonly exportContextSource: AppPanelBurstDiagnosticsExportContextSource;
  readonly recovery: AppBurstDiagnosticsPanelBoundaryArgs['rootFollowRecoveryActions'];
};

export type AppPanelPerformanceCrisisCallsiteSource = Omit<
  AppPerformanceCrisisPanelBoundaryArgs,
  'rootFollowGranulationSource'
> & {
  readonly rootFollowGranulationSource: AppPerformanceCrisisPanelBoundaryArgs['rootFollowGranulationSource'];
};

export type AppPanelResonanceControlCallsiteSource = AppResonanceControlPanelBoundaryArgs;

export type AppPanelParticleSystemCallsiteSource = {
  readonly selection: AppParticleSystemPanelBoundaryArgs['selection'];
  readonly particlePresets: AppParticleSystemPanelBoundaryArgs['presetCatalogSource']['particlePresets'];
  readonly agentActions: AppParticleSystemPanelBoundaryArgs['agentActions'];
};

export type AppResonancePanelCallsiteSourcesArgs = {
  readonly materialTrack: AppPanelMaterialTrackCallsiteSource;
  readonly burstDiagnostics: AppPanelBurstDiagnosticsCallsiteSource;
  readonly performanceCrisis: AppPanelPerformanceCrisisCallsiteSource;
  readonly resonanceControl: AppPanelResonanceControlCallsiteSource;
  readonly particleSystem: AppPanelParticleSystemCallsiteSource;
};
