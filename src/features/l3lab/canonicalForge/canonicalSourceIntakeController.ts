import { audioEngine } from '../spectralForge/audio/AudioEngine';
import { attachAnalysisCacheToSourceAsset, prepareAudioSourceAsset, retargetAudioSourceAsset, type AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import { importImageElementToSpectralData, loadImageElementFromFile, type ImageImportFitMode, type ImageImportReadMode } from '../spectralForge/audio/ImageImporter';
import type { SpectralData } from '../spectralForge/audio/SpectralData';
import { buildCanonicalAnalysisBundle, buildSpectralDataFromComposite, sampleCanonicalView, type CanonicalAnalysisBundle, type CanonicalSourceView } from './analysis';
import { buildDefaultGuideMarkers, clampBars, clampGuideSegments } from '../spectralForge/state/storeMaterialExport';
import { buildDetailViewport, sanitizeName } from './spectralWorkspaceUtils';
import type { CanonicalForgeWorkspace } from './sessionTypes';
import type { LoopAutocorrectSuggestion } from './loopDrumDomain';

export type PendingImageImportConfig = {
  file: File;
  image: HTMLImageElement;
  fitMode: ImageImportFitMode;
  shiftX: number;
  shiftY: number;
  contrast: number;
  readMode: ImageImportReadMode;
};

export function createCanonicalSourceIntakeController(args: {
  bundle: CanonicalAnalysisBundle | null;
  sourceView: CanonicalSourceView;
  secondaryView: CanonicalSourceView | 'none';
  viewBlend: number;
  rawSourceAsset: AudioSourceAsset | null;
  loopDurationSec: number;
  selectionStartSec: number;
  selectionDurationSec: number;
  pendingImageImport: PendingImageImportConfig | null;
  spectralData: SpectralData;
  materialExport: { name: string };
  synthMode: unknown;
  waveformMix: unknown;
  activeWorkspace: CanonicalForgeWorkspace;
  destructivePreviewProfile: unknown;
  warpAudioProfile: unknown;
  setBusy: (value: boolean) => void;
  setStatus: (value: string) => void;
  setSourceAsset: (value: AudioSourceAsset | null) => void;
  setRawSourceAsset: (value: AudioSourceAsset | null) => void;
  setBundle: (value: CanonicalAnalysisBundle | null) => void;
  setSpectralData: (value: SpectralData) => void;
  setSelectionStartSec: (value: number) => void;
  setSelectionDurationSec: (value: number) => void;
  setSelectionDirty: (value: boolean) => void;
  setDetailSelectionStartSec: (value: number) => void;
  setDetailSelectionDurationSec: (value: number) => void;
  setDetailSelectionDirty: (value: boolean) => void;
  setDetailViewportStartSec: (value: number) => void;
  setDetailViewportDurationSec: (value: number) => void;
  setDetailOffset: (value: number) => void;
  setRevision: (updater: (value: number) => number) => void;
  setPendingImageImport: (value: PendingImageImportConfig | null) => void;
  setMaterialExport: (updater: (state: any) => any) => void;
  setLastAutoCorrect: (value: LoopAutocorrectSuggestion | null) => void;
  setSourceView: (view: CanonicalSourceView) => void;
  setSecondaryView: (view: CanonicalSourceView | 'none') => void;
  setViewBlend: (value: number) => void;
  setSourcePreviewMode: (value: 'forge' | 'sourceWindow' | 'sourceFull') => void;
  setGrooveMachine: (updater: (state: any) => any) => void;
  updateProxyBaselineSnapshot: (value: SpectralData | null) => void;
  pushUndo: () => void;
  stopAllForge2Preview: (statusMessage?: string) => void;
  estimateLoopAutocorrect: (source: AudioSourceAsset, startSec: number, durationSec: number) => LoopAutocorrectSuggestion;
  sourceViews: Array<{ id: CanonicalSourceView; label: string }>;
}) {
  const rebuildFromView = (view: CanonicalSourceView) => {
    if (!args.bundle) return;
    args.pushUndo();
    const next = buildSpectralDataFromComposite(args.bundle, view, args.secondaryView, args.viewBlend);
    args.updateProxyBaselineSnapshot(next);
    args.setSpectralData(next);
    audioEngine.invalidateBuffer();
    args.setRevision((value) => value + 1);
    const secondaryLabel = args.secondaryView && args.secondaryView !== 'none' && args.viewBlend > 0
      ? ` + ${args.sourceViews.find((entry) => entry.id === args.secondaryView)?.label ?? args.secondaryView} ${(args.viewBlend * 100).toFixed(0)}%`
      : '';
    args.setStatus(`Arbeitsfläche neu aus ${args.sourceViews.find((entry) => entry.id === view)?.label ?? view}${secondaryLabel} aufgebaut.`);
  };

  const sampleActiveSource = (x: number, y: number) => {
    if (!args.bundle) return 0;
    const primary = sampleCanonicalView(args.bundle, args.sourceView, x, y);
    if (!args.secondaryView || args.secondaryView === 'none' || args.viewBlend <= 0) return primary;
    const secondary = sampleCanonicalView(args.bundle, args.secondaryView, x, y);
    return Math.max(0, Math.min(1, primary * (1 - args.viewBlend) + secondary * args.viewBlend));
  };

  const applySelection = async (
    baseSource: AudioSourceAsset,
    startSec: number,
    durationSec: number,
    mode: 'manual' | 'autocorrect' = 'manual',
    options: { preserveDetailSelection?: boolean; resetDetailViewport?: boolean } = {},
  ) => {
    args.setBusy(true);
    args.setStatus(mode === 'autocorrect' ? 'Loop-Auswahl autokorrigieren …' : 'Auswahl in SyntheticForge laden …');
    try {
      const retargeted = retargetAudioSourceAsset(baseSource, { startSec, durationSec });
      const analyzed = await attachAnalysisCacheToSourceAsset(retargeted, (progress) => args.setStatus(`Analyse-Bundle bauen ${(progress * 100).toFixed(0)}%`));
      const nextBundle = buildCanonicalAnalysisBundle(analyzed);
      const nextViewport = buildDetailViewport(analyzed.importStartSec, analyzed.importDurationSec, Math.max(0.05, baseSource.originalDuration));
      const nextSpectral = buildSpectralDataFromComposite(nextBundle, args.sourceView, args.secondaryView, args.viewBlend);
      args.pushUndo();
      args.setSourceAsset(analyzed);
      args.setBundle(nextBundle);
      args.updateProxyBaselineSnapshot(nextSpectral);
      args.setSpectralData(nextSpectral);
      args.setSelectionStartSec(analyzed.importStartSec);
      args.setSelectionDurationSec(analyzed.importDurationSec);
      args.setSelectionDirty(false);
      if (!options.preserveDetailSelection) {
        args.setDetailSelectionStartSec(analyzed.importStartSec);
        args.setDetailSelectionDurationSec(analyzed.importDurationSec);
        args.setDetailSelectionDirty(false);
      }
      if (options.resetDetailViewport ?? !options.preserveDetailSelection) {
        args.setDetailViewportStartSec(nextViewport.startSec);
        args.setDetailViewportDurationSec(nextViewport.durationSec);
      }
      args.setDetailOffset(0);
      audioEngine.invalidateBuffer();
      args.setRevision((value) => value + 1);
      args.setStatus(`${mode === 'autocorrect' ? 'Loop-Auswahl autokorrigiert' : 'Auswahl geladen'}: ${analyzed.importStartSec.toFixed(2)}s → ${(analyzed.importStartSec + analyzed.importDurationSec).toFixed(2)}s (${analyzed.importDurationSec.toFixed(2)}s).`);
    } catch (error) {
      console.error(error);
      args.setStatus('Auswahl konnte nicht geladen werden.');
    } finally {
      args.setBusy(false);
    }
  };

  const applyLoopSuggestion = async (suggestion: LoopAutocorrectSuggestion, barsOverride?: number, updateSelection = true) => {
    if (!args.rawSourceAsset) return;
    const effectiveBars = clampBars(barsOverride ?? suggestion.bars);
    const matchedCandidate = suggestion.candidates.find((candidate) => candidate.bars === effectiveBars);
    const nextDuration = matchedCandidate?.durationSec ?? suggestion.durationSec;
    args.setMaterialExport((state) => ({
      ...state,
      bpm: suggestion.bpm,
      bars: effectiveBars,
      guideSegments: clampGuideSegments(effectiveBars),
      guideMarkers: buildDefaultGuideMarkers(clampGuideSegments(effectiveBars)),
    }));
    args.setGrooveMachine((state) => ({ ...state, barsInterpretation: effectiveBars }));
    if (updateSelection) {
      await applySelection(args.rawSourceAsset, suggestion.startSec, nextDuration, 'autocorrect', { preserveDetailSelection: true, resetDetailViewport: false });
    } else {
      args.setSelectionStartSec(suggestion.startSec);
      args.setSelectionDurationSec(nextDuration);
      args.setSelectionDirty(true);
    }
  };

  const handleAutoCorrect = async () => {
    if (!args.rawSourceAsset) return;
    const guess = args.estimateLoopAutocorrect(args.rawSourceAsset, args.selectionStartSec, args.selectionDurationSec);
    args.setLastAutoCorrect(guess);
    await applyLoopSuggestion(guess, guess.bars, false);
    args.setStatus(`Loop-Auswahl korrigiert: ${guess.bars} Takte · Analyse ${guess.bpm} BPM (nur Forge-intern) · Vertrauen ${(guess.confidence * 100).toFixed(0)}%. Wenn es passt: Übernehmen.`);
  };

  const handleImport = async (file: File) => {
    if (file.type.startsWith('image/')) {
      args.setBusy(true);
      args.setStatus(`Lade Bild ${file.name} ...`);
      try {
        const image = await loadImageElementFromFile(file);
        args.setPendingImageImport({
          file,
          image,
          fitMode: 'crop',
          shiftX: 0,
          shiftY: 0,
          contrast: 0.22,
          readMode: 'hybrid',
        });
        args.setStatus(`Bild bereit: ${image.naturalWidth}×${image.naturalHeight}. Übersetzung in SyntheticForge jetzt unten feinjustierbar.`);
      } catch (error) {
        console.error(error);
        args.setStatus('Bild konnte nicht geladen werden.');
      } finally {
        args.setBusy(false);
      }
      return;
    }
    args.setBusy(true);
    args.setStatus(`Lade ${file.name} ...`);
    try {
      const prepared = await prepareAudioSourceAsset(file, (progress) => args.setStatus(`Quelle dekodieren ${(progress * 100).toFixed(0)}%`));
      const defaultDuration = Math.min(Math.max(1, prepared.importDurationSec), prepared.originalDuration);
      args.setPendingImageImport(null);
      args.setRawSourceAsset(prepared);
      args.setSelectionStartSec(0);
      args.setSelectionDurationSec(defaultDuration);
      args.setMaterialExport((state) => ({ ...state, name: sanitizeName(file.name.replace(/\.[^.]+$/, '')) }));
      args.setLastAutoCorrect(null);
      args.setSourceView('synesthetic');
      args.setSecondaryView('harmonic');
      args.setViewBlend(0.26);
      await applySelection(prepared, 0, defaultDuration);
      args.setSourcePreviewMode('sourceWindow');
      args.setStatus(`Canonical Import fertig: ${file.name}. Gesamtquelle, Loop-Auswahl und Arbeitsfläche sind jetzt getrennt vorhanden.`);
    } catch (error) {
      console.error(error);
      args.setStatus('Import fehlgeschlagen.');
      args.setBusy(false);
    }
  };

  const confirmImageImport = async () => {
    const pendingImageImport = args.pendingImageImport;
    if (!pendingImageImport) return;
    args.setBusy(true);
    args.setStatus(`Übersetze Bild ${pendingImageImport.file.name} in Forge-Material ...`);
    try {
      args.stopAllForge2Preview('Bild-Import startet ...');
      args.pushUndo();
      await importImageElementToSpectralData(
        pendingImageImport.image,
        args.spectralData,
        {
          fitMode: pendingImageImport.fitMode,
          shiftX: pendingImageImport.shiftX,
          shiftY: pendingImageImport.shiftY,
          contrast: pendingImageImport.contrast,
          readMode: pendingImageImport.readMode,
        },
        (progress) => args.setStatus(`Bildübersetzung ${(progress * 100).toFixed(0)}%`),
      );
      args.setRawSourceAsset(null);
      args.setSourceAsset(null);
      args.setBundle(null);
      args.updateProxyBaselineSnapshot(null);
      args.setSelectionDirty(false);
      args.setSelectionStartSec(0);
      args.setSelectionDurationSec(args.loopDurationSec);
      args.setMaterialExport((state) => ({ ...state, name: sanitizeName(pendingImageImport.file.name.replace(/\.[^.]+$/, '')) }));
      args.setPendingImageImport(null);
      audioEngine.invalidateBuffer();
      args.setRevision((value) => value + 1);
      args.setStatus(`Bild importiert: ${pendingImageImport.file.name} · ${pendingImageImport.readMode === 'legacy' ? 'Legacy' : pendingImageImport.readMode === 'contour' ? 'Kontur' : 'Hybrid'} · ${pendingImageImport.fitMode === 'crop' ? 'Crop' : pendingImageImport.fitMode === 'stretch' ? 'Stretch' : pendingImageImport.fitMode === 'containLeft' ? 'Contain links' : 'Contain rechts'}.`);
    } catch (error) {
      console.error(error);
      args.setStatus('Bild-Import fehlgeschlagen.');
    } finally {
      args.setBusy(false);
    }
  };

  return {
    rebuildFromView,
    sampleActiveSource,
    applySelection,
    applyLoopSuggestion,
    handleAutoCorrect,
    handleImport,
    confirmImageImport,
  };
}
