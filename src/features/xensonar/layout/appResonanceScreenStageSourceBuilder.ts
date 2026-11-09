import type { AppResonanceScreenStageSourceArgs } from './appResonanceScreenPanelRuntimeArgsTypes';
import type { BuildAppResonanceScreenStageSourceInput } from './appResonanceScreenStageSourceTypes';
export type {
  AppResonanceScreenStageActivitySourceArgs,
  AppResonanceScreenStageAudioReadinessSourceArgs,
  AppResonanceScreenStageCanvasSourceArgs,
  AppResonanceScreenStageGridCursorSourceArgs,
  AppResonanceScreenStageInstallationGateSourceArgs,
  BuildAppResonanceScreenStageSourceInput,
} from './appResonanceScreenStageSourceTypes';
import {
  APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_AUDIT,
  APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_GROUP_KEYS,
} from './appResonanceScreenStageSourceReadinessAudit';

export const APP_RESONANCE_SCREEN_STAGE_SOURCE_BUILDER_PROBE = {
  candidateModuleName: 'appResonanceScreenStageSourceBuilder',
  cleanupKind: 'app-resonance-screen-stage-source-builder-probe',
  appOwnsStageSourceInputComposition: true,
  builderOwnsStageSourceFlattening: true,
  builderOwnsRuntime: false,
  builderMutatesAudio: false,
  builderOwnsRoomLifecycle: false,
  builderOwnsPackagePersistence: false,
  builderOwnsRootFollowRuntime: false,
  builderCreatesStageHandlers: false,
  builderReadsOrWritesRefs: false,
  readinessGroups: APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_GROUP_KEYS,
  readinessAudit: APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_AUDIT,
  explicitlyNotMoved: [
    'stage handler construction remains in buildResonanceStagePanelProps',
    'audio readiness bodies remain App-owned/runtime-owned inputs',
    'grid/cursor action bodies remain App-owned inputs',
    'Root-Follow playfield inside gate remains an explicit installationGate input',
  ] as const,
} as const;

export function buildAppResonanceScreenStageSource({
  activity,
  canvas,
  audioReadiness,
  gridCursor,
  installationGate,
}: BuildAppResonanceScreenStageSourceInput): AppResonanceScreenStageSourceArgs {
  return {
    ...activity,
    ...canvas,
    ...audioReadiness,
    ...gridCursor,
    ...installationGate,
  } satisfies AppResonanceScreenStageSourceArgs;
}
