import { buildCanonicalAnalysisBundle, buildSpectralDataFromComposite } from './analysis';
import { loadCanonicalForgeProject } from './projectLibrary';
import type { CanonicalForgeProjectSnapshot } from './projectLibraryTypes';
import { cloneDrumComputerState, cloneLoopComposerState, createEmptyDrumComputer, createEmptyLoopComposer, resizeDrumComputerState, buildLoopComposerFromPresets, sanitizeGrooveMachineConfig, type DrumComputerState, type LoopComposerState } from './loopDrumDomain';
import { buildRawPreviewAsset, cloneStampData, makeEmptySpectral } from './spectralWorkspaceUtils';
import type { CanonicalLogicView, CanonicalForgeWorkspace } from './sessionTypes';
import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporterTypes';
import type { CanonicalAnalysisBundle } from './analysis';

export type DefaultMaterialExportConfig = CanonicalForgeProjectSnapshot['materialExport'];

type Setter<T> = (value: T) => void;
type Updater = (updater: (value: number) => number) => void;

export async function loadForgeProjectIntoWorkspace(args: {
  id: string;
  defaultExport: DefaultMaterialExportConfig;
  fallbackBarsInterpretation: number;
  applyLogicView: (nextView: CanonicalLogicView) => void;
  setBusy: Setter<boolean>;
  setStatus: Setter<string>;
  setMaterialExport: Setter<DefaultMaterialExportConfig>;
  setSpectralData: Setter<ReturnType<typeof makeEmptySpectral>>;
  setSourceView: Setter<CanonicalForgeProjectSnapshot['sourceView']>;
  setSecondaryView: Setter<CanonicalForgeProjectSnapshot['secondaryView']>;
  setViewBlend: Setter<number>;
  setActiveTool: Setter<CanonicalForgeProjectSnapshot['activeTool']>;
  setBrushSize: Setter<number>;
  setIntensity: Setter<number>;
  setHardness: Setter<number>;
  setEraseMode: Setter<boolean>;
  setMorphMode: Setter<CanonicalForgeProjectSnapshot['toolSettings']['morphMode']>;
  setSynthMode: Setter<CanonicalForgeProjectSnapshot['synthMode']>;
  setWaveformMix: Setter<CanonicalForgeProjectSnapshot['waveformMix']>;
  setStampPresetId: Setter<string>;
  setStampData: Setter<CanonicalForgeProjectSnapshot['stampData']>;
  setStampScaleX: Setter<number>;
  setStampScaleY: Setter<number>;
  setStampRotation: Setter<number>;
  setStampFlipX: Setter<boolean>;
  setStampFlipY: Setter<boolean>;
  setSelectionStartSec: Setter<number>;
  setSelectionDurationSec: Setter<number>;
  setSelectionDirty: Setter<boolean>;
  setDetailSelectionStartSec: Setter<number>;
  setDetailSelectionDurationSec: Setter<number>;
  setDetailSelectionDirty: Setter<boolean>;
  setDetailViewportStartSec: Setter<number>;
  setDetailViewportDurationSec: Setter<number>;
  setDetailZoom: Setter<number>;
  setDetailOffset: Setter<number>;
  setAuditionView: Setter<CanonicalForgeProjectSnapshot['auditionView'] extends infer T ? Exclude<T, undefined> : never>;
  setAuditionBlendAmount: Setter<number>;
  setSelectedProjectId: Setter<string | null>;
  setProjectName: Setter<string>;
  setSourcePreviewMode: Setter<CanonicalForgeProjectSnapshot['sourcePreviewMode']>;
  setActiveWorkspace: Setter<CanonicalForgeWorkspace>;
  setGrooveMachine: Setter<CanonicalForgeProjectSnapshot['grooveMachine']>;
  setDrumComputer: Setter<DrumComputerState>;
  setLoopComposer: Setter<LoopComposerState>;
  setSelectedLoopNoteIds: Setter<string[]>;
  setAutoZoomOnDenseOverlap: Setter<boolean>;
  setLockTrackEditing: Setter<boolean>;
  setChordVoicing: Setter<NonNullable<CanonicalForgeProjectSnapshot['chordVoicing']>>;
  setChordStrumSteps: Setter<number>;
  setChordVelocitySlope: Setter<number>;
  setSourceAsset: Setter<AudioSourceAsset | null>;
  setRawSourceAsset: Setter<AudioSourceAsset | null>;
  setBundle: Setter<CanonicalAnalysisBundle | null>;
  updateProxyBaselineSnapshot: (next: ReturnType<typeof buildSpectralDataFromComposite> | null) => void;
  clearHistory: () => void;
  bumpHistoryVersion: Updater;
  bumpRevision: Updater;
  invalidateAudioBuffer: () => void;
}) {
  const {
    id,
    defaultExport,
    fallbackBarsInterpretation,
    applyLogicView,
    setBusy,
    setStatus,
    setMaterialExport,
    setSpectralData,
    setSourceView,
    setSecondaryView,
    setViewBlend,
    setActiveTool,
    setBrushSize,
    setIntensity,
    setHardness,
    setEraseMode,
    setMorphMode,
    setSynthMode,
    setWaveformMix,
    setStampPresetId,
    setStampData,
    setStampScaleX,
    setStampScaleY,
    setStampRotation,
    setStampFlipX,
    setStampFlipY,
    setSelectionStartSec,
    setSelectionDurationSec,
    setSelectionDirty,
    setDetailSelectionStartSec,
    setDetailSelectionDurationSec,
    setDetailSelectionDirty,
    setDetailViewportStartSec,
    setDetailViewportDurationSec,
    setDetailZoom,
    setDetailOffset,
    setAuditionView,
    setAuditionBlendAmount,
    setSelectedProjectId,
    setProjectName,
    setSourcePreviewMode,
    setActiveWorkspace,
    setGrooveMachine,
    setDrumComputer,
    setLoopComposer,
    setSelectedLoopNoteIds,
    setAutoZoomOnDenseOverlap,
    setLockTrackEditing,
    setChordVoicing,
    setChordStrumSteps,
    setChordVelocitySlope,
    setSourceAsset,
    setRawSourceAsset,
    setBundle,
    updateProxyBaselineSnapshot,
    clearHistory,
    bumpHistoryVersion,
    bumpRevision,
    invalidateAudioBuffer,
  } = args;

  setBusy(true);
  try {
    const record = await loadCanonicalForgeProject(id);
    const snapshot = record.snapshot;
    const next = makeEmptySpectral();
    if (snapshot.spectralSnapshot) next.restoreData(snapshot.spectralSnapshot);
    setMaterialExport({
      ...defaultExport,
      ...snapshot.materialExport,
      transferMode: snapshot.materialExport.transferMode ?? defaultExport.transferMode,
      guideMarkers: [...snapshot.materialExport.guideMarkers],
    });
    setSpectralData(next);
    setSourceView(snapshot.sourceView);
    setSecondaryView(snapshot.secondaryView);
    setViewBlend(snapshot.viewBlend);
    setActiveTool(snapshot.activeTool);
    setBrushSize(snapshot.toolSettings.brushSize);
    setIntensity(snapshot.toolSettings.intensity);
    setHardness(snapshot.toolSettings.hardness);
    setEraseMode(snapshot.toolSettings.eraseMode);
    setMorphMode(snapshot.toolSettings.morphMode);
    setSynthMode(snapshot.synthMode);
    setWaveformMix({ ...snapshot.waveformMix });
    setStampPresetId(snapshot.stampPresetId);
    setStampData(cloneStampData(snapshot.stampData));
    setStampScaleX(snapshot.stampScaleX);
    setStampScaleY(snapshot.stampScaleY);
    setStampRotation(snapshot.stampRotation);
    setStampFlipX(snapshot.stampFlipX);
    setStampFlipY(snapshot.stampFlipY);
    setSelectionStartSec(snapshot.selectionStartSec);
    setSelectionDurationSec(snapshot.selectionDurationSec);
    setSelectionDirty(snapshot.selectionDirty);
    setDetailSelectionStartSec(snapshot.detailSelectionStartSec ?? snapshot.selectionStartSec);
    setDetailSelectionDurationSec(snapshot.detailSelectionDurationSec ?? snapshot.selectionDurationSec);
    setDetailSelectionDirty(snapshot.detailSelectionDirty ?? false);
    setDetailViewportStartSec(snapshot.detailViewportStartSec ?? snapshot.selectionStartSec);
    setDetailViewportDurationSec(snapshot.detailViewportDurationSec ?? Math.max(snapshot.selectionDurationSec, 0.5));
    setDetailZoom(snapshot.detailZoom);
    setDetailOffset(snapshot.detailOffset);
    setAuditionView(snapshot.auditionView ?? 'none');
    setAuditionBlendAmount(snapshot.auditionBlendAmount ?? 0);
    setSelectedProjectId(id);
    setProjectName(record.name);
    setSourcePreviewMode(snapshot.sourcePreviewMode);
    setActiveWorkspace('microtonal-logic');
    applyLogicView(((snapshot.logicView ?? 'drums') as CanonicalLogicView));
    setGrooveMachine(sanitizeGrooveMachineConfig(snapshot.grooveMachine));
    setDrumComputer(
      snapshot.drumComputer
        ? cloneDrumComputerState(
            resizeDrumComputerState(
              snapshot.drumComputer,
              snapshot.grooveMachine?.barsInterpretation ?? fallbackBarsInterpretation,
              (snapshot.drumComputer).segmentsPerBar,
              (snapshot.drumComputer).segmentMarkers,
            ),
          )
        : createEmptyDrumComputer(snapshot.grooveMachine?.barsInterpretation ?? fallbackBarsInterpretation),
    );
    setLoopComposer(
      snapshot.loopComposer
        ? cloneLoopComposerState(snapshot.loopComposer)
        : buildLoopComposerFromPresets(
            snapshot.grooveMachine?.bassPattern ?? 'walking',
            createEmptyLoopComposer(snapshot.grooveMachine?.barsInterpretation ?? fallbackBarsInterpretation),
          ),
    );
    setSelectedLoopNoteIds(snapshot.selectedLoopNoteIds ?? []);
    setAutoZoomOnDenseOverlap(snapshot.autoZoomOnDenseOverlap ?? false);
    setLockTrackEditing(snapshot.lockTrackEditing ?? false);
    setChordVoicing(snapshot.chordVoicing ?? 'triad');
    setChordStrumSteps(snapshot.chordStrumSteps ?? 0);
    setChordVelocitySlope(snapshot.chordVelocitySlope ?? 0.08);
    const restoredSourceAsset = snapshot.sourceAsset ? { ...snapshot.sourceAsset } : null;
    const restoredBundle = restoredSourceAsset ? buildCanonicalAnalysisBundle(restoredSourceAsset) : null;
    setSourceAsset(restoredSourceAsset);
    setRawSourceAsset(buildRawPreviewAsset(snapshot.sourceAsset));
    setBundle(restoredBundle);
    updateProxyBaselineSnapshot(
      restoredBundle
        ? buildSpectralDataFromComposite(restoredBundle, snapshot.sourceView, snapshot.secondaryView, snapshot.viewBlend)
        : null,
    );
    clearHistory();
    bumpHistoryVersion((value) => value + 1);
    invalidateAudioBuffer();
    bumpRevision((value) => value + 1);
    setStatus(
      snapshot.sourceAsset
        ? 'Forge-2-Projekt geladen. Quelle, Analyse und Arbeitsfläche wurden wiederhergestellt.'
        : 'Forge-2-Projekt geladen. Arbeitsfläche wiederhergestellt; es war keine Quelle im Projekt enthalten.',
    );
  } catch (error) {
    console.error(error);
    setStatus('Forge-2-Projekt konnte nicht geladen werden.');
  } finally {
    setBusy(false);
  }
}
