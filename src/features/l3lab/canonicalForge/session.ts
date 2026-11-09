import type { CanonicalForgeSessionState } from './sessionTypes';

export type {
  CanonicalCarrierIntegralFieldVoiceEvent,
  CanonicalCarrierIntegralFieldClip,
  CanonicalTool,
  CanonicalSynthMode,
  CanonicalMaterialRole,
  CanonicalSourcePreviewMode,
  CanonicalForgeWorkspace,
  CanonicalLogicView,
  CanonicalTransferMode,
  CanonicalMaterialExportConfig,
  WaveformMix,
  CanonicalToolSettings,
  CanonicalLoopPitchStep,
  CanonicalLoopPitchLine,
  CanonicalLoopTimeGuideMarker,
  CanonicalLoopTrack,
  CanonicalLoopNoteRenderSourceKind,
  CanonicalLoopNoteEvent,
  CanonicalLoopComposerTuning,
  CanonicalLoopComposerRepetitionModel,
  CanonicalLoopCompositionPreset,
  CanonicalLoopComposerState,
  CanonicalDrumVoiceId,
  CanonicalDrumComputerState,
  CanonicalDrumViewportState,
  CanonicalForgeSessionState,
} from './sessionTypes';

let cachedSession: CanonicalForgeSessionState | null = null;

export function getSyntheticForgeSession(): CanonicalForgeSessionState | null {
  return cachedSession;
}

export function setSyntheticForgeSession(next: CanonicalForgeSessionState | null) {
  cachedSession = next;
}

/** @deprecated Legacy implementation alias. Use getSyntheticForgeSession. */
export const getCanonicalForgeSession = getSyntheticForgeSession;
/** @deprecated Legacy implementation alias. Use setSyntheticForgeSession. */
export const setCanonicalForgeSession = setSyntheticForgeSession;
