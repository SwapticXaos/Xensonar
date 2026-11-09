import { GAME_HEIGHT, GAME_WIDTH } from '../domain/instrumentData';
import { DEFAULT_ROOM3_BODY_CONTROLS } from '../../resonance/timbreModel';
import { buildAppRoomSceneProps } from './appRoomSceneCoordinator';

type AppRoomScenePropsArgs = Parameters<typeof buildAppRoomSceneProps>[0];

type BuildAppRoomSceneBindingsArgs = {
  topologySnapshot: AppRoomScenePropsArgs['topology']['displayState']['snapshot'];
  room3BodyEnabled: AppRoomScenePropsArgs['topology']['displayState']['room3BodyEnabled'];
  room3MaterialLabel: AppRoomScenePropsArgs['topology']['displayState']['materialLabel'];
  primedY: AppRoomScenePropsArgs['topology']['displayState']['primedY'];
  primedSource: AppRoomScenePropsArgs['topology']['displayState']['primedSource'];
  freqFromY: AppRoomScenePropsArgs['topology']['displayState']['freqFromY'];
  room3BodyMaterial: AppRoomScenePropsArgs['topology']['displayState']['room3BodyMaterial'];
  selectedLoopHandoffProfile: AppRoomScenePropsArgs['topology']['displayState']['selectedLoopHandoffProfile'];
  selectedLoopMaterial: AppRoomScenePropsArgs['topology']['displayState']['selectedLoopMaterial'];
  summarizeHandoffProfile: AppRoomScenePropsArgs['topology']['displayState']['summarizeHandoffProfile'];
  setFamilyRequestedActive: AppRoomScenePropsArgs['topology']['navigationActions']['setFamilyRequestedActive'];
  setRoom: AppRoomScenePropsArgs['topology']['navigationActions']['setRoom'];
  myzelTopologyMode: AppRoomScenePropsArgs['topology']['panel']['mode'];
  setMyzelModeAndPower: AppRoomScenePropsArgs['topology']['panel']['onModeChange'];
  myzelEnabled: AppRoomScenePropsArgs['topology']['panel']['myzelEnabled'];
  toggleMyzelEnabled: AppRoomScenePropsArgs['topology']['panel']['onToggleMyzel'];
  resetMyzelTopologyNodes: AppRoomScenePropsArgs['topology']['panel']['onResetLayout'];
  systemState: AppRoomScenePropsArgs['topology']['panel']['systemState'];
  activeMyzelRootHz: AppRoomScenePropsArgs['topology']['panel']['rootHz'];
  topologyCanvasRef: AppRoomScenePropsArgs['topology']['panel']['canvasRef'];
  handleTopologyCanvasMouseDown: AppRoomScenePropsArgs['topology']['panel']['onCanvasMouseDown'];
  handleTopologyCanvasMouseMove: AppRoomScenePropsArgs['topology']['panel']['onCanvasMouseMove'];
  handleTopologyCanvasMouseUp: AppRoomScenePropsArgs['topology']['panel']['onCanvasMouseUp'];
  handleTopologyCanvasContextMenu: AppRoomScenePropsArgs['topology']['panel']['onCanvasContextMenu'];
  tParams: AppRoomScenePropsArgs['topology']['panel']['tParams'];
  setTParams: AppRoomScenePropsArgs['topology']['panel']['setTParams'];
  myzelPostFxGroup: AppRoomScenePropsArgs['topology']['panel']['postFxGroup'];
  setMyzelPostFxGroup: AppRoomScenePropsArgs['topology']['panel']['onPostFxGroupChange'];
  myzelPostFxEnabled: AppRoomScenePropsArgs['topology']['panel']['postFxEnabled'];
  setMyzelPostFxEnabled: AppRoomScenePropsArgs['topology']['panel']['setPostFxEnabled'];
  myzelFollowForgeHandoff: AppRoomScenePropsArgs['topology']['panel']['followForgeHandoff'];
  setMyzelFollowForgeHandoff: AppRoomScenePropsArgs['topology']['panel']['onFollowForgeHandoffChange'];
  myzelPostFxDepth: AppRoomScenePropsArgs['topology']['panel']['postFxDepth'];
  setMyzelPostFxDepth: AppRoomScenePropsArgs['topology']['panel']['onPostFxDepthChange'];
  myzelPostFxParallel: AppRoomScenePropsArgs['topology']['panel']['postFxParallel'];
  setMyzelPostFxParallel: AppRoomScenePropsArgs['topology']['panel']['onPostFxParallelChange'];
  activeMyzelPostFxGroupSummary: AppRoomScenePropsArgs['topology']['panel']['activeGroupSummary'];
  activeMyzelPostFxGroupReceivesFrom: AppRoomScenePropsArgs['topology']['panel']['activeGroupReceivesFrom'];
  activeMyzelPostFxGroupKeepsStableBy: AppRoomScenePropsArgs['topology']['panel']['activeGroupKeepsStableBy'];
  myzelPattern: AppRoomScenePropsArgs['topology']['panel']['myzelPattern'];
  setMyzelPattern: AppRoomScenePropsArgs['topology']['panel']['onMyzelPatternChange'];
  myzelBallMode: AppRoomScenePropsArgs['topology']['panel']['myzelBallMode'];
  setMyzelBallMode: AppRoomScenePropsArgs['topology']['panel']['onMyzelBallModeChange'];
  myzelNodeMode: AppRoomScenePropsArgs['topology']['panel']['myzelNodeMode'];
  setMyzelNodeMode: AppRoomScenePropsArgs['topology']['panel']['onMyzelNodeModeChange'];
  myzelStep16ths: AppRoomScenePropsArgs['topology']['panel']['myzelStep16ths'];
  setMyzelStep16ths: AppRoomScenePropsArgs['topology']['panel']['onMyzelStep16thsChange'];
  myzelDriveEnabled: AppRoomScenePropsArgs['topology']['panel']['myzelDriveEnabled'];
  setMyzelDriveEnabled: AppRoomScenePropsArgs['topology']['panel']['setMyzelDriveEnabled'];
  room3BodyEnabledState: AppRoomScenePropsArgs['topology']['panel']['room3BodyEnabled'];
  setRoom3BodyEnabled: AppRoomScenePropsArgs['topology']['panel']['setRoom3BodyEnabled'];
  setMyzelInterpreterMix: AppRoomScenePropsArgs['topology']['panel']['setMyzelInterpreterMix'];
  setMyzelCentralColorMixer: AppRoomScenePropsArgs['topology']['panel']['setMyzelCentralColorMixer'];
  nodalDeviceMatrix: AppRoomScenePropsArgs['topology']['panel']['nodalDeviceMatrix'];
  onNodalDeviceEnabledChange: AppRoomScenePropsArgs['topology']['panel']['onNodalDeviceEnabledChange'];
  onNodalDeviceAmountChange: AppRoomScenePropsArgs['topology']['panel']['onNodalDeviceAmountChange'];
  onNodalDeviceTargetChange: AppRoomScenePropsArgs['topology']['panel']['onNodalDeviceTargetChange'];
  setRoom3BodyControls: AppRoomScenePropsArgs['topology']['panel']['setRoom3BodyControls'];
  myzelInterpreterMix: AppRoomScenePropsArgs['topology']['panel']['myzelInterpreterMix'];
  myzelCentralColorMixer: AppRoomScenePropsArgs['topology']['panel']['myzelCentralColorMixer'];
  room3BodyControls: AppRoomScenePropsArgs['topology']['panel']['room3BodyControls'];
  setMyzelInstallationMix: AppRoomScenePropsArgs['topology']['panel']['setMyzelInstallationMix'];
  myzelInstallationMix: AppRoomScenePropsArgs['topology']['panel']['installationMix'];
  installationFieldConfig: AppRoomScenePropsArgs['topology']['panel']['installationFieldConfig'];
  particleSoundsMuted: AppRoomScenePropsArgs['topology']['panel']['particleSoundsMuted'];
  toggleInstallNomadAttractor: AppRoomScenePropsArgs['topology']['panel']['onToggleInstallNomadAttractor'];
  toggleInstallResidents: AppRoomScenePropsArgs['topology']['panel']['onToggleInstallResidents'];
  setInstallResidentVolumeLevel: AppRoomScenePropsArgs['topology']['panel']['onSetInstallResidentVolume'];
  setInstallResidentSystemValue: AppRoomScenePropsArgs['topology']['panel']['onSetInstallResidentSystem'];
  setInstallResidentModeValue: AppRoomScenePropsArgs['topology']['panel']['onSetInstallResidentMode'];
  toggleInstallResidentWaveExcitation: AppRoomScenePropsArgs['topology']['panel']['onToggleInstallResidentWaveExcitation'];
  toggleInstallResidentBallCoupling: AppRoomScenePropsArgs['topology']['panel']['onToggleInstallResidentBallCoupling'];
  setInstallParticleSoundMode: AppRoomScenePropsArgs['topology']['panel']['onSetParticleSoundMode'];
  setInstallResidentSoundPreset: AppRoomScenePropsArgs['topology']['panel']['onSetInstallationResidentSound'];
  setInstallResidentElasticPitch: AppRoomScenePropsArgs['topology']['panel']['onSetInstallationResidentElasticPitch'];
  customResidentSoundPreset: AppRoomScenePropsArgs['topology']['panel']['customResidentSoundPreset'];
  customResidentElasticPitch: AppRoomScenePropsArgs['topology']['panel']['customResidentElasticPitch'];
  setCustomResidentSoundPreset: AppRoomScenePropsArgs['topology']['panel']['onSetCustomResidentSound'];
  setCustomResidentElasticPitch: AppRoomScenePropsArgs['topology']['panel']['onSetCustomResidentElasticPitch'];
  previewPendingCustomResident: AppRoomScenePropsArgs['topology']['panel']['onPreviewPendingCustomResident'];
  selectedResidentLabel: AppRoomScenePropsArgs['topology']['panel']['selectedResidentLabel'];
  selectedResidentFrequencyHz: AppRoomScenePropsArgs['topology']['panel']['selectedResidentFrequencyHz'];
  residentBaseHz: AppRoomScenePropsArgs['topology']['panel']['residentRootHz'];
  residentAddFrequencyHz: AppRoomScenePropsArgs['topology']['panel']['residentAddFrequencyHz'];
  setResidentAddFrequencySlider: AppRoomScenePropsArgs['topology']['panel']['onResidentAddFrequencySliderChange'];
  addInstallationResident: AppRoomScenePropsArgs['topology']['panel']['onAddResident'];
  residentConstellationName: AppRoomScenePropsArgs['topology']['panel']['residentConstellationName'];
  setResidentConstellationName: AppRoomScenePropsArgs['topology']['panel']['onResidentConstellationNameChange'];
  savedResidentConstellations: AppRoomScenePropsArgs['topology']['panel']['savedResidentConstellations'];
  saveCurrentResidentConstellation: AppRoomScenePropsArgs['topology']['panel']['onSaveResidentConstellation'];
  loadResidentConstellation: AppRoomScenePropsArgs['topology']['panel']['onLoadResidentConstellation'];
  deleteResidentConstellation: AppRoomScenePropsArgs['topology']['panel']['onDeleteResidentConstellation'];
  familyRequestedActive: AppRoomScenePropsArgs['viewport']['mainRoom']['familyRequestedActive'];
  installationSharedFieldController: AppRoomScenePropsArgs['viewport']['mainRoom']['installationSharedFieldController'];
  xenpolarView: AppRoomScenePropsArgs['viewport']['xenpolarRoom']['xenpolarView'];
  setXenpolarView: AppRoomScenePropsArgs['viewport']['xenpolarRoom']['setXenpolarView'];
  resonanzwandererStatus: AppRoomScenePropsArgs['viewport']['xenpolarRoom']['resonanzwandererStatus'];
  resonanzwandererBusy: AppRoomScenePropsArgs['viewport']['xenpolarRoom']['resonanzwandererBusy'];
  resonanzwandererCanExport: AppRoomScenePropsArgs['viewport']['xenpolarRoom']['resonanzwandererCanExport'];
  handleResonanzwandererExportToXensonar: AppRoomScenePropsArgs['viewport']['xenpolarRoom']['onResonanzwandererExportToXensonar'];
  handleResonanzwandererExportToSpectralForge: AppRoomScenePropsArgs['viewport']['xenpolarRoom']['onResonanzwandererExportToSpectralForge'];
  handleResonanzwandererExportToSyntheticForge: AppRoomScenePropsArgs['viewport']['xenpolarRoom']['onResonanzwandererExportToSyntheticForge'];
  gameActive: AppRoomScenePropsArgs['viewport']['irrlichtArenaPanel']['gameActive'];
  gameHud: AppRoomScenePropsArgs['viewport']['irrlichtArenaPanel']['gameHud'];
  gameCanvasRef: AppRoomScenePropsArgs['viewport']['irrlichtArenaPanel']['gameCanvasRef'];
  arenaSeedStatus: AppRoomScenePropsArgs['viewport']['irrlichtArenaPanel']['arenaSeedStatus'];
  handleArenaSeedExport: AppRoomScenePropsArgs['viewport']['irrlichtArenaPanel']['handleArenaSeedExport'];
  startGameRun: AppRoomScenePropsArgs['viewport']['irrlichtArenaPanel']['startGameRun'];
  returnToXensonarHauptraum: AppRoomScenePropsArgs['viewport']['auxiliaryRooms']['onBackToHauptraum'];
  externalAudioUploadFile?: AppRoomScenePropsArgs['viewport']['auxiliaryRooms']['externalAudioUploadFile'];
  externalAudioUploadOrigin?: AppRoomScenePropsArgs['viewport']['auxiliaryRooms']['externalAudioUploadOrigin'];
  entryScrollIntent?: AppRoomScenePropsArgs['viewport']['auxiliaryRooms']['entryScrollIntent'];
  onExternalAudioUploadConsumed?: AppRoomScenePropsArgs['viewport']['auxiliaryRooms']['onExternalAudioUploadConsumed'];
  onEntryScrollIntentConsumed?: AppRoomScenePropsArgs['viewport']['auxiliaryRooms']['onEntryScrollIntentConsumed'];
};

export function buildAppRoomSceneBindings(
  args: BuildAppRoomSceneBindingsArgs,
): AppRoomScenePropsArgs {
  return {
    topology: {
      displayState: {
        snapshot: args.topologySnapshot,
        room3BodyEnabled: args.room3BodyEnabled,
        materialLabel: args.room3MaterialLabel,
        primedY: args.primedY,
        primedSource: args.primedSource,
        freqFromY: args.freqFromY,
        room3BodyMaterial: args.room3BodyMaterial,
        constellationTension: args.topologySnapshot.constellationTension ?? 0,
        constellationBrightness: args.topologySnapshot.constellationBrightness ?? 0.5,
        selectedLoopHandoffProfile: args.selectedLoopHandoffProfile,
        selectedLoopMaterial: args.selectedLoopMaterial,
        summarizeHandoffProfile: args.summarizeHandoffProfile,
      },
      navigationActions: {
        setFamilyRequestedActive: args.setFamilyRequestedActive,
        setRoom: args.setRoom,
      },
      panel: {
        mode: args.myzelTopologyMode,
        onModeChange: args.setMyzelModeAndPower,
        myzelEnabled: args.myzelEnabled,
        onToggleMyzel: args.toggleMyzelEnabled,
        onResetLayout: args.resetMyzelTopologyNodes,
        systemState: args.systemState,
        rootHz: args.activeMyzelRootHz,
        canvasRef: args.topologyCanvasRef,
        onCanvasMouseDown: args.handleTopologyCanvasMouseDown,
        onCanvasMouseMove: args.handleTopologyCanvasMouseMove,
        onCanvasMouseUp: args.handleTopologyCanvasMouseUp,
        onCanvasContextMenu: args.handleTopologyCanvasContextMenu,
        tParams: args.tParams,
        setTParams: args.setTParams,
        postFxGroup: args.myzelPostFxGroup,
        onPostFxGroupChange: args.setMyzelPostFxGroup,
        postFxEnabled: args.myzelPostFxEnabled,
        setPostFxEnabled: args.setMyzelPostFxEnabled,
        followForgeHandoff: args.myzelFollowForgeHandoff,
        onFollowForgeHandoffChange: args.setMyzelFollowForgeHandoff,
        postFxDepth: args.myzelPostFxDepth,
        onPostFxDepthChange: args.setMyzelPostFxDepth,
        postFxParallel: args.myzelPostFxParallel,
        onPostFxParallelChange: args.setMyzelPostFxParallel,
        activeGroupSummary: args.activeMyzelPostFxGroupSummary,
        activeGroupReceivesFrom: args.activeMyzelPostFxGroupReceivesFrom,
        activeGroupKeepsStableBy: args.activeMyzelPostFxGroupKeepsStableBy,
        myzelPattern: args.myzelPattern,
        onMyzelPatternChange: args.setMyzelPattern,
        myzelBallMode: args.myzelBallMode,
        onMyzelBallModeChange: args.setMyzelBallMode,
        myzelNodeMode: args.myzelNodeMode,
        onMyzelNodeModeChange: args.setMyzelNodeMode,
        myzelStep16ths: args.myzelStep16ths,
        onMyzelStep16thsChange: args.setMyzelStep16ths,
        myzelDriveEnabled: args.myzelDriveEnabled,
        setMyzelDriveEnabled: args.setMyzelDriveEnabled,
        room3BodyEnabled: args.room3BodyEnabledState,
        setRoom3BodyEnabled: args.setRoom3BodyEnabled,
        setMyzelInterpreterMix: args.setMyzelInterpreterMix,
        setMyzelCentralColorMixer: args.setMyzelCentralColorMixer,
        nodalDeviceMatrix: args.nodalDeviceMatrix,
        onNodalDeviceEnabledChange: args.onNodalDeviceEnabledChange,
        onNodalDeviceAmountChange: args.onNodalDeviceAmountChange,
        onNodalDeviceTargetChange: args.onNodalDeviceTargetChange,
        setRoom3BodyControls: args.setRoom3BodyControls,
        defaultRoom3BodyControls: DEFAULT_ROOM3_BODY_CONTROLS,
        myzelInterpreterMix: args.myzelInterpreterMix,
        myzelCentralColorMixer: args.myzelCentralColorMixer,
        room3BodyControls: args.room3BodyControls,
        setMyzelInstallationMix: args.setMyzelInstallationMix,
        installationMix: args.myzelInstallationMix,
        installationFieldConfig: args.installationFieldConfig,
        particleSoundsMuted: args.particleSoundsMuted,
        onToggleInstallNomadAttractor: args.toggleInstallNomadAttractor,
        onToggleInstallResidents: args.toggleInstallResidents,
        onSetInstallResidentVolume: args.setInstallResidentVolumeLevel,
        onSetInstallResidentSystem: args.setInstallResidentSystemValue,
        onSetInstallResidentMode: args.setInstallResidentModeValue,
        onToggleInstallResidentWaveExcitation: args.toggleInstallResidentWaveExcitation,
        onToggleInstallResidentBallCoupling: args.toggleInstallResidentBallCoupling,
        onSetParticleSoundMode: args.setInstallParticleSoundMode,
        onSetInstallationResidentSound: args.setInstallResidentSoundPreset,
        onSetInstallationResidentElasticPitch: args.setInstallResidentElasticPitch,
        customResidentSoundPreset: args.customResidentSoundPreset,
        customResidentElasticPitch: args.customResidentElasticPitch,
        onSetCustomResidentSound: args.setCustomResidentSoundPreset,
        onSetCustomResidentElasticPitch: args.setCustomResidentElasticPitch,
        onPreviewPendingCustomResident: args.previewPendingCustomResident,
        selectedResidentLabel: args.selectedResidentLabel,
        selectedResidentFrequencyHz: args.selectedResidentFrequencyHz,
        residentRootHz: args.residentBaseHz,
        residentAddFrequencyHz: args.residentAddFrequencyHz,
        onResidentAddFrequencySliderChange: args.setResidentAddFrequencySlider,
        onAddResident: args.addInstallationResident,
        residentConstellationName: args.residentConstellationName,
        onResidentConstellationNameChange: args.setResidentConstellationName,
        savedResidentConstellations: args.savedResidentConstellations,
        onSaveResidentConstellation: args.saveCurrentResidentConstellation,
        onLoadResidentConstellation: args.loadResidentConstellation,
        onDeleteResidentConstellation: args.deleteResidentConstellation,
      },
    },
    viewport: {
      mainRoom: {
        familyRequestedActive: args.familyRequestedActive,
        installationSharedFieldController: args.installationSharedFieldController,
        setFamilyRequestedActive: args.setFamilyRequestedActive,
        setRoom: args.setRoom,
      },
      xenpolarRoom: {
        xenpolarView: args.xenpolarView,
        setRoom: args.setRoom,
        setXenpolarView: args.setXenpolarView,
        resonanzwandererStatus: args.resonanzwandererStatus,
        resonanzwandererBusy: args.resonanzwandererBusy,
        resonanzwandererCanExport: args.resonanzwandererCanExport,
        onResonanzwandererExportToXensonar: args.handleResonanzwandererExportToXensonar,
        onResonanzwandererExportToSpectralForge: args.handleResonanzwandererExportToSpectralForge,
        onResonanzwandererExportToSyntheticForge: args.handleResonanzwandererExportToSyntheticForge,
        familyRequestedActive: args.familyRequestedActive,
        installationSharedFieldController: args.installationSharedFieldController,
        setFamilyRequestedActive: args.setFamilyRequestedActive,
      },
      irrlichtArenaPanel: {
        gameActive: args.gameActive,
        gameHud: args.gameHud,
        gameCanvasRef: args.gameCanvasRef,
        arenaSeedStatus: args.arenaSeedStatus,
        handleArenaSeedExport: args.handleArenaSeedExport,
        startGameRun: args.startGameRun,
        setRoom: args.setRoom,
        setXenpolarView: args.setXenpolarView,
        gameWidth: GAME_WIDTH,
        gameHeight: GAME_HEIGHT,
      },
      auxiliaryRooms: {
        onBackToHauptraum: args.returnToXensonarHauptraum,
        externalAudioUploadFile: args.externalAudioUploadFile ?? null,
        externalAudioUploadOrigin: args.externalAudioUploadOrigin ?? null,
        entryScrollIntent: args.entryScrollIntent ?? null,
        onExternalAudioUploadConsumed: args.onExternalAudioUploadConsumed,
        onEntryScrollIntentConsumed: args.onEntryScrollIntentConsumed,
      },
    },
  };
}
