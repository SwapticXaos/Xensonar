import type { AppResonanceScreenStageSourceKey } from './appResonanceScreenPanelRuntimeArgsTypes';

export const APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_GROUP_KEYS = [
  'stageActivity',
  'stageCanvas',
  'stageAudioReadiness',
  'stageGridCursor',
  'stageInstallationGate',
] as const;

export type AppResonanceScreenStageSourceReadinessGroupKey =
  (typeof APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_GROUP_KEYS)[number];

export type AppResonanceScreenStageSourceReadinessRisk =
  | 'low-ui-state'
  | 'visual-stage'
  | 'audio-readiness-sensitive'
  | 'grid-cursor-sensitive'
  | 'installation-root-follow-gate-sensitive';

export type AppResonanceScreenStageSourceReadinessEntry = {
  readonly group: AppResonanceScreenStageSourceReadinessGroupKey;
  readonly sourceKeys: readonly AppResonanceScreenStageSourceKey[];
  readonly sourceOwnerStillApp: true;
  readonly readinessOnly: true;
  readonly suggestedLaterBoundary: string;
  readonly risk: AppResonanceScreenStageSourceReadinessRisk;
  readonly mayExtractBeforeDedicatedBuilder: false;
  readonly ownsRuntime: false;
  readonly mutatesAudio: false;
  readonly ownsRoomLifecycle: false;
  readonly ownsPackagePersistence: false;
  readonly explicitlyNotMoved: readonly string[];
};

export const APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_AUDIT = {
  stageActivity: {
    group: 'stageActivity',
    sourceKeys: [
      'nexusActive',
      'resonanceInputIndicator',
      'setNexusActive',
    ],
    sourceOwnerStillApp: true,
    readinessOnly: true,
    suggestedLaterBoundary: 'buildAppResonanceScreenStageActivitySource',
    risk: 'low-ui-state',
    mayExtractBeforeDedicatedBuilder: false,
    ownsRuntime: false,
    mutatesAudio: false,
    ownsRoomLifecycle: false,
    ownsPackagePersistence: false,
    explicitlyNotMoved: [
      'nexus active state ownership',
      'input indicator update behavior',
      'stage activity state setter body',
    ],
  },
  stageCanvas: {
    group: 'stageCanvas',
    sourceKeys: [
      'nexusCanvasRef',
      'gameWidth',
      'gameHeight',
      'spawnNexusRipple',
    ],
    sourceOwnerStillApp: true,
    readinessOnly: true,
    suggestedLaterBoundary: 'buildAppResonanceScreenStageCanvasSource',
    risk: 'visual-stage',
    mayExtractBeforeDedicatedBuilder: false,
    ownsRuntime: false,
    mutatesAudio: false,
    ownsRoomLifecycle: false,
    ownsPackagePersistence: false,
    explicitlyNotMoved: [
      'canvas ref ownership',
      'playfield dimensions',
      'nexus ripple gesture behavior',
    ],
  },
  stageAudioReadiness: {
    group: 'stageAudioReadiness',
    sourceKeys: [
      'ensureAudioReady',
      'prewarmAudioRuntime',
      'resetResonanceTransientState',
      'audioCtx',
    ],
    sourceOwnerStillApp: true,
    readinessOnly: true,
    suggestedLaterBoundary: 'buildAppResonanceScreenStageAudioReadinessSource',
    risk: 'audio-readiness-sensitive',
    mayExtractBeforeDedicatedBuilder: false,
    ownsRuntime: false,
    mutatesAudio: false,
    ownsRoomLifecycle: false,
    ownsPackagePersistence: false,
    explicitlyNotMoved: [
      'audio context ownership',
      'audio readiness promise/body',
      'runtime prewarm behavior',
      'transient state reset behavior',
    ],
  },
  stageGridCursor: {
    group: 'stageGridCursor',
    sourceKeys: [
      'updateNParams',
      'nexusParamsRef',
      'updateFocusCursor',
      'activeGridDragStepRef',
      'activeGridDragStartYRef',
      'activeGridDragBaseOffsetRef',
      'activeGridDragMovedRef',
      'getVisibleGridLines',
      'yFromFreq',
      'setManualGridStepOffset',
      'commitResonanceCursorY',
      'toggleManualGridStepMute',
    ],
    sourceOwnerStillApp: true,
    readinessOnly: true,
    suggestedLaterBoundary: 'buildAppResonanceScreenStageGridCursorSource',
    risk: 'grid-cursor-sensitive',
    mayExtractBeforeDedicatedBuilder: false,
    ownsRuntime: false,
    mutatesAudio: false,
    ownsRoomLifecycle: false,
    ownsPackagePersistence: false,
    explicitlyNotMoved: [
      'grid drag refs',
      'nexus parameter ref ownership',
      'cursor focus update behavior',
      'manual grid offset/mute action behavior',
      'resonance cursor commit behavior',
    ],
  },
  stageInstallationGate: {
    group: 'stageInstallationGate',
    sourceKeys: [
      'installationSharedFieldActive',
      'installationSharedFieldController',
      'nexusRefs',
      'setPlayfieldCursorInside',
    ],
    sourceOwnerStillApp: true,
    readinessOnly: true,
    suggestedLaterBoundary: 'buildAppResonanceScreenStageInstallationGateSource',
    risk: 'installation-root-follow-gate-sensitive',
    mayExtractBeforeDedicatedBuilder: false,
    ownsRuntime: false,
    mutatesAudio: false,
    ownsRoomLifecycle: false,
    ownsPackagePersistence: false,
    explicitlyNotMoved: [
      'installation shared-field controller ownership',
      'nexus refs ownership',
      'Root-Follow playfield inside gate behavior',
    ],
  },
} as const satisfies Record<
  AppResonanceScreenStageSourceReadinessGroupKey,
  AppResonanceScreenStageSourceReadinessEntry
>;

export const APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_AUDIT_MANIFEST = {
  cleanupKind: 'app-resonance-screen-stage-source-readiness-audit',
  appStillOwnsStageSourceComposition: true,
  auditOnly: false,
  dedicatedStageSourceBuilderIntroduced: true,
  nextAllowedStepAfterAudit: 'buildAppResonanceScreenStageSource',
  allStageKeysCoveredByReadinessGroups: true,
  duplicateStageKeysAllowed: false,
  groupedSourceKeys: APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_GROUP_KEYS,
  explicitlyNotMoved: [
    'stage source input groups remain in App.tsx',
    'stage canvas/audio-readiness bodies',
    'grid/cursor action bodies',
    'Root-Follow playfield inside gate behavior',
    'installation shared field controller ownership',
  ],
} as const;

export const APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_AUDIT_PROBE = null as unknown as {
  readonly groups: typeof APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_GROUP_KEYS;
  readonly audit: typeof APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_AUDIT;
  readonly manifest: typeof APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_AUDIT_MANIFEST;
};
