import type { ComponentProps, Dispatch, SetStateAction } from 'react';
import type { MainRoomProps } from './MainRoom';
import type { XenpolarLauncherTarget, XenpolarRoomProps, XenpolarView } from './XenpolarRoom';
import type { IrrlichtArenaPanelProps } from './IrrlichtArenaPanel';
import { MyzelTopologyPanel } from '../../topology/MyzelTopologyPanel';
import type { Room } from '../types';
import { openMaterialschmiede, writeExternalDockView } from './xenpolarShortcut';
import { enterXensonarHauptraumRoute } from '../layout/hauptraumNavigationContract';

type FamilyRequestedActive = 'melodieQuest' | null;

type BuildMainRoomPropsArgs = {
  familyRequestedActive: FamilyRequestedActive;
  installationSharedFieldController: MainRoomProps['sharedFieldController'];
  setFamilyRequestedActive: Dispatch<SetStateAction<FamilyRequestedActive>>;
  setRoom: (room: Room) => void;
};

export function buildMainRoomProps(args: BuildMainRoomPropsArgs): MainRoomProps {
  return {
    onEnterResonance: () => enterXensonarHauptraumRoute({
      setRoom: args.setRoom,
      setFamilyRequestedActive: args.setFamilyRequestedActive,
    }),
    requestedActive: args.familyRequestedActive,
    sharedFieldController: args.installationSharedFieldController,
  };
}

type BuildXenpolarRoomPropsArgs = {
  xenpolarView: XenpolarView;
  setRoom: (room: Room) => void;
  setXenpolarView: Dispatch<SetStateAction<XenpolarView>>;
  resonanzwandererStatus: XenpolarRoomProps['resonanzwandererStatus'];
  resonanzwandererBusy: XenpolarRoomProps['resonanzwandererBusy'];
  resonanzwandererCanExport: XenpolarRoomProps['resonanzwandererCanExport'];
  onResonanzwandererExportToXensonar: () => Promise<void>;
  onResonanzwandererExportToSpectralForge: () => Promise<void>;
  onResonanzwandererExportToSyntheticForge: () => Promise<void>;
  familyRequestedActive: FamilyRequestedActive;
  installationSharedFieldController: MainRoomProps['sharedFieldController'];
  setFamilyRequestedActive: Dispatch<SetStateAction<FamilyRequestedActive>>;
};

function handleXenpolarOpen(
  view: XenpolarLauncherTarget,
  setRoom: (room: Room) => void,
  setXenpolarView: Dispatch<SetStateAction<XenpolarView>>,
) {
  if (view === 'arena') {
    setXenpolarView('launcher');
    setRoom('GAME');
    return;
  }
  if (view === 'xenpolar3') {
    writeExternalDockView('microto');
  }
  setRoom('XENPOLAR');
  setXenpolarView(view);
}

export function buildXenpolarRoomProps(args: BuildXenpolarRoomPropsArgs): XenpolarRoomProps {
  return {
    view: args.xenpolarView,
    onBackToLauncher: () => args.setXenpolarView('launcher'),
    onOpen: (view) => handleXenpolarOpen(view, args.setRoom, args.setXenpolarView),
    requestedFamilyActive: args.familyRequestedActive,
    sharedFieldController: args.installationSharedFieldController,
    onFamilyRequestConsumed: () => args.setFamilyRequestedActive(null),
    onEnterResonance: () => enterXensonarHauptraumRoute({
      setRoom: args.setRoom,
      setFamilyRequestedActive: args.setFamilyRequestedActive,
    }),
    onOpenMaterialschmiede: () => openMaterialschmiede(args.setRoom),
    resonanzwandererStatus: args.resonanzwandererStatus,
    resonanzwandererBusy: args.resonanzwandererBusy,
    resonanzwandererCanExport: args.resonanzwandererCanExport,
    onResonanzwandererExportToXensonar: () => {
      void args.onResonanzwandererExportToXensonar();
    },
    onResonanzwandererExportToSpectralForge: () => {
      void args.onResonanzwandererExportToSpectralForge();
    },
    onResonanzwandererExportToSyntheticForge: () => {
      void args.onResonanzwandererExportToSyntheticForge();
    },
  };
}

type BuildIrrlichtArenaPanelPropsArgs = {
  gameActive: IrrlichtArenaPanelProps['gameActive'];
  gameHud: IrrlichtArenaPanelProps['gameHud'];
  gameCanvasRef: IrrlichtArenaPanelProps['gameCanvasRef'];
  arenaSeedStatus: IrrlichtArenaPanelProps['arenaSeedStatus'];
  handleArenaSeedExport: IrrlichtArenaPanelProps['onArenaSeedExport'];
  startGameRun: () => void | Promise<void>;
  setRoom: (room: Room) => void;
  setXenpolarView: Dispatch<SetStateAction<XenpolarView>>;
  gameWidth: number;
  gameHeight: number;
};

export function buildIrrlichtArenaPanelProps(args: BuildIrrlichtArenaPanelPropsArgs): IrrlichtArenaPanelProps {
  return {
    gameActive: args.gameActive,
    gameHud: args.gameHud,
    gameCanvasRef: args.gameCanvasRef,
    arenaSeedStatus: args.arenaSeedStatus,
    onBackToLauncher: () => {
      args.setXenpolarView('launcher');
      args.setRoom('XENPOLAR');
    },
    onArenaSeedExport: args.handleArenaSeedExport,
    onStartRun: args.startGameRun,
    gameWidth: args.gameWidth,
    gameHeight: args.gameHeight,
  };
}

type BuildTopologyPanelPropsArgs = {
  mode: ComponentProps<typeof MyzelTopologyPanel>['mode'];
  onModeChange: ComponentProps<typeof MyzelTopologyPanel>['onModeChange'];
  myzelEnabled: ComponentProps<typeof MyzelTopologyPanel>['myzelEnabled'];
  onToggleMyzel: ComponentProps<typeof MyzelTopologyPanel>['onToggleMyzel'];
  onResetLayout: ComponentProps<typeof MyzelTopologyPanel>['onResetLayout'];
  systemState: ComponentProps<typeof MyzelTopologyPanel>['systemState'];
  rootHz: ComponentProps<typeof MyzelTopologyPanel>['rootHz'];
  statusLine: ComponentProps<typeof MyzelTopologyPanel>['statusLine'];
  canvasRef: ComponentProps<typeof MyzelTopologyPanel>['canvasRef'];
  onCanvasMouseDown: ComponentProps<typeof MyzelTopologyPanel>['onCanvasMouseDown'];
  onCanvasMouseMove: ComponentProps<typeof MyzelTopologyPanel>['onCanvasMouseMove'];
  onCanvasMouseUp: ComponentProps<typeof MyzelTopologyPanel>['onCanvasMouseUp'];
  onCanvasContextMenu: ComponentProps<typeof MyzelTopologyPanel>['onCanvasContextMenu'];
  tParams: ComponentProps<typeof MyzelTopologyPanel>['tParams'];
  setTParams: Dispatch<SetStateAction<ComponentProps<typeof MyzelTopologyPanel>['tParams']>>;
  postFxGroup: ComponentProps<typeof MyzelTopologyPanel>['postFxGroup'];
  onPostFxGroupChange: ComponentProps<typeof MyzelTopologyPanel>['onPostFxGroupChange'];
  postFxEnabled: ComponentProps<typeof MyzelTopologyPanel>['postFxEnabled'];
  setPostFxEnabled: Dispatch<SetStateAction<boolean>>;
  followForgeHandoff: ComponentProps<typeof MyzelTopologyPanel>['followForgeHandoff'];
  onFollowForgeHandoffChange: ComponentProps<typeof MyzelTopologyPanel>['onFollowForgeHandoffChange'];
  postFxDepth: ComponentProps<typeof MyzelTopologyPanel>['postFxDepth'];
  onPostFxDepthChange: ComponentProps<typeof MyzelTopologyPanel>['onPostFxDepthChange'];
  postFxParallel: ComponentProps<typeof MyzelTopologyPanel>['postFxParallel'];
  onPostFxParallelChange: ComponentProps<typeof MyzelTopologyPanel>['onPostFxParallelChange'];
  activeGroupSummary: ComponentProps<typeof MyzelTopologyPanel>['activeGroupSummary'];
  activeGroupReceivesFrom: ComponentProps<typeof MyzelTopologyPanel>['activeGroupReceivesFrom'];
  activeGroupKeepsStableBy: ComponentProps<typeof MyzelTopologyPanel>['activeGroupKeepsStableBy'];
  handoffSummary: ComponentProps<typeof MyzelTopologyPanel>['handoffSummary'];
  handoffBalanceCarrier: ComponentProps<typeof MyzelTopologyPanel>['handoffBalanceCarrier'];
  myzelPattern: ComponentProps<typeof MyzelTopologyPanel>['myzelPattern'];
  onMyzelPatternChange: ComponentProps<typeof MyzelTopologyPanel>['onMyzelPatternChange'];
  myzelBallMode: ComponentProps<typeof MyzelTopologyPanel>['myzelBallMode'];
  onMyzelBallModeChange: ComponentProps<typeof MyzelTopologyPanel>['onMyzelBallModeChange'];
  myzelNodeMode: ComponentProps<typeof MyzelTopologyPanel>['myzelNodeMode'];
  onMyzelNodeModeChange: ComponentProps<typeof MyzelTopologyPanel>['onMyzelNodeModeChange'];
  myzelStep16ths: ComponentProps<typeof MyzelTopologyPanel>['myzelStep16ths'];
  onMyzelStep16thsChange: ComponentProps<typeof MyzelTopologyPanel>['onMyzelStep16thsChange'];
  myzelDriveEnabled: ComponentProps<typeof MyzelTopologyPanel>['myzelDriveEnabled'];
  setMyzelDriveEnabled: Dispatch<SetStateAction<boolean>>;
  room3BodyEnabled: ComponentProps<typeof MyzelTopologyPanel>['room3BodyEnabled'];
  setRoom3BodyEnabled: Dispatch<SetStateAction<boolean>>;
  setMyzelInterpreterMix: Dispatch<SetStateAction<ComponentProps<typeof MyzelTopologyPanel>['myzelInterpreterMix']>>;
  setMyzelCentralColorMixer: Dispatch<SetStateAction<ComponentProps<typeof MyzelTopologyPanel>['myzelCentralColorMixer']>>;
  nodalDeviceMatrix: ComponentProps<typeof MyzelTopologyPanel>['nodalDeviceMatrix'];
  onNodalDeviceEnabledChange: ComponentProps<typeof MyzelTopologyPanel>['onNodalDeviceEnabledChange'];
  onNodalDeviceAmountChange: ComponentProps<typeof MyzelTopologyPanel>['onNodalDeviceAmountChange'];
  onNodalDeviceTargetChange: ComponentProps<typeof MyzelTopologyPanel>['onNodalDeviceTargetChange'];
  setRoom3BodyControls: Dispatch<SetStateAction<ComponentProps<typeof MyzelTopologyPanel>['room3BodyControls']>>;
  defaultRoom3BodyControls: ComponentProps<typeof MyzelTopologyPanel>['room3BodyControls'];
  myzelInterpreterMix: ComponentProps<typeof MyzelTopologyPanel>['myzelInterpreterMix'];
  myzelCentralColorMixer: ComponentProps<typeof MyzelTopologyPanel>['myzelCentralColorMixer'];
  room3BodyControls: ComponentProps<typeof MyzelTopologyPanel>['room3BodyControls'];
  setMyzelInstallationMix: Dispatch<SetStateAction<ComponentProps<typeof MyzelTopologyPanel>['installationMix']>>;
  installationMix: ComponentProps<typeof MyzelTopologyPanel>['installationMix'];
  room3MaterialLabel: ComponentProps<typeof MyzelTopologyPanel>['room3MaterialLabel'];
  installationFieldConfig: ComponentProps<typeof MyzelTopologyPanel>['installationFieldConfig'];
  particleSoundsMuted: ComponentProps<typeof MyzelTopologyPanel>['particleSoundsMuted'];
  onToggleInstallNomadAttractor: ComponentProps<typeof MyzelTopologyPanel>['onToggleInstallNomadAttractor'];
  onToggleInstallResidents: ComponentProps<typeof MyzelTopologyPanel>['onToggleInstallResidents'];
  onSetInstallResidentVolume: ComponentProps<typeof MyzelTopologyPanel>['onSetInstallResidentVolume'];
  onSetInstallResidentSystem: ComponentProps<typeof MyzelTopologyPanel>['onSetInstallResidentSystem'];
  onSetInstallResidentMode: ComponentProps<typeof MyzelTopologyPanel>['onSetInstallResidentMode'];
  onToggleInstallResidentWaveExcitation: ComponentProps<typeof MyzelTopologyPanel>['onToggleInstallResidentWaveExcitation'];
  onToggleInstallResidentBallCoupling: ComponentProps<typeof MyzelTopologyPanel>['onToggleInstallResidentBallCoupling'];
  onSetParticleSoundMode: ComponentProps<typeof MyzelTopologyPanel>['onSetParticleSoundMode'];
  onSetInstallationResidentSound: ComponentProps<typeof MyzelTopologyPanel>['onSetInstallationResidentSound'];
  onSetInstallationResidentElasticPitch: ComponentProps<typeof MyzelTopologyPanel>['onSetInstallationResidentElasticPitch'];
  customResidentSoundPreset: ComponentProps<typeof MyzelTopologyPanel>['customResidentSoundPreset'];
  customResidentElasticPitch: ComponentProps<typeof MyzelTopologyPanel>['customResidentElasticPitch'];
  onSetCustomResidentSound: ComponentProps<typeof MyzelTopologyPanel>['onSetCustomResidentSound'];
  onSetCustomResidentElasticPitch: ComponentProps<typeof MyzelTopologyPanel>['onSetCustomResidentElasticPitch'];
  onPreviewPendingCustomResident: ComponentProps<typeof MyzelTopologyPanel>['onPreviewPendingCustomResident'];
  selectedResidentLabel: ComponentProps<typeof MyzelTopologyPanel>['selectedResidentLabel'];
  selectedResidentFrequencyHz: ComponentProps<typeof MyzelTopologyPanel>['selectedResidentFrequencyHz'];
  residentRootHz: ComponentProps<typeof MyzelTopologyPanel>['residentRootHz'];
  residentAddFrequencyHz: ComponentProps<typeof MyzelTopologyPanel>['residentAddFrequencyHz'];
  onResidentAddFrequencySliderChange: ComponentProps<typeof MyzelTopologyPanel>['onResidentAddFrequencySliderChange'];
  onAddResident: ComponentProps<typeof MyzelTopologyPanel>['onAddResident'];
  residentConstellationName: ComponentProps<typeof MyzelTopologyPanel>['residentConstellationName'];
  onResidentConstellationNameChange: ComponentProps<typeof MyzelTopologyPanel>['onResidentConstellationNameChange'];
  savedResidentConstellations: ComponentProps<typeof MyzelTopologyPanel>['savedResidentConstellations'];
  onSaveResidentConstellation: ComponentProps<typeof MyzelTopologyPanel>['onSaveResidentConstellation'];
  onLoadResidentConstellation: ComponentProps<typeof MyzelTopologyPanel>['onLoadResidentConstellation'];
  onDeleteResidentConstellation: ComponentProps<typeof MyzelTopologyPanel>['onDeleteResidentConstellation'];
  onOpenClassicField: ComponentProps<typeof MyzelTopologyPanel>['onOpenClassicField'];
  onOpenRefactorField: ComponentProps<typeof MyzelTopologyPanel>['onOpenRefactorField'];
};

export function buildTopologyPanelProps(args: BuildTopologyPanelPropsArgs): ComponentProps<typeof MyzelTopologyPanel> {
  return {
    mode: args.mode,
    onModeChange: args.onModeChange,
    myzelEnabled: args.myzelEnabled,
    onToggleMyzel: args.onToggleMyzel,
    onResetLayout: args.onResetLayout,
    systemState: args.systemState,
    rootHz: args.rootHz,
    statusLine: args.statusLine,
    canvasRef: args.canvasRef,
    onCanvasMouseDown: args.onCanvasMouseDown,
    onCanvasMouseMove: args.onCanvasMouseMove,
    onCanvasMouseUp: args.onCanvasMouseUp,
    onCanvasMouseLeave: args.onCanvasMouseUp,
    onCanvasContextMenu: args.onCanvasContextMenu,
    tParams: args.tParams,
    onTParamChange: (key, value) => args.setTParams((prev) => ({ ...prev, [key]: value })),
    postFxGroup: args.postFxGroup,
    onPostFxGroupChange: args.onPostFxGroupChange,
    postFxEnabled: args.postFxEnabled,
    onTogglePostFxEnabled: () => args.setPostFxEnabled((prev) => !prev),
    followForgeHandoff: args.followForgeHandoff,
    onFollowForgeHandoffChange: args.onFollowForgeHandoffChange,
    postFxDepth: args.postFxDepth,
    onPostFxDepthChange: args.onPostFxDepthChange,
    postFxParallel: args.postFxParallel,
    onPostFxParallelChange: args.onPostFxParallelChange,
    activeGroupSummary: args.activeGroupSummary,
    activeGroupReceivesFrom: args.activeGroupReceivesFrom,
    activeGroupKeepsStableBy: args.activeGroupKeepsStableBy,
    handoffSummary: args.handoffSummary,
    handoffBalanceCarrier: args.handoffBalanceCarrier,
    myzelPattern: args.myzelPattern,
    onMyzelPatternChange: args.onMyzelPatternChange,
    myzelBallMode: args.myzelBallMode,
    onMyzelBallModeChange: args.onMyzelBallModeChange,
    myzelNodeMode: args.myzelNodeMode,
    onMyzelNodeModeChange: args.onMyzelNodeModeChange,
    myzelStep16ths: args.myzelStep16ths,
    onMyzelStep16thsChange: args.onMyzelStep16thsChange,
    myzelDriveEnabled: args.myzelDriveEnabled,
    onToggleMyzelDriveEnabled: () => args.setMyzelDriveEnabled((prev) => !prev),
    room3BodyEnabled: args.room3BodyEnabled,
    onToggleRoom3BodyEnabled: () => args.setRoom3BodyEnabled((prev) => !prev),
    onResetEnhancerMix: () => {
      args.setMyzelInterpreterMix({ hybridBlend: 0.64, weaveBlend: 0.58, constellationBlend: 0.74, driveAmount: 0.22, driveResponse: 0.68 });
      args.setMyzelCentralColorMixer({ enabled: true, volume: 0.72, carrier: 0.78, sub: 0.55, formant: 0.7, overtone: 0.62, drive: 0.58, air: 0.5 });
      args.setMyzelDriveEnabled(true);
      args.setRoom3BodyControls(args.defaultRoom3BodyControls);
      args.setRoom3BodyEnabled(true);
    },
    myzelInterpreterMix: args.myzelInterpreterMix,
    onMyzelInterpreterMixChange: (field, value) => args.setMyzelInterpreterMix((prev) => ({ ...prev, [field]: value })),
    myzelCentralColorMixer: args.myzelCentralColorMixer,
    onMyzelCentralColorMixerChange: (field, value) => args.setMyzelCentralColorMixer((prev) => ({ ...prev, [field]: value })),
    nodalDeviceMatrix: args.nodalDeviceMatrix,
    onNodalDeviceEnabledChange: args.onNodalDeviceEnabledChange,
    onNodalDeviceAmountChange: args.onNodalDeviceAmountChange,
    onNodalDeviceTargetChange: args.onNodalDeviceTargetChange,
    room3BodyControls: args.room3BodyControls,
    onRoom3BodyControlsChange: (field, value) => args.setRoom3BodyControls((prev) => ({ ...prev, [field]: value })),
    installationMix: args.installationMix,
    onInstallationMixChange: (field, value) => args.setMyzelInstallationMix((prev) => ({ ...prev, [field]: value })),
    room3MaterialLabel: args.room3MaterialLabel,
    installationFieldConfig: args.installationFieldConfig,
    particleSoundsMuted: args.particleSoundsMuted,
    onToggleInstallNomadAttractor: args.onToggleInstallNomadAttractor,
    onToggleInstallResidents: args.onToggleInstallResidents,
    onSetInstallResidentVolume: args.onSetInstallResidentVolume,
    onSetInstallResidentSystem: args.onSetInstallResidentSystem,
    onSetInstallResidentMode: args.onSetInstallResidentMode,
    onToggleInstallResidentWaveExcitation: args.onToggleInstallResidentWaveExcitation,
    onToggleInstallResidentBallCoupling: args.onToggleInstallResidentBallCoupling,
    onSetParticleSoundMode: args.onSetParticleSoundMode,
    onSetInstallationResidentSound: args.onSetInstallationResidentSound,
    onSetInstallationResidentElasticPitch: args.onSetInstallationResidentElasticPitch,
    customResidentSoundPreset: args.customResidentSoundPreset,
    customResidentElasticPitch: args.customResidentElasticPitch,
    onSetCustomResidentSound: args.onSetCustomResidentSound,
    onSetCustomResidentElasticPitch: args.onSetCustomResidentElasticPitch,
    onPreviewPendingCustomResident: args.onPreviewPendingCustomResident,
    selectedResidentLabel: args.selectedResidentLabel,
    selectedResidentFrequencyHz: args.selectedResidentFrequencyHz,
    residentRootHz: args.residentRootHz,
    residentAddFrequencyHz: args.residentAddFrequencyHz,
    onResidentAddFrequencySliderChange: args.onResidentAddFrequencySliderChange,
    onAddResident: args.onAddResident,
    residentConstellationName: args.residentConstellationName,
    onResidentConstellationNameChange: args.onResidentConstellationNameChange,
    savedResidentConstellations: args.savedResidentConstellations,
    onSaveResidentConstellation: args.onSaveResidentConstellation,
    onLoadResidentConstellation: args.onLoadResidentConstellation,
    onDeleteResidentConstellation: args.onDeleteResidentConstellation,
    selectedResidentSystemReading: null,
    onOpenClassicField: args.onOpenClassicField,
    onOpenRefactorField: args.onOpenRefactorField,
  };
}
