import { buildAppResonanceScreenRuntimeEntry } from '../runtimeEntries';
import { buildAppResonanceAuxPanelRuntimeArgs } from './appResonanceAuxPanelRuntimeArgs';
import type {
  AppResonanceAuxPanelRuntimeArgs,
  BuildAppResonanceAuxPanelRuntimeArgsInput,
} from './appResonanceAuxPanelRuntimeArgsTypes';
import {
  buildAppResonanceScreenPanelRuntimeArgs,
} from './appResonanceScreenPanelRuntimeArgs';
import type {
  AppResonanceScreenCorePanelSourceArgs,
  AppResonanceScreenSoundPaletteActionSource,
  ResonanceScreenRuntimeArgs,
} from './appResonanceScreenPanelRuntimeArgsTypes';

export {
  APP_RESONANCE_SCREEN_CORE_PANEL_SOURCE_GROUP_MAP,
  APP_RESONANCE_SCREEN_PANEL_RUNTIME_ARGS_BUILDER_EXTRACT,
  APP_RESONANCE_SCREEN_SOUND_PALETTE_ACTION_SOURCE_CLEANUP,
  APP_RESONANCE_SCREEN_SOUND_PALETTE_CATALOG_SOURCE_CLEANUP,
  buildAppResonanceScreenCorePanelArgs,
  buildAppResonanceScreenPanelRuntimeArgs,
  buildAppResonanceScreenSoundPaletteActionArgs,
  buildAppResonanceScreenSoundPaletteCatalogArgs,
} from './appResonanceScreenPanelRuntimeArgs';
export {
  APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_AUDIT,
  APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_AUDIT_MANIFEST,
  APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_GROUP_KEYS,
} from './appResonanceScreenStageSourceReadinessAudit';

export const APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_BUILD_ORDER = [
  'chrome',
  'auxPanels',
  'resonancePanels',
  'soundPaletteActions',
  'auxFlattening',
  'screenRuntimeEntry',
] as const;

export type AppResonanceScreenRuntimeBoundaryContractKey =
  (typeof APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_BUILD_ORDER)[number];

export type AppResonanceScreenRuntimeBoundaryInputContractMap = {
  readonly chrome: ResonanceScreenRuntimeArgs['chrome'];
  readonly auxPanels: BuildAppResonanceAuxPanelRuntimeArgsInput;
  readonly resonancePanels: AppResonanceScreenCorePanelSourceArgs;
  readonly soundPaletteActions: AppResonanceScreenSoundPaletteActionSource;
};

export type UseAppResonanceScreenRuntimeBoundaryArgs =
  AppResonanceScreenRuntimeBoundaryInputContractMap;

export type AppResonanceScreenRuntimeBoundary = ReturnType<
  typeof buildAppResonanceScreenRuntimeEntry
>;

export type AppResonanceScreenRuntimeBoundaryOutputContractMap = {
  readonly auxFlattening: AppResonanceAuxPanelRuntimeArgs;
  readonly screenRuntimeEntry: AppResonanceScreenRuntimeBoundary;
};

export type AppResonanceScreenRuntimeBoundaryInputContractName =
  | 'UseAppResonanceScreenRuntimeBoundaryArgs.chrome'
  | 'UseAppResonanceScreenRuntimeBoundaryArgs.auxPanels'
  | 'AppResonanceScreenCorePanelSourceArgs'
  | 'AppResonanceScreenSoundPaletteActionSource'
  | 'AppResonanceAuxPanelRuntimeArgs'
  | 'AppResonanceScreenRuntimeBoundary';

export type AppResonanceScreenRuntimeBoundaryOutputContractName =
  | 'UseAppResonanceScreenRuntimeBoundaryArgs.chrome'
  | 'UseAppResonanceScreenRuntimeBoundaryArgs.auxPanels'
  | 'AppResonanceScreenCorePanelArgs'
  | 'AppResonanceScreenSoundPaletteActionArgs'
  | 'AppResonanceAuxPanelRuntimeArgs'
  | 'AppResonanceScreenRuntimeBoundary';

export type AppResonanceScreenRuntimeBoundaryContractEntry = {
  readonly boundary: AppResonanceScreenRuntimeBoundaryContractKey;
  readonly inputContract: AppResonanceScreenRuntimeBoundaryInputContractName;
  readonly outputContract: AppResonanceScreenRuntimeBoundaryOutputContractName;
  readonly composer: string;
  readonly boundaryOwnsRuntime: false;
  readonly boundaryMutatesAudio: false;
  readonly boundaryOwnsRoomLifecycle: false;
  readonly boundaryOwnsPackagePersistence: false;
};

export const APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_CONTRACT = {
  chrome: {
    boundary: 'chrome',
    inputContract: 'UseAppResonanceScreenRuntimeBoundaryArgs.chrome',
    outputContract: 'UseAppResonanceScreenRuntimeBoundaryArgs.chrome',
    composer: 'passthrough-chrome-runtime-bindings',
    boundaryOwnsRuntime: false,
    boundaryMutatesAudio: false,
    boundaryOwnsRoomLifecycle: false,
    boundaryOwnsPackagePersistence: false,
  },
  auxPanels: {
    boundary: 'auxPanels',
    inputContract: 'UseAppResonanceScreenRuntimeBoundaryArgs.auxPanels',
    outputContract: 'UseAppResonanceScreenRuntimeBoundaryArgs.auxPanels',
    composer: 'pass-input-to-buildAppResonanceAuxPanelRuntimeArgs',
    boundaryOwnsRuntime: false,
    boundaryMutatesAudio: false,
    boundaryOwnsRoomLifecycle: false,
    boundaryOwnsPackagePersistence: false,
  },
  resonancePanels: {
    boundary: 'resonancePanels',
    inputContract: 'AppResonanceScreenCorePanelSourceArgs',
    outputContract: 'AppResonanceScreenCorePanelArgs',
    composer: 'buildAppResonanceScreenCorePanelArgs',
    boundaryOwnsRuntime: false,
    boundaryMutatesAudio: false,
    boundaryOwnsRoomLifecycle: false,
    boundaryOwnsPackagePersistence: false,
  },
  soundPaletteActions: {
    boundary: 'soundPaletteActions',
    inputContract: 'AppResonanceScreenSoundPaletteActionSource',
    outputContract: 'AppResonanceScreenSoundPaletteActionArgs',
    composer: 'buildAppResonanceScreenSoundPaletteActionArgs',
    boundaryOwnsRuntime: false,
    boundaryMutatesAudio: false,
    boundaryOwnsRoomLifecycle: false,
    boundaryOwnsPackagePersistence: false,
  },
  auxFlattening: {
    boundary: 'auxFlattening',
    inputContract: 'UseAppResonanceScreenRuntimeBoundaryArgs.auxPanels',
    outputContract: 'AppResonanceAuxPanelRuntimeArgs',
    composer: 'buildAppResonanceAuxPanelRuntimeArgs',
    boundaryOwnsRuntime: false,
    boundaryMutatesAudio: false,
    boundaryOwnsRoomLifecycle: false,
    boundaryOwnsPackagePersistence: false,
  },
  screenRuntimeEntry: {
    boundary: 'screenRuntimeEntry',
    inputContract: 'AppResonanceScreenRuntimeBoundary',
    outputContract: 'AppResonanceScreenRuntimeBoundary',
    composer: 'buildAppResonanceScreenRuntimeEntry',
    boundaryOwnsRuntime: false,
    boundaryMutatesAudio: false,
    boundaryOwnsRoomLifecycle: false,
    boundaryOwnsPackagePersistence: false,
  },
} as const satisfies Record<
  AppResonanceScreenRuntimeBoundaryContractKey,
  AppResonanceScreenRuntimeBoundaryContractEntry
>;

export const APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_CONTRACT_CLEANUP_PROBE =
  null as unknown as {
    readonly buildOrder: typeof APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_BUILD_ORDER;
    readonly inputs: AppResonanceScreenRuntimeBoundaryInputContractMap;
    readonly outputs: AppResonanceScreenRuntimeBoundaryOutputContractMap;
    readonly contract: typeof APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_CONTRACT;
  };

export type AppResonanceScreenRuntimeBridgeReadiness = {
  readonly bridgeCandidate: true;
  readonly candidateBoundaryName: 'useAppResonanceScreenRuntimeBoundary';
  readonly currentBoundaryKind: 'app-resonance-screen-runtime-composition-bridge';
  readonly avoidsAdditionalPassThroughBridgeFile: true;
  readonly appOwnsScreenRuntimeInputComposition: true;
  readonly bridgeOwnsAuxPanelFlattening: true;
  readonly bridgeOwnsScreenRuntimeEntryComposition: true;
  readonly bridgeOwnsRuntime: false;
  readonly bridgeMutatesAudio: false;
  readonly bridgeOwnsRoomLifecycle: false;
  readonly bridgeOwnsPackagePersistence: false;
  readonly bridgeOwnsRootFollowRuntime: false;
  readonly bridgeOwnsRecordingRuntime: false;
  readonly bridgeOwnsParticleRuntime: false;
  readonly buildOrder: typeof APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_BUILD_ORDER;
  readonly contract: typeof APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_CONTRACT;
  readonly dependencyAudit: 'appResonanceScreenRuntimeArgsDependencyAudit';
  readonly shapeAudit: 'appResonanceScreenRuntimeArgsShapeAudit';
  readonly readinessQuestion: 'existing-boundary-can-remain-merge-friendly-before-adding-a-new-screen-runtime-bridge-layer';
};

export const APP_RESONANCE_SCREEN_RUNTIME_BRIDGE_READINESS = {
  bridgeCandidate: true,
  candidateBoundaryName: 'useAppResonanceScreenRuntimeBoundary',
  currentBoundaryKind: 'app-resonance-screen-runtime-composition-bridge',
  avoidsAdditionalPassThroughBridgeFile: true,
  appOwnsScreenRuntimeInputComposition: true,
  bridgeOwnsAuxPanelFlattening: true,
  bridgeOwnsScreenRuntimeEntryComposition: true,
  bridgeOwnsRuntime: false,
  bridgeMutatesAudio: false,
  bridgeOwnsRoomLifecycle: false,
  bridgeOwnsPackagePersistence: false,
  bridgeOwnsRootFollowRuntime: false,
  bridgeOwnsRecordingRuntime: false,
  bridgeOwnsParticleRuntime: false,
  buildOrder: APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_BUILD_ORDER,
  contract: APP_RESONANCE_SCREEN_RUNTIME_BOUNDARY_CONTRACT,
  dependencyAudit: 'appResonanceScreenRuntimeArgsDependencyAudit',
  shapeAudit: 'appResonanceScreenRuntimeArgsShapeAudit',
  readinessQuestion:
    'existing-boundary-can-remain-merge-friendly-before-adding-a-new-screen-runtime-bridge-layer',
} as const satisfies AppResonanceScreenRuntimeBridgeReadiness;


export function useAppResonanceScreenRuntimeBoundary({
  chrome,
  resonancePanels,
  auxPanels,
  soundPaletteActions,
}: UseAppResonanceScreenRuntimeBoundaryArgs): AppResonanceScreenRuntimeBoundary {
  const appResonanceAuxPanelRuntimeArgs = buildAppResonanceAuxPanelRuntimeArgs(auxPanels);
  const resonancePanelRuntimeArgs = buildAppResonanceScreenPanelRuntimeArgs({
    corePanelSource: resonancePanels,
    soundPaletteActions,
    auxPanelArgs: appResonanceAuxPanelRuntimeArgs,
  });

  const runtimeBoundary = buildAppResonanceScreenRuntimeEntry({
    chrome,
    resonancePanels: resonancePanelRuntimeArgs,
  }) satisfies AppResonanceScreenRuntimeBoundary;

  return runtimeBoundary;
}
