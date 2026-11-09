import { grooveStateFromMycelium } from '../../resonance/rhythmforge/bridges';
import { BASS_PATTERNS, DRUM_KITS, DRUM_PATTERNS } from '../domain/instrumentData';
import type { MaterialTrackPanelProps } from '../rooms/buildMaterialTrackPanelProps';

import type { AppMaterialTrackPanelBoundaryArgs, AppMaterialTrackPanelCompactBoundaryArgs, AppMaterialTrackPanelGroupedBoundaryArgs, AppMaterialTrackPreviewBoundaryArgs, AppMaterialTrackPreviewSourceBoundaryArgs } from './buildAppMaterialTrackPanelBoundaryTypes';

export type { AppMaterialTrackPanelBaseBoundaryArgs, AppMaterialTrackPanelBoundaryArgs, AppMaterialTrackPanelCompactBoundaryArgs, AppMaterialTrackPanelGroupedBoundaryArgs, AppMaterialTrackPreviewBoundaryArgs, AppMaterialTrackPreviewSourceBoundaryArgs } from './buildAppMaterialTrackPanelBoundaryTypes';

export const APP_MATERIAL_TRACK_PANEL_CALLSITE_CLEANUP_CONTRACT = {
  currentRole: 'app-material-track-panel-callsite-cleanup',
  previousAppCallsiteShape: 'app-owned-preview-value-assembly',
  currentAppCallsiteShape: 'compact-preview-source-forwarding',
  acceptsCompactPreviewSource: true,
  preservesGroupedPreviewInput: true,
  previewGroups: [
    'panelArgs',
    'preview',
    'previewSource',
  ],
  runtimeOwned: false,
  audioMutating: false,
  schedulingOwned: false,
  packagePersistenceOwned: false,
  materialImportExportOwned: false,
  explicitlyNotMoved: [
    'Materialspur import/export',
    'MaterialLoop runtime',
    'Root-Follow runtime',
    'drum/bass scheduling',
    'audio node construction',
    'package persistence',
  ],
} as const;

function isCompactMaterialTrackInput(
  input: AppMaterialTrackPanelBoundaryArgs,
): input is AppMaterialTrackPanelCompactBoundaryArgs {
  return 'previewSource' in input;
}

function resolveAppMaterialTrackPreviewBoundaryArgs(
  previewSource: AppMaterialTrackPreviewSourceBoundaryArgs,
): AppMaterialTrackPreviewBoundaryArgs {
  return {
    myceliumSnapshot: previewSource.myceliumSnapshotRef.current,
    currentTimeSec: previewSource.audioCtx?.currentTime ?? 0,
    nextAbsoluteStep: previewSource.nexusRefs.current.nextAbsoluteStep ?? 0,
    rhythmForgeSeed: previewSource.rhythmForgeSeedRef.current,
  };
}

export function buildAppBassPreviewContext({
  myceliumSnapshot,
  currentTimeSec,
  nextAbsoluteStep,
  rhythmForgeSeed,
}: AppMaterialTrackPreviewBoundaryArgs): NonNullable<MaterialTrackPanelProps['bassPreviewContext']> {
  const bassPreviewGroove = grooveStateFromMycelium(myceliumSnapshot, currentTimeSec);
  const bassPreviewNextStep = nextAbsoluteStep ?? 0;

  return {
    seed: rhythmForgeSeed,
    barIndex: Math.max(0, Math.floor(bassPreviewNextStep / 16)),
    descriptors: { ...bassPreviewGroove.descriptors },
  };
}

export function buildAppMaterialTrackPanelBoundary(
  input: AppMaterialTrackPanelBoundaryArgs,
): MaterialTrackPanelProps {
  const preview = isCompactMaterialTrackInput(input)
    ? resolveAppMaterialTrackPreviewBoundaryArgs(input.previewSource)
    : input.preview;
  const { preview: _preview, previewSource: _previewSource, ...panelArgs } = {
    ...input,
    preview,
  } as AppMaterialTrackPanelGroupedBoundaryArgs & Partial<AppMaterialTrackPanelCompactBoundaryArgs>;
  void _preview;
  void _previewSource;

  return {
    ...panelArgs,
    drumPatterns: DRUM_PATTERNS,
    drumKits: DRUM_KITS,
    bassPatterns: BASS_PATTERNS,
    bassPreviewContext: buildAppBassPreviewContext(preview),
  };
}
