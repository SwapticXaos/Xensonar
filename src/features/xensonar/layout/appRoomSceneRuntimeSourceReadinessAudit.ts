export const APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_GROUP_KEYS = [
  'roomSceneContracts',
  'topologyHandoffScene',
  'topologyRuntimeScene',
  'installationDeviceScene',
  'installationResidentScene',
  'viewportXenpolarScene',
  'viewportGameArenaScene',
  'viewportSpectralForgeEntryScene',
] as const;

export type AppRoomSceneRuntimeSourceReadinessGroupKey =
  (typeof APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_GROUP_KEYS)[number];

export type AppRoomSceneRuntimeSourceReadinessRisk =
  | 'room3-contract-sensitive'
  | 'topology-handoff-sensitive'
  | 'topology-runtime-sensitive'
  | 'installation-device-sensitive'
  | 'installation-resident-sensitive'
  | 'viewport-xenpolar-handoff-sensitive'
  | 'viewport-game-arena-sensitive'
  | 'spectralforge-entry-handoff-sensitive';

export type AppRoomSceneRuntimeSourceReadinessEntry = {
  readonly group: AppRoomSceneRuntimeSourceReadinessGroupKey;
  readonly appSourceKeys: readonly string[];
  readonly boundaryInjectedKeys: readonly string[];
  readonly sourceOwnerStillApp: true;
  readonly readinessOnly: true;
  readonly suggestedLaterBoundary: string;
  readonly risk: AppRoomSceneRuntimeSourceReadinessRisk;
  readonly mayExtractBeforeDedicatedBuilder: false;
  readonly ownsRuntime: false;
  readonly mutatesAudio: false;
  readonly ownsRoomLifecycle: false;
  readonly ownsPackagePersistence: false;
  readonly explicitlyNotMoved: readonly string[];
};

export const APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_AUDIT = {
  roomSceneContracts: {
    group: 'roomSceneContracts',
    appSourceKeys: [
      'room3Topology',
      'room3RuntimeEntry',
    ],
    boundaryInjectedKeys: [
      'room3Topology.myceliumSnapshotRef.current',
      'room3Topology.room3TimbreStateRef.current',
      'room3RuntimeEntry.handleTopologyCanvasMouseDown',
      'room3RuntimeEntry.toggleInstallResidents',
    ],
    sourceOwnerStillApp: true,
    readinessOnly: true,
    suggestedLaterBoundary: 'buildAppRoomSceneRuntimeContractSource',
    risk: 'room3-contract-sensitive',
    mayExtractBeforeDedicatedBuilder: false,
    ownsRuntime: false,
    mutatesAudio: false,
    ownsRoomLifecycle: false,
    ownsPackagePersistence: false,
    explicitlyNotMoved: [
      'Room III topology UI-state hook ownership',
      'Room III topology runtime-entry action bodies',
      'topology canvas handler bodies',
      'installation resident action bodies',
    ],
  },
  topologyHandoffScene: {
    group: 'topologyHandoffScene',
    appSourceKeys: [
      'freqFromY',
      'selectedLoopHandoffProfile',
      'selectedLoopMaterial',
      'summarizeHandoffProfile',
      'setFamilyRequestedActive',
      'setRoom',
      'activeMyzelRootHz',
    ],
    boundaryInjectedKeys: [
      'room3BodyMaterial',
      'room3MaterialLabel',
      'primedY',
      'primedSource',
      'activeMyzelPostFxGroupSummary',
      'activeMyzelPostFxGroupReceivesFrom',
      'activeMyzelPostFxGroupKeepsStableBy',
    ],
    sourceOwnerStillApp: true,
    readinessOnly: true,
    suggestedLaterBoundary: 'buildAppRoomSceneTopologyHandoffSource',
    risk: 'topology-handoff-sensitive',
    mayExtractBeforeDedicatedBuilder: false,
    ownsRuntime: false,
    mutatesAudio: false,
    ownsRoomLifecycle: false,
    ownsPackagePersistence: false,
    explicitlyNotMoved: [
      'loop handoff profile selection behavior',
      'family-room activation request behavior',
      'main room navigation setter body',
      'Room III material/post-FX snapshot reads',
    ],
  },
  topologyRuntimeScene: {
    group: 'topologyRuntimeScene',
    appSourceKeys: [
      'setMyzelModeAndPower',
      'toggleMyzelEnabled',
      'resetMyzelTopologyNodes',
    ],
    boundaryInjectedKeys: [
      'myzelTopologyMode',
      'myzelEnabled',
      'systemState',
      'topologyCanvasRef',
      'handleTopologyCanvasMouseDown',
      'handleTopologyCanvasMouseMove',
      'handleTopologyCanvasMouseUp',
      'handleTopologyCanvasContextMenu',
      'tParams',
      'setTParams',
      'myzelPostFxGroup',
      'setMyzelPostFxGroup',
      'myzelPostFxEnabled',
      'setMyzelPostFxEnabled',
      'myzelFollowForgeHandoff',
      'setMyzelFollowForgeHandoff',
      'myzelPostFxDepth',
      'setMyzelPostFxDepth',
      'myzelPostFxParallel',
      'setMyzelPostFxParallel',
    ],
    sourceOwnerStillApp: true,
    readinessOnly: true,
    suggestedLaterBoundary: 'buildAppRoomSceneTopologyRuntimeSource',
    risk: 'topology-runtime-sensitive',
    mayExtractBeforeDedicatedBuilder: false,
    ownsRuntime: false,
    mutatesAudio: false,
    ownsRoomLifecycle: false,
    ownsPackagePersistence: false,
    explicitlyNotMoved: [
      'topology canvas event-handler bodies',
      'Myzel mode/power action bodies',
      'post-FX state setters',
      'topology runtime-entry ownership',
    ],
  },
  installationDeviceScene: {
    group: 'installationDeviceScene',
    appSourceKeys: [
      'particleSoundsMuted',
      'onNodalDeviceEnabledChange',
      'onNodalDeviceAmountChange',
      'onNodalDeviceTargetChange',
    ],
    boundaryInjectedKeys: [
      'myzelPattern',
      'setMyzelPattern',
      'myzelBallMode',
      'setMyzelBallMode',
      'myzelNodeMode',
      'setMyzelNodeMode',
      'myzelStep16ths',
      'setMyzelStep16ths',
      'myzelDriveEnabled',
      'setMyzelDriveEnabled',
      'room3BodyEnabledState',
      'setRoom3BodyEnabled',
      'setMyzelInterpreterMix',
      'setMyzelCentralColorMixer',
      'nodalDeviceMatrix',
      'setRoom3BodyControls',
      'myzelInterpreterMix',
      'myzelCentralColorMixer',
      'room3BodyControls',
      'setMyzelInstallationMix',
      'myzelInstallationMix',
      'installationFieldConfig',
    ],
    sourceOwnerStillApp: true,
    readinessOnly: true,
    suggestedLaterBoundary: 'buildAppRoomSceneInstallationDeviceSource',
    risk: 'installation-device-sensitive',
    mayExtractBeforeDedicatedBuilder: false,
    ownsRuntime: false,
    mutatesAudio: false,
    ownsRoomLifecycle: false,
    ownsPackagePersistence: false,
    explicitlyNotMoved: [
      'nodal device handler bodies',
      'Room III body-control state ownership',
      'installation field config ownership',
      'particle mute source ownership',
    ],
  },
  installationResidentScene: {
    group: 'installationResidentScene',
    appSourceKeys: [
      'previewPendingCustomResident',
      'selectedResidentNode',
      'residentBaseHz',
      'residentAddFrequencyHz',
    ],
    boundaryInjectedKeys: [
      'toggleInstallNomadAttractor',
      'toggleInstallResidents',
      'setInstallResidentVolumeLevel',
      'setInstallResidentSystemValue',
      'setInstallResidentModeValue',
      'toggleInstallResidentWaveExcitation',
      'toggleInstallResidentBallCoupling',
      'setInstallParticleSoundMode',
      'setInstallResidentSoundPreset',
      'setInstallResidentElasticPitch',
      'customResidentSoundPreset',
      'customResidentElasticPitch',
      'setCustomResidentSoundPreset',
      'setCustomResidentElasticPitch',
      'setResidentAddFrequencySlider',
      'addInstallationResident',
      'residentConstellationName',
      'setResidentConstellationName',
      'savedResidentConstellations',
      'saveCurrentResidentConstellation',
      'loadResidentConstellation',
      'deleteResidentConstellation',
    ],
    sourceOwnerStillApp: true,
    readinessOnly: true,
    suggestedLaterBoundary: 'buildAppRoomSceneInstallationResidentSource',
    risk: 'installation-resident-sensitive',
    mayExtractBeforeDedicatedBuilder: false,
    ownsRuntime: false,
    mutatesAudio: false,
    ownsRoomLifecycle: false,
    ownsPackagePersistence: false,
    explicitlyNotMoved: [
      'resident preview behavior',
      'selected resident frequency mapping',
      'resident constellation persistence actions',
      'installation resident runtime-entry action bodies',
    ],
  },
  viewportXenpolarScene: {
    group: 'viewportXenpolarScene',
    appSourceKeys: [
      'familyRequestedActive',
      'installationSharedFieldController',
      'xenpolarView',
      'setXenpolarView',
      'resonanzwandererStatus',
      'resonanzwandererBusy',
      'resonanzwandererCanExport',
      'handleResonanzwandererExportToXensonar',
      'handleResonanzwandererExportToSpectralForge',
      'handleResonanzwandererExportToSyntheticForge',
    ],
    boundaryInjectedKeys: [],
    sourceOwnerStillApp: true,
    readinessOnly: true,
    suggestedLaterBoundary: 'buildAppRoomSceneViewportXenpolarSource',
    risk: 'viewport-xenpolar-handoff-sensitive',
    mayExtractBeforeDedicatedBuilder: false,
    ownsRuntime: false,
    mutatesAudio: false,
    ownsRoomLifecycle: false,
    ownsPackagePersistence: false,
    explicitlyNotMoved: [
      'Xenpolar view setter body',
      'Resonanzwanderer export handlers',
      'shared-field controller cross-room handoff',
    ],
  },
  viewportGameArenaScene: {
    group: 'viewportGameArenaScene',
    appSourceKeys: [
      'gameActive',
      'gameHud',
      'gameCanvasRef',
      'arenaSeedStatus',
      'handleArenaSeedExport',
      'startGameRun',
      'returnToXensonarHauptraum',
    ],
    boundaryInjectedKeys: [],
    sourceOwnerStillApp: true,
    readinessOnly: true,
    suggestedLaterBoundary: 'buildAppRoomSceneViewportGameArenaSource',
    risk: 'viewport-game-arena-sensitive',
    mayExtractBeforeDedicatedBuilder: false,
    ownsRuntime: false,
    mutatesAudio: false,
    ownsRoomLifecycle: false,
    ownsPackagePersistence: false,
    explicitlyNotMoved: [
      'game run start behavior',
      'arena seed export behavior',
      'Hauptraum return navigation behavior',
    ],
  },
  viewportSpectralForgeEntryScene: {
    group: 'viewportSpectralForgeEntryScene',
    appSourceKeys: [
      'externalAudioUploadFile',
      'externalAudioUploadOrigin',
      'entryScrollIntent',
      'onExternalAudioUploadConsumed',
      'onEntryScrollIntentConsumed',
    ],
    boundaryInjectedKeys: [],
    sourceOwnerStillApp: true,
    readinessOnly: true,
    suggestedLaterBoundary: 'buildAppRoomSceneViewportSpectralForgeEntrySource',
    risk: 'spectralforge-entry-handoff-sensitive',
    mayExtractBeforeDedicatedBuilder: false,
    ownsRuntime: false,
    mutatesAudio: false,
    ownsRoomLifecycle: false,
    ownsPackagePersistence: false,
    explicitlyNotMoved: [
      'SpectralForge external audio upload state ownership',
      'entry scroll-intent token consumption behavior',
      'Audio Upload und schneiden handoff semantics',
    ],
  },
} as const satisfies Record<
  AppRoomSceneRuntimeSourceReadinessGroupKey,
  AppRoomSceneRuntimeSourceReadinessEntry
>;

export const APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_AUDIT_MANIFEST = {
  cleanupKind: 'app-room-scene-runtime-source-readiness-audit',
  appStillOwnsRoomSceneSourceComposition: true,
  auditOnly: false,
  dedicatedRoomSceneSourceBuilderIntroduced: true,
  nextAllowedStepAfterAudit: 'buildAppRoomSceneRuntimeSource',
  allAppRoomSceneKeysCoveredByReadinessGroups: true,
  duplicateAppRoomSceneKeysAllowed: false,
  groupedSourceKeys: APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_GROUP_KEYS,
  strongestLaterCandidate: 'buildAppRoomSceneRuntimeSourceBuilderProbe',
  sourceBuilderProbeIntroducedIn: '3.2.91.6.9.162',
  explicitlyNotMoved: [
    'Room III topology runtime-entry actions',
    'topology canvas event handlers',
    'installation nodal-device and resident action bodies',
    'Xenpolar/Resonanzwanderer export handlers',
    'SpectralForge entry upload and scroll-intent consumers',
  ],
} as const;

export const APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_AUDIT_PROBE = null as unknown as {
  readonly groups: typeof APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_GROUP_KEYS;
  readonly audit: typeof APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_AUDIT;
  readonly manifest: typeof APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_AUDIT_MANIFEST;
};
