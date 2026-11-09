import { useEffect } from 'react';
import { prepareAudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import { getLoopTimeGuides, buildLoopComposerFromMicrotoSeed } from './loopDrumDomain';
import { clampBars } from '../spectralForge/state/storeMaterialExport';
import { consumeForgeAudioHandoff } from '../forgeAudioHandoff';
import { consumeMicrotoMelodicLoopSeedHandoff } from './microtoMelodicLoopHandoff';
import { commitMelodicPatternStores, createGeneratedMelodicPatternStoresFromComposer } from './melodicPatternStoreContract';
import type { CanonicalLogicView } from './sessionTypes';

export function useCanonicalForgeHandoffEffects(args: {
  stopLoopComposerPreview: () => void;
  applyLogicView: (view: CanonicalLogicView) => void;
  setActiveWorkspace: (value: any) => void;
  setLoopComposer: (value: any) => void;
  setLoopPatternVariants: (value: any) => void;
  setLoopPatternLinks: (value: any) => void;
  loopPatternVariantsRef: { current: any };
  loopPatternLinksRef: { current: any };
  setSelectedMelodicProjectId: (value: string) => void;
  setSelectedLoopNoteIds: (value: string[]) => void;
  setMaterialExport: (value: any) => void;
  setStatus: (value: string) => void;
  stopAllForge2Preview: (statusMessage?: string) => void;
  setPendingImageImport: (value: any) => void;
  setRawSourceAsset: (value: any) => void;
  setSelectionStartSec: (value: number) => void;
  setSelectionDurationSec: (value: number) => void;
  setLastAutoCorrect: (value: any) => void;
  setSourceView: (value: any) => void;
  setSecondaryView: (value: any) => void;
  setViewBlend: (value: number) => void;
  applySelection: (source: any, startSec: number, durationSec: number) => Promise<any>;
  setSourcePreviewMode: (value: any) => void;
}) {
  const {
    stopLoopComposerPreview,
    applyLogicView,
    setActiveWorkspace,
    setLoopComposer,
    setLoopPatternVariants,
    setLoopPatternLinks,
    loopPatternVariantsRef,
    loopPatternLinksRef,
    setSelectedMelodicProjectId,
    setSelectedLoopNoteIds,
    setMaterialExport,
    setStatus,
    stopAllForge2Preview,
    setPendingImageImport,
    setRawSourceAsset,
    setSelectionStartSec,
    setSelectionDurationSec,
    setLastAutoCorrect,
    setSourceView,
    setSecondaryView,
    setViewBlend,
    applySelection,
    setSourcePreviewMode,
  } = args;

  useEffect(() => {
    const pendingMicrotoSeed = consumeMicrotoMelodicLoopSeedHandoff();
    if (!pendingMicrotoSeed) return;
    stopLoopComposerPreview();
    const seeded = buildLoopComposerFromMicrotoSeed(pendingMicrotoSeed);
    const seededStores = createGeneratedMelodicPatternStoresFromComposer(seeded);
    setActiveWorkspace('microtonal-logic');
    applyLogicView('melodic');
    setLoopComposer(seeded);
    commitMelodicPatternStores({
      stores: seededStores,
      patternVariantsRef: loopPatternVariantsRef as any,
      patternLinksRef: loopPatternLinksRef as any,
      setLoopPatternVariants,
      setLoopPatternLinks,
    });
    setSelectedMelodicProjectId('');
    setSelectedLoopNoteIds([]);
    setMaterialExport((state: any) => ({
      ...state,
      name: pendingMicrotoSeed.name || state.name,
      role: 'loop',
      bars: clampBars(pendingMicrotoSeed.bars),
      guideSegments: Math.max(1, seeded.stepsPerBar),
      guideMarkers: getLoopTimeGuides(seeded)
        .filter((marker) => marker.kind === 'guide' && marker.repeatPerBar)
        .map((marker) => marker.beat / Math.max(1, seeded.beatsPerBar || 4)),
    }));
    setStatus(`Jump-Run-DNA in Melodic Loop geladen: ${pendingMicrotoSeed.name} · ${pendingMicrotoSeed.movementEvents.length} Events.`);
  }, [
    applyLogicView,
    loopPatternLinksRef,
    loopPatternVariantsRef,
    setActiveWorkspace,
    setLoopComposer,
    setLoopPatternLinks,
    setLoopPatternVariants,
    setMaterialExport,
    setSelectedLoopNoteIds,
    setSelectedMelodicProjectId,
    setStatus,
    stopLoopComposerPreview,
  ]);

  useEffect(() => {
    const pendingExternalAudio = consumeForgeAudioHandoff('canonical');
    if (!pendingExternalAudio) return;
    let cancelled = false;
    (async () => {
      try {
        setStatus(`Lade ${pendingExternalAudio.name} aus ${pendingExternalAudio.origin} in SyntheticForge ...`);
        stopAllForge2Preview(`${pendingExternalAudio.name} wird in die Wave-/Material-Fläche überführt ...`);
        const file = new File([pendingExternalAudio.blob], pendingExternalAudio.fileName, { type: pendingExternalAudio.blob.type || 'audio/wav' });
        const prepared = await prepareAudioSourceAsset(file, (progress) => {
          if (!cancelled) setStatus(`Quelle dekodieren ${(progress * 100).toFixed(0)}%`);
        });
        if (cancelled) return;
        const defaultDuration = Math.min(Math.max(1, prepared.importDurationSec), prepared.originalDuration);
        setPendingImageImport(null);
        setRawSourceAsset(prepared);
        setSelectionStartSec(0);
        setSelectionDurationSec(defaultDuration);
        setMaterialExport((state: any) => ({
          ...state,
          name: pendingExternalAudio.name || state.name,
          role: 'loop',
          bars: clampBars(pendingExternalAudio.bars),
        }));
        setLastAutoCorrect(null);
        setSourceView('synesthetic');
        setSecondaryView('harmonic');
        setViewBlend(0.26);
        await applySelection(prepared, 0, defaultDuration);
        if (cancelled) return;
        setSourcePreviewMode('sourceWindow');
        setActiveWorkspace('wave-material');
        setStatus(`${pendingExternalAudio.name} liegt jetzt in SyntheticForge bereit.`);
      } catch (error) {
        if (!cancelled) {
          console.error('[xensonar][forge2][external-handoff]', error);
          setStatus(`Forge-2-Handoff fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    applySelection,
    setActiveWorkspace,
    setLastAutoCorrect,
    setMaterialExport,
    setPendingImageImport,
    setRawSourceAsset,
    setSecondaryView,
    setSelectionDurationSec,
    setSelectionStartSec,
    setSourcePreviewMode,
    setSourceView,
    setStatus,
    setViewBlend,
    stopAllForge2Preview,
  ]);
}
