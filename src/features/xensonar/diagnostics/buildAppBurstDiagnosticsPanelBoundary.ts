import type { QuantizeGrid } from '../domain/instrumentData';
import type { Room } from '../domain/runtimeTypes';
import type { BurstDiagnosticsPanelProps } from '../rooms/buildBurstDiagnosticsPanelProps';

export type AudioBurstExportContext = {
  room: Room;
  liveMasteringEnabled: boolean;
  gridTempoBpm: number;
  quantizeGrid: QuantizeGrid;
  particleQuantizeReferenceBars?: number;
  materialLoopActive: boolean;
  waveSoundEnabled: boolean;
};

export type AudioBurstRuntimePanelActions = {
  start: () => void;
  stop: () => void;
  clear: () => void;
  exportLog: (context: AudioBurstExportContext) => void;
};

export type AppRootFollowRecoveryActionsBoundary = Pick<
  BurstDiagnosticsPanelProps,
  | 'onRunAudioPairTherapistReset'
  | 'onClearRootFollowBrowserState'
  | 'onReactivateRootFollowFromPackage'
>;

export type AppBurstDiagnosticsPanelBoundaryArgs = {
  audioTapMonitor: BurstDiagnosticsPanelProps['audioTapMonitor'];
  audioBurstRecorder: BurstDiagnosticsPanelProps['audioBurstRecorder'];
  audioPairTherapistStatus: BurstDiagnosticsPanelProps['audioPairTherapistStatus'];
  rootFollowHealth: BurstDiagnosticsPanelProps['rootFollowHealth'];
  activeStressScenarioId: BurstDiagnosticsPanelProps['activeStressScenarioId'];
  onChangeStressScenarioId: BurstDiagnosticsPanelProps['onChangeStressScenarioId'];
  workspacePackageActivationReport: BurstDiagnosticsPanelProps['workspacePackageActivationReport'];
  audioBurstRuntime: AudioBurstRuntimePanelActions;
  exportContext: AudioBurstExportContext;
  rootFollowRecoveryActions: AppRootFollowRecoveryActionsBoundary;
};

export function buildAppBurstDiagnosticsPanelBoundary({
  audioTapMonitor,
  audioBurstRecorder,
  audioPairTherapistStatus,
  rootFollowHealth,
  activeStressScenarioId,
  onChangeStressScenarioId,
  workspacePackageActivationReport,
  audioBurstRuntime,
  exportContext,
  rootFollowRecoveryActions,
}: AppBurstDiagnosticsPanelBoundaryArgs): BurstDiagnosticsPanelProps {
  return {
    audioTapMonitor,
    audioBurstRecorder,
    audioPairTherapistStatus,
    rootFollowHealth,
    activeStressScenarioId,
    onChangeStressScenarioId,
    workspacePackageActivationReport,
    onStartAudioBurstRecorder: audioBurstRuntime.start,
    onStopAudioBurstRecorder: audioBurstRuntime.stop,
    onClearAudioBurstRecorder: audioBurstRuntime.clear,
    onExportAudioBurstRecorder: () => audioBurstRuntime.exportLog(exportContext),
    ...rootFollowRecoveryActions,
  };
}
