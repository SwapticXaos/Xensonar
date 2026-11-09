import { buildSpectralDataFromComposite, type CanonicalSourceView } from './analysis';
import {
  DEFAULT_CANONICAL_LOGIC_VIEW,
  DEFAULT_CANONICAL_ROOM_STATUS,
  DEFAULT_CANONICAL_SOURCE_PREVIEW_MODE,
  DEFAULT_CANONICAL_TOOL,
  DEFAULT_CANONICAL_WORKSPACE,
  isCanonicalLogicView,
  isCanonicalSourcePreviewMode,
  isCanonicalTool,
} from './canonicalForgeContracts';
import {
  DEFAULT_EXPORT,
  DEFAULT_WAVEFORM_MIX,
  type MaterialExportConfig,
} from './canonicalForgeRoomContracts';
import {
  DEFAULT_GROOVE_MACHINE,
  DEFAULT_TOOL_SETTINGS,
  cloneDrumComputerState,
  cloneLoopComposerState,
  createEmptyDrumComputer,
  resizeDrumComputerState,
  sanitizeGrooveMachineConfig,
  type ChordVoicing,
  type DrumComputerState,
  type DrumViewportState,
  type GrooveMachineConfig,
  type LoopComposerState,
  type StampPhase,
} from './loopDrumDomain';
import {
  RANDOM_DEMO_MELODIC_PROJECT_ID,
  createRandomDemoMelodicComposer,
} from './melodicProjectLibrary';
import {
  createGeneratedMelodicPatternStoresFromComposer,
  type MelodicPatternLinkMap,
  type MelodicPatternVariantMap,
} from './melodicPatternStoreContract';
import type { SynthMode, WaveformMix } from './selectionAudioTransfer';
import type {
  CanonicalForgeSessionState,
  CanonicalForgeWorkspace,
  CanonicalLogicView,
  CanonicalSourcePreviewMode,
  CanonicalTool,
} from './sessionTypes';
import type { SpectralData, StampData } from '../spectralForge/audio/SpectralData';
import { cloneStampData, makeEmptySpectral } from './spectralWorkspaceUtils';
import { sanitizeDrumViewport } from './viewportMath';

export function buildInitialMaterialExport(
  initialSession: CanonicalForgeSessionState | null,
): MaterialExportConfig {
  return initialSession?.materialExport
    ? {
        ...DEFAULT_EXPORT,
        ...initialSession.materialExport,
        transferMode: initialSession.materialExport.transferMode ?? DEFAULT_EXPORT.transferMode,
        guideMarkers: [...initialSession.materialExport.guideMarkers],
      }
    : DEFAULT_EXPORT;
}

export function buildInitialSpectralData(
  initialSession: CanonicalForgeSessionState | null,
): SpectralData {
  const next = makeEmptySpectral();
  if (initialSession?.spectralSnapshot) next.restoreData(initialSession.spectralSnapshot);
  return next;
}

export function buildInitialWaveformMix(
  initialSession: CanonicalForgeSessionState | null,
): WaveformMix {
  return initialSession?.waveformMix ? { ...initialSession.waveformMix } : DEFAULT_WAVEFORM_MIX;
}

export function buildInitialStampData(
  initialSession: CanonicalForgeSessionState | null,
): StampData | null {
  return initialSession?.stampData ? cloneStampData(initialSession.stampData) : null;
}

export function buildInitialGrooveMachine(
  initialSession: CanonicalForgeSessionState | null,
): GrooveMachineConfig {
  return sanitizeGrooveMachineConfig(initialSession?.grooveMachine ?? DEFAULT_GROOVE_MACHINE);
}

export function buildInitialDrumComputer(
  initialSession: CanonicalForgeSessionState | null,
): DrumComputerState {
  const sessionDrums = initialSession?.drumComputer as DrumComputerState | undefined;
  const barsInterpretation = initialSession?.grooveMachine?.barsInterpretation ?? DEFAULT_GROOVE_MACHINE.barsInterpretation;
  return sessionDrums
    ? cloneDrumComputerState(
        resizeDrumComputerState(
          sessionDrums,
          barsInterpretation,
          sessionDrums.segmentsPerBar,
          sessionDrums.segmentMarkers,
        ),
      )
    : createEmptyDrumComputer(barsInterpretation);
}

export function buildInitialDrumViewport(
  initialSession: CanonicalForgeSessionState | null,
): DrumViewportState {
  return sanitizeDrumViewport(initialSession?.drumViewport, initialSession?.drumComputer?.stepCount ?? 16);
}

export function buildInitialLoopComposerState(
  initialSession: CanonicalForgeSessionState | null,
): LoopComposerState {
  return initialSession?.loopComposer
    ? cloneLoopComposerState(initialSession.loopComposer as LoopComposerState)
    : createRandomDemoMelodicComposer(
        initialSession?.grooveMachine?.barsInterpretation ?? DEFAULT_GROOVE_MACHINE.barsInterpretation,
      );
}

export function buildInitialLoopPatternVariants(
  initialLoopComposerState: LoopComposerState,
): MelodicPatternVariantMap {
  return createGeneratedMelodicPatternStoresFromComposer(cloneLoopComposerState(initialLoopComposerState)).variants;
}

export function buildInitialLoopPatternLinks(
  initialLoopComposerState: LoopComposerState,
): MelodicPatternLinkMap {
  return createGeneratedMelodicPatternStoresFromComposer(cloneLoopComposerState(initialLoopComposerState)).links;
}

export function buildInitialSelectedMelodicProjectId(
  initialSession: CanonicalForgeSessionState | null,
): string {
  return initialSession?.loopComposer ? '' : RANDOM_DEMO_MELODIC_PROJECT_ID;
}

export function buildInitialStampPhase(
  initialSession: CanonicalForgeSessionState | null,
): StampPhase {
  return initialSession?.stampData ? 'stamping' : 'idle';
}

export function buildInitialProxyBaselineSnapshot(
  initialSession: CanonicalForgeSessionState | null,
): Float32Array | null {
  return initialSession?.sourceAsset && initialSession.bundle
    ? buildSpectralDataFromComposite(
        initialSession.bundle,
        initialSession.sourceView ?? 'synesthetic',
        initialSession.secondaryView ?? 'harmonic',
        initialSession.viewBlend ?? 0.26,
      ).cloneData()
    : null;
}

export function buildInitialStampLoadedMode(
  initialSession: CanonicalForgeSessionState | null,
): 'positive' | 'erase' {
  return (initialSession?.toolSettings.eraseMode ?? DEFAULT_TOOL_SETTINGS.eraseMode) ? 'erase' : 'positive';
}


export function buildInitialActiveTool(
  initialSession: CanonicalForgeSessionState | null,
): CanonicalTool {
  return isCanonicalTool(initialSession?.activeTool) ? initialSession.activeTool : DEFAULT_CANONICAL_TOOL;
}

export function buildInitialSourcePreviewMode(
  initialSession: CanonicalForgeSessionState | null,
): CanonicalSourcePreviewMode {
  return isCanonicalSourcePreviewMode(initialSession?.sourcePreviewMode)
    ? initialSession.sourcePreviewMode
    : DEFAULT_CANONICAL_SOURCE_PREVIEW_MODE;
}

export function buildInitialActiveWorkspace(): CanonicalForgeWorkspace {
  return DEFAULT_CANONICAL_WORKSPACE;
}

export function buildInitialLogicView(args: {
  initialSession: CanonicalForgeSessionState | null;
  externalLogicView?: CanonicalLogicView;
}): CanonicalLogicView {
  const { initialSession, externalLogicView } = args;
  return isCanonicalLogicView(externalLogicView)
    ? externalLogicView
    : isCanonicalLogicView((initialSession as { logicView?: unknown } | null)?.logicView)
      ? (initialSession as { logicView?: CanonicalLogicView }).logicView ?? DEFAULT_CANONICAL_LOGIC_VIEW
      : DEFAULT_CANONICAL_LOGIC_VIEW;
}

export function buildInitialRoomStatus(
  initialSession: CanonicalForgeSessionState | null,
): string {
  return typeof initialSession?.status === 'string' && initialSession.status.trim().length > 0
    ? initialSession.status
    : DEFAULT_CANONICAL_ROOM_STATUS;
}


export function buildCanonicalForgeInitialState(args: {
  initialSession: CanonicalForgeSessionState | null;
  externalLogicView?: CanonicalLogicView;
}) {
  const { initialSession, externalLogicView } = args;
  const initialLoopComposerState = buildInitialLoopComposerState(initialSession);
  const initialPatternStores = createGeneratedMelodicPatternStoresFromComposer(initialLoopComposerState);
  return {
    materialExport: buildInitialMaterialExport(initialSession),
    rawSourceAsset: initialSession?.rawSourceAsset ?? null,
    sourceAsset: initialSession?.sourceAsset ?? null,
    bundle: initialSession?.bundle ?? null,
    spectralData: buildInitialSpectralData(initialSession),
    sourceView: (initialSession?.sourceView ?? 'synesthetic') as CanonicalSourceView,
    secondaryView: (initialSession?.secondaryView ?? 'harmonic') as CanonicalSourceView | 'none',
    viewBlend: initialSession?.viewBlend ?? 0.26,
    activeTool: buildInitialActiveTool(initialSession),
    sourcePreviewMode: buildInitialSourcePreviewMode(initialSession),
    activeWorkspace: buildInitialActiveWorkspace(),
    logicView: buildInitialLogicView({ initialSession, externalLogicView }),
    status: buildInitialRoomStatus(initialSession),
    brushSize: initialSession?.toolSettings.brushSize ?? DEFAULT_TOOL_SETTINGS.brushSize,
    intensity: initialSession?.toolSettings.intensity ?? DEFAULT_TOOL_SETTINGS.intensity,
    hardness: initialSession?.toolSettings.hardness ?? DEFAULT_TOOL_SETTINGS.hardness,
    eraseMode: initialSession?.toolSettings.eraseMode ?? DEFAULT_TOOL_SETTINGS.eraseMode,
    morphMode: initialSession?.toolSettings.morphMode ?? DEFAULT_TOOL_SETTINGS.morphMode,
    synthMode: (initialSession?.synthMode ?? 'glyph') as SynthMode,
    waveformMix: buildInitialWaveformMix(initialSession),
    stampPresetId: initialSession?.stampPresetId ?? '',
    stampData: buildInitialStampData(initialSession),
    stampScaleX: initialSession?.stampScaleX ?? 1,
    stampScaleY: initialSession?.stampScaleY ?? 1,
    stampRotation: initialSession?.stampRotation ?? 0,
    stampFlipX: initialSession?.stampFlipX ?? false,
    stampFlipY: initialSession?.stampFlipY ?? false,
    selectionStartSec: initialSession?.selectionStartSec ?? 0,
    selectionDurationSec: initialSession?.selectionDurationSec ?? 10,
    selectionDirty: initialSession?.selectionDirty ?? false,
    detailSelectionStartSec: initialSession?.detailSelectionStartSec ?? (initialSession?.selectionStartSec ?? 0),
    detailSelectionDurationSec: initialSession?.detailSelectionDurationSec ?? (initialSession?.selectionDurationSec ?? 10),
    detailSelectionDirty: initialSession?.detailSelectionDirty ?? false,
    detailViewportStartSec: initialSession?.detailViewportStartSec ?? (initialSession?.selectionStartSec ?? 0),
    detailViewportDurationSec: initialSession?.detailViewportDurationSec ?? Math.max(initialSession?.selectionDurationSec ?? 10, 0.5),
    detailZoom: initialSession?.detailZoom ?? 1,
    detailOffset: initialSession?.detailOffset ?? 0,
    auditionView: (initialSession?.auditionView ?? 'none') as CanonicalSourceView | 'none',
    auditionBlendAmount: initialSession?.auditionBlendAmount ?? 0,
    selectedProjectId: initialSession?.selectedProjectId ?? null,
    grooveMachine: buildInitialGrooveMachine(initialSession),
    drumComputer: buildInitialDrumComputer(initialSession),
    drumViewport: buildInitialDrumViewport(initialSession),
    loopComposer: cloneLoopComposerState(initialLoopComposerState),
    loopPatternVariants: initialPatternStores.variants,
    loopPatternLinks: initialPatternStores.links,
    selectedMelodicProjectId: buildInitialSelectedMelodicProjectId(initialSession),
    selectedLoopNoteIds: initialSession?.selectedLoopNoteIds ?? [],
    autoZoomOnDenseOverlap: initialSession?.autoZoomOnDenseOverlap ?? false,
    lockTrackEditing: initialSession?.lockTrackEditing ?? false,
    chordVoicing: (initialSession?.chordVoicing ?? 'triad') as ChordVoicing,
    chordStrumSteps: initialSession?.chordStrumSteps ?? 0,
    chordVelocitySlope: initialSession?.chordVelocitySlope ?? 0.08,
    stampPhase: buildInitialStampPhase(initialSession),
    proxyBaselineSnapshot: buildInitialProxyBaselineSnapshot(initialSession),
    stampLoadedMode: buildInitialStampLoadedMode(initialSession),
    projectName: initialSession?.materialExport.name ?? DEFAULT_EXPORT.name,
  };
}

export type CanonicalForgeInitialState = ReturnType<typeof buildCanonicalForgeInitialState>;
