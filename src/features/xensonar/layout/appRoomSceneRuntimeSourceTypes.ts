import type { UseAppRoomSceneRuntimeBoundaryArgs } from '../room3/useAppRoomSceneRuntimeBoundary';

export type AppRoomSceneRuntimeContractSourceArgs = Pick<
  UseAppRoomSceneRuntimeBoundaryArgs,
  'room3Topology' | 'room3RuntimeEntry'
>;

export type AppRoomSceneTopologyHandoffSourceArgs = Pick<
  UseAppRoomSceneRuntimeBoundaryArgs['topologyScene'],
  | 'freqFromY'
  | 'selectedLoopHandoffProfile'
  | 'selectedLoopMaterial'
  | 'summarizeHandoffProfile'
  | 'setFamilyRequestedActive'
  | 'setRoom'
  | 'activeMyzelRootHz'
>;

export type AppRoomSceneTopologyRuntimeSourceArgs = Pick<
  UseAppRoomSceneRuntimeBoundaryArgs['topologyScene'],
  | 'setMyzelModeAndPower'
  | 'toggleMyzelEnabled'
  | 'resetMyzelTopologyNodes'
>;

export type AppRoomSceneInstallationDeviceSourceArgs = Pick<
  UseAppRoomSceneRuntimeBoundaryArgs['installationScene'],
  | 'particleSoundsMuted'
  | 'onNodalDeviceEnabledChange'
  | 'onNodalDeviceAmountChange'
  | 'onNodalDeviceTargetChange'
>;

export type AppRoomSceneInstallationResidentSourceArgs = Pick<
  UseAppRoomSceneRuntimeBoundaryArgs['installationScene'],
  | 'previewPendingCustomResident'
  | 'selectedResidentNode'
  | 'residentBaseHz'
  | 'residentAddFrequencyHz'
>;

export type AppRoomSceneViewportXenpolarSourceArgs = Pick<
  UseAppRoomSceneRuntimeBoundaryArgs['viewportScene'],
  | 'familyRequestedActive'
  | 'installationSharedFieldController'
  | 'xenpolarView'
  | 'setXenpolarView'
  | 'resonanzwandererStatus'
  | 'resonanzwandererBusy'
  | 'resonanzwandererCanExport'
  | 'handleResonanzwandererExportToXensonar'
  | 'handleResonanzwandererExportToSpectralForge'
  | 'handleResonanzwandererExportToSyntheticForge'
>;

export type AppRoomSceneViewportGameArenaSourceArgs = Pick<
  UseAppRoomSceneRuntimeBoundaryArgs['viewportScene'],
  | 'gameActive'
  | 'gameHud'
  | 'gameCanvasRef'
  | 'arenaSeedStatus'
  | 'handleArenaSeedExport'
  | 'startGameRun'
  | 'returnToXensonarHauptraum'
>;

export type AppRoomSceneViewportSpectralForgeEntrySourceArgs = Pick<
  UseAppRoomSceneRuntimeBoundaryArgs['viewportScene'],
  | 'externalAudioUploadFile'
  | 'externalAudioUploadOrigin'
  | 'entryScrollIntent'
  | 'onExternalAudioUploadConsumed'
  | 'onEntryScrollIntentConsumed'
>;

export type BuildAppRoomSceneRuntimeSourceInput = {
  contracts: AppRoomSceneRuntimeContractSourceArgs;
  topology: {
    handoffScene: AppRoomSceneTopologyHandoffSourceArgs;
    runtimeScene: AppRoomSceneTopologyRuntimeSourceArgs;
  };
  installation: {
    deviceScene: AppRoomSceneInstallationDeviceSourceArgs;
    residentScene: AppRoomSceneInstallationResidentSourceArgs;
  };
  viewport: {
    xenpolarScene: AppRoomSceneViewportXenpolarSourceArgs;
    gameArenaScene: AppRoomSceneViewportGameArenaSourceArgs;
    spectralForgeEntryScene: AppRoomSceneViewportSpectralForgeEntrySourceArgs;
  };
};
